import { BookOpen, Gift, Image, Mic, Share2, Sparkles, Trophy, Archive, CheckCircle, Trash2, Target } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { abandonGame, archiveGame, finishGame } from "../api/gameApi";
import type { HomePayload } from "../api/types";
import type { Screen } from "../store/appStore";
import { StatPill } from "../components/StatPill";
import { notify } from "../telegram/telegram";

function formatPremiumDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export function HomeScreen({
  home,
  onNavigate,
  onShare,
  onRefresh,
}: {
  home: HomePayload;
  onNavigate: (screen: Screen) => void;
  onShare: () => void;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState(false);
  const profile = home.profile;
  const game = home.current_game;
  const hasGame = Boolean(game);
  const imageTotal = (profile.image_credits || 0) + (profile.premium_image_remaining || 0);
  const voiceTotal = (profile.voice_credits || 0) + (profile.premium_voice_remaining || 0);
  const premiumUntil = formatPremiumDate(profile.premium_until || profile.subscription_expiry);
  const visibleMission = home.missions.find((mission) => (mission.progress || 0) < mission.target) || home.missions[0];

  async function mutate(action: () => Promise<unknown>, next?: Screen) {
    try {
      await action();
      notify("success");
      setModal(false);
      onRefresh();
      if (next) onNavigate(next);
    } catch {
      notify("error");
    }
  }

  return (
    <section className="screen-stack">
      <header className="home-hero">
        <div>
          <h1>{hasGame ? game?.title : "Твоя следующая история ещё не написана"}</h1>
          <p>{hasGame ? `Глава ${Math.max(1, (game?.current_chapter?.chapter_number || game?.chapter || 1))} · счёт ${game?.score || 0}` : "Создай личную книгу-игру за несколько касаний."}</p>
          <button className="primary-button home-main-cta" onClick={() => onNavigate(hasGame ? "game" : "newGame")} type="button">
            <BookOpen size={20} /> {hasGame ? "Продолжить" : "Начать за 10 секунд"}
          </button>
        </div>
        <button className="share-button" onClick={onShare} type="button" aria-label="Поделиться">
          <Share2 size={20} />
        </button>
      </header>

      <div className="quick-resource-row">
        <span>⭐ {home.limits.bonus_chapters || home.limits.daily_remaining} глав</span>
        <span>🖼 {imageTotal}</span>
        <span>🎙 {voiceTotal}</span>
        <span>🔥 {game?.state?.combo || profile.daily_streak || 0}</span>
      </div>

      {hasGame && game && (
        <section className="panel compact-panel">
          <div className="section-head">
            <h2>Активная ветка</h2>
            <button className="text-button" onClick={() => setModal(true)} type="button">
              Управлять
            </button>
          </div>
          <p>Если хочешь начать заново, текущую ветку можно сохранить в архив.</p>
        </section>
      )}

      {visibleMission && (
        <section className="panel compact-panel">
          <div className="section-head">
            <h2>Ближайшая цель</h2>
            <button className="text-button" onClick={() => onNavigate("missions")} type="button">
              Все
            </button>
          </div>
          <p>
            {visibleMission.title}
            {visibleMission.reward ? ` → ${visibleMission.reward}` : ""}
          </p>
          <div className="progress-track" aria-label="Прогресс миссии">
            <i style={{ "--progress": `${Math.min(100, Math.round(((visibleMission.progress || 0) / Math.max(1, visibleMission.target)) * 100))}%` } as CSSProperties} />
          </div>
        </section>
      )}

      <section className="panel compact-panel">
        <div className="section-head">
          <h2>{home.limits.is_premium ? "Premium активен" : "Premium не активен"}</h2>
          <button className="text-button" onClick={() => onNavigate("shop")} type="button">
            {home.limits.is_premium ? "Пакеты" : "Купить"}
          </button>
        </div>
        <p>
          Картинки: {profile.image_credits || 0} купленных
          {profile.premium_image_remaining ? ` · ${profile.premium_image_remaining} Premium` : ""} · Голос: {profile.voice_credits || 0} купленных
          {profile.premium_voice_remaining ? ` · ${profile.premium_voice_remaining} Premium` : ""} · Бонусные главы: {home.limits.bonus_chapters || 0}
        </p>
        {home.limits.is_premium ? (
          <p className="muted">Действует до {premiumUntil || "даты окончания"}. Включён месячный лимит картинок и озвучек. Дополнительные пакеты можно докупить в магазине.</p>
        ) : (
          <button className="primary-button" onClick={() => onNavigate("shop")} type="button">
            Открыть Premium
          </button>
        )}
      </section>

      <div className="stat-grid home-secondary-stats">
        <StatPill label="Первая история" value={home.limits.first_free_remaining} icon={<Gift size={17} />} />
        <StatPill label="Сегодня глав" value={home.limits.daily_remaining} icon={<Sparkles size={17} />} />
        <StatPill label="Бонусные главы" value={home.limits.bonus_chapters || 0} icon={<Archive size={17} />} />
        <StatPill label="Картинки" value={imageTotal} icon={<Image size={17} />} />
        <StatPill label="Голос" value={voiceTotal} icon={<Mic size={17} />} />
        <StatPill label="Рефералы" value={profile.referrals_count || 0} icon={<Share2 size={17} />} />
      </div>

      <section className="panel compact-panel">
        <div className="section-head">
          <h2>Сообщество</h2>
          <button className="text-button" onClick={() => onNavigate("leaderboard")} type="button">
            Рейтинг
          </button>
        </div>
        <p>Сравни рекорд, итоговые очки и количество завершённых историй.</p>
        <button className="secondary-button" onClick={() => onNavigate("leaderboard")} type="button">
          <Trophy size={18} /> Открыть рейтинг
        </button>
      </section>

      <div className="quick-actions">
        <button className="secondary-button" onClick={() => onNavigate("archive")} type="button">
          <Archive size={18} /> Архив
        </button>
        <button className="secondary-button" onClick={() => onNavigate("leaderboard")} type="button">
          <Target size={18} /> Миссии
        </button>
        <button className="secondary-button" onClick={() => onNavigate("shop")} type="button">
          <Sparkles size={18} /> Магазин
        </button>
        <button className="secondary-button" onClick={onShare} type="button">
          <Share2 size={18} /> Поделиться
        </button>
      </div>

      {modal && game && (
        <div className="story-modal">
          <section className="story-modal-card">
            <h2>У тебя уже есть активная история</h2>
            <p>Выбери, что сделать со старой веткой перед новым стартом.</p>
            <button className="primary-button" onClick={() => onNavigate("game")} type="button">
              <BookOpen size={18} /> Продолжить текущую
            </button>
            <button className="secondary-button" onClick={() => onNavigate("newGame")} type="button">
              <Archive size={18} /> Новая, старую сохранить в архив
            </button>
            <button className="secondary-button" onClick={() => mutate(() => finishGame(game.id), "newGame")} type="button">
              <CheckCircle size={18} /> Завершить старую историю
            </button>
            <button className="danger-button" onClick={() => mutate(() => abandonGame(game.id), "newGame")} type="button">
              <Trash2 size={18} /> Удалить черновик и начать заново
            </button>
            <button className="text-button" onClick={() => mutate(() => archiveGame(game.id))} type="button">
              Только сохранить в архив
            </button>
            <button className="text-button" onClick={() => setModal(false)} type="button">
              Отмена
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
