import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: AlertCircle,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`} aria-hidden="true">
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>

          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-xl font-bold text-surface-100 mb-2">{title}</h3>
            {message && <p className="text-surface-100/60">{message}</p>}
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-surface-100 rounded-lg transition-colors ${config.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
