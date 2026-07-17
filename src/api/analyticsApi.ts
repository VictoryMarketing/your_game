import { apiFetch } from "./client";

export type AnalyticsOverview = {
  generated_at: string;
  period_days: number;
  summary: {
    total_users: number;
    telegram_users: number;
    web_users: number;
    new_users: number;
    active_users: number;
    returning_users: number;
    return_rate: number;
    paid_orders: number;
    payers: number;
    rub_revenue: number;
    stars_revenue: number;
    arppu_rub: number;
    average_chapters_per_started_story: number;
    open_support: number;
  };
  daily: Array<{ date: string; active_users: number; new_users: number; chapters: number }>;
  funnel: Record<string, number>;
  retention: Record<string, { cohort: number; retained: number; rate: number }>;
  sessions: Record<string, number>;
  products: Array<{ product_code: string; currency: string; orders: number; revenue: number }>;
  recent_payments: Array<{ id: string; product_code: string; provider: string; currency: string; amount_value?: string; stars_amount: number; paid_at: string; name?: string; telegram_username?: string; email?: string }>;
  active_players: Array<{ user_id: string; name?: string; telegram_username?: string; email?: string; events: number; active_days: number; chapters: number; last_seen: string }>;
  genres: Array<{ genre: string; count: number }>;
  media_jobs: Array<{ job_type: string; status: string; count: number }>;
  top_events: Array<{ event_name: string; count: number; users: number }>;
};

export function getAnalyticsOverview(days = 30) {
  return apiFetch<AnalyticsOverview>(`/admin/analytics/overview?days=${days}`);
}

export type LlmProviderStatus = {
  active_provider: "openai" | "kimi";
  media_provider: "openai";
  providers: Record<"openai" | "kimi", {
    configured: boolean;
    first_model: string;
    planner_model?: string;
    first_chapter_model?: string;
    routine_model: string;
    base_url?: string;
  }>;
  check?: { provider: string; ok: boolean; latency_ms: number; models: string[] };
};

export function getLlmProviderStatus() {
  return apiFetch<LlmProviderStatus>("/admin/llm/provider");
}

export function checkLlmProvider(provider: "openai" | "kimi") {
  return apiFetch<{ provider: string; ok: boolean; latency_ms: number; models: string[] }>("/admin/llm/check", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export function switchLlmProvider(provider: "openai" | "kimi") {
  return apiFetch<LlmProviderStatus>("/admin/llm/provider", {
    method: "PUT",
    body: JSON.stringify({ provider }),
    timeoutMs: 20000,
  });
}
