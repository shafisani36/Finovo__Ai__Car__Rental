import { env } from '../../config/env.config';

export class EmailService {
  /**
   * Sends an account verification email
   */
  static async sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
    const verificationUrl = `${env.CORS.ORIGIN}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    
    console.log('\n=================== [EMAIL SERVICE: EMAIL VERIFICATION] ===================');
    console.log(`To: ${fullName} <${email}>`);
    console.log(`Subject: Verify your Finovo AI Car Rental Account`);
    console.log(`Verification Token: ${token}`);
    console.log(`Verification Link: ${verificationUrl}`);
    console.log('===========================================================================\n');
  }

  /**
   * Sends a 6-digit password reset OTP email
   */
  static async sendPasswordResetOtp(email: string, otpCode: string, fullName: string): Promise<void> {
    const resetUrl = `${env.CORS.ORIGIN}/verify-code?email=${encodeURIComponent(email)}`;

    console.log('\n=================== [EMAIL SERVICE: PASSWORD RESET OTP] ===================');
    console.log(`To: ${fullName} <${email}>`);
    console.log(`Subject: Finovo Password Reset Code`);
    console.log(`Your 6-Digit Reset Code: [ ${otpCode} ]`);
    console.log(`Expires in: 15 minutes`);
    console.log(`Reset Page: ${resetUrl}`);
    console.log('===========================================================================\n');
  }

  /**
   * Sends a security alert for suspicious or new device login
   */
  static async sendSecurityAlert(email: string, ipAddress: string, userAgent: string): Promise<void> {
    console.log('\n=================== [EMAIL SERVICE: SECURITY ALERT] ===================');
    console.log(`To: <${email}>`);
    console.log(`Subject: New Sign-in Detected on Finovo Account`);
    console.log(`IP Address: ${ipAddress}`);
    console.log(`Device: ${userAgent}`);
    console.log('=======================================================================\n');
  }
}
