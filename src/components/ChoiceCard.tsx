import { ChevronRight } from "lucide-react";
import type { Choice } from "../api/types";

export function ChoiceCard({
  choice,
  disabled,
  selected,
  onSelect,
}: {
  choice: Choice;
  disabled?: boolean;
  selected?: boolean;
  onSelect: (choice: Choice) => void;
}) {
  return (
    <button className={selected ? "choice-card choice-selected" : "choice-card"} disabled={disabled} onClick={() => onSelect(choice)} type="button">
      <span className="choice-label">{choice.label}</span>
      <span>{choice.text}</span>
      <ChevronRight size={18} />
    </button>
  );
}
