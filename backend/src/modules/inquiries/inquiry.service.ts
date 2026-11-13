import { prisma } from '../../infrastructure/prisma/prisma.client';
import { EmailService } from '../../infrastructure/email/email.service';
import { AppError } from '../../shared/errors/app-error';

export interface CreateInquiryDto {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export class InquiryService {
  /**
   * Submit new customer inquiry
   */
  static async createInquiry(dto: CreateInquiryDto) {
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const name = text(dto.name);
    const email = text(dto.email).toLowerCase();
    const subject = text(dto.subject);
    const message = text(dto.message);
    const phone = text(dto.phone);
    if (!name || !email || !subject || !message) {
      throw AppError.badRequest('Name, email, subject, and message are required.');
    }
    if (name.length > 120 || subject.length > 200 || message.length > 5000 || phone.length > 32 || email.length > 254) {
      throw AppError.badRequest('One of the fields is too long.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw AppError.badRequest('Please enter a valid email address.');
    }
    if (phone && !/^[+\d][\d\s()-]{5,30}$/.test(phone)) {
      throw AppError.badRequest('Please enter a valid phone number.');
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        status: 'NEW',
      },
    });

    return inquiry;
  }

  /**
   * List inquiries with search, status filtering, and pagination
   */
  static async listInquiries(query?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s } },
        { email: { contains: s } },
        { subject: { contains: s } },
        { message: { contains: s } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return {
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single inquiry by ID
   */
  static async getInquiryById(id: string) {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw AppError.notFound(`Inquiry with ID ${id} not found.`);
    }

    return inquiry;
  }

  /**
   * Update inquiry status
   */
  static async updateInquiryStatus(id: string, status: 'NEW' | 'IN_PROGRESS' | 'REPLIED' | 'CLOSED') {
    const validStatuses = ['NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw AppError.badRequest(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    await this.getInquiryById(id);

    return await prisma.inquiry.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Send reply to customer and record it in database
   */
  static async replyToInquiry(id: string, replyMessage: string, adminEmail: string) {
    if (!replyMessage || !replyMessage.trim()) {
      throw AppError.badRequest('Reply message is required and cannot be empty.');
    }

    const inquiry = await this.getInquiryById(id);

    // Send email using backend EmailService
    await EmailService.sendInquiryReply(
      inquiry.email,
      inquiry.name,
      inquiry.subject,
      replyMessage.trim()
    );

    // Update inquiry record
    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        replyMessage: replyMessage.trim(),
        repliedAt: new Date(),
        repliedBy: adminEmail,
        status: 'REPLIED',
      },
    });

    return updated;
  }

  /**
   * Delete inquiry
   */
  static async deleteInquiry(id: string) {
    await this.getInquiryById(id);
    await prisma.inquiry.delete({ where: { id } });
    return { success: true };
  }
}
