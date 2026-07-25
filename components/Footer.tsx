"use client";

import { useGraphStore } from "@/store/useGraphStore";
import useScheduleStore from "@/store/useScheduleStore";
import { redirect } from "next/navigation";

export function Footer() {
  const clearCourses = useGraphStore((state) => state.clearCourses);
  const clearSchedule = useScheduleStore((state) => state.clearSchedule);

  return <footer className="flex-none h-8 border-t bg-gray-50 px-4 flex items-center border-gray-200 justify-between text-xs text-gray-500 z-10">
    <div className="flex gap-4">
      <span>Put some footer stuff here I guess.</span>
    </div>
    <div className="flex gap-4">
      <button className="cursor-pointer hover:text-blue-600" onClick={() => location.href.endsWith("/scheduler") ? clearSchedule : clearCourses}>Clear Canvas</button>
      <a className="cursor-pointer hover:text-blue-600" href="/help/course-explorer">Help</a>
      <a className="cursor-pointer hover:text-blue-600" href="/changelog">Changelog</a>
      <a className="cursor-pointer hover:text-blue-600" href="scheduler">Scheduler</a>
      <a className="cursor-pointer hover:text-blue-600" href="courses">Explorer</a>
      <a className="cursor-pointer hover:text-blue-600" href="planner">Planner</a>

    </div>
  </footer>;
}
