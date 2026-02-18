import { useState } from 'react';
import {
  Send,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Edit3,
  Clock,
} from 'lucide-react';
import type { ApprovalChainEntry } from '../../types/quote';
import { getChainActionColor, getRoleDisplayName } from '../../engine/approvalEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuoteAuditTimelineProps {
  chain: ApprovalChainEntry[];
  filterActions?: ApprovalChainEntry['action'][];
}

type FilterGroup = 'all' | 'approvals' | 'comments' | 'edits' | 'submissions';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  submitted: 'submitted',
  escalated: 'escalated',
  returned: 'returned for changes on',
  approved: 'approved',
  rejected: 'rejected',
  commented: 'commented on',
  edited: 'edited',
};

const FILTER_GROUP_MAP: Record<FilterGroup, ApprovalChainEntry['action'][]> = {
  all: ['submitted', 'escalated', 'returned', 'approved', 'rejected', 'commented', 'edited'],
  approvals: ['approved', 'rejected'],
  comments: ['commented'],
  edits: ['edited'],
  submissions: ['submitted', 'escalated', 'returned'],
};

const FILTER_GROUP_LABELS: Record<FilterGroup, string> = {
  all: 'All',
  approvals: 'Approvals',
  comments: 'Comments',
  edits: 'Edits',
  submissions: 'Submissions',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getActionIcon(action: ApprovalChainEntry['action']) {
  const cls = 'w-3.5 h-3.5';
  switch (action) {
    case 'submitted':
      return <Send className={cls} />;
    case 'escalated':
      return <ArrowUp className={cls} />;
    case 'returned':
      return <ArrowDown className={cls} />;
    case 'approved':
      return <Check className={cls} />;
    case 'rejected':
      return <X className={cls} />;
    case 'commented':
      return <MessageSquare className={cls} />;
    case 'edited':
      return <Edit3 className={cls} />;
    default:
      return <Clock className={cls} />;
  }
}

/**
 * Maps a color name (returned by getChainActionColor) to Tailwind
 * utility class sets for the dot, icon wrapper, and connecting line glow.
 */
function getDotClasses(color: string): {
  dot: string;
  ring: string;
  icon: string;
  glow: string;
} {
  switch (color) {
    case 'green':
      return {
        dot: 'bg-green-500',
        ring: 'ring-green-500/30',
        icon: 'text-green-400',
        glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
      };
    case 'red':
      return {
        dot: 'bg-red-500',
        ring: 'ring-red-500/30',
        icon: 'text-red-400',
        glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
      };
    case 'cyan':
      return {
        dot: 'bg-brand-500',
        ring: 'ring-brand-500/30',
        icon: 'text-brand-400',
        glow: 'shadow-[0_0_8px_rgba(0,212,255,0.5)]',
      };
    case 'yellow':
      return {
        dot: 'bg-yellow-500',
        ring: 'ring-yellow-500/30',
        icon: 'text-yellow-400',
        glow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]',
      };
    case 'blue':
      return {
        dot: 'bg-feature-500',
        ring: 'ring-feature-500/30',
        icon: 'text-feature-400',
        glow: 'shadow-[0_0_8px_rgba(77,139,255,0.5)]',
      };
    case 'gray':
    default:
      return {
        dot: 'bg-surface-500',
        ring: 'ring-surface-500/30',
        icon: 'text-surface-300',
        glow: '',
      };
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface TimelineCardProps {
  entry: ApprovalChainEntry;
  isLast: boolean;
}

function TimelineCard({ entry, isLast }: TimelineCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);

  const color = getChainActionColor(entry.action);
  const dotClasses = getDotClasses(color);
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
  const fromRoleDisplay = getRoleDisplayName(entry.fromRole);
  const toRoleDisplay = getRoleDisplayName(entry.toRole);
  const showToUser = entry.toUserId !== entry.fromUserId;

  const NOTES_TRUNCATE_THRESHOLD = 120;
  const notesIsTruncatable =
    entry.notes.length > NOTES_TRUNCATE_THRESHOLD;
  const displayedNotes =
    notesIsTruncatable && !notesExpanded
      ? entry.notes.slice(0, NOTES_TRUNCATE_THRESHOLD).trimEnd() + '...'
      : entry.notes;

  return (
    <div className="flex gap-4 group animate-fade-in">
      {/* ── Left rail: dot + line ─────────────────────────────────────── */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        {/* Dot */}
        <div
          className={`
            relative z-10 flex items-center justify-center
            w-7 h-7 rounded-full
            ring-2 ${dotClasses.ring}
            ${dotClasses.dot} ${dotClasses.glow}
            transition-transform duration-200 group-hover:scale-110
          `}
        >
          <span className={dotClasses.icon}>
            {getActionIcon(entry.action)}
          </span>
        </div>

        {/* Connecting line */}
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1.5 bg-surface-600 min-h-[1.5rem]" />
        )}
      </div>

      {/* ── Right side: card ──────────────────────────────────────────── */}
      <div className="flex-1 pb-6">
        <div
          className="
            bg-surface-800/40 border border-surface-700/30 rounded-xl p-4
            backdrop-blur-sm
            transition-colors duration-200
            hover:bg-surface-800/60 hover:border-surface-700/50
          "
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm text-surface-100 leading-snug">
              <span className="font-semibold text-surface-50">
                {entry.fromUserName}
              </span>
              <span className="text-surface-300">
                {' '}
                ({fromRoleDisplay})
              </span>{' '}
              <span className="text-surface-200">{actionLabel}</span>{' '}
              <span className="text-surface-300">this quote</span>
            </p>

            {/* Relative timestamp */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Clock className="w-3 h-3 text-surface-400" />
              <span
                className="text-2xs text-surface-400 whitespace-nowrap"
                title={new Date(entry.timestamp).toLocaleString()}
              >
                {getRelativeTime(entry.timestamp)}
              </span>
            </div>
          </div>

          {/* To-user row */}
          {showToUser && (
            <p className="mt-1 text-sm text-surface-300">
              <span className="text-surface-500 mr-1">&#8594;</span>
              <span className="font-semibold text-surface-200">
                {entry.toUserName}
              </span>
              <span className="text-surface-400">
                {' '}
                ({toRoleDisplay})
              </span>
            </p>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="mt-2">
              <p className="text-sm text-surface-100/60 leading-relaxed">
                {displayedNotes}
              </p>
              {notesIsTruncatable && (
                <button
                  onClick={() => setNotesExpanded((v) => !v)}
                  className="
                    mt-1 text-xs text-brand-400/80
                    hover:text-brand-400 transition-colors
                    focus:outline-none focus-visible:underline
                  "
                >
                  {notesExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Changes description */}
          {entry.changesDescription && (
            <p className="mt-2 text-xs text-surface-300/60 italic leading-relaxed border-l-2 border-surface-600/50 pl-2.5">
              {entry.changesDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuoteAuditTimeline({
  chain,
  filterActions,
}: QuoteAuditTimelineProps) {
  const [activeGroup, setActiveGroup] = useState<FilterGroup>('all');

  // Prop-level filter takes priority; hides the filter bar entirely.
  const propFiltered = filterActions
    ? chain.filter((e) => filterActions.includes(e.action))
    : chain;

  // Internal filter (only applied when filterActions is NOT provided).
  const activeGroupActions = FILTER_GROUP_MAP[activeGroup];
  const displayed = filterActions
    ? propFiltered
    : propFiltered.filter((e) => activeGroupActions.includes(e.action));

  // Chronological order — oldest first.
  const sorted = [...displayed].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter bar (hidden when filterActions prop is provided) ──── */}
      {!filterActions && (
        <div
          className="
            flex flex-wrap gap-2
            pb-3 border-b border-surface-700/30
          "
          role="group"
          aria-label="Filter timeline by action type"
        >
          {(Object.keys(FILTER_GROUP_LABELS) as FilterGroup[]).map((group) => {
            const isActive = activeGroup === group;
            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  border transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50
                  ${
                    isActive
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                      : 'bg-surface-700/50 border-surface-600/30 text-surface-300 hover:bg-surface-700/70 hover:border-surface-600/50 hover:text-surface-200'
                  }
                `}
                aria-pressed={isActive}
              >
                {FILTER_GROUP_LABELS[group]}
                {group !== 'all' && (
                  <span
                    className={`ml-1.5 ${
                      isActive ? 'text-brand-500/80' : 'text-surface-500'
                    }`}
                  >
                    (
                    {
                      chain.filter((e) =>
                        FILTER_GROUP_MAP[group].includes(e.action)
                      ).length
                    }
                    )
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Timeline entries ─────────────────────────────────────────── */}
      {sorted.length > 0 ? (
        <div
          className="relative"
          role="list"
          aria-label="Quote approval chain history"
        >
          {sorted.map((entry, index) => (
            <div key={entry.id} role="listitem">
              <TimelineCard
                entry={entry}
                isLast={index === sorted.length - 1}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────── */
        <div
          className="
            flex flex-col items-center justify-center gap-3
            py-12 rounded-xl
            bg-surface-800/20 border border-surface-700/20
            text-center
          "
          aria-label="No activity recorded"
        >
          <div
            className="
              w-12 h-12 rounded-full
              bg-surface-700/30 border border-surface-600/30
              flex items-center justify-center
            "
          >
            <Clock className="w-5 h-5 text-surface-500" />
          </div>
          <p className="text-sm font-medium text-surface-400">
            No activity recorded
          </p>
          <p className="text-xs text-surface-500">
            Approval chain events will appear here as they occur.
          </p>
        </div>
      )}
    </div>
  );
}
