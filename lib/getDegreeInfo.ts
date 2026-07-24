"use server"

import { Degree } from '@prisma/client';
import { prisma } from './prisma';

export default async function getDegreeInfo(school: string, degreeCode: string) : Promise<Degree | undefined> {

    if (typeof (degreeCode) != "string") throw new Error("degreeCode must be a string");
    return (await prisma.degree.findUnique({ where: { school_code: { code: degreeCode, school } }})) ?? undefined;
}

export async function getDegreesInfo(degreeCodes: string[]) : Promise<Record<string, Degree>> {
    return (await prisma.degree.findMany({ where: { code: { in: degreeCodes } } })).reduce((accumulator, degree) => {
        accumulator[degree.code] = degree;
        return accumulator;
    }, {} as Record<string, Degree>);
}