import { BookOpen, Share2, Trophy, Archive, CheckCircle, Trash2, Target, Image as ImageIcon, Mic, Flame, PackageOpen, PauseCircle, Library } from "lucide-react";
import { type CSSProperties, useCallback, useState } from "react";
import { archiveGame, deleteGame, finishGame } from "../api/gameApi";
import type { HomePayload } from "../api/types";
import type { Screen } from "../store/appStore";
import { notify } from "../telegram/telegram";
import { markNotificationRead } from "../api/profileApi";
import { ModalPortal } from "../components/ModalPortal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { StartPolicy } from "../api/gameApi";

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
  onStartNewGame,
}: {
  home: HomePayload;
  onNavigate: (screen: Screen) => void;
  onShare: () => void;
  onRefresh: () => void;
  onStartNewGame: (policy: StartPolicy) => void;
}) {
  const [modal, setModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "finish" | "delete" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const closeModal = useCallback(() => setModal(false), []);
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
    setActionBusy(true);
    try {
      await action();
      notify("success");
      setModal(false);
      onRefresh();
      if (next) onNavigate(next);
    } catch {
      notify("error");
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  }

  function runConfirmedAction() {
    if (!game || !confirmAction) return;
    if (confirmAction === "archive") void mutate(() => archiveGame(game.id));
    if (confirmAction === "finish") void mutate(() => finishGame(game.id));
    if (confirmAction === "delete") void mutate(() => deleteGame(game.id));
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
            <span className="muted">Глава {Math.max(1, game.current_chapter?.chapter_number || game.chapter || 1)}</span>
          </div>
          <p>Можно продолжить сейчас, приостановить с сохранением главы или завершить эту историю.</p>
          <button className="secondary-button" onClick={() => setModal(true)} type="button">
            <Archive size={18} /> Приостановить, завершить или начать новую
          </button>
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
        <p>Сравни результаты игроков или выбери законченную историю в открытой библиотеке.</p>
        <div className="community-actions">
          <button className="secondary-button" onClick={() => onNavigate("leaderboard")} type="button"><Trophy size={18} /> Рейтинг</button>
          <button className="secondary-button" onClick={() => onNavigate("library")} type="button"><Library size={18} /> Библиотека</button>
        </div>
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
        <button className="secondary-button" onClick={() => onNavigate("inventory")} type="button">
          <PackageOpen size={18} /> Инвентарь
        </button>
      </div>

      {modal && game && (
        <ModalPortal className="story-modal" onClose={closeModal}>
          <section className="story-modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="active-story-dialog-title">
            <span className="eyebrow">Активная история</span>
            <h2 id="active-story-dialog-title">{game.title}</h2>
            <p>Продолжи её или начни новую. Приостановленная история останется в архиве и откроется с той же главы.</p>
            <button className="primary-button" onClick={() => onNavigate("game")} type="button">
              <BookOpen size={18} /> Продолжить текущую историю
            </button>
            <div className="story-transition-actions">
              <button className="story-transition-action recommended" onClick={() => onStartNewGame("archive_old")} type="button">
                <Archive size={20} /><span><strong>Приостановить и начать новую</strong><small>Старая ветка сохранится в архиве. Её можно продолжить позже.</small></span>
              </button>
              <button className="story-transition-action" onClick={() => onStartNewGame("finish_old")} type="button">
                <CheckCircle size={20} /><span><strong>Завершить и начать новую</strong><small>Текущий результат попадёт в статистику и рейтинг.</small></span>
              </button>
              <button className="story-transition-action danger" onClick={() => onStartNewGame("force_new")} type="button">
                <Trash2 size={20} /><span><strong>Удалить черновик</strong><small>Ветка исчезнет без возможности восстановления.</small></span>
              </button>
            </div>
            <div className="story-now-actions">
              <button className="secondary-button" onClick={() => setConfirmAction("archive")} type="button">
                <PauseCircle size={18} /> Приостановить сейчас
              </button>
              <button className="secondary-button" onClick={() => setConfirmAction("finish")} type="button">
                <CheckCircle size={18} /> Завершить сейчас
              </button>
              <button className="secondary-button danger-outline" onClick={() => setConfirmAction("delete")} type="button">
                <Trash2 size={18} /> Удалить сейчас
              </button>
            </div>
            <button className="text-button" onClick={closeModal} type="button">
              Отмена
            </button>
          </section>
        </ModalPortal>
      )}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction === "delete" ? "Удалить историю?" : confirmAction === "finish" ? "Завершить историю?" : "Приостановить историю?"}
        description={confirmAction === "delete"
          ? "Черновик исчезнет из профиля и архива. Если завершённая книга уже опубликована для всех, её публичная версия сохранится."
          : confirmAction === "finish"
            ? "История будет закрыта с текущим результатом и появится в статистике и архиве."
            : "История переместится в архив. Позже её можно будет восстановить с сохранённой главы."}
        confirmLabel={confirmAction === "delete" ? "Да, удалить" : confirmAction === "finish" ? "Да, завершить" : "Да, приостановить"}
        tone={confirmAction === "delete" ? "danger" : "default"}
        busy={actionBusy}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />
    </section>
  );
}
