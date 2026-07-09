import { useState } from "react";
import { PackageOpen } from "lucide-react";
import { saveProfile } from "../api/profileApi";
import type { Profile } from "../api/types";
import { SelectSheet } from "../components/SelectSheet";
import { notify } from "../telegram/telegram";

const genres = ["🎲 Рандом", "Фэнтези", "Городское фэнтези", "Детектив", "Триллер", "Sci-Fi", "Космоопера", "Мистика", "Выживание", "Приключение", "Роман", "Драма", "Семейная сага", "Киберпанк", "Постапокалипсис", "Историческое", "Тёмная академия", "Романтическое фэнтези", "Политическая интрига", "Пиратское приключение", "Нуар", "Военная драма", "Свой жанр"];
const styles = ["🎲 Рандом", "Кинематографичный", "Книжный", "Нуар", "Драматичный", "Ироничный", "Мрачная сказка", "Эпический", "Психологичный", "Быстрый", "Свой стиль"];

function formatPremiumDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export function ProfileScreen({
  profile,
  onSaved,
  onShop,
  onInventory,
}: {
  profile?: Profile;
  onSaved: (profile: Profile) => void;
  onShop: () => void;
  onInventory: () => void;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(String(profile?.age || ""));
  const initialGenre = profile?.favorite_genre || "🎲 Рандом";
  const initialStyle = profile?.story_style || "🎲 Рандом";
  const [favoriteGenre, setFavoriteGenre] = useState(genres.includes(initialGenre) ? initialGenre : "Свой жанр");
  const [storyStyle, setStoryStyle] = useState(styles.includes(initialStyle) ? initialStyle : "Свой стиль");
  const [customGenre, setCustomGenre] = useState(genres.includes(initialGenre) ? "" : initialGenre);
  const [customStyle, setCustomStyle] = useState(styles.includes(initialStyle) ? "" : initialStyle);
  const [language, setLanguage] = useState(profile?.interface_language || "ru");
  const [autoImages, setAutoImages] = useState(Boolean(profile?.auto_generate_images));
  const [autoVoice, setAutoVoice] = useState(Boolean(profile?.auto_generate_voice));
  const [saving, setSaving] = useState(false);

  const parsedAge = Number.parseInt(age, 10);
  const safety =
    Number.isFinite(parsedAge) && parsedAge < 13
      ? "family"
      : Number.isFinite(parsedAge) && parsedAge < 18
      ? "teen"
      : "auto";
  const languageLabel = language === "ru" ? "Русский" : "English позже";
  const premiumUntil = formatPremiumDate(profile?.premium_until || profile?.subscription_expiry);
  const premiumActive = Boolean(profile?.premium_until);

  async function submit() {
    if (!name.trim() || !Number.isFinite(parsedAge)) return;
    setSaving(true);
    try {
      const result = await saveProfile({
        name: name.trim(),
        age: parsedAge,
        favorite_genre: favoriteGenre === "Свой жанр" ? customGenre.trim() || initialGenre : favoriteGenre,
        story_style: storyStyle === "Свой стиль" ? customStyle.trim() || initialStyle : storyStyle,
        interface_language: language,
        safety_mode: safety,
        auto_generate_images: autoImages,
        auto_generate_voice: autoVoice,
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
          <h2>{premiumActive ? "Premium активен" : "Premium не активен"}</h2>
          <button className="text-button" onClick={onShop} type="button">
            {premiumActive ? "Купить кредиты" : "Открыть Premium"}
          </button>
        </div>
        <p className="muted">
          Картинки: {profile?.image_credits || 0} купленных
          {profile?.premium_image_remaining ? ` · ${profile.premium_image_remaining} Premium` : ""} · Голос: {profile?.voice_credits || 0} купленных
          {profile?.premium_voice_remaining ? ` · ${profile.premium_voice_remaining} Premium` : ""} · Бонусные главы: {profile?.bonus_chapters || 0}
        </p>
        {premiumActive && (
          <p className="notice">
            Premium действует до {premiumUntil || "даты окончания"}. Квоты обновляются каждый месяц: картинки {profile?.premium_image_remaining || 0}/{profile?.premium_image_limit || 0}, голос{" "}
            {profile?.premium_voice_remaining || 0}/{profile?.premium_voice_limit || 0}.
          </p>
        )}
        <label className="toggle-row">
          <input checked={autoImages} onChange={(event) => setAutoImages(event.target.checked)} type="checkbox" />
          <span>Автоматически создавать картинку к новой главе</span>
        </label>
        <label className="toggle-row">
          <input checked={autoVoice} onChange={(event) => setAutoVoice(event.target.checked)} type="checkbox" />
          <span>Автоматически озвучивать новую главу</span>
        </label>
        <label className="field">
          <span>Имя</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" />
        </label>
        <label className="field">
          <span>Возраст</span>
          <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="Например, 30" />
        </label>
        <SelectSheet label="Любимый жанр" value={favoriteGenre} options={genres} onChange={setFavoriteGenre} />
        {favoriteGenre === "Свой жанр" && (
          <label className="field">
            <span>Свой жанр</span>
            <input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} placeholder="Например, магический реализм" />
          </label>
        )}
        <SelectSheet label="Стиль историй" value={storyStyle} options={styles} onChange={setStoryStyle} />
        {storyStyle === "Свой стиль" && (
          <label className="field">
            <span>Свой стиль</span>
            <input value={customStyle} onChange={(event) => setCustomStyle(event.target.value)} placeholder="Например, атмосферно и с мягким юмором" />
          </label>
        )}
        <SelectSheet label="Язык" value={languageLabel} options={["Русский", "English позже"]} onChange={(value) => setLanguage(value === "Русский" ? "ru" : "en")} />
        {Number.isFinite(parsedAge) && parsedAge < 13 && <p className="notice">Истории будут в безопасном семейном режиме.</p>}
        {Number.isFinite(parsedAge) && parsedAge >= 13 && parsedAge < 18 && (
          <p className="notice">Истории будут без взрослого контента и чрезмерной жестокости.</p>
        )}
        <button className="secondary-button" onClick={onInventory} type="button">
          <PackageOpen size={18} /> Открыть инвентарь
        </button>
      </section>

      <button className="primary-button tall" disabled={saving || !name.trim() || !Number.isFinite(parsedAge)} onClick={submit} type="button">
        {saving ? "Сохраняю..." : "Сохранить профиль"}
      </button>
    </section>
  );
}
