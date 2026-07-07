import { Image, Mic, PackageOpen, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { answerGame, customAnswerGame, generateImage, generateVoice } from "../api/gameApi";
import type { Choice, GameSession, Profile } from "../api/types";
import { ChoiceCard } from "../components/ChoiceCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { SceneCard } from "../components/SceneCard";
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
    try {
      const next = await action();
      haptic("medium");
      onGame(next);
      setCustom("");
    } catch (err) {
      const detail = (err as Error & { status?: number; detail?: { detail?: { message?: string } } }).detail;
      const message = detail?.detail?.message || (err instanceof Error ? err.message : "Действие недоступно");
      if ((err as Error & { status?: number }).status === 402) {
        onPaywall(message);
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
    try {
      const result = await generateImage(activeGame.id);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, image_url: result.image_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Нужен кредит картинки";
      onPaywall(message);
    } finally {
      setBusy(false);
    }
  }

  async function voice() {
    setBusy(true);
    try {
      const result = await generateVoice(activeGame.id);
      setVoiceUrl(result.voice_url);
      notify("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Нужен голосовой кредит";
      onPaywall(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="game-screen">
      <ProgressHeader game={game} profile={profile} />
      <SceneCard text={chapter.scene_text} imageUrl={chapter.image_url} />
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
