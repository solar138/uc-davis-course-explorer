"use client";
import getExams, { getExamCredits } from "@/lib/getExams";
import useDegreeStore from "@/store/useDegreeStore";
import { useGraphStore } from "@/store/useGraphStore";
import { Course, Exam, ExamCredit, School } from "@prisma/client";
import { ReactNode, useEffect, useState } from "react";
import CourseSearch from "./CourseSearch";

export default function DegreePlanner({ school }: { school: School }) {
    const [examType, setExamType] = useState("None");
    const [examSubject, setExamSubject] = useState("None");
    const [examLevel, setExamLevel] = useState("None");
    const [examScore, setExamScore] = useState(0);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examCredits, setExamCredits] = useState<(ExamCredit & { creditCourses: Course[] })[]>([]);
    const setInspectedCourse = useGraphStore((state) => state.setInspectedCourse);

    const userExams = useDegreeStore((state) => state.exams);
    const addExam = useDegreeStore((state) => state.addExam);
    const removeExam = useDegreeStore((state) => state.removeExam);
    const updateExams = useDegreeStore((state) => state.updateExams);
    const hideDiplomaWarning = useDegreeStore((state) => state.hideDiplomaWarning);
    const setHideDiplomaWarning = useDegreeStore((state) => state.setHideDiplomaWarning);
    const tabState = useDegreeStore((state) => state.tabState);
    const setTabState = useDegreeStore((state) => state.setTabState);
    const setAwardedCredit = useDegreeStore((state) => state.setAwardedCredit);
    const courses = useDegreeStore((state) => state.courses);

    useEffect(() => {
        getExams(examType == "None" ? undefined : examType).then(exams => setExams(exams));
    }, [examType, examSubject]);

    useEffect(() => {
        getExamCredits(userExams.some(exam => exam.type == "ib") ? [...userExams, { type: "ib", subject: "diploma", level: "", score: 45 } as StudentExam] : userExams, school.name)
            .then(exams => {
                const filteredExams = exams.filter(exam => {
                    const score = userExams.find(ex => ex.type == exam.examType && ex.subject == exam.examSubject && ex.level == exam.examLevel)?.score ?? 0;
                    return score >= exam.minScore && score <= exam.maxScore;
                });
                setExamCredits(filteredExams);
                setAwardedCredit(filteredExams.flatMap(exam => exam.creditCourses));
            });
    }, [userExams]);

    const validSubjects: Record<string, string> = {};
    const validLevels: Record<string, string> = {};
    exams.forEach(exam => validSubjects[exam.subject] = exam.name);
    exams.forEach(exam => { if ((exam.subject == examSubject || examSubject == "None") && exam.level != "") validLevels[exam.level] = exam.level.toUpperCase() });

    const totalCredits = userExams.reduce((a, b) => a + (examCredits.find(ex => ex.examType == b.type && ex.examLevel == b.level && ex.examSubject == b.subject &&
        (b.score == undefined || b.score >= ex.minScore && b.score <= ex.maxScore))?.creditUnits ?? 0), 0);


    return <div className="grow h-full border-r border-gray-200 bg-white p-4">
        <div className="flex w-full">
            <fieldset className="tabGroup">
                <label className="tab"><input type="radio" name="activeTab" value="exams" defaultChecked={tabState == "exams"} onChange={() => setTabState("exams")} /> Exams </label>
                <label className="tab"><input type="radio" name="activeTab" value="credit" defaultChecked={tabState == "credit"} onChange={() => setTabState("credit")} /> Credit </label>
                <label className="tab"><input type="radio" name="activeTab" value="progress" defaultChecked={tabState == "progress"} onChange={() => setTabState("progress")} /> Progress </label>
                <label className="tab"><input type="radio" name="activeTab" value="plan" defaultChecked={tabState == "plan"} onChange={() => setTabState("plan")} /> My Plan </label>
            </fieldset>
        </div>
        {tabState == "exams" && <div className="m-auto w-[1000]">
            <h1 className="mt-4 text-xl font-bold"> Add Exam </h1>
            <div className="grid grid-cols-3 gap-2">
                <Dropdown
                    title="Exam Type"
                    defaultValue={examType}
                    onChange={setExamType}
                    options={{ "ib": "International Baccalaureate", "ap": "Advanced Placement" }} />
                <Dropdown
                    title="Exam Subject"
                    defaultValue={examSubject}
                    onChange={setExamSubject}
                    disabled={examType == "None"}
                    options={validSubjects} />
                <Dropdown
                    title="Exam Level"
                    defaultValue={examLevel}
                    onChange={setExamLevel}
                    disabled={examSubject == "None"}
                    options={validLevels} />
            </div>
            <NumberField
                min={0}
                max={getExamMaxScore(examSubject, examType)}
                title="Exam Score" defaultValue={examScore}
                disabled={examSubject == "None"}
                onChange={setExamScore} />
            <button onClick={() => {

                const rawExam = exams.find(exam => exam.subject == examSubject && (Object.values(validLevels).length == 0 || exam.level == examLevel));

                if (rawExam != undefined) {
                    const exam = { ...rawExam, score: examScore }
                    addExam(exam);
                } else {
                    alert("Exam not found: " + examSubject + " " + examLevel);
                }
            }}
                disabled={(examLevel == "None") && (Object.values(validLevels).length > 0)} className="button blue ml-1">
                Add Exam
            </button>
            <h1 className="mt-4 text-xl font-bold"> Your Exams </h1>
            <div className="w-full border-1 border-gray-500 rounded p-4">
                {userExams.length == 0 ? <span className="text-gray-500 italic"> No exams. Add some? </span> : renderExamTable(userExams, exam => updateExams(), removeExam, examCredits)}
                {userExams.length > 0 && <div className="mt-4">Total Credits: <span>{totalCredits}</span> </div>}
                {(!hideDiplomaWarning) && userExams.filter(exam => exam.type == "ib").length >= 6 && !userExams.some(exam => exam.type == "ib" && exam.subject == "diploma") && examCredits.some(exam => exam.examSubject == "diploma" && exam.examType == "ib") && <div className="bg-gray-200 p-4 rounded">
                    Did you complete an IB Diploma? {school.shortName} gives credit for completed diplomas. <br />
                    <span className="button red pill mt-2" onClick={() => setHideDiplomaWarning(true)}> Hide</span>
                    <span className="button blue pill ml-2" onClick={() => addExam({ type: "ib", subject: "diploma", level: "", name: "IB Diploma", score: userExams.reduce((a, b) => b.type == "ib" ? a + (b.score ?? 0) : a, 0) } as StudentExam)}>Add IB Diploma</span>
                </div>}
                {userExams.length > 0 && <div>
                    Standing: {getStanding(totalCredits)}
                </div>}
            </div>
        </div>}
        {tabState == "credit" && <div className="m-auto gap-4 flex flex-row" style={{ height: "calc(100% - 20px)" }}>
            <CourseSearch school={school} />
            <div></div>
            <div className="flex flex-col">
                <h1 className="mt-4 text-xl font-bold"> Exam Credits </h1>
                <div>{examCredits.length > 0 ?
                    <div className="w-full border-1 border-gray-500 rounded p-4">{renderCreditsTable(examCredits, userExams, setInspectedCourse, true)}</div> :
                    <span className="text-gray-500 italic"> No exam course credits awarded. </span>}
                </div>
                <h1 className="mt-4 text-xl font-bold"> Other Credits </h1>
                {school.transferURL && <span>To find which community college courses are eligible for credit, go to <a href={school.transferURL}>{school.transferURL}</a></span>}
                <div>{examCredits.length > 0 ?
                    <div className="w-full border-1 border-gray-500 rounded p-4">{renderCoursesTable(courses, setInspectedCourse)}</div> :
                    <span className="text-gray-500 italic"> No exam course credits awarded. </span>}
                </div>
            </div>
        </div>}
        {tabState == "progress" && <div className="m-auto w-[1000]">
            <h1 className="mt-4 text-xl font-bold"> Progress </h1>
        </div>}
    </div>
}

function getExamMaxScore(examSubject: string, examType: string): number {
    return examSubject == "diploma" ? 45 : examType == "ib" ? 7 : examType == "ap" ? 5 : 0;
}

function getStanding(credits: number) {
    if (credits < 45) return "Freshman";
    else if (credits < 90) return "Sophomore";
    else if (credits < 135) return "Junior";
    else return "Senior";
}

function renderCoursesTable(creditCourses: Course[], setInspectedCourse: (course: Course) => void) {
    return <table className="w-full">
        <thead>
            <tr className="text-left">
                <th>Code</th>
                <th>Name</th>
            </tr>
        </thead>
        <tbody>
            {creditCourses.map(course =>
                <tr
                    key={`${course.slug}`}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                        setInspectedCourse({
                            slug: course.slug
                        } as Course);
                    }}>
                    <td>{course.code}</td>
                    <td>{course.name}</td>
                </tr>)}
        </tbody>
    </table>
}

function renderCreditsTable(credits: (ExamCredit & { creditCourses: Course[] })[], exams: StudentExam[], setInspectedCourse: (course: Course) => void, source: boolean) {
    return <table className="w-full">
        <thead>
            <tr className="text-left">
                <th>Code</th>
                <th>Name</th>
                {source && <th>Source</th>}
            </tr>
        </thead>
        <tbody>
            {credits.flatMap(exam => exam.creditCourses.map(course =>
                <tr
                    key={`${course.slug}-${exam.id}`}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                        setInspectedCourse({
                            slug: course.slug
                        } as Course);
                    }}>
                    <td>{course.code}</td>
                    <td>{course.name}</td>
                    {source && <td>
                        {exam.examType.toUpperCase()} {exams.find(ex => ex.type == exam.examType && ex.subject == exam.examSubject && ex.level == exam.examLevel)?.name}
                        </td>}
                </tr>))}
        </tbody>
    </table>
}

function renderExamTable(userExams: StudentExam[], onScoreChange: (exam: StudentExam) => void, removeExam: (exam: Exam) => void, examCredits: ({ id: string; school: string; examType: string; examSubject: string; examLevel: string; creditUnits: number; minScore: number; maxScore: number; duplicateCredit: boolean; } & { creditCourses: Course[]; })[]): ReactNode {
    return <table className="w-full">
        <thead>
            <tr className="text-left">
                <th></th>
                <th>Type</th>
                <th>Subject</th>
                <th>Level</th>
                <th>Score</th>
                <th>Units</th>
                <th>Courses</th>
            </tr>
        </thead>
        <tbody>
            {userExams.map(exam => <tr className="hover:bg-gray-100" key={`${exam.type}-${exam.subject}-${exam.level}`}>
                <td title="Click to remove" className="cursor-pointer text-gray-500 text-sm hover:text-red-700" onClick={() => removeExam(exam)}>X</td>
                <td>{exam.type.toUpperCase()}</td>
                <td>{exam.name}</td>
                <td>{exam.level == "" ? "N/A" : exam.level.toUpperCase()}</td>
                <td><input defaultValue={exam.score ?? "No score"} onChange={e => {
                    exam.score = +e.target.value;
                    onScoreChange(exam);
                }} type="number" min={0} max={getExamMaxScore(exam.subject, exam.type)} /></td>
                <td>{examCredits
                    .find(ex => ex.examType == exam.type && ex.examLevel == exam.level && ex.examSubject == exam.subject &&
                        (exam.score == undefined || exam.score >= ex.minScore && exam.score <= ex.maxScore))?.creditUnits ?? 0}</td>
                <td>{(function () {
                    const credits = examCredits
                        .filter(ex => ex.examType == exam.type && ex.examLevel == exam.level && ex.examSubject == exam.subject &&
                            (exam.score == undefined || exam.score >= ex.minScore && exam.score <= ex.maxScore));
                    return credits.map(credit => <span className="flex flex-row gap-4" key={credit.id}>
                        {credit.creditCourses.map(course => <span key={`${course.slug}-${credit.id}`}>{course.slug}</span>)}
                    </span>);
                })()}
                </td>
            </tr>)}
        </tbody>
    </table>;
}

export function Dropdown({ options, title, defaultValue, disabled, onChange }: { title: string, disabled?: boolean, options: Record<string, string>, defaultValue?: string, onChange?: (value: string) => void }) {
    return <div className="dropdown">
        <div>{title}</div>
        <select value={defaultValue} disabled={disabled} onChange={e => onChange && onChange(e.target.value)}>
            <option className="italic text-gray-500">None</option>
            {Object.keys(options).sort((a, b) => options[a].localeCompare(options[b])).map(option => <option value={option} key={option}>{options[option]}</option>)}
        </select>
    </div>
}

export function NumberField({ min = 0, max = 100, title, defaultValue, disabled, onChange }: { title: string, disabled?: boolean, min: number, max: number, defaultValue?: number, onChange?: (value: number) => void }) {
    if (defaultValue != undefined) {
        if (defaultValue > max) { defaultValue = max; if (onChange) onChange(max); }
        if (defaultValue < min) { defaultValue = min; if (onChange) onChange(min); }
    }
    return <div className="numberfield">
        <label>
            <div>{title}</div>
            <input disabled={disabled || min == max} onChange={e => {
                if (+e.target.value > max) e.target.value = max.toString();
                else if (+e.target.value < min) e.target.value = min.toString();
                if (onChange) onChange(+e.target.value);
            }} type="number" value={defaultValue} min={min} max={max} />
        </label>
    </div>
}

export type StudentExam = Exam & { score?: number }