import { apiFetch } from "./client";
import type { InventoryPayload } from "./types";

export function getInventory() {
  return apiFetch<InventoryPayload>("/inventory");
}

