import { useRef, useState } from "react";
import { Archive, BookOpen, CheckCircle2, Trash2, X } from "lucide-react";
import { ApiError, PaymentRequiredError } from "../api/client";
import type { StartPolicy, StartSettings } from "../api/gameApi";
import { generateGameStartJob } from "../api/jobApi";
import type { GameSession, Profile } from "../api/types";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
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
}: {
  profile?: Profile;
  activeGame?: GameSession | null;
  initialStartPolicy?: StartPolicy;
  onStarted: (game: GameSession) => void;
  onShop: () => void;
  onContinueCurrent: () => void;
}) {
  const [tab, setTab] = useState<"quick" | "deep">("quick");
  const [settings, setSettings] = useState<StartSettings>(() => initialSettings(profile, initialStartPolicy));
  const [busy, setBusy] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [customAtmosphere, setCustomAtmosphere] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [showAllQuick, setShowAllQuick] = useState(false);
  const requestInFlight = useRef(false);

  function patch<K extends keyof StartSettings>(key: K, value: StartSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    haptic("light");
  }

  async function create() {
    if (requestInFlight.current) return;
    const missingCustom = [
      [settings.genre === "Свой вариант", customGenre, "Укажи свой жанр."],
      [settings.atmosphere === "Свой вариант", customAtmosphere, "Опиши свою атмосферу."],
      [settings.hero_role === "Свой вариант", customRole, "Опиши роль героя."],
      [settings.goal === "Свой вариант", customGoal, "Опиши цель героя."],
      [settings.tone === "Свой вариант", customTone, "Опиши стиль истории."],
    ].find(([selected, value]) => selected && !String(value).trim());
    if (missingCustom) {
      setLimitReason("validation");
      setErrorMessage(String(missingCustom[2]));
      notify("warning");
      return;
    }
    requestInFlight.current = true;
    setBusy(true);
    setLimitReason(null);
    setErrorMessage("");
    try {
      const payload = {
        ...settings,
        genre: settings.genre === "Свой вариант" ? customGenre || settings.genre : settings.genre,
        atmosphere: settings.atmosphere === "Свой вариант" ? customAtmosphere || settings.atmosphere : settings.atmosphere,
        hero_role: settings.hero_role === "Свой вариант" ? customRole || settings.hero_role : settings.hero_role,
        goal: settings.goal === "Свой вариант" ? customGoal || settings.goal : settings.goal,
        tone: settings.tone === "Свой вариант" ? customTone || settings.tone : settings.tone,
        style: settings.tone === "Свой вариант" ? customTone || settings.style : settings.tone,
        setup_mode: tab,
        mode: settings.difficulty === "Железный человек" ? "iron" : settings.mode,
      } satisfies StartSettings;
      const game = await generateGameStartJob(payload);
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
      setBusy(false);
    }
  }

  if (busy) {
    return <ChapterGenerationOverlay />;
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
          <p>Выбери, что произойдёт с текущей веткой, когда первая глава новой истории будет готова.</p>
          <div className="story-policy-grid" role="radiogroup" aria-label="Что сделать с текущей историей">
            <button className={settings.start_policy === "archive_old" ? "story-policy active" : "story-policy"} onClick={() => patch("start_policy", "archive_old")} role="radio" aria-checked={settings.start_policy === "archive_old"} type="button">
              <Archive size={20} /><span><strong>Приостановить</strong><small>Сохранить в архив. Историю можно будет продолжить позже.</small></span>
            </button>
            <button className={settings.start_policy === "finish_old" ? "story-policy active" : "story-policy"} onClick={() => patch("start_policy", "finish_old")} role="radio" aria-checked={settings.start_policy === "finish_old"} type="button">
              <CheckCircle2 size={20} /><span><strong>Завершить</strong><small>Закрыть ветку и учесть результат в статистике.</small></span>
            </button>
            <button className={settings.start_policy === "force_new" ? "story-policy danger active" : "story-policy danger"} onClick={() => patch("start_policy", "force_new")} role="radio" aria-checked={settings.start_policy === "force_new"} type="button">
              <Trash2 size={20} /><span><strong>Удалить черновик</strong><small>Без возможности вернуть его из архива.</small></span>
            </button>
          </div>
          <p className="transition-assurance"><CheckCircle2 size={16} /> Старая ветка изменит статус только после успешного создания новой главы.</p>
        </section>
      )}

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
        </div>
        {tab === "quick" && presets.length > 8 && (
          <button className="text-button" onClick={() => setShowAllQuick((value) => !value)} type="button">
            {showAllQuick ? "Скрыть жанры" : "Ещё жанры"}
          </button>
        )}
        {tab === "deep" && settings.genre === "Свой вариант" && (
          <label className="field">
            <span>Свой жанр</span>
            <input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} placeholder="Например: магический нуар" />
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
    </section>
  );
}
