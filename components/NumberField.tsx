"use client";

export function NumberField({ min = 0, max = 100, title, defaultValue, disabled, onChange }: { title: string; disabled?: boolean; min: number; max: number; defaultValue?: number; onChange?: (value: number) => void; }) {
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
    </div>;
}
