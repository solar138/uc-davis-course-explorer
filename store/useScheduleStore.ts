import { Course } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ScheduleState = {
    schedule: Record<string, number>;
    setSchedule: (schedule: Record<string, number>) => void;
    hoverCrn: number;
    setHoverCrn: (crn: number) => void;
    activeScheduling: string | null; 
    setActiveScheduling: (courseCode: string | null) => void;
    addCourseToSchedule: (courseCode: Course | string, section?: number) => void;
    removeCourseFromSchedule: (courseCode: string) => void;
    rescheduleCourse: (courseCode: string, newSection: number) => void;
    clearSchedule: () => void;
}

const isDev = process.env.NODE_ENV === 'development';
export const useScheduleStore = create(persist<ScheduleState>((set) => ({
  schedule: isDev ? { "MAT021C": 0, "PHY009HA": 0, "ENG004": 0, "EAE001": 0, "CHE004A": 0 } : ({} as Record<string, number>),
  setSchedule: (schedule) => set({ schedule }),
  hoverCrn: 0,
  setHoverCrn: (crn) => set({ hoverCrn: crn }),
  activeScheduling: null,
  setActiveScheduling: (courseCode: string | null) => set({ activeScheduling: courseCode }),
  addCourseToSchedule: (courseCode : Course | string, section : number = 0) => set((state) => ({ schedule: { ...state.schedule, [typeof(courseCode) == "string" ? courseCode : courseCode.slug]: section} })),
  removeCourseFromSchedule: (courseCode : string) => set((state) => {
    const newSchedule = { ...state.schedule };
    delete newSchedule[courseCode];
    if (courseCode == state.activeScheduling) {
      set({ activeScheduling: null });
    }
    return { schedule: newSchedule };
  }),
  rescheduleCourse: (courseCode : string, newSection : number) => set((state) => {
    const newSchedule = { ...state.schedule };
    newSchedule[courseCode] = newSection;
    return { schedule: newSchedule };
  }),
  clearSchedule: () => set({ schedule: {} }),
}),
    {
      name: 'schedule',
    }));

export default useScheduleStore