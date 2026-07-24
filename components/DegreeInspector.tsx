"use client";

import { useDegreeStore } from "@/store/useDegreeStore";
import { JSX, useEffect, useState } from "react";
import { Degree, School } from "@prisma/client";
import getDegreeInfo from "@/lib/getDegreeInfo";

export function DegreeInspector({school} : {school: School}) {
  
  const inspectedDegree = useDegreeStore((state) => state.inspectedDegree);
  const setInspectedDegree = useDegreeStore((state) => state.setInspectedDegree);
  const degrees = useDegreeStore((state) => state.degreePrograms);
  const addDegree = useDegreeStore((state) => state.addDegree);
  const removeDegree = useDegreeStore((state) => state.removeDegree);
  const [degree, setDegree] = useState<Degree>();

  const degreeId = inspectedDegree;

  console.log(degreeId);

  useEffect(() => {
    if (degreeId != undefined) {
      getDegreeInfo(school.name, degreeId).then((degree) => {
        setDegree(degree);
      });
    }
  }, [degreeId]);
  
  const totalUnits = 0;

  console.log(degree);

  if (degree == null) {
    return <div className="border-r border-gray-200 bg-white overflow-y-auto transition ease-in duration-300 w-0 opacity-0">
      <h2 className="text-xl font-bold">{degreeId == undefined ? "No Degree selected" : "Loading..."}</h2>
    </div>;
  }
  return <div className="w-1/4 min-w-[500px] border-r border-gray-200 bg-white p-6 overflow-y-auto">
    <h2 className="text-xl font-bold">{degree.shortName ?? degree.name}</h2>
    <p className="text-gray-500">{degree.name}</p>
    <p className="italic mt-4">{degree.description}</p>
    {degree.url && <p>Read more: <span><a href={degree.url}>{school.shortName} Catalog</a></span></p>}
    <p className="mt-4"><span className="font-bold">Units:</span> {totalUnits}</p>
    <button onClick={() => degrees.includes(degreeId) ? removeDegree(degreeId) : addDegree(degreeId)} className={"mt-4 px-4 py-2 text-white rounded cursor-pointer" + (degrees.includes(degreeId) ? " bg-red-500 hover:bg-red-300" : " bg-blue-500 hover:bg-blue-300")}>
      {degrees.includes(degreeId) ? "Remove" : "Add"} Degree
    </button>
  </div>;
}

function linkBrackets(item : string, callback? : (degreeId : string) => void) : JSX.Element {
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