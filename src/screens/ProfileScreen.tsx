import { useState } from "react";
import { saveProfile } from "../api/profileApi";
import type { Profile } from "../api/types";
import { notify } from "../telegram/telegram";

const genres = ["Фэнтези", "Городское фэнтези", "Детектив", "Триллер", "Sci-Fi", "Космоопера", "Мистика", "Выживание", "Киберпанк", "Постапокалипсис", "Тёмная академия", "Романтическое фэнтези", "Политическая интрига"];
const styles = ["Кинематографичный", "Книжный", "Нуар", "Драматичный", "Ироничный", "Мрачная сказка", "Эпический", "Психологичный", "Быстрый"];

export function ProfileScreen({ profile, onSaved, onShop }: { profile?: Profile; onSaved: (profile: Profile) => void; onShop: () => void }) {
  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(String(profile?.age || ""));
  const [favoriteGenre, setFavoriteGenre] = useState(profile?.favorite_genre || genres[0]);
  const [storyStyle, setStoryStyle] = useState(profile?.story_style || styles[0]);
  const [language, setLanguage] = useState(profile?.interface_language || "ru");
  const [saving, setSaving] = useState(false);

  const parsedAge = Number.parseInt(age, 10);
  const safety =
    Number.isFinite(parsedAge) && parsedAge < 13
      ? "family"
      : Number.isFinite(parsedAge) && parsedAge < 18
        ? "teen"
        : "auto";

  async function submit() {
    if (!name.trim() || !Number.isFinite(parsedAge)) return;
    setSaving(true);
    try {
      const result = await saveProfile({
        name: name.trim(),
        age: parsedAge,
        favorite_genre: favoriteGenre,
        story_style: storyStyle,
        interface_language: language,
        safety_mode: safety,
      });
      notify("success");
      onSaved(result.profile);
    } catch {
      notify("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen-stack profile-screen">
      <header className="image-hero inventory-hero">
        <span className="eyebrow">Профиль</span>
        <h1>{profile?.name || "Игрок"}</h1>
        <p>Имя и возраст влияют на персонализацию и безопасный тон историй.</p>
      </header>

      <section className="panel form-panel">
        <div className="section-head">
          <h2>{profile?.subscription_status === "active" ? "Premium активен" : "Premium не активен"}</h2>
          <button className="text-button" onClick={onShop} type="button">
            {profile?.subscription_status === "active" ? "Купить кредиты" : "Открыть Premium"}
          </button>
        </div>
        <p className="muted">
          Картинки: {profile?.image_credits || 0} · Голос: {profile?.voice_credits || 0} · Бонусные главы: {profile?.bonus_chapters || 0}
        </p>
        <label className="field">
          <span>Имя</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" />
        </label>
        <label className="field">
          <span>Возраст</span>
          <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="Например, 30" />
        </label>
        <label className="field">
          <span>Любимый жанр</span>
          <select value={favoriteGenre} onChange={(event) => setFavoriteGenre(event.target.value)}>
            {genres.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Стиль историй</span>
          <select value={storyStyle} onChange={(event) => setStoryStyle(event.target.value)}>
            {styles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Язык</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="ru">Русский</option>
            <option value="en">English позже</option>
          </select>
        </label>
        {Number.isFinite(parsedAge) && parsedAge < 13 && <p className="notice">Истории будут в безопасном семейном режиме.</p>}
        {Number.isFinite(parsedAge) && parsedAge >= 13 && parsedAge < 18 && (
          <p className="notice">Истории будут без взрослого контента и чрезмерной жестокости.</p>
        )}
      </section>

      <button className="primary-button tall" disabled={saving || !name.trim() || !Number.isFinite(parsedAge)} onClick={submit} type="button">
        {saving ? "Сохраняю..." : "Сохранить профиль"}
      </button>
    </section>
  );
}
