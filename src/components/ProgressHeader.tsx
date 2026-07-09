import { Image, Mic, Star } from "lucide-react";
import type { GameSession, Profile } from "../api/types";

export function ProgressHeader({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const chapter = game?.current_chapter?.chapter_number || Math.max(1, (game?.chapter || 1) - 1);
  const premiumImages = profile?.premium_image_remaining || 0;
  const premiumVoices = profile?.premium_voice_remaining || 0;
  return (
    <header className="progress-header">
      <div>
        <strong>Глава {chapter}</strong>
        <span>{game?.title || "Твои правила"}</span>
      </div>
      <div className="resource-row">
        <span><Star size={15} /> {game?.score || 0}</span>
        <span><Image size={15} /> {profile?.image_credits || 0}{premiumImages ? ` + ${premiumImages} Premium` : ""}</span>
        <span><Mic size={15} /> {profile?.voice_credits || 0}{premiumVoices ? ` + ${premiumVoices} Premium` : ""}</span>
      </div>
    </header>
  );
}
