/**
 * ApprovalChainBreadcrumb
 *
 * Visual horizontal chain breadcrumb that renders every step a quote has
 * passed through in the approval workflow.  Each step shows who acted, in
 * what role, with what action, and when — all colour-coded per action type.
 *
 * Design system: ultra-dark glass-morphism with teal (brand) accents.
 * Color tokens follow the custom `surface` / `brand` palette defined in
 * tailwind.config.cjs.
 */

import { Send, Check, X, ArrowUp, ArrowDown, MessageSquare, Edit3 } from 'lucide-react';
import type { ApprovalChainEntry } from '../../types/quote';
import { getChainActionColor, getRoleDisplayName } from '../../engine/approvalEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApprovalChainBreadcrumbProps {
  chain: ApprovalChainEntry[];
  /** Renders a smaller version suited for card contexts */
  compact?: boolean;
}

// ─── Color maps ──────────────────────────────────────────────────────────────

type ActionColor = 'cyan' | 'green' | 'red' | 'yellow' | 'gray' | 'blue';

interface ColorSet {
  dot: string;
  text: string;
  border: string;
  bg: string;
  iconText: string;
}

const COLOR_MAP: Record<ActionColor, ColorSet> = {
  cyan: {
    dot: 'bg-cyan-400',
    text: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/10',
    iconText: 'text-cyan-400',
  },
  green: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    border: 'border-green-400/30',
    bg: 'bg-green-400/10',
    iconText: 'text-green-400',
  },
  red: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    border: 'border-red-400/30',
    bg: 'bg-red-400/10',
    iconText: 'text-red-400',
  },
  yellow: {
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    border: 'border-yellow-400/30',
    bg: 'bg-yellow-400/10',
    iconText: 'text-yellow-400',
  },
  gray: {
    dot: 'bg-surface-400',
    text: 'text-surface-400',
    border: 'border-surface-400/30',
    bg: 'bg-surface-400/10',
    iconText: 'text-surface-400',
  },
  blue: {
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/10',
    iconText: 'text-blue-400',
  },
};

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ACTION_ICON: Record<ApprovalChainEntry['action'], React.ComponentType<{ className?: string }>> = {
  submitted: Send,
  escalated: ArrowUp,
  returned: ArrowDown,
  approved: Check,
  rejected: X,
  commented: MessageSquare,
  edited: Edit3,
};

// ─── Action label map ─────────────────────────────────────────────────────────

const ACTION_LABEL: Record<ApprovalChainEntry['action'], string> = {
  submitted: 'Submitted',
  escalated: 'Escalated',
  returned: 'Returned',
  approved: 'Approved',
  rejected: 'Rejected',
  commented: 'Commented',
  edited: 'Edited',
};

// ─── Helper: relative time ────────────────────────────────────────────────────

export function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (isNaN(then)) return 'Unknown';

  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(diffMs / 604_800_000);
  const months = Math.floor(diffMs / 2_592_000_000);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

// ─── Helper: resolve color set for an entry ───────────────────────────────────

function resolveColors(entry: ApprovalChainEntry): ColorSet {
  const colorName = getChainActionColor(entry.action) as ActionColor;
  return COLOR_MAP[colorName] ?? COLOR_MAP.gray;
}

// ─── Sub-component: Step Node ─────────────────────────────────────────────────

interface StepNodeProps {
  entry: ApprovalChainEntry;
  isLast: boolean;
  compact: boolean;
}

function StepNode({ entry, compact }: StepNodeProps) {
  const colors = resolveColors(entry);
  const Icon = ACTION_ICON[entry.action];
  const label = ACTION_LABEL[entry.action];
  const relativeTime = getRelativeTime(entry.timestamp);
  const roleDisplay = getRoleDisplayName(entry.fromRole);

  if (compact) {
    // Compact: dot + name + action only — no timestamps or role badge
    return (
      <div
        className="flex flex-col items-center gap-1 min-w-0"
        title={`${entry.fromUserName} (${roleDisplay}) — ${label} — ${relativeTime}`}
      >
        {/* Dot with icon */}
        <div
          className={`
            relative flex items-center justify-center
            w-6 h-6 rounded-full
            ${colors.dot}
            shadow-sm flex-shrink-0
          `}
        >
          <Icon className="w-3 h-3 text-surface-950" />
        </div>

        {/* Name */}
        <span
          className={`text-2xs font-medium ${colors.text} leading-tight text-center max-w-[56px] truncate`}
          title={entry.fromUserName}
        >
          {entry.fromUserName}
        </span>

        {/* Action label */}
        <span className="text-2xs text-surface-400 leading-tight text-center">
          {label}
        </span>
      </div>
    );
  }

  // Full mode
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {/* Dot with icon */}
      <div
        className={`
          relative flex items-center justify-center
          w-8 h-8 rounded-full
          ${colors.bg} border ${colors.border}
          flex-shrink-0
        `}
      >
        <Icon className={`w-3.5 h-3.5 ${colors.iconText}`} />
        {/* Outer glow ring */}
        <span
          className={`
            absolute inset-0 rounded-full
            ring-1 ring-inset ${colors.border}
          `}
        />
      </div>

      {/* Name */}
      <span
        className="text-xs font-semibold text-surface-100 text-center max-w-[72px] leading-tight truncate"
        title={entry.fromUserName}
      >
        {entry.fromUserName}
      </span>

      {/* Role badge */}
      <span
        className={`
          inline-flex items-center px-1.5 py-0.5
          rounded text-2xs font-medium
          ${colors.bg} ${colors.text} border ${colors.border}
          max-w-[80px] truncate leading-tight
        `}
        title={roleDisplay}
      >
        {roleDisplay}
      </span>

      {/* Action label */}
      <span className={`text-2xs font-medium ${colors.text} text-center`}>
        {label}
      </span>

      {/* Relative timestamp */}
      <span className="text-2xs text-surface-400 text-center leading-tight">
        {relativeTime}
      </span>
    </div>
  );
}

// ─── Connector line ───────────────────────────────────────────────────────────

function ConnectorLine({ compact }: { compact: boolean }) {
  return (
    <div
      className={`
        flex-shrink-0 self-start
        ${compact ? 'mt-3' : 'mt-4'}
        w-8 h-0.5 bg-surface-600
      `}
      aria-hidden="true"
    />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <span className="text-2xs text-surface-500 italic">No activity yet</span>
    );
  }
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-surface-600 flex-shrink-0" />
      <span className="text-xs text-surface-500 italic">No activity yet</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApprovalChainBreadcrumb({
  chain,
  compact = false,
}: ApprovalChainBreadcrumbProps) {
  if (!chain || chain.length === 0) {
    return (
      <div
        className={`
          flex items-center
          ${compact ? 'px-2 py-1' : 'px-3 py-2'}
        `}
        role="status"
        aria-label="Approval chain: no activity yet"
      >
        <EmptyState compact={compact} />
      </div>
    );
  }

  return (
    <div
      className={`
        overflow-x-auto
        ${compact ? '' : 'pb-2'}
      `}
      role="list"
      aria-label="Approval chain"
    >
      {/* Scrollable inner row */}
      <div
        className={`
          flex items-start
          ${compact ? 'gap-0 py-1' : 'gap-0 py-3 px-1'}
          w-max min-w-full
        `}
      >
        {chain.map((entry, index) => {
          const isLast = index === chain.length - 1;
          return (
            <div
              key={entry.id}
              className="flex items-start"
              role="listitem"
            >
              <StepNode entry={entry} isLast={isLast} compact={compact} />
              {!isLast && <ConnectorLine compact={compact} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
