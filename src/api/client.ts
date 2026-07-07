import { getTelegram } from "../telegram/telegram";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.your-domain.com/api";

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
    const text = await response.text();
    let detail: unknown = text;
    try {
      detail = JSON.parse(text);
    } catch {
      detail = text;
    }
    const error = new Error(typeof detail === "string" ? detail : `API error ${response.status}`);
    (error as Error & { status?: number; detail?: unknown }).status = response.status;
    (error as Error & { status?: number; detail?: unknown }).detail = detail;
    throw error;
  }

  return response.json();
}
