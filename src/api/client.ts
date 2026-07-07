import { getTelegram } from "../telegram/telegram";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.your-domain.com/api";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `tma ${initData}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = { message: await response.text() };
    }
    const detail = typeof body === "object" && body !== null && "detail" in body ? (body as { detail?: unknown }).detail : body;
    if (response.status === 402) throw new PaymentRequiredError(detail);
    throw new ApiError(response.status, detail);
  }

  return response.json();
}
