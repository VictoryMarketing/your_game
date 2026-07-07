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

export function getLeaderboard() {
  return apiFetch<{ leaders: Array<{ user_id: string; name: string; score: number }> }>("/leaderboard");
}

export function getAchievements() {
  return apiFetch<{ achievements: Array<{ key: string; title: string; description: string; earned_at: string }> }>("/achievements");
}
