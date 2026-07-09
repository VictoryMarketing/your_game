import { useState } from "react";
import { saveProfile } from "../api/profileApi";
import type { Profile } from "../api/types";
import { notify } from "../telegram/telegram";

const genres = [
  "Фэнтези",
  "Детектив",
  "Sci-Fi",
  "Мистика",
  "Выживание",
  "Роман",
  "Приключение",
  "Триллер",
  "Городское фэнтези",
  "Киберпанк",
  "Историческое",
  "Постапокалипсис",
  "Романтическое фэнтези",
  "Тёмная академия",
  "Свой жанр",
];

const styles = [
  "🎲 Рандом",
  "Книжный",
  "Кинематографичный",
  "Драматичный",
  "Нуар",
  "Ироничный",
  "Мрачная сказка",
  "Психологичный",
  "Эпическое приключение",
  "Свой стиль",
];

export function OnboardingScreen({ onDone }: { onDone: (profile: Profile) => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState(genres[0]);
  const [storyStyle, setStoryStyle] = useState(styles[0]);
  const [customGenre, setCustomGenre] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const parsedAge = Number(age);
    if (name.trim().length < 2 || !Number.isFinite(parsedAge) || parsedAge < 6 || parsedAge > 99) {
      setError("Введите имя и возраст от 6 до 99.");
      notify("warning");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await saveProfile({
        name,
        age: parsedAge,
        favorite_genre: favoriteGenre === "Свой жанр" ? customGenre.trim() || favoriteGenre : favoriteGenre,
        story_style: storyStyle === "Свой стиль" ? customStyle.trim() || storyStyle : storyStyle,
      });
      notify("success");
      onDone(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
      notify("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen-stack">
      <header>
        <span className="eyebrow">Профиль героя</span>
        <h1>Сделаем историю личной</h1>
      </header>
      <label className="field">
        <span>Имя</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Марк" />
      </label>
      <label className="field">
        <span>Возраст</span>
        <input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Например, 24" />
      </label>
      <div className="field">
        <span>Любимый жанр</span>
        <div className="chip-grid">
          {genres.map((genre) => (
            <button key={genre} className={favoriteGenre === genre ? "chip active" : "chip"} onClick={() => setFavoriteGenre(genre)} type="button">
              {genre}
            </button>
          ))}
        </div>
      </div>
      {favoriteGenre === "Свой жанр" && (
        <label className="field">
          <span>Свой жанр</span>
          <input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} placeholder="Например, семейная сага" />
        </label>
      )}
      <div className="field">
        <span>Любимый стиль</span>
        <div className="chip-grid">
          {styles.map((style) => (
            <button key={style} className={storyStyle === style ? "chip active" : "chip"} onClick={() => setStoryStyle(style)} type="button">
              {style}
            </button>
          ))}
        </div>
      </div>
      {storyStyle === "Свой стиль" && (
        <label className="field">
          <span>Свой стиль</span>
          <input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} placeholder="Например, уютный детектив с юмором" />
        </label>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="primary-button tall" disabled={busy} onClick={submit} type="button">
        Сохранить и начать
      </button>
    </section>
  );
}
