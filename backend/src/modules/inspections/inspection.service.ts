import fs from 'fs';
import path from 'path';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import {
  InspectionAiEngine,
  type BaselineStoredPhoto,
  type DetectedDamageItem,
  type InputPhotoWithTelemetry,
} from './inspection-ai.engine';
import type { ViewPixelTelemetry } from './vision-core';

export interface CreateAiInspectionDTO {
  vehicleId: string;
  rentalId?: string;
  bookingId?: string;
  pickupInspectionId?: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  summary?: string;
  photos: Array<{
    view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR' | 'ROOF' | 'INTERIOR';
    imageUrl: string;
    pixelTelemetry?: Partial<ViewPixelTelemetry>;
  }>;
  simulatedDamage?: boolean;
}

export interface ReviewFindingDTO {
  decision: 'APPROVED_CLAIM' | 'REJECTED_FALSE_POSITIVE' | 'MAINTENANCE_SCHEDULED';
  notes?: string;
}

export interface CompareInspectionsDTO {
  bookingId: string;
  pickupInspectionId: string;
  returnInspectionId: string;
  securityDeposit?: number;
}

export class InspectionService {
  private static readonly DEFAULT_FALLBACK_PHOTO =
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';

  /**
   * Persists base64 data-URI inspection photos to disk under /uploads/inspections/
   * so Prisma's VarChar(512) column stores a short served URL cleanly.
   */
  static persistPhotoUrl(rawUrl: string | undefined | null, prefix: string): string {
    if (!rawUrl || !rawUrl.trim()) {
      return this.DEFAULT_FALLBACK_PHOTO;
    }

    const trimmed = rawUrl.trim();
    const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (match) {
      try {
        const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        const dir = path.join(process.cwd(), 'uploads', 'inspections');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
        return `/uploads/inspections/${filename}`;
      } catch {
        return this.DEFAULT_FALLBACK_PHOTO;
      }
    }

    if (trimmed.length > 500) {
      return this.DEFAULT_FALLBACK_PHOTO;
    }
    return trimmed;
  }

  /**
   * Safely parses JSON boundingBox string
   */
  private static safeParseBox(raw?: string | null) {
    if (!raw) return { x: 0.25, y: 0.35, width: 0.2, height: 0.2 };
    try {
      return JSON.parse(raw);
    } catch {
      return { x: 0.25, y: 0.35, width: 0.2, height: 0.2 };
    }
  }

  private static inferCategory(damageType: string): DetectedDamageItem['category'] {
    const lower = (damageType || '').toLowerCase();
    if (lower.includes('scratch') || lower.includes('scuff') || lower.includes('abrasion') || lower.includes('gouge')) {
      return 'SCRATCH';
    }
    if (lower.includes('crack') || lower.includes('fracture')) {
      return 'CRACK';
    }
    if (lower.includes('chip') || lower.includes('peel')) {
      return 'PAINT_CHIP';
    }
    return 'DENT';
  }

  private static mapDbFinding(f: {
    id: string;
    damageType: string;
    severity: string;
    location: string;
    region?: string | null;
    confidence: number;
    boundingBox?: string | null;
    estimatedRepairCost?: unknown;
  }): DetectedDamageItem {
    return {
      id: f.id,
      damageType: f.damageType,
      category: this.inferCategory(f.damageType),
      severity: (['LOW', 'MEDIUM', 'HIGH'].includes((f.severity || '').toUpperCase())
        ? f.severity.toUpperCase()
        : 'MEDIUM') as DetectedDamageItem['severity'],
      location: f.location,
      confidence: Number(f.confidence || 0.85),
      boundingBox: this.safeParseBox(f.boundingBox),
      view: this.inferView(f.region, f.location),
      estimatedRepairCost: Number(f.estimatedRepairCost || 180),
      description: f.damageType,
    };
  }

  /**
   * Infers standard angle view from explicit region or location label
   */
  private static inferView(region?: string | null, location?: string | null): DetectedDamageItem['view'] {
    const r = (region || '').toUpperCase();
    if (r === 'FRONT' || r === 'DRIVER_SIDE' || r === 'PASSENGER_SIDE' || r === 'REAR' || r === 'ROOF' || r === 'INTERIOR') {
      return r as DetectedDamageItem['view'];
    }
    const loc = (location || '').toLowerCase();
    if (loc.includes('rear')) return 'REAR';
    if (loc.includes('driver') || loc.includes('left')) return 'DRIVER_SIDE';
    if (loc.includes('passenger') || loc.includes('door') || loc.includes('right')) return 'PASSENGER_SIDE';
    if (loc.includes('roof')) return 'ROOF';
    return 'FRONT';
  }

  /**
   * Helper to format DamageFinding with guaranteed estimatedRepairCost, status, and confidence percentage
   */
  static formatFinding(f: {
    id: string;
    inspectionId: string;
    damageType: string;
    severity: string;
    location: string;
    confidence: number;
    boundingBox?: string | null;
    estimatedRepairCost?: any;
    isHumanVerified: boolean;
    humanDecision?: string | null;
    createdAt: Date;
  }) {
    const defaultCost = (severity: string) => {
      const s = (severity || '').toUpperCase();
      if (s === 'SEVERE' || s === 'HIGH') return 650.0;
      if (s === 'MODERATE' || s === 'MEDIUM') return 320.0;
      return 180.0;
    };

    const rawCost =
      f.estimatedRepairCost !== null && f.estimatedRepairCost !== undefined
        ? Number(f.estimatedRepairCost)
        : defaultCost(f.severity);

    const conf = Number(f.confidence ?? 0);
    const confidencePct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);

    return {
      ...f,
      estimatedRepairCost: Number(rawCost.toFixed(2)),
      status: f.humanDecision || (f.isHumanVerified ? 'APPROVED_CLAIM' : 'PENDING_REVIEW'),
      confidence: confidencePct,
    };
  }

  /**
   * Lists all vehicle inspections
   */
  static async listInspections() {
    const inspections = await prisma.inspection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: {
          include: { category: true },
        },
        rental: {
          include: { booking: { include: { customer: true } } },
        },
        findings: true,
        photos: true,
      },
    });

    return inspections.map((ins) => ({
      ...ins,
      findings: ins.findings.map(this.formatFinding),
    }));
  }

  /**
   * Retrieves single inspection session with all photos & damage findings
   */
  static async getById(id: string) {
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: { category: true, photos: true },
        },
        rental: {
          include: {
            booking: {
              include: {
                customer: true,
                damage_comparisons: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
            inspections: {
              orderBy: { createdAt: 'asc' },
              include: { findings: true, photos: true },
            },
          },
        },
        findings: true,
        photos: true,
        performedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!inspection) {
      throw AppError.notFound('Inspection record not found');
    }

    return {
      ...inspection,
      findings: inspection.findings.map((f) => this.formatFinding(f)),
      rental: inspection.rental
        ? {
            ...inspection.rental,
            inspections: inspection.rental.inspections.map((relIns) => ({
              ...relIns,
              findings: relIns.findings.map((f) => this.formatFinding(f)),
            })),
          }
        : null,
    };
  }

  /**
   * Executes dynamic computer vision inspection on real uploaded photos.
   * Compares Return scans automatically against the stored Pickup baseline when available.
   */
  static async runAiAnalysis(dto: CreateAiInspectionDTO, staffUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found for inspection');
    }

    // Resolve rentalId automatically if bookingId provided
    let resolvedRentalId = dto.rentalId || null;
    if (!resolvedRentalId && dto.bookingId) {
      const linkedRental = await prisma.rental.findUnique({
        where: { bookingId: dto.bookingId },
        select: { id: true },
      });
      if (linkedRental) resolvedRentalId = linkedRental.id;
    }

    // Load baseline PICKUP inspection (photos + findings) when performing RETURN inspection
    let baselinePhotos: BaselineStoredPhoto[] | undefined;
    let baselineFindings: DetectedDamageItem[] | undefined;

    if (dto.type === 'RETURN') {
      const baselineInspection = dto.pickupInspectionId
        ? await prisma.inspection.findUnique({
            where: { id: dto.pickupInspectionId },
            include: { photos: true, findings: true },
          })
        : resolvedRentalId
        ? await prisma.inspection.findFirst({
            where: { rentalId: resolvedRentalId, type: 'PICKUP' },
            orderBy: { createdAt: 'desc' },
            include: { photos: true, findings: true },
          })
        : await prisma.inspection.findFirst({
            where: { vehicleId: dto.vehicleId, type: 'PICKUP' },
            orderBy: { createdAt: 'desc' },
            include: { photos: true, findings: true },
          });

      if (baselineInspection) {
        baselinePhotos = baselineInspection.photos.map((p) => ({
          view: p.view,
          imageUrl: p.imageUrl,
          sha256Hash: p.sha256Hash,
          qualityDetails: p.qualityDetails,
          qualityScore: p.qualityScore,
        }));
        baselineFindings = baselineInspection.findings.map((f) => this.mapDbFinding(f));
      }
    }

    const inputPhotos: InputPhotoWithTelemetry[] = (dto.photos || []).map((p) => ({
      view: p.view,
      imageUrl: p.imageUrl,
      pixelTelemetry: p.pixelTelemetry,
    }));

    // Run Dynamic Computer Vision Analysis
    const aiAnalysis = await InspectionAiEngine.analyzeVehiclePhotosAsync({
      type: dto.type,
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      vehicleColor: vehicle.color,
      photos: inputPhotos,
      baselinePhotos,
      baselineFindings,
    });

    const userCustomNote =
      dto.summary && !dto.summary.startsWith('Standard multi-angle') ? ` ${dto.summary}` : '';

    const inspection = await prisma.$transaction(async (tx) => {
      // 1. Create Inspection record with real pixel-derived metrics
      const created = await tx.inspection.create({
        data: {
          vehicleId: dto.vehicleId,
          rentalId: resolvedRentalId,
          type: dto.type,
          performedById: staffUserId || null,
          overallScore: aiAnalysis.overallScore,
          summary: `${aiAnalysis.summary} [Detected Color: ${aiAnalysis.detectedColor.colorName}]${userCustomNote}`,
          hasDamageDetected: aiAnalysis.hasDamageDetected,
          coverageScore: aiAnalysis.coverageScore,
          capturePlanVersion: aiAnalysis.engineMode === 'MULTIMODAL_LLM' ? 'v4.0-llm' : 'v4.0-cv',
        },
      });

      // 2. Persist uploaded photos + cryptographic SHA-256 & pixel telemetry for future comparison
      if (dto.photos && dto.photos.length > 0) {
        for (let i = 0; i < dto.photos.length; i++) {
          const p = dto.photos[i];
          const meta = aiAnalysis.photoMetadata[i];
          await tx.inspectionPhoto.create({
            data: {
              inspectionId: created.id,
              view: p.view,
              imageUrl: this.persistPhotoUrl(p.imageUrl, `${dto.type.toLowerCase()}-${p.view.toLowerCase()}`),
              qualityScore: meta?.qualityScore ?? 85.0,
              sha256Hash: meta?.sha256Hash,
              fileSizeBytes: meta?.fileSizeBytes,
              dimensions: meta?.dimensions,
              qualityDetails: meta?.qualityDetails,
            },
          });
        }
      }

      // 3. Persist AI damage findings with camera angle region
      for (const finding of aiAnalysis.findings) {
        await tx.damageFinding.create({
          data: {
            inspectionId: created.id,
            damageType: finding.damageType.slice(0, 64),
            severity: finding.severity,
            location: finding.location.slice(0, 64),
            region: finding.view,
            confidence: finding.confidence,
            boundingBox: JSON.stringify(finding.boundingBox),
            estimatedRepairCost: finding.estimatedRepairCost,
            isHumanVerified: false,
            humanDecision: 'PENDING_REVIEW',
          },
        });
      }

      // 4. Audit Log
      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'AI_INSPECTION_COMPLETED',
          metadata: JSON.stringify({
            inspectionId: created.id,
            vehicle: `${vehicle.brand} ${vehicle.model}`,
            type: dto.type,
            engineMode: aiAnalysis.engineMode,
            detectedColor: aiAnalysis.detectedColor.colorName,
            scratches: aiAnalysis.scratchesCount,
            dents: aiAnalysis.dentsCount,
            score: aiAnalysis.overallScore,
            parityScore: aiAnalysis.parityScore,
            certHash: aiAnalysis.inspectionHash,
          }),
        },
      });

      return created;
    });

    const fullInspection = await this.getById(inspection.id);
    return {
      ...fullInspection,
      aiAnalysis: {
        detectedColor: aiAnalysis.detectedColor,
        scratchesCount: aiAnalysis.scratchesCount,
        dentsCount: aiAnalysis.dentsCount,
        inspectionHash: aiAnalysis.inspectionHash,
        engineMode: aiAnalysis.engineMode,
        parityScore: aiAnalysis.parityScore,
      },
    };
  }

  /**
   * Reviews and verifies an AI damage finding
   */
  static async reviewFinding(findingId: string, dto: ReviewFindingDTO, staffUserId?: string) {
    const finding = await prisma.damageFinding.findUnique({
      where: { id: findingId },
      include: {
        inspection: {
          include: {
            vehicle: true,
            rental: {
              include: {
                booking: {
                  include: {
                    damage_comparisons: { orderBy: { createdAt: 'desc' }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!finding) {
      throw AppError.notFound('Damage finding not found');
    }

    const formattedBase = this.formatFinding(finding);
    const repairCost = formattedBase.estimatedRepairCost;
    const bookingId = finding.inspection.rental?.bookingId || null;
    const latestComparisonId = finding.inspection.rental?.booking?.damage_comparisons?.[0]?.id || null;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.damageFinding.update({
        where: { id: findingId },
        data: {
          isHumanVerified: true,
          humanDecision: dto.decision,
        },
      });

      let maintenanceRecordId: string | null = null;
      let maintenanceCreated = false;
      let nextVehicleStatus: string = finding.inspection.vehicle.status;

      // Sync damage_charges when linked to a booking
      if (bookingId && (dto.decision === 'APPROVED_CLAIM' || dto.decision === 'REJECTED_FALSE_POSITIVE')) {
        const existingCharge = await tx.damage_charges.findFirst({
          where: { damageFindingId: findingId },
        });

        if (dto.decision === 'APPROVED_CLAIM') {
          if (existingCharge) {
            await tx.damage_charges.update({
              where: { id: existingCharge.id },
              data: {
                status: 'APPROVED',
                approvedAmount: repairCost,
                approvedById: staffUserId || null,
                approvedAt: new Date(),
                disputeNotes: dto.notes || existingCharge.disputeNotes,
                updatedAt: new Date(),
              },
            });
          } else {
            await tx.damage_charges.create({
              data: {
                id: `DC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                bookingId,
                comparisonId: latestComparisonId,
                damageFindingId: findingId,
                description: `${finding.damageType} — ${finding.location}`.slice(0, 255),
                proposedAmount: repairCost,
                approvedAmount: repairCost,
                currency: 'USD',
                status: 'APPROVED',
                approvedById: staffUserId || null,
                approvedAt: new Date(),
                disputeNotes: dto.notes || null,
                updatedAt: new Date(),
              },
            });
          }
        } else if (dto.decision === 'REJECTED_FALSE_POSITIVE' && existingCharge) {
          await tx.damage_charges.update({
            where: { id: existingCharge.id },
            data: {
              status: 'REJECTED',
              approvedAmount: 0,
              disputeNotes: dto.notes || 'Dismissed by inspector as false positive',
              disputeResolvedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Recompute approved charges total on latest comparison if present
        if (latestComparisonId) {
          const allInspectionFindings = await tx.damageFinding.findMany({
            where: { inspectionId: finding.inspectionId },
          });
          const approvedTotal = allInspectionFindings
            .filter((f) => f.humanDecision === 'APPROVED_CLAIM')
            .reduce((sum, f) => sum + this.formatFinding(f).estimatedRepairCost, 0);

          await tx.damage_comparisons.update({
            where: { id: latestComparisonId },
            data: {
              totalApprovedCharges: approvedTotal,
              reviewerId: staffUserId || null,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

      // Route to real Workshop VehicleMaintenance record when decision is MAINTENANCE_SCHEDULED
      if (dto.decision === 'MAINTENANCE_SCHEDULED') {
        const existingMaint = await tx.vehicleMaintenance.findFirst({
          where: {
            vehicleId: finding.inspection.vehicleId,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            notes: { contains: finding.id },
          },
        });

        if (existingMaint) {
          maintenanceRecordId = existingMaint.id;
        } else {
          const createdMaint = await tx.vehicleMaintenance.create({
            data: {
              vehicleId: finding.inspection.vehicleId,
              maintenanceType: 'BODY_WORK',
              status: 'SCHEDULED',
              title: `Workshop Repair: ${finding.damageType}`.slice(0, 128),
              description: `AI Inspection detected ${finding.severity} severity issue at ${finding.location}.`,
              serviceProvider: 'Finovo Certified Bodyshop',
              scheduledDate: new Date(),
              odometerReading: finding.inspection.vehicle.mileage || null,
              cost: repairCost,
              currency: 'USD',
              notes: `Auto-routed from AI Inspection #${finding.inspectionId} [Finding:${finding.id}]`,
              createdBy: staffUserId || 'Inspection Staff',
            },
          });
          maintenanceRecordId = createdMaint.id;
          maintenanceCreated = true;
        }

        if (finding.inspection.vehicle.status !== 'RENTED') {
          await tx.vehicle.update({
            where: { id: finding.inspection.vehicleId },
            data: { status: 'MAINTENANCE' },
          });
          nextVehicleStatus = 'MAINTENANCE';
        }

        await tx.vehicleAuditLog.create({
          data: {
            vehicleId: finding.inspection.vehicleId,
            userId: staffUserId || null,
            action: 'MAINTENANCE_LOGGED',
            details: `Workshop repair scheduled from AI Inspection Finding (${finding.damageType} at ${finding.location})`,
          },
        });
      }

      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'AI_DAMAGE_FINDING_REVIEWED',
          metadata: JSON.stringify({
            findingId,
            vehicleId: finding.inspection.vehicleId,
            decision: dto.decision,
            maintenanceRecordId,
            notes: dto.notes,
          }),
        },
      });

      return {
        finding: this.formatFinding(updated),
        maintenanceCreated,
        maintenanceRecordId,
        vehicleStatus: nextVehicleStatus,
      };
    });

    return result;
  }

  /**
   * Compares Pickup Baseline Inspection vs Return Inspection.
   * Differentiates pre-existing damages from new customer damages and calculates deposit adjustment.
   */
  static async compareInspections(dto: CompareInspectionsDTO, reviewerUserId?: string) {
    const pickup = await prisma.inspection.findUnique({
      where: { id: dto.pickupInspectionId },
      include: { findings: true, vehicle: true },
    });

    const returnIns = await prisma.inspection.findUnique({
      where: { id: dto.returnInspectionId },
      include: { findings: true, vehicle: true },
    });

    if (!pickup) throw AppError.notFound('Pickup baseline inspection not found');
    if (!returnIns) throw AppError.notFound('Return inspection record not found');

    const pickupFindings: DetectedDamageItem[] = pickup.findings.map((f) => this.mapDbFinding(f));
    const returnFindings: DetectedDamageItem[] = returnIns.findings.map((f) => this.mapDbFinding(f));

    const depositAmount = dto.securityDeposit || Number(pickup.vehicle.securityDeposit || 50000);
    const comparison = InspectionAiEngine.compareInspections(
      pickupFindings,
      returnFindings,
      depositAmount
    );

    const comparisonId = `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const savedRecord = await prisma.damage_comparisons.create({
      data: {
        id: comparisonId,
        bookingId: dto.bookingId,
        vehicleId: pickup.vehicleId,
        pickupInspectionId: dto.pickupInspectionId,
        returnInspectionId: dto.returnInspectionId,
        status: comparison.newDamageCount > 0 ? 'PENDING_REVIEW' : 'APPROVED',
        summary: comparison.summary,
        coverageParityScore: comparison.coverageParityScore,
        preExistingCount: comparison.preExistingCount,
        newDamageCount: comparison.newDamageCount,
        inconclusiveCount: 0,
        totalProposedCharges: comparison.totalProposedCharges,
        totalApprovedCharges: comparison.totalProposedCharges,
        reviewerId: reviewerUserId || null,
        updatedAt: new Date(),
      },
    });

    const pickupScore = pickup.overallScore ?? 100;
    const returnScore = returnIns.overallScore ?? 100;

    return {
      ...comparison,
      comparisonId: savedRecord.id,
      status: savedRecord.status,
      pickupScore,
      returnScore,
      scoreDelta: Number((returnScore - pickupScore).toFixed(1)),
      pickupSummary: pickup.summary,
      returnSummary: returnIns.summary,
      pickupFindingsCount: pickup.findings.length,
      returnFindingsCount: returnIns.findings.length,
      vehicle: {
        id: pickup.vehicle.id,
        brand: pickup.vehicle.brand,
        model: pickup.vehicle.model,
        registrationNumber: pickup.vehicle.registrationNumber,
        vin: pickup.vehicle.vin,
      },
    };
  }

  /**
   * Retrieves full comparison record with all details
   */
  static async getComparisonById(id: string) {
    const comparison = await prisma.damage_comparisons.findUnique({
      where: { id },
      include: {
        bookings: { include: { customer: true } },
        vehicles: true,
        inspections_damage_comparisons_pickupInspectionIdToinspections: {
          include: { findings: true, photos: true },
        },
        inspections_damage_comparisons_returnInspectionIdToinspections: {
          include: { findings: true, photos: true },
        },
      },
    });

    if (!comparison) {
      throw AppError.notFound('Damage comparison report not found');
    }

    return comparison;
  }
}
