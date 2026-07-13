import { apiFetch } from "./client";

export type SupportRecord = {
  id: number;
  topic: string;
  status: string;
  text: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
};

export function createSupportRecord(payload: { topic: string; text: string; payment_id?: string }) {
  return apiFetch<{ ok: boolean; record_id: number; status: string }>("/support/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSupportRecords() {
  return apiFetch<{ records: SupportRecord[] }>("/support/records");
}
