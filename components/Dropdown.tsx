"use client";

export function Dropdown({ options, title, defaultValue, disabled, onChange }: { title: string; disabled?: boolean; options: Record<string, string>; defaultValue?: string; onChange?: (value: string) => void; }) {
    return <div className="dropdown">
        <div>{title}</div>
        <select value={defaultValue} disabled={disabled} onChange={e => onChange && onChange(e.target.value)}>
            <option className="italic text-gray-500">None</option>
            {Object.keys(options).sort((a, b) => options[a].localeCompare(options[b])).map(option => <option value={option} key={option}>{options[option]}</option>)}
        </select>
    </div>;
}
