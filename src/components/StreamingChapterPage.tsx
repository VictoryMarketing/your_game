import { BookOpen, GitBranch, LoaderCircle } from "lucide-react";
import type { GenerationProgress } from "../api/jobApi";
import { SceneCard } from "./SceneCard";

export function StreamingChapterPage({
  progress,
  chapterNumber = 1,
}: {
  progress: GenerationProgress;
  chapterNumber?: number;
}) {
  const proseComplete = Boolean(progress.prose_complete);
  return (
    <section className="game-screen streaming-chapter-page" aria-live="polite">
      <header className="streaming-book-header">
        <span className="eyebrow"><BookOpen size={15} /> Глава {chapterNumber}</span>
        <h1>{progress.chapter_title || "Новая глава"}</h1>
      </header>
      <div className="story-content">
        <SceneCard text={progress.scene_text || ""} chapterNumber={chapterNumber} streaming />
      </div>
      <aside className="streaming-book-status">
        {proseComplete ? <GitBranch size={19} /> : <LoaderCircle className="streaming-spin" size={19} />}
        <span>
          <strong>{proseComplete ? "Глава готова" : "Продолжаем писать главу"}</strong>
          <small>{proseComplete ? "Варианты действий уже готовятся — можно читать." : "Текст появляется сразу по мере написания."}</small>
        </span>
      </aside>
    </section>
  );
}
