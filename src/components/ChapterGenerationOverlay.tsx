import { useEffect, useState } from "react";
import { BookOpen, Compass, GitBranch, Search } from "lucide-react";

const stages = [
  { key: "analyzing_choice", text: "Собираем последствия твоего выбора", Icon: Search },
  { key: "writing_scene", text: "Пишем новую сцену", Icon: BookOpen },
  { key: "updating_world", text: "Обновляем улики и предметы", Icon: Compass },
  { key: "preparing_choices", text: "Готовим варианты действий", Icon: GitBranch },
];

export function ChapterGenerationOverlay({ onRetry }: { onRetry?: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, []);

  const active = Math.min(stages.length - 1, Math.floor(elapsed / 3));

  return (
    <div className="generation-overlay" role="status" aria-live="polite">
      <div className="generation-bg" />
      <div className="generation-panel slide-up">
        <span className="eyebrow">Мастерская сюжета</span>
        <h2>{elapsed > 8 ? "История получается сложной, ещё немного..." : "Создаём следующую главу"}</h2>
        <div className="floating-cards" aria-hidden="true">
          <span>выбор</span>
          <span>последствия</span>
          <span>улика</span>
          <span>новая глава</span>
        </div>
        <div className="generation-steps">
          {stages.map(({ key, text, Icon }, index) => (
            <div key={key} className={index === active ? "generation-step stage-active" : "generation-step"}>
              <Icon size={18} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="shimmer-lines">
          <i className="shimmer" />
          <i className="shimmer short" />
          <i className="shimmer" />
        </div>
        {elapsed > 25 && onRetry && (
          <button className="secondary-button" onClick={onRetry} type="button">
            Попробовать ещё раз
          </button>
        )}
      </div>
    </div>
  );
}
