import { useState, useEffect, useCallback } from 'react';
import { Flame, Mail, Phone, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CrmTopBar } from '../crm/CrmTopBar';
import { LeadCard } from './shared/LeadCard';
import { useLeads } from '../../hooks/useLeads';
import { Button } from '../ui/Button';
import { staggerContainer, fadeInUp } from '../crm/shared/motionVariants';
import type { StoredLead } from '../../db/interfaces';

export default function HotLeadsPage() {
  const [leads, setLeads] = useState<StoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { listLeads } = useLeads();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listLeads(
        { page: 1, pageSize: 100, sortBy: 'buyProbability', sortOrder: 'desc' },
        { minScore: 8 }
      );
      // Also filter out rejected/converted/stale client-side
      const filtered = result.items.filter((l) =>
        ['new', 'reviewing', 'qualified'].includes(l.qualificationStatus)
      );
      setLeads(filtered);
    } finally {
      setLoading(false);
    }
  }, [listLeads]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
      <motion.div className="max-w-7xl mx-auto p-4 space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeInUp}><CrmTopBar /></motion.div>

        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/leads')}>Leads</Button>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-surface-100">Hot Leads</h1>
          </div>
          <span className="text-sm text-surface-500">Score 8+ | Active pipeline</span>
        </motion.div>

        <motion.div variants={fadeInUp}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-xl p-4 h-56 animate-pulse border border-amber-500/20" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Flame className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-400 text-lg font-medium mb-2">No hot leads</p>
              <p className="text-surface-500 text-sm">Leads with a buy probability of 8 or higher will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="relative">
                  <LeadCard lead={lead} hot />
                  {/* Quick action overlays */}
                  <div className="absolute bottom-3 right-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {lead.decisionMakerEmail && (
                      <a
                        href={`mailto:${lead.decisionMakerEmail}`}
                        className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400 hover:bg-brand-600/50 transition-colors"
                        title={`Email ${lead.decisionMakerEmail}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {lead.decisionMakerPhone && (
                      <a
                        href={`tel:${lead.decisionMakerPhone}`}
                        className="w-8 h-8 rounded-lg bg-green-600/30 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-600/50 transition-colors"
                        title={`Call ${lead.decisionMakerPhone}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
