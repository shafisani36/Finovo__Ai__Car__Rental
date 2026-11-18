import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.config';

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  /** Plain-text version for clients without HTML; built from the paragraphs and details when left out. */
  text?: string;
  /** Main body paragraphs for the HTML version. */
  paragraphs: string[];
  /** Label / value rows shown as a table (booking details, receipt lines); bold rows are totals. */
  details?: { label: string; value: string; bold?: boolean }[];
  /** Optional highlighted block (a code) and a button link. */
  highlight?: string;
  action?: { label: string; url: string };
  /** Small print at the bottom; defaults to the notice for emails the reader asked for. */
  footer?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL.SMTP_HOST,
      port: env.EMAIL.SMTP_PORT,
      secure: env.EMAIL.SMTP_SECURE, // true for port 465, false for 587 (STARTTLS)
      auth: { user: env.EMAIL.SMTP_USER, pass: env.EMAIL.SMTP_PASS },
      pool: true,
      maxConnections: 3,
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function renderHtml(email: OutgoingEmail): string {
  const paragraphs = email.paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p)}</p>`).join('');
  const highlight = email.highlight
    ? `<p style="margin:18px 0;font-size:28px;font-weight:700;letter-spacing:6px;text-align:center">${escapeHtml(email.highlight)}</p>`
    : '';
  const details = email.details?.length
    ? `<table role="presentation" width="100%" style="margin:6px 0 18px;border-collapse:collapse;font-size:14px">${email.details
        .map(
          (d) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #ece9f0;color:#6b6475${d.bold ? ';font-weight:700;color:#1E0426' : ''}">${escapeHtml(d.label)}</td><td style="padding:8px 0;border-bottom:1px solid #ece9f0;text-align:right${d.bold ? ';font-weight:700' : ''}">${escapeHtml(d.value)}</td></tr>`
        )
        .join('')}</table>`
    : '';
  const action = email.action
    ? `<p style="margin:22px 0"><a href="${escapeHtml(email.action.url)}" style="display:inline-block;padding:12px 22px;background:#1E0426;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(email.action.label)}</a></p>`
    : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f4f7;font-family:Arial,Helvetica,sans-serif;color:#1E0426">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 20px;font-size:18px;font-weight:700">Finovo Car Rental</p>
${paragraphs}${details}${highlight}${action}
<p style="margin:24px 0 0;font-size:12px;color:#6b6475">${escapeHtml(email.footer || 'If you did not request this, you can ignore this email.')}</p>
</td></tr></table></body></html>`;
}

/**
 * Sends transactional email over SMTP (EMAIL_PROVIDER=smtp), e.g. Gmail with an app password,
 * Microsoft 365, Zoho, Brevo or Amazon SES SMTP. In development (EMAIL_PROVIDER=mock) the email
 * is printed to the console instead.
 */
function renderText(email: OutgoingEmail): string {
  if (email.text) return email.text;
  const details = (email.details || []).map((d) => `${d.label}: ${d.value}`);
  const action = email.action ? [`${email.action.label}: ${email.action.url}`] : [];
  return [...email.paragraphs, ...(details.length ? ['', ...details] : []), ...(action.length ? ['', ...action] : []), '', 'Finovo Car Rental'].join('\n');
}

async function deliver(email: OutgoingEmail): Promise<void> {
  const to = Array.isArray(email.to) ? email.to.join(', ') : email.to;
  if (env.EMAIL.PROVIDER === 'smtp') {
    await getTransporter().sendMail({
      from: env.EMAIL.FROM,
      to,
      subject: email.subject,
      text: renderText(email),
      html: renderHtml(email),
      attachments: email.attachments,
    });
    return;
  }

  if (env.IS_PRODUCTION) {
    // Never print codes or links to production logs
    console.warn(`[email] NOT SENT (EMAIL_PROVIDER=${env.EMAIL.PROVIDER}): "${email.subject}" to ${to}`);
    return;
  }

  console.log(`\n=================== [EMAIL (dev mock)] ${email.subject} ===================`);
  console.log(`To: ${to}`);
  console.log(renderText(email));
  for (const a of email.attachments || []) console.log(`Attachment: ${a.filename} (${a.content.length} bytes)`);
  console.log('===========================================================================\n');
}

export class EmailService {
  /** Sends any transactional email (booking, payment and staff alerts are built in the notifications module). */
  static async send(email: OutgoingEmail): Promise<void> {
    await deliver(email);
  }

  /** Sends an account verification email. */
  static async sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
    const url = `${env.CORS.ORIGIN}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await deliver({
      to: email,
      subject: 'Verify your Finovo account',
      text: `Hi ${fullName},\n\nPlease verify your email address by opening this link (valid for 24 hours):\n${url}\n\nThank you for joining Finovo.`,
      paragraphs: [`Hi ${fullName},`, 'Please confirm your email address to activate your Finovo account.'],
      action: { label: 'Verify email', url },
    });
  }

  /** Tells the owner of an email address that someone tried to sign up with it again. */
  static async sendAccountExistsNotice(email: string, fullName: string): Promise<void> {
    const loginUrl = `${env.CORS.ORIGIN}/login`;
    const resetUrl = `${env.CORS.ORIGIN}/forgot-password`;
    await deliver({
      to: email,
      subject: 'You already have a Finovo account',
      text: `Hi ${fullName},\n\nSomeone (hopefully you) tried to create a new Finovo account with this email address, but you already have one.\n\nSign in: ${loginUrl}\nForgot your password? ${resetUrl}\n\nIf this was not you, you can ignore this email. Your account has not been changed.`,
      paragraphs: [
        `Hi ${fullName},`,
        'Someone (hopefully you) tried to create a new Finovo account with this email address, but you already have one.',
        'If this was not you, you can ignore this email. Your account has not been changed.',
      ],
      action: { label: 'Sign in', url: loginUrl },
    });
  }

  /** Sends a 6-digit password reset code. */
  static async sendPasswordResetOtp(email: string, otpCode: string, fullName: string): Promise<void> {
    const url = `${env.CORS.ORIGIN}/verify-code?email=${encodeURIComponent(email)}`;
    await deliver({
      to: email,
      subject: 'Your Finovo password reset code',
      text: `Hi ${fullName},\n\nYour password reset code is: ${otpCode}\nIt expires in 15 minutes.\n\nEnter it here: ${url}`,
      paragraphs: [`Hi ${fullName},`, 'Use this code to reset your password. It expires in 15 minutes.'],
      highlight: otpCode,
      action: { label: 'Enter the code', url },
    });
  }

  /** Sends a security alert for a sign-in from a new device. */
  static async sendSecurityAlert(email: string, ipAddress: string, userAgent: string): Promise<void> {
    await deliver({
      to: email,
      subject: 'New sign-in to your Finovo account',
      text: `A new sign-in to your Finovo account was detected.\nIP address: ${ipAddress}\nDevice: ${userAgent}\n\nIf this was not you, reset your password now.`,
      paragraphs: [
        'A new sign-in to your Finovo account was detected.',
        `IP address: ${ipAddress}`,
        `Device: ${userAgent}`,
        'If this was not you, reset your password now.',
      ],
      action: { label: 'Reset password', url: `${env.CORS.ORIGIN}/forgot-password` },
    });
  }

  /** Sends the signed rental agreement as a PDF attachment. */
  static async sendRentalAgreement(email: string, fullName: string, bookingNumber: string, pdf: Buffer, filename: string): Promise<void> {
    await deliver({
      to: email,
      subject: `Your rental agreement for booking #${bookingNumber}`,
      text: `Hi ${fullName},\n\nThank you for renting with Finovo. Your signed rental agreement for booking #${bookingNumber} is attached.\n\nFinovo Car Rental`,
      paragraphs: [
        `Hi ${fullName},`,
        `Thank you for renting with Finovo. Your signed rental agreement for booking #${bookingNumber} is attached. You can also download it any time from your account.`,
        'Drive safe!',
      ],
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });
  }

  /** Sends a staff reply to a customer inquiry. */
  static async sendInquiryReply(email: string, fullName: string, subject: string, replyMessage: string): Promise<void> {
    await deliver({
      to: email,
      subject: `Re: ${subject}`,
      text: `Hi ${fullName},\n\n${replyMessage}\n\nFinovo Support`,
      paragraphs: [`Hi ${fullName},`, ...replyMessage.split(/\n{2,}/), 'Finovo Support'],
    });
  }
}
