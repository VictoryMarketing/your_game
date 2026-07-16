import { BookOpen, Image, Mic, Star } from "lucide-react";
import type { GameSession, Profile } from "../api/types";

export function ProgressHeader({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const chapter = game?.current_chapter?.chapter_number || Math.max(1, (game?.chapter || 1) - 1);
  const premiumImages = profile?.premium_image_remaining || 0;
  const premiumVoices = profile?.premium_voice_remaining || 0;
  const chapters = profile?.playable_chapters_remaining ?? 0;
  const images = (profile?.image_credits || 0) + premiumImages;
  const voices = (profile?.voice_credits || 0) + premiumVoices;
  return (
    <header className="progress-header">
      <div>
        <strong>Глава {chapter}</strong>
        <span>{game?.title || "Твои правила"}</span>
      </div>
      <div className="resource-row">
        <span title="Очки истории"><Star size={15} /> {game?.score || 0}</span>
        <span title="Доступные главы"><BookOpen size={15} /> {chapters}</span>
        <span title={`Картинки: ${profile?.image_credits || 0} купленных, ${premiumImages} Premium`}><Image size={15} /> {images}</span>
        <span title={`Озвучки: ${profile?.voice_credits || 0} купленных, ${premiumVoices} Premium`}><Mic size={15} /> {voices}</span>
      </div>
    </header>
  );
}
