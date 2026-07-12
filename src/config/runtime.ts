const rawApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const APP_ENV = import.meta.env.MODE || (import.meta.env.PROD ? "production" : "development");
export const BUILD_ID = String(import.meta.env.VITE_BUILD_ID || "local").trim();
export const APP_PUBLIC_URL = String(import.meta.env.VITE_APP_PUBLIC_URL || "https://yourrulesgame.ru/").trim();

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/g, "");
}

function defaultDevApiUrl(): string {
  return "http://127.0.0.1:8088/api";
}

export function runtimeConfigError(): string | null {
  if (import.meta.env.PROD && !rawApiBaseUrl) {
    return "Frontend misconfigured: VITE_API_BASE_URL is required in production.";
  }
  return null;
}

export const API_BASE_URL = normalizeUrl(rawApiBaseUrl || defaultDevApiUrl());
