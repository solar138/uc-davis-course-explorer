import { StudentExam } from '@/components/DegreePlanner';
import { Course, Exam, School } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isDev = process.env.NODE_ENV === 'development';

type StudentCourse = Course & {
  section?: string,
  grade?: number,
  status: "complete" | "in progress" | "incomplete" | "dropped" | "other"
}

type TabState = "exams" | "progress" | "plan" | "credit";

type DegreeState = {
  hideDiplomaWarning: boolean;
  setHideDiplomaWarning: (value: boolean) => void;
  
  degreePrograms: string[];
  addDegree: (degree: string) => void;
  removeDegree: (degree: string) => void;
  clearDegrees: () => void;
  inspectedDegree: string;
  setInspectedDegree: (degree: string) => void;

  courses: StudentCourse[];
  addCourse: (course: StudentCourse | Course) => void;
  removeCourse: (course: string) => void;
  clearCourses: () => void;
  updateCourses: () => void;

  exams: StudentExam[];
  addExam: (exam: StudentExam | Exam) => void;
  removeExam: (exam: Exam) => void;
  clearExams: () => void;
  updateExams: () => void;

  tabState: TabState;
  setTabState: (tabState: TabState) => void;

  awardedCredit: Course[];
  setAwardedCredit: (awardedCredit: Course[]) => void;
}

export const useDegreeStore = create(persist<DegreeState>((set) => ({
  hideDiplomaWarning: false,
  setHideDiplomaWarning: (value: boolean) => set({ hideDiplomaWarning: value }),

  inspectedDegree: "",
  setInspectedDegree: (degree: string) => set({ inspectedDegree: degree }),

  tabState: "exams",
  setTabState: (tabState: TabState) => set({ tabState }),

  courses: [],
  addCourse: (course: StudentCourse | Course) => {
    if ("status" in course) {
      
    } else {
      course = { ...course, status: "in progress"};
    }
    set((state: DegreeState) => (state.courses.some(c => c.slug == course.slug && c.section == course.section)) ? state : {
      courses: [...state.courses, course]
    });
  },
  removeCourse: (course: string) => set((state : DegreeState) => ({
    courses: state.courses.filter((c: StudentCourse) => c.slug !== course)
  })),
  clearCourses: () => set({ courses: [] }),
  updateCourses: () => set(state => ({ courses: [ ...state.courses ] })),

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
  updateExams: () => set(state => ({ exams: [ ...state.exams ] })),

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