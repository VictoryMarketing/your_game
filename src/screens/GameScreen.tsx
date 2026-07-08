import { Image, Mic, PackageOpen, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PaymentRequiredError } from "../api/client";
import { answerGame, customAnswerGame, generateImage, generateVoice, updateGameSettings } from "../api/gameApi";
import type { Choice, GameSession, Profile } from "../api/types";
import { ChoiceCard } from "../components/ChoiceCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { SceneCard } from "../components/SceneCard";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { LimitStateCard } from "../components/LimitStateCard";
import { haptic, notify } from "../telegram/telegram";

type Props = {
  game: GameSession | null | undefined;
  profile?: Profile;
  onGame: (game: GameSession) => void;
  onInventory: () => void;
  onPaywall: (reason: string) => void;
};

export function GameScreen({ game, profile, onGame, onInventory, onPaywall }: Props) {
  const [busy, setBusy] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [custom, setCustom] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | undefined>(game?.current_chapter?.voice_url);
  const chapter = game?.current_chapter;
  const choices = useMemo(() => chapter?.choices || [], [chapter]);

  useEffect(() => {
    setVoiceUrl(game?.current_chapter?.voice_url);
  }, [game?.current_chapter?.id, game?.current_chapter?.voice_url]);

  if (!game || !chapter) {
    return (
      <section className="empty-state">
        <h1>Активной истории нет</h1>
        <p>Создай новую историю, чтобы начать прохождение.</p>
      </section>
    );
  }
  const activeGame = game;
  const activeChapter = chapter;

  async function run(action: () => Promise<GameSession>) {
    setBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const next = await action();
      haptic("medium");
      onGame(next);
      setCustom("");
      void runAutoMedia(next);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        onPaywall(err.reason);
      } else {
        notify("error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function select(choice: Choice) {
    if (choice.id === "custom") return;
    await run(() => answerGame(activeGame.id, choice.id));
  }

  async function sendCustom() {
    if (custom.trim().length < 3) return;
    await run(() => customAnswerGame(activeGame.id, custom.trim()));
  }

  async function image() {
    setImageBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateImage(activeGame.id);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, image_url: result.image_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      const reason = err instanceof PaymentRequiredError ? err.reason : "no_image_credits";
      setLimitReason(reason);
      onPaywall(reason);
    } finally {
      setImageBusy(false);
    }
  }

  async function voice() {
    setVoiceBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateVoice(activeGame.id);
      setVoiceUrl(result.voice_url);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, voice_url: result.voice_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      const reason = err instanceof PaymentRequiredError ? err.reason : "no_voice_credits";
      setLimitReason(reason);
      onPaywall(reason);
    } finally {
      setVoiceBusy(false);
    }
  }

  async function runAutoMedia(nextGame: GameSession) {
    let updated = nextGame;
    if (nextGame.auto_generate_images) {
      setImageBusy(true);
      try {
        const result = await generateImage(nextGame.id);
        updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, image_url: result.image_url } : updated.current_chapter };
        onGame(updated);
      } catch (err) {
        if (err instanceof PaymentRequiredError) setMediaNotice("Глава готова, но картинка не создана: закончились кредиты или Premium-квота.");
      } finally {
        setImageBusy(false);
      }
    }
    if (nextGame.auto_generate_voice) {
      setVoiceBusy(true);
      try {
        const result = await generateVoice(nextGame.id);
        setVoiceUrl(result.voice_url);
        updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, voice_url: result.voice_url } : updated.current_chapter };
        onGame(updated);
      } catch (err) {
        if (err instanceof PaymentRequiredError) setMediaNotice("Глава готова, но озвучка не создана: закончились кредиты или Premium-квота.");
      } finally {
        setVoiceBusy(false);
      }
    }
  }

  async function toggleAuto(kind: "image" | "voice") {
    const payload = kind === "image" ? { auto_generate_images: !activeGame.auto_generate_images } : { auto_generate_voice: !activeGame.auto_generate_voice };
    try {
      const next = await updateGameSettings(activeGame.id, payload);
      onGame(next);
      notify("success");
    } catch {
      notify("error");
    }
  }

  return (
    <section className="game-screen">
      {busy && <ChapterGenerationOverlay />}
      {!busy && imageBusy && <ChapterGenerationOverlay variant="image" />}
      {!busy && !imageBusy && voiceBusy && <ChapterGenerationOverlay variant="voice" />}
      <ProgressHeader game={game} profile={profile} />
      {limitReason && <LimitStateCard reason={limitReason} onPrimary={() => onPaywall(limitReason)} onSecondary={() => setLimitReason(null)} />}
      {mediaNotice && <p className="notice">{mediaNotice}</p>}
      <div className="auto-media-row">
        <button className={activeGame.auto_generate_images ? "chip active" : "chip"} onClick={() => toggleAuto("image")} type="button">
          Автокартинка {activeGame.auto_generate_images ? "вкл" : "выкл"}
        </button>
        <button className={activeGame.auto_generate_voice ? "chip active" : "chip"} onClick={() => toggleAuto("voice")} type="button">
          Автоозвучка {activeGame.auto_generate_voice ? "вкл" : "выкл"}
        </button>
      </div>
      {(imageBusy || voiceBusy) && <p className="notice">{imageBusy && voiceBusy ? "Готовлю картинку и озвучку..." : imageBusy ? "Готовлю картинку..." : "Готовлю озвучку..."}</p>}
      <SceneCard text={chapter.scene_text} imageUrl={chapter.image_url} onImage={image} />
      {voiceUrl && <audio controls src={voiceUrl} className="audio-player" />}

      <div className="choice-list">
        {choices.map((choice) => (
          <ChoiceCard key={choice.id} choice={choice} disabled={busy} onSelect={select} />
        ))}
      </div>

      <div className="custom-box">
        <input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Свой ход..." />
        <button disabled={busy || custom.trim().length < 3} onClick={sendCustom} type="button" aria-label="Отправить свой ход">
          <Send size={18} />
        </button>
      </div>

      <div className="game-actions">
        <button className="secondary-button" disabled={busy || imageBusy} onClick={image} type="button"><Image size={18} /> {imageBusy ? "Рисую..." : "Картинка"}</button>
        <button className="secondary-button" disabled={busy || voiceBusy} onClick={voice} type="button"><Mic size={18} /> {voiceBusy ? "Озвучиваю..." : "Озвучить"}</button>
        <button className="secondary-button" onClick={onInventory} type="button"><PackageOpen size={18} /> Инвентарь</button>
      </div>
    </section>
  );
}
