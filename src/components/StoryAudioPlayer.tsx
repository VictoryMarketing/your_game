import { Pause, Play, Volume1, Volume2, X } from "lucide-react";
import type { CSSProperties } from "react";
import type { AudioTrack } from "../audio/AudioPlayerContext";
import { useAudioPlayer } from "../audio/AudioPlayerContext";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StoryAudioPlayer({ track, variant = "inline", closeable = false }: { track: AudioTrack; variant?: "inline" | "dock"; closeable?: boolean }) {
  const player = useAudioPlayer();
  const active = player.track?.id === track.id;
  const currentTime = active ? player.currentTime : 0;
  const duration = active ? player.duration : 0;
  const progress = duration > 0 ? currentTime / duration : 0;
  return (
    <section className={`story-audio-player ${variant}`} aria-label={`Озвучка: ${track.title}`}>
      <button className="audio-play-button" onClick={() => player.toggle(track)} type="button" aria-label={active && player.playing ? "Пауза" : "Воспроизвести озвучку"}>
        {active && player.playing ? <Pause size={variant === "dock" ? 17 : 20} /> : <Play size={variant === "dock" ? 17 : 20} />}
      </button>
      <div className="audio-main">
        <div className="audio-title-row">
          <span><strong>{track.title}</strong>{track.subtitle && <small>{track.subtitle}</small>}</span>
          <time>{formatTime(currentTime)} / {formatTime(duration)}</time>
        </div>
        <input
          aria-label="Позиция озвучки"
          className="audio-progress"
          max={Math.max(1, duration)}
          min="0"
          onChange={(event) => {
            if (!active) player.toggle(track);
            player.seek(Number(event.target.value));
          }}
          style={{ "--audio-progress": `${Math.round(progress * 100)}%` } as CSSProperties}
          type="range"
          value={Math.min(currentTime, Math.max(1, duration))}
        />
      </div>
      <label className="audio-rate">
        <span className="sr-only">Скорость</span>
        <select aria-label="Скорость воспроизведения" onChange={(event) => player.setRate(Number(event.target.value))} value={player.rate}>
          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
      </label>
      {variant === "inline" && (
        <label className="audio-volume">
          {player.volume > 0.35 ? <Volume2 size={17} /> : <Volume1 size={17} />}
          <input aria-label="Громкость" max="1" min="0" onChange={(event) => player.setVolume(Number(event.target.value))} step="0.05" type="range" value={player.volume} />
        </label>
      )}
      {closeable && <button className="audio-close" onClick={player.close} type="button" aria-label="Закрыть плеер"><X size={16} /></button>}
    </section>
  );
}

export function PersistentAudioDock() {
  const player = useAudioPlayer();
  if (!player.track) return null;
  return <div className="persistent-audio-dock"><StoryAudioPlayer closeable track={player.track} variant="dock" /></div>;
}
