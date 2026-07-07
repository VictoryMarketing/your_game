import { BookOpen, Gift, Image, Mic, Share2, Sparkles, Trophy } from "lucide-react";
import type { HomePayload } from "../api/types";
import type { Screen } from "../store/appStore";
import { StatPill } from "../components/StatPill";

export function HomeScreen({ home, onNavigate, onShare }: { home: HomePayload; onNavigate: (screen: Screen) => void; onShare: () => void }) {
  const profile = home.profile;
  const hasGame = Boolean(home.current_game);
  return (
    <section className="screen-stack">
      <header className="home-hero">
        <div>
          <span className="eyebrow">YouGame</span>
          <h1>{profile.name || "Игрок"}, твоя история ждёт</h1>
          <p>{hasGame ? home.current_game?.title : "Создай новую ветку и веди героя через последствия своих решений."}</p>
        </div>
        <button className="share-button" onClick={onShare} type="button" aria-label="Поделиться">
          <Share2 size={20} />
        </button>
      </header>

      <button className="primary-button tall" onClick={() => onNavigate(hasGame ? "game" : "newGame")} type="button">
        <BookOpen size={20} /> {hasGame ? "Продолжить историю" : "Начать историю"}
      </button>

      <div className="stat-grid">
        <StatPill label="Первая история" value={home.limits.first_free_remaining} icon={<Gift size={17} />} />
        <StatPill label="Сегодня глав" value={home.limits.daily_remaining} icon={<Sparkles size={17} />} />
        <StatPill label="Картинки" value={profile.image_credits || 0} icon={<Image size={17} />} />
        <StatPill label="Голос" value={profile.voice_credits || 0} icon={<Mic size={17} />} />
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Миссии дня</h2>
          <button className="text-button" onClick={() => onNavigate("missions")} type="button">Все</button>
        </div>
        <div className="mission-list compact">
          {home.missions.slice(0, 3).map((mission) => (
            <div key={mission.k} className="mission-row">
              <span>⬜️</span>
              <p>{mission.title}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="quick-actions">
        <button className="secondary-button" onClick={() => onNavigate("leaderboard")} type="button"><Trophy size={18} /> Рейтинг</button>
        <button className="secondary-button" onClick={() => onNavigate("shop")} type="button"><Sparkles size={18} /> Магазин</button>
      </div>
    </section>
  );
}
