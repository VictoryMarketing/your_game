import { BookOpen, Share2, Trophy, Archive, CheckCircle, Trash2, Target, Image as ImageIcon, Mic, Flame } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { abandonGame, archiveGame, finishGame } from "../api/gameApi";
import type { HomePayload } from "../api/types";
import type { Screen } from "../store/appStore";
import { notify } from "../telegram/telegram";
import { markNotificationRead } from "../api/profileApi";

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
  onOpenChallenge,
}: {
  home: HomePayload;
  onNavigate: (screen: Screen) => void;
  onShare: () => void;
  onRefresh: () => void;
  onOpenChallenge: (sessionId: string, status: string) => void;
}) {
  const [modal, setModal] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);
  const profile = home.profile;
  const game = home.current_game;
  const hasGame = Boolean(game);
  const imageTotal = (profile.image_credits || 0) + (profile.premium_image_remaining || 0);
  const voiceTotal = (profile.voice_credits || 0) + (profile.premium_voice_remaining || 0);
  const chapterTotal = profile.unlimited_chapters ? "∞" : profile.playable_chapters_remaining ?? (home.limits.first_free_remaining + home.limits.daily_remaining + home.limits.bonus_chapters);
  const imageSource = profile.premium_image_remaining ? `Premium: ${profile.premium_image_remaining}` : "кредитов в наличии";
  const voiceSource = profile.premium_voice_remaining ? `Premium: ${profile.premium_voice_remaining}` : "кредитов в наличии";
  const chapterSource = profile.unlimited_chapters ? "без дневного лимита" : `${home.limits.bonus_chapters || 0} бонусных`;
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

  function startWeeklyChallenge() {
    if (!home.weekly_challenge) return;
    const progress = home.weekly_challenge.progress;
    if (progress?.started && progress.session_id) {
      onOpenChallenge(progress.session_id, progress.status || "archived");
      return;
    }
    localStorage.setItem("yougame_challenge_seed", home.weekly_challenge.seed);
    localStorage.setItem("yougame_challenge_settings", JSON.stringify(home.weekly_challenge.settings));
    onNavigate("newGame");
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
        <span title="Сколько глав можно открыть без новой покупки"><BookOpen size={19} /><i><small>Доступно глав</small><strong>{chapterTotal}</strong><em>{chapterSource}</em></i></span>
        <span title={`${profile.image_credits || 0} купленных и ${profile.premium_image_remaining || 0} из Premium`}><ImageIcon size={19} /><i><small>Картинки</small><strong>{imageTotal}</strong><em>{imageSource}</em></i></span>
        <span title={`${profile.voice_credits || 0} купленных и ${profile.premium_voice_remaining || 0} из Premium`}><Mic size={19} /><i><small>Озвучки</small><strong>{voiceTotal}</strong><em>{voiceSource}</em></i></span>
        <span title="Дни подряд, когда вы возвращались в игру"><Flame size={19} /><i><small>Серия дней</small><strong>{profile.daily_streak || 0}</strong><em>дней подряд</em></i></span>
      </div>

      {home.notifications?.filter((item) => !dismissedNotifications.includes(item.id)).map((item) => (
        <section className="panel purchase-notification" key={item.id}>
          <div><span className="eyebrow">{item.kind === "payment" ? "Покупка" : "Новость"}</span><h2>{item.title}</h2><p>{item.body}</p></div>
          <button className="text-button" onClick={async () => { await markNotificationRead(item.id); setDismissedNotifications((current) => [...current, item.id]); }} type="button">Понятно</button>
        </section>
      ))}

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

      {home.weekly_challenge && (
        <section className="panel weekly-challenge-card">
          <div className="section-head"><span className="eyebrow">Тайна недели</span><span className="challenge-seed">{home.weekly_challenge.seed}</span></div>
          <h2>{home.weekly_challenge.title}</h2>
          <p>{home.weekly_challenge.description}</p>
          {home.weekly_challenge.progress?.started && <p className="challenge-progress-copy">{home.weekly_challenge.progress.completed ? "Испытание этой недели завершено." : `Испытание принято · глава ${home.weekly_challenge.progress.chapter || 1}. Повторный старт продолжит эту же ветку.`}</p>}
          <button className="primary-button" disabled={home.weekly_challenge.progress?.completed} onClick={startWeeklyChallenge} type="button"><Target size={18} /> {home.weekly_challenge.progress?.completed ? "Тайна пройдена" : home.weekly_challenge.progress?.started ? "Продолжить вызов" : "Принять вызов"}</button>
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
        <button className="secondary-button" onClick={() => onNavigate("missions")} type="button">
          <Target size={18} /> Миссии
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
