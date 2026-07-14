import { Check, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import { ModalPortal } from "./ModalPortal";

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
  const close = useCallback(() => setOpen(false), []);

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
        <ModalPortal onClose={close}>
          <section className="select-sheet modal-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
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
        </ModalPortal>
      )}
    </div>
  );
}
