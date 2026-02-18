import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useContacts } from '../../../hooks/useContacts';
import { toast } from '../../ui/Toast';
import type { StoredContact } from '../../../db/interfaces';

interface ContactFormProps {
  companyId: string;
  existingContact?: StoredContact;
  onSaved: () => void;
  onCancel: () => void;
}

export function ContactForm({ companyId, existingContact, onSaved, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    firstName: existingContact?.firstName || '',
    lastName: existingContact?.lastName || '',
    title: existingContact?.title || '',
    email: existingContact?.email || '',
    phone: existingContact?.phone || '',
    isPrimary: existingContact?.isPrimary || false,
  });
  const [saving, setSaving] = useState(false);
  const { saveContact, updateContact } = useContacts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name required');
      return;
    }

    setSaving(true);
    try {
      if (existingContact) {
        await updateContact(existingContact.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          title: form.title.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          isPrimary: form.isPrimary,
        });
        toast.success('Contact updated');
      } else {
        await saveContact({
          companyId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          title: form.title.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          isPrimary: form.isPrimary,
        });
        toast.success('Contact created');
      }
      onSaved();
    } catch (err) {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name *"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          autoFocus
        />
        <Input
          label="Last Name *"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
      </div>
      <Input
        label="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="e.g., Fleet Manager"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-surface-300">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
          className="w-4 h-4 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500"
        />
        Primary Contact
      </label>
      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" icon={Save} loading={saving}>
          {existingContact ? 'Update' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" icon={X} onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
