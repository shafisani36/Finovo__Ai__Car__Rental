import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.config';

interface OutgoingEmail {
  to: string;
  subject: string;
  /** Plain-text version (always sent, used by clients without HTML). */
  text: string;
  /** Main body paragraphs for the HTML version. */
  paragraphs: string[];
  /** Optional highlighted block (a code) and a button link. */
  highlight?: string;
  action?: { label: string; url: string };
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
  const action = email.action
    ? `<p style="margin:22px 0"><a href="${escapeHtml(email.action.url)}" style="display:inline-block;padding:12px 22px;background:#1E0426;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(email.action.label)}</a></p>`
    : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f4f7;font-family:Arial,Helvetica,sans-serif;color:#1E0426">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 20px;font-size:18px;font-weight:700">Finovo Car Rental</p>
${paragraphs}${highlight}${action}
<p style="margin:24px 0 0;font-size:12px;color:#6b6475">If you did not request this, you can ignore this email.</p>
</td></tr></table></body></html>`;
}

/**
 * Sends transactional email over SMTP (EMAIL_PROVIDER=smtp), e.g. Gmail with an app password,
 * Microsoft 365, Zoho, Brevo or Amazon SES SMTP. In development (EMAIL_PROVIDER=mock) the email
 * is printed to the console instead.
 */
async function deliver(email: OutgoingEmail): Promise<void> {
  if (env.EMAIL.PROVIDER === 'smtp') {
    await getTransporter().sendMail({
      from: env.EMAIL.FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: renderHtml(email),
    });
    return;
  }

  if (env.IS_PRODUCTION) {
    // Never print codes or links to production logs
    console.warn(`[email] NOT SENT (EMAIL_PROVIDER=${env.EMAIL.PROVIDER}): "${email.subject}" to ${email.to}`);
    return;
  }

  console.log(`\n=================== [EMAIL (dev mock)] ${email.subject} ===================`);
  console.log(`To: ${email.to}`);
  console.log(email.text);
  console.log('===========================================================================\n');
}

export class EmailService {
  /** Sends an account verification email. */
  static async sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
    const url = `${env.CORS.ORIGIN}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await deliver({
      to: email,
      subject: 'Verify your Finovo account',
      text: `Hi ${fullName},\n\nPlease verify your email address by opening this link:\n${url}\n\nThank you for joining Finovo.`,
      paragraphs: [`Hi ${fullName},`, 'Please confirm your email address to activate your Finovo account.'],
      action: { label: 'Verify email', url },
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
