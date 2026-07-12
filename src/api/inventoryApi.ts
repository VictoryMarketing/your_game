import { apiFetch } from "./client";
import type { InventoryPayload } from "./types";

export function getInventory() {
  return apiFetch<InventoryPayload>("/inventory");
}

export function setItemProtection(itemKey: string, protectedValue: boolean) {
  return apiFetch<InventoryPayload>(`/inventory/items/${encodeURIComponent(itemKey)}/protection`, {
    method: "POST",
    body: JSON.stringify({ protected: protectedValue }),
  });
}
