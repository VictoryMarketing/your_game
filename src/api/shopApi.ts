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

export function getPaymentStatus(paymentId: string) {
  return apiFetch<{ payment_id: string; product_code: string; status: string; paid_at?: string; provider?: string; currency?: string; amount?: string }>(`/payments/${paymentId}/status`);
}

export type WebPaymentMethod = {
  code: "yookassa_sbp" | "yookassa_yoomoney" | "yookassa_yoomoney_test" | "cryptopay";
  title: string;
  description: string;
  available: boolean;
  test?: boolean;
  recurring_available?: boolean;
};

export function getWebPaymentMethods() {
  return apiFetch<{ methods: WebPaymentMethod[] }>("/payments/web/methods");
}

export function createWebPayment(productCode: string, provider: WebPaymentMethod["code"], autoRenew = false, returnUrl?: string) {
  return apiFetch<{ payment_id: string; provider: string; status: string; payment_url: string; amount: number; currency: string }>("/payments/web/create", {
    method: "POST",
    body: JSON.stringify({ product_code: productCode, provider, auto_renew: autoRenew, return_url: returnUrl || null }),
  });
}

export type BillingSubscription = {
  id: string;
  product_code: string;
  provider: string;
  status: string;
  period_months: number;
  amount_value: string;
  currency: string;
  next_charge_at?: string;
};

export function getSubscriptions() {
  return apiFetch<{ subscriptions: BillingSubscription[] }>("/payments/subscriptions");
}

export function cancelSubscription(subscriptionId: string) {
  return apiFetch<{ ok: boolean }>(`/payments/subscriptions/${subscriptionId}/cancel`, { method: "POST" });
}

export function prepareShare() {
  return apiFetch<{ deep_link: string; share_url: string }>("/share/prepare", { method: "POST" });
}

export function createShareCard(sessionId?: string) {
  return apiFetch<{ card_url: string; session_id?: string; title: string; result: string; deep_link: string; share_url: string }>("/share/card", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId || null }),
  });
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
