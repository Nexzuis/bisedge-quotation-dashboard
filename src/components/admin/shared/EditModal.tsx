import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  loading?: boolean;
}

const EditModal = ({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  loading = false,
}: EditModalProps) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
          <h2 id="edit-modal-title" className="text-2xl font-bold text-surface-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700/50 rounded-lg text-surface-100/60 hover:text-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditModal;
