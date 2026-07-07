import type { ReactNode } from "react";

export function StatPill({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="stat-pill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
