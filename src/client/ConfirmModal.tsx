import { XCircle, CheckCircle2 } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="neo-modal w-full max-w-md p-7">
        <h2 className="neo-label mb-4 text-xl">{title}</h2>
        <p className="mb-6 text-sm font-semibold">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="neo-button-secondary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2 ${
              isDangerous ? "neo-button-danger" : ""
            }`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
