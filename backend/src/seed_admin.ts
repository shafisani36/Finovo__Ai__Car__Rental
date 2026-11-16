import { prisma } from './infrastructure/prisma/prisma.client';
import { PasswordService } from './security/password/password.service';

async function seedAdmin() {
  console.log('Seeding administrative roles and default admin user...');

  // 1. Ensure Roles exist
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Complete system access & root privileges', isSystem: true },
    { name: 'ADMIN', description: 'Fleet manager and administrative operator', isSystem: true },
    { name: 'CUSTOMER', description: 'Standard verified rental customer', isSystem: true },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });

  // 2. Ensure the first admin user exists.
  // Production takes the email and password from ADMIN_EMAIL / ADMIN_PASSWORD; the public demo
  // password is only allowed in development, so a live site can never get a known admin login.
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = (process.env.ADMIN_EMAIL || (isProduction ? '' : 'admin@finovo.com')).trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'Admin@Finovo2026!');
  if (isProduction) {
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error('Set ADMIN_EMAIL to the real admin email address before seeding in production');
    }
    if (rawPassword.length < 12 || rawPassword === 'Admin@Finovo2026!') {
      throw new Error('Set ADMIN_PASSWORD to a private password of at least 12 characters before seeding in production');
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let userId: string;

  if (!existingUser) {
    const passwordHash = await PasswordService.hashPassword(rawPassword);
    const createdUser = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Finovo Enterprise Administrator',
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    userId = createdUser.id;
    console.log(`Created default admin user: ${adminEmail}`);
  } else {
    // An existing admin keeps the password they chose; seeding again never resets it
    userId = existingUser.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });
    console.log(`Admin user already exists, password left unchanged: ${adminEmail}`);
  }

  // 3. Assign ADMIN and SUPER_ADMIN roles
  for (const role of [superAdminRole, adminRole]) {
    const hasRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    if (!hasRole) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
      console.log(`Assigned ${role.name} role to ${adminEmail}`);
    }
  }

  console.log('Admin seeding complete.');
  await prisma.$disconnect();
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
