import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmActionDialogProps {
  busy?: boolean;
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "default" | "danger";
}

export function ConfirmActionDialog({
  busy = false,
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "default",
}: ConfirmActionDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-app-ink/60 px-4" role="presentation">
      <section
        aria-describedby="confirm-action-description"
        aria-labelledby="confirm-action-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-[24px] bg-white p-5 text-app-ink shadow-phone"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-action-title" className="text-base font-black">{title}</h2>
            <p id="confirm-action-description" className="mt-2 text-sm font-bold leading-6 text-app-muted">{description}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted" aria-label="확인창 닫기">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-black disabled:opacity-50">
            취소
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 ${tone === "danger" ? "bg-red-600" : "bg-app-ink"}`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
