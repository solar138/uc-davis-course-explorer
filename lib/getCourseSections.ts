"use server"

import { Course, Instructor, PrismaClient, Section } from '@prisma/client';
import { prisma } from './prisma';

export async function getCourseSections(courseCode: string, termCode: string) : Promise<Section[] | undefined> {

    if (typeof (courseCode) != "string") throw new Error("courseCode must be a string");
    return (await prisma.section.findMany({ where: { courseCode, termCode }})) ?? undefined;
}

export async function getCoursesSections(courseCode: string[], termCode: string) : Promise<Record<string, Section[]> | undefined> {

    if (!Array.isArray(courseCode)) throw new Error("courseCode must be an array of strings");
    const sections = await prisma.section.findMany({ where: { courseCode: { in: courseCode }, termCode } });
    return sections.reduce((acc, section) => {
        acc[section.courseCode] = acc[section.courseCode] || [];
        acc[section.courseCode].push(section);
        return acc;
    }, {} as Record<string, Section[]>);
}

export async function getSections(sectionCrns: number[], termCode: string) : Promise<Record<number, Section>> {

    if (!Array.isArray(sectionCrns)) throw new Error("sectionCrns must be an array of numbers");
    const sections : Record<number, Section> = {};
    (await prisma.section.findMany({ where: { termCode, crn: { in: sectionCrns.map(crn => "" + crn) } } })).forEach(section => {
        sections[+section.crn] = section;
    });
    return sections ?? undefined;
}

export async function getCourseSectionsWithInstructors(courseCode: string, termCode: string): Promise<(Section & { instructors: Instructor[] })[] | undefined> {
    if (typeof (courseCode) != "string") throw new Error("courseCode must be a string");
    
    const sections = await prisma.section.findMany({ 
        where: { courseCode, termCode }, 
        include: { 
            instructors: {
                include: {
                    instructor: true
                }
            } 
        } 
    });

    // Strip away the SectionInstructor join wrapper to match the expected return type
    return sections.map(section => ({
        ...section,
        instructors: section.instructors.map(join => join.instructor)
    }));
}

export async function getCourseInstructors(courseCode: string): Promise<Instructor[] | undefined> {
    if (typeof (courseCode) != "string") throw new Error("courseCode must be a string");
    
    const course = await prisma.course.findUnique({ 
        where: { slug: courseCode }, 
        include: { 
            sections: { 
                include: { 
                    instructors: {
                        include: {
                            instructor: true
                        }
                    } 
                } 
            } 
        } 
    });

    // Extract the actual instructor from the nested join table, then deduplicate
    const instructors = course?.sections.flatMap(section => 
        section.instructors.map(join => join.instructor)
    );
    
    if (!instructors) return undefined;

    return [...new Map(instructors.map(instructor => [instructor.fullName, instructor])).values()];
}