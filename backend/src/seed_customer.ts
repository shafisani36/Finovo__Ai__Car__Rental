import { prisma } from './infrastructure/prisma/prisma.client';
import { PasswordService } from './security/password/password.service';

async function seedCustomer() {
  console.log('Seeding customer account for car rental booking...');

  // 1. Ensure CUSTOMER role exists
  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: { description: 'Standard verified rental customer', isSystem: true },
    create: { name: 'CUSTOMER', description: 'Standard verified rental customer', isSystem: true },
  });

  // 2. Ensure customer user exists
  const customerEmail = 'customer@finovo.com';
  const rawPassword = 'Customer@Finovo2026!';
  const passwordHash = await PasswordService.hashPassword(rawPassword);

  const existingUser = await prisma.user.findUnique({
    where: { email: customerEmail },
  });

  let userId: string;

  if (!existingUser) {
    const createdUser = await prisma.user.create({
      data: {
        email: customerEmail,
        fullName: 'Finovo VIP Customer',
        phone: '+966 55 123 4567',
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    userId = createdUser.id;
    console.log(`Created customer user: ${customerEmail}`);
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
    console.log(`Updated customer credentials: ${customerEmail}`);
  }

  // 3. Assign CUSTOMER role
  const hasRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId: customerRole.id,
      },
    },
  });

  if (!hasRole) {
    await prisma.userRole.create({
      data: {
        userId,
        roleId: customerRole.id,
      },
    });
    console.log(`Assigned CUSTOMER role to ${customerEmail}`);
  }

  // 4. Create or update Customer profile record
  const existingCustomer = await prisma.customer.findUnique({
    where: { email: customerEmail },
  });

  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        userId,
        email: customerEmail,
        fullName: 'Finovo VIP Customer',
        phone: '+966 55 123 4567',
        driverLicenseNumber: 'DL-KSA-998231',
        licenseExpiryDate: new Date('2030-12-31'),
        isLicenseVerified: true,
      },
    });
    console.log(`Created customer KYC profile for ${customerEmail}`);
  } else {
    await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        userId,
        driverLicenseNumber: 'DL-KSA-998231',
        licenseExpiryDate: new Date('2030-12-31'),
        isLicenseVerified: true,
      },
    });
    console.log(`Updated customer profile for ${customerEmail}`);
  }

  console.log('Customer seeding completed successfully!');
  await prisma.$disconnect();
}

seedCustomer().catch((err) => {
  console.error('Failed to seed customer:', err);
  process.exit(1);
});
