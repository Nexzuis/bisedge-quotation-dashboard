import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useActivities } from '../../../hooks/useActivities';
import { useContacts } from '../../../hooks/useContacts';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../ui/Toast';
import type { ActivityType } from '../../../types/crm';
import type { StoredContact } from '../../../db/interfaces';

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'site-visit', label: 'Site Visit' },
];

// Activity types that support a due date (scheduled/actionable items)
const DUE_DATE_TYPES: ActivityType[] = ['meeting', 'site-visit', 'call'];

interface AddActivityFormProps {
  companyId: string;
  onSaved: () => void;
}

export function AddActivityForm({ companyId, onSaved }: AddActivityFormProps) {
  const [type, setType] = useState<ActivityType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [saving, setSaving] = useState(false);
  const { saveActivity } = useActivities();
  const { getByCompany } = useContacts();
  const { user } = useAuth();

  const showDueDate = DUE_DATE_TYPES.includes(type);

  // Load contacts for this company
  useEffect(() => {
    if (!companyId) return;
    getByCompany(companyId).then(setContacts).catch(() => setContacts([]));
  }, [companyId]);

  // Clear due date when switching to a type that doesn't support it
  useEffect(() => {
    if (!showDueDate) {
      setDueDate('');
    }
  }, [type, showDueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await saveActivity({
        companyId,
        contactId,
        quoteId: '',
        type,
        title: title.trim(),
        description: description.trim(),
        dueDate: showDueDate ? dueDate : '',
        createdBy: user?.id || '',
      });
      toast.success('Activity logged');
      setTitle('');
      setDescription('');
      setContactId('');
      setDueDate('');
      onSaved();
    } catch (err) {
      toast.error('Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 mb-3">Log Activity</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Type + Title row */}
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="input text-sm w-32"
            aria-label="Activity type"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <Input
            placeholder="Activity title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Contact dropdown (5.5) */}
        <div>
          <label htmlFor="activity-contact" className="block text-xs text-surface-400 mb-1">
            Contact (optional)
          </label>
          <select
            id="activity-contact"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="input text-sm w-full"
          >
            <option value="">No contact linked</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
                {c.isPrimary ? ' (Primary)' : ''}
                {c.title ? ` — ${c.title}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Due date picker — only for meeting, site-visit, call (5.6) */}
        {showDueDate && (
          <div>
            <label htmlFor="activity-due-date" className="block text-xs text-surface-400 mb-1">
              Due / Scheduled date
            </label>
            <input
              id="activity-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input text-sm w-full"
              aria-label="Due date"
            />
          </div>
        )}

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input w-full text-sm min-h-[60px] resize-y"
        />
        <Button type="submit" variant="primary" icon={Plus} loading={saving} disabled={!title.trim()}>
          Log Activity
        </Button>
      </form>
    </div>
  );
}
