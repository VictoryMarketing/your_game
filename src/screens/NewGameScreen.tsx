import { useState } from "react";
import { PaymentRequiredError } from "../api/client";
import { startGame, type StartSettings } from "../api/gameApi";
import type { GameSession } from "../api/types";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { LimitStateCard } from "../components/LimitStateCard";
import { haptic, notify } from "../telegram/telegram";

const presets = [
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
  "Психологический триллер",
  "Пиратская сага",
];
const genres = ["Фэнтези", "Городское фэнтези", "Детектив", "Триллер", "Sci-Fi", "Космоопера", "Мистика", "Выживание", "Приключение", "Киберпанк", "Постапокалипсис", "Историческое", "Тёмная академия", "Романтическое фэнтези", "Политическая интрига", "Пиратское приключение", "Свой вариант"];
const atmospheres = ["Светлая", "Загадочная", "Тёмная, но безопасная", "Эпичная", "Уютная", "Напряжённая", "Комедийная", "Кинематографичная", "Нуарная", "Мрачная сказка", "Дворцовая интрига", "Паранойя и тайны", "Путешествие и чудо", "Свой вариант"];
const paces = ["Спокойный", "Средний", "Динамичный", "Без пауз", "Медленное раскрытие тайны", "Короткие напряжённые сцены"];
const roles = ["Обычный человек", "Изгнанник", "Ученик", "Детектив", "Маг", "Инженер", "Капитан", "Странник", "Наследник престола", "Охотник за реликвиями", "Шпион", "Целитель", "Бывший злодей", "Пират", "Журналист", "Свой вариант"];
const goals = ["Выжить", "Раскрыть тайну", "Спасти друга", "Найти артефакт", "Победить врага", "Выбраться из ловушки", "Построить империю", "Очистить своё имя", "Остановить заговор", "Вернуть утраченную память", "Защитить город", "Выбрать сторону в войне", "Свой вариант"];
const lengths = ["До 10 глав", "До 30 глав", "До 50 глав", "До 80 глав"];
const difficulties = ["Лёгкая", "Нормальная", "Сложная", "Железный человек"];
const tones = ["Кинематографичный", "Книжный", "Нуар", "Драматичный", "Ироничный", "Мрачная сказка", "Эпическое приключение", "Психологичный", "Свой вариант"];

export function NewGameScreen({ onStarted }: { onStarted: (game: GameSession) => void }) {
  const [tab, setTab] = useState<"quick" | "deep">("quick");
  const [settings, setSettings] = useState<StartSettings>({
    preset: presets[0],
    genre: genres[0],
    pace: paces[2],
    role: roles[0],
    hero_role: roles[0],
    goal: goals[1],
    risk: "Средний",
    risk_level: "Средний",
    story_length: lengths[1],
    tone: "Кинематографичный",
    style: "Кинематографичный",
    difficulty: "Нормальная",
    atmosphere: atmospheres[1],
    mode: "normal",
    setup_mode: "quick",
    start_policy: "archive_old",
  });
  const [busy, setBusy] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [customGenre, setCustomGenre] = useState("");
  const [customAtmosphere, setCustomAtmosphere] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customTone, setCustomTone] = useState("");

  function patch<K extends keyof StartSettings>(key: K, value: StartSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    haptic("light");
  }

  async function create() {
    setBusy(true);
    setLimitReason(null);
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
      const game = await startGame(payload);
      notify("success");
      onStarted(game);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
      } else {
        setLimitReason("unknown");
      }
      notify("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen-stack">
      {busy && <ChapterGenerationOverlay onRetry={create} />}
      <header className="image-hero new-game-hero">
        <div>
          <span className="eyebrow">Новая история</span>
          <h1>Выбери, куда свернёт судьба</h1>
          <p>Быстрый старт даст историю сразу. Глубокая настройка точнее задаёт жанр, героя и границы.</p>
        </div>
      </header>

      <div className="segmented">
        <button className={tab === "quick" ? "active" : ""} onClick={() => setTab("quick")} type="button">
          Быстрый старт
        </button>
        <button className={tab === "deep" ? "active" : ""} onClick={() => setTab("deep")} type="button">
          Глубокая настройка
        </button>
      </div>

      {limitReason && <LimitStateCard reason={limitReason} onPrimary={() => patch("start_policy", "archive_old")} onSecondary={() => setLimitReason(null)} />}

      <section className="panel">
        <div className="section-head">
          <h2>{tab === "quick" ? "Быстрый старт" : "Шаг 1 из 5 · Мир"}</h2>
          <span className="muted">{tab === "quick" ? "1 касание" : "можно пропускать"}</span>
        </div>
        <div className="chip-grid">
          {(tab === "quick" ? presets : genres).map((item) => (
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
            <h2>Шаг 5 из 5 · Свой запрос</h2>
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

      <button className="primary-button tall" disabled={busy} onClick={create} type="button">
        {busy ? "Создаю историю..." : "Создать историю"}
      </button>
    </section>
  );
}
