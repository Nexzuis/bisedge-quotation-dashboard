import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Standardized Checkbox component with consistent styling
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer hover:text-surface-100 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/50 focus:ring-offset-surface-900 disabled:opacity-50 cursor-pointer"
      />
      <div className="flex-1">
        <div className="text-sm text-surface-300">{label}</div>
        {description && (
          <div className="text-xs text-surface-500">{description}</div>
        )}
      </div>
    </label>
  );
};
