import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/shopApi";

export function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<Array<{ user_id: string; name: string; score: number }>>([]);

  useEffect(() => {
    getLeaderboard().then((result) => setLeaders(result.leaders)).catch(() => setLeaders([]));
  }, []);

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Рейтинг</span>
        <h1>Лучшие ветки сезона</h1>
        <p>Сильные решения поднимают игрока в сезонном топе.</p>
      </header>
      <div className="panel">
        {leaders.length ? leaders.map((leader, index) => (
          <div className="leader-row" key={leader.user_id}>
            <span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}</span>
            <p>{leader.name}</p>
            <strong>{leader.score}</strong>
          </div>
        )) : (
          <section className="empty-card">
            <h2>Сезон только начинается</h2>
            <p>Стань первым, кто откроет сильную ветку и попадёт в рейтинг.</p>
          </section>
        )}
      </div>
    </section>
  );
}
