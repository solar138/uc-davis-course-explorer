"use server"

import { Exam, ExamCredit } from '@prisma/client';
import { prisma } from './prisma';
import { StudentExam } from '@/components/DegreePlanner';

export default async function getExams(type?: string, subject?: string, level?: string) : Promise<Exam[]> {

    return (await prisma.exam.findMany({ where: { type, subject, level }}));
}

export async function getExamCredits(exams: StudentExam[], school: string) {
    return (await prisma.examCredit.findMany({ where: { 
        examSubject: { in: exams.map(exam => exam.subject) }, 
        examLevel: { in: exams.map(exam => exam.level) }, 
        examType: { in: exams.map(exam => exam.type) }, 
        school }, include: { creditCourses: true } }));
}