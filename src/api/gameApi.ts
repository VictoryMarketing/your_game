import { apiFetch } from "./client";
import type { Chapter, GameSession } from "./types";

export type StartSettings = {
  challenge_seed?: string;
  challenge_mode?: boolean;
  preset?: string;
  genre?: string;
  pace?: string;
  tone?: string;
  role?: string;
  hero_role?: string;
  hero_name?: string;
  goal?: string;
  risk?: string;
  risk_level?: string;
  story_length?: string;
  difficulty?: string;
  atmosphere?: string;
  style?: string;
  custom_prompt?: string;
  must_include?: string[];
  avoid?: string[];
  forbidden_topics?: string;
  desired_elements?: string;
  setup_mode?: "quick" | "deep";
  start_policy?: "continue_existing" | "archive_old" | "finish_old" | "force_new";
  auto_generate_images?: boolean;
  auto_generate_voice?: boolean;
  mode: "normal" | "iron";
};

export type StartPolicy = NonNullable<StartSettings["start_policy"]>;

export function startGame(settings: StartSettings) {
  return apiFetch<GameSession>("/game/start", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export function getCurrentGame() {
  return apiFetch<{ current_game: GameSession | null }>("/game/current");
}

export function getGame(sessionId: string) {
  return apiFetch<GameSession>(`/game/${sessionId}`);
}

export function getGameHistory() {
  return apiFetch<{ history: GameSession[] }>("/game/history");
}

export function getArchivedGameChapters(sessionId: string) {
  return apiFetch<{ game: GameSession; chapters: Chapter[] }>(`/game/${sessionId}/chapters`);
}

export function answerGame(sessionId: string, choiceId: string, itemKey?: string) {
  return apiFetch<GameSession>(`/game/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ choice_id: choiceId, item_key: itemKey || undefined }),
  });
}

export function customAnswerGame(sessionId: string, text: string, itemKey?: string) {
  return apiFetch<GameSession>(`/game/${sessionId}/custom-answer`, {
    method: "POST",
    body: JSON.stringify({ text, item_key: itemKey || undefined }),
  });
}

export function transcribeAnswer(sessionId: string, audio: Blob) {
  return apiFetch<{ text: string }>(`/game/${sessionId}/transcribe-answer`, {
    method: "POST",
    body: audio,
    headers: { "Content-Type": audio.type || "audio/webm" },
    timeoutMs: 60_000,
  });
}

export function updateGameSettings(sessionId: string, payload: { auto_generate_images?: boolean; auto_generate_voice?: boolean }) {
  return apiFetch<GameSession>(`/game/${sessionId}/settings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateImage(sessionId: string) {
  return apiFetch<{ image_url: string }>(`/game/${sessionId}/image`, { method: "POST" });
}

export function generateVoice(sessionId: string) {
  return apiFetch<{ voice_url: string }>(`/game/${sessionId}/voice`, { method: "POST" });
}

export function abandonGame(sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/game/${sessionId}/abandon`, { method: "POST" });
}

export function archiveGame(sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/game/${sessionId}/archive`, { method: "POST" });
}

export function restoreGame(sessionId: string) {
  return apiFetch<GameSession>(`/game/${sessionId}/restore`, { method: "POST" });
}

export function finishGame(sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/game/${sessionId}/finish`, { method: "POST" });
}

export function forkGame(sessionId: string, chapterNumber: number) {
  return apiFetch<GameSession>(`/game/${sessionId}/fork`, {
    method: "POST",
    body: JSON.stringify({ chapter_number: chapterNumber }),
  });
}
