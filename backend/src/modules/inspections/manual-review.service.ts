import crypto from 'crypto';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import {
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  NON_CHARGEABLE_CATEGORIES,
  conditionScore,
  isDocumentView,
  isInspectionView,
  isVehiclePanel,
  repairCost,
  roundMoney,
  type ComparisonClassification,
  type DamageCategory,
  type DamageSeverity,
  type InspectionView,
  type VehiclePanel,
} from './damage-assessment';
import { CATEGORY_LABEL, InspectionService, costMultiplier } from './inspection.service';

const MAX_MANUAL_FINDINGS = 40;
const MAX_CHARGE = 1_000_000;
/** Manual findings have no marked area on the photo; the panel identifies the damage instead. */
const NO_BOX = { x: 0, y: 0, width: 0, height: 0 };

export interface ManualFindingDTO {
  view?: unknown;
  panel?: unknown;
  category?: unknown;
  severity?: unknown;
  description?: unknown;
  /** Return inspections only: the damage was not there at pickup, so the customer is charged */
  newDamage?: unknown;
  /** Return inspections only: charge for a new damage; defaults to the standard repair cost */
  chargeAmount?: unknown;
}

interface ParsedFinding {
  view: InspectionView;
  panel: VehiclePanel;
  category: DamageCategory;
  severity: DamageSeverity;
  description: string;
  part: string;
  repairCost: number;
  newDamage: boolean;
  chargeAmount: number;
}

function panelLabel(panel: VehiclePanel): string {
  return panel.toLowerCase().replace(/_/g, ' ');
}

/**
 * Staff review of an inspection the AI could not check: staff look at the photos and record each damage
 * themselves. Pickup findings become the rental baseline; new damage on a return becomes a proposed charge
 * that goes through the usual approve / waive / dispute steps.
 */
export class ManualReviewService {
  static async complete(inspectionId: string, staffUserId: string | undefined, dto: { findings?: unknown; notes?: unknown }) {
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        photos: { select: { view: true } },
        rental: { select: { id: true, status: true, booking: { select: { id: true, currency: true } } } },
      },
    });
    if (!inspection) throw AppError.notFound('Inspection record not found');
    if (inspection.bookingId) {
      throw AppError.badRequest("A customer's own check is kept as their evidence and is not reviewed by staff");
    }
    if (!inspection.manualReview) throw AppError.badRequest('The AI already checked this inspection');
    if (inspection.status !== 'CAPTURE_COMPLETE') throw AppError.conflict('This inspection has already been reviewed');
    if (inspection.type === 'RETURN' && inspection.rental?.status !== 'ACTIVE') {
      throw AppError.badRequest('This rental has already been returned');
    }

    const photographed = new Set(inspection.photos.map((p) => p.view).filter((v) => isInspectionView(v) && !isDocumentView(v)));
    const findings = this.parseFindings(dto.findings, photographed, inspection.type === 'RETURN');
    const notes = String(dto.notes ?? '').trim().slice(0, 1000);

    const comparison =
      inspection.type === 'RETURN'
        ? await prisma.damage_comparisons.findFirst({
            where: { returnInspectionId: inspection.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
        : null;
    if (inspection.type === 'RETURN' && (!comparison || !inspection.rental?.booking)) {
      throw AppError.badRequest('The return inspection has no comparison with the pickup inspection');
    }

    const score = conditionScore(findings);
    const newCount = findings.filter((f) => f.newDamage).length;
    const summary = [
      findings.length === 0
        ? 'Checked by staff without AI: no damage found.'
        : `Checked by staff without AI: ${findings.length} damage${findings.length === 1 ? '' : 's'} recorded${
            inspection.type === 'RETURN' ? `, ${newCount} new since pickup` : ''
          }.`,
      notes ? `Reviewer notes: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await prisma.$transaction(async (tx) => {
      // Guard against two reviewers saving at the same time
      const claimed = await tx.inspection.updateMany({
        where: { id: inspection.id, status: 'CAPTURE_COMPLETE' },
        data: {
          status: 'REVIEWED',
          overallScore: score,
          hasDamageDetected: findings.length > 0,
          summary,
          updatedAt: new Date(),
        },
      });
      if (claimed.count === 0) throw AppError.conflict('This inspection has already been reviewed');

      const now = new Date();
      let proposedTotal = 0;
      for (const f of findings) {
        const classification: ComparisonClassification | null =
          inspection.type === 'RETURN' ? (f.newDamage ? 'CONFIRMED_NEW_DAMAGE' : 'PRE_EXISTING_UNCHANGED') : null;
        const row = await tx.damageFinding.create({
          data: {
            inspectionId: inspection.id,
            damageType: CATEGORY_LABEL[f.category],
            severity: f.severity,
            location: f.part.slice(0, 64),
            region: f.view,
            confidence: 1,
            boundingBox: JSON.stringify({
              view: f.view,
              panel: f.panel,
              category: f.category,
              description: f.description,
              box: NO_BOX,
              ...(classification ? { classification } : {}),
            }),
            estimatedRepairCost: f.repairCost,
            isHumanVerified: true,
            humanDecision: classification ?? (inspection.type === 'PICKUP' ? 'BASELINE_DOCUMENTED' : null),
          },
        });

        if (comparison && classification) {
          await tx.damage_comparison_matches.create({
            data: {
              id: crypto.randomUUID(),
              comparisonId: comparison.id,
              findingId: row.id,
              baselineFindingId: null,
              region: f.view,
              classification,
              confidence: 1,
              proposedCost: f.newDamage ? f.chargeAmount : 0,
            },
          });
          if (f.newDamage && f.chargeAmount > 0) {
            proposedTotal += f.chargeAmount;
            await tx.damage_charges.create({
              data: {
                id: crypto.randomUUID(),
                bookingId: inspection.rental!.booking.id,
                comparisonId: comparison.id,
                damageFindingId: row.id,
                description: `New ${CATEGORY_LABEL[f.category].toLowerCase()} (${f.severity.toLowerCase()}) - ${f.part} (staff review)`.slice(0, 255),
                proposedAmount: f.chargeAmount,
                approvedAmount: 0,
                currency: inspection.rental!.booking.currency,
                status: 'PROPOSED',
                updatedAt: now,
              },
            });
          }
        }
      }

      if (comparison) {
        await tx.damage_comparisons.update({
          where: { id: comparison.id },
          data: {
            summary,
            newDamageCount: newCount,
            preExistingCount: findings.length - newCount,
            inconclusiveCount: 0,
            totalProposedCharges: roundMoney(proposedTotal),
            updatedAt: now,
          },
        });
      }

      await tx.securityAuditLog.create({
        data: {
          userId: staffUserId || null,
          event: 'INSPECTION_MANUAL_REVIEW_COMPLETED',
          metadata: JSON.stringify({
            inspectionId: inspection.id,
            type: inspection.type,
            findings: findings.length,
            newDamage: newCount,
            proposedCharges: roundMoney(proposedTotal),
          }),
        },
      });
    });

    return InspectionService.getById(inspection.id);
  }

  private static parseFindings(raw: unknown, photographed: Set<string>, isReturn: boolean): ParsedFinding[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw AppError.badRequest('findings must be a list');
    if (raw.length > MAX_MANUAL_FINDINGS) throw AppError.badRequest(`At most ${MAX_MANUAL_FINDINGS} damages can be recorded`);
    const multiplier = costMultiplier();

    return raw.map((item: ManualFindingDTO, index) => {
      const position = `Damage ${index + 1}`;
      const view = String(item?.view ?? '');
      if (!isInspectionView(view) || !photographed.has(view)) {
        throw AppError.badRequest(`${position}: choose one of the photographed angles`);
      }
      const panel = String(item?.panel ?? '');
      if (!isVehiclePanel(panel)) throw AppError.badRequest(`${position}: choose the damaged part`);
      const category = String(item?.category ?? '') as DamageCategory;
      if (!DAMAGE_CATEGORIES.includes(category)) throw AppError.badRequest(`${position}: choose the type of damage`);
      const severity = String(item?.severity ?? '') as DamageSeverity;
      if (!DAMAGE_SEVERITIES.includes(severity)) throw AppError.badRequest(`${position}: choose how serious it is`);
      const description = String(item?.description ?? '').trim();
      if (description.length > 300) throw AppError.badRequest(`${position}: the description must be at most 300 characters`);

      const cost = repairCost(category, severity, multiplier);
      const newDamage = isReturn && item?.newDamage === true;
      let chargeAmount = 0;
      if (newDamage && !NON_CHARGEABLE_CATEGORIES.includes(category)) {
        const requested = item?.chargeAmount;
        chargeAmount =
          requested === undefined || requested === null || requested === ''
            ? cost
            : roundMoney(Number(requested));
        if (!Number.isFinite(chargeAmount) || chargeAmount < 0 || chargeAmount > MAX_CHARGE) {
          throw AppError.badRequest(`${position}: enter a valid charge`);
        }
      }

      const part = panelLabel(panel as VehiclePanel);
      return {
        view: view as InspectionView,
        panel: panel as VehiclePanel,
        category,
        severity,
        description: description || `${CATEGORY_LABEL[category]} on the ${part}`,
        part,
        repairCost: cost,
        newDamage,
        chargeAmount,
      };
    });
  }
}
