import fileSystem from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { currentTerm } from '@/lib/termInfo';

const prisma = new PrismaClient();
async function sanitizeCourseCodes() {
  console.log("Fetching all courses...");
  const allCourses = await prisma.course.findMany();

  let updateCount = 0;

  for (const course of allCourses) {
    // \u00A0 is the unicode for a non-breaking space. 
    // We replace it (and any multiple spaces) with a single standard space.
    const cleanCode = course.code.replace(/[\u00A0\s]+/g, ' ').trim();

    if (cleanCode !== course.code) {
      await prisma.course.update({
        where: { id: course.id },
        data: { code: cleanCode }
      });
      console.log(`Cleaned: [${course.code}] -> [${cleanCode}]`);
      updateCount++;
    }
  }

  console.log(`\n✅ Done! Sanitized ${updateCount} course codes.`);
}

async function parseSections(termCode: string) {
  const sections = [];
  console.log("Loading section jsons...");
  for (var i = 0; i < 2; i++) {
    const sectionsFilePath = path.join(process.cwd(), 'raw', 'sections', termCode, i + '.json');
    const sectionsFile = fileSystem.readFileSync(sectionsFilePath, 'utf-8');
    const sectionsJson = JSON.parse(sectionsFile);
    sections.push(...sectionsJson);
  }
  console.log("Found " + sections.length + " sections.");
  const uniqueSections = [...new Map(sections.map(section => [section.course.crn, section])).values()];

  console.log("Found " + uniqueSections.length + " unique sections.");
  // console.log(uniqueSections[0])

  const instructors = [];
  for (var section of uniqueSections) {
    instructors.push(...section.instructor);
  }

  // console.log("Found " + instructors.length + " instructors.");
  // const uniqueInstructors = [...new Map(instructors.map(instructor => [instructor.instructorEmail, instructor])).values()];

  // console.log("Found " + uniqueInstructors.length + " unique instructors.");
  seedSections(uniqueSections);
}

async function seedSections(uniqueSections: any[], school: string = "ucdavis") {
  for (const section of uniqueSections) {
    // 1. Reconstruct the Course Code to match your Course.code field (e.g., "MAT 021D")
    const formattedCourseCode = `${section.course.subjectCode}${section.course.courseNum}`;

    // 2. Parse the Final Exam Date safely (Some classes don't have finals)
    const finalExamDate = section.finalExam?.examDate
      ? new Date(section.finalExam.examDate)
      : null;
    const uniqueInstructors = Array.from(
      new Map(section.instructor.map((inst: any) => [inst.fullName, inst])).values()
    );

    const instructor = uniqueInstructors.map((inst: any) => ({
      instructor: {
        connectOrCreate: {
          where: { fullName: inst.fullName },
          create: {
            fullName: inst.fullName,
            email: inst.instructorEmail || null,
            schoolName: school // Make sure this is added to your Prisma model!
          }
        }
      }
    }));

    try {
      // 3. Upsert the Section
      await prisma.section.upsert({
        where: {
          crn_termCode: {
            crn: section.course.crn,
            termCode: section.course.termCode
          }
        },
        update: {
          // If the section already exists (e.g., you run the script twice), 
          // just update the dynamic info like meetings and instructors
          meetings: section.meeting,
          finalExam: finalExamDate,
          instructors: {
            deleteMany: {},
            create: instructor
          }
        },
        create: {
          // If it's a new section, create it from scratch
          crn: section.course.crn,
          courseCode: formattedCourseCode,
          termCode: section.course.termCode, // "202610"
          sectionNum: section.course.seqNum, // "A06"
          meetings: section.meeting,         // Dumps the whole array as JSON
          finalExam: finalExamDate,
          instructors: {
            create: instructor
          }
        }
      });


      console.log(`Upserted CRN ${section.course.crn}: ${formattedCourseCode} ${section.course.seqNum}`);
    } catch (e) {
      console.log(`Error CRN ${section.course.crn}: ${formattedCourseCode} ${section.course.seqNum}`);

      var str = e + "";
      if (str.includes("Foreign key constraint violated on the constraint: `Section_courseCode_fkey`")) {
        console.log(`${formattedCourseCode} does not exist`);
      }
      else {
        console.log(e);
        console.log(section);
      }
    }
  }
}

// sanitizeCourseCodes();
parseSections("202610")
  .catch(console.error)
  .finally(() => prisma.$disconnect());