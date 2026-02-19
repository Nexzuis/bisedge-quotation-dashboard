import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Clock, Eye, CheckCircle, XCircle, Send, Timer, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDb } from '../../../db/DatabaseAdapter';
import { staggerContainer, fadeInUp } from '../../crm/shared/motionVariants';
import type { QuoteStatus } from '../../../types/quote';

interface QuoteStatsWidgetProps {
  userOnly?: boolean;
}

const STATUS_CARDS: {
  status: QuoteStatus;
  label: string;
  icon: typeof Pencil;
  color: string;
  bg: string;
  border: string;
}[] = [
  { status: 'draft', label: 'Draft', icon: Pencil, color: 'text-surface-300', bg: 'bg-surface-500/10', border: 'border-surface-500/20' },
  { status: 'pending-approval', label: 'Pending Approval', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { status: 'in-review', label: 'In Review', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { status: 'changes-requested', label: 'Changes Requested', icon: Edit3, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { status: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { status: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { status: 'sent-to-customer', label: 'Sent', icon: Send, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
  { status: 'expired', label: 'Expired', icon: Timer, color: 'text-surface-400', bg: 'bg-surface-500/10', border: 'border-surface-500/20' },
];

export function QuoteStatsWidget({ userOnly = false }: QuoteStatsWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadCounts();
  }, [user]);

  const loadCounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const result = await db.listQuotes(
        { page: 1, pageSize: 1000, sortBy: 'updatedAt', sortOrder: 'desc' },
        {}
      );

      let items = result.items;

      // If userOnly, filter to this user's quotes
      if (userOnly) {
        items = items.filter(
          (q: any) => q.createdBy === user.id || q.assignedTo === user.id
        );
      }

      const countMap: Record<string, number> = {};
      for (const q of items) {
        countMap[q.status] = (countMap[q.status] || 0) + 1;
      }
      setCounts(countMap);
    } catch (err) {
      console.error('Error loading quote stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalQuotes = Object.values(counts).reduce((sum, c) => sum + c, 0);

  // Only show statuses that have counts > 0, plus always show draft, pending-approval, approved
  const visibleCards = STATUS_CARDS.filter(
    (card) => (counts[card.status] || 0) > 0 || ['draft', 'pending-approval', 'approved'].includes(card.status)
  );

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-surface-300">
          {userOnly ? 'My Quote Statistics' : 'All Quote Statistics'}
        </h3>
        <span className="text-xs text-surface-500">
          {loading ? '...' : `${totalQuotes} total`}
        </span>
      </div>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {visibleCards.map((card) => {
          const Icon = card.icon;
          const count = counts[card.status] || 0;
          return (
            <motion.button
              key={card.status}
              variants={fadeInUp}
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/quotes', { state: { filterStatus: card.status } })}
              className={`${card.bg} border ${card.border} rounded-xl p-3 text-left transition-colors hover:brightness-110`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className={`text-2xl font-bold ${card.color}`}>
                  {loading ? '...' : count}
                </span>
              </div>
              <div className="text-xs text-surface-400">{card.label}</div>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
