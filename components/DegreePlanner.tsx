"use client";
import getExams, { getExamCredits } from "@/lib/getExams";
import useDegreeStore from "@/store/useDegreeStore";
import { Course, Exam, ExamCredit } from "@prisma/client";
import { useEffect, useState } from "react";

export default function DegreePlanner() {
    const [tabState, setTabState] = useState("exams");
    const [examType, setExamType] = useState("None");
    const [examSubject, setExamSubject] = useState("None");
    const [examLevel, setExamLevel] = useState("None");
    const [examScore, setExamScore] = useState(0);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examCredits, setExamCredits] = useState<(ExamCredit & { creditCourses: Course[] })[]>([]);

    const school = useDegreeStore((state) => state.school);

    const userExams = useDegreeStore((state) => state.exams);
    const addExam = useDegreeStore((state) => state.addExam);
    const removeExam = useDegreeStore((state) => state.removeExam);

    useEffect(() => {
        getExams(examType == "None" ? undefined : examType).then(exams => setExams(exams));
    }, [examType, examSubject]);

    useEffect(() => {
        getExamCredits(userExams, school).then(exams => setExamCredits(exams));
    }, [userExams]);

    const validSubjects: Record<string, string> = {};
    const validLevels: Record<string, string> = {};
    exams.forEach(exam => validSubjects[exam.subject] = exam.name);
    exams.forEach(exam => { if ((exam.subject == examSubject || examSubject == "None") && exam.level != "") validLevels[exam.level] = exam.level.toUpperCase() });

    console.log(examCredits);
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
                max={examSubject == "diploma" ? 45 : examType == "ib" ? 7 : examType == "ap" ? 5 : 0}
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
                {userExams.length == 0 ? <span className="text-gray-500 italic"> No exams. Add some? </span> : <table className="w-full">
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
                        {userExams.map(exam =>
                            <tr className="hover:bg-gray-100" key={`${exam.type}-${exam.subject}-${exam.level}`}>
                                <td title="Click to remove" className="cursor-pointer text-gray-500 text-sm hover:text-red-700" onClick={() => removeExam(exam)}>X</td>
                                <td>{exam.type.toUpperCase()}</td>
                                <td>{exam.name}</td>
                                <td>{exam.level == "" ? "N/A" : exam.level.toUpperCase()}</td>
                                <td>{exam.score ?? "No score"}</td>
                                <td>{examCredits
                                    .find(ex => ex.examType == exam.type && ex.examLevel == exam.level && ex.examSubject == exam.subject &&
                                        (exam.score == undefined || exam.score >= ex.minScore && exam.score <= ex.maxScore))?.creditUnits ?? 0}</td>
                                <td>{(function () {
                                    const credits = examCredits
                                        .filter(ex => ex.examType == exam.type && ex.examLevel == exam.level && ex.examSubject == exam.subject &&
                                            (exam.score == undefined || exam.score >= ex.minScore && exam.score <= ex.maxScore));
                                    return credits.map(credit =>
                                        <span className="flex flex-row gap-4" key={credit.id}>
                                            {credit.creditCourses.map(course => <span key={`${course.slug}-${credit.id}`}>{course.slug}</span>)}
                                        </span>);
                                })()}
                                </td>
                            </tr>)}
                    </tbody>
                </table>}
            </div>
        </div>}
    </div>
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