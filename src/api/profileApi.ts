import { apiFetch } from "./client";
import type { FeatureFlags, HomePayload, Profile } from "./types";

export function createSession(startParam?: string) {
  return apiFetch<{ profile: Profile }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ start_param: startParam || null }),
  });
}

export type WebAuthResult = {
  ok: boolean;
  verification_required?: boolean;
  message?: string;
  profile?: Profile;
  user?: { id: string; first_name: string; mode: string };
};

export function registerWebAccount(payload: {
  name: string;
  email: string;
  password: string;
  terms_accepted: boolean;
  personal_data_consent: boolean;
  age_confirmed: boolean;
  legal_version: "2026-07-13";
}) {
  return apiFetch<WebAuthResult>("/auth/web/register", { method: "POST", body: JSON.stringify(payload) });
}

export function loginWebAccount(payload: { email: string; password: string }) {
  return apiFetch<WebAuthResult>("/auth/web/login", { method: "POST", body: JSON.stringify(payload) });
}

export function verifyWebEmail(token: string) {
  return apiFetch<WebAuthResult>("/auth/web/verify", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendVerificationEmail(email: string) {
  return apiFetch<WebAuthResult>("/auth/web/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function requestPasswordReset(email: string) {
  return apiFetch<WebAuthResult>("/auth/web/forgot", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetWebPassword(token: string, password: string) {
  return apiFetch<WebAuthResult>("/auth/web/reset", { method: "POST", body: JSON.stringify({ token, password }) });
}

export function logoutWebAccount() {
  return apiFetch<{ ok: boolean }>("/auth/web/logout", { method: "POST" });
}

export function getWebAuthStatus() {
  return apiFetch<{ authenticated: boolean; profile?: Profile }>("/auth/web/status");
}

export function getHome() {
  return apiFetch<HomePayload>("/home");
}

export function getFeatureFlags() {
  return apiFetch<{ flags: FeatureFlags }>("/feature-flags");
}

export function saveProfile(payload: {
  name: string;
  age: number;
  favorite_genre?: string;
  story_style?: string;
  interface_language?: string;
  safety_mode?: string;
  auto_generate_images?: boolean;
  auto_generate_voice?: boolean;
}) {
  return apiFetch<{ profile: Profile }>("/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
