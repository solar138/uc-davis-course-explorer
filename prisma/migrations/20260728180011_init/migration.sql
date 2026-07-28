-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDesc" TEXT,
    "name" TEXT NOT NULL,
    "grading" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "learningActivities" JSONB,
    "generalEducation" JSONB,
    "prerequisiteRules" JSONB NOT NULL,
    "rawPrerequisitesText" TEXT,
    "schoolName" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT,
    "email" TEXT,
    "rmpScore" DOUBLE PRECISION,
    "schoolName" TEXT NOT NULL,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "crn" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "sectionNum" TEXT NOT NULL,
    "meetings" JSONB NOT NULL DEFAULT '[]',
    "finalExam" TIMESTAMP(3),

    CONSTRAINT "Section_pkey" PRIMARY KEY ("crn")
);

-- CreateTable
CREATE TABLE "School" (
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "transferURL" TEXT,

    CONSTRAINT "School_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Exam" (
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("type","subject","level")
);

-- CreateTable
CREATE TABLE "ExamCredit" (
    "id" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "creditUnits" INTEGER NOT NULL,
    "examType" TEXT NOT NULL,
    "examSubject" TEXT NOT NULL,
    "examLevel" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 999999,
    "duplicateCredit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExamCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Degree" (
    "school" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "abbreviation" TEXT,
    "shortName" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT,
    "requirements" JSONB NOT NULL,

    CONSTRAINT "Degree_pkey" PRIMARY KEY ("school","code")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "username" TEXT NOT NULL,
    "display" TEXT,
    "email" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "UserData" (
    "username" TEXT NOT NULL,
    "exams" JSONB NOT NULL,
    "courses" JSONB NOT NULL,

    CONSTRAINT "UserData_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "User" (
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "_PrerequisiteGraph" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrerequisiteGraph_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CourseToInstructor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToInstructor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CourseToExamCredit" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToExamCredit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_InstructorToSection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InstructorToSection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_fullName_key" ON "Instructor"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCredit_school_examType_examSubject_examLevel_minScore_key" ON "ExamCredit"("school", "examType", "examSubject", "examLevel", "minScore");

-- CreateIndex
CREATE INDEX "_PrerequisiteGraph_B_index" ON "_PrerequisiteGraph"("B");

-- CreateIndex
CREATE INDEX "_CourseToInstructor_B_index" ON "_CourseToInstructor"("B");

-- CreateIndex
CREATE INDEX "_CourseToExamCredit_B_index" ON "_CourseToExamCredit"("B");

-- CreateIndex
CREATE INDEX "_InstructorToSection_B_index" ON "_InstructorToSection"("B");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "course_school_fkey" FOREIGN KEY ("schoolName") REFERENCES "School"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "instructor_school_fkey" FOREIGN KEY ("schoolName") REFERENCES "School"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCredit" ADD CONSTRAINT "ExamCredit_examType_examSubject_examLevel_fkey" FOREIGN KEY ("examType", "examSubject", "examLevel") REFERENCES "Exam"("type", "subject", "level") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "user_profile_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserData" ADD CONSTRAINT "user_data_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrerequisiteGraph" ADD CONSTRAINT "_PrerequisiteGraph_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrerequisiteGraph" ADD CONSTRAINT "_PrerequisiteGraph_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToInstructor" ADD CONSTRAINT "_CourseToInstructor_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToInstructor" ADD CONSTRAINT "_CourseToInstructor_B_fkey" FOREIGN KEY ("B") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToExamCredit" ADD CONSTRAINT "_CourseToExamCredit_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToExamCredit" ADD CONSTRAINT "_CourseToExamCredit_B_fkey" FOREIGN KEY ("B") REFERENCES "ExamCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorToSection" ADD CONSTRAINT "_InstructorToSection_A_fkey" FOREIGN KEY ("A") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorToSection" ADD CONSTRAINT "_InstructorToSection_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("crn") ON DELETE CASCADE ON UPDATE CASCADE;
