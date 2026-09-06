import { currentTerm } from '@/lib/termInfo';
import { Course } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ScheduleState = {
    // schedule: Record<string, number>;
    schedules: Record<string, Schedule>;
    getSchedule: () => Schedule;
    setSchedule: (schedule: Schedule) => void;
    selectedTerm: string;
    setSelectedTerm: (term: string) => void;
    hoverCrn: number;
    setHoverCrn: (crn: number) => void;
    activeScheduling: string | null; 
    setActiveScheduling: (courseCode: string | null) => void;
    addCourseToSchedule: (courseCode: Course | string, section?: number) => void;
    removeCourseFromSchedule: (courseCode: string) => void;
    rescheduleCourse: (courseCode: string, newSection: number) => void;
    clearSchedule: () => void;
}

export type Schedule = Record<string, number>;
const devSchedule = { "MAT021C": 0, "PHY009HA": 0, "ENG004": 0, "EAE001": 0, "CHE004A": 0 };
const isDev = process.env.NODE_ENV === 'development';
export const useScheduleStore = create(persist<ScheduleState>((set, get) => ({
  getSchedule: () => {
    return get().schedules[get().selectedTerm] ?? {};
  },
  schedules: isDev ? {[currentTerm]: devSchedule } : ({} as Record<string, Schedule>),
  setSchedule: (schedule) => set({ schedules: {...get().schedules, [get().selectedTerm]: {...schedule }}}),
  selectedTerm: currentTerm,
  setSelectedTerm: (selectedTerm) => set({ selectedTerm }),
  hoverCrn: 0,
  setHoverCrn: (crn) => set({ hoverCrn: crn }),
  activeScheduling: null,
  setActiveScheduling: (courseCode: string | null) => set({ activeScheduling: courseCode }),
  addCourseToSchedule: (courseCode : Course | string, section : number = 0) => set((state) => ({ schedules: 
    { ...state.schedules, [state.selectedTerm]: ({ ...state.getSchedule(), [typeof(courseCode) == "string" ? courseCode : courseCode.slug]: section})}
  })),
  removeCourseFromSchedule: (courseCode : string) => set((state) => {
    const newSchedule = { ...state.getSchedule() };
    delete newSchedule[courseCode];
    if (courseCode == state.activeScheduling) {
      set({ activeScheduling: null });
    }
    return {schedules: { ...get().schedules, [get().selectedTerm]: newSchedule }};
  }),
  rescheduleCourse: (courseCode : string, newSection : number) => set((state) => {
    const newSchedule = { ...state.getSchedule() };
    newSchedule[courseCode] = newSection;
    return {schedules: { ...get().schedules, [get().selectedTerm]: newSchedule }};
  }),
  clearSchedule: () => set({ schedules: { ...get().schedules, [get().selectedTerm]: {}} }),
}),
    {
      name: 'schedule',
      version: 1,
      migrate: (oldState : any, version) => {

        if (version == 0 || version == undefined) {
          return { ...oldState, schedules: { "202610": oldState.schedule }};
        }

        return oldState;
      }
    }));

export default useScheduleStore