import { PaymentRequiredError, apiEventStream, apiFetch } from "./client";
import type { GameSession } from "./types";

import type { StartSettings } from "./gameApi";

type JobType = "start" | "chapter" | "image" | "voice";

export type GenerationJob = {
  job_id: string;
  type: JobType;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  progress?: GenerationProgress | null;
  poll_after_ms?: number;
  result?: { game?: GameSession; image_url?: string; voice_url?: string } | null;
  error?: string | null;
};

export type GenerationProgress = {
  stage: string;
  chapter_title?: string;
  scene_text?: string;
  chars?: number;
  prose_complete?: boolean;
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
    if (detail.status === 402 || detail.reason === "no_image_credits" || detail.reason === "no_voice_credits") {
      return new PaymentRequiredError(detail);
    }
    return new Error(detail.message || "Операция не завершилась. Попробуйте ещё раз.");
  } catch {
    return new Error(raw);
  }
}

async function waitForJob(
  jobId: string,
  timeoutMs: number,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationJob> {
  const startedAt = Date.now();
  let delayMs = 1200;
  while (Date.now() - startedAt < timeoutMs) {
    const job = await apiFetch<GenerationJob>(`/jobs/${jobId}`);
    if (job.progress) onProgress?.(job.progress);
    if (job.status === "completed") return job;
    if (job.status === "failed") throw parseJobError(job.error);
    const serverDelay = Number(job.poll_after_ms || 0);
    const backgroundDelay = document.visibilityState === "hidden" ? 5000 : 0;
    const jitter = Math.floor(Math.random() * 250);
    delayMs = Math.min(3200, Math.max(delayMs + 120, serverDelay, backgroundDelay));
    await new Promise((resolve) => window.setTimeout(resolve, delayMs + jitter));
  }
  throw new Error("Генерация продолжается дольше обычного. Она сохранена в очереди; откройте историю чуть позже.");
}

async function waitForJobStream(
  jobId: string,
  timeoutMs: number,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationJob> {
  let terminal: GenerationJob | null = null;
  try {
    await apiEventStream<GenerationJob>(`/jobs/${jobId}/stream`, (job) => {
      if (job.progress) onProgress?.(job.progress);
      if (job.status === "completed" || job.status === "failed") terminal = job;
    });
  } catch {
    // A proxy or mobile network may interrupt SSE; the durable job continues.
  }
  if (!terminal) return waitForJob(jobId, timeoutMs, onProgress);
  const completed = terminal as GenerationJob;
  if (completed.status === "failed") throw parseJobError(completed.error);
  return completed;
}

export async function generateChapterJob(
  sessionId: string,
  payload: { choiceId?: string; customInput?: string; itemKey?: string },
  onProgress?: (progress: GenerationProgress) => void,
) {
  const queued = await startJob("chapter", {
    session_id: sessionId,
    choice_id: payload.choiceId,
    custom_input: payload.customInput,
    item_key: payload.itemKey,
  });
  const completed = await waitForJobStream(queued.job_id, 15 * 60_000, onProgress);
  if (!completed.result?.game) throw new Error("Глава создана без игрового состояния.");
  return completed.result.game;
}

export async function generateGameStartJob(settings: StartSettings, onProgress?: (progress: GenerationProgress) => void) {
  const queued = await startGameJobRequest(settings);
  const completed = await waitForJobStream(queued.job_id, 15 * 60_000, onProgress);
  if (!completed.result?.game) throw new Error("История создана без игрового состояния.");
  return completed.result.game;
}

export async function generateImageJob(sessionId: string) {
  const queued = await startJob("image", { session_id: sessionId });
  const completed = await waitForJob(queued.job_id, 6 * 60_000);
  if (!completed.result?.image_url) throw new Error("Иллюстрация не была сохранена.");
  return { image_url: completed.result.image_url };
}

export async function generateVoiceJob(sessionId: string) {
  const queued = await startJob("voice", { session_id: sessionId });
  const completed = await waitForJob(queued.job_id, 5 * 60_000);
  if (!completed.result?.voice_url) throw new Error("Озвучка не была сохранена.");
  return { voice_url: completed.result.voice_url };
}
