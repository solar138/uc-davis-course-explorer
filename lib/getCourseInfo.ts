"use server"

import { Course, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

export default async function getCourseInfo(school: string, courseCode: string, includePrereqs: boolean = false) : Promise<Course | undefined> {
    console.log(school);
    if (typeof (courseCode) != "string") throw new Error("courseCode must be a string");
    return (await prisma.course.findUnique({ where: { slug: courseCode, schoolName: school }, include: { prerequisites: includePrereqs }})) ?? undefined;
}

export async function getCoursesInfo(school: string,courseCodes: string[]) : Promise<Record<string, Course>> {
    return (await prisma.course.findMany({ where: { slug: { in: courseCodes }, schoolName: school } })).reduce((accumulator, course) => {
        accumulator[course.slug] = course;
        return accumulator;
    }, {} as Record<string, Course>);
}