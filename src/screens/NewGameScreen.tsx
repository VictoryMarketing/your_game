import { useState } from "react";
import { startGame, type StartSettings } from "../api/gameApi";
import type { GameSession } from "../api/types";
import { haptic, notify } from "../telegram/telegram";

const presets = ["Опасное приключение", "Тайна и расследование", "Мир магии", "Космос и технологии", "Выживание"];
const genres = ["Фэнтези", "Детектив", "Sci-Fi", "Мистика", "Реализм"];
const roles = ["Воин", "Маг", "Следопыт", "Дипломат", "Инженер"];

export function NewGameScreen({ onStarted }: { onStarted: (game: GameSession) => void }) {
  const [settings, setSettings] = useState<StartSettings>({
    preset: presets[0],
    genre: genres[0],
    pace: "Кинематографичный",
    role: roles[0],
    risk: "Средний",
    difficulty: "Средняя",
    atmosphere: "Напряжённая",
    mode: "normal",
  });
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function patch<K extends keyof StartSettings>(key: K, value: StartSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    haptic("light");
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const game = await startGame(settings);
      notify("success");
      onStarted(game);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать историю";
      setError(message);
      notify("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen-stack">
      <header>
        <span className="eyebrow">Новая история</span>
        <h1>Выбери, куда свернёт судьба</h1>
      </header>

      <section className="panel">
        <div className="section-head">
          <h2>Быстрый старт</h2>
          <button className="text-button" onClick={() => setAdvanced((value) => !value)} type="button">
            {advanced ? "Скрыть" : "Глубокая настройка"}
          </button>
        </div>
        <div className="chip-grid">
          {presets.map((preset) => (
            <button key={preset} className={settings.preset === preset ? "chip active" : "chip"} onClick={() => patch("preset", preset)} type="button">
              {preset}
            </button>
          ))}
        </div>
      </section>

      {advanced && (
        <section className="panel">
          <h2>Настройки</h2>
          <div className="field">
            <span>Жанр</span>
            <div className="chip-grid">{genres.map((genre) => <button key={genre} className={settings.genre === genre ? "chip active" : "chip"} onClick={() => patch("genre", genre)} type="button">{genre}</button>)}</div>
          </div>
          <div className="field">
            <span>Роль героя</span>
            <div className="chip-grid">{roles.map((role) => <button key={role} className={settings.role === role ? "chip active" : "chip"} onClick={() => patch("role", role)} type="button">{role}</button>)}</div>
          </div>
          <div className="segmented">
            <button className={settings.mode === "normal" ? "active" : ""} onClick={() => patch("mode", "normal")} type="button">Обычный</button>
            <button className={settings.mode === "iron" ? "active" : ""} onClick={() => patch("mode", "iron")} type="button">Ironman</button>
          </div>
        </section>
      )}

      {error && <p className="error-text">{error}</p>}
      <button className="primary-button tall" disabled={busy} onClick={create} type="button">
        {busy ? "Создаю историю..." : "Создать историю"}
      </button>
    </section>
  );
}
