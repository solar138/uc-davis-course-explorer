"use client";

import useScheduleStore from "@/store/useScheduleStore";
import { Dropdown } from "./Dropdown";
import getTermName, { availableTerms, currentTerm } from "@/lib/termInfo";

export default function TermSelector() {
    const options : Record<string, string> = {};
    const selectedTerm = useScheduleStore((store) => store.selectedTerm);
    const setSelectedTerm = useScheduleStore((store) => store.setSelectedTerm);

    for (const term of availableTerms) {
        options[term] = getTermName(term);
    }

    return <div className="">
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            {Object.keys(options).sort((a, b) => options[a].localeCompare(options[b])).map(option => <option value={option} key={option}>{options[option]}</option>)}
        </select>
    </div>;
}