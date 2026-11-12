import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import {
  INSPECTION_VIEWS,
  MIN_REPORTABLE_CONFIDENCE,
  REQUIRED_VIEWS,
  boxFromYxyx1000,
  classifyNewDamage,
  clamp,
  conditionGrade,
  conditionScore,
  dedupeFindings,
  findOverlappingBaseline,
  intersectPasses,
  unionPasses,
  comparePlate,
  compareMake,
  isChargeable,
  isInspectionView,
  normalizeCategory,
  normalizeSeverity,
  repairCost,
  roundMoney,
  type AssessedFinding,
  type ComparisonClassification,
  type InspectionView,
  type NormalizedBox,
} from './damage-assessment';
import {
  VisionProvider,
  type RawFinding,
  type RawPhotoCheck,
  type VisionImage,
  type VisionVehicle,
} from './vision-provider';
import { fingerprint, isSamePicture } from './image-fingerprint';

export interface InspectionPhotoInput {
  view: InspectionView;
  /** data:image/jpeg;base64,... (compressed on the client) */
  imageData: string;
}

export interface AnalyzeInspectionDTO {
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  vehicleId?: string;
  bookingId?: string;
  rentalId?: string;
  notes?: string;
  photos: InspectionPhotoInput[];
}

export interface ReviewChargeDTO {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const STAFF_PICKUP_BOOKING_STATUSES = ['CONFIRMED', 'READY_FOR_PICKUP'];
/** A pickup scan must be fresh: the car must not change between the scan and the key handover. */
export const PICKUP_SCAN_VALID_HOURS = 12;

const CATEGORY_LABEL: Record<string, string> = {
  SCRATCH: 'Scratch',
  DENT: 'Dent',
  PAINT_CHIP: 'Paint chip',
  CRACK: 'Crack',
  BROKEN_PART: 'Broken part',
};

interface StoredFindingMeta {
  view: InspectionView;
  category: AssessedFinding['category'];
  description: string;
  box: NormalizedBox;
  classification?: ComparisonClassification;
  baselineFindingId?: string;
}

/** How many independent AI passes are combined (2 = consensus). */
function consensusPasses(): number {
  const raw = Number(process.env.VISION_CONSENSUS_PASSES || 2);
  return Number.isInteger(raw) ? Math.min(3, Math.max(1, raw)) : 2;
}

function costMultiplier(): number {
  const raw = Number(process.env.DAMAGE_COST_MULTIPLIER || 1);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export class InspectionService {
  // ------------------------------------------------------------------
  // Read
  // ------------------------------------------------------------------

  static async listInspections(filters: { vehicleId?: string; type?: string; rentalId?: string } = {}) {
    const where: Prisma.InspectionWhereInput = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.rentalId) where.rentalId = filters.rentalId;
    if (filters.type && ['PICKUP', 'RETURN', 'ROUTINE'].includes(filters.type)) {
      where.type = filters.type as 'PICKUP' | 'RETURN' | 'ROUTINE';
    }

    const inspections = await prisma.inspection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        vehicle: { select: { id: true, brand: true, model: true, year: true, registrationNumber: true, color: true } },
        rental: { include: { booking: { select: { id: true, bookingNumber: true, customer: { select: { fullName: true } } } } } },
        findings: true,
        photos: true,
        performedBy: { select: { id: true, fullName: true } },
      },
    });

    return inspections.map((ins) => this.formatInspection(ins));
  }

  static async getById(id: string) {
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        vehicle: { select: { id: true, brand: true, model: true, year: true, registrationNumber: true, color: true, vin: true } },
        rental: { include: { booking: { select: { id: true, bookingNumber: true, currency: true, customer: { select: { fullName: true, email: true } } } } } },
        findings: true,
        photos: true,
        performedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!inspection) {
      throw AppError.notFound('Inspection record not found');
    }

    const comparison =
      inspection.type === 'RETURN'
        ? await prisma.damage_comparisons.findFirst({
            where: { returnInspectionId: inspection.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
        : null;

    return {
      ...this.formatInspection(inspection),
      comparison: comparison ? await this.getComparisonById(comparison.id) : null,
    };
  }

  /**
   * Pickup / return reports of one booking. Customers may only open their own bookings.
   */
  static async listForBooking(bookingId: string, user: { userId: string; roles?: string[] }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, bookingNumber: true, customer: { select: { userId: true } }, rental: { select: { id: true } } },
    });
    if (!booking) throw AppError.notFound('Booking not found');

    const isStaff = (user.roles || []).some((r) => ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'OPERATOR'].includes(r));
    if (!isStaff && booking.customer.userId !== user.userId) {
      throw AppError.forbidden('You can only view inspections of your own bookings');
    }

    const inspections = booking.rental ? await this.listInspections({ rentalId: booking.rental.id }) : [];
    const comparison = await prisma.damage_comparisons.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return {
      bookingNumber: booking.bookingNumber,
      inspections,
      comparison: comparison ? await this.getComparisonById(comparison.id) : null,
    };
  }

  static async getComparisonById(id: string) {
    const comparison = await prisma.damage_comparisons.findUnique({
      where: { id },
      include: {
        damage_comparison_matches: { orderBy: { createdAt: 'asc' } },
        damage_charges: { orderBy: { createdAt: 'asc' } },
        bookings: { select: { id: true, bookingNumber: true, currency: true, depositAmount: true } },
        vehicles: { select: { id: true, brand: true, model: true, year: true, registrationNumber: true, color: true } },
        inspections_damage_comparisons_pickupInspectionIdToinspections: { include: { findings: true, photos: true } },
        inspections_damage_comparisons_returnInspectionIdToinspections: { include: { findings: true, photos: true } },
      },
    });
    if (!comparison) {
      throw AppError.notFound('Damage comparison not found');
    }

    const pickup = comparison.inspections_damage_comparisons_pickupInspectionIdToinspections;
    const ret = comparison.inspections_damage_comparisons_returnInspectionIdToinspections;
    const activeCharges = comparison.damage_charges.filter((c) => c.status !== 'REJECTED');

    return {
      id: comparison.id,
      status: comparison.status,
      summary: comparison.summary,
      coverageParityScore: comparison.coverageParityScore,
      preExistingCount: comparison.preExistingCount,
      newDamageCount: comparison.newDamageCount,
      inconclusiveCount: comparison.inconclusiveCount,
      currency: comparison.bookings.currency,
      depositAmount: Number(comparison.bookings.depositAmount || 0),
      totalProposedCharges: Number(comparison.totalProposedCharges),
      totalActiveCharges: roundMoney(activeCharges.reduce((s, c) => s + Number(c.proposedAmount), 0)),
      bookingId: comparison.bookingId,
      bookingNumber: comparison.bookings.bookingNumber,
      vehicle: comparison.vehicles,
      pickupInspection: pickup ? this.formatInspection(pickup) : null,
      returnInspection: ret ? this.formatInspection(ret) : null,
      matches: comparison.damage_comparison_matches.map((m) => ({
        id: m.id,
        findingId: m.findingId,
        baselineFindingId: m.baselineFindingId,
        region: m.region,
        classification: m.classification,
        confidence: m.confidence,
        proposedCost: Number(m.proposedCost || 0),
      })),
      charges: comparison.damage_charges.map((c) => ({
        id: c.id,
        damageFindingId: c.damageFindingId,
        description: c.description,
        proposedAmount: Number(c.proposedAmount),
        approvedAmount: Number(c.approvedAmount),
        currency: c.currency,
        status: c.status,
        notes: c.disputeNotes,
      })),
    };
  }

  // ------------------------------------------------------------------
  // AI inspection
  // ------------------------------------------------------------------

  /**
   * Runs an AI inspection on fresh photos and stores it.
   * PICKUP: done before the keys are handed over; it becomes the baseline of the rental.
   * RETURN: compared side by side with the pickup baseline; NEW damage becomes proposed fines.
   */
  static async analyze(dto: AnalyzeInspectionDTO, staffUserId?: string) {
    const type = dto?.type;
    if (!type || !['PICKUP', 'RETURN', 'ROUTINE'].includes(type)) {
      throw AppError.badRequest('Inspection type must be PICKUP, RETURN or ROUTINE');
    }

    const images = this.parsePhotos(dto.photos, type !== 'ROUTINE');

    // Resolve the vehicle and its rental context server-side (never trust client ids blindly)
    let vehicleId = dto.vehicleId;
    let rentalId: string | null = null;
    let bookingForReturn: { id: string; currency: string } | null = null;

    if (type === 'PICKUP') {
      if (!dto.bookingId) throw AppError.badRequest('bookingId is required for a pickup inspection');
      const booking = await prisma.booking.findUnique({ where: { id: dto.bookingId }, include: { rental: true } });
      if (!booking) throw AppError.notFound('Booking not found');
      if (booking.rental) throw AppError.badRequest('This booking has already been handed over');
      if (!STAFF_PICKUP_BOOKING_STATUSES.includes(booking.status)) {
        throw AppError.badRequest(`A ${booking.status} booking cannot be handed over`);
      }
      vehicleId = booking.vehicleId;
    }

    let baseline: Awaited<ReturnType<typeof this.loadBaseline>> | null = null;
    if (type === 'RETURN') {
      if (!dto.rentalId) throw AppError.badRequest('rentalId is required for a return inspection');
      const rental = await prisma.rental.findUnique({
        where: { id: dto.rentalId },
        include: { booking: { select: { id: true, currency: true } } },
      });
      if (!rental) throw AppError.notFound('Rental not found');
      if (rental.status !== 'ACTIVE') throw AppError.badRequest('This rental has already been returned');
      vehicleId = rental.vehicleId;
      rentalId = rental.id;
      bookingForReturn = rental.booking;
      baseline = await this.loadBaseline(rental.id);
    }

    if (!vehicleId) throw AppError.badRequest('vehicleId is required');
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, brand: true, model: true, year: true, color: true, registrationNumber: true },
    });
    if (!vehicle) throw AppError.notFound('Vehicle not found');
    const vehicleLabel = `${vehicle.year} ${vehicle.brand} ${vehicle.model}${vehicle.color ? `, ${vehicle.color}` : ''}`;

    // 1. Ask the vision model
    const passes = consensusPasses();
    let photoChecks: RawPhotoCheck[] = [];
    let detectedVehicle: VisionVehicle = {};
    let findings: AssessedFinding[];
    let comparisonItems: Array<{
      finding: AssessedFinding;
      classification: ComparisonClassification;
      baselineFindingId?: string;
      chargeAmount: number;
    }> = [];
    let unchangedViews: InspectionView[] = [];

    if (type === 'RETURN' && baseline) {
      // a) Angles whose return photo is the very same picture as at pickup: nothing can have changed
      const baselinePrints = new Map(
        baseline.images.map((b) => [b.view, fingerprint(Buffer.from(b.base64, 'base64'), b.mimeType)])
      );
      unchangedViews = images
        .filter((img) => {
          const base = baselinePrints.get(img.view);
          return base ? isSamePicture(base, fingerprint(Buffer.from(img.base64, 'base64'), img.mimeType)) : false;
        })
        .map((img) => img.view);
      const changedImages = images.filter((img) => !unchangedViews.includes(img.view));

      const carried: typeof comparisonItems = baseline.findings
        .filter((base) => unchangedViews.includes(base.view))
        .map((base) => ({
          finding: this.withoutId(base),
          classification: 'PRE_EXISTING_UNCHANGED' as const,
          baselineFindingId: base.id,
          chargeAmount: 0,
        }));
      let fresh: typeof comparisonItems = [];

      // b) Re-taken angles: side-by-side AI comparison, run several times; only consistent results count
      if (changedImages.length > 0) {
        const comparedBaseline = baseline.findings.filter((f) => !unchangedViews.includes(f.view));
        const results = await Promise.all(
          Array.from({ length: passes }, () =>
            VisionProvider.compareWithBaseline({
              vehicleLabel,
              baselineImages: baseline!.images.filter((b) => changedImages.some((c) => c.view === b.view)),
              returnImages: changedImages,
              baselineFindings: comparedBaseline.map((f) => ({
                id: f.id,
                view: f.view,
                category: f.category,
                severity: f.severity,
                part: f.part,
                description: f.description,
              })),
            })
          )
        );
        photoChecks = results[0].photos;
        detectedVehicle = results[0].vehicle;
        if (results.every((r) => !r.sameVehicle)) {
          const reason = results.find((r) => r.sameVehicleReason)?.sameVehicleReason;
          throw new AppError(
            `The return photos do not appear to show the same vehicle as the pickup photos${
              reason ? ` (${reason})` : ''
            }. Please photograph the rented vehicle.`,
            422,
            'INSPECTION_VEHICLE_MISMATCH'
          );
        }
        this.assertPhotoQuality(changedImages, photoChecks);

        // Pickup damage stays on the car; it is "worsened" only when every pass agrees, "repaired" likewise
        const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
        for (const base of comparedBaseline) {
          const statuses = results.map((r) => r.baselineStatus.find((st) => st.baselineId === base.id));
          if (statuses.every((st) => st?.status === 'REPAIRED')) continue;
          const worsened = statuses.every((st) => st?.status === 'WORSENED');
          const severity = worsened
            ? statuses
                .map((st) => normalizeSeverity(st?.currentSeverity || base.severity))
                .reduce((lowest, sev) => (severityRank[sev] < severityRank[lowest] ? sev : lowest))
            : base.severity;
          const box = statuses.map((st) => boxFromYxyx1000(st?.box_2d)).find(Boolean) || base.box;
          const finding: AssessedFinding = {
            ...this.withoutId(base),
            severity,
            box,
            estimatedRepairCost: repairCost(base.category, severity, costMultiplier()),
          };
          const chargeable = worsened && finding.estimatedRepairCost > base.estimatedRepairCost;
          carried.push({
            finding,
            classification: chargeable ? 'PRE_EXISTING_WORSENED' : 'PRE_EXISTING_UNCHANGED',
            baselineFindingId: base.id,
            // Only the extra repair cost of the worsening is charged
            chargeAmount: chargeable ? roundMoney(finding.estimatedRepairCost - base.estimatedRepairCost) : 0,
          });
        }

        // New damage must be seen in every pass, then pass the geometric check against the pickup record
        const agreedNew = intersectPasses(results.map((r) => this.normalizeFindings(r.newDamages)));
        fresh = agreedNew.map((finding) => {
          const classification = classifyNewDamage(finding, baseline!.findings);
          const overlapped =
            classification === 'PRE_EXISTING_UNCHANGED' || classification === 'PRE_EXISTING_WORSENED'
              ? findOverlappingBaseline(finding, baseline!.findings)
              : undefined;
          const chargeAmount =
            classification === 'CONFIRMED_NEW_DAMAGE'
              ? finding.estimatedRepairCost
              : classification === 'PRE_EXISTING_WORSENED' && overlapped
                ? Math.max(0, roundMoney(finding.estimatedRepairCost - overlapped.estimatedRepairCost))
                : 0;
          return { finding, classification, baselineFindingId: overlapped?.id, chargeAmount };
        });
      }

      // A pickup damage reported again as "new" at the same spot is counted once
      comparisonItems = [...carried];
      for (const item of fresh) {
        const duplicate = carried.some((c) => c.baselineFindingId && c.baselineFindingId === item.baselineFindingId);
        if (!duplicate) comparisonItems.push(item);
      }
      findings = comparisonItems.map((c) => c.finding);
    } else {
      // Pickup / routine: every mark seen in any pass is recorded, so it is never charged later
      const results = await Promise.all(
        Array.from({ length: passes }, () => VisionProvider.detectDamage({ vehicleLabel, images }))
      );
      photoChecks = results[0].photos;
      detectedVehicle = results[0].vehicle;
      this.assertPhotoQuality(images, photoChecks);
      findings = unionPasses(results.map((r) => this.normalizeFindings(r.findings)));
    }

    // 2. The photos must show the booked vehicle (make and, when readable, the number plate)
    const identityNote =
      Object.keys(detectedVehicle).length > 0 ? this.assertVehicleIdentity(vehicle, detectedVehicle) : '';
    const detectedColor = detectedVehicle.colorName;

    const score = conditionScore(findings);
    const newDamage = comparisonItems.filter((c) => c.classification === 'CONFIRMED_NEW_DAMAGE');
    const worsened = comparisonItems.filter((c) => c.classification === 'PRE_EXISTING_WORSENED');
    const inconclusive = comparisonItems.filter((c) => c.classification === 'POSSIBLY_NEW_DAMAGE');
    const preExisting = comparisonItems.filter((c) => c.classification === 'PRE_EXISTING_UNCHANGED');
    const summary = [
      this.buildSummary(type, vehicleLabel, findings, score, {
        newCount: newDamage.length,
        worsenedCount: worsened.length,
        inconclusiveCount: inconclusive.length,
      }),
      identityNote,
      unchangedViews.length > 0
        ? `Identical to pickup photo: ${unchangedViews.map((v) => v.toLowerCase().replace('_', ' ')).join(', ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    // 2. Store the photos, inspection, findings and (for returns) the comparison + proposed fines
    const storedPhotoUrls = images.map((img) =>
      this.storePhoto(img, `${type.toLowerCase()}-${vehicle.id}-${img.view.toLowerCase()}`)
    );

    try {
      const created = await prisma.$transaction(async (tx) => {
        const inspection = await tx.inspection.create({
          data: {
            vehicleId: vehicle.id,
            rentalId,
            type,
            performedById: staffUserId || null,
            overallScore: score,
            summary: dto.notes ? `${summary}\nInspector notes: ${String(dto.notes).slice(0, 1000)}` : summary,
            hasDamageDetected: findings.length > 0,
            coverageScore: this.coverage(images),
            status: 'AI_ANALYZED',
            capturePlanVersion: 'v2.0',
          },
        });

        for (let i = 0; i < images.length; i++) {
          const check = photoChecks.find((c) => c.view === images[i].view);
          await tx.inspectionPhoto.create({
            data: {
              inspectionId: inspection.id,
              view: images[i].view,
              imageUrl: storedPhotoUrls[i].url,
              qualityScore: check ? (check.usable && check.viewMatches ? 100 : 50) : null,
              qualityDetails: check?.issue ? String(check.issue).slice(0, 500) : null,
              sha256Hash: storedPhotoUrls[i].sha256,
              fileSizeBytes: storedPhotoUrls[i].bytes,
            },
          });
        }

        const findingIds: string[] = [];
        for (let i = 0; i < findings.length; i++) {
          const f = findings[i];
          const item = comparisonItems[i];
          const meta: StoredFindingMeta = {
            view: f.view,
            category: f.category,
            description: f.description,
            box: f.box,
            ...(item ? { classification: item.classification, baselineFindingId: item.baselineFindingId } : {}),
          };
          const row = await tx.damageFinding.create({
            data: {
              inspectionId: inspection.id,
              damageType: CATEGORY_LABEL[f.category],
              severity: f.severity,
              location: f.part.slice(0, 64),
              region: f.view,
              confidence: f.confidence,
              boundingBox: JSON.stringify(meta),
              estimatedRepairCost: f.estimatedRepairCost,
              isHumanVerified: false,
              humanDecision: item ? item.classification : type === 'PICKUP' ? 'BASELINE_DOCUMENTED' : null,
            },
          });
          findingIds.push(row.id);
        }

        let comparisonId: string | null = null;
        if (type === 'RETURN' && baseline && bookingForReturn) {
          comparisonId = crypto.randomUUID();
          const chargeable = comparisonItems.filter((c) => isChargeable(c.classification) && c.chargeAmount > 0);
          const totalProposed = roundMoney(chargeable.reduce((s, c) => s + c.chargeAmount, 0));
          const now = new Date();

          await tx.damage_comparisons.create({
            data: {
              id: comparisonId,
              bookingId: bookingForReturn.id,
              vehicleId: vehicle.id,
              pickupInspectionId: baseline.inspectionId,
              returnInspectionId: inspection.id,
              status: 'PENDING_REVIEW',
              summary,
              coverageParityScore: this.parity(images, baseline.images),
              preExistingCount: preExisting.length + worsened.length,
              newDamageCount: newDamage.length,
              inconclusiveCount: inconclusive.length,
              totalProposedCharges: totalProposed,
              updatedAt: now,
            },
          });

          for (let i = 0; i < comparisonItems.length; i++) {
            const item = comparisonItems[i];
            await tx.damage_comparison_matches.create({
              data: {
                id: crypto.randomUUID(),
                comparisonId,
                findingId: findingIds[i],
                baselineFindingId: item.baselineFindingId || null,
                region: item.finding.view,
                classification: item.classification,
                confidence: item.finding.confidence,
                proposedCost: item.chargeAmount,
              },
            });
            if (isChargeable(item.classification) && item.chargeAmount > 0) {
              await tx.damage_charges.create({
                data: {
                  id: crypto.randomUUID(),
                  bookingId: bookingForReturn.id,
                  comparisonId,
                  damageFindingId: findingIds[i],
                  description: `${item.classification === 'PRE_EXISTING_WORSENED' ? 'Worsened' : 'New'} ${CATEGORY_LABEL[
                    item.finding.category
                  ].toLowerCase()} (${item.finding.severity.toLowerCase()}) - ${item.finding.part}`.slice(0, 255),
                  proposedAmount: item.chargeAmount,
                  approvedAmount: 0,
                  currency: bookingForReturn.currency,
                  status: 'PROPOSED',
                  updatedAt: now,
                },
              });
            }
          }
        }

        await tx.securityAuditLog.create({
          data: {
            userId: staffUserId || null,
            event: 'AI_INSPECTION_COMPLETED',
            metadata: JSON.stringify({
              inspectionId: inspection.id,
              type,
              vehicleId: vehicle.id,
              conditionScore: score,
              findings: findings.length,
              newDamage: newDamage.length,
            }),
          },
        });

        return { inspectionId: inspection.id, comparisonId };
      });

      const inspection = await this.getById(created.inspectionId);
      return { ...inspection, detectedColor: detectedColor || null, bookingId: dto.bookingId || null };
    } catch (err) {
      // Do not leave orphan photo files when the database write fails
      for (const stored of storedPhotoUrls) this.deleteStoredPhoto(stored.url);
      throw err;
    }
  }

  /** Staff decision on a proposed fine (approve or waive). */
  static async reviewCharge(chargeId: string, dto: ReviewChargeDTO, staffUserId?: string) {
    if (!dto || !['APPROVED', 'REJECTED'].includes(dto.decision)) {
      throw AppError.badRequest('decision must be APPROVED or REJECTED');
    }
    const charge = await prisma.damage_charges.findUnique({ where: { id: chargeId } });
    if (!charge) throw AppError.notFound('Damage charge not found');
    if (charge.status === 'SETTLED') throw AppError.badRequest('This charge has already been settled');

    await prisma.damage_charges.update({
      where: { id: chargeId },
      data: {
        status: dto.decision,
        approvedAmount: dto.decision === 'APPROVED' ? charge.proposedAmount : 0,
        approvedById: staffUserId || null,
        approvedAt: new Date(),
        disputeNotes: dto.notes ? String(dto.notes).slice(0, 1000) : charge.disputeNotes,
        updatedAt: new Date(),
      },
    });

    if (charge.comparisonId) {
      await prisma.damage_comparisons.update({
        where: { id: charge.comparisonId },
        data: { status: 'IN_REVIEW', reviewerId: staffUserId || null, updatedAt: new Date() },
      });
      return this.getComparisonById(charge.comparisonId);
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private static parsePhotos(photos: InspectionPhotoInput[] | undefined, requireFullSet: boolean): VisionImage[] {
    if (!Array.isArray(photos) || photos.length === 0) {
      throw AppError.badRequest('At least one inspection photo is required');
    }
    if (photos.length > INSPECTION_VIEWS.length) {
      throw AppError.badRequest(`A maximum of ${INSPECTION_VIEWS.length} photos is allowed`);
    }

    const seen = new Set<string>();
    const images: VisionImage[] = photos.map((p) => {
      if (!isInspectionView(p?.view)) throw AppError.badRequest(`Invalid photo angle: ${p?.view}`);
      if (seen.has(p.view)) throw AppError.badRequest(`Duplicate photo for angle ${p.view}`);
      seen.add(p.view);

      const match = typeof p.imageData === 'string' ? p.imageData.match(DATA_URL_PATTERN) : null;
      if (!match) throw AppError.badRequest(`Photo for ${p.view} must be a JPEG, PNG or WEBP image`);
      const bytes = Math.floor((match[2].length * 3) / 4);
      if (bytes > MAX_PHOTO_BYTES) throw AppError.badRequest(`Photo for ${p.view} is larger than 8 MB`);
      return { view: p.view, mimeType: match[1] === 'image/jpg' ? 'image/jpeg' : match[1], base64: match[2] };
    });

    if (requireFullSet) {
      const missing = REQUIRED_VIEWS.filter((v) => !seen.has(v));
      if (missing.length > 0) {
        throw AppError.badRequest(`Missing required photos: ${missing.join(', ')}`);
      }
    }
    return images;
  }

  private static withoutId(f: AssessedFinding & { id?: string }): AssessedFinding {
    const { id: _id, ...rest } = f;
    return rest;
  }

  /**
   * The photographed car must be the booked car: a different make, or a clearly read plate that is not
   * the registered plate, rejects the scan. Returns a short note for the report.
   */
  private static assertVehicleIdentity(
    vehicle: { brand: string; model: string; registrationNumber: string },
    detected: VisionVehicle
  ): string {
    const make = compareMake(detected.make, vehicle.brand);
    if (make === 'MISMATCH') {
      throw new AppError(
        `The photos show a ${[detected.make, detected.model].filter(Boolean).join(' ')}, but this booking is for a ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNumber}). Please photograph the booked vehicle.`,
        422,
        'INSPECTION_VEHICLE_MISMATCH'
      );
    }
    const plate = comparePlate(detected.plateText, vehicle.registrationNumber);
    if (plate === 'MISMATCH') {
      throw new AppError(
        `The number plate in the photos reads "${detected.plateText}", but the booked vehicle is registered as ${vehicle.registrationNumber}. Please photograph the booked vehicle.`,
        422,
        'INSPECTION_PLATE_MISMATCH'
      );
    }
    return plate === 'MATCH'
      ? `Number plate ${vehicle.registrationNumber} verified in the photos.`
      : `Number plate ${vehicle.registrationNumber} was not readable in the photos.`;
  }

  /** Rejects the scan when a required photo is not a car, shows the wrong angle, or is too blurry/dark. */
  private static assertPhotoQuality(images: VisionImage[], checks: RawPhotoCheck[]) {
    const problems: string[] = [];
    for (const image of images) {
      const check = checks.find((c) => c.view === image.view);
      if (!check) continue;
      if (!check.isVehicle) problems.push(`${image.view}: no vehicle visible`);
      else if (!check.viewMatches) problems.push(`${image.view}: photo shows a different angle`);
      else if (!check.usable) problems.push(`${image.view}: ${check.issue || 'photo is too blurry or dark'}`);
    }
    if (problems.length > 0) {
      throw new AppError(
        `Please retake these photos: ${problems.join('; ')}.`,
        422,
        'INSPECTION_PHOTO_REJECTED'
      );
    }
  }

  private static normalizeFindings(raw: RawFinding[]): AssessedFinding[] {
    const multiplier = costMultiplier();
    const normalized: AssessedFinding[] = [];
    for (const f of raw || []) {
      if (!isInspectionView(f.view)) continue;
      const box = boxFromYxyx1000(f.box_2d);
      if (!box) continue;
      const confidence = clamp(Number(f.confidence), 0, 1);
      if (!Number.isFinite(confidence) || confidence < MIN_REPORTABLE_CONFIDENCE) continue;
      const category = normalizeCategory(f.category);
      const severity = normalizeSeverity(f.severity);
      normalized.push({
        view: f.view,
        category,
        severity,
        part: String(f.part || 'Body panel').trim().slice(0, 64) || 'Body panel',
        description: String(f.description || '').trim().slice(0, 400),
        confidence: Number(confidence.toFixed(2)),
        box,
        estimatedRepairCost: repairCost(category, severity, multiplier),
      });
    }
    return dedupeFindings(normalized);
  }

  /** Loads the pickup inspection of a rental (photos + findings) to compare a return against. */
  private static async loadBaseline(rentalId: string) {
    const pickup = await prisma.inspection.findFirst({
      where: { rentalId, type: 'PICKUP' },
      orderBy: { createdAt: 'desc' },
      include: { photos: true, findings: true },
    });
    if (!pickup || pickup.photos.length === 0) {
      throw AppError.badRequest(
        'No pickup inspection with photos exists for this rental, so the return cannot be compared.'
      );
    }

    const images: VisionImage[] = [];
    for (const photo of pickup.photos) {
      if (!isInspectionView(photo.view)) continue;
      const loaded = this.readStoredPhoto(photo.imageUrl);
      if (loaded) images.push({ view: photo.view, ...loaded });
    }
    if (images.length === 0) {
      throw AppError.badRequest('The pickup inspection photos could not be loaded from storage.');
    }

    const findings = pickup.findings.map((f) => this.toAssessedFinding(f));
    return { inspectionId: pickup.id, images, findings };
  }

  private static toAssessedFinding(f: {
    id: string;
    damageType: string;
    severity: string;
    location: string;
    region: string | null;
    confidence: number;
    boundingBox: string | null;
    estimatedRepairCost: Prisma.Decimal | null;
  }): AssessedFinding & { id: string } {
    const meta = this.parseMeta(f.boundingBox);
    const category = meta?.category || normalizeCategory(f.damageType);
    const severity = normalizeSeverity(f.severity);
    return {
      id: f.id,
      view: meta?.view || (isInspectionView(f.region) ? f.region : 'FRONT'),
      category,
      severity,
      part: f.location,
      description: meta?.description || f.damageType,
      confidence: f.confidence,
      box: meta?.box || { x: 0, y: 0, width: 0, height: 0 },
      estimatedRepairCost:
        f.estimatedRepairCost !== null ? Number(f.estimatedRepairCost) : repairCost(category, severity, costMultiplier()),
    };
  }

  private static parseMeta(raw: string | null): StoredFindingMeta | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.box && typeof parsed.box.x === 'number') return parsed as StoredFindingMeta;
      return null;
    } catch {
      return null;
    }
  }

  private static formatInspection(ins: any) {
    const findings = (ins.findings || []).map((f: any) => {
      const assessed = this.toAssessedFinding(f);
      const meta = this.parseMeta(f.boundingBox);
      return {
        id: f.id,
        view: assessed.view,
        category: assessed.category,
        damageType: f.damageType,
        severity: assessed.severity,
        part: f.location,
        description: assessed.description,
        confidence: Math.round(f.confidence * 100),
        box: assessed.box,
        estimatedRepairCost: assessed.estimatedRepairCost,
        classification: meta?.classification || null,
        baselineFindingId: meta?.baselineFindingId || null,
        humanDecision: f.humanDecision,
      };
    });
    const score = typeof ins.overallScore === 'number' ? ins.overallScore : conditionScore(findings);
    return {
      id: ins.id,
      type: ins.type,
      status: ins.status,
      vehicleId: ins.vehicleId,
      rentalId: ins.rentalId,
      createdAt: ins.createdAt,
      overallScore: score,
      conditionGrade: conditionGrade(score),
      summary: ins.summary,
      hasDamageDetected: ins.hasDamageDetected,
      coverageScore: ins.coverageScore,
      vehicle: ins.vehicle,
      rental: ins.rental,
      performedBy: ins.performedBy,
      photos: (ins.photos || [])
        .map((p: any) => ({ id: p.id, view: p.view, imageUrl: p.imageUrl, qualityIssue: p.qualityDetails }))
        .sort((a: any, b: any) => INSPECTION_VIEWS.indexOf(a.view) - INSPECTION_VIEWS.indexOf(b.view)),
      findings,
      totals: {
        findings: findings.length,
        scratches: findings.filter((f: any) => f.category === 'SCRATCH').length,
        dents: findings.filter((f: any) => f.category === 'DENT').length,
        estimatedRepairCost: roundMoney(findings.reduce((s: number, f: any) => s + f.estimatedRepairCost, 0)),
      },
    };
  }

  private static buildSummary(
    type: AnalyzeInspectionDTO['type'],
    vehicleLabel: string,
    findings: AssessedFinding[],
    score: number,
    counts: { newCount: number; worsenedCount: number; inconclusiveCount: number }
  ): string {
    const label = type === 'PICKUP' ? 'Pickup' : type === 'RETURN' ? 'Return' : 'Routine';
    const base = `${label} AI inspection of ${vehicleLabel}: condition ${score}% (${conditionGrade(score).toLowerCase()}), ${
      findings.length === 0 ? 'no visible damage' : `${findings.length} damage item(s) recorded`
    }.`;
    if (type !== 'RETURN') return base;
    if (counts.newCount === 0 && counts.worsenedCount === 0) {
      return `${base} No new damage compared with the pickup inspection.${
        counts.inconclusiveCount > 0 ? ` ${counts.inconclusiveCount} item(s) need staff review.` : ''
      }`;
    }
    return `${base} ${counts.newCount} new and ${counts.worsenedCount} worsened damage item(s) compared with pickup.${
      counts.inconclusiveCount > 0 ? ` ${counts.inconclusiveCount} item(s) need staff review.` : ''
    }`;
  }

  /** Percentage of the 4 required exterior angles that were photographed. */
  private static coverage(images: VisionImage[]): number {
    const covered = REQUIRED_VIEWS.filter((v) => images.some((i) => i.view === v)).length;
    return Math.round((covered / REQUIRED_VIEWS.length) * 100);
  }

  /** Percentage of return angles that have a matching pickup photo to compare against. */
  private static parity(returnImages: VisionImage[], baselineImages: VisionImage[]): number {
    if (returnImages.length === 0) return 0;
    const matched = returnImages.filter((r) => baselineImages.some((b) => b.view === r.view)).length;
    return Math.round((matched / returnImages.length) * 100);
  }

  private static uploadsDir(): string {
    return path.join(process.cwd(), 'uploads', 'inspections');
  }

  private static storePhoto(image: VisionImage, prefix: string) {
    const dir = this.uploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(image.base64, 'base64');
    const ext = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${prefix.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buffer);
    return {
      url: `/uploads/inspections/${filename}`,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      bytes: buffer.length,
    };
  }

  private static readStoredPhoto(url: string): { mimeType: string; base64: string } | null {
    if (!url.startsWith('/uploads/inspections/')) return null;
    const filePath = path.join(this.uploadsDir(), path.basename(url));
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { mimeType, base64: fs.readFileSync(filePath).toString('base64') };
  }

  private static deleteStoredPhoto(url: string) {
    try {
      fs.unlinkSync(path.join(this.uploadsDir(), path.basename(url)));
    } catch {
      // File already gone
    }
  }
}
