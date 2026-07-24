import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isDev = process.env.NODE_ENV === 'development';
export const useDegreeStore = create(persist((set) => ({
  school: "ucdavis",
  inspectedDegree: "",
  setInspectedDegree: (degree: string) => set({ inspectedDegree: degree }),
  setSchool: (school: string) => set({ school }),

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