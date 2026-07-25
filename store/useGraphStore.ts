import { create } from 'zustand';
import { 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  applyNodeChanges, 
  applyEdgeChanges 
} from '@xyflow/react';
import getCourseInfo from '@/lib/getCourseInfo';
import { buildGraphTree, getLayoutedElements } from '@/lib/graphUtils';

type GraphState = {
  nodes: Node[];
  edges: Edge[];
  inspectedCourse : any | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addCourse: (courseCode: string) => void;
  removeCourse: (courseCode: string) => void;
  clearCourses: () => void;
  setInspectedCourse: (course: any | null) => void;
  school: string;
  setSchool: (school: string) => void;
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  inspectedCourse: null,
  school: "",
  setSchool: (school: string) => set({ school }),
  
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  clearCourses: () => {
    set({ nodes: [], edges: [] });
  },
  removeCourse: async (courseCode : string) => {
    const { nodes, school } = get();
    const course = await getCourseInfo(school, courseCode);
    if (course == null) return console.log("Course not found " + courseCode);
    
    const filteredNodes = nodes.filter(n => n.id !== course.slug);
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      filteredNodes,
      generateEdges(filteredNodes)
    );

    set({ nodes: layoutedNodes, edges: layoutedEdges });
  },

  addCourse: async (courseCode : string) => {
    const { nodes, school } = get();
    const course = await getCourseInfo(school, courseCode);
    if (course == null) return console.log("Course not found " + courseCode);
    
    if (nodes.some(n => n.id === String(course.slug) && n.data.status === 'planned')) return console.log("Course already exists");
    const plannedCourses = nodes
      .filter(n => n.data.status === 'planned' && n.id !== courseCode)
      .map(n => n.data);
      
    plannedCourses.push({ ...course, status: 'planned' });

    const { unlayoutedNodes, generatedEdges } = buildGraphTree(plannedCourses);

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      unlayoutedNodes,
      generatedEdges
    );

    set({ nodes: layoutedNodes, edges: layoutedEdges });
  },
  setInspectedCourse: (course) => set({ inspectedCourse: course }),

}));

function generateEdges(filteredNodes: Node[]): Edge[] {
  const courses = filteredNodes.map(n => n.data);
  const { generatedEdges } = buildGraphTree(courses);
  return generatedEdges;
}
