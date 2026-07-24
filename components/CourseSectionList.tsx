"use client";

import { Meeting, meetingTypeToDescription } from "@/lib/course";
import { useScheduleStore } from "@/store/useScheduleStore";
import { CourseInspector } from "./CourseInspector";
import { Instructor, School, Section } from "@prisma/client";
import { useEffect, useState } from "react";
import { getCourseSectionsWithInstructors } from "@/lib/getCourseSections";
import { formatTime } from "./CourseScheduleBlock";

type SectionWithInstructor = Section & { instructors: Instructor[] };

const sectionsCache : Record<string, SectionWithInstructor[]> = {};

export default function CourseSectionList({ addTarget, schoolInfo } : { addTarget : "graph" | "schedule", schoolInfo : School }) {
    
    const [sections, setSections] = useState<SectionWithInstructor[]>([]);
    const [sectionsCourse, setSectionsCourse] = useState<string>("");

    const setHoverCrn = useScheduleStore((state) => state.setHoverCrn);
    const hoverCrn = useScheduleStore((state) => state.hoverCrn);

    const activeScheduling = useScheduleStore((state) => state.activeScheduling) ?? "";
    const schedule = useScheduleStore((state) => state.schedule);
    const setActiveScheduling = useScheduleStore((state) => state.setActiveScheduling);
    const rescheduleCourse = useScheduleStore((state) => state.rescheduleCourse);

    useEffect(() => {
        if (sectionsCourse != activeScheduling) {
            if (sectionsCache[activeScheduling] != undefined) {
                setSectionsCourse(activeScheduling);
                setSections(sectionsCache[activeScheduling]);
                return;
            }
            getCourseSectionsWithInstructors(activeScheduling).then((sections) => {
                if (sections) {
                    setSectionsCourse(activeScheduling);
                    setSections(sections);
                    sectionsCache[activeScheduling] = sections;
                }
            });
        }
    }, [activeScheduling, sections, sectionsCourse]);

    if (!activeScheduling) {
        return <CourseInspector addTarget={addTarget} showUnlocks={false}/>;
    }
    
    return <div className="w-1/4 min-w-[500px] border-r border-gray-200 bg-white p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Sections for {activeScheduling} <button className="float-right cursor-pointer hover:text-red-600 transition-colors" title="Close" onClick={() => setActiveScheduling(null)}>X</button></h2>
            
            {sections.length > 0 && <table className="w-full table-fixed">
                <tbody>
                    <tr>
                        <th className="text-left">Desc</th>
                        <th className="text-left">Place</th>
                        <th className="text-left w-[75px]">Days</th>
                        <th className="text-left w-[125px]">Time</th>
                    </tr>
                </tbody>
            </table>}
            {
                sectionsCourse != activeScheduling ? <div className="text-gray-500 italic text-sm text-center pt-4">Loading...</div> :
            <div>
                {sections.length == 0 ? 
                    <div className="text-gray-500 italic text-sm text-center pt-4">No sections found</div> :
                <div>
                    {!!schedule[activeScheduling] && <div className="border-y border-gray-200 py-2 px-3 hover:bg-gray-100 transition-colors rounded">
                        <h3 className="text-center underline cursor-pointer hover:text-blue-600 transition-colors" title="Click to unschedule" onClick={() => {
                        rescheduleCourse(activeScheduling, 0);
                        setActiveScheduling(null);}}>Unschedule</h3></div>}
                    {sections.sort((a, b) => +b.crn == schedule[activeScheduling] ? 1 : -1).map((section) => (
                        <div key={section.crn} style={{ 
                                backgroundColor: +section.crn == schedule[activeScheduling] ? "#f3f6ff" : "white",
                                color: +section.crn == schedule[activeScheduling] ? "#3155a3" : "black" }} className="border-y border-gray-200 py-2 px-3 hover:bg-gray-100 transition-colors rounded"
                            onMouseEnter={() => setHoverCrn(+section.crn)}
                            onMouseLeave={() => hoverCrn == +section.crn && setHoverCrn(0)}
                            >
                            <h3 className="cursor-pointer hover:text-blue-600 transition-colors" title="Click to schedule" onClick={() => {
                            rescheduleCourse(activeScheduling, +section.crn);
                            setHoverCrn(0);
                            setActiveScheduling(null);
                        }}><span className="font-bold">{activeScheduling} {section.sectionNum}</span> - <span>CRN {section.crn}</span></h3>
                            <table className="w-full table-fixed">
                                <tbody>
                                    {section.meetings == null || !Array.isArray(section.meetings) || section.meetings.length == 0 ? "No meetings found" : 
                                    (section.meetings as Meeting[]).map((meeting : Meeting) => {
                                        return <tr key={meeting.room + meeting.type}>
                                            <td>{meetingTypeToDescription[meeting.type]}</td>
                                            <td title={meeting.building + " " + meeting.room}><a 
                                                className = "cursor-pointer hover:text-blue-600 transition-colors"
                                                onClick={() => false} href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(meeting.building + " " + meeting.room + " " + schoolInfo.shortName)} target="_blank" rel="noopener noreferrer">
                                                {meeting.buildingCode}
                                            </a></td>
                                            <td className="w-[75px]">{getDateString(meeting)}</td>
                                            <td className="w-[125px]">{getTimeString(meeting)}</td>
                                        </tr>;
                                    })}
                                    <tr>
                                        <td>Instructor</td>
                                        <td colSpan={3}>{section.instructors.length == 0 ? "TBD" : section.instructors.map((instructor) => instructor.fullName).join(", ")}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>))
                }</div>}
            </div>
}
        </div>;
}

function getDateString(meeting: { monday : boolean, tuesday : boolean, wednesday : boolean, thursday : boolean, friday : boolean, saturday : boolean, sunday : boolean }) {
    var days = "";
    if (meeting.monday) days += "M";
    if (meeting.tuesday) days += "T";
    if (meeting.wednesday) days += "W";
    if (meeting.thursday) days += "R";
    if (meeting.friday) days += "F";
    return days;
}

function getTimeString(meeting: { startTime : string, endTime : string }) {
    if (meeting.startTime == "" || meeting.endTime == "") return "TBD";
    const start = parseInt(meeting.startTime);
    const end = parseInt(meeting.endTime);
    return `${formatTime(start).padStart(6, "0")} - ${formatTime(end).padStart(6, "0")}`;
}