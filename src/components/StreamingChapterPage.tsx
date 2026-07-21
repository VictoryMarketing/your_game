import { useEffect } from "react";
import { BookOpen, GitBranch, LoaderCircle } from "lucide-react";
import type { GenerationProgress } from "../api/jobApi";
import { SceneCard } from "./SceneCard";

function stableStreamingProse(value: string, complete: boolean) {
  if (complete) return value;
  const text = value || "";
  const ending = /[.!?…](?:[»"')\]]*)?(?=\s|$)/g;
  let lastComplete = 0;
  for (const match of text.matchAll(ending)) {
    lastComplete = (match.index || 0) + match[0].length;
  }
  return lastComplete > 0 ? text.slice(0, lastComplete).trimEnd() : "";
}

export function StreamingChapterPage({
  progress,
  chapterNumber = 1,
}: {
  progress: GenerationProgress;
  chapterNumber?: number;
}) {
  const proseComplete = Boolean(progress.prose_complete);
  useEffect(() => {
    sessionStorage.setItem("yougame_streaming_transition", "1");
  }, []);
  const chapterTitle = progress.chapter_title || "Новая глава";
  const visibleProse = stableStreamingProse(progress.scene_text || "", proseComplete);
  const streamedScene = `Глава ${chapterNumber}: ${chapterTitle}${visibleProse ? `\n\n${visibleProse}` : ""}`;
  return (
    <section className="game-screen streaming-chapter-page" aria-live="polite">
      <header className="progress-header streaming-book-header">
        <div>
          <strong>Глава {chapterNumber}</strong>
          <span>{progress.book_title || "Новая история"}</span>
        </div>
        <BookOpen size={20} aria-hidden="true" />
      </header>
      <div className="story-content">
        <SceneCard text={streamedScene} chapterNumber={chapterNumber} streaming />
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
