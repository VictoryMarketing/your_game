import { Image, Mic, Star } from "lucide-react";
import type { GameSession, Profile } from "../api/types";

export function ProgressHeader({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const chapter = game?.current_chapter?.chapter_number || Math.max(1, (game?.chapter || 1) - 1);
  return (
    <header className="progress-header">
      <div>
        <strong>Глава {chapter}/{game?.max_chapters || 37}</strong>
        <span>{game?.title || "YouGame"}</span>
      </div>
      <div className="resource-row">
        <span><Star size={15} /> {game?.score || 0}</span>
        <span><Image size={15} /> {profile?.image_credits || 0}</span>
        <span><Mic size={15} /> {profile?.voice_credits || 0}</span>
      </div>
    </header>
  );
}
