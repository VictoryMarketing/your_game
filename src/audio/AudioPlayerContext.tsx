import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackClientEvent } from "../api/eventsApi";

export type AudioTrack = {
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  sessionId?: string;
};

type AudioPlayerState = {
  track: AudioTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  volume: number;
  toggle: (track?: AudioTrack) => void;
  seek: (seconds: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  close: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerState | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<AudioTrack | null>(null);
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = ensureAudio();
    const updateTime = () => setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      const current = trackRef.current;
      if (current) void trackClientEvent("audio_complete", { track_id: current.id }, current.sessionId).catch(() => null);
    };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [ensureAudio]);

  const activate = useCallback((nextTrack: AudioTrack) => {
    const audio = ensureAudio();
    const resolvedUrl = new URL(nextTrack.url, window.location.href).href;
    if (trackRef.current?.id !== nextTrack.id || audio.src !== resolvedUrl) {
      audio.src = nextTrack.url;
      audio.currentTime = 0;
      audio.playbackRate = rate;
      audio.volume = volume;
      setCurrentTime(0);
      setDuration(0);
      trackRef.current = nextTrack;
      setTrack(nextTrack);
    }
    return audio;
  }, [ensureAudio, rate, volume]);

  const toggle = useCallback((nextTrack?: AudioTrack) => {
    const audio = nextTrack ? activate(nextTrack) : ensureAudio();
    if (!trackRef.current && !nextTrack) return;
    if (audio.paused) {
      void audio.play().then(() => {
        const current = trackRef.current;
        if (current) void trackClientEvent("audio_play", { track_id: current.id, rate: audio.playbackRate }, current.sessionId).catch(() => null);
      }).catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [activate, ensureAudio]);

  const seek = useCallback((seconds: number) => {
    const audio = ensureAudio();
    audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : seconds, seconds));
    setCurrentTime(audio.currentTime);
  }, [ensureAudio]);

  const setRate = useCallback((nextRate: number) => {
    const safeRate = Math.max(0.5, Math.min(2, nextRate));
    ensureAudio().playbackRate = safeRate;
    setRateState(safeRate);
    const current = trackRef.current;
    if (current) void trackClientEvent("audio_speed_change", { track_id: current.id, rate: safeRate }, current.sessionId).catch(() => null);
  }, [ensureAudio]);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(1, nextVolume));
    ensureAudio().volume = safeVolume;
    setVolumeState(safeVolume);
  }, [ensureAudio]);

  const close = useCallback(() => {
    const audio = ensureAudio();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    trackRef.current = null;
    setTrack(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [ensureAudio]);

  const value = useMemo<AudioPlayerState>(() => ({
    track,
    playing,
    currentTime,
    duration,
    rate,
    volume,
    toggle,
    seek,
    setRate,
    setVolume,
    close,
  }), [track, playing, currentTime, duration, rate, volume, toggle, seek, setRate, setVolume, close]);

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const value = useContext(AudioPlayerContext);
  if (!value) throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  return value;
}
