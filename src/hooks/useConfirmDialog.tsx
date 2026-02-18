import { useState } from 'react';
import ConfirmDialog from '../components/admin/shared/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * Hook for promise-based confirm dialogs
 * Returns a confirm function and dialog element
 *
 * @example
 * const { confirm, ConfirmDialogElement } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Quote',
 *     message: 'Are you sure you want to delete this quote?',
 *     variant: 'danger',
 *     confirmText: 'Delete'
 *   });
 *   if (confirmed) {
 *     // proceed with deletion
 *   }
 * };
 *
 * return (
 *   <>
 *     {ConfirmDialogElement}
 *     <button onClick={handleDelete}>Delete</button>
 *   </>
 * );
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        ...options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    dialogState.resolve?.(true);
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    dialogState.resolve?.(false);
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialogElement = (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onConfirm={handleConfirm}
      onClose={handleCancel}
      title={dialogState.title}
      message={dialogState.message}
      variant={dialogState.variant}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
    />
  );

  return {
    confirm,
    ConfirmDialogElement,
  };
}
