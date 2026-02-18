import React from 'react';
import { Toaster } from 'sonner';

// Re-export toast function for easy imports
export { toast } from 'sonner';

/**
 * Toast Provider component with glass morphism styling
 * Add this to App.tsx inside AuthProvider, before AppContent
 */
export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'glass !border-surface-700/50 !bg-surface-800/95 !text-surface-100',
          title: '!text-surface-100 !font-semibold',
          description: '!text-surface-400 !text-sm',
          actionButton: '!bg-brand-500 !text-white !px-4 !py-2',
          cancelButton: '!bg-surface-700 !text-surface-300',
          success: '!border-l-4 !border-l-success',
          error: '!border-l-4 !border-l-danger',
          warning: '!border-l-4 !border-l-warning',
          info: '!border-l-4 !border-l-info',
        },
      }}
    />
  );
};
