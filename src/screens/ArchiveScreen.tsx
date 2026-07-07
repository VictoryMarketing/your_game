import { BookOpen, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getArchivedGameChapters, getGameHistory } from "../api/gameApi";
import type { Chapter, GameSession } from "../api/types";
import type { Screen } from "../store/appStore";

export function ArchiveScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [items, setItems] = useState<GameSession[]>([]);
  const [reader, setReader] = useState<{ game: GameSession; chapters: Chapter[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [readerLoading, setReaderLoading] = useState(false);

  useEffect(() => {
    getGameHistory()
      .then((result) => setItems(result.history))
      .finally(() => setLoading(false));
  }, []);

  async function openReader(game: GameSession) {
    setReaderLoading(true);
    try {
      setReader(await getArchivedGameChapters(game.id));
    } finally {
      setReaderLoading(false);
    }
  }

  if (reader) {
    return (
      <section className="screen-stack">
        <header className="image-hero story-map-hero">
          <span className="eyebrow">Архивная книга</span>
          <h1>{reader.game.title}</h1>
          <p>Глав: {reader.chapters.length} · счёт {reader.game.score}</p>
        </header>
        <button className="secondary-button" onClick={() => setReader(null)} type="button">
          Назад к архиву
        </button>
        {reader.chapters.map((chapter) => (
          <article className="panel archive-reader-chapter" key={chapter.id}>
            <h2>Глава {chapter.chapter_number}</h2>
            <p>{chapter.scene_text}</p>
            {chapter.score_delta !== 0 && <p className="muted">Изменение счёта: {chapter.score_delta > 0 ? "+" : ""}{chapter.score_delta}</p>}
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Архив</span>
        <h1>Прошлые истории</h1>
        <p>Здесь сохраняются завершённые, архивные и оставленные ветки.</p>
      </header>

      {loading && <div className="panel">Загружаю истории...</div>}
      {!loading && items.length === 0 && (
        <section className="empty-card">
          <BookOpen size={34} />
          <h2>Архив пока пуст</h2>
          <p>Начни историю, а старые ветки будут появляться здесь.</p>
          <button className="primary-button" onClick={() => onNavigate("newGame")} type="button">
            Создать историю
          </button>
        </section>
      )}
      <div className="archive-list">
        {items.map((game) => (
          <article key={game.id} className="archive-card" onClick={() => openReader(game)} role="button" tabIndex={0}>
            <div>
              <h2>{game.title}</h2>
              <p>
                Глава {game.chapter}/{game.max_chapters} · {game.status}
              </p>
            </div>
            <span>
              <Clock size={15} /> {game.score}
            </span>
          </article>
        ))}
      </div>
      {readerLoading && <p className="notice">Открываю историю...</p>}
    </section>
  );
}
