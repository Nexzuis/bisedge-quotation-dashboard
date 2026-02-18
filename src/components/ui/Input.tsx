import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

/**
 * Standardized Input component with consistent styling, error handling,
 * and accessible label association.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = '', id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = providedId ?? generatedId;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-300 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`input w-full text-sm ${
            error ? 'border-danger/50 focus:ring-danger/50' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <div id={`${inputId}-error`} className="text-xs text-danger mt-1" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
