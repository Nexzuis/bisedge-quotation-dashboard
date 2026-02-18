import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

/**
 * Standardized Tooltip component using Radix UI primitives
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="glass-brand px-3 py-1.5 rounded-md text-xs text-surface-100 shadow-lg z-50 max-w-xs"
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-brand-500/20" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
