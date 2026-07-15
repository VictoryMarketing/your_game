import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Trash2, X } from "lucide-react";
import { ModalPortal } from "./ModalPortal";

type Tone = "default" | "danger";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  busy = false,
  children,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: Tone;
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const Icon = tone === "danger" ? Trash2 : CheckCircle2;
  return (
    <ModalPortal className="confirm-dialog-backdrop" onClose={busy ? () => undefined : onClose}>
      <section className={`confirm-dialog-card ${tone}`} onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <button className="confirm-dialog-close" disabled={busy} onClick={onClose} type="button" aria-label="Закрыть">
          <X size={20} />
        </button>
        <span className="confirm-dialog-icon" aria-hidden="true"><Icon size={27} /></span>
        <div>
          <span className="eyebrow">Подтверждение</span>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{description}</p>
          {children}
        </div>
        {tone === "danger" && <p className="confirm-dialog-warning"><AlertTriangle size={17} /> Это действие нельзя отменить.</p>}
        <div className="confirm-dialog-actions">
          <button className="secondary-button" disabled={busy} onClick={onClose} type="button">Нет, отменить</button>
          <button className={tone === "danger" ? "danger-button" : "primary-button"} disabled={busy} onClick={onConfirm} type="button">
            {busy ? "Выполняю..." : confirmLabel}
          </button>
        </div>
      </section>
    </ModalPortal>
  );
}
