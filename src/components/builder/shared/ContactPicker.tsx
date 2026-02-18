import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useContacts } from '../../../hooks/useContacts';
import type { StoredContact } from '../../../db/interfaces';

interface ContactPickerProps {
  companyId: string;
  onSelect: (contact: StoredContact) => void;
  onManual: () => void;
}

export function ContactPicker({ companyId, onSelect, onManual }: ContactPickerProps) {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const { getByCompany } = useContacts();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedId('');
    getByCompany(companyId).then((data) => {
      if (cancelled) return;
      // Sort: primary first, then alphabetical by lastName
      const sorted = [...data].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.lastName.localeCompare(b.lastName);
      });
      setContacts(sorted);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [companyId, getByCompany]);

  if (loading) {
    return (
      <div className="text-xs text-surface-500 py-1">Loading contacts...</div>
    );
  }

  if (contacts.length === 0) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedId(val);

    if (val === '__manual__') {
      onManual();
      return;
    }

    const contact = contacts.find((c) => c.id === val);
    if (contact) onSelect(contact);
  };

  return (
    <div className="mb-4">
      <label className="flex items-center gap-1.5 text-sm font-medium text-surface-300 mb-1">
        <Users className="w-3.5 h-3.5" />
        Pick a Contact
      </label>
      <select
        value={selectedId}
        onChange={handleChange}
        className="input w-full text-sm"
      >
        <option value="">-- Select a contact --</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName}
            {c.title ? ` \u2014 ${c.title}` : ''}
            {c.isPrimary ? ' (Primary)' : ''}
            {c.email ? ` \u00B7 ${c.email}` : ''}
          </option>
        ))}
        <option value="__manual__">Enter manually</option>
      </select>
    </div>
  );
}
