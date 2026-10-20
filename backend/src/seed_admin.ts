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

  // 2. Ensure default admin user exists
  const adminEmail = 'admin@finovo.com';
  const rawPassword = 'Admin@Finovo2026!';
  const passwordHash = await PasswordService.hashPassword(rawPassword);

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let userId: string;

  if (!existingUser) {
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
    userId = existingUser.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });
    console.log(`Updated default admin credentials: ${adminEmail}`);
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
