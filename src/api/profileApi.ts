import { apiFetch } from "./client";
import type { FeatureFlags, HomePayload, Profile } from "./types";

export function createSession(startParam?: string) {
  return apiFetch<{ profile: Profile }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ start_param: startParam || null }),
  });
}

export function createWebGuestSession() {
  return apiFetch<{ profile: Profile; user: { id: string; first_name: string; mode?: string } }>("/auth/web-guest", {
    method: "POST",
    body: JSON.stringify({}),
  });
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
