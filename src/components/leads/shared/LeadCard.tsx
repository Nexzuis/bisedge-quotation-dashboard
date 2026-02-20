import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Globe, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StoredLead } from '../../../db/interfaces';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadScoreBadge } from './LeadScoreBadge';

interface LeadCardProps {
  lead: StoredLead;
  selected?: boolean;
  onSelect?: (id: string) => void;
  hot?: boolean;
}

export function LeadCard({ lead, selected, onSelect, hot }: LeadCardProps) {
  const navigate = useNavigate();

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => navigate(`/leads/${lead.id}`)}
      className={`relative glass rounded-xl p-4 cursor-pointer transition-all border ${
        hot
          ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
          : selected
            ? 'border-brand-500/50 bg-brand-600/10'
            : 'border-surface-600/50 hover:border-surface-500/50'
      }`}
    >
      {/* Header: Status + Score */}
      <div className="flex items-center justify-between mb-3">
        <LeadStatusBadge status={lead.qualificationStatus} />
        <LeadScoreBadge buyProbability={lead.buyProbability} compact />
      </div>

      {/* Company */}
      <h3 className="text-surface-100 font-semibold text-sm truncate">{lead.companyName}</h3>
      {lead.tradingName && (
        <p className="text-surface-500 text-xs truncate">{lead.tradingName}</p>
      )}

      {/* Industry + Province tags */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {lead.industry && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-300">{lead.industry}</span>
        )}
        {lead.province && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-300 inline-flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />{lead.province}
          </span>
        )}
      </div>

      {/* Decision Maker */}
      {lead.decisionMakerName && (
        <div className="mt-3 pt-3 border-t border-surface-700/50">
          <p className="text-surface-200 text-xs font-medium">
            {lead.decisionMakerName}
            {lead.decisionMakerTitle && <span className="text-surface-500"> — {lead.decisionMakerTitle}</span>}
          </p>
          <div className="flex flex-col gap-1 mt-1.5">
            {lead.decisionMakerEmail && (
              <a
                href={`mailto:${lead.decisionMakerEmail}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 truncate"
              >
                <Mail className="w-3 h-3 shrink-0" />{lead.decisionMakerEmail}
              </a>
            )}
            {lead.decisionMakerPhone && (
              <a
                href={`tel:${lead.decisionMakerPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                <Phone className="w-3 h-3 shrink-0" />{lead.decisionMakerPhone}
              </a>
            )}
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {lead.aiReasoning && (
        <p className="text-xs text-surface-500 mt-2 line-clamp-2 italic">
          &ldquo;{lead.aiReasoning}&rdquo;
        </p>
      )}

      {/* Footer: Source + Time */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-700/30">
        <span className="text-xs text-surface-500 capitalize inline-flex items-center gap-1">
          <Globe className="w-3 h-3" />{lead.sourceName.replace('_', ' ')}
        </span>
        <span className="text-xs text-surface-600 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />{timeAgo(lead.createdAt)}
        </span>
      </div>

      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-3 right-3" onClick={(e) => { e.stopPropagation(); onSelect(lead.id); }}>
          <input
            type="checkbox"
            checked={selected}
            readOnly
            className="w-4 h-4 rounded border-surface-500 bg-surface-800 text-brand-500 focus:ring-brand-500"
          />
        </div>
      )}
    </motion.div>
  );
}
