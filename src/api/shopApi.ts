import { apiFetch } from "./client";
import type { Product } from "./types";

export function getProducts() {
  return apiFetch<{ products: Product[] }>("/shop");
}

export function createInvoice(productCode: string) {
  return apiFetch<{ payment_id: string; status: string; invoice_url?: string }>("/payments/invoice", {
    method: "POST",
    body: JSON.stringify({ product_code: productCode }),
  });
}

export function prepareShare() {
  return apiFetch<{ deep_link: string; share_url: string }>("/share/prepare", { method: "POST" });
}

export type LeaderboardMetric = "best_score" | "total_score" | "games_played";

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  name: string;
  username_mask?: string;
  score: number;
  best_score: number;
  total_score: number;
  games_played: number;
  is_current_user?: boolean;
};

export function getLeaderboard(metric: LeaderboardMetric = "best_score") {
  return apiFetch<{ metric: LeaderboardMetric; metric_label: string; leaders: LeaderboardEntry[] }>(`/leaderboard?metric=${metric}`);
}

export function getAchievements() {
  return apiFetch<{ achievements: Array<{ key: string; title: string; description: string; earned_at: string }> }>("/achievements");
}
