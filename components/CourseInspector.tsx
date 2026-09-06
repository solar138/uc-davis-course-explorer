"use client";

import Image from 'next/image'
import { CourseGeneralEducation, CoursePrerequisites, PrequisitesToString } from "@/lib/course";
import { useGraphStore } from "@/store/useGraphStore";
import { JSX, useEffect, useState } from "react";
import NestedArray from "@/lib/nestedArray";
import { useScheduleStore } from "@/store/useScheduleStore";
import { Course, Instructor, School } from "@prisma/client";
import { getCourseInstructors } from "@/lib/getCourseSections";
import getCourseInfo from "@/lib/getCourseInfo";
import useDegreeStore from '@/store/useDegreeStore';


export function CourseInspector({ courseId, addTarget, school }: { courseId?: string, addTarget: "graph" | "schedule" | "planner" | "none", school: School }) {

  const inspectedCourse = useGraphStore((state) => state.inspectedCourse);
  const setInspectedCourse = useGraphStore((state) => state.setInspectedCourse);
  const addCourse = addTarget == "graph" ? useGraphStore((state) => state.addCourse) : 
                    addTarget == "schedule" ? useScheduleStore((state) => state.addCourseToSchedule) : 
                    addTarget == "planner" ? useDegreeStore((state) => state.addCourse) : (x : any) => {};
  const removeCourse = addTarget == "graph" ? useGraphStore((state) => state.removeCourse) : 
                    addTarget == "schedule" ? useScheduleStore((state) => state.removeCourseFromSchedule) :
                    addTarget == "planner" ? useDegreeStore((state) => state.removeCourse) : (x : any) => {};
  const setActiveScheduling = useScheduleStore((state) => state.setActiveScheduling);
  const creditCourses = useDegreeStore((state) => state.awardedCredit).map(x => x.slug);

  const courses : string[] = addTarget == "graph" ? useGraphStore((state) => state.nodes).map(x => x.data.slug as string) : 
                  addTarget == "schedule" ? Object.keys(useScheduleStore((state) => state.schedules)[useScheduleStore((state) => state.selectedTerm)] ?? {}) : 
                  addTarget == "planner" ? [...creditCourses, ...useDegreeStore((state) => state.courses).map(x => x.slug)] : [];
  const [course, setCourse] = useState<Course>();
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  if (inspectedCourse) {
    courseId = inspectedCourse.slug ?? inspectedCourse.label;
  }

  useEffect(() => {
    if (courseId != undefined) {
      getCourseInstructors(courseId).then((instructors) => {
        setInstructors(instructors ?? []);
      });
    }

  }, [courseId]);

  useEffect(() => {
    if (courseId != undefined) {
      getCourseInfo(school.name, courseId).then((course) => {
        setCourse(course);
      });
    }
  }, [courseId]);

  if (course == null || inspectedCourse == null) {
    return <div className="border-r border-gray-200 bg-white overflow-y-auto transition ease-in duration-300 w-0 opacity-0">
      <h2 className="text-xl font-bold">{courseId == undefined ? "No course selected" : "Loading..."}</h2>
    </div>;
  }

  return <div className="w-1/4 min-w-[500px] border-r border-gray-200 bg-white p-6 overflow-y-auto">
    <h2 className="text-xl font-bold">{course.code} - {course.name}
      <button className="float-right cursor-pointer hover:text-red-600 transition-colors" title="Close" onClick={() => setInspectedCourse(null)}>X</button></h2>
    {RenderGeneralEducation((course.generalEducation as CourseGeneralEducation) ?? {})}
    <p className="text-gray-500">{course.name}</p>
    <p className="italic mt-4">{course.description}</p>

    <p className="mt-4"><span className="font-bold">Units:</span> {course.units}</p>
    {HierarchyList("Instructors", instructors.map(instructor => instructor.fullName), "None")}
    {HierarchyList("Prerequisites", PrequisitesToString(course.prerequisiteRules as CoursePrerequisites), "None", "brackets", a => setInspectedCourse({ slug: a }))}
    <p className="ml-4 text-gray-500 text-s italic"> {course.rawPrerequisitesText} </p>
    {/* {showUnlocks && HierarchyList("Unlocks", course.unlockIds, "None", "all", a => setInspectedCourse({slug: a}))} */}
    <button 
    disabled={addTarget == "planner" ? creditCourses.includes(course?.slug ?? "") : false} 
      onClick={() => courses.includes(course?.slug) ? removeCourse(course?.slug ?? "") : addCourse(course)}
      title={addTarget == "planner" && creditCourses.includes(course?.slug ?? "") ? "To remove this course, remove the exam that grants credit for it." : ""}
      className={"mt-4 px-4 py-2 text-white rounded" + (addTarget == "planner" && creditCourses.includes(course?.slug ?? "") ? " bg-gray-300 cursor-not-allowed" : courses.includes(course.slug) ? " bg-red-500 hover:bg-red-300 cursor-pointer" : " bg-blue-500 hover:bg-blue-300 cursor-pointer")}>
      {courses.includes(course.slug) ? "Remove" : "Add"} Course
    </button>{
      addTarget == "schedule" && courses.includes(course.slug) &&
      <button onClick={() => setActiveScheduling(course?.slug ?? null)} className={"mt-4 ml-2 px-4 py-2 text-white rounded cursor-pointer" + (courses.includes(course.slug) ? " bg-red-500 hover:bg-red-300" : " bg-blue-500 hover:bg-blue-300")}>
        Change Section
      </button>
    }
  </div>;
}

function linkBrackets(item: string, callback?: (courseId: string) => void): JSX.Element {
  // find all text in [brackets] and convert to <a href="brackets">brackets</a>
  var regex = /(\[[^\]]+\])/g;

  var obj = <>{
    item.split(regex).map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        // Remove the brackets for the link text and URL
        const linkText = part.slice(1, -1);
        return (
          <button className="cursor-pointer hover:text-blue-600" key={index} onClick={() => callback ? callback(linkText) : undefined}>
            {linkText}
          </button>
        );
      }
      // Return normal text as-is
      return part;
    })
  }</>;
  return obj;
}

function HierarchyListContents(contents: NestedArray<string> | string, depth: number, link: "none" | "brackets" | "all", callback?: (courseId: string) => void): JSX.Element | string {
  if (typeof contents == "string" || contents == undefined) {
    return link == "all" ? <button className="cursor-pointer hover:text-blue-600" onClick={() => callback ? callback(contents) : null}>{contents}</button> : link == "brackets" ? linkBrackets(contents, callback) : <>{contents}</>;
  }
  return <ul className="ml-4">
    {contents.map((item, index) => (
      <li key={index}>{HierarchyListContents(item, depth + 1, link, callback)}</li>
    ))}
  </ul>;
}

export function HierarchyList(title: string, content: NestedArray<string> | string[], empty: string = "None", link: "none" | "brackets" | "all" = "none", callback?: (courseId: string) => void) {

  var contents = <ul className="ml-4 mb-2">
    {content.length > 0 ? content.map((item, index) => (
      <li className="mt-1" key={index}>{HierarchyListContents(item, 0, link, callback)}</li>
    )) : <li className="text-gray-500 italic">{empty}</li>}
  </ul>;
  return <div className="max-h-[250px] overflow-y-auto mb-4">
    <h3 className="font-bold">
      {title}
    </h3>
    {contents}
  </div>;
}

export function RenderGeneralEducation(generalEducation: CourseGeneralEducation) {
  const list = [...generalEducation.topicalBreadth ?? [], ...generalEducation.coreLiteracies ?? []];
  return list.length > 0 ? list.map(x =>
    <Image
      className="inline" width={20} height={20} key={x}
      title={"This course meets the " + GeneralEducationDisplay[x].name.toLowerCase() + " requirement."}
      src={"/ge-icons/SVG/" + GeneralEducationDisplay[x]?.icon}
      alt={GeneralEducationDisplay[x]?.name} />) :
    <Image
      className="inline" width={20} height={20}
      title="This course meets no General Education requirements."
      src="/ge-icons/SVG/none.svg" alt="None" />;
}

export const GeneralEducationDisplay: Record<string, { name: string, shortName: string, icon: string }> = {
  "SE": { name: "Science & Engineering", shortName: "Sci & Eng", icon: "se.svg" },
  "AH": { name: "Arts & Humanities", shortName: "Arts & Hum", icon: "ah.svg" },
  "SS": { name: "Social Sciences", shortName: "Soc Sci", icon: "ss.svg" },
  "ACGH": { name: "American Cultures, Governance, and History", shortName: "American CGH", icon: "acgh.svg" },
  "DD": { name: "Domestic Diversity", shortName: "Dom Div", icon: "dd.svg" },
  "OL": { name: "Oral Literacy", shortName: "Oral Lit", icon: "ol.svg" },
  "QL": { name: "Quantitative Literacy", shortName: "Quant Lit", icon: "ql.svg" },
  "SL": { name: "Scientific Literacy", shortName: "Sci Lit", icon: "sl.svg" },
  "VL": { name: "Visual Literacy", shortName: "Visual Lit", icon: "vl.svg" },
  "WC": { name: "World Cultures", shortName: "World Cultures", icon: "wc.svg" },
  "WE": { name: "Writing Experience", shortName: "Writing Exp", icon: "we.svg" }
}
