import { apiFetch } from "./client";

export function trackClientEvent(eventName: string, props: Record<string, unknown> = {}, sessionId?: string) {
  return apiFetch<{ ok: boolean }>("/events", {
    method: "POST",
    body: JSON.stringify({ event_name: eventName, props, session_id: sessionId }),
  });
}
