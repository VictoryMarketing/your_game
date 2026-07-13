import { Sparkles } from "lucide-react";

export function MagicLoader({ label, compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={compact ? "magic-loader compact" : "magic-loader"} role={label ? "status" : undefined}>
      <div className="generation-loader" aria-hidden="true">
        <span className="generation-loader-ring" />
        <span className="generation-loader-core"><Sparkles size={compact ? 17 : 20} /></span>
        <i /><i /><i />
      </div>
      {label && <p className="magic-loader-label">{label}</p>}
    </div>
  );
}
