import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Brush, Compass, GitBranch, Image, Mic, Radio, Search, Sparkles, Volume2 } from "lucide-react";
import { MagicLoader } from "./MagicLoader";
import type { GenerationProgress } from "../api/jobApi";
import { MoveResultPanel } from "./MoveResultPanel";

const flows = {
  chapter: {
    eyebrow: "Мастерская сюжета",
    title: "Создаём следующую главу",
    slowTitle: "История получается сложной, ещё немного...",
    cards: ["выбор", "последствия", "улика", "новая глава"],
    stages: [
  { key: "analyzing_choice", text: "Собираем последствия твоего выбора", Icon: Search },
  { key: "writing_scene", text: "Пишем новую сцену", Icon: BookOpen },
  { key: "updating_world", text: "Обновляем улики и предметы", Icon: Compass },
  { key: "preparing_choices", text: "Готовим варианты действий", Icon: GitBranch },
    ],
  },
  image: {
    eyebrow: "Иллюстрация",
    title: "Рисуем сцену",
    slowTitle: "Добавляем детали и свет...",
    cards: ["композиция", "свет", "герой", "атмосфера"],
    stages: [
      { key: "frame", text: "Собираем детали главы", Icon: Image },
      { key: "brush", text: "Рисуем сцену", Icon: Brush },
      { key: "light", text: "Добавляем свет и атмосферу", Icon: Sparkles },
      { key: "ready", text: "Готовим иллюстрацию", Icon: Compass },
    ],
  },
  voice: {
    eyebrow: "Голос рассказчика",
    title: "Готовим озвучку",
    slowTitle: "Собираем аудио, ещё немного...",
    cards: ["тембр", "паузы", "интонация", "voice"],
    stages: [
      { key: "voice", text: "Готовим голос рассказчика", Icon: Mic },
      { key: "tone", text: "Размечаем интонации", Icon: Radio },
      { key: "speech", text: "Озвучиваем главу", Icon: Volume2 },
      { key: "audio", text: "Собираем аудио", Icon: Sparkles },
    ],
  },
};

export function ChapterGenerationOverlay({
  variant = "chapter",
  progress,
}: {
  variant?: "chapter" | "image" | "voice";
  progress?: GenerationProgress | null;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  const flow = flows[variant];
  const startingBook = variant === "chapter" && progress?.generation_kind === "start";
  const liveStage = progress?.stage || "";
  const timedStage = Math.min(flow.stages.length - 1, Math.floor(elapsed / 7));
  const stageFromServer = liveStage === "writing_scene"
    ? startingBook ? 2 : 1
    : liveStage === "updating_world"
      ? 2
      : liveStage === "preparing_choices"
        ? 3
        : liveStage === "planning"
          ? startingBook ? Math.min(1, Math.floor(elapsed / 6)) : 0
          : liveStage === "evaluating" || liveStage === "analyzing_choice"
            ? Math.min(1, timedStage)
          : -1;
  const active = stageFromServer >= 0
    ? Math.min(flow.stages.length - 1, Math.max(stageFromServer, timedStage))
    : timedStage;

  return createPortal(
    <div className={`generation-overlay generation-${variant}`} role="status" aria-live="polite">
      <div className="generation-bg" />
      <div className="generation-panel slide-up">
        <span className="eyebrow">{flow.eyebrow}</span>
        <h2>{elapsed >= 30 ? flow.slowTitle : flow.title}</h2>
        <div className="floating-cards" aria-hidden="true">
          {flow.cards.map((card) => <span key={card}>{card}</span>)}
        </div>
        {variant === "chapter" && progress?.move_result && <MoveResultPanel result={progress.move_result} live />}
        <div className="generation-steps">
          {flow.stages.map(({ key, text, Icon }, index) => (
            <div key={key} className={index === active ? "generation-step stage-active" : index < active ? "generation-step stage-complete" : "generation-step"}>
              <Icon size={18} />
              <span>{startingBook ? ["Выбираем основу истории", "Продумываем героев и мир", "Пишем первую главу", "Готовим первые варианты действий"][index] : text}</span>
            </div>
          ))}
        </div>
        <div className="generation-progress" aria-hidden="true">
          <i style={{ width: `${((active + 1) / flow.stages.length) * 100}%` }} />
        </div>
        {progress?.prose_complete ? (
          <p className="generation-reading-note">Глава готова — варианты действий появятся, пока ты читаешь.</p>
        ) : <MagicLoader compact />}
      </div>
    </div>,
    document.body,
  );
}
