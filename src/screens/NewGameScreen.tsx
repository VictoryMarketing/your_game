import { useEffect, useRef, useState } from "react";
import { Archive, BookMarked, BookOpen, CheckCircle2, Sparkles, Trash2, X } from "lucide-react";
import { ApiError, PaymentRequiredError } from "../api/client";
import { archiveGame, deleteGame, finishGame, getCurrentGame, type StartPolicy, type StartSettings } from "../api/gameApi";
import { generateGameStartJob, type GenerationProgress } from "../api/jobApi";
import { getCuratedBooks, startCuratedBook, type CuratedBook } from "../api/curatedApi";
import type { GameSession, Profile } from "../api/types";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { StreamingChapterPage } from "../components/StreamingChapterPage";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LimitStateCard } from "../components/LimitStateCard";
import { NEW_GAME_GENRES as genres } from "../constants/storyOptions";
import { haptic, notify } from "../telegram/telegram";

const presets = [
  "🎲 Рандом",
  "Опасное приключение",
  "Тайна и расследование",
  "Мир магии",
  "Космос и технологии",
  "Выживание",
  "Постапокалипсис",
  "Школа магии",
  "Городские легенды",
  "Королевский двор",
  "Киберпанк",
  "Тёмная академия",
  "Романтическое приключение",
  "Роман",
  "Семейная сага",
  "Психологический триллер",
  "Пиратская сага",
  "Сказочное путешествие",
  "Современная проза",
  "Магический реализм",
  "Любовная история",
  "Комедия характеров",
  "Антиутопия",
];
const QUICK_CUSTOM_GENRE = "Свой жанр";
const atmospheres = ["🎲 Рандом", "Светлая", "Загадочная", "Тёмная, но безопасная", "Эпичная", "Уютная", "Напряжённая", "Комедийная", "Кинематографичная", "Нуарная", "Мрачная сказка", "Дворцовая интрига", "Паранойя и тайны", "Путешествие и чудо", "Свой вариант"];
const paces = ["🎲 Рандом", "Спокойный", "Средний", "Динамичный", "Без пауз", "Медленное раскрытие тайны", "Короткие напряжённые сцены"];
const roles = ["🎲 Рандом", "Обычный человек", "Изгнанник", "Ученик", "Детектив", "Маг", "Инженер", "Капитан", "Странник", "Наследник престола", "Охотник за реликвиями", "Шпион", "Целитель", "Бывший злодей", "Пират", "Журналист", "Свой вариант"];
const goals = ["🎲 Рандом", "Выжить", "Раскрыть тайну", "Спасти друга", "Найти артефакт", "Победить врага", "Выбраться из ловушки", "Построить империю", "Очистить своё имя", "Остановить заговор", "Вернуть утраченную память", "Защитить город", "Выбрать сторону в войне", "Свой вариант"];
const lengths = ["🎲 Рандом", "До 10 глав", "До 30 глав", "До 50 глав", "До 80 глав"];
const difficulties = ["🎲 Рандом", "Лёгкая", "Нормальная", "Сложная", "Железный человек"];
const tones = ["🎲 Рандом", "Кинематографичный", "Книжный", "Нуар", "Драматичный", "Ироничный", "Мрачная сказка", "Эпическое приключение", "Психологичный", "Свой вариант"];

function initialSettings(profile?: Profile, startPolicy: StartPolicy = "archive_old"): StartSettings {
  return {
    preset: "🎲 Рандом",
    genre: "🎲 Рандом",
    pace: "🎲 Рандом",
    role: "🎲 Рандом",
    hero_role: "🎲 Рандом",
    goal: "🎲 Рандом",
    risk: "Средний",
    risk_level: "Средний",
    story_length: "До 30 глав",
    tone: "🎲 Рандом",
    style: "🎲 Рандом",
    difficulty: "Нормальная",
    atmosphere: "🎲 Рандом",
    custom_prompt: undefined,
    mode: "normal",
    setup_mode: "quick",
    start_policy: startPolicy,
    auto_generate_images: Boolean(profile?.auto_generate_images),
    auto_generate_voice: Boolean(profile?.auto_generate_voice),
  };
}

export function NewGameScreen({
  profile,
  activeGame,
  initialStartPolicy = "archive_old",
  onStarted,
  onShop,
  onContinueCurrent,
  onCurrentChanged,
}: {
  profile?: Profile;
  activeGame?: GameSession | null;
  initialStartPolicy?: StartPolicy;
  onStarted: (game: GameSession) => void;
  onShop: () => void;
  onContinueCurrent: () => void;
  onCurrentChanged: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<"quick" | "deep">("quick");
  const [settings, setSettings] = useState<StartSettings>(() => initialSettings(profile, initialStartPolicy));
  const [busy, setBusy] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [customAtmosphere, setCustomAtmosphere] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [showAllQuick, setShowAllQuick] = useState(false);
  const [pendingPolicy, setPendingPolicy] = useState<StartPolicy | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const requestInFlight = useRef(false);
  const [curatedBooks, setCuratedBooks] = useState<CuratedBook[]>([]);
  const [curatedBusy, setCuratedBusy] = useState("");

  useEffect(() => {
    getCuratedBooks().then(({ books }) => setCuratedBooks(books)).catch(() => setCuratedBooks([]));
  }, []);

  function patch<K extends keyof StartSettings>(key: K, value: StartSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    haptic("light");
  }

  async function applyCurrentStoryAction() {
    if (!activeGame || !pendingPolicy) return;
    setActionBusy(true);
    setActionError("");
    try {
      if (pendingPolicy === "archive_old") await archiveGame(activeGame.id);
      if (pendingPolicy === "finish_old") await finishGame(activeGame.id);
      if (pendingPolicy === "force_new") await deleteGame(activeGame.id);
      setPendingPolicy(null);
      patch("start_policy", "archive_old");
      await onCurrentChanged();
      notify("success");
    } catch (error) {
      setActionError(error instanceof ApiError || error instanceof Error ? error.message : "Не удалось выполнить действие. Попробуйте ещё раз.");
      notify("error");
    } finally {
      setActionBusy(false);
    }
  }

  async function create() {
    if (requestInFlight.current) return;
    const quickCustomGenre = tab === "quick" && settings.preset === QUICK_CUSTOM_GENRE;
    const deepCustomGenre = tab === "deep" && settings.genre === "Свой вариант";
    const missingCustom = [
      [quickCustomGenre || deepCustomGenre, customGenre, "Укажи свой жанр."],
      [tab === "deep" && settings.atmosphere === "Свой вариант", customAtmosphere, "Опиши свою атмосферу."],
      [tab === "deep" && settings.hero_role === "Свой вариант", customRole, "Опиши роль героя."],
      [tab === "deep" && settings.goal === "Свой вариант", customGoal, "Опиши цель героя."],
      [tab === "deep" && settings.tone === "Свой вариант", customTone, "Опиши стиль истории."],
    ].find(([selected, value]) => selected && !String(value).trim());
    if (missingCustom) {
      setLimitReason("validation");
      setErrorMessage(String(missingCustom[2]));
      notify("warning");
      return;
    }
    requestInFlight.current = true;
    setBusy(true);
    sessionStorage.removeItem("yougame_streaming_transition");
    setGenerationProgress(null);
    setLimitReason(null);
    setErrorMessage("");
    try {
      const payload = {
        ...settings,
        preset: tab === "quick" ? (quickCustomGenre ? customGenre.trim() : settings.preset) : "🎲 Рандом",
        genre: tab === "quick"
          ? (quickCustomGenre ? customGenre.trim() : "🎲 Рандом")
          : (deepCustomGenre ? customGenre.trim() : settings.genre),
        atmosphere: settings.atmosphere === "Свой вариант" ? customAtmosphere || settings.atmosphere : settings.atmosphere,
        hero_role: settings.hero_role === "Свой вариант" ? customRole || settings.hero_role : settings.hero_role,
        goal: settings.goal === "Свой вариант" ? customGoal || settings.goal : settings.goal,
        tone: settings.tone === "Свой вариант" ? customTone || settings.tone : settings.tone,
        style: settings.tone === "Свой вариант" ? customTone || settings.style : settings.tone,
        setup_mode: tab,
        mode: settings.difficulty === "Железный человек" ? "iron" : settings.mode,
      } satisfies StartSettings;
      const game = await generateGameStartJob(payload, (progress) => {
        if (progress.scene_text) sessionStorage.setItem("yougame_streaming_transition", "1");
        setGenerationProgress(progress);
      });
      notify("success");
      onStarted(game);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        setErrorMessage(err.messageText);
      } else {
        setLimitReason("unknown");
        setErrorMessage(err instanceof ApiError || err instanceof Error ? err.message : "Не удалось создать историю. Попробуйте ещё раз.");
      }
      notify("error");
    } finally {
      requestInFlight.current = false;
      setGenerationProgress(null);
      setBusy(false);
    }
  }

  async function playCurated(book: CuratedBook) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setCuratedBusy(book.id);
    setLimitReason(null);
    setErrorMessage("");
    try {
      const game = await startCuratedBook(book.id, settings.start_policy || initialStartPolicy);
      notify("success");
      onStarted(game);
    } catch (error) {
      try {
        const { current_game: currentGame } = await getCurrentGame();
        if (currentGame?.mode === "curated" && currentGame.state.curated_story_id === book.id) {
          notify("success");
          onStarted(currentGame);
          return;
        }
      } catch {
        // Keep the original start error: it is more useful than recovery failure.
      }
      setLimitReason("unknown");
      setErrorMessage(error instanceof ApiError || error instanceof Error ? error.message : "Не удалось открыть готовую книгу.");
      notify("error");
    } finally {
      requestInFlight.current = false;
      setCuratedBusy("");
    }
  }

  if (busy) {
    if (generationProgress?.scene_text) {
      return <StreamingChapterPage progress={generationProgress} chapterNumber={1} />;
    }
    return <ChapterGenerationOverlay progress={generationProgress} />;
  }

  return (
    <section className="screen-stack">
      <header className="image-hero new-game-hero">
        <div>
          <span className="eyebrow">Новая история</span>
          <h1>Выбери, куда свернёт судьба</h1>
          <p>Быстрый старт даст историю сразу. Глубокая настройка точнее задаёт жанр, героя и границы.</p>
        </div>
      </header>

      {activeGame && (
        <section className="panel active-story-transition">
          <div className="section-head">
            <div>
              <span className="eyebrow">Перед новым стартом</span>
              <h2>{activeGame.title}</h2>
            </div>
            <button className="text-button" onClick={onContinueCurrent} type="button"><BookOpen size={17} /> Продолжить</button>
          </div>
          <p>Текущую ветку можно изменить прямо сейчас. Создавать новую историю для этого не нужно.</p>
          <div className="story-policy-grid" aria-label="Управление текущей историей">
            <button className="story-policy" onClick={() => { setActionError(""); setPendingPolicy("archive_old"); }} type="button">
              <Archive size={20} /><span><strong>Приостановить</strong><small>Сохранить в архив. Историю можно будет продолжить позже.</small></span>
            </button>
            <button className="story-policy" onClick={() => { setActionError(""); setPendingPolicy("finish_old"); }} type="button">
              <CheckCircle2 size={20} /><span><strong>Завершить</strong><small>Закрыть ветку и учесть результат в статистике.</small></span>
            </button>
            <button className="story-policy danger" onClick={() => { setActionError(""); setPendingPolicy("force_new"); }} type="button">
              <Trash2 size={20} /><span><strong>Удалить черновик</strong><small>Без возможности вернуть его из архива.</small></span>
            </button>
          </div>
          <p className="transition-assurance"><CheckCircle2 size={16} /> После подтверждения действие выполнится сразу.</p>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingPolicy)}
        title={pendingPolicy === "force_new" ? "Удалить текущую историю?" : pendingPolicy === "finish_old" ? "Завершить текущую историю?" : "Приостановить текущую историю?"}
        description={pendingPolicy === "force_new"
          ? "Черновик исчезнет из профиля и архива. Уже опубликованная открытая книга останется в библиотеке, пока вы сами не снимете её с публикации."
          : pendingPolicy === "finish_old"
            ? "Ветка завершится сейчас, а текущий результат попадёт в статистику и архив."
            : "Ветка сейчас переместится в архив. Её можно будет продолжить позже."}
        confirmLabel={pendingPolicy === "force_new" ? "Да, удалить сейчас" : pendingPolicy === "finish_old" ? "Да, завершить сейчас" : "Да, приостановить сейчас"}
        tone={pendingPolicy === "force_new" ? "danger" : "default"}
        busy={actionBusy}
        onClose={() => setPendingPolicy(null)}
        onConfirm={() => void applyCurrentStoryAction()}
      >
        {actionError && <p className="confirm-dialog-error" role="alert">{actionError}</p>}
      </ConfirmDialog>

      <div className="segmented">
        <button className={tab === "quick" ? "active" : ""} onClick={() => setTab("quick")} type="button">
          Быстрый старт
        </button>
        <button className={tab === "deep" ? "active" : ""} onClick={() => setTab("deep")} type="button">
          Глубокая настройка
        </button>
      </div>

      {limitReason && <LimitStateCard reason={limitReason} message={errorMessage} onPrimary={onShop} onSecondary={() => setLimitReason(null)} />}

      <section className="panel">
        <div className="section-head">
          <h2>{tab === "quick" ? "Быстрый старт" : "Шаг 1 из 5 · Мир"}</h2>
          <span className="muted">{tab === "quick" ? "1 касание" : "можно пропускать"}</span>
        </div>
        <div className="chip-grid">
          {(tab === "quick" ? (showAllQuick ? presets : presets.slice(0, 8)) : genres).map((item) => (
            <button
              key={item}
              className={(tab === "quick" ? settings.preset : settings.genre) === item ? "chip active" : "chip"}
              onClick={() => patch(tab === "quick" ? "preset" : "genre", item)}
              type="button"
            >
              {item}
            </button>
          ))}
          {tab === "quick" && (
            <button
              className={settings.preset === QUICK_CUSTOM_GENRE ? "chip active" : "chip"}
              onClick={() => patch("preset", QUICK_CUSTOM_GENRE)}
              type="button"
            >
              ✍️ Свой жанр
            </button>
          )}
        </div>
        {tab === "quick" && presets.length > 8 && (
          <button className="text-button" onClick={() => setShowAllQuick((value) => !value)} type="button">
            {showAllQuick ? "Скрыть жанры" : "Ещё жанры"}
          </button>
        )}
        {((tab === "quick" && settings.preset === QUICK_CUSTOM_GENRE) || (tab === "deep" && settings.genre === "Свой вариант")) && (
          <label className="field">
            <span>Свой жанр</span>
            <input
              autoFocus
              value={customGenre}
              onChange={(event) => setCustomGenre(event.target.value)}
              placeholder="Например: магический нуар"
            />
          </label>
        )}
      </section>

      {tab === "deep" && (
        <>
          <section className="panel form-panel">
            <h2>Шаг 2 из 5 · Атмосфера и темп</h2>
            <div className="field">
              <span>Атмосфера</span>
              <div className="chip-grid">{atmospheres.map((item) => <button key={item} className={settings.atmosphere === item ? "chip active" : "chip"} onClick={() => patch("atmosphere", item)} type="button">{item}</button>)}</div>
            </div>
            {settings.atmosphere === "Свой вариант" && <input value={customAtmosphere} onChange={(event) => setCustomAtmosphere(event.target.value)} placeholder="Опиши атмосферу" />}
            <div className="field">
              <span>Темп</span>
              <div className="chip-grid">{paces.map((item) => <button key={item} className={settings.pace === item ? "chip active" : "chip"} onClick={() => patch("pace", item)} type="button">{item}</button>)}</div>
            </div>
          </section>

          <section className="panel form-panel">
            <h2>Шаг 3 из 5 · Герой и цель</h2>
            <label className="field">
              <span>Имя героя</span>
              <input value={settings.hero_name || ""} onChange={(event) => patch("hero_name", event.target.value)} placeholder="Можно оставить пустым" />
            </label>
            <div className="field">
              <span>Герой</span>
              <div className="chip-grid">{roles.map((item) => <button key={item} className={settings.hero_role === item ? "chip active" : "chip"} onClick={() => patch("hero_role", item)} type="button">{item}</button>)}</div>
            </div>
            {settings.hero_role === "Свой вариант" && <input value={customRole} onChange={(event) => setCustomRole(event.target.value)} placeholder="Кто герой?" />}
            <div className="field">
              <span>Главная цель</span>
              <div className="chip-grid">{goals.map((item) => <button key={item} className={settings.goal === item ? "chip active" : "chip"} onClick={() => patch("goal", item)} type="button">{item}</button>)}</div>
            </div>
            {settings.goal === "Свой вариант" && <input value={customGoal} onChange={(event) => setCustomGoal(event.target.value)} placeholder="Какая цель у героя?" />}
          </section>

          <section className="panel form-panel">
            <h2>Шаг 4 из 5 · Правила игры</h2>
            <div className="field">
              <span>Сложность</span>
              <div className="chip-grid">{difficulties.map((item) => <button key={item} className={settings.difficulty === item ? "chip active" : "chip"} onClick={() => patch("difficulty", item)} type="button">{item}</button>)}</div>
            </div>
            <div className="field">
              <span>Длина</span>
              <div className="chip-grid">{lengths.map((item) => <button key={item} className={settings.story_length === item ? "chip active" : "chip"} onClick={() => patch("story_length", item)} type="button">{item}</button>)}</div>
            </div>
            <div className="field">
              <span>Стиль</span>
              <div className="chip-grid">{tones.map((item) => <button key={item} className={settings.tone === item ? "chip active" : "chip"} onClick={() => patch("tone", item)} type="button">{item}</button>)}</div>
            </div>
            {settings.tone === "Свой вариант" && <input value={customTone} onChange={(event) => setCustomTone(event.target.value)} placeholder="Опиши стиль" />}
          </section>

          <section className="panel form-panel">
            <div className="section-head"><div><h2>Шаг 5 из 5 · Свой запрос</h2><small className="muted">необязательно</small></div>{settings.custom_prompt && <button className="text-button" onClick={() => patch("custom_prompt", "")} type="button"><X size={15} /> Очистить</button>}</div>
            <p className="muted">Поле начинается пустым и относится только к этой новой истории. Оставь его пустым, если достаточно выбранных параметров.</p>
            <label className="field">
              <span>Опиши, какую историю ты хочешь</span>
              <textarea
                value={settings.custom_prompt || ""}
                onChange={(event) => patch("custom_prompt", event.target.value)}
                placeholder="Например: хочу историю про город на границе миров, тайный орден, предательство друга и выборы без очевидно правильного ответа."
              />
            </label>
            <label className="field">
              <span>Что обязательно добавить</span>
              <input value={settings.desired_elements || ""} onChange={(event) => patch("desired_elements", event.target.value)} placeholder="тайный знак, предательство, артефакт" />
            </label>
            <label className="field">
              <span>Чего избегать</span>
              <input value={settings.forbidden_topics || ""} onChange={(event) => patch("forbidden_topics", event.target.value)} placeholder="хоррор, пауки, грустный финал" />
            </label>
          </section>
        </>
      )}

      <section className="panel form-panel">
        <h2>Автомедиа</h2>
        <label className="toggle-row">
          <input checked={Boolean(settings.auto_generate_images)} onChange={(event) => patch("auto_generate_images", event.target.checked)} type="checkbox" />
          <span>Автокартинка к новой главе</span>
        </label>
        <label className="toggle-row">
          <input checked={Boolean(settings.auto_generate_voice)} onChange={(event) => patch("auto_generate_voice", event.target.checked)} type="checkbox" />
          <span>Автоозвучка новой главы</span>
        </label>
        <p className="muted">Если кредиты или Premium-квота закончились, глава всё равно создастся, а медиа можно будет включить позже.</p>
      </section>

      <button className="primary-button tall new-game-create" disabled={busy} onClick={create} type="button">
        {busy ? "Создаю историю..." : activeGame && settings.start_policy === "archive_old" ? "Приостановить старую и создать новую" : activeGame && settings.start_policy === "finish_old" ? "Завершить старую и создать новую" : activeGame && settings.start_policy === "force_new" ? "Удалить старую и создать новую" : "Создать историю"}
      </button>

      {curatedBooks.length > 0 && (
        <section className="curated-launch-section" aria-labelledby="curated-title">
          <div className="section-head">
            <div><span className="eyebrow">Готовые приключения</span><h2 id="curated-title">Играй сразу и бесплатно</h2></div>
            <span className="curated-offline-mark"><Sparkles size={15} /> без ожидания</span>
          </div>
          <p className="muted">Авторские ветвящиеся книги уже написаны целиком. Выборы меняют последствия и финал, но не расходуют главы.</p>
          <div className="curated-book-grid">
            {curatedBooks.map((book) => (
              <article className="curated-book-card" key={book.id}>
                <div className="curated-book-icon">
                  {book.cover_image ? <img src={book.cover_image} alt="" loading="lazy" /> : <BookMarked size={25} />}
                </div>
                <div className="curated-book-copy">
                  <span>{book.genre} · {book.age_rating}</span>
                  <h3>{book.title}</h3>
                  <p>{book.tagline}</p>
                  <small>{book.max_chapters} глав · {book.ending_count} финалов</small>
                </div>
                <button className="primary-button" disabled={Boolean(curatedBusy)} onClick={() => void playCurated(book)} type="button">
                  <BookOpen size={18} /> {curatedBusy === book.id ? "Открываем..." : "Играть бесплатно"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
