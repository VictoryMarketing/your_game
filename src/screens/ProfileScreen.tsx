import { useEffect, useRef, useState } from "react";
import { Activity, BookOpen, Crown, Headphones, LoaderCircle, LogOut, MailCheck, PackageOpen, Pause, Play, Settings2, ShieldCheck, Sparkles, UserRound, Volume2 } from "lucide-react";
import { getVoicePreview, getWebAuthStatus, saveProfile } from "../api/profileApi";
import { cancelSubscription, getSubscriptions, type BillingSubscription } from "../api/shopApi";
import type { Profile } from "../api/types";
import { SelectSheet } from "../components/SelectSheet";
import { notify } from "../telegram/telegram";
import { isTelegram } from "../telegram/telegram";

const genres = ["🎲 Рандом", "Фэнтези", "Городское фэнтези", "Детектив", "Триллер", "Sci-Fi", "Космоопера", "Мистика", "Выживание", "Приключение", "Роман", "Драма", "Семейная сага", "Киберпанк", "Постапокалипсис", "Историческое", "Тёмная академия", "Романтическое фэнтези", "Политическая интрига", "Пиратское приключение", "Нуар", "Военная драма", "Свой жанр"];
const styles = ["🎲 Рандом", "Кинематографичный", "Книжный", "Нуар", "Драматичный", "Ироничный", "Мрачная сказка", "Эпический", "Психологичный", "Быстрый", "Свой стиль"];
const voiceOptions = [
  ["coral", "Аврора", "выразительный и живой"], ["nova", "Лада", "мягкий и близкий"],
  ["shimmer", "Искра", "светлый и воздушный"], ["sage", "Мир", "спокойный и вдумчивый"],
  ["onyx", "Гранит", "глубокий и строгий"], ["echo", "Вектор", "уверенный и ясный"],
  ["ash", "Янтарь", "тёплый и камерный"], ["ballad", "Легенда", "театральный и широкий"],
  ["alloy", "Атлас", "нейтральный и точный"], ["fable", "Сказитель", "образный и сказочный"],
  ["verse", "Ритм", "динамичный и собранный"], ["marin", "Марина", "естественный и плавный"],
  ["cedar", "Кедр", "бархатный и спокойный"],
] as const;
const toneOptions = [
  ["balanced", "Естественно"], ["warm", "Тепло"], ["dramatic", "Драматично"],
  ["calm", "Спокойно"], ["mysterious", "Таинственно"],
] as const;

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
  onSupport,
  onAnalytics,
  onLogout,
  onSaveAccount,
}: {
  profile?: Profile;
  onSaved: (profile: Profile) => void;
  onShop: () => void;
  onInventory: () => void;
  onSupport: () => void;
  onAnalytics?: () => void;
  onLogout?: () => void;
  onSaveAccount?: () => void;
}) {
  const [tab, setTab] = useState<"hero" | "stories" | "collection" | "voice" | "account">("hero");
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
  const [voiceName, setVoiceName] = useState(profile?.voice_name || "coral");
  const [voiceSpeed, setVoiceSpeed] = useState(profile?.voice_speed || 1);
  const [voiceTone, setVoiceTone] = useState(profile?.voice_tone || "balanced");
  const [saving, setSaving] = useState(false);
  const [webAuthenticated, setWebAuthenticated] = useState<boolean | null>(null);
  const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
  const [voicePreview, setVoicePreview] = useState<{ key: string; status: "idle" | "loading" | "playing" | "paused" }>({ key: "", status: "idle" });
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const previewRequest = useRef(0);

  useEffect(() => {
    if (isTelegram()) return;
    getWebAuthStatus().then((result) => {
      setWebAuthenticated(result.authenticated);
      if (result.authenticated) getSubscriptions().then((value) => setSubscriptions(value.subscriptions)).catch(() => setSubscriptions([]));
    }).catch(() => setWebAuthenticated(false));
  }, []);

  useEffect(() => () => {
    previewRequest.current += 1;
    previewAudio.current?.pause();
    previewAudio.current = null;
  }, []);

  useEffect(() => {
    previewRequest.current += 1;
    previewAudio.current?.pause();
    previewAudio.current = null;
    setVoicePreview({ key: "", status: "idle" });
  }, [voiceTone, voiceSpeed]);

  const parsedAge = Number.parseInt(age, 10);
  const safety =
    Number.isFinite(parsedAge) && parsedAge < 13
      ? "family"
      : Number.isFinite(parsedAge) && parsedAge < 18
      ? "teen"
      : "auto";
  const languageLabel = language === "ru" ? "Русский" : "English";
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
        voice_name: voiceName,
        voice_speed: voiceSpeed,
        voice_tone: voiceTone,
      });
      notify("success");
      onSaved(result.profile);
    } catch {
      notify("error");
    } finally {
      setSaving(false);
    }
  }

  async function playPreview(voice: string) {
    const key = `${voice}:${voiceTone}:${voiceSpeed.toFixed(2)}`;
    const currentAudio = previewAudio.current;
    if (voicePreview.key === key && currentAudio) {
      if (voicePreview.status === "playing") {
        currentAudio.pause();
        setVoicePreview({ key, status: "paused" });
      } else {
        await currentAudio.play();
        setVoicePreview({ key, status: "playing" });
      }
      return;
    }
    const requestId = previewRequest.current + 1;
    previewRequest.current = requestId;
    currentAudio?.pause();
    previewAudio.current = null;
    setVoiceName(voice);
    setVoicePreview({ key, status: "loading" });
    try {
      const result = await getVoicePreview(voice, voiceTone, voiceSpeed);
      if (previewRequest.current !== requestId) return;
      const audio = new Audio(result.voice_url);
      previewAudio.current = audio;
      audio.onended = () => setVoicePreview({ key, status: "idle" });
      audio.onerror = () => setVoicePreview({ key, status: "idle" });
      await audio.play();
      setVoicePreview({ key, status: "playing" });
    } catch {
      if (previewRequest.current === requestId) setVoicePreview({ key, status: "idle" });
      notify("error");
    }
  }

  return (
    <section className="screen-stack profile-screen">
      <header className="profile-hero-v3">
        <div className="profile-avatar"><UserRound size={30} /></div>
        <div>
          <span className="eyebrow">Мой герой</span>
          <h1>{profile?.name || "Игрок"}</h1>
          <p>Уровень {profile?.level || 1} · серия {profile?.daily_streak || 0} дней</p>
        </div>
        {premiumActive && <span className="premium-seal"><Crown size={15} /> Premium</span>}
      </header>

      <nav className="profile-tabs" aria-label="Разделы профиля">
        <button className={tab === "hero" ? "active" : ""} onClick={() => setTab("hero")} type="button"><UserRound size={17} /><span>Герой</span></button>
        <button className={tab === "stories" ? "active" : ""} onClick={() => setTab("stories")} type="button"><BookOpen size={17} /><span>Истории</span></button>
        <button className={tab === "collection" ? "active" : ""} onClick={() => setTab("collection")} type="button"><Sparkles size={17} /><span>Коллекция</span></button>
        <button className={tab === "voice" ? "active" : ""} onClick={() => setTab("voice")} type="button"><Volume2 size={17} /><span>Голос</span></button>
        <button className={tab === "account" ? "active" : ""} onClick={() => setTab("account")} type="button"><Settings2 size={17} /><span>Аккаунт</span></button>
      </nav>

      {tab === "hero" && <>
        <section className="profile-vitals">
          <div><span>Опыт</span><strong>{profile?.total_xp || 0}</strong></div>
          <div><span>Рефералы</span><strong>{profile?.referrals_count || 0}</strong></div>
          <div><span>Жанр</span><strong>{profile?.favorite_genre || "Рандом"}</strong></div>
          <div><span>Стиль</span><strong>{profile?.story_style || "Рандом"}</strong></div>
        </section>
        <section className={premiumActive ? "panel premium-profile-card active" : "panel premium-profile-card"}>
          <div className="section-head"><div><span className="eyebrow">Статус</span><h2>{premiumActive ? "Premium активен" : "Бесплатный режим"}</h2></div><Crown size={24} /></div>
          <p>{premiumActive ? `Действует до ${premiumUntil || "даты окончания"}` : "Premium снимает дневной лимит и включает ежемесячные медиакредиты."}</p>
          <button className="secondary-button" onClick={onShop} type="button">{premiumActive ? "Кредиты и продление" : "Смотреть Premium"}</button>
        </section>
      </>}

      {tab === "stories" && <section className="panel form-panel profile-section-enter">
        <div className="section-head"><div><span className="eyebrow">Настройки</span><h2>Мои истории</h2></div><BookOpen size={23} /></div>
        <label className="switch-row">
          <span><strong>Автокартинка</strong><small>Создавать иллюстрацию после главы</small></span>
          <input checked={autoImages} onChange={(event) => setAutoImages(event.target.checked)} type="checkbox" />
        </label>
        <label className="switch-row">
          <span><strong>Автоозвучка</strong><small>Готовить голос рассказчика автоматически</small></span>
          <input checked={autoVoice} onChange={(event) => setAutoVoice(event.target.checked)} type="checkbox" />
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
        <button className="primary-button tall" disabled={saving || !name.trim() || !Number.isFinite(parsedAge)} onClick={submit} type="button">{saving ? "Сохраняю..." : "Сохранить настройки"}</button>
      </section>}

      {tab === "collection" && <section className="profile-section-enter screen-stack compact-stack">
        <section className="profile-resource-grid">
          <div><span>Картинки</span><strong>{(profile?.image_credits || 0) + (profile?.premium_image_remaining || 0)}</strong><small>{profile?.premium_image_remaining || 0} из Premium</small></div>
          <div><span>Озвучки</span><strong>{(profile?.voice_credits || 0) + (profile?.premium_voice_remaining || 0)}</strong><small>{profile?.premium_voice_remaining || 0} из Premium</small></div>
          <div><span>Ветки</span><strong>{profile?.branch_tokens || 0}</strong><small>для новых линий</small></div>
          <div><span>Главы</span><strong>{profile?.unlimited_chapters ? "∞" : profile?.playable_chapters_remaining ?? 0}</strong><small>{profile?.unlimited_chapters ? "без дневного лимита" : `${profile?.bonus_chapters || 0} бонусных`}</small></div>
        </section>
        <button className="primary-button tall" onClick={onInventory} type="button"><PackageOpen size={19} /> Открыть инвентарь</button>
        <button className="secondary-button" onClick={onShop} type="button"><Sparkles size={18} /> Пополнить коллекцию</button>
      </section>}

      {tab === "voice" && <section className="panel form-panel profile-section-enter voice-profile-section">
        <div className="section-head"><div><span className="eyebrow">Рассказчик</span><h2>Голос истории</h2></div><Volume2 size={23} /></div>
        <p className="section-copy">Прослушивание образцов бесплатно. Выбранный голос, манера и темп применятся к следующей озвучке.</p>
        <div className="voice-preview-grid">
          {voiceOptions.map(([key, name, description]) => {
            const active = voiceName === key;
            const previewKey = `${key}:${voiceTone}:${voiceSpeed.toFixed(2)}`;
            const isCurrentPreview = voicePreview.key === previewKey;
            const loading = isCurrentPreview && voicePreview.status === "loading";
            const playing = isCurrentPreview && voicePreview.status === "playing";
            return <article className={active ? "voice-preview-card active" : "voice-preview-card"} key={key}>
              <button className="voice-select-button" onClick={() => setVoiceName(key)} type="button">
                <span><strong>{name}</strong><small>{description}</small></span>
                {active && <i>выбран</i>}
              </button>
              <button aria-label={playing ? `Поставить голос ${name} на паузу` : `Прослушать голос ${name}`} className="icon-button voice-preview-play" onClick={() => void playPreview(key)} type="button">
                {loading ? <LoaderCircle className="spin" size={18} /> : playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
            </article>;
          })}
        </div>
        <SelectSheet
          label="Манера чтения"
          value={toneOptions.find(([key]) => key === voiceTone)?.[1] || toneOptions[0][1]}
          options={toneOptions.map(([, label]) => label)}
          onChange={(label) => setVoiceTone(toneOptions.find(([, item]) => item === label)?.[0] || "balanced")}
        />
        <label className="voice-speed-control">
          <span><strong>Темп</strong><output>{voiceSpeed.toFixed(2)}×</output></span>
          <input min="0.75" max="1.25" step="0.05" type="range" value={voiceSpeed} onChange={(event) => setVoiceSpeed(Number(event.target.value))} />
          <small><span>медленнее</span><span>быстрее</span></small>
        </label>
        <p className="voice-preview-settings">Пример: {toneOptions.find(([key]) => key === voiceTone)?.[1] || "Естественно"} · {voiceSpeed.toFixed(2)}×</p>
        <button className="primary-button tall" disabled={saving} onClick={submit} type="button">{saving ? "Сохраняю..." : "Сохранить голос"}</button>
      </section>}

      {tab === "account" && <section className="panel form-panel profile-section-enter">
        <div className="section-head"><div><span className="eyebrow">Аккаунт</span><h2>Личные данные</h2></div><ShieldCheck size={23} /></div>
        <label className="field"><span>Имя</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" /></label>
        <label className="field"><span>Возраст</span><input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="Например, 30" /></label>
        {!isTelegram() && profile?.email && <div className="account-email-row"><MailCheck size={19} /><span><small>Email аккаунта</small><strong>{profile.email}</strong></span><i>{profile.email_verified ? "подтверждён" : "не подтверждён"}</i></div>}
        {!isTelegram() && subscriptions.filter((item) => item.status === "active").map((item) => <div className="account-subscription-row" key={item.id}><span><small>Автопродление Premium</small><strong>{item.amount_value} ₽ · раз в {item.period_months} мес.</strong></span><button className="text-button" onClick={async () => { await cancelSubscription(item.id); setSubscriptions((current) => current.map((sub) => sub.id === item.id ? { ...sub, status: "cancelled" } : sub)); notify("success"); }} type="button">Отключить</button></div>)}
        <SelectSheet label="Язык" value={languageLabel} options={["Русский", "English"]} onChange={(value) => setLanguage(value === "Русский" ? "ru" : "en")} />
        {Number.isFinite(parsedAge) && parsedAge < 18 && <p className="notice">Безопасный режим подстраивается под указанный возраст.</p>}
        <button className="primary-button" disabled={saving || !name.trim() || !Number.isFinite(parsedAge)} onClick={submit} type="button">{saving ? "Сохраняю..." : "Сохранить"}</button>
        <button className="secondary-button" onClick={onSupport} type="button"><Headphones size={18} /> Написать в техподдержку</button>
        {profile?.is_admin && onAnalytics && <button className="secondary-button admin-analytics-link" onClick={onAnalytics} type="button"><Activity size={18} /> Открыть аналитику игры</button>}
        {!isTelegram() && webAuthenticated === false && onSaveAccount && <button className="secondary-button" onClick={onSaveAccount} type="button"><ShieldCheck size={18} /> Сохранить прогресс через email</button>}
        {!isTelegram() && webAuthenticated && onLogout && <button className="danger-button account-logout" onClick={onLogout} type="button"><LogOut size={18} /> Выйти на этом устройстве</button>}
      </section>}
    </section>
  );
}
