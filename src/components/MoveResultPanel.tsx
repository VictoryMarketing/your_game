import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MoveResultProgress } from "../api/jobApi";

const traitLabels: Record<string, string> = {
  bravery: "Храбрость",
  cunning: "Хитрость",
  empathy: "Эмпатия",
  logic: "Логика",
};

const worldLabels: Record<string, string> = {
  reputation: "Репутация",
  resources: "Ресурсы",
  threat: "Угроза",
};

function DeltaMark({ delta }: { delta: number }) {
  if (delta > 0) return <span className="delta up"><ArrowUp size={13} /> +{delta}</span>;
  if (delta < 0) return <span className="delta down"><ArrowDown size={13} /> {delta}</span>;
  return null;
}

function outcomeText(comment?: string) {
  switch ((comment || "").toLowerCase()) {
    case "критический успех":
      return "Итог хода: сильный успех. Решение дало заметное преимущество.";
    case "успех":
      return "Итог хода: успех. Решение сработало и улучшило позицию героя.";
    case "осложнение без потери прогресса":
      return "Итог хода: продвижение с осложнением. Сцена продолжится, но у решения будет цена.";
    case "частичный провал":
      return "Итог хода: частичный провал. План сработал не полностью, появились осложнения.";
    case "тяжёлый провал":
      return "Итог хода: тяжёлый провал. Решение ухудшило ситуацию и усилило риск.";
    default:
      return "Итог хода повлиял на очки, навыки и следующую сцену.";
  }
}

export function MoveResultPanel({ result, live = false }: { result: MoveResultProgress; live?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const traitDelta = result.traits_delta || {};
  const worldDelta = result.world_delta || {};
  const changedTraits = Object.entries(traitDelta).filter(([, value]) => value);
  const changedWorld = Object.entries(worldDelta).filter(([, value]) => value);
  const shortChanges = [
    ...changedTraits.map(([key, value]) => `${traitLabels[key] || key} ${value > 0 ? "+" : ""}${value}`),
    ...changedWorld.map(([key, value]) => `${worldLabels[key] || key} ${value > 0 ? "+" : ""}${value}`),
  ].slice(0, 3);
  const roll = result.roll;

  return (
    <section className={live ? "rune-stats-panel move-result-live" : "rune-stats-panel"}>
      {live && <span className="move-result-eyebrow">Результат предыдущего хода</span>}
      <button className="rune-summary" onClick={() => setExpanded((value) => !value)} type="button">
        <span>{roll?.comment ? outcomeText(roll.comment).replace("Итог хода: ", "").split(".")[0] : "След прошлого хода"}</span>
        <strong className="score-total">{result.score_total} очков <DeltaMark delta={result.score_delta || 0} /></strong>
        {shortChanges.length > 0 && <small>{shortChanges.join(" · ")}</small>}
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {expanded && (
        <div className="rune-details">
          <div className="rune-stats-head">
            <span>Почему это произошло</span>
            <strong className="score-total">{result.score_total} очков <DeltaMark delta={result.score_delta || 0} /></strong>
          </div>
          <div className="rune-stat-grid">
            {Object.entries(traitLabels).map(([key, label]) => (
              <div className="rune-stat" key={key}>
                <span>{label}</span>
                <strong className="stat-value">{result.traits?.[key] ?? 0}<DeltaMark delta={traitDelta[key] || 0} /></strong>
              </div>
            ))}
            {Object.entries(worldLabels).map(([key, label]) => (
              <div className="rune-stat" key={key}>
                <span>{label}</span>
                <strong className="stat-value">{result.world?.[key] ?? 0}<DeltaMark delta={worldDelta[key] || 0} /></strong>
              </div>
            ))}
          </div>
          {roll?.comment && (
            <p className="rune-roll">
              {outcomeText(roll.comment)}
              {roll.used_items?.length ? ` ${roll.used_items.join(", ")}.` : ""}
              {roll.used_clues?.length ? ` Помогла улика: ${roll.used_clues.join(", ")}.` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
