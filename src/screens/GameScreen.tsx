import { Image, Mic, PackageOpen, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { PaymentRequiredError } from "../api/client";
import { answerGame, customAnswerGame, generateImage, generateVoice } from "../api/gameApi";
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
  const [custom, setCustom] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | undefined>(game?.current_chapter?.voice_url);
  const chapter = game?.current_chapter;
  const choices = useMemo(() => chapter?.choices || [], [chapter]);

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
    try {
      const next = await action();
      haptic("medium");
      onGame(next);
      setCustom("");
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
    setBusy(true);
    setLimitReason(null);
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
      setBusy(false);
    }
  }

  async function voice() {
    setBusy(true);
    setLimitReason(null);
    try {
      const result = await generateVoice(activeGame.id);
      setVoiceUrl(result.voice_url);
      notify("success");
    } catch (err) {
      const reason = err instanceof PaymentRequiredError ? err.reason : "no_voice_credits";
      setLimitReason(reason);
      onPaywall(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="game-screen">
      {busy && <ChapterGenerationOverlay />}
      <ProgressHeader game={game} profile={profile} />
      {limitReason && <LimitStateCard reason={limitReason} onPrimary={() => onPaywall(limitReason)} onSecondary={() => setLimitReason(null)} />}
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
        <button className="secondary-button" disabled={busy} onClick={image} type="button"><Image size={18} /> Картинка</button>
        <button className="secondary-button" disabled={busy} onClick={voice} type="button"><Mic size={18} /> Озвучить</button>
        <button className="secondary-button" onClick={onInventory} type="button"><PackageOpen size={18} /> Инвентарь</button>
      </div>
    </section>
  );
}
