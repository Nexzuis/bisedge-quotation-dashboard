import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Building2, X } from 'lucide-react';
import { useCompanies } from '../../hooks/useCompanies';
import type { StoredCompany } from '../../db/interfaces';

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: StoredCompany) => void;
  onClear: () => void;
  linkedCompanyId?: string;
  label?: string;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
}

export function CompanyAutocomplete({
  value,
  onChange,
  onSelect,
  onClear,
  linkedCompanyId,
  label = 'Client / Company Name *',
  placeholder = 'e.g. Adcock Ingram',
  onOpenChange,
}: CompanyAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<StoredCompany[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef(0);
  const { searchCompanies } = useCompanies();

  // Synchronously notify parent of dropdown open/close
  const setIsOpenAndNotify = useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  // Position dropdown
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // Debounced search
  useEffect(() => {
    if (value.length < 2) {
      setResults([]);
      setIsOpenAndNotify(false);
      return;
    }

    const id = ++searchIdRef.current;
    const timer = setTimeout(async () => {
      const data = await searchCompanies(value);
      // Ignore stale results
      if (id !== searchIdRef.current) return;
      setResults(data);
      setIsOpenAndNotify(data.length > 0);
      setHighlightIndex(-1);
      updatePosition();
    }, 300);

    return () => clearTimeout(timer);
  }, [value, searchCompanies, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpenAndNotify(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Unlink when user edits text after linking
    if (linkedCompanyId) {
      onClear();
    }
  };

  const handleSelect = (company: StoredCompany) => {
    onSelect(company);
    setIsOpenAndNotify(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpenAndNotify(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < results.length) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    }
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-surface-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) { updatePosition(); setIsOpenAndNotify(true); } }}
          placeholder={placeholder}
          className={`input w-full text-sm ${linkedCompanyId ? 'pr-20' : ''}`}
        />
        {linkedCompanyId && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-semibold">
            <Building2 className="w-3 h-3" />
            Linked
            <button
              type="button"
              onClick={onClear}
              className="ml-0.5 hover:text-brand-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-surface-800 border border-surface-600 rounded-lg shadow-2xl overflow-hidden"
        >
          <div className="max-h-52 overflow-y-auto">
            {results.map((company, i) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  i === highlightIndex
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-surface-200 hover:bg-surface-700/50'
                }`}
              >
                <div className="font-medium truncate">
                  {company.name}
                  {company.tradingName && company.tradingName !== company.name && (
                    <span className="text-surface-400 font-normal ml-1">
                      ({company.tradingName})
                    </span>
                  )}
                </div>
                {company.city && (
                  <div className="text-[10px] text-surface-500 truncate">{company.city}</div>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
