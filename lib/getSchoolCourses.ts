
import { School } from "@prisma/client";
import { Course, CourseGeneralEducation, CourseLibrary, CoursePrerequisites } from "./course";
import { prisma } from "./prisma";

const toSlug = (code: string) => code.replace(/\s+/g, '').toUpperCase();
const coursesCache : Record<string, CourseLibrary> = {};

const isDev = process.env.NODE_ENV === 'development';
export default async function getSchoolCourses(school : School) : Promise<CourseLibrary> {

    if (!isDev)
        if (coursesCache[school.name]) return coursesCache[school.name];

    const dbCourses = await prisma.course.findMany({
        include: {
        instructors: true,     
        prerequisiteFor: true, 
        },
        where: {
            schoolName: school.name
        }
    });

    const courseMap = dbCourses.reduce((accumulator, dbCourse) => {
    
    accumulator[toSlug(dbCourse.code)] = {
      id: toSlug(dbCourse.code),
      name: dbCourse.name,
      description: dbCourse.description,
      code: dbCourse.code,
      units: +dbCourse.units[0],
      shortDesc: dbCourse.shortDesc ?? undefined,
      instructorIds: dbCourse.instructors.map((instructor) => instructor.id),
      unlockIds: dbCourse.prerequisiteFor.map((child) => toSlug(child.code)),
      generalEducation: dbCourse.generalEducation as CourseGeneralEducation,
      prerequisites: dbCourse.prerequisiteRules as unknown as CoursePrerequisites,
      rawPrerequisites: dbCourse.rawPrerequisitesText ?? undefined,
      grading: "Letter" 
    };

    coursesCache[school.name] = accumulator;

    return accumulator;
  }, {} as Record<string, Course>); // <--- Initialize with an empty object

  calculateUnlocks(courseMap);

  return courseMap;
}
// const PHY009A : Course = CreateCourse({
//     name: "Classical Physics 1",
//     description: "Introduction to general principles and analytical methods used in physics for physical science and engineering majors. Classical mechanics.",
//     code: "PHY 009A",
//     units: 5,
//     instructorIds: [],
//     prerequisites: [ { type: "or", operands: [ "MAT021B", "MAT021CH", "MAT021M", "MAT017C", "MAT017B" ] }],
//     unlockIds: [],
//     id: "PHY009A",
//     grading: "Letter"
// });
// const PHY009B : Course = CreateCourse({
//     name: "Classical Physics 2",
//     description: "Continuation of PHY 009A. Fluid mechanics, thermodynamics, wave phenomena, optics.",
//     code: "PHY 009B",
//     units: 5,
//     instructorIds: [],
//     prerequisites: [ { type: "or", operands: [ "PHY009A(H)" ] }, { type: "or", operands: [ "MAT017C", "MAT021C(H)" ] }],
//     unlockIds: [],
//     id: "PHY009B",
//     grading: "Letter"
// })
// const MAT021A : Course = CreateCourse({ 
//     name: "Calculus 1",
//     description: "Functions, limits, continuity. Slope and derivative. Differentiation of algebraic and transcendental functions. Applications to motion, natural growth, graphing, extrema of a function. Differentials. L'Hopital's rule.",
//     code: "MAT 021A",
//     units: 4,
//     instructorIds: [],
//     prerequisites: [ { type: "highschool", course: "Algebra" }, { type: "highschool", course: "Geometry" }, { type: "exam", course: "Mathematics Placement Requirement" } ],
//     unlockIds: [],
//     id: "MAT021A",
//     grading: "Letter"
// });
// const MAT021B : Course = CreateCourse({ 
//     name: "Calculus 2",
//     description: "Continuation of MAT 021A. Definition of definite integral, fundamental theorem of calculus, techniques of integration. Application to area, volume, arc length, average of a function, improper integral, surface of revolution.",
//     code: "MAT 021B",
//     units: 4,
//     instructorIds: [],
//     prerequisites: [ { type: "or", operands: [ "MAT021A(H)", "MAT017A", "MAT019A"] } ],
//     unlockIds: [],
//     id: "MAT021B",
//     grading: "Letter"
// });



// const courselist : CourseLibrary = {
//     "PHY009A" : PHY009A,
//     "PHY009B" : PHY009B,
//     "MAT021A" : MAT021A,
//     "MAT021B" : MAT021B
// }

function calculateUnlocks(courses : CourseLibrary) {
    
    var total = 0;
    for (var key in courses) {
        const course = courses[key];
        try {
            traversePrereqs(courses, course.prerequisites, prereq => {
                if (prereq == undefined) return;
                if (courses[prereq.id] == undefined) return;
                prereq.unlockIds.push(course.id);
            });
        } catch {
            console.log("Parsing error in course " + course.code);
        }
        total++;
    }
    console.log("Calculated unlocks for " + total + " courses.");
}


function traversePrereqs(courses : CourseLibrary, prereqs : CoursePrerequisites, callback : (course : Course) => void) {
    try {
    for (var prereq of prereqs) {
        switch (prereq.type) {
            case "course":
                callback(courses[prereq.course!]);
                break;
            case "or":
                traversePrereqs(courses, prereq.operands, callback);
                break;
            case "and":
                traversePrereqs(courses, prereq.operands, callback);
                break;
        }
    } } catch (e) { console.log("Invalid value in " + (typeof(prereqs) == "object" ? JSON.stringify(prereqs) : prereqs)); throw e; }
}