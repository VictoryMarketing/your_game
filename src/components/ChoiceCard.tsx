import { ChevronRight } from "lucide-react";
import type { Choice } from "../api/types";

export function ChoiceCard({ choice, disabled, onSelect }: { choice: Choice; disabled?: boolean; onSelect: (choice: Choice) => void }) {
  return (
    <button className="choice-card" disabled={disabled} onClick={() => onSelect(choice)} type="button">
      <span className="choice-label">{choice.label}</span>
      <span>{choice.text}</span>
      <ChevronRight size={18} />
    </button>
  );
}
