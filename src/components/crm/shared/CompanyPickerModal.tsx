import { useState, useEffect } from 'react';
import { Search, Building2, Plus, X } from 'lucide-react';
import { useCompanies } from '../../../hooks/useCompanies';
import { useContacts } from '../../../hooks/useContacts';
import { Button } from '../../ui/Button';
import type { StoredCompany, StoredContact } from '../../../db/interfaces';

interface CompanyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: StoredCompany, primaryContact: StoredContact | null) => void;
  onSkip: () => void;
}

export function CompanyPickerModal({ isOpen, onClose, onSelect, onSkip }: CompanyPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const { searchCompanies, listCompanies } = useCompanies();
  const { getPrimary } = useContacts();

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      const data = query.trim()
        ? await searchCompanies(query)
        : await listCompanies();
      setResults(data);
      setLoading(false);
    };
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = async (company: StoredCompany) => {
    const primary = await getPrimary(company.id);
    onSelect(company, primary);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-picker-modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="glass rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700/50">
          <h2 id="company-picker-modal-title" className="text-lg font-bold text-surface-100">Link to Company</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search companies by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full pl-10 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <div className="text-center text-surface-500 py-6">Searching...</div>
          ) : results.length === 0 ? (
            <div className="text-center text-surface-500 py-6">No companies found</div>
          ) : (
            <div className="space-y-1">
              {results.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-700/50 transition-colors text-left"
                >
                  <div className="p-2 bg-brand-500/20 rounded-lg flex-shrink-0">
                    <Building2 className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-100 truncate">{company.name}</div>
                    <div className="text-xs text-surface-400 truncate">
                      {[company.city, company.province].filter(Boolean).join(', ') || 'No address'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-700/50">
          <Button variant="ghost" onClick={onSkip}>Skip (no company)</Button>
          <Button variant="ghost" icon={Plus} onClick={() => { onClose(); }}>
            Create New
          </Button>
        </div>
      </div>
    </div>
  );
}
