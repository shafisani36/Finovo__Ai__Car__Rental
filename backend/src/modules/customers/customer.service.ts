import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';

export class CustomerService {
  static async listCustomers(search?: string) {
    const where: Record<string, unknown> = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { driverLicenseNumber: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            pickupDateTime: true,
            returnDateTime: true,
            vehicle: { select: { brand: true, model: true } },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      driverLicenseNumber: c.driverLicenseNumber,
      isLicenseVerified: c.isLicenseVerified,
      licenseExpiryDate: c.licenseExpiryDate,
      totalBookings: c._count.bookings,
      recentBookings: c.bookings,
      createdAt: c.createdAt,
    }));
  }

  static async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            vehicle: true,
            pickupBranch: true,
            returnBranch: true,
            rental: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    return customer;
  }

  static async updateVerification(id: string, isLicenseVerified: boolean) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    return prisma.customer.update({
      where: { id },
      data: { isLicenseVerified },
    });
  }
}
