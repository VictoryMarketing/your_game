import { Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { Mission } from "../api/types";

export function MissionsScreen({ missions, onShare }: { missions: Mission[]; onShare: () => void }) {
  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Миссии</span>
        <h1>Дневные цели</h1>
        <p>Выполняй задания, чтобы открывать редкие ветки, голоса, картинки и бонусные главы.</p>
      </header>
      <div className="mission-list">
        {missions.map((mission) => {
          const progress = mission.progress || 0;
          const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, mission.target)) * 100)));
          return (
            <article className="mission-card" key={mission.k}>
              <div className="section-head">
                <h2>{mission.title}</h2>
                <strong>{mission.reward}</strong>
              </div>
              {mission.description && <p>{mission.description}</p>}
              <div className="progress-track" style={{ "--progress": `${pct}%` } as CSSProperties}>
                <i />
              </div>
              <p className="muted">
                Прогресс: {progress}/{mission.target}
              </p>
              {mission.k === "share" && (
                <button className="primary-button" onClick={onShare} type="button">
                  <Share2 size={18} /> Поделиться ссылкой
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
