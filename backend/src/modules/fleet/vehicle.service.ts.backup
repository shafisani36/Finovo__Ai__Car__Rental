import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { VehicleImageService } from './vehicle-image.service';
import type {
  VehicleFilterInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateDocumentInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  CreateDamageReportInput,
  UpdateDamageReportInput,
  CreateOdometerLogInput,
  CreateLocationLogInput,
  CreatePricingTierInput,
  UpdatePricingTierInput,
} from './vehicle.validation';
import { Prisma } from '@prisma/client';
import type {
  VehicleStatus,
  DocumentType,
  MaintenanceType,
  MaintenanceStatus,
  DamageSeverity,
  DamageStatus,
} from '@prisma/client';


export class VehicleService {
  /**
   * Retrieves paginated vehicles with filtering and sorting
   */
  static async listVehicles(filters: VehicleFilterInput) {
    const { page, limit, search, category, status, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { brand: { contains: query } },
        { model: { contains: query } },
        { registrationNumber: { contains: query } },
        { vin: { contains: query } },
        { trim: { contains: query } },
        { vehicleCode: { contains: query } },
      ];
    }

    if (category && category !== 'ALL') {
      where.OR = [
        { categoryId: category },
        { category: { slug: category.toLowerCase() } },
        { category: { name: category } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status as VehicleStatus;
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true, slug: true, baseRate: true },
          },
          branch: {
            select: { id: true, name: true, code: true, city: true },
          },
          photos: {
            orderBy: { order: 'asc' },
          },
          documents: {
            select: { id: true, documentType: true, expiresAt: true, title: true },
          },
          maintenanceRecords: {
            where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            take: 1,
            select: { id: true, status: true, scheduledDate: true },
          },
        },
      }),
    ]);

    return {
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns aggregated fleet statistics matching the Figma metric cards and dashboard
   */
  static async getMetrics() {
    const [total, available, rented, maintenance, archived] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { status: 'RENTED' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      prisma.vehicle.count({ where: { status: 'ARCHIVED' } }),
    ]);

    return {
      total,
      available,
      rented,
      maintenance,
      archived,
    };
  }

  /**
   * Comprehensive fleet dashboard statistics derived from real database records
   */
  static async getDashboardStats() {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      available,
      rented,
      maintenance,
      archived,
      expiredDocsCount,
      expiringDocsCount,
      scheduledMaintenanceCount,
      categories,
      vehicles,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { status: 'RENTED' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      prisma.vehicle.count({ where: { status: 'ARCHIVED' } }),
      prisma.vehicleDocument.count({
        where: { expiresAt: { lt: now } },
      }),
      prisma.vehicleDocument.count({
        where: {
          expiresAt: {
            gte: now,
            lte: in30Days,
          },
        },
      }),
      prisma.vehicleMaintenance.count({
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      }),
      prisma.vehicleCategory.findMany({
        include: {
          _count: { select: { vehicles: true } },
        },
      }),
      prisma.vehicle.findMany({
        select: {
          id: true,
          brand: true,
          model: true,
          fuelType: true,
          status: true,
          mileage: true,
          nextServiceMileage: true,
        },
      }),
      prisma.vehicleAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: {
            select: { id: true, brand: true, model: true, registrationNumber: true },
          },
        },
      }),
    ]);

    // Compute Brand Breakdown
    const brandCounts: Record<string, number> = {};
    const fuelCounts: Record<string, number> = {};
    let maintenanceDueMileageCount = 0;

    for (const v of vehicles) {
      brandCounts[v.brand] = (brandCounts[v.brand] || 0) + 1;
      fuelCounts[v.fuelType] = (fuelCounts[v.fuelType] || 0) + 1;
      if (v.nextServiceMileage && v.nextServiceMileage - v.mileage <= 1000) {
        maintenanceDueMileageCount++;
      }
    }

    const categoryBreakdown = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: c._count.vehicles,
    }));

    const brandBreakdown = Object.entries(brandCounts).map(([brand, count]) => ({
      brand,
      count,
    }));

    const fuelBreakdown = Object.entries(fuelCounts).map(([fuelType, count]) => ({
      fuelType,
      count,
    }));

    return {
      metrics: {
        total,
        available,
        rented,
        maintenance,
        archived,
        expiredDocuments: expiredDocsCount,
        expiringSoonDocuments: expiringDocsCount,
        maintenanceDue: Math.max(scheduledMaintenanceCount, maintenanceDueMileageCount),
      },
      categoryBreakdown,
      brandBreakdown,
      fuelBreakdown,
      recentActivity: recentAuditLogs,
    };
  }

  /**
   * Retrieves single vehicle details by ID with all related operational sub-records
   */
  static async getById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        category: true,
        branch: true,
        photos: {
          orderBy: { order: 'asc' },
        },
        documents: {
          orderBy: { expiresAt: 'asc' },
        },
        maintenanceRecords: {
          orderBy: { scheduledDate: 'desc' },
        },
        damageReports: {
          orderBy: { reportedDate: 'desc' },
        },
        odometerLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
        locationLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        pricingTiers: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        bookings: {
          take: 10,
          orderBy: { pickupDateTime: 'desc' },
          include: {
            customer: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        },
        inspections: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { findings: true },
        },
      },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    return vehicle;
  }

  /**
   * Creates a new vehicle in the fleet with strict 4-6 photos validation
   */
  static async createVehicle(input: CreateVehicleInput, adminUserId?: string) {
    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber: input.registrationNumber },
    });

    if (existing) {
      throw AppError.conflict(
        `A vehicle with registration number ${input.registrationNumber} already exists in fleet`
      );
    }

    if (input.vin) {
      const existingVin = await prisma.vehicle.findUnique({
        where: { vin: input.vin },
      });
      if (existingVin) {
        throw AppError.conflict(`A vehicle with VIN ${input.vin} already exists in fleet`);
      }
    }

    // Process and validate 4-6 vehicle photos
    const processedPhotos = await VehicleImageService.validateAndProcessPhotos(input.photos);
    const primaryPhoto = processedPhotos.find((p) => p.isPrimary) || processedPhotos[0];

    const featuresJson = Array.isArray(input.features)
      ? JSON.stringify(input.features)
      : typeof input.features === 'string'
      ? input.features
      : null;

    const vehicle = await prisma.vehicle.create({
      data: {
        brand: input.brand,
        model: input.model,
        year: input.year,
        trim: input.trim || null,
        vehicleCode: input.vehicleCode || `FLT-${Math.floor(1000 + Math.random() * 9000)}`,
        ownershipType: input.ownershipType || 'OWNED',
        acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
        acquisitionCost: input.acquisitionCost || null,
        isListed: input.isListed ?? true,
        isBookable: input.isBookable ?? true,
        registrationNumber: input.registrationNumber,
        vin: input.vin || null,
        categoryId: input.categoryId,
        branchId: input.branchId || null,
        transmission: input.transmission,
        fuelType: input.fuelType,
        engineSize: input.engineSize || null,
        horsePower: input.horsePower || null,
        drivetrain: input.drivetrain || null,
        fuelTankCapacity: input.fuelTankCapacity || null,
        fuelLevelPercent: input.fuelLevelPercent ?? 100,
        seats: input.seats,
        doors: input.doors,
        color: input.color || null,
        colorHex: input.colorHex || null,
        mileage: input.mileage,
        pricingMethod: input.pricingMethod || 'daily',
        currency: input.currency || 'PKR',
        dailyRate: input.dailyRate,
        weeklyRate: input.weeklyRate || null,
        monthlyRate: input.monthlyRate || null,
        perKmRate: input.perKmRate || null,
        hourlyRate: input.hourlyRate || null,
        minimumTripCharge: input.minimumTripCharge || null,
        minimumBillableHours: input.minimumBillableHours ?? 1,
        billingIncrementMinutes: input.billingIncrementMinutes ?? 60,
        gracePeriodMinutes: input.gracePeriodMinutes ?? 0,
        partialMonthPolicy: input.partialMonthPolicy || 'prorated_daily',
        securityDeposit: input.securityDeposit || null,
        excessMileageFee: input.excessMileageFee || null,
        mileageLimitPerDay: input.mileageLimitPerDay ?? 250,
        status: input.status,
        isPublicCatalog: input.isPublicCatalog,
        features: featuresJson,
        notes: input.notes || null,
        parkingSpot: input.parkingSpot || null,
        telematicsDeviceId: input.telematicsDeviceId || null,
        insurancePolicyNumber: input.insurancePolicyNumber || null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : null,
        lastServiceDate: input.lastServiceDate ? new Date(input.lastServiceDate) : null,
        lastServiceMileage: input.lastServiceMileage || null,
        nextServiceMileage: input.nextServiceMileage || null,
        primaryImageUrl: primaryPhoto.url,
        photos: {
          create: processedPhotos.map((p) => ({
            url: p.url,
            caption: p.caption,
            isPrimary: p.isPrimary,
            order: p.order,
          })),
        },
      },
      include: {
        category: true,
        branch: true,
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Record initial odometer log
    if (vehicle.mileage > 0) {
      await prisma.vehicleOdometerLog.create({
        data: {
          vehicleId: vehicle.id,
          odometerReading: vehicle.mileage,
          source: 'INITIAL_REGISTRATION',
          recordedBy: adminUserId || 'System',
          notes: 'Initial odometer reading on vehicle acquisition',
        },
      });
    }

    // Record initial location if branch exists
    if (vehicle.branchId) {
      await prisma.vehicleLocationLog.create({
        data: {
          vehicleId: vehicle.id,
          branchId: vehicle.branchId,
          parkingBay: vehicle.parkingSpot,
          locationSource: 'INITIAL_ASSIGNMENT',
          notes: `Assigned to branch on fleet registration`,
        },
      });
    }

    // Create initial baseline pricing tier for audit and historical continuity
    const activeBaseRate =
      input.pricingMethod === 'per_km'
        ? input.perKmRate || 0
        : input.pricingMethod === 'hourly'
        ? input.hourlyRate || 0
        : input.pricingMethod === 'monthly'
        ? input.monthlyRate || 0
        : input.dailyRate;

    await prisma.vehiclePricingTier.create({
      data: {
        vehicleId: vehicle.id,
        rateName: 'Baseline Active Rate',
        billingUnit:
          input.pricingMethod === 'hourly'
            ? 'HOUR'
            : input.pricingMethod === 'monthly'
            ? 'MONTH'
            : 'DAY',
        pricingMethod: input.pricingMethod || 'daily',
        baseRate: activeBaseRate,
        currency: input.currency || 'PKR',
        hourlyRate: input.hourlyRate || null,
        perKmRate: input.perKmRate || null,
        monthlyRate: input.monthlyRate || null,
        minimumTripCharge: input.minimumTripCharge || null,
        minimumBillableHours: input.minimumBillableHours ?? 1,
        billingIncrementMinutes: input.billingIncrementMinutes ?? 60,
        gracePeriodMinutes: input.gracePeriodMinutes ?? 0,
        partialMonthPolicy: input.partialMonthPolicy || 'prorated_daily',
        securityDeposit: input.securityDeposit || null,
        includedKmPerDay: input.mileageLimitPerDay ?? 250,
        extraKmRate: input.excessMileageFee || null,
        isActive: true,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: vehicle.id,
        userId: adminUserId,
        action: 'CREATED',
        details: `Vehicle ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNumber}) added to fleet with ${input.pricingMethod || 'daily'} pricing`,
      },
    });

    await AuditService.log({
      userId: adminUserId,
      event: 'FLEET_VEHICLE_CREATED',
      metadata: {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        model: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
        photosUploaded: processedPhotos.length,
      },
    });

    return vehicle;
  }

  /**
   * Updates an existing vehicle
   */
  static async updateVehicle(id: string, input: UpdateVehicleInput, adminUserId?: string) {
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!existing) {
      throw AppError.notFound('Vehicle not found');
    }

    if (input.registrationNumber && input.registrationNumber !== existing.registrationNumber) {
      const duplicate = await prisma.vehicle.findUnique({
        where: { registrationNumber: input.registrationNumber },
      });
      if (duplicate) {
        throw AppError.conflict(
          `Vehicle registration number ${input.registrationNumber} is already in use`
        );
      }
    }

    if (input.vin && input.vin !== existing.vin) {
      const duplicateVin = await prisma.vehicle.findUnique({
        where: { vin: input.vin },
      });
      if (duplicateVin) {
        throw AppError.conflict(`Vehicle VIN ${input.vin} is already in use`);
      }
    }

    let primaryImageUrl = input.primaryImageUrl !== undefined ? input.primaryImageUrl : existing.primaryImageUrl;

    // Handle photo replacement if photos array is provided
    if (input.photos && input.photos.length > 0) {
      const processedPhotos = await VehicleImageService.validateAndProcessPhotos(input.photos);
      const primaryPhoto = processedPhotos.find((p) => p.isPrimary) || processedPhotos[0];
      primaryImageUrl = primaryPhoto.url;

      await prisma.$transaction([
        prisma.vehiclePhoto.deleteMany({ where: { vehicleId: id } }),
        prisma.vehiclePhoto.createMany({
          data: processedPhotos.map((p) => ({
            vehicleId: id,
            url: p.url,
            caption: p.caption,
            isPrimary: p.isPrimary,
            order: p.order,
          })),
        }),
      ]);
    }

    const featuresJson =
      input.features !== undefined
        ? Array.isArray(input.features)
          ? JSON.stringify(input.features)
          : typeof input.features === 'string'
          ? input.features
          : null
        : undefined;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        brand: input.brand,
        model: input.model,
        year: input.year,
        trim: input.trim,
        vehicleCode: input.vehicleCode,
        ownershipType: input.ownershipType,
        acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : undefined,
        acquisitionCost: input.acquisitionCost,
        isListed: input.isListed,
        isBookable: input.isBookable,
        registrationNumber: input.registrationNumber,
        vin: input.vin,
        categoryId: input.categoryId,
        branchId: input.branchId,
        transmission: input.transmission,
        fuelType: input.fuelType,
        engineSize: input.engineSize,
        horsePower: input.horsePower,
        drivetrain: input.drivetrain,
        fuelTankCapacity: input.fuelTankCapacity,
        fuelLevelPercent: input.fuelLevelPercent,
        seats: input.seats,
        doors: input.doors,
        color: input.color,
        colorHex: input.colorHex,
        mileage: input.mileage,
        pricingMethod: input.pricingMethod,
        currency: input.currency,
        dailyRate: input.dailyRate,
        weeklyRate: input.weeklyRate,
        monthlyRate: input.monthlyRate,
        perKmRate: input.perKmRate,
        hourlyRate: input.hourlyRate,
        minimumTripCharge: input.minimumTripCharge,
        minimumBillableHours: input.minimumBillableHours,
        billingIncrementMinutes: input.billingIncrementMinutes,
        gracePeriodMinutes: input.gracePeriodMinutes,
        partialMonthPolicy: input.partialMonthPolicy,
        securityDeposit: input.securityDeposit,
        excessMileageFee: input.excessMileageFee,
        mileageLimitPerDay: input.mileageLimitPerDay,
        status: input.status,
        isPublicCatalog: input.isPublicCatalog,
        features: featuresJson,
        notes: input.notes,
        parkingSpot: input.parkingSpot,
        telematicsDeviceId: input.telematicsDeviceId,
        insurancePolicyNumber: input.insurancePolicyNumber,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : undefined,
        registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : undefined,
        lastServiceDate: input.lastServiceDate ? new Date(input.lastServiceDate) : undefined,
        lastServiceMileage: input.lastServiceMileage,
        nextServiceMileage: input.nextServiceMileage,
        primaryImageUrl,
      },
      include: {
        category: true,
        branch: true,
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Check if branch changed and log location
    if (input.branchId && input.branchId !== existing.branchId) {
      await prisma.vehicleLocationLog.create({
        data: {
          vehicleId: id,
          branchId: input.branchId,
          parkingBay: input.parkingSpot || updated.parkingSpot,
          locationSource: 'BRANCH_REASSIGNMENT',
          notes: 'Vehicle branch reassigned during update',
        },
      });
    }

    // Check if mileage changed and log odometer
    if (input.mileage !== undefined && input.mileage !== existing.mileage) {
      await prisma.vehicleOdometerLog.create({
        data: {
          vehicleId: id,
          odometerReading: input.mileage,
          source: 'MANUAL_UPDATE',
          recordedBy: adminUserId || 'System',
          notes: `Mileage updated from ${existing.mileage} to ${input.mileage} km`,
        },
      });
    }

    // Check if any pricing parameters changed
    const pricingChanged =
      (input.pricingMethod && input.pricingMethod !== existing.pricingMethod) ||
      (input.dailyRate !== undefined && Number(input.dailyRate) !== Number(existing.dailyRate)) ||
      (input.perKmRate !== undefined && Number(input.perKmRate) !== Number(existing.perKmRate)) ||
      (input.hourlyRate !== undefined && Number(input.hourlyRate) !== Number(existing.hourlyRate)) ||
      (input.monthlyRate !== undefined && Number(input.monthlyRate) !== Number(existing.monthlyRate)) ||
      (input.minimumTripCharge !== undefined && Number(input.minimumTripCharge) !== Number(existing.minimumTripCharge)) ||
      (input.securityDeposit !== undefined && Number(input.securityDeposit) !== Number(existing.securityDeposit)) ||
      (input.excessMileageFee !== undefined && Number(input.excessMileageFee) !== Number(existing.excessMileageFee));

    if (pricingChanged) {
      // Deactivate previous active tiers to preserve historical integrity
      await prisma.vehiclePricingTier.updateMany({
        where: { vehicleId: id, isActive: true },
        data: { isActive: false, validUntil: new Date() },
      });

      const effectiveMethod = updated.pricingMethod || 'daily';
      const effectiveBaseRate =
        effectiveMethod === 'per_km'
          ? Number(updated.perKmRate || 0)
          : effectiveMethod === 'hourly'
          ? Number(updated.hourlyRate || 0)
          : effectiveMethod === 'monthly'
          ? Number(updated.monthlyRate || 0)
          : Number(updated.dailyRate || 0);

      // Create new active versioned pricing tier
      await prisma.vehiclePricingTier.create({
        data: {
          vehicleId: id,
          rateName: `Rate Updated (${new Date().toISOString().slice(0, 10)})`,
          billingUnit:
            effectiveMethod === 'hourly'
              ? 'HOUR'
              : effectiveMethod === 'monthly'
              ? 'MONTH'
              : 'DAY',
          pricingMethod: effectiveMethod,
          baseRate: effectiveBaseRate,
          currency: updated.currency || 'PKR',
          hourlyRate: updated.hourlyRate,
          perKmRate: updated.perKmRate,
          monthlyRate: updated.monthlyRate,
          minimumTripCharge: updated.minimumTripCharge,
          minimumBillableHours: updated.minimumBillableHours,
          billingIncrementMinutes: updated.billingIncrementMinutes,
          gracePeriodMinutes: updated.gracePeriodMinutes,
          partialMonthPolicy: updated.partialMonthPolicy,
          securityDeposit: updated.securityDeposit,
          includedKmPerDay: updated.mileageLimitPerDay,
          extraKmRate: updated.excessMileageFee,
          validFrom: new Date(),
          isActive: true,
        },
      });

      await prisma.vehicleAuditLog.create({
        data: {
          vehicleId: updated.id,
          userId: adminUserId,
          action: 'PRICING_UPDATED',
          details: `Pricing configuration updated to ${effectiveMethod}. Rate: ${updated.currency || 'PKR'} ${effectiveBaseRate}`,
          changes: JSON.stringify({
            oldMethod: existing.pricingMethod,
            newMethod: effectiveMethod,
            oldDailyRate: existing.dailyRate,
            newDailyRate: updated.dailyRate,
            oldPerKmRate: existing.perKmRate,
            newPerKmRate: updated.perKmRate,
            oldHourlyRate: existing.hourlyRate,
            newHourlyRate: updated.hourlyRate,
          }),
        },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: updated.id,
        userId: adminUserId,
        action: 'UPDATED',
        details: `Vehicle specifications and settings updated`,
        changes: JSON.stringify({
          updatedFields: Object.keys(input),
        }),
      },
    });

    await AuditService.log({
      userId: adminUserId,
      event: 'FLEET_VEHICLE_UPDATED',
      metadata: {
        vehicleId: updated.id,
        model: `${updated.brand} ${updated.model}`,
      },
    });

    return updated;
  }

  /**
   * Safely archives a vehicle, verifying no active bookings or ongoing rentals exist
   */
  static async archiveVehicle(id: string, reason?: string, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'ACTIVE'] } },
        },
        rentals: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    if (vehicle.bookings.length > 0) {
      throw AppError.badRequest(
        `Cannot archive vehicle: It has ${vehicle.bookings.length} active or confirmed booking(s). Reassign or resolve them first.`
      );
    }

    if (vehicle.rentals.length > 0) {
      throw AppError.badRequest(
        'Cannot archive vehicle: It is currently out on an active rental.'
      );
    }

    const archived = await prisma.vehicle.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublicCatalog: false,
        isBookable: false,
        isListed: false,
        deletedAt: new Date(),
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: id,
        userId: adminUserId,
        action: 'ARCHIVED',
        details: reason ? `Archived: ${reason}` : 'Vehicle archived from active fleet',
      },
    });

    await AuditService.log({
      userId: adminUserId,
      event: 'FLEET_VEHICLE_ARCHIVED',
      metadata: { vehicleId: id, reason },
    });

    return { message: 'Vehicle archived safely', vehicle: archived };
  }

  /**
   * Restores an archived vehicle to active fleet
   */
  static async restoreVehicle(id: string, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    const restored = await prisma.vehicle.update({
      where: { id },
      data: {
        status: 'AVAILABLE',
        isPublicCatalog: true,
        isBookable: true,
        isListed: true,
        deletedAt: null,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: id,
        userId: adminUserId,
        action: 'RESTORED',
        details: 'Vehicle restored to active fleet inventory',
      },
    });

    return { message: 'Vehicle restored successfully', vehicle: restored };
  }

  /**
   * Deletes a vehicle or archives it if historical records exist
   */
  static async deleteVehicle(id: string, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: { take: 1 },
        rentals: { take: 1 },
        maintenanceRecords: { take: 1 },
        damageReports: { take: 1 },
      },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    const hasHistory =
      vehicle.bookings.length > 0 ||
      vehicle.rentals.length > 0 ||
      vehicle.maintenanceRecords.length > 0 ||
      vehicle.damageReports.length > 0;

    if (hasHistory) {
      // Soft-archive to protect historical audit trail
      await prisma.vehicle.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          isPublicCatalog: false,
          isBookable: false,
          isListed: false,
          deletedAt: new Date(),
        },
      });

      await prisma.vehicleAuditLog.create({
        data: {
          vehicleId: id,
          userId: adminUserId,
          action: 'ARCHIVED',
          details: 'Vehicle archived rather than hard deleted due to existing history',
        },
      });

      return {
        message: 'Vehicle archived to protect historical operational records',
        archived: true,
      };
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    await AuditService.log({
      userId: adminUserId,
      event: 'FLEET_VEHICLE_DELETED',
      metadata: { vehicleId: id, registrationNumber: vehicle.registrationNumber },
    });

    return { message: 'Vehicle deleted permanently', archived: false };
  }

  // ==========================================
  // DOCUMENT MANAGEMENT
  // ==========================================

  static async listDocuments(vehicleId: string) {
    return prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { expiresAt: 'asc' },
    });
  }

  static async createDocument(vehicleId: string, input: CreateDocumentInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId,
        documentType: input.documentType as DocumentType,
        title: input.title,
        documentNumber: input.documentNumber || null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        fileUrl: input.fileUrl,
        fileName: input.fileName || null,
        fileSize: input.fileSize || null,
        notes: input.notes || null,
        verifiedBy: adminUserId || 'Staff',
        verifiedAt: new Date(),
      },
    });

    // Sync vehicle expiry fields
    if (input.documentType === 'INSURANCE' && input.expiresAt) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          insuranceExpiry: new Date(input.expiresAt),
          insurancePolicyNumber: input.documentNumber || undefined,
        },
      });
    } else if (input.documentType === 'REGISTRATION' && input.expiresAt) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { registrationExpiry: new Date(input.expiresAt) },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'DOCUMENT_ADDED',
        details: `Document added: ${doc.title} (${doc.documentType})`,
      },
    });

    return doc;
  }

  static async deleteDocument(docId: string, adminUserId?: string) {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: docId } });
    if (!doc) throw AppError.notFound('Document not found');

    await prisma.vehicleDocument.delete({ where: { id: docId } });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: doc.vehicleId,
        userId: adminUserId,
        action: 'DOCUMENT_REMOVED',
        details: `Document removed: ${doc.title}`,
      },
    });

    return { message: 'Document removed successfully' };
  }

  // ==========================================
  // MAINTENANCE & REPAIRS MANAGEMENT
  // ==========================================

  static async listMaintenance(vehicleId: string) {
    return prisma.vehicleMaintenance.findMany({
      where: { vehicleId },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  static async createMaintenance(vehicleId: string, input: CreateMaintenanceInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const record = await prisma.vehicleMaintenance.create({
      data: {
        vehicleId,
        maintenanceType: input.maintenanceType as MaintenanceType,
        status: input.status as MaintenanceStatus,
        title: input.title || input.description || 'Scheduled Maintenance',
        description: input.description || null,
        serviceProvider: input.serviceProvider || null,
        scheduledDate: new Date(input.scheduledDate || input.scheduledAt || new Date()),
        startDate: input.startDate ? new Date(input.startDate) : null,
        completedDate: (input.completedDate || input.completedAt) ? new Date((input.completedDate || input.completedAt)!) : null,
        odometerReading: input.odometerReading || input.odometerValue || null,
        cost: input.cost ?? input.costAmount ?? null,
        currency: input.currency || 'USD',
        invoiceNumber: input.invoiceNumber || null,
        nextServiceDueMileage: input.nextServiceDueMileage || input.nextServiceMileage || null,
        nextServiceDueDate: input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : null,
        notes: input.notes || null,
        createdBy: adminUserId || 'Staff',
      },
    });

    // Update vehicle status & service history
    if (record.status === 'IN_PROGRESS' || record.status === 'SCHEDULED') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'MAINTENANCE' },
      });
    } else if (record.status === 'COMPLETED') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: 'AVAILABLE',
          lastServiceDate: record.completedDate || new Date(),
          lastServiceMileage: record.odometerReading || vehicle.mileage,
          nextServiceMileage: record.nextServiceDueMileage || undefined,
        },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'MAINTENANCE_LOGGED',
        details: `Maintenance record added: ${record.title} (${record.status})`,
      },
    });

    return record;
  }

  static async updateMaintenance(maintenanceId: string, input: UpdateMaintenanceInput, adminUserId?: string) {
    const existing = await prisma.vehicleMaintenance.findUnique({ where: { id: maintenanceId } });
    if (!existing) throw AppError.notFound('Maintenance record not found');

    const updated = await prisma.vehicleMaintenance.update({
      where: { id: maintenanceId },
      data: {
        maintenanceType: input.maintenanceType as MaintenanceType,
        status: input.status as MaintenanceStatus,
        title: input.title,
        description: input.description,
        serviceProvider: input.serviceProvider,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        completedDate: input.completedDate ? new Date(input.completedDate) : undefined,
        odometerReading: input.odometerReading,
        cost: input.cost,
        currency: input.currency,
        invoiceNumber: input.invoiceNumber,
        nextServiceDueMileage: input.nextServiceDueMileage,
        nextServiceDueDate: input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : undefined,
        notes: input.notes,
      },
    });

    // Status sync with vehicle
    if (updated.status === 'COMPLETED') {
      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: {
          status: 'AVAILABLE',
          lastServiceDate: updated.completedDate || new Date(),
          lastServiceMileage: updated.odometerReading || undefined,
          nextServiceMileage: updated.nextServiceDueMileage || undefined,
        },
      });
    } else if (updated.status === 'IN_PROGRESS') {
      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: { status: 'MAINTENANCE' },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'MAINTENANCE_UPDATED',
        details: `Maintenance record updated: ${updated.title} -> ${updated.status}`,
      },
    });

    return updated;
  }

  static async deleteMaintenance(maintenanceId: string, adminUserId?: string) {
    const existing = await prisma.vehicleMaintenance.findUnique({ where: { id: maintenanceId } });
    if (!existing) throw AppError.notFound('Maintenance record not found');

    await prisma.vehicleMaintenance.delete({ where: { id: maintenanceId } });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'MAINTENANCE_DELETED',
        details: `Maintenance record deleted: ${existing.title}`,
      },
    });

    return { message: 'Maintenance record removed successfully' };
  }

  // ==========================================
  // DAMAGE REPORTS
  // ==========================================

  static async listDamageReports(vehicleId: string) {
    return prisma.vehicleDamageReport.findMany({
      where: { vehicleId },
      orderBy: { reportedDate: 'desc' },
    });
  }

  static async createDamageReport(vehicleId: string, input: CreateDamageReportInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const photosJson = Array.isArray(input.photoUrls)
      ? JSON.stringify(input.photoUrls)
      : typeof input.photoUrls === 'string'
      ? input.photoUrls
      : null;

    const report = await prisma.vehicleDamageReport.create({
      data: {
        vehicleId,
        bookingId: input.bookingId || null,
        reportedBy: adminUserId || 'Staff Inspector',
        damageType: input.damageType,
        severity: input.severity as DamageSeverity,
        status: input.status as DamageStatus,
        locationOnVehicle: input.locationOnVehicle || null,
        description: input.description,
        estimatedRepairCost: input.estimatedRepairCost || null,
        actualRepairCost: input.actualRepairCost || null,
        currency: input.currency || 'USD',
        photoUrls: photosJson,
        resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
        notes: input.notes || null,
      },
    });

    // If critical damage, set vehicle to MAINTENANCE
    if (input.severity === 'CRITICAL' && report.status !== 'RESOLVED') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'MAINTENANCE' },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'DAMAGE_REPORTED',
        details: `Damage reported: ${report.damageType} (${report.severity}) on ${report.locationOnVehicle || 'vehicle'}`,
      },
    });

    return report;
  }

  static async updateDamageReport(reportId: string, input: UpdateDamageReportInput, adminUserId?: string) {
    const existing = await prisma.vehicleDamageReport.findUnique({ where: { id: reportId } });
    if (!existing) throw AppError.notFound('Damage report not found');

    const photosJson =
      input.photoUrls !== undefined
        ? Array.isArray(input.photoUrls)
          ? JSON.stringify(input.photoUrls)
          : typeof input.photoUrls === 'string'
          ? input.photoUrls
          : null
        : undefined;

    const updated = await prisma.vehicleDamageReport.update({
      where: { id: reportId },
      data: {
        damageType: input.damageType,
        severity: input.severity as DamageSeverity,
        status: input.status as DamageStatus,
        locationOnVehicle: input.locationOnVehicle,
        description: input.description,
        estimatedRepairCost: input.estimatedRepairCost,
        actualRepairCost: input.actualRepairCost,
        currency: input.currency,
        photoUrls: photosJson,
        resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : undefined,
        notes: input.notes,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'DAMAGE_UPDATED',
        details: `Damage report updated to status ${updated.status}`,
      },
    });

    return updated;
  }

  static async deleteDamageReport(reportId: string, adminUserId?: string) {
    const existing = await prisma.vehicleDamageReport.findUnique({ where: { id: reportId } });
    if (!existing) throw AppError.notFound('Damage report not found');

    await prisma.vehicleDamageReport.delete({ where: { id: reportId } });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'DAMAGE_DELETED',
        details: `Damage report deleted: ${existing.damageType}`,
      },
    });

    return { message: 'Damage report removed' };
  }

  // ==========================================
  // ODOMETER HISTORY
  // ==========================================

  static async listOdometerLogs(vehicleId: string) {
    return prisma.vehicleOdometerLog.findMany({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  static async createOdometerLog(vehicleId: string, input: CreateOdometerLogInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const log = await prisma.vehicleOdometerLog.create({
      data: {
        vehicleId,
        odometerReading: input.odometerReading,
        source: input.source,
        bookingId: input.bookingId || null,
        recordedBy: adminUserId || 'Staff',
        notes: input.notes || null,
      },
    });

    // Update vehicle's current mileage if new reading is greater
    if (input.odometerReading > vehicle.mileage) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { mileage: input.odometerReading },
      });
    }

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'ODOMETER_LOGGED',
        details: `Odometer reading logged: ${input.odometerReading.toLocaleString()} km (source: ${input.source})`,
      },
    });

    return log;
  }

  // ==========================================
  // LOCATION & BRANCH TRACKING
  // ==========================================

  static async listLocationLogs(vehicleId: string) {
    return prisma.vehicleLocationLog.findMany({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  static async createLocationLog(vehicleId: string, input: CreateLocationLogInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const log = await prisma.vehicleLocationLog.create({
      data: {
        vehicleId,
        branchId: input.branchId || vehicle.branchId,
        parkingBay: input.parkingBay || vehicle.parkingSpot,
        latitude: input.latitude ? new Prisma.Decimal(input.latitude) : null,
        longitude: input.longitude ? new Prisma.Decimal(input.longitude) : null,
        locationSource: input.locationSource || 'MANUAL_CHECKIN',
        notes: input.notes || null,
      },
    });

    // Sync vehicle parking spot or branch
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        branchId: input.branchId || undefined,
        parkingSpot: input.parkingBay || undefined,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'LOCATION_LOGGED',
        details: `Location updated: parking bay ${input.parkingBay || 'N/A'}`,
      },
    });

    return log;
  }

  // ==========================================
  // PRICING TIERS & POLICIES
  // ==========================================

  static async listPricingTiers(vehicleId: string) {
    return prisma.vehiclePricingTier.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createPricingTier(vehicleId: string, input: CreatePricingTierInput, adminUserId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw AppError.notFound('Vehicle not found');

    const tier = await prisma.vehiclePricingTier.create({
      data: {
        vehicleId,
        rateName: input.rateName,
        billingUnit: input.billingUnit,
        baseRate: input.baseRate,
        currency: input.currency || 'USD',
        securityDeposit: input.securityDeposit || null,
        includedKmPerDay: input.includedKmPerDay ?? 250,
        extraKmRate: input.extraKmRate || null,
        minimumDurationDays: input.minimumDurationDays ?? 1,
        maximumDurationDays: input.maximumDurationDays || null,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        isActive: input.isActive ?? true,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId,
        userId: adminUserId,
        action: 'PRICING_TIER_CREATED',
        details: `Pricing tier created: ${tier.rateName} ($${tier.baseRate}/${tier.billingUnit})`,
      },
    });

    return tier;
  }

  static async updatePricingTier(tierId: string, input: UpdatePricingTierInput, adminUserId?: string) {
    const existing = await prisma.vehiclePricingTier.findUnique({ where: { id: tierId } });
    if (!existing) throw AppError.notFound('Pricing tier not found');

    const updated = await prisma.vehiclePricingTier.update({
      where: { id: tierId },
      data: {
        rateName: input.rateName,
        billingUnit: input.billingUnit,
        baseRate: input.baseRate,
        currency: input.currency,
        securityDeposit: input.securityDeposit,
        includedKmPerDay: input.includedKmPerDay,
        extraKmRate: input.extraKmRate,
        minimumDurationDays: input.minimumDurationDays,
        maximumDurationDays: input.maximumDurationDays,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        isActive: input.isActive,
      },
    });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'PRICING_TIER_UPDATED',
        details: `Pricing tier updated: ${updated.rateName}`,
      },
    });

    return updated;
  }

  static async deletePricingTier(tierId: string, adminUserId?: string) {
    const existing = await prisma.vehiclePricingTier.findUnique({ where: { id: tierId } });
    if (!existing) throw AppError.notFound('Pricing tier not found');

    await prisma.vehiclePricingTier.delete({ where: { id: tierId } });

    await prisma.vehicleAuditLog.create({
      data: {
        vehicleId: existing.vehicleId,
        userId: adminUserId,
        action: 'PRICING_TIER_DELETED',
        details: `Pricing tier deleted: ${existing.rateName}`,
      },
    });

    return { message: 'Pricing tier removed' };
  }

  // ==========================================
  // AUDIT LOG HISTORY
  // ==========================================

  static async listAuditLogs(vehicleId: string) {
    return prisma.vehicleAuditLog.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // AVAILABILITY & BOOKING INTEGRATION CHECK
  // ==========================================

  static async listBookings(vehicleId: string) {
    return prisma.booking.findMany({
      where: { vehicleId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        pickupBranch: { select: { id: true, name: true } },
        returnBranch: { select: { id: true, name: true } },
      },
      orderBy: { pickupDateTime: 'desc' },
      take: 50,
    });
  }

  static async checkAvailability(vehicleId: string, pickupDateTime: string, returnDateTime: string) {
    const pickup = new Date(pickupDateTime);
    const returnDate = new Date(returnDateTime);

    if (isNaN(pickup.getTime()) || isNaN(returnDate.getTime())) {
      throw AppError.badRequest('Invalid pickup or return date format');
    }

    if (pickup >= returnDate) {
      throw AppError.badRequest('Pickup date/time must be before return date/time');
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        status: true,
        isBookable: true,
        isPublicCatalog: true,
      },
    });

    if (!vehicle) {
      throw AppError.notFound('Vehicle not found');
    }

    if (vehicle.status === 'ARCHIVED' || !vehicle.isBookable) {
      return {
        isAvailable: false,
        reason: 'Vehicle is currently archived or marked unbookable in fleet operations.',
      };
    }

    if (vehicle.status === 'MAINTENANCE') {
      return {
        isAvailable: false,
        reason: 'Vehicle is currently offline for scheduled maintenance or repairs.',
      };
    }

    // Check for conflicting confirmed/active bookings within time window
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId,
        status: { in: ['CONFIRMED', 'ACTIVE', 'PENDING'] },
        AND: [
          { pickupDateTime: { lt: returnDate } },
          { returnDateTime: { gt: pickup } },
        ],
      },
      select: {
        id: true,
        bookingNumber: true,
        pickupDateTime: true,
        returnDateTime: true,
        status: true,
      },
    });

    if (conflictingBooking) {
      return {
        isAvailable: false,
        reason: `Vehicle has a conflicting booking (${conflictingBooking.bookingNumber}) scheduled from ${new Date(
          conflictingBooking.pickupDateTime
        ).toLocaleDateString()} to ${new Date(conflictingBooking.returnDateTime).toLocaleDateString()}.`,
        conflictingBooking,
      };
    }

    return {
      isAvailable: true,
      reason: 'Vehicle is eligible and available for reservation during the requested period.',
    };
  }

  /**
   * Lists all available vehicle categories with vehicle count
   */
  static async listCategories() {
    return prisma.vehicleCategory.findMany({
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new vehicle category
   */
  static async createCategory(data: { name: string; slug?: string; description?: string; baseRate?: number | string }) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new AppError('Category name is required.', 400);
    }

    const slug = (data.slug?.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    // Check duplicate
    const existing = await prisma.vehicleCategory.findFirst({
      where: {
        OR: [{ name: trimmedName }, { slug }],
      },
    });

    if (existing) {
      throw new AppError(`A category with name "${trimmedName}" or slug "${slug}" already exists.`, 409);
    }

    const baseRate = data.baseRate ? Number(data.baseRate) : 0;

    return prisma.vehicleCategory.create({
      data: {
        name: trimmedName,
        slug,
        description: data.description?.trim() || null,
        baseRate,
      },
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
    });
  }

  /**
   * Updates an existing vehicle category
   */
  static async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; baseRate?: number | string }) {
    const existing = await prisma.vehicleCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Category not found.', 404);
    }

    const updatePayload: Prisma.VehicleCategoryUpdateInput = {};

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) throw new AppError('Category name cannot be empty.', 400);

      const conflict = await prisma.vehicleCategory.findFirst({
        where: { name: trimmed, id: { not: id } },
      });
      if (conflict) {
        throw new AppError(`A category with name "${trimmed}" already exists.`, 409);
      }
      updatePayload.name = trimmed;
    }

    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug) {
        const conflict = await prisma.vehicleCategory.findFirst({
          where: { slug, id: { not: id } },
        });
        if (conflict) {
          throw new AppError(`A category with slug "${slug}" already exists.`, 409);
        }
        updatePayload.slug = slug;
      }
    }

    if (data.description !== undefined) {
      updatePayload.description = data.description?.trim() || null;
    }

    if (data.baseRate !== undefined) {
      updatePayload.baseRate = Number(data.baseRate) || 0;
    }

    return prisma.vehicleCategory.update({
      where: { id },
      data: updatePayload,
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
    });
  }

  /**
   * Deletes a vehicle category safely (preventing deletion if vehicles are attached)
   */
  static async deleteCategory(id: string) {
    const category = await prisma.vehicleCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { vehicles: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found.', 404);
    }

    if (category._count.vehicles > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because ${category._count.vehicles} vehicle(s) are currently assigned to it. Please reassign the vehicles before deleting.`,
        400
      );
    }

    await prisma.vehicleCategory.delete({ where: { id } });
    return { success: true, message: `Category "${category.name}" deleted successfully.` };
  }
}


