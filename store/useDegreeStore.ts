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
}

export const useDegreeStore = create(persist<DegreeState>((set) => ({
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