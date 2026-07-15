import { BookOpen, ExternalLink, Image, Mic, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PaymentRequiredError } from "../api/client";
import { getGame } from "../api/gameApi";
import { generateImageJob, generateVoiceJob } from "../api/jobApi";
import { createShareCard } from "../api/shopApi";
import type { StoryShare } from "../api/shopApi";
import type { GameSession, Profile } from "../api/types";
import type { AudioTrack } from "../audio/AudioPlayerContext";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { SceneCard } from "../components/SceneCard";
import { StoryAudioPlayer } from "../components/StoryAudioPlayer";
import { getTelegram, isTelegram, notify } from "../telegram/telegram";

const traitLabels: Record<string, string> = {
  bravery: "храбрость",
  cunning: "хитрость",
  empathy: "эмпатия",
  logic: "логика",
};

type Props = {
  game?: GameSession | null;
  profile?: Profile;
  onGame: (game: GameSession) => void;
  onPaywall: (reason: string) => void;
  onNewGame: () => void;
};

function dominantTrait(game?: GameSession | null) {
  const traits = game?.state?.traits || {};
  const [key, value] = Object.entries(traits).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || ["logic", 0];
  return `${traitLabels[key] || key} ${value}`;
}

function endingTone(game?: GameSession | null) {
  const score = game?.score || 0;
  const world = game?.state?.world || {};
  const threat = Number(world.threat || 0);
  if (score >= 40 && threat <= 5) return "Сильная концовка: герой сохранил контроль и закрыл главные угрозы.";
  if (score >= 15) return "Неоднозначная победа: цель близко, но часть цены осталась в мире.";
  if (threat >= 10 || score < 0) return "Тяжёлый финал: ошибки и риск привели к дорогим последствиям.";
  return "Смешанный финал: история завершилась без полного поражения, но с заметной ценой.";
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function FinalScreen({ game, profile, onGame, onPaywall, onNewGame }: Props) {
  const [publication, setPublication] = useState<StoryShare | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const chapter = game?.current_chapter;
  const scene = chapter?.scene_text;
  const world = game?.state?.world || {};
  const summary = game?.state?.final_summary;
  const imageCreditsAvailable = !profile || Number(profile.image_credits || 0) + Number(profile.premium_image_remaining || 0) > 0;
  const voiceCreditsAvailable = !profile || Number(profile.voice_credits || 0) + Number(profile.premium_voice_remaining || 0) > 0;
  const audioTrack = useMemo<AudioTrack | null>(() => {
    if (!game || !chapter?.voice_url || (chapter.voice_version || 0) < 2) return null;
    return {
      id: `${game.id}:${chapter.id}:${chapter.voice_url}`,
      url: chapter.voice_url,
      title: `Финальная глава ${chapter.chapter_number}`,
      subtitle: game.title,
      sessionId: game.id,
    };
  }, [chapter?.chapter_number, chapter?.id, chapter?.voice_url, chapter?.voice_version, game]);

  async function refreshGame() {
    if (!game?.id) return null;
    const refreshed = await getGame(game.id);
    onGame(refreshed);
    return refreshed;
  }

  async function createImage() {
    if (!game?.id || imageBusy) return;
    if (!imageCreditsAvailable) {
      onPaywall("no_image_credits");
      return;
    }
    setImageBusy(true);
    setMediaNotice(null);
    try {
      await generateImageJob(game.id);
      await refreshGame();
      setMediaNotice("Финальная иллюстрация готова и войдёт в опубликованную книгу.");
      notify("success");
    } catch (error) {
      if (error instanceof PaymentRequiredError) onPaywall(error.reason);
      else setMediaNotice(error instanceof Error ? error.message : "Не удалось создать финальную иллюстрацию. Кредит не списан.");
      notify("error");
    } finally {
      setImageBusy(false);
    }
  }

  async function createVoice() {
    if (!game?.id || voiceBusy) return;
    if (!voiceCreditsAvailable) {
      onPaywall("no_voice_credits");
      return;
    }
    setVoiceBusy(true);
    setMediaNotice(null);
    try {
      await generateVoiceJob(game.id);
      await refreshGame();
      setMediaNotice("Финальная озвучка готова и войдёт в опубликованную книгу.");
      notify("success");
    } catch (error) {
      if (error instanceof PaymentRequiredError) onPaywall(error.reason);
      else setMediaNotice(error instanceof Error ? error.message : "Не удалось создать финальную озвучку. Кредит не списан.");
      notify("error");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function buildPublication() {
    if (!game?.id || cardBusy) return publication;
    setCardBusy(true);
    try {
      const result = await createShareCard(game.id);
      setPublication(result);
      notify("success");
      return result;
    } catch {
      setMediaNotice("Не удалось собрать книгу. Попробуйте ещё раз чуть позже.");
      notify("error");
      return null;
    } finally {
      setCardBusy(false);
    }
  }

  function openBook(bookUrl?: string) {
    if (!bookUrl) return;
    const tg = getTelegram();
    if (tg?.openLink) tg.openLink(bookUrl);
    else window.open(bookUrl, "_blank", "noopener,noreferrer");
  }

  async function shareBook() {
    const result = publication || await buildPublication();
    if (!result) return;
    if (isTelegram() && getTelegram()?.openTelegramLink) {
      getTelegram()?.openTelegramLink?.(result.share_url);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: result.title, text: result.share_text, url: result.book_url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const copied = await copyText(result.book_url);
    setMediaNotice(copied ? "Ссылка на полную книгу скопирована." : "Не удалось скопировать ссылку. Откройте книгу и скопируйте адрес из браузера.");
    notify(copied ? "success" : "warning");
  }

  return (
    <section className="screen-stack final-screen">
      {(imageBusy || voiceBusy) && <ChapterGenerationOverlay variant={imageBusy ? "image" : "voice"} />}
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Финал</span>
        <h1>{summary?.title || game?.title || "История завершена"}</h1>
        <p>{summary ? `${summary.rarity_label} концовка · ${summary.playstyle_archetype}` : `Очки: ${game?.score || 0} · главный стиль: ${dominantTrait(game)}`}</p>
      </header>
      {mediaNotice && <p className="notice">{mediaNotice}</p>}
      {scene && chapter && (
        <>
          <SceneCard
            text={scene}
            imageUrl={chapter.image_url}
            onImage={chapter.image_url ? undefined : createImage}
            chapterNumber={chapter.chapter_number}
            mediaSlot={audioTrack ? <StoryAudioPlayer track={audioTrack} /> : undefined}
          />
          {audioTrack && <StoryAudioPlayer track={audioTrack} />}
          <div className="final-media-actions">
            {!chapter.image_url && <button className="secondary-button" disabled={imageBusy} onClick={createImage} type="button"><Image size={18} /> Создать картинку</button>}
            {!audioTrack && <button className="secondary-button" disabled={voiceBusy} onClick={createVoice} type="button"><Mic size={18} /> Озвучить финал</button>}
          </div>
        </>
      )}
      <section className="panel">
        <h2>Итог прохождения</h2>
        <p>{summary?.hero_fate || endingTone(game)}</p>
        {summary?.moral_path && <p><strong>Путь героя:</strong> {summary.moral_path}</p>}
        <p>{summary?.world_fate || `Мир после финала: репутация ${world.reputation || 0}, ресурсы ${world.resources || 0}, угроза ${world.threat || 0}.`}</p>
      </section>
      {summary && <section className="final-ledger">
        {summary.key_decisions.length > 0 && <div><span className="eyebrow">Решения, изменившие ветку</span>{summary.key_decisions.map((item) => <p key={item}>«{item}»</p>)}</div>}
        {summary.npc_fates.length > 0 && <div><span className="eyebrow">Судьбы персонажей</span>{summary.npc_fates.map((item) => <p key={item.name}><strong>{item.name}</strong> · {item.fate}</p>)}</div>}
        <div><span className="eyebrow">Тайны</span><p>Найдено секретов: {summary.secrets_found.length}</p><p>Осталось незакрытых линий: {summary.missed_mysteries}</p></div>
      </section>}
      <section className="panel share-card-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Личная публикация</span>
            <h2>Собрать книгу целиком</h2>
          </div>
          <button className="text-button" disabled={cardBusy} onClick={buildPublication} type="button">
            {cardBusy ? "Собираю..." : publication ? "Обновить" : "Собрать"}
          </button>
        </div>
        {publication ? (
          <>
            <img src={publication.card_url} alt={`Обложка книги «${publication.title}»`} />
            <p>По ссылке откроется книга со всеми главами, уже созданными иллюстрациями и озвучками. В конце находится ваша реферальная кнопка.</p>
            <div className="share-book-actions">
              <button className="secondary-button" onClick={() => openBook(publication.book_url)} type="button"><BookOpen size={18} /> Читать книгу</button>
              <button className="primary-button" onClick={shareBook} type="button"><Share2 size={18} /> Поделиться</button>
            </div>
            <a className="public-book-link" href={publication.book_url} rel="noreferrer" target="_blank"><ExternalLink size={15} /> {publication.book_url}</a>
          </>
        ) : (
          <p>Создайте закрытую ссылку на свою законченную ветку. Книга не появится в поиске и будет доступна только тем, кому вы отправите ссылку.</p>
        )}
      </section>
      {!publication && <button className="primary-button tall" disabled={cardBusy} onClick={shareBook} type="button"><Share2 size={19} /> Собрать и поделиться книгой</button>}
      <button className="secondary-button" onClick={onNewGame} type="button">Играть ещё раз</button>
    </section>
  );
}
