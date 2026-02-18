import { User, Star, Pencil, Trash2 } from 'lucide-react';
import type { StoredContact } from '../../../db/interfaces';

interface ContactCardProps {
  contact: StoredContact;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  return (
    <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3 flex items-start gap-3">
      <div className="p-2 bg-surface-700/50 rounded-lg">
        <User className="w-4 h-4 text-surface-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-100">
            {contact.firstName} {contact.lastName}
          </span>
          {contact.isPrimary && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
              <Star className="w-2.5 h-2.5" /> Primary
            </span>
          )}
        </div>
        {contact.title && <div className="text-xs text-surface-400">{contact.title}</div>}
        {contact.email && <div className="text-xs text-surface-400">{contact.email}</div>}
        {contact.phone && <div className="text-xs text-surface-400">{contact.phone}</div>}
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-1 text-surface-500 hover:text-surface-300 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 text-surface-500 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
