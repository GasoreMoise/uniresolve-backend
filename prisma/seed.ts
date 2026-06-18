import { PrismaClient, UserRole, Department } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Computer Science Department sandbox seeding...');
  
  const adminPhone = '+250700000000'; 
  const rawPassword = 'SuperSecretPassword123!'; 
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: adminPhone }, 
    update: {},
    create: {
      fullName: 'System Administrator',
      phoneNumber: adminPhone,
      email: 'admin@uniresolve.rw',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN, 
    },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2025-2026' },
    update: {},
    create: { name: '2025-2026', isActive: true },
  });

  const facultyData = [
    { email: 'e.mutanguha@ur.ac.rw', name: 'Dr. Emmanuel Mutanguha', phone: '+250788000011' },
    { email: 'j.nsengiyumva@ur.ac.rw', name: 'Prof. Jean Nsengiyumva', phone: '+250788000012' },
    { email: 'a.uwamahoro@ur.ac.rw', name: 'Dr. Alice Uwamahoro', phone: '+250788000013' },
    { email: 'd.karemera@ur.ac.rw', name: 'Prof. David Karemera', phone: '+250788000014' }
  ];

  const facultyNodes: any[] = []; 
  for (const faculty of facultyData) {
    const created = await prisma.user.upsert({
      where: { email: faculty.email },
      update: {},
      create: {
        email: faculty.email,
        phoneNumber: faculty.phone,
        passwordHash: hashedPassword,
        fullName: faculty.name,
        role: UserRole.LECTURER,
        department: Department.COMPUTER_SCIENCE,
      },
    });
    facultyNodes.push(created);
  }

  const modulesToSeed = [
    { code: 'BIT312', title: 'Software Engineering Principles & Frameworks', credits: 20, lecId: facultyNodes[0].id },
    { code: 'BIT324', title: 'Mobile Computing Architecture', credits: 15, lecId: facultyNodes[1].id },
    { code: 'BIT315', title: 'Information Security & Applied Cryptography', credits: 15, lecId: facultyNodes[2].id },
    { code: 'BIT321', title: 'Advanced Full-Stack Web Technologies', credits: 20, lecId: facultyNodes[3].id }
  ];

  for (const mod of modulesToSeed) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: { lecturerId: mod.lecId },
      create: {
        code: mod.code,
        title: mod.title,
        credits: mod.credits,
        academicYearId: academicYear.id,
        lecturerId: mod.lecId,
      },
    });
  }

  // ◄ UPDATED: Explicit Computer Science Staff Titles
  await prisma.user.upsert({
    where: { email: 'finance@ur.ac.rw' },
    update: {},
    create: {
      email: 'finance@ur.ac.rw',
      fullName: 'Jane Mutoni (CS Finance Desk)',
      phoneNumber: '+250780000001',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      department: Department.FINANCE,
    }
  });

  await prisma.user.upsert({
    where: { email: 'hod.cs@ur.ac.rw' },
    update: {},
    create: {
      email: 'hod.cs@ur.ac.rw',
      fullName: 'Dr. Samuel Nshuti (HOD - Computer Science)',
      phoneNumber: '+250780000002',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      department: Department.FACULTY_HOD,
    }
  });

  // ◄ NEW: Added Registrar Account for Card Replacements
  await prisma.user.upsert({
    where: { email: 'registrar.cs@ur.ac.rw' },
    update: {},
    create: {
      email: 'registrar.cs@ur.ac.rw',
      fullName: 'Alice Mpinganzima (CS Registrar)',
      phoneNumber: '+250780000003',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      department: Department.REGISTRAR,
    }
  });

  // ◄ UPDATED: All students explicitly mapped to BSc in Computer Science
  const studentA = await prisma.user.upsert({
    where: { email: 'jules@ur.ac.rw' },
    update: {},
    create: {
      email: 'jules@ur.ac.rw',
      fullName: 'KAZINA Jules',
      phoneNumber: '250782806271', 
      passwordHash: hashedPassword,
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          registrationNumber: '220000001',
          campusLocation: 'Nyarugenge',
          college: 'College of Science and Technology',
          program: 'BSc in Computer Science', // ◄ Sandboxed Program
          academicYear: '2025-2026',
          level: 3,
          sponsorshipType: 'Self-Sponsored',
          isFinanciallyCleared: false, 
        }
      }
    }
  });

  const studentB = await prisma.user.upsert({
    where: { email: 'claire@ur.ac.rw' },
    update: {},
    create: {
      email: 'claire@ur.ac.rw',
      fullName: 'NISINGIZWE Claire',
      phoneNumber: '250780809966', 
      passwordHash: hashedPassword,
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          registrationNumber: '220000002',
          campusLocation: 'Nyarugenge',
          college: 'College of Science and Technology',
          program: 'BSc in Computer Science', // ◄ Sandboxed Program
          academicYear: '2025-2026',
          level: 3,
          sponsorshipType: 'Government',
          isFinanciallyCleared: true, 
        }
      }
    }
  });

  const studentEmail = 'moise.n@ur.ac.rw'; 
  const studentMoise = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      phoneNumber: '250788000002',
      passwordHash: hashedPassword,
      fullName: 'Moise Nshuti Gasore',
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          registrationNumber: '220001111',
          nationalId: '1199980000000123',
          dateOfBirth: new Date('2002-05-15'),
          campusLocation: 'Nyarugenge',
          college: 'College of Science and Technology',
          program: 'BSc in Computer Science', // ◄ Sandboxed Program
          academicYear: '2025-2026',
          level: 3,
          sponsorshipType: 'Government Sponsored',
          isFinanciallyCleared: true,
          accommodationStatus: 'Off-Campus',
        }
      }
    },
  });

  const allModules = await prisma.module.findMany();
  const studentProfiles = await prisma.studentProfile.findMany();

  for (const profile of studentProfiles) {
    for (const module of allModules) {
      await prisma.moduleRegistration.upsert({
        where: {
          studentProfileId_moduleId_academicYear: {
            studentProfileId: profile.id,
            moduleId: module.id,
            academicYear: '2025-2026',
          }
        },
        update: {},
        create: {
          studentProfileId: profile.id,
          moduleId: module.id,
          enrollmentType: 'FIRST_ATTEMPT',
          academicYear: '2025-2026',
        },
      });
    }
  }
  
  console.log('🎉 Computer Science MVP Seeding Complete!');
}

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