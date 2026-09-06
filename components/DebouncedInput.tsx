import { RefObject, useRef, useCallback, Dispatch } from "react";

function useDebounce(onChange : (value : string) => void, duration : number)  {
  const timeoutRef : RefObject<NodeJS.Timeout | undefined> = useRef(undefined);
  const onEdit = useCallback(
    (value : any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => onChange(value), duration);
    },
    [duration, onChange]
  );
  return onEdit;
}

export function DebouncedInput({ text, setText, onChange, className } : { text : string | undefined, setText : Dispatch<any>, onChange : ( value : any ) => void, className : string | undefined }) {

  // Custom hook accepts two arguments: original onChange callback, and debounce delay. Its return value is a new, debounced callback
  const debouncedOnChange = useDebounce(onChange, 1000);
  const onEdit = (val : string) => {
    setText(val);
    debouncedOnChange(val);
  };
  return <input value={text} className={className} onChange={(e) => onEdit(e.target.value)}/>;
}