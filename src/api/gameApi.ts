import { apiFetch } from "./client";
import type { GameSession } from "./types";

export type StartSettings = {
  preset?: string;
  genre?: string;
  pace?: string;
  role?: string;
  risk?: string;
  difficulty?: string;
  atmosphere?: string;
  mode: "normal" | "iron";
};

export function startGame(settings: StartSettings) {
  return apiFetch<GameSession>("/game/start", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export function getCurrentGame() {
  return apiFetch<{ current_game: GameSession | null }>("/game/current");
}

export function answerGame(sessionId: string, choiceId: string) {
  return apiFetch<GameSession>(`/game/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ choice_id: choiceId }),
  });
}

export function customAnswerGame(sessionId: string, text: string) {
  return apiFetch<GameSession>(`/game/${sessionId}/custom-answer`, {
    method: "POST",
    body: JSON.stringify({ text }),
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
