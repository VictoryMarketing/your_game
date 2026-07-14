import { PaymentRequiredError, apiFetch } from "./client";
import type { GameSession } from "./types";

import type { StartSettings } from "./gameApi";

type JobType = "start" | "chapter" | "image" | "voice";

export type GenerationJob = {
  job_id: string;
  type: JobType;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  result?: { game?: GameSession; image_url?: string; voice_url?: string } | null;
  error?: string | null;
};

function startJob(type: JobType, payload: { session_id: string; choice_id?: string; custom_input?: string; item_key?: string }) {
  return apiFetch<GenerationJob>(`/jobs/${type}`, { method: "POST", body: JSON.stringify(payload) });
}

function startGameJobRequest(settings: StartSettings) {
  return apiFetch<GenerationJob>("/jobs/start", {
    method: "POST",
    body: JSON.stringify({ settings }),
  });
}

function parseJobError(raw?: string | null): Error {
  if (!raw) return new Error("Операция не завершилась. Попробуйте ещё раз.");
  try {
    const detail = JSON.parse(raw) as { status?: number; reason?: string; message?: string };
    if (detail.status === 402 || detail.reason) return new PaymentRequiredError(detail);
    return new Error(detail.message || "Операция не завершилась. Попробуйте ещё раз.");
  } catch {
    return new Error(raw);
  }
}

async function waitForJob(jobId: string, timeoutMs = 120_000): Promise<GenerationJob> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const job = await apiFetch<GenerationJob>(`/jobs/${jobId}`);
    if (job.status === "completed") return job;
    if (job.status === "failed") throw parseJobError(job.error);
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
  }
  throw new Error("Генерация продолжается дольше обычного. Она сохранена в очереди; откройте историю чуть позже.");
}

export async function generateChapterJob(sessionId: string, payload: { choiceId?: string; customInput?: string; itemKey?: string }) {
  const queued = await startJob("chapter", {
    session_id: sessionId,
    choice_id: payload.choiceId,
    custom_input: payload.customInput,
    item_key: payload.itemKey,
  });
  const completed = await waitForJob(queued.job_id);
  if (!completed.result?.game) throw new Error("Глава создана без игрового состояния.");
  return completed.result.game;
}

export async function generateGameStartJob(settings: StartSettings) {
  const queued = await startGameJobRequest(settings);
  const completed = await waitForJob(queued.job_id);
  if (!completed.result?.game) throw new Error("История создана без игрового состояния.");
  return completed.result.game;
}

export async function generateImageJob(sessionId: string) {
  const queued = await startJob("image", { session_id: sessionId });
  const completed = await waitForJob(queued.job_id);
  if (!completed.result?.image_url) throw new Error("Иллюстрация не была сохранена.");
  return { image_url: completed.result.image_url };
}

export async function generateVoiceJob(sessionId: string) {
  const queued = await startJob("voice", { session_id: sessionId });
  const completed = await waitForJob(queued.job_id);
  if (!completed.result?.voice_url) throw new Error("Озвучка не была сохранена.");
  return { voice_url: completed.result.voice_url };
}
