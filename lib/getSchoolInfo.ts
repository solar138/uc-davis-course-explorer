import { School } from "@prisma/client";
import { prisma } from "./prisma";

export default function getSchoolInfo(school: string) : Promise<School | null> {
    return prisma.school.findUnique({
        where: {
            name: school
        }
    });
}

export type SchoolInfo = {
    iconUrl: string;
    name: string;
    fullName: string;
    location: string;
    primaryColor?: string;
    secondaryColor?: string;
    id: string;
}