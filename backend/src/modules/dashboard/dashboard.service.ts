import { prisma } from '../../infrastructure/prisma/prisma.client';

export class DashboardService {
  /**
   * Aggregates live database metrics for the Executive & Operational Admin Dashboard
   */
  static async getExecutiveOverview() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalVehicles,
      availableVehicles,
      rentedVehicles,
      maintenanceVehicles,
      reservedVehicles,
      activeRentals,
      todaysPickups,
      todaysReturns,
      upcomingBookingsCount,
      allCompletedBookings,
      monthBookings,
      inspectionsCount,
      damagedInspectionsCount,
      pendingDamageFindings,
      recentBookings,
      categories,
      branches,
      recentLogs,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { status: 'RENTED' } }),
      prisma.vehicle.count({ where: { status: 'MAINTENANCE' } }),
      prisma.vehicle.count({ where: { status: 'RESERVED' } }),
      prisma.rental.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({
        where: {
          pickupDateTime: { gte: startOfToday, lte: endOfToday },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      prisma.booking.count({
        where: {
          returnDateTime: { gte: startOfToday, lte: endOfToday },
          status: 'ACTIVE',
        },
      }),
      prisma.booking.count({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      prisma.booking.findMany({
        where: { status: { in: ['COMPLETED', 'ACTIVE', 'CONFIRMED'] } },
        select: { totalAmount: true, dailyRate: true },
      }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ['COMPLETED', 'ACTIVE', 'CONFIRMED'] },
        },
        select: { totalAmount: true },
      }),
      prisma.inspection.count(),
      prisma.inspection.count({ where: { hasDamageDetected: true } }),
      prisma.damageFinding.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          inspection: {
            include: {
              vehicle: {
                select: { id: true, brand: true, model: true, registrationNumber: true, primaryImageUrl: true },
              },
            },
          },
        },
      }),
      prisma.booking.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, email: true } },
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              registrationNumber: true,
              primaryImageUrl: true,
              category: { select: { name: true } },
            },
          },
          pickupBranch: { select: { name: true, code: true } },
          returnBranch: { select: { name: true, code: true } },
        },
      }),
      prisma.vehicleCategory.findMany({
        include: {
          _count: { select: { vehicles: true } },
          vehicles: { select: { status: true } },
        },
      }),
      prisma.branch.findMany({
        include: {
          _count: { select: { vehicles: true } },
          vehicles: { select: { status: true } },
        },
      }),
      prisma.securityAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    // Financial sums
    const totalRevenue = allCompletedBookings.reduce((acc, b) => acc + Number(b.totalAmount), 0);
    const monthlyRevenue = monthBookings.reduce((acc, b) => acc + Number(b.totalAmount), 0);
    const avgDailyRate =
      allCompletedBookings.length > 0
        ? Math.round(
            allCompletedBookings.reduce((acc, b) => acc + Number(b.dailyRate), 0) /
              allCompletedBookings.length
          )
        : 55;

    // Utilization rate
    const utilizationRate =
      totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;

    // Categories breakdown
    const categoryStats = categories.map((cat) => {
      const available = cat.vehicles.filter((v) => v.status === 'AVAILABLE').length;
      const rented = cat.vehicles.filter((v) => v.status === 'RENTED').length;
      const maintenance = cat.vehicles.filter((v) => v.status === 'MAINTENANCE').length;
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        baseRate: Number(cat.baseRate),
        totalVehicles: cat._count.vehicles,
        available,
        rented,
        maintenance,
      };
    });

    // Branches breakdown
    const branchStats = branches.map((b) => {
      const activeRented = b.vehicles.filter((v) => v.status === 'RENTED').length;
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        city: b.city,
        totalVehicles: b._count.vehicles,
        activeRented,
      };
    });

    return {
      timestamp: now.toISOString(),
      fleet: {
        total: totalVehicles,
        available: availableVehicles,
        rented: rentedVehicles,
        maintenance: maintenanceVehicles,
        reserved: reservedVehicles,
        utilizationRate,
      },
      operations: {
        todaysPickups,
        todaysReturns,
        upcomingBookings: upcomingBookingsCount,
        activeRentals,
        overdueRentals: 0,
      },
      financials: {
        totalRevenue,
        monthlyRevenue,
        averageDailyRate: avgDailyRate,
        currency: 'USD',
      },
      inspections: {
        total: inspectionsCount,
        damaged: damagedInspectionsCount,
        pendingReviewFindings: pendingDamageFindings.map((f) => ({
          id: f.id,
          damageType: f.damageType,
          severity: f.severity,
          location: f.location,
          confidence: Math.round(f.confidence * 100),
          isHumanVerified: f.isHumanVerified,
          humanDecision: f.humanDecision,
          createdAt: f.createdAt,
          vehicle: {
            id: f.inspection.vehicle.id,
            name: `${f.inspection.vehicle.brand} ${f.inspection.vehicle.model}`,
            registration: f.inspection.vehicle.registrationNumber,
            image: f.inspection.vehicle.primaryImageUrl,
          },
        })),
      },
      categories: categoryStats,
      branches: branchStats,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer.fullName,
        customerEmail: b.customer.email,
        vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
        vehicleCategory: b.vehicle.category.name,
        vehicleImage: b.vehicle.primaryImageUrl,
        pickupDateTime: b.pickupDateTime,
        returnDateTime: b.returnDateTime,
        pickupBranch: b.pickupBranch.name,
        status: b.status,
        totalAmount: Number(b.totalAmount),
        dailyRate: Number(b.dailyRate),
        currency: b.currency,
      })),
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        event: log.event,
        user: log.user?.fullName || 'System Automated Workflow',
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        timestamp: log.createdAt,
      })),
    };
  }
}
