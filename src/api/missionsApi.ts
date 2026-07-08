import { apiFetch } from "./client";
import type { Mission } from "./types";

export function claimMission(missionKey: string) {
  return apiFetch<{ daily_reset_at: string; missions: Mission[] }>(`/missions/${missionKey}/claim`, {
    method: "POST",
  });
}
