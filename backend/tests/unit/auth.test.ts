import { PasswordService } from '../../src/security/password/password.service';
import { TokenHashService } from '../../src/security/tokens/token-hash.service';
import { JwtService } from '../../src/security/tokens/jwt.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { SessionService } from '../../src/modules/sessions/session.service';
import { prisma } from '../../src/infrastructure/prisma/prisma.client';

async function runTests() {
  console.log('\n======================================================');
  console.log('   RUNNING FINOVO ENTERPRISE AUTHENTICATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(` [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err);
      failed++;
    }
  }

  // 1. Password Hashing Test
  await test('Argon2id produces secure hash and verifies candidate password', async () => {
    const raw = 'SecureSecretPass123!';
    const hash = await PasswordService.hashPassword(raw);
    if (!hash.startsWith('$argon2id$')) throw new Error('Hash is not Argon2id');
    const valid = await PasswordService.verifyPassword(raw, hash);
    if (!valid) throw new Error('Valid password failed verification');
    const invalid = await PasswordService.verifyPassword('WrongPass123!', hash);
    if (invalid) throw new Error('Invalid password was accepted');
  });

  // 2. Token Cryptography Test
  await test('Token generator and SHA-256 constant-time hash work accurately', async () => {
    const token = TokenHashService.generateRandomToken(32);
    const hash1 = TokenHashService.hashToken(token);
    const hash2 = TokenHashService.hashToken(token);
    if (hash1 !== hash2) throw new Error('Token hash mismatch');
    const match = TokenHashService.timingSafeEqual(hash1, hash2);
    if (!match) throw new Error('Timing safe equal failed');
    const otp = TokenHashService.generateNumericOtp(6);
    if (!/^\d{6}$/.test(otp)) throw new Error('OTP is not 6 numeric digits: ' + otp);
  });

  // 3. JWT Signing & Verification Test
  await test('JWT access token issues and decodes valid payload', async () => {
    const payload = {
      sub: 'usr_test_123',
      email: 'test@finovo.com',
      fullName: 'Test User',
      roles: ['CUSTOMER'],
      permissions: ['bookings:create'],
      sessionId: 'sess_123',
    };
    const token = JwtService.signAccessToken(payload);
    const decoded = JwtService.verifyAccessToken(token);
    if (decoded.sub !== payload.sub || decoded.email !== payload.email) {
      throw new Error('JWT payload mismatch');
    }
  });

  // 4. Registration Flow Test
  const testEmail = `rental.tester.${Date.now()}@finovo.test`;
  await test('AuthService.register creates user with least-privilege role in MySQL', async () => {
    const res = await AuthService.register({
      fullName: 'Rental Tester',
      email: testEmail,
      password: 'SecurePassword123!',
    });
    if (!res.user.id || res.user.email !== testEmail) {
      throw new Error('User creation failed');
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { userRoles: { include: { role: true } } },
    });
    if (!dbUser) throw new Error('User not found in MySQL');
    const hasCustomerRole = dbUser.userRoles.some((r) => r.role.name === 'CUSTOMER');
    if (!hasCustomerRole) throw new Error('Default CUSTOMER role was not assigned');
  });

  // 5. Login & Session Issuance Test
  let sessionTokenHolder = '';
  let refreshTokenHolder = '';
  await test('AuthService.login validates credentials and creates MySQL session', async () => {
    const loginRes = await AuthService.login({
      email: testEmail,
      password: 'SecurePassword123!',
      rememberMe: false,
    });

    if (!loginRes.accessToken || !loginRes.rawSessionToken || !loginRes.rawRefreshToken) {
      throw new Error('Missing token in login response');
    }

    sessionTokenHolder = loginRes.rawSessionToken;
    refreshTokenHolder = loginRes.rawRefreshToken;

    const activeSession = await SessionService.findActiveSession(sessionTokenHolder);
    if (!activeSession || activeSession.user.email !== testEmail) {
      throw new Error('Active session not found in MySQL');
    }
  });

  // 6. Refresh Token Rotation Test
  await test('AuthService.refresh rotates refresh token and preserves security', async () => {
    const refreshRes = await AuthService.refresh(sessionTokenHolder, refreshTokenHolder);
    if (!refreshRes.accessToken || !refreshRes.rawRefreshToken) {
      throw new Error('Token refresh failed');
    }
    // Update holder with new rotated token
    refreshTokenHolder = refreshRes.rawRefreshToken;
  });

  // 7. Password Reset Request & Verification Test
  await test('Password reset flow: OTP creation, verification, and password update', async () => {
    await AuthService.requestPasswordReset({ email: testEmail });

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!user) throw new Error('User not found');

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!resetToken) throw new Error('Reset token was not generated');

    // Test password update with valid code
    // Let's create an OTP code known to test
    const testOtp = '654321';
    const testOtpHash = TokenHashService.hashToken(testOtp);
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { codeHash: testOtpHash },
    });

    // Verify OTP
    const verifyRes = await AuthService.verifyResetCode({
      email: testEmail,
      code: testOtp,
    });
    if (!verifyRes.valid) throw new Error('OTP verification returned invalid');

    // Reset password
    const resetRes = await AuthService.resetPassword({
      email: testEmail,
      code: testOtp,
      newPassword: 'BrandNewPassword2026!',
    });
    if (!resetRes.message) throw new Error('Password reset failed');

    // Verify login with new password succeeds
    const newLogin = await AuthService.login({
      email: testEmail,
      password: 'BrandNewPassword2026!',
    });
    if (!newLogin.accessToken) throw new Error('Login with new password failed');
  });

  // 8. Logout and Session Revocation Test
  await test('AuthService.logout revokes session in MySQL', async () => {
    await AuthService.logout(sessionTokenHolder);
    const session = await SessionService.findActiveSession(sessionTokenHolder);
    if (session !== null) throw new Error('Session was not revoked in MySQL');
  });

  // Clean up test user
  await prisma.user.deleteMany({ where: { email: testEmail } });

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
