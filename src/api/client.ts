import { API_BASE_URL } from "../config/runtime";
import { getTelegram } from "../telegram/telegram";

const REQUEST_TIMEOUT_MS = 15000;
const SAFE_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export { API_BASE_URL };

export class ApiError extends Error {
  status: number;
  detail: unknown;
  requestId?: string;

  constructor(status: number, detail: unknown, requestId?: string) {
    const message =
      typeof detail === "object" &&
      detail !== null &&
      "message" in detail &&
      typeof (detail as { message?: unknown }).message === "string"
        ? String((detail as { message: string }).message)
        : `API error ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.requestId = requestId;
  }
}

export class PaymentRequiredError extends ApiError {
  reason: string;
  messageText: string;

  constructor(detail: unknown, requestId?: string) {
    super(402, detail, requestId);
    const nested = typeof detail === "object" && detail !== null && "detail" in detail ? (detail as { detail?: unknown }).detail : undefined;
    const source = typeof nested === "object" && nested !== null ? nested : detail;
    this.name = "PaymentRequiredError";
    this.reason =
      typeof source === "object" && source !== null && "reason" in source && typeof (source as { reason?: unknown }).reason === "string"
        ? String((source as { reason: string }).reason)
        : "payment_required";
    this.messageText =
      typeof source === "object" && source !== null && "message" in source && typeof (source as { message?: unknown }).message === "string"
        ? String((source as { message: string }).message)
        : "Нужно пополнить кредиты или открыть Premium.";
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super("Не удалось загрузить игру: сервер не ответил вовремя.");
    this.name = "ApiTimeoutError";
  }
}

async function readErrorDetail(response: Response): Promise<unknown> {
  try {
    const body = await response.clone().json();
    return typeof body === "object" && body !== null && "detail" in body ? (body as { detail?: unknown }).detail : body;
  } catch {
    return { message: await response.text() };
  }
}

function requestHeaders(options: RequestInit, initData: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `tma ${initData}`,
    ...(options.headers || {}),
  };
}

function shouldRetry(method: string, status?: number): boolean {
  return method === "GET" && Boolean(status && SAFE_RETRY_STATUSES.has(status));
}

async function fetchOnce(path: string, options: RequestInit, signal: AbortSignal): Promise<Response> {
  const initData = getTelegram()?.initData || "";
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal,
    headers: requestHeaders(options, initData),
  });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  const attempts = method === "GET" ? 2 : 1;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchOnce(path, options, controller.signal);
      window.clearTimeout(timeout);
      const requestId = response.headers.get("x-request-id") || response.headers.get("x-amzn-trace-id") || undefined;
      if (!response.ok) {
        const detail = await readErrorDetail(response);
        if (shouldRetry(method, response.status) && attempt + 1 < attempts) {
          lastError = new ApiError(response.status, detail, requestId);
          continue;
        }
        if (response.status === 402) throw new PaymentRequiredError(detail, requestId);
        throw new ApiError(response.status, detail, requestId);
      }
      return response.json();
    } catch (error) {
      window.clearTimeout(timeout);
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiTimeoutError();
      } else {
        lastError = error;
      }
      if (method !== "GET" || attempt + 1 >= attempts) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Не удалось подключиться к серверу.");
}
