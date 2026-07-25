import { PrismaClient } from '@prisma/client';
import apExams from '../raw/apexams.json'; // adjust path as needed

const prisma = new PrismaClient();

async function ingestIBExams() {
  console.log("Starting AP Exam ingestion...");

  for (const examData of apExams) {
    // 1. Clean the data
    const subject = examData.name.trim();
    const type = "ap";
    const level = ""; // Standardizing to HL for UC Davis IB credits
    const minScore = examData.minScore || 3; // Default to 5 if not specified
    const maxScore = examData.maxScore || 5;

    // 2. Upsert the base Exam record
    await prisma.exam.upsert({
      where: {
        type_subject_level: { type, subject, level }
      },
      update: {},
      create: { type, subject, level, name: subject }
    });

    // 3. Upsert the Exam Credit rule for UC Davis
    await prisma.examCredit.upsert({
      where: {
        // Prisma combines the unique fields into this object name:
        school_examType_examSubject_examLevel_minScore: {
          school: "ucdavis",
          examType: type,
          examSubject: subject,
          examLevel: level,
          minScore: minScore
        }
      },
      update: {
        creditUnits: examData.units,
        // Connect any courses this exam unlocks
        creditCourses: {
          connect: examData.courses.map((courseCode) => ({ slug: courseCode }))
        }
      },
      create: {
        school: "ucdavis",
        examType: type,
        examSubject: subject,
        examLevel: level,
        minScore: minScore,
        maxScore: maxScore,
        creditUnits: examData.units,
        creditCourses: {
          connect: examData.courses.map((courseCode) => ({ slug: courseCode }))
        }
      }
    });

    console.log(`✅ Ingested: ${subject} (Min Score: ${minScore})`);
  }

  console.log("Finished ingesting all IB exams!");
}

ingestIBExams()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());