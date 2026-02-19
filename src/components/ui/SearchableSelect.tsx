import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- Select --',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Position the dropdown relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Reposition on scroll/resize while open
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(!isOpen);
    if (isOpen) setSearch('');
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="w-full bg-surface-800/40 border border-surface-700/50 rounded-md px-3 py-1.5 text-xs font-mono flex items-center justify-between gap-1 text-left disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all duration-200"
      >
        <span className={`truncate ${selectedOption ? 'text-surface-100' : 'text-surface-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown - rendered via portal to escape stacking contexts */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          onKeyDown={handleKeyDown}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-surface-800 border border-surface-600 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Search box */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-surface-700">
            <Search className="w-3 h-3 text-surface-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="flex-1 bg-transparent text-xs text-surface-100 placeholder:text-surface-500 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-surface-400 hover:text-surface-200" aria-label="Clear search">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* Empty / clear option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full text-left px-2 py-1.5 text-xs text-surface-500 hover:bg-surface-700/50 transition-colors"
            >
              {placeholder}
            </button>

            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-xs text-surface-500 text-center">No matches</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-2 py-1.5 text-xs transition-colors truncate ${
                    option.value === value
                      ? 'bg-brand-500/20 text-brand-300 font-medium'
                      : 'text-surface-200 hover:bg-surface-700/50'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
