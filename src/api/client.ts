import { getTelegram } from "../telegram/telegram";

const ENV_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const KNOWN_WORKING_API_BASE_URL = "https://seven-identical-astrology-integer.trycloudflare.com/api";
const FALLBACK_API_BASE_URLS = [
  KNOWN_WORKING_API_BASE_URL,
  "https://steel-mrs-laptops-saturday.trycloudflare.com/api",
];
const API_BASE_CACHE_KEY = "yougame_api_base_url";

function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/g, "");
}

function apiBaseUrls(): string[] {
  const envUrl = normalizeApiBaseUrl(ENV_API_BASE_URL);
  const preferKnownTunnel = !envUrl || envUrl.includes("trycloudflare.com");
  const urls = (preferKnownTunnel ? [KNOWN_WORKING_API_BASE_URL, envUrl] : [envUrl, KNOWN_WORKING_API_BASE_URL])
    .concat(FALLBACK_API_BASE_URLS)
    .filter(Boolean)
    .map(normalizeApiBaseUrl);
  return Array.from(new Set(urls));
}

export const API_BASE_URL = apiBaseUrls()[0];

function cachedApiBaseUrl(): string | null {
  try {
    const cached = window.localStorage.getItem(API_BASE_CACHE_KEY);
    return cached ? normalizeApiBaseUrl(cached) : null;
  } catch {
    return null;
  }
}

function rememberApiBaseUrl(url: string) {
  try {
    window.localStorage.setItem(API_BASE_CACHE_KEY, normalizeApiBaseUrl(url));
  } catch {
    // localStorage can be disabled in some Telegram WebView contexts.
  }
}

function clearRememberedApiBaseUrl(url: string) {
  try {
    if (cachedApiBaseUrl() === normalizeApiBaseUrl(url)) {
      window.localStorage.removeItem(API_BASE_CACHE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function orderedApiBaseUrls(): string[] {
  const cached = cachedApiBaseUrl();
  const urls = apiBaseUrls();
  if (!cached || (cached.includes("trycloudflare.com") && cached !== KNOWN_WORKING_API_BASE_URL)) return urls;
  return Array.from(new Set([cached, ...urls]));
}

function shouldTryNextApiBase(response: Response): boolean {
  return [502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530].includes(response.status);
}

async function readErrorDetail(response: Response): Promise<unknown> {
  try {
    const body = await response.clone().json();
    return typeof body === "object" && body !== null && "detail" in body ? (body as { detail?: unknown }).detail : body;
  } catch {
    return { message: await response.text() };
  }
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
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
  }
}

export class PaymentRequiredError extends ApiError {
  reason: string;
  messageText: string;

  constructor(detail: unknown) {
    super(402, detail);
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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getTelegram()?.initData || "";
  const bases = orderedApiBaseUrls();
  let lastRetryableError: unknown = null;

  for (const baseUrl of bases) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `tma ${initData}`,
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      clearRememberedApiBaseUrl(baseUrl);
      lastRetryableError = error;
      continue;
    }

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      if (shouldTryNextApiBase(response)) {
        clearRememberedApiBaseUrl(baseUrl);
        lastRetryableError = new ApiError(response.status, detail);
        continue;
      }
      if (response.status === 402) throw new PaymentRequiredError(detail);
      throw new ApiError(response.status, detail);
    }

    rememberApiBaseUrl(baseUrl);
    return response.json();
  }

  throw lastRetryableError instanceof Error ? lastRetryableError : new Error("Failed to fetch");
}
