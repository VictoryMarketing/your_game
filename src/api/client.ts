import { getTelegram } from "../telegram/telegram";

const ENV_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const FALLBACK_API_BASE_URLS = [
  "https://seven-identical-astrology-integer.trycloudflare.com/api",
  "https://steel-mrs-laptops-saturday.trycloudflare.com/api",
];

function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/g, "");
}

function apiBaseUrls(): string[] {
  const urls = [ENV_API_BASE_URL, ...FALLBACK_API_BASE_URLS]
    .filter(Boolean)
    .map(normalizeApiBaseUrl);
  return Array.from(new Set(urls));
}

export const API_BASE_URL = apiBaseUrls()[0];

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
  const bases = apiBaseUrls();
  let lastNetworkError: unknown = null;

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
      lastNetworkError = error;
      continue;
    }

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.clone().json();
      } catch {
        body = { message: await response.text() };
      }
      const detail = typeof body === "object" && body !== null && "detail" in body ? (body as { detail?: unknown }).detail : body;
      if (response.status === 402) throw new PaymentRequiredError(detail);
      throw new ApiError(response.status, detail);
    }

    return response.json();
  }

  throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Failed to fetch");
}
