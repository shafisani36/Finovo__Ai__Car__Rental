import fs from 'fs/promises';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { prisma } from '../../infrastructure/prisma/prisma.client';
import { AppError } from '../../shared/errors/app-error';
import { EmailService } from '../../infrastructure/email/email.service';
import { FREE_CANCELLATION_HOURS } from '../bookings/cancellation-policy';

/** Bump when the agreement wording changes; stored with every signed agreement. */
export const AGREEMENT_TERMS_VERSION = 'v1';

/** Signed agreements hold signatures and personal data, so they live outside the public uploads folder. */
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'agreements');

const TIME_ZONE = 'Asia/Riyadh';
const MAX_SIGNATURE_BYTES = 400 * 1024;

export const AGREEMENT_TERMS: string[] = [
  'The renter must hold a valid driving licence for the whole rental and must be the only driver unless an additional driver was booked.',
  'At pickup the car is photographed from every side and an AI inspection records its condition. That report is the starting condition of this agreement.',
  'At return the car is photographed again and compared with the pickup report. The renter pays only for new damage that is not in the pickup report, using the Finovo repair cost table. Existing damage is never charged.',
  'The car must be returned with the same fuel level as at pickup. Missing fuel is charged at the refuelling price.',
  'The car must be returned at the agreed date and time. A late return is charged per hour after a 30-minute grace period.',
  'Distance above the included kilometres is charged at the per-kilometre rate shown in the booking.',
  'Traffic fines, tolls and parking charges during the rental are the responsibility of the renter.',
  'The security deposit is refunded after the return, minus any new damage, fuel, late return or other charges under this agreement.',
  `Bookings cancelled at least ${FREE_CANCELLATION_HOURS} hours before pickup are refunded in full; later cancellations keep one day of the rental as a fee.`,
  'Smoking, pets without a carrier, off-road driving, racing and sub-letting the car are not allowed.',
  'In case of an accident or breakdown the renter must inform Finovo straight away and, where required, the police.',
];

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(value);
}

function money(amount: unknown, currency: string): string {
  return `${currency} ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Accepts only a PNG data URL of a drawn signature and returns its bytes. */
function parseSignature(dataUrl: unknown): Buffer {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw AppError.badRequest('Please draw the signature before saving');
  const bytes = Buffer.from(match[1], 'base64');
  const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isPng) throw AppError.badRequest('The signature image is not valid');
  if (bytes.length > MAX_SIGNATURE_BYTES) throw AppError.badRequest('The signature image is too large');
  if (bytes.length < 600) throw AppError.badRequest('The signature is empty. Please sign in the box.');
  return bytes;
}

function renderPdf(input: {
  agreementNumber: string;
  signedAt: Date;
  signerName: string;
  signedIp: string | null;
  witnessName: string | null;
  signature: Buffer;
  booking: NonNullable<Awaited<ReturnType<typeof loadBooking>>>;
  pickupInspection: { overallScore: number | null; findings: number } | null;
}): Promise<Buffer> {
  const { booking } = input;
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Rental agreement ${input.agreementNumber}`, Author: 'Finovo Car Rental' } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const heading = (text: string) => {
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor('#1E0426').text(text);
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#222222');
  };
  const row = (label: string, value: string) => {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value || '-');
  };

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#1E0426').text('Finovo Car Rental');
  doc.font('Helvetica').fontSize(13).text('Vehicle Rental Agreement');
  doc.moveDown(0.4).fontSize(9).fillColor('#555555')
    .text(`Agreement no. ${input.agreementNumber}   •   Booking #${booking.bookingNumber}   •   Terms ${AGREEMENT_TERMS_VERSION}`);

  heading('Renter');
  row('Name', booking.customer.fullName);
  row('Email', booking.customer.email);
  row('Phone', booking.customer.phone || '-');
  row('Driving licence', booking.customer.driverLicenseNumber || '-');
  if (booking.customer.licenseExpiryDate) row('Licence expiry', formatDateTime(booking.customer.licenseExpiryDate).split(',')[0]);

  heading('Vehicle');
  row('Car', `${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.year})`);
  row('Registration', booking.vehicle.registrationNumber);
  if (booking.vehicle.color) row('Colour', booking.vehicle.color);
  if (input.pickupInspection) {
    const score = input.pickupInspection.overallScore;
    row(
      'Condition at pickup (AI inspection)',
      `${score !== null ? `${Math.round(score)}%, ` : ''}${input.pickupInspection.findings} recorded item(s)`
    );
  }

  heading('Rental period');
  row('Pickup', `${formatDateTime(booking.pickupDateTime)} at ${booking.pickupBranch.name}`);
  row('Return', `${formatDateTime(booking.returnDateTime)} at ${booking.returnBranch.name}`);
  if (booking.deliveryAddress) row('Delivery address', booking.deliveryAddress);
  if (booking.collectionAddress) row('Collection address', booking.collectionAddress);

  heading('Charges');
  // Two fixed columns so every amount lines up on the right
  const amountLine = (label: string, amount: unknown, bold = false) => {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, 50, y, { width: 340 });
    const afterLabel = doc.y;
    doc.text(money(amount, booking.currency), 395, y, { width: 150, align: 'right' });
    doc.x = 50;
    doc.y = Math.max(afterLabel, doc.y);
  };
  for (const item of booking.breakdownItems.filter((i) => i.lineType !== 'deposit')) {
    amountLine(item.description, item.amount);
  }
  doc.moveDown(0.3);
  amountLine('Rental total', booking.totalAmount, true);
  amountLine('Refundable security deposit', booking.depositAmount);

  heading('Terms and conditions');
  doc.fontSize(9);
  AGREEMENT_TERMS.forEach((term, i) => doc.text(`${i + 1}. ${term}`, { paragraphGap: 3 }));

  // Keep the whole signature block on one page
  if (doc.y > doc.page.height - 260) doc.addPage();
  heading('Signature');
  doc.fontSize(9).text('By signing, the renter confirms they have read and accept this agreement and the condition of the vehicle at pickup.');
  const top = doc.y + 8;
  doc.image(input.signature, 50, top, { fit: [220, 80] });
  doc.moveTo(50, top + 86).lineTo(290, top + 86).strokeColor('#999999').stroke();
  doc.x = 50;
  doc.y = top + 92;
  doc.fontSize(9).fillColor('#222222');
  row('Signed by', input.signerName);
  row('Signed on', `${formatDateTime(input.signedAt)} (${TIME_ZONE})`);
  if (input.signedIp) row('IP address', input.signedIp);
  if (input.witnessName) row('Handover by', input.witnessName);

  doc.end();
  return done;
}

function loadBooking(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      vehicle: true,
      pickupBranch: true,
      returnBranch: true,
      breakdownItems: { orderBy: { createdAt: 'asc' } },
      agreement: true,
    },
  });
}

export class RentalAgreementService {
  /**
   * Saves the customer's signature, builds the signed agreement PDF and emails it.
   * A booking has one agreement; signing again is refused once it exists.
   */
  static async sign(input: {
    bookingId: string;
    signerName: unknown;
    signatureDataUrl: unknown;
    accepted: unknown;
    pickupInspectionId?: unknown;
    staffUserId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    if (input.accepted !== true) throw AppError.badRequest('The customer must accept the terms of the agreement');
    const signerName = String(input.signerName ?? '').replace(/\s+/g, ' ').trim();
    if (signerName.length < 3 || signerName.length > 128) throw AppError.badRequest('Enter the full name of the person signing');
    const signature = parseSignature(input.signatureDataUrl);

    const booking = await loadBooking(String(input.bookingId || ''));
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.agreement) throw AppError.conflict('The rental agreement for this booking is already signed');
    if (!['CONFIRMED', 'READY_FOR_PICKUP'].includes(booking.status)) {
      throw AppError.badRequest('The agreement can only be signed for a confirmed booking at handover');
    }

    let pickupInspection: { overallScore: number | null; findings: number } | null = null;
    if (input.pickupInspectionId) {
      const inspection = await prisma.inspection.findUnique({
        where: { id: String(input.pickupInspectionId) },
        include: { _count: { select: { findings: true } } },
      });
      if (inspection && inspection.vehicleId === booking.vehicleId && inspection.type === 'PICKUP') {
        pickupInspection = { overallScore: inspection.overallScore, findings: inspection._count.findings };
      }
    }

    const witness = input.staffUserId
      ? await prisma.user.findUnique({ where: { id: input.staffUserId }, select: { fullName: true } })
      : null;
    const signedAt = new Date();
    const agreementNumber = `AGR-${booking.bookingNumber.replace(/^FIN-/, '')}`;
    const pdf = await renderPdf({
      agreementNumber,
      signedAt,
      signerName,
      signedIp: input.ipAddress || null,
      witnessName: witness?.fullName || null,
      signature,
      booking,
      pickupInspection,
    });

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const fileBase = `${booking.id}-${randomBytes(6).toString('hex')}`;
    const signaturePath = path.join(STORAGE_DIR, `${fileBase}-signature.png`);
    const pdfPath = path.join(STORAGE_DIR, `${fileBase}.pdf`);
    await fs.writeFile(signaturePath, signature);
    await fs.writeFile(pdfPath, pdf);

    let agreement;
    try {
      agreement = await prisma.rentalAgreement.create({
        data: {
          bookingId: booking.id,
          agreementNumber,
          signerName,
          signaturePath: path.relative(process.cwd(), signaturePath),
          pdfPath: path.relative(process.cwd(), pdfPath),
          sha256Hash: createHash('sha256').update(pdf).digest('hex'),
          termsVersion: AGREEMENT_TERMS_VERSION,
          signedAt,
          signedIp: input.ipAddress?.slice(0, 64) || null,
          signedUserAgent: input.userAgent?.slice(0, 255) || null,
          witnessedById: input.staffUserId || null,
        },
      });
    } catch (err) {
      // Someone signed at the same moment: keep their agreement, remove these files
      await fs.rm(signaturePath, { force: true });
      await fs.rm(pdfPath, { force: true });
      if ((err as { code?: string }).code === 'P2002') throw AppError.conflict('The rental agreement for this booking is already signed');
      throw err;
    }

    await prisma.securityAuditLog.create({
      data: {
        userId: input.staffUserId || null,
        event: 'RENTAL_AGREEMENT_SIGNED',
        metadata: JSON.stringify({ bookingNumber: booking.bookingNumber, agreementNumber, signerName, termsVersion: AGREEMENT_TERMS_VERSION }),
      },
    });

    try {
      await EmailService.sendRentalAgreement(booking.customer.email, booking.customer.fullName, booking.bookingNumber, pdf, `${agreementNumber}.pdf`);
      await prisma.rentalAgreement.update({ where: { id: agreement.id }, data: { emailedAt: new Date() } });
    } catch (err) {
      console.error('[agreement] email failed:', err instanceof Error ? err.message : err);
    }

    return this.summary(agreement);
  }

  static summary(agreement: { agreementNumber: string; signerName: string; signedAt: Date; termsVersion: string; emailedAt: Date | null }) {
    return {
      agreementNumber: agreement.agreementNumber,
      signerName: agreement.signerName,
      signedAt: agreement.signedAt,
      termsVersion: agreement.termsVersion,
      emailedAt: agreement.emailedAt,
    };
  }

  static async getForBooking(bookingId: string) {
    const agreement = await prisma.rentalAgreement.findUnique({ where: { bookingId } });
    return agreement ? this.summary(agreement) : null;
  }

  /** Reads the stored PDF; the caller has already checked the user may see this booking. */
  static async readPdf(bookingId: string): Promise<{ filename: string; content: Buffer }> {
    const agreement = await prisma.rentalAgreement.findUnique({ where: { bookingId } });
    if (!agreement) throw AppError.notFound('No signed agreement for this booking yet');
    const absolute = path.resolve(process.cwd(), agreement.pdfPath);
    if (!absolute.startsWith(STORAGE_DIR + path.sep)) throw AppError.notFound('Agreement file not found');
    const content = await fs.readFile(absolute).catch(() => {
      throw AppError.notFound('Agreement file not found');
    });
    return { filename: `${agreement.agreementNumber}.pdf`, content };
  }

  static terms() {
    return { version: AGREEMENT_TERMS_VERSION, terms: AGREEMENT_TERMS };
  }
}
