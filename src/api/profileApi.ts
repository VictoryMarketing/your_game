import { apiFetch } from "./client";
import type { HomePayload, Profile } from "./types";

export function createSession(startParam?: string) {
  return apiFetch<{ profile: Profile }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ start_param: startParam || null }),
  });
}

export function getHome() {
  return apiFetch<HomePayload>("/home");
}

export function saveProfile(payload: {
  name: string;
  age: number;
  favorite_genre?: string;
  story_style?: string;
  interface_language?: string;
  safety_mode?: string;
}) {
  return apiFetch<{ profile: Profile }>("/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
