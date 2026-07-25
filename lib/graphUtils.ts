import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { CoursePrerequiste } from './course';

export function buildGraphTree(plannedCourses: any[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const processedIds = new Set<string>();

  //  Add all the explicitly planned courses first
  plannedCourses.forEach((course) => {
    const nodeId = course.slug || course.code.replace(/\s+/g, '').toUpperCase();
    const specialRequirements = extractSpecialRequirements(course.prerequisiteRules);
    nodes.push({
      id: nodeId,
      type: 'course',
      position: { x: 0, y: 0 },
      data: {...course, specialRequirements }, 
    });
    processedIds.add(nodeId);
  });

  const awaitingInfo : { label : string, status : string, shortDesc? : string, description? : string }[] = [];

  // Build the prerequisite tree for each planned course
  plannedCourses.forEach((course) => {
    const targetId = course.slug || course.code.replace(/\s+/g, '').toUpperCase();
    const rules = course.prerequisiteRules || [];

    function traverseAST(rule: any, parentId: string) {
      if (rule.type === 'course') {
        // Spawn a ghost node if we don't have it yet
        if (!processedIds.has(rule.course)) {
          const nodeData = { label: rule.course, status: 'unmet' };
          awaitingInfo.push(nodeData);
          nodes.push({
            id: rule.course,
            type: 'course',
            position: { x: 0, y: 0 },
            data: nodeData,
          });
          processedIds.add(rule.course);
        }

        // Draw arrow from prereq to parent
        const isPlanned = nodes.some(n => n.id === rule.course && n.data.status === 'planned');
        edges.push({
          id: `edge-${rule.course}-${parentId}`,
          source: rule.course,
          target: parentId,
          type: 'smart',
          animated: true,
          style: isPlanned 
            ? { stroke: '#3b82f6', strokeWidth: 2 } // Solid Blue for real courses
            : { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '5,5' }, // Dashed Gray for ghosts
        });
      }
      else if (rule.type === 'or' || rule.type === 'and') {
        // Filter out courses with no actual prereqs.
        const validChildren = rule.operands?.filter(
          (op: any) => op.type === 'course' || op.type === 'or' || op.type === 'and'
        ) || [];

        if (validChildren.length === 0) return;
        // Did the user already add one of these options to the canvas?
        const fulfilledOption = rule.operands.find(
          (op: any) => op.type === 'course' && nodes.some((n) => n.id === op.course && n.data.status === 'planned')
        );

        if (fulfilledOption) {
          traverseAST(fulfilledOption, parentId);
        } else {
          const logicId = `logic-or-${parentId}-${Math.random().toString(36).substring(2, 6)}`;
          nodes.push({
            id: logicId,
            type: 'logic',
            position: { x: 0, y: 0 },
            data: { label: rule.type == 'or' ? 'Any Of' : 'All Of' },
          });
          edges.push({
            id: `edge-${logicId}-${parentId}`,
            source: logicId,
            target: parentId,
            type: 'smart',
            style: { stroke: '#9ca3af', strokeWidth: 2 },
          });

          rule.operands.forEach((op: any) => traverseAST(op, logicId));
        }
      }
    }

    // const info = await getCoursesInfo(awaitingInfo.map((i) => i.label));

    // awaitingInfo.forEach((i) => {
    //   if (info[i.label]) {
    //     i.shortDesc = info[i.label].shortDesc ?? undefined;
    //     i.description = info[i.label].description;
    //   }
    // });

    rules.forEach((rule: any) => traverseAST(rule, targetId));
  });

  return { unlayoutedNodes: nodes, generatedEdges: edges };
}

export function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40 });

  nodes.forEach((node) => {
    const width = node.type === 'logic' ? 80 : 260;
    const height = node.type === 'logic' ? 30 : 160;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === 'logic' ? 80 : 260;
    const height = node.type === 'logic' ? 30 : 160;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Extracts non-course rules into a clean array of strings
export function extractSpecialRequirements(rules: any[]): string[] {
  if (!rules || !Array.isArray(rules)) return [];
  
  const reqs = new Set<string>();
  
  function walk(rule: any) {
    if (!rule) return;
    if (rule.type === 'course') return;
    if (rule.type === 'or' || rule.type === 'and') {
      rule.operands?.forEach(walk);
      return;
    }
    switch (rule.type) {
      case 'exam':
        reqs.add(getExamName(rule));
        return;
      case 'highschool':
        reqs.add("Taken " + rule.course + " in High School");
        return;
      default:
        reqs.add(rule.type);
        return;
    }
  }
  
  rules.forEach(walk);
  return Array.from(reqs);
}

export function getExamName(rule : CoursePrerequiste) : string {
  if (rule.grade) {
    if (String(+rule.grade) == rule.grade) 
      return (rule.grade ? "Score ≥ " + rule.grade + " on " + rule.course! : rule.course!);
    else
      return (examNames[rule.course as string] ?? rule.course) + " score " + rule.grade;
  } else {
    return ("Completion of " + (examNames[rule.course as string] ?? rule.course));
  }
}

export const examNames : Record<string, string> = {
  "MATH": "Mathematics Placement Requirement",
  "CHEM": "Chemistry Placement Requirement",
  "ECS": "Computer Science Placement Requirement",
  "LANG": "Foreign Language Placement Requirement"
}