import { CheckCircle2, Copy, Gift, Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { claimMission } from "../api/missionsApi";
import type { Mission } from "../api/types";
import { notify } from "../telegram/telegram";
import { copyText } from "../utils/clipboard";

export function MissionsScreen({
  missions,
  referralLink,
  onShare,
  onClaimed,
}: {
  missions: Mission[];
  referralLink?: string;
  onShare: () => void;
  onClaimed: () => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function claim(mission: Mission) {
    const key = mission.key || mission.k;
    setBusyKey(key);
    try {
      await claimMission(key);
      notify("success");
      onClaimed();
    } catch {
      notify("error");
    } finally {
      setBusyKey(null);
    }
  }

  async function copyReferral() {
    if (!referralLink) return;
    try {
      if (!await copyText(referralLink)) throw new Error("copy failed");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3500);
      notify("success");
    } catch {
      notify("error");
    }
  }

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Миссии</span>
        <h1>Дневные цели</h1>
        <p>Выполняй задания, чтобы получать бонусные главы, озвучки, картинки и XP.</p>
      </header>
      <div className="mission-list">
        {missions.map((mission) => {
          const progress = mission.progress || 0;
          const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(1, mission.target)) * 100)));
          const status = mission.status || (progress >= mission.target ? "completed" : "active");
          const key = mission.key || mission.k;
          const isShareMission = key === "share_game";
          return (
            <article className={`mission-card mission-${status}`} key={key}>
              <div className="section-head">
                <h2>
                  {mission.title}
                  {mission.weekly && <em className="mission-badge">Недельная</em>}
                </h2>
                <strong>{mission.reward}</strong>
              </div>
              {mission.description && <p>{mission.description}</p>}
              <div className="progress-track" style={{ "--progress": `${pct}%` } as CSSProperties}>
                <i />
              </div>
              <p className="muted">
                {isShareMission
                  ? `Засчитано приглашений: ${progress}. Бонус начисляется автоматически после первой главы друга.`
                  : status === "claimed" ? "Награда получена" : `Прогресс: ${progress}/${mission.target}`}
              </p>
              {isShareMission && (
                <div className="referral-box">
                  <button className="primary-button" onClick={onShare} type="button">
                    <Share2 size={18} /> Поделиться ссылкой
                  </button>
                  {referralLink && (
                    <div className="referral-link-card">
                      <span>Ваша реферальная ссылка</span>
                      <code>{referralLink}</code>
                      <button className="secondary-button" onClick={copyReferral} type="button">
                        <Copy size={17} /> {copied ? "Ссылка скопирована" : "Скопировать"}
                      </button>
                      {copied && <small className="copy-hint">Теперь вставьте ссылку в сообщение или публикацию.</small>}
                    </div>
                  )}
                </div>
              )}
              {!isShareMission && status === "completed" && (
                <button className="primary-button" disabled={busyKey === key} onClick={() => claim(mission)} type="button">
                  <Gift size={18} /> Забрать награду
                </button>
              )}
              {!isShareMission && status === "claimed" && (
                <div className="mission-claimed-badge">
                  <CheckCircle2 size={18} /> Получено
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
