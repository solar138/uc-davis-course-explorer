import { StudentExam } from '@/components/DegreePlanner';
import { Course, Exam } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isDev = process.env.NODE_ENV === 'development';
type DegreeState = {
  school: string;
  setSchool: (school: string) => void;
  degreePrograms: string[];
  addDegree: (degree: string) => void;
  removeDegree: (degree: string) => void;
  clearDegrees: () => void;
  inspectedDegree: string;
  setInspectedDegree: (degree: string) => void;
  exams: StudentExam[];
  addExam: (exam: StudentExam | Exam) => void;
  removeExam: (exam: Exam) => void;
  clearExams: () => void;

  awardedCredit: Course[];
  setAwardedCredit: (awardedCredit: Course[]) => void;
}

export const useDegreeStore = create(persist<DegreeState>((set) => ({
  school: "ucdavis",
  inspectedDegree: "",
  setInspectedDegree: (degree: string) => set({ inspectedDegree: degree }),
  setSchool: (school: string) => set({ school }),

  exams: [],
  addExam: (exam: StudentExam | Exam) => {
    set((state: DegreeState) => (state.exams.some(ex => ex.level == exam.level && ex.type == exam.type && ex.subject == exam.subject)) ? state : {
      exams: [...state.exams, exam].sort((a, b) => a.name.localeCompare(b.name))
    });
  },
  removeExam: (exam: Exam) => set((state : DegreeState) => ({
    exams: state.exams.filter((ex: Exam) => ex.level != exam.level || ex.type != exam.type || ex.subject != exam.subject)
  })),
  clearExams: () => set({ exams: [] }),

  awardedCredit: [],
  setAwardedCredit: (awardedCredit: Course[]) => set({awardedCredit }),


  degreePrograms: [],
  addDegree: (degree: string) => set((state : any) => ({
    degreePrograms: [...state.degreePrograms, degree]
  })),
  removeDegree: (degree: string) => set((state : any) => ({
    degreePrograms: state.degreePrograms.filter((deg: string) => deg !== degree)
  })),
  clearDegrees: () => set({ degreePrograms: [] }),
}),
    {
      name: 'degree',
    }));

export default useDegreeStore