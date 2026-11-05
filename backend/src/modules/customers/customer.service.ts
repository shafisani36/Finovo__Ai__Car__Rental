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

  static async createCustomer(data: {
    fullName: string;
    email: string;
    phone?: string;
    driverLicenseNumber?: string;
    licenseExpiryDate?: string | Date;
    isLicenseVerified?: boolean;
  }) {
    if (!data.fullName || !data.email) {
      throw AppError.badRequest('Full name and email are required');
    }

    const existing = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw AppError.conflict('A customer with this email already exists');
    }

    const expiryDate = data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : null;

    return prisma.customer.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || null,
        driverLicenseNumber: data.driverLicenseNumber?.trim() || null,
        licenseExpiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : null,
        isLicenseVerified: Boolean(data.isLicenseVerified),
      },
    });
  }

  static async updateCustomer(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      driverLicenseNumber?: string;
      licenseExpiryDate?: string | Date;
      isLicenseVerified?: boolean;
    }
  ) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Customer not found');
    }

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const emailConflict = await prisma.customer.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (emailConflict && emailConflict.id !== id) {
        throw AppError.conflict('A customer with this email already exists');
      }
    }

    const expiryDate = data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : undefined;

    return prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName.trim() : undefined,
        email: data.email !== undefined ? data.email.toLowerCase().trim() : undefined,
        phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
        driverLicenseNumber:
          data.driverLicenseNumber !== undefined
            ? data.driverLicenseNumber
              ? data.driverLicenseNumber.trim()
              : null
            : undefined,
        licenseExpiryDate:
          data.licenseExpiryDate !== undefined
            ? expiryDate && !isNaN(expiryDate.getTime())
              ? expiryDate
              : null
            : undefined,
        isLicenseVerified:
          data.isLicenseVerified !== undefined ? Boolean(data.isLicenseVerified) : undefined,
      },
    });
  }

  static async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ['ACTIVE', 'CONFIRMED', 'PENDING'] } },
        },
      },
    });

    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    if (customer.bookings.length > 0) {
      throw AppError.badRequest('Cannot delete customer with active or upcoming reservations');
    }

    await prisma.customer.delete({ where: { id } });
    return { success: true, message: 'Customer deleted successfully' };
  }
}
