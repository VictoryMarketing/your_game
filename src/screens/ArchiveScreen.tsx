import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, GitBranch, Globe2, Play, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteGame, finishGame, forkGame, getArchivedGameChapters, getGameHistory, restoreGame } from "../api/gameApi";
import type { Chapter, GameSession } from "../api/types";
import type { Screen } from "../store/appStore";
import { notify } from "../telegram/telegram";
import { ConfirmDialog } from "../components/ConfirmDialog";

type ReaderState = { game: GameSession; chapters: Chapter[] };

const STATUS_LABELS: Record<string, string> = {
  final_pending: "ожидает финала",
  abandoned: "оставлена",
  archived: "приостановлена",
  finished: "завершена",
  active: "активна",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || "сохранена";
}

function formatDate(value?: string) {
  if (!value) return "дата неизвестна";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function riskLabel(score: number) {
  if (score < -8) return "критический";
  if (score < 0) return "высокий";
  if (score >= 20) return "низкий";
  return "умеренный";
}

export function ArchiveScreen({ onNavigate, onGame }: { onNavigate: (screen: Screen) => void; onGame: (game: GameSession) => void }) {
  const [items, setItems] = useState<GameSession[]>([]);
  const [reader, setReader] = useState<ReaderState | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [readerLoading, setReaderLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameSession | null>(null);

  useEffect(() => {
    getGameHistory()
      .then((result) => setItems(result.history))
      .finally(() => setLoading(false));
  }, []);

  async function openReader(game: GameSession) {
    setReaderLoading(true);
    try {
      const next = await getArchivedGameChapters(game.id);
      setReader(next);
      setChapterIndex(0);
    } finally {
      setReaderLoading(false);
    }
  }

  async function continueArchived() {
    if (!reader) return;
    setActionBusy(true);
    try {
      const game = await restoreGame(reader.game.id);
      onGame(game);
    } catch {
      notify("error");
    } finally {
      setActionBusy(false);
    }
  }

  async function finishArchived() {
    if (!reader) return;
    setActionBusy(true);
    try {
      await finishGame(reader.game.id);
      const next = await getArchivedGameChapters(reader.game.id);
      setReader(next);
      setItems((current) => current.map((item) => (item.id === next.game.id ? next.game : item)));
      notify("success");
    } catch {
      notify("error");
    } finally {
      setActionBusy(false);
    }
  }

  async function forkFromChapter() {
    if (!reader) return;
    const chapter = reader.chapters[chapterIndex];
    if (!chapter) return;
    if (!window.confirm(`Создать новую ветку с главы ${chapter.chapter_number}? Будет потрачен 1 жетон ветвления.`)) return;
    setActionBusy(true);
    try {
      const game = await forkGame(reader.game.id, chapter.chapter_number);
      notify("success");
      onGame(game);
    } catch (error) {
      notify("error");
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteSelected() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setActionBusy(true);
    try {
      await deleteGame(targetId);
      setItems((current) => current.filter((item) => item.id !== targetId));
      if (reader?.game.id === targetId) setReader(null);
      setDeleteTarget(null);
      notify("success");
    } catch {
      notify("error");
    } finally {
      setActionBusy(false);
    }
  }

  const deleteDialog = (
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Удалить историю из архива?"
      description={`«${deleteTarget?.title || "Эта история"}» исчезнет из вашего архива. Уже опубликованная открытая книга останется в библиотеке; снять её с публикации сможет только автор внутри библиотеки.`}
      confirmLabel="Да, удалить историю"
      tone="danger"
      busy={actionBusy}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => void deleteSelected()}
    />
  );

  if (reader) {
    const current = reader.chapters[chapterIndex] || reader.chapters[0];
    const canGoBack = chapterIndex > 0;
    const canGoNext = chapterIndex < reader.chapters.length - 1;
    return (
      <section className="screen-stack">
        <header className="image-hero story-map-hero">
          <span className="eyebrow">Архивная книга</span>
          <h1>{reader.game.title}</h1>
          <p>
            {statusLabel(reader.game.status)} · глав {reader.chapters.length} · счёт {reader.game.score}
          </p>
        </header>
        <div className="archive-reader-actions">
          <button className="secondary-button" onClick={() => setReader(null)} type="button">
            <ArrowLeft size={18} /> К архиву
          </button>
          {reader.game.status === "archived" && (
            <button className="primary-button" disabled={actionBusy} onClick={continueArchived} type="button">
              <Play size={18} /> Продолжить с главы {Math.max(1, reader.game.chapter)}
            </button>
          )}
          {reader.game.status === "final_pending" && (
            <button className="primary-button" disabled={actionBusy} onClick={finishArchived} type="button">
              <CheckCircle2 size={18} /> Завершить финалом
            </button>
          )}
          {reader.game.status === "finished" && (
            <button className="primary-button" onClick={() => onGame(reader.game)} type="button">
              <Globe2 size={18} /> Поделиться или опубликовать
            </button>
          )}
          <button className="secondary-button danger-outline" disabled={actionBusy} onClick={() => setDeleteTarget(reader.game)} type="button">
            <Trash2 size={18} /> Удалить
          </button>
        </div>
        <nav className="chapter-strip" aria-label="Главы архивной истории">
          {reader.chapters.map((chapter, index) => (
            <button
              className={index === chapterIndex ? "chapter-tab active" : "chapter-tab"}
              key={chapter.id}
              onClick={() => setChapterIndex(index)}
              type="button"
            >
              {chapter.chapter_number}
            </button>
          ))}
        </nav>
        {current && (
          <article className="archive-book">
            <div className="archive-book-meta">
              <span>Глава {current.chapter_number}</span>
              <span className={current.score_delta < 0 ? "risk-badge danger" : "risk-badge"}>
                {current.score_delta !== 0 ? `${current.score_delta > 0 ? "+" : ""}${current.score_delta}` : "0"} очков
              </span>
            </div>
            <p className="archive-story-text">{current.scene_text}</p>
          </article>
        )}
        <div className="archive-reader-actions">
          <button className="secondary-button" disabled={!canGoBack} onClick={() => setChapterIndex((value) => Math.max(0, value - 1))} type="button">
            <ArrowLeft size={18} /> Назад
          </button>
          <button className="secondary-button" disabled={!canGoNext} onClick={() => setChapterIndex((value) => Math.min(reader.chapters.length - 1, value + 1))} type="button">
            Дальше <ArrowRight size={18} />
          </button>
        </div>
        <button className="secondary-button archive-fork-button" disabled={actionBusy} onClick={forkFromChapter} type="button">
          <GitBranch size={18} /> Новая ветка отсюда · 1 жетон
        </button>
        {deleteDialog}
      </section>
    );
  }

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Архив</span>
        <h1>Прошлые истории</h1>
        <p>Приостановленные истории можно открыть как книгу и продолжить с сохранённой главы.</p>
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
                Глава {Math.max(1, game.chapter - 1)} · Статус: {statusLabel(game.status)}
              </p>
              <p className="archive-card-date">{formatDate(game.updated_at || game.created_at)}</p>
            </div>
            <div className="archive-card-score">
              <span className={game.score < 0 ? "risk-badge danger" : "risk-badge"}>
                {game.score < 0 ? <ShieldAlert size={15} /> : <Clock size={15} />}
                {game.score < 0 ? `Риск: ${riskLabel(game.score)}` : `Риск: ${riskLabel(game.score)}`}
              </span>
              <span>{game.score > 0 ? "+" : ""}{game.score} очков</span>
              <button
                className="archive-delete-button"
                onClick={(event) => { event.stopPropagation(); setDeleteTarget(game); }}
                type="button"
                aria-label={`Удалить историю ${game.title}`}
                title="Удалить историю"
              >
                <Trash2 size={17} /> Удалить
              </button>
            </div>
          </article>
        ))}
      </div>
      {readerLoading && <p className="notice">Открываю историю...</p>}
      {deleteDialog}
    </section>
  );
}
