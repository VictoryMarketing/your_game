import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

export function SelectSheet({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="field select-sheet-field">
      <span>{label}</span>
      <button className="select-trigger" onClick={() => setOpen(true)} type="button">
        {value}
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
          <section className="select-sheet slide-up" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>{label}</h2>
            <div className="select-options">
              {options.map((option) => (
                <button className={option === value ? "select-option active" : "select-option"} key={option} onClick={() => pick(option)} type="button">
                  <span>{option}</span>
                  {option === value && <Check size={18} />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
