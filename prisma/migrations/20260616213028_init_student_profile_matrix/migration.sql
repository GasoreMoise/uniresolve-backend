-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "nationalId" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "campusLocation" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "sponsorshipType" TEXT NOT NULL,
    "isFinanciallyCleared" BOOLEAN NOT NULL DEFAULT false,
    "accommodationStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleRegistration" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enrollmentType" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,

    CONSTRAINT "ModuleRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_registrationNumber_key" ON "StudentProfile"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_nationalId_key" ON "StudentProfile"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleRegistration_studentProfileId_moduleId_academicYear_key" ON "ModuleRegistration"("studentProfileId", "moduleId", "academicYear");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleRegistration" ADD CONSTRAINT "ModuleRegistration_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleRegistration" ADD CONSTRAINT "ModuleRegistration_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
