import { useState, useEffect } from 'react';
import { Users, Plus, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ContactCard } from './ContactCard';
import { ContactForm } from '../shared/ContactForm';
import { useContacts } from '../../../hooks/useContacts';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';
import type { StoredContact } from '../../../db/interfaces';

interface ContactsListProps {
  companyId: string;
}

export function ContactsList({ companyId }: ContactsListProps) {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { getByCompany, deleteContact } = useContacts();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const loadContacts = async () => {
    const data = await getByCompany(companyId);
    setContacts(data);
  };

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    await deleteContact(id);
    toast.success('Contact deleted');
    loadContacts();
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-500" />
          <h3 className="text-lg font-semibold text-surface-100">Contacts</h3>
          <span className="text-xs text-surface-500 bg-surface-700/50 px-1.5 py-0.5 rounded-full">{contacts.length}</span>
        </div>
        <Button variant="ghost" icon={Plus} onClick={() => { setShowForm(true); setEditingId(null); }}>Add</Button>
      </div>

      {showForm && !editingId && (
        <div className="mb-4 p-3 bg-surface-800/40 border border-surface-700/50 rounded-lg">
          <ContactForm
            companyId={companyId}
            onSaved={() => { setShowForm(false); loadContacts(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {contacts.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center py-8 text-surface-500">
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <UserPlus className="w-10 h-10 text-surface-600 mb-3" />
            </motion.div>
            <div className="text-sm font-medium text-surface-400">No contacts yet</div>
            <div className="text-xs text-surface-600 mt-1">Add a contact to get started</div>
          </div>
        ) : (
          contacts.map((contact) =>
            editingId === contact.id ? (
              <div key={contact.id} className="p-3 bg-surface-800/40 border border-surface-700/50 rounded-lg">
                <ContactForm
                  companyId={companyId}
                  existingContact={contact}
                  onSaved={() => { setEditingId(null); loadContacts(); }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <motion.div key={contact.id} variants={fadeInUp} whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0, 212, 255, 0.06)' }}>
                <ContactCard
                  contact={contact}
                  onEdit={() => setEditingId(contact.id)}
                  onDelete={() => handleDelete(contact.id)}
                />
              </motion.div>
            )
          )
        )}
      </motion.div>
      {ConfirmDialogElement}
    </div>
  );
}
