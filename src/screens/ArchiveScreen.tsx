import { BookOpen, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getGameHistory } from "../api/gameApi";
import type { GameSession } from "../api/types";
import type { Screen } from "../store/appStore";

export function ArchiveScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [items, setItems] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGameHistory()
      .then((result) => setItems(result.history))
      .finally(() => setLoading(false));
  }, []);

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
          <article key={game.id} className="archive-card">
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
    </section>
  );
}
