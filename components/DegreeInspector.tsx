"use client";

import { useDegreeStore } from "@/store/useDegreeStore";
import { JSX, useEffect, useState } from "react";
import { Course, Degree, School } from "@prisma/client";
import getDegreeInfo from "@/lib/getDegreeInfo";
import NestedArray from "@/lib/nestedArray";
import { getCoursesInfo } from "@/lib/getCourseInfo";

export function DegreeInspector({ school }: { school: School }) {

  const inspectedDegree = useDegreeStore((state) => state.inspectedDegree);
  const setInspectedDegree = useDegreeStore((state) => state.setInspectedDegree);
  const degrees = useDegreeStore((state) => state.degreePrograms);
  const addDegree = useDegreeStore((state) => state.addDegree);
  const removeDegree = useDegreeStore((state) => state.removeDegree);
  const [degree, setDegree] = useState<Degree>();
  const [courses, setCourses] = useState<Record<string, Course>>();

  const degreeId = inspectedDegree;

  useEffect(() => {
    if (degreeId != undefined) {
      getDegreeInfo(school.name, degreeId).then((degree) => {
        setDegree(degree);

        const requirements = degree?.requirements as DegreeRequirement[];

        if (requirements == undefined) return console.log("no requirements foudn for degree", degree);
        const courses = requirements.flatMap(requirement => requirement.subcategories.flatMap(subcategory => subcategory.courses.flatMap(course => getCourses(course))));
        getCoursesInfo(school.name, courses).then((courses) => {
          setCourses(courses);
        });
      });
    }
  }, [degreeId]);

  const totalUnits = 0;

  if (degree == null) {
    return <div className="border-r border-gray-200 bg-white overflow-y-auto transition ease-in duration-300 w-0 opacity-0">
      <h2 className="text-xl font-bold">{degreeId == undefined ? "No Degree selected" : "Loading..."}</h2>
    </div>;
  }
  const requirements = degree.requirements as DegreeRequirement[];
  return <div className="flex flex-col w-1/4 min-w-[500px] border-r border-gray-200 bg-white p-6 overflow-y-auto">
    <h2 className="text-xl font-bold">{degree.shortName ?? degree.name}<button className="float-right cursor-pointer hover:text-red-600 transition-colors" title="Close" onClick={() => setInspectedDegree("")}>X</button></h2>
    <p className="text-gray-500">{degree.name}</p>
    <p className="italic mt-4">{degree.description}</p>
    {degree.url && <p>Read more: <span><a href={degree.url}>{school.shortName} Catalog</a></span></p>}
    <p className="mt-4"><span className="font-bold">Units:</span> {totalUnits}</p>
    <div className="grow overflow-y-auto">{requirements && requirements.map(requirement =>
      <div className="mt-4" key={requirement.category}>
        <span className="font-bold text-lg">{requirement.category}</span>
        <div>
          {requirement.subcategories.map(subcategory => {
            if (subcategory.courses.length > 0 && courses) {
              const units = subcategory.courses.reduce((acc, cur) => add(acc, countUnits(courses, cur)), [0, 0]);
              const unitsStr = units[0] == units[1] ? units[0] : units[0] + "-" + units[1];
              return <div key={subcategory.header}>
                <span style={{
                  backgroundColor: "#3d6dff",
                  display: "inline-block",
                  color: "white",
                  width: "40px",
                  textAlign: "center",
                  margin: "auto",
                  fontFamily: "monospace"
                }} className="rounded"
                  title={units[0] == units[1] ? "Requires " + units[0] + " unit" + (units[0] == 1 ? "" : "s") + "." : "Requires " + units[0] + " to " + units[1] + " units."}>{unitsStr}</span> <span className="font-bold ml-2">{subcategory.header}</span>
                <div className="ml-4">
                  {subcategory.courses.map(course => renderDegreeCourse(course))}
                </div>
              </div>
            }
          }
          )}
        </div>
      </div>)}
    </div>
    <button onClick={() => degrees.includes(degreeId) ? removeDegree(degreeId) : addDegree(degreeId)} className={"mt-4 px-4 py-2 text-white rounded cursor-pointer" + (degrees.includes(degreeId) ? " bg-red-500 hover:bg-red-300" : " bg-blue-500 hover:bg-blue-300")}>
      {degrees.includes(degreeId) ? "Remove" : "Add"} Degree
    </button>
  </div>;
}

function getCourses(course: DegreeCourseRequirement): string[] {
  if (typeof course == "string") {
    return [course];
  } else if (Array.isArray(course)) {
    return course;
  } else if (course.type == "choice") {
    return course.options;
  } else if (course.type == "and") {
    return course.courses;
  }
  return [];
}

function countUnits(courses: Record<string, Course>, course: DegreeCourseRequirement): number[] {
  if (typeof course == "string") {
    const courseInfo = courses[course];
    if (courseInfo == undefined) return [0, 0];
    const units = courseInfo.units.replaceAll(/\s+units?/g, "").split("-");
    if (units.length == 1) return [+units, +units];
    if (units.length == 2) return [+units[0], +units[1]];
    return [0, 0]
  } else if (Array.isArray(course)) {
    const units = course.map(x => countUnits(courses, x));
    const min = Math.min(...units.map(x => x[0]));
    const max = Math.max(...units.map(x => x[1]));
    return [min, max];
  } else if (course.type == "choice") {
    if (course.units_required != undefined) return [course.units_required, course.units_required];
    const units = course.options.map(x => countUnits(courses, x));
    const min = Math.min(...units.map(x => x[0]));
    const max = Math.max(...units.map(x => x[1]));
    return [min, max];
  } else if (course.type == "and") {
    return course.courses.map(x => countUnits(courses, x)).reduce(add, [0, 0]);
  } else {
    return [0, 0];
  }
}

function add(a: number[], b: number[]) {
  return [a[0] + b[0], a[1] + b[1]];
}

function renderDegreeCourse(course: DegreeCourseRequirement): JSX.Element {
  if (typeof course == "string") {
    return <div key={course}>
      <span className="">{course}</span>
    </div>
  } else if (Array.isArray(course)) {
    return <div key={course[0]}>
      <span className="">{course.join(" or ")}</span>
    </div>
  } else if (course.type == "choice") {
    return <div key={course.options[0]}>
      <span className="">{course.instruction}</span>
      <br />
      <span>{course.options.join(", ")}</span>
    </div>
  } else if (course.type == "and") {
    return <div key={course.courses[0]}>
      {course.courses.join(" and ")}
    </div>
  } else {
    return <div> Unknown requirement </div>
  }
}

type DegreeRequirement = {
  category: string,
  subcategories: {
    header: string,
    courses: DegreeCourseRequirement[]
  }[]
}
type DegreeCourseRequirement = string | string[] | {
  courses_required: string,
  units_required: number,
  instruction: string,
  type: "choice" | "and",
  courses: string[]
  options: string[]
}

function linkBrackets(item: string, callback?: (degreeId: string) => void): JSX.Element {
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