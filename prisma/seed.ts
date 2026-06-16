import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Instantiate the Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Define your admin credentials
  const adminPhone = '+250700000000'; // Replace with your actual mobile number
  const rawPassword = 'SuperSecretPassword123!'; // Replace with a strong password
  
  // 2. Hash the password before saving it
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  // 3. Upsert the user (Upsert = Update if exists, Create if it doesn't)
  // This prevents errors if you accidentally run the seed script twice.
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: adminPhone }, // Or use email if phone isn't unique in your schema
    update: {},
    create: {
      fullName: 'System Administrator',
      phoneNumber: adminPhone,
      email: 'admin@uniresolve.rw',
      passwordHash: hashedPassword,
      role: 'ADMIN', // Adjust to match your Enum
    },
  });

  console.log('✅ Super Admin account successfully created or verified:');
  console.log(`User ID: ${superAdmin.id}`);
  console.log(`Phone: ${superAdmin.phoneNumber}`);
}

// Execute the main function and handle disconnects/errors
main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database.');
  });