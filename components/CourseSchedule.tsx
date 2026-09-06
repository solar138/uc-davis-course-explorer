"use client";

import { CourseLibrary, Meeting } from "@/lib/course";
import { useGraphStore } from "@/store/useGraphStore";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useEffect, useState } from "react";
import styles from "./CourseSchedule.module.css";
import CourseScheduleBlock, { weekdays } from "./CourseScheduleBlock";
import { getCoursesSections, getSections } from "@/lib/getCourseSections";
import { Section } from "@prisma/client";

const sectionsCache : Record<number, Section> = {} // crn to section data
const availableSectionsCache : Record<string, Section[]> = {} // coursecode to section data

export function CourseSchedule() {
  const selectedTerm = useScheduleStore((state) => state.selectedTerm);
  const courses = useScheduleStore((state) => state.schedules)[selectedTerm] ?? {};
  const setSchedule = useScheduleStore((state) => state.setSchedule);
  const hoverCrn = useScheduleStore((state) => state.hoverCrn);
  const setHoverCrn = useScheduleStore((state) => state.setHoverCrn);
  const unscheduledCourses = Object.keys(courses).filter(courseCode => !courses[courseCode]);
  const removeCourse = useScheduleStore((state) => state.removeCourseFromSchedule);
  const setActiveScheduling = useScheduleStore((state) => state.setActiveScheduling);
  const activeScheduling = useScheduleStore((state) => state.activeScheduling);
  const [sections, setSections] = useState<{ [courseCode: string]: Section }>({});
  const [availableSections, setAvailableSections] = useState<{ [courseCode: string]: Section[] }>({});
  const setInspectedCourse = useGraphStore((state) => state.setInspectedCourse);
  const [autoSchedulerOpen, setAutoSchedulerOpen] = useState(false);
  const [schedulerResults, setSchedulerResults] = useState({ numSchedules: -1, timeTaken: -1, schedules: [] as Record<string, number>[], problems: [] as SchedulerProblem[]});
  const [filters, setFilters] = useState({aro: false} as SchedulerFilters);

  const availableCrns = {} as Record<number, Section>;
  for (const course in availableSections) {
    for (const section of availableSections[course]) {
      availableCrns[+section.crn] = section;
    }
  }

  useEffect(() => {
    if (Object.keys(courses).length > 0) {

        const missing = [];
        const newSections : Record<string, Section> = {};
        for (const courseCode in courses) {
            const crn = courses[courseCode];
            if (crn == 0) continue;
            if (sectionsCache[+crn] != undefined) {
                console.log("Found " + crn + " in local cache");
                newSections[courseCode] = sectionsCache[+crn];
            } else {
                missing.push(crn);
            }
        }
        if (missing.length > 0) {
            getSections(missing.map(x => +x), selectedTerm).then((sections) => {
                if (sections != undefined) {
                    Object.keys(courses).forEach(courseCode => { 
                        newSections[courseCode] = sections[courses[courseCode]]; 
                        sectionsCache[+courseCode] = sections[courses[courseCode]]; 
                    });
                } else {
                    console.log("Could not get sections from db.");
                }
            console.log("Sections loaded from db", newSections);
                setSections(newSections);
            });
        } else {
            console.log("All loaded from local cache", newSections);
            setSections(newSections);
        }
        const missingSections = [];
        const newAvailableSections : Record<string, Section[]> = {};
        for (const courseCode in courses) {
            if (availableSectionsCache[courseCode] != undefined) {
                newAvailableSections[courseCode] = availableSectionsCache[courseCode];
            } else {
                missingSections.push(courseCode);
            }
        }
        if (missingSections.length > 0) {
            getCoursesSections(Object.keys(courses), selectedTerm).then((sections) => {
                for (const section in sections) {
                    availableSectionsCache[section] = sections[section];
                    for (const sectionData of sections[section]) {
                        sectionsCache[+sectionData.crn] = sectionData;
                    }
                }
                setAvailableSections(sections ?? {});
            });
        } else {
            setAvailableSections(newAvailableSections);
        }
    }
  }, [courses]);


  function getCourseBlock(course : string, section : Section, meeting : Meeting, opacity : number = 1) {
    return <CourseScheduleBlock 
            key={course + meeting.type + meeting.startTime + meeting.room + " " + opacity} 
            course={(course) + " " + section.sectionNum} 
            activity={meeting.type} 
            start={+meeting.startTime} 
            end={+meeting.endTime}
            location={meeting.building}
            days={meeting}
            color={hashCode(course)}
            opacity={opacity}
            onClick={() => {if (activeScheduling != undefined) setActiveScheduling(course); setInspectedCourse({slug: course})}}/>
  }
  
  const hoverSection = availableCrns[hoverCrn] ?? sectionsCache[hoverCrn];

  const courseBlocks = sections == undefined ? [] : Object.keys(courses)
  .flatMap(course => (
    sections[course]?.meetings as Meeting[])
        ?.map(meeting => 
            getCourseBlock(course, sections[course], meeting, hoverSection && hoverSection.courseCode == course ? 0.4 : 1)
  ) ?? []);

  if (activeScheduling && hoverCrn > 0 && hoverSection != null) {
    console.log("hovering for " + hoverCrn);
    courseBlocks.push(
        ...(hoverSection.meetings as Meeting[]).map(meeting => 
            getCourseBlock(hoverSection.courseCode, hoverSection, meeting, 0.8)
        )
    );
  }

  return <div className="flex flex-col w-full h-full">
    <div className="h-full overflow-auto relative">
        <div className={styles.calendarHeader}>
            <div className={styles.calendarHeaderDay}>Time</div>
            <div className={styles.calendarHeaderDay}>Monday</div>
            <div className={styles.calendarHeaderDay}>Tuesday</div>
            <div className={styles.calendarHeaderDay}>Wednesday</div>
            <div className={styles.calendarHeaderDay}>Thursday</div>
            <div className={styles.calendarHeaderDay}>Friday</div>
        </div>
        <div className={styles.calendarBody}>   
            <div className={styles.timeColumn}>
                {
                    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => 
                        <div key={hour} className={styles.timeLabel}>
                            {hour % 12 + 1}:00{hour < 11 ? "a" : "p"}
                        </div>
                    )
                }
            </div>
            <div className={styles.sectionGrid}>
                {courseBlocks}
            </div>
        </div>
        {/* <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                    <th className="w-[60px]">Time</th>
                    <th>Monday</th>
                    <th>Tuesday</th>
                    <th>Wednesday</th>
                    <th>Thursday</th>
                    <th>Friday</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table> */}
    </div>
    <div>
        <h1 className="text-xl font-bold">{unscheduledCourses.length > 0 ? "Unscheduled Courses" : ""}</h1>
        <ul className="flex flex-row gap-2">
            {unscheduledCourses.map((courseCode) => (
                <li key={String(courseCode)}>
                    <div className="flex flex-col relative items-center gap-2 bg-gray-200 px-2 py-1 pr-5 rounded">
                        <button onClick={() => setActiveScheduling(courseCode)} title="Schedule" className="cursor-pointer hover:text-blue-600">
                            {courseCode}
                        </button>
                        <button onClick={() => removeCourse(courseCode)} title="Remove" className="right-[8px] absolute ml-2 rounded hover:text-red-800 transition-colors">
                            x
                        </button>
                    </div>
                </li>
            ))}
            {!autoSchedulerOpen && <li className="ml-auto">
                <button className={"flex flex-col relative items-center gap-2 bg-gray-200 px-2 py-1 float-right rounded cursor-pointer w-40 hover:text-blue-600 " + (autoSchedulerOpen ? "text-blue-600" : "")} onClick={() => setAutoSchedulerOpen(!autoSchedulerOpen)} >
                    {autoSchedulerOpen ? "Close" : "Auto Scheduler"}
                </button>
            </li>}
        </ul>
    </div>
    {autoSchedulerOpen && <div className="mt-4">
        <h1 className="text-xl font-bold">Course Scheduler</h1><div className="ml-auto">
            <button className={"flex flex-col relative items-center gap-2 bg-gray-200 px-2 py-1 float-right rounded cursor-pointer w-40 hover:text-blue-600 " + (autoSchedulerOpen ? "text-blue-600" : "")} onClick={() => setAutoSchedulerOpen(!autoSchedulerOpen)} >
                {autoSchedulerOpen ? "Close" : "Auto Scheduler"}
            </button>
        </div>
        <div className="flex flex-row gap-2">
            <button onClick={() => { 
                const result = scheduleAll(courses, availableSections, filters);
                setSchedulerResults(result );
                setSchedule({ ...courses}); }
            } className="rounded bg-gray-200 px-2 py-1 cursor-pointer hover:text-blue-600">
                Schedule All
            </button>
            <button onClick={() => { Object.keys(courses).forEach((key) => courses[key] = 0); setSchedule({ ...courses}); }} className="rounded bg-gray-200 px-2 py-1 cursor-pointer hover:text-blue-600">
                Unschedule All
            </button>
        </div>
        <div className="flex flex-row gap-4 items-end ml-4">
            <span className="text-lg font-bold">Stats:</span>
            <span title="How many combinations of sections can be taken with these classes.">
                Estimated combinations: {availableSections == undefined ? "0" : Object.values(availableSections).reduce((cur, acc) => cur * acc.length, 1)}
            </span>
            <span title="How many valid, non-overlapping schedules there are.">
                Valid schedules: {schedulerResults.numSchedules < 0 ? "N/A" : schedulerResults.numSchedules}
            </span>
            <span title="How much time the last computation took.">
                Time Taken: {schedulerResults.timeTaken < 0 ? "N/A" : `${schedulerResults.timeTaken.toFixed(2)}ms`}
            </span>
        </div>
        <div className=" ml-4">
            <span className="text-lg font-bold mr-4">Filters:</span>
            <label><input type="checkbox" checked={filters.aro} onChange={event => setFilters({...filters, aro: event.target.checked})}/> Lecture Retake Courses (AR0/BR0)</label>
        </div>
        {schedulerResults.problems.length > 0 && <div className=" ml-4">
            <span className="text-lg font-bold">Could not schedule all:</span>
            {renderScheduleProblems(schedulerResults.problems)}
        </div>}
    </div>}
  </div>
}

type SchedulerProblem = {type: string, courseA?: string, courseB?: string, sectionA?: number, sectionB?: number, course?: string, msg: string};
type SchedulerFilters = {aro: boolean}

function renderScheduleProblems(problems : SchedulerProblem[]) {
    return <div>
        {problems.map((problem, index) => 
            <div className="ml-4" key={index}>
                {
                    problem.msg
                }
            </div>
        )}
    </div>
}

function schedulePrecheck(
    courses : Record<string, number>,
    sections : Record<string, Section[]>,
    bitmasks : Record<number, bigint>) : SchedulerProblem[] {
    const problems = [] as SchedulerProblem[];
    const done : Record<string, boolean> = {};
    console.log(courses);

    function sectionToString(course : string) {
        const section = sections[course].find(section => +section.crn == courses[course]);
        return section ? `${course} ${section.sectionNum}` : course;
    }
    for (const courseA in courses) {
        for (const courseB in courses) {
            if (courseA == courseB) continue;
            const sortedCourses = [courseA, courseB].sort();
            if (done[sortedCourses.join()]) continue;
            done[sortedCourses.join()] = true;
            if (sections[courseA] == undefined || sections[courseA].length == 0)
            {
                if (!done[courseA])
                    problems.push({type: "empty-sections", course: courseA, msg: "No sections found for course " + courseA});
                done[courseA] = true;
                continue;
            }
            if (sections[courseB] == undefined || sections[courseB].length == 0)
            {
                if (!done[courseB])
                    problems.push({type: "empty-sections", course: courseB, msg: "No sections found for course " + courseB});
                done[courseB] = true;
                continue;
            }
            done[courseA] = true;
            done[courseB] = true;

            sectionLoop: 
            {
                if (courses[courseA] == 0 && courses[courseB] == 0) {
                    for (const sectionA of sections[courseA]) {
                        for (const sectionB of sections[courseB]) {
                            if ((bitmasks[+sectionA.crn] & bitmasks[+sectionB.crn]) == BigInt(0)) {
                                break sectionLoop;
                            }
                        }                    
                    }
                    problems.push({type: "conflicting-sections", courseA, courseB, 
                        msg: `All sections of ${courseA} conflict with all sections of ${courseB}`});
                } else if (courses[courseA] > 0 && courses[courseB] > 0) {
                    if ((bitmasks[courses[courseA]] & bitmasks[courses[courseB]]) == BigInt(0)) {
                        break sectionLoop;
                    }
                    problems.push({type: "conflicting-sections", courseA, courseB, sectionA: courses[courseA], sectionB: courses[courseB], 
                        msg: `${sectionToString(courseA)} overlaps with section ${sectionToString(courseB)}`});
                } else if (courses[courseA] > 0) {
                    for (const sectionB of sections[courseB]) {
                        if ((bitmasks[courses[courseA]] & bitmasks[+sectionB.crn]) == BigInt(0)) {
                            break sectionLoop;
                        }
                    }   
                    problems.push({type: "conflicting-sections", courseA, courseB, sectionA: courses[courseA], 
                        msg: `${sectionToString(courseA)} overlaps with all sections of course ${courseB}`}); 
                } else if (courses[courseB] > 0) {
                    for (const sectionA of sections[courseA]) {
                        if ((bitmasks[+sectionA.crn] & bitmasks[courses[courseB]]) == BigInt(0)) {
                            break sectionLoop;
                        }
                    }    
                    problems.push({type: "conflicting-sections", courseA, courseB, sectionB: courses[courseB], 
                        msg: `${sectionToString(courseB)} overlaps with all sections of course ${courseA}`});  
                }
            }
        }
    }
    return problems;
}

function scheduleAll(courses : Record<string, number>, sections : Record<string, Section[]>, filters : SchedulerFilters){
    console.log("Scheduling " + Object.values(courses).length + " courses...", courses, sections);
    const startTime = performance.now();
    const bitmasks : Record<number, bigint> = {};
    var currentBitmask = BigInt(0);
    for (const course of Object.keys(sections)) {
        if (course == undefined) {
            console.warn("Potentially incomplete sections data.", sections);
            return {numSchedules: 0, schedules: [], timeTaken: performance.now() - startTime, problems: [] as SchedulerProblem[] };
        }
        for (const section of sections[course]) {
            bitmasks[+section.crn] = sectionToBitmask(section);
        }
        if (courses[course] != 0) {
            currentBitmask |= bitmasks[+courses[course]];
        }
    }
    const problems = schedulePrecheck(courses, sections, bitmasks);
    const bestSchedule : Record<string, number> = { score: 0 };
    const validSchedules : Record<string, number>[] = [];
    schedule(courses, bestSchedule, sections, bitmasks, currentBitmask, validSchedules, filters);
    console.log(validSchedules);
    delete bestSchedule.score;
    Object.keys(bestSchedule).forEach(course => courses[course] = bestSchedule[course]);

    if (validSchedules.length == 0 && problems.length == 0) {
        problems.push({type:"no-schedules", course: "", msg: "No valid combination of sections found."})
    }
    return { numSchedules: validSchedules.length, schedules: validSchedules, timeTaken: performance.now() - startTime, problems };
}

function evalSchedule(schedule : Record<string, number>, sections : Record<string, Section[]>) : number {
    // maximizing total schedule CRN
    return Object.values(schedule).reduce((acc, cur) => acc + cur);
}

function schedule(
    currentSchedule : Record<string, number>,
    bestSchedule : Record<string, number>,
    sections : Record<string, Section[]>,
    bitmasks : Record<number, bigint>,
    currentBitmask : bigint,
    validSchedules : Record<string, number>[],
    filters : SchedulerFilters
) {
    const nextCourse = (Object.entries(currentSchedule).find(x => x[1] == 0) ?? [])[0];
    if (nextCourse == undefined) {
        // valid schedule complete, check if it's better than current best.
        const score = evalSchedule(currentSchedule, sections);
        // console.log("Completed schedule with score " + score);
        validSchedules.push({...currentSchedule});
        if (score > bestSchedule.score) {
            bestSchedule.score = score;
            Object.keys(currentSchedule).forEach(course => bestSchedule[course] = currentSchedule[course]);
        }
    } else {
        // at least one unscheduled course
        // console.log(course + " not currently scheduled.");
        if (sections[nextCourse] == undefined) {
            // no sections for course.
            return;
        }
        for (const section of sections[nextCourse]) {
            if (!filters.aro) {
                if (section.sectionNum.match(/[A-E]R(0|O)/)) {
                    console.log("ARO section skipped");
                    continue;
                }
            }
            const newSectionBitmask = bitmasks[+section.crn];
            // console.log("Section " + section.crn + " bitmask: \n" + bitmaskToString(newSectionBitmask), "\nCurrent bitmask: \n" + bitmaskToString(currentBitmask));
            if ((newSectionBitmask & currentBitmask) != BigInt(0)) {
                // skip overlapping sections
                // console.log("Section " + section.crn + " overlaps with current schedule.");
                continue;
            }
            // set course for now and start looking deeper.
            currentSchedule[nextCourse] = +section.crn;
            schedule(currentSchedule, bestSchedule, sections, bitmasks, currentBitmask | newSectionBitmask, validSchedules, filters);
            currentSchedule[nextCourse] = 0;
        }
    }
}

function bitmaskToString(bitmask : bigint) {
    return bitmask.toString(2).padStart(24 * weekdays.length, "0").match(/.{24}/g)?.map((x, i) => `${weekdays[i][0]}: ${x}`).join("\n");
}

function sectionToBitmask(section : Section) {
    var bitmask = BigInt(0);
    for (var meeting of (section.meetings as Meeting[])) {
        bitmask |= meetingTimeToBitmask(meeting);
    }
    return bitmask;
}

function meetingTimeToBitmask(meeting : Meeting) {
    var bitmask = BigInt(0); // bitmask by hours
    for (const weekday of weekdays) {
        bitmask = bitmask << BigInt(24);
        if (meeting[weekday])
            bitmask |= BigInt(meetingDayToBitmask(Math.round(+meeting.startTime / 100), Math.round(+meeting.endTime / 100)));
    }
    return bitmask;
}

function meetingDayToBitmask(startHour : number, endHour : number) {
    return bitspan(endHour - startHour, startHour);
}

function bitspan(x : number, offset : number) : number {
    return ((1 << x) - 1) << offset;
}

function hashCode(x : string) : number {
    var hash = 0;
    for (var i = 0; i < x.length; i++) {
        hash = x.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}