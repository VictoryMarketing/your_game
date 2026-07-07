import type { GameSession } from "../api/types";

export function FinalScreen({ game, onShare, onNewGame }: { game?: GameSession | null; onShare: () => void; onNewGame: () => void }) {
  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Финал</span>
        <h1>{game?.title || "История завершена"}</h1>
        <p>Очки: {game?.score || 0}</p>
      </header>
      <section className="panel">
        <p>Стиль игрока: стратегический герой с собственной ценой решений.</p>
        <p>Редкость финала будет рассчитана после накопления статистики прохождений.</p>
      </section>
      <button className="primary-button tall" onClick={onShare} type="button">Поделиться финалом</button>
      <button className="secondary-button" onClick={onNewGame} type="button">Играть ещё раз</button>
    </section>
  );
}
