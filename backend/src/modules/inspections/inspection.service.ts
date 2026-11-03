import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';

export interface CreateAiInspectionDTO {
  vehicleId: string;
  rentalId?: string;
  type: 'PICKUP' | 'RETURN' | 'ROUTINE';
  summary?: string;
  photos: Array<{
    view: 'FRONT' | 'DRIVER_SIDE' | 'PASSENGER_SIDE' | 'REAR';
    imageUrl: string;
  }>;
}

export interface ReviewFindingDTO {
  decision: 'APPROVED_CLAIM' | 'REJECTED_FALSE_POSITIVE' | 'MAINTENANCE_SCHEDULED';
  notes?: string;
}

export class InspectionService {
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
            booking: { include: { customer: true } },
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
      findings: inspection.findings.map(this.formatFinding),
    };
  }

  /**
   * Runs AI computer vision analysis on uploaded inspection views
   */
  static async runAiAnalysis(dto: CreateAiInspectionDTO, staffUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found for inspection');
    }

    // Determine simulated computer vision findings based on inspection type
    // In return inspections, AI compares with baseline pickup and flags potential new damage
    const isReturnInspection = dto.type === 'RETURN';
    const hasDamageDetected = isReturnInspection; // Simulate detection on return for demonstration

    const overallScore = isReturnInspection ? 86.5 : 99.2;
    const summary = isReturnInspection
      ? 'AI Computer Vision detected 2 potential surface anomalies on vehicle exterior (Rear Bumper & Driver Door). Review required.'
      : 'Baseline pickup scan complete. Vehicle surface pristine with 0 detected defects.';

    const inspection = await prisma.$transaction(async (tx) => {
      // 1. Create Inspection record
      const created = await tx.inspection.create({
        data: {
          vehicleId: dto.vehicleId,
          rentalId: dto.rentalId || null,
          type: dto.type,
          performedById: staffUserId || null,
          overallScore,
          summary,
          hasDamageDetected,
        },
      });

      // 2. Persist uploaded photos
      if (dto.photos && dto.photos.length > 0) {
        for (const p of dto.photos) {
          await tx.inspectionPhoto.create({
            data: {
              inspectionId: created.id,
              view: p.view,
              imageUrl: p.imageUrl,
              qualityScore: 98.0,
            },
          });
        }
      }

      // 3. Persist AI damage findings if detected
      if (hasDamageDetected) {
        // Finding 1: Rear Bumper Scratch
        await tx.damageFinding.create({
          data: {
            inspectionId: created.id,
            damageType: 'Scratch & Clearcoat Scuff',
            severity: 'LOW',
            location: 'Rear Bumper Passenger Corner',
            confidence: 0.94,
            boundingBox: JSON.stringify({ x: 0.68, y: 0.62, width: 0.16, height: 0.11 }),
            estimatedRepairCost: 180.0,
            isHumanVerified: false,
            humanDecision: 'PENDING_REVIEW',
          },
        });

        // Finding 2: Door Dent
        await tx.damageFinding.create({
          data: {
            inspectionId: created.id,
            damageType: 'Minor Panel Dent (1.5 cm)',
            severity: 'MEDIUM',
            location: 'Driver Side Door Lower Crease',
            confidence: 0.89,
            boundingBox: JSON.stringify({ x: 0.42, y: 0.55, width: 0.12, height: 0.08 }),
            estimatedRepairCost: 320.0,
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
            hasDamageDetected,
            score: overallScore,
          }),
        },
      });

      return created;
    });

    return this.getById(inspection.id);
  }

  /**
   * Reviews and verifies an AI damage finding
   */
  static async reviewFinding(findingId: string, dto: ReviewFindingDTO, staffUserId?: string) {
    const finding = await prisma.damageFinding.findUnique({
      where: { id: findingId },
      include: { inspection: { include: { vehicle: true } } },
    });

    if (!finding) {
      throw AppError.notFound('Damage finding not found');
    }

    const updated = await prisma.damageFinding.update({
      where: { id: findingId },
      data: {
        isHumanVerified: true,
        humanDecision: dto.decision,
      },
    });

    await prisma.securityAuditLog.create({
      data: {
        userId: staffUserId || null,
        event: 'AI_DAMAGE_FINDING_REVIEWED',
        metadata: JSON.stringify({
          findingId,
          vehicleId: finding.inspection.vehicleId,
          decision: dto.decision,
          notes: dto.notes,
        }),
      },
    });

    return this.formatFinding(updated);
  }
}
