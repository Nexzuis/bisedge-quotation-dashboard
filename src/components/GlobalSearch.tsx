import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Building2, User } from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';

interface SearchResult {
  id: string;
  type: 'company' | 'quote' | 'contact';
  title: string;
  subtitle: string;
  url: string;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return t.includes(q);
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { listCompanies } = useCompanies();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const found: SearchResult[] = [];

    try {
      const companies = await listCompanies();
      companies
        .filter((c) => fuzzyMatch(q, c.name) || fuzzyMatch(q, c.industry || ''))
        .slice(0, 5)
        .forEach((c) => {
          found.push({
            id: c.id,
            type: 'company',
            title: c.name,
            subtitle: c.pipelineStage || 'Lead',
            url: `/customers/${c.id}`,
          });
        });
    } catch {
      // ignore
    }

    setResults(found);
    setSelectedIndex(0);
  }, [listCompanies]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'company': return Building2;
      case 'quote': return FileText;
      case 'contact': return User;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="glass rounded-xl w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center px-4 border-b border-surface-700/50">
              <Search className="w-5 h-5 text-surface-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search companies, quotes, contacts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-surface-100 px-3 py-4 text-sm placeholder:text-surface-500"
              />
              <button onClick={() => setIsOpen(false)} className="text-surface-500 hover:text-surface-300" aria-label="Close search">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-64 overflow-y-auto p-2">
                {results.map((result, i) => {
                  const Icon = getIcon(result.type);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        i === selectedIndex ? 'bg-brand-500/20 text-surface-100' : 'text-surface-300 hover:bg-surface-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-surface-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{result.title}</div>
                        <div className="text-xs text-surface-500">{result.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {query.trim() && results.length === 0 && (
              <div className="p-6 text-center text-surface-500 text-sm">
                No results found for "{query}"
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-surface-700/50 flex items-center justify-between text-xs text-surface-500">
              <span>Navigate with arrow keys</span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-surface-700 rounded text-surface-400">Esc</kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
