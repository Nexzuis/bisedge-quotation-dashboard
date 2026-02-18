import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Building2,
  Check,
  Users,
  Activity,
  FileText,
  ArrowRight,
  Merge,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import {
  useCompanyMerge,
  buildDefaultSelections,
  MERGEABLE_FIELDS,
  type MergeFieldSelections,
  type MergePreview,
  type FieldSelection,
} from '../../../hooks/useCompanyMerge';
import { formatZAR } from '../../../engine/formatters';
import type { StoredCompany } from '../../../db/interfaces';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CompanyMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryCompanyId: string;
  secondaryCompanyId: string;
  onMerged: () => void;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.15 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format any field value for display in the comparison columns.
 * Arrays (address, tags) are rendered as a comma-separated string.
 * Numbers in the 'estimatedValue' / 'creditLimit' fields are formatted as ZAR.
 * Numbers in 'paymentTerms' are shown as "N days".
 */
function formatFieldValue(key: keyof StoredCompany, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    return filtered.length > 0 ? filtered.join(', ') : '—';
  }
  if (typeof value === 'number') {
    if (key === 'estimatedValue' || key === 'creditLimit') {
      return formatZAR(value, false);
    }
    if (key === 'paymentTerms') {
      return `${value} days`;
    }
    return String(value);
  }
  return String(value);
}

/** Derive a display-friendly pipeline stage label. */
function formatPipelineStage(stage: string): string {
  const map: Record<string, string> = {
    lead: 'Lead',
    contacted: 'Contacted',
    'site-assessment': 'Site Assessment',
    quoted: 'Quoted',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
  };
  return map[stage] ?? stage;
}

/** Returns true when a field's value is non-empty / meaningful. */
function hasValue(key: keyof StoredCompany, company: StoredCompany): boolean {
  const val = company[key];
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val)) return val.filter(Boolean).length > 0;
  if (typeof val === 'number') return val !== 0;
  return true;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Header column showing the company name and its role badge. */
function CompanyColumnHeader({
  company,
  role,
}: {
  company: StoredCompany;
  role: 'primary' | 'secondary';
}) {
  const isPrimary = role === 'primary';
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${isPrimary ? 'items-start' : 'items-end'}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${
          isPrimary
            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
            : 'bg-surface-600/60 text-surface-300 border border-surface-500/30'
        }`}
      >
        {isPrimary ? (
          <>
            <Check className="w-2.5 h-2.5" />
            Survivor
          </>
        ) : (
          <>
            <ArrowRight className="w-2.5 h-2.5" />
            Merging In
          </>
        )}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`p-1.5 rounded-lg flex-shrink-0 ${
            isPrimary ? 'bg-brand-500/20' : 'bg-surface-600/40'
          }`}
        >
          <Building2
            className={`w-4 h-4 ${isPrimary ? 'text-brand-400' : 'text-surface-400'}`}
          />
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-bold truncate ${
              isPrimary ? 'text-surface-100' : 'text-surface-300'
            }`}
          >
            {company.name}
          </p>
          {company.tradingName && (
            <p className="text-xs text-surface-500 truncate">{company.tradingName}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single row in the field comparison grid. */
function FieldRow({
  fieldKey,
  label,
  primary,
  secondary,
  selected,
  onToggle,
}: {
  fieldKey: keyof StoredCompany;
  label: string;
  primary: StoredCompany;
  secondary: StoredCompany;
  selected: FieldSelection;
  onToggle: (key: keyof StoredCompany) => void;
}) {
  const primaryVal = formatFieldValue(
    fieldKey,
    fieldKey === 'pipelineStage'
      ? formatPipelineStage(primary[fieldKey] as string)
      : primary[fieldKey]
  );
  const secondaryVal = formatFieldValue(
    fieldKey,
    fieldKey === 'pipelineStage'
      ? formatPipelineStage(secondary[fieldKey] as string)
      : secondary[fieldKey]
  );

  const primaryEmpty = !hasValue(fieldKey, primary);
  const secondaryEmpty = !hasValue(fieldKey, secondary);
  const identical = primaryVal === secondaryVal && primaryVal !== '—';

  return (
    <motion.div
      variants={rowVariants}
      className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch"
    >
      {/* Primary value cell */}
      <button
        type="button"
        onClick={() => onToggle(fieldKey)}
        disabled={primaryEmpty && !secondaryEmpty}
        className={[
          'group flex flex-col gap-0.5 p-3 rounded-lg border text-left transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70',
          selected === 'primary'
            ? 'border-brand-500/60 bg-brand-500/8 shadow-[0_0_0_1px_rgba(0,212,255,0.15)]'
            : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/70 hover:bg-surface-700/30',
          primaryEmpty ? 'opacity-40 cursor-default' : 'cursor-pointer',
        ].join(' ')}
        aria-label={`Use primary value for ${label}`}
        aria-pressed={selected === 'primary'}
      >
        <span className="text-2xs text-surface-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-sm font-medium leading-snug break-all ${
            selected === 'primary'
              ? 'text-brand-200'
              : primaryEmpty
              ? 'text-surface-600'
              : 'text-surface-300'
          }`}
        >
          {primaryVal}
        </span>
        {selected === 'primary' && !primaryEmpty && (
          <span className="mt-1 flex items-center gap-1 text-2xs text-brand-400 font-semibold">
            <Check className="w-2.5 h-2.5" />
            Selected
          </span>
        )}
      </button>

      {/* Centre divider with toggle indicator */}
      <div className="flex flex-col items-center justify-center gap-1 py-1 w-7">
        <div
          className={`w-px flex-1 ${identical ? 'bg-success/30' : 'bg-surface-700/60'}`}
        />
        {identical ? (
          <span className="text-success" title="Values are identical">
            <Check className="w-3 h-3" />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(fieldKey)}
            className="p-0.5 rounded text-surface-500 hover:text-brand-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70"
            title="Toggle selection"
            aria-label={`Toggle selection for ${label}`}
          >
            <Merge className="w-3.5 h-3.5" />
          </button>
        )}
        <div
          className={`w-px flex-1 ${identical ? 'bg-success/30' : 'bg-surface-700/60'}`}
        />
      </div>

      {/* Secondary value cell */}
      <button
        type="button"
        onClick={() => onToggle(fieldKey)}
        disabled={secondaryEmpty && !primaryEmpty}
        className={[
          'group flex flex-col gap-0.5 p-3 rounded-lg border text-left transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70',
          selected === 'secondary'
            ? 'border-brand-500/60 bg-brand-500/8 shadow-[0_0_0_1px_rgba(0,212,255,0.15)]'
            : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600/70 hover:bg-surface-700/30',
          secondaryEmpty ? 'opacity-40 cursor-default' : 'cursor-pointer',
        ].join(' ')}
        aria-label={`Use secondary value for ${label}`}
        aria-pressed={selected === 'secondary'}
      >
        <span className="text-2xs text-surface-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-sm font-medium leading-snug break-all ${
            selected === 'secondary'
              ? 'text-brand-200'
              : secondaryEmpty
              ? 'text-surface-600'
              : 'text-surface-300'
          }`}
        >
          {secondaryVal}
        </span>
        {selected === 'secondary' && !secondaryEmpty && (
          <span className="mt-1 flex items-center gap-1 text-2xs text-brand-400 font-semibold">
            <Check className="w-2.5 h-2.5" />
            Selected
          </span>
        )}
      </button>
    </motion.div>
  );
}

/** Collapsible group of field rows for a given category. */
function FieldGroup({
  groupName,
  fields,
  primary,
  secondary,
  selections,
  onToggle,
}: {
  groupName: string;
  fields: ReadonlyArray<{ key: keyof StoredCompany; label: string }>;
  primary: StoredCompany;
  secondary: StoredCompany;
  selections: MergeFieldSelections;
  onToggle: (key: keyof StoredCompany) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-surface-700/40 overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-800/60 hover:bg-surface-700/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          {groupName}
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-surface-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-surface-500" />
        )}
      </button>

      {/* Rows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="group-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <motion.div
              className="flex flex-col gap-2 p-3 bg-surface-900/30"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate="visible"
            >
              {fields.map(({ key, label }) => (
                <FieldRow
                  key={key}
                  fieldKey={key}
                  label={label}
                  primary={primary}
                  secondary={secondary}
                  selected={selections[key] ?? 'primary'}
                  onToggle={onToggle}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The reassignment preview strip at the bottom of the modal. */
function ReassignmentPreview({
  counts,
  primaryName,
}: {
  counts: { contacts: number; activities: number; quotes: number };
  primaryName: string;
}) {
  const items = [
    { icon: Users,    label: 'Contacts',   count: counts.contacts },
    { icon: Activity, label: 'Activities', count: counts.activities },
    { icon: FileText, label: 'Quotes',     count: counts.quotes },
  ];

  const total = counts.contacts + counts.activities + counts.quotes;

  return (
    <div className="rounded-xl border border-surface-700/40 bg-surface-900/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">
        Records being reassigned to &ldquo;{primaryName}&rdquo;
      </p>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label, count }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
              count > 0
                ? 'border-brand-500/30 bg-brand-500/8'
                : 'border-surface-700/30 bg-surface-800/20 opacity-50'
            }`}
          >
            <div
              className={`p-1.5 rounded-md ${
                count > 0 ? 'bg-brand-500/20' : 'bg-surface-700/40'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${count > 0 ? 'text-brand-400' : 'text-surface-500'}`}
              />
            </div>
            <span
              className={`text-lg font-bold tabular-nums ${
                count > 0 ? 'text-brand-300' : 'text-surface-600'
              }`}
            >
              {count}
            </span>
            <span className="text-2xs text-surface-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="mt-3 text-xs text-surface-500 text-center">
          No related records attached to the secondary company.
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompanyMergeModal({
  isOpen,
  onClose,
  primaryCompanyId,
  secondaryCompanyId,
  onMerged,
}: CompanyMergeModalProps) {
  const { fetchMergePreview, mergeCompanies } = useCompanyMerge();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [selections, setSelections] = useState<MergeFieldSelections>(buildDefaultSelections());
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load preview data whenever the modal opens ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelections(buildDefaultSelections());

    fetchMergePreview(primaryCompanyId, secondaryCompanyId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('Could not load one or both companies. They may have been deleted.');
        } else {
          setPreview(data);
          // Auto-select secondary value when primary field is empty
          const autoSelections = buildDefaultSelections();
          for (const { key } of MERGEABLE_FIELDS) {
            const primaryHas = hasValue(key, data.primary);
            const secondaryHas = hasValue(key, data.secondary);
            if (!primaryHas && secondaryHas) {
              autoSelections[key] = 'secondary';
            }
          }
          setSelections(autoSelections);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, primaryCompanyId, secondaryCompanyId, fetchMergePreview]);

  // ── Keyboard dismiss ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !merging) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, merging, onClose]);

  // ── Toggle a field's selection between primary and secondary ─────────────
  const toggleField = useCallback((key: keyof StoredCompany) => {
    setSelections((prev) => ({
      ...prev,
      [key]: prev[key] === 'primary' ? 'secondary' : 'primary',
    }));
  }, []);

  // ── Execute merge ─────────────────────────────────────────────────────────
  const handleMerge = useCallback(async () => {
    if (!preview) return;

    const ok = await confirm({
      title: 'Confirm Company Merge',
      message: `You are about to permanently merge "${preview.secondary.name}" into "${preview.primary.name}". The secondary company will be deleted. This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Merge',
      cancelText: 'Cancel',
    });

    if (!ok) return;

    setMerging(true);
    try {
      const success = await mergeCompanies(
        primaryCompanyId,
        secondaryCompanyId,
        selections
      );

      if (success) {
        toast.success('Companies merged successfully', {
          description: `"${preview.secondary.name}" has been merged into "${preview.primary.name}".`,
        });
        onMerged();
        onClose();
      } else {
        toast.error('Merge failed', {
          description: 'An unexpected error occurred. No changes were made.',
        });
      }
    } finally {
      setMerging(false);
    }
  }, [
    preview,
    confirm,
    mergeCompanies,
    primaryCompanyId,
    secondaryCompanyId,
    selections,
    onMerged,
    onClose,
  ]);

  // ── Group fields by their category for rendering ──────────────────────────
  const groupedFields = MERGEABLE_FIELDS.reduce<
    Record<string, ReadonlyArray<{ key: keyof StoredCompany; label: string }>>
  >((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    (acc[field.group] as Array<{ key: keyof StoredCompany; label: string }>).push({
      key: field.key,
      label: field.label,
    });
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {ConfirmDialogElement}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="merge-modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-merge-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !merging) onClose();
            }}
          >
            <motion.div
              key="merge-modal-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="glass rounded-xl w-full max-w-4xl my-6 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Modal Header ─────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-500/15 border border-brand-500/25">
                    <Merge className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h2
                      id="company-merge-modal-title"
                      className="text-lg font-bold text-surface-100"
                    >
                      Merge Companies
                    </h2>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Select which values to keep for the surviving record
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={merging}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Close merge dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Warning Banner ───────────────────────────────────────── */}
              <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-danger">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    The secondary company will be permanently deleted after merge. All
                    contacts, activities, and quotes will be reassigned to the surviving
                    company.
                  </p>
                </div>
              </div>

              {/* ── Scrollable Body ──────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Loading state */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-2 border-brand-500/40 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-sm text-surface-400">Loading company data…</p>
                  </div>
                )}

                {/* Error state */}
                {!loading && error && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <AlertTriangle className="w-10 h-10 text-danger/70" />
                    <p className="text-sm text-surface-300 max-w-sm">{error}</p>
                    <Button variant="secondary" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                )}

                {/* Content */}
                {!loading && !error && preview && (
                  <div className="mt-5 flex flex-col gap-5">
                    {/* Company headers */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                      <CompanyColumnHeader company={preview.primary} role="primary" />
                      <div className="flex flex-col items-center justify-center w-7">
                        <ArrowRight className="w-4 h-4 text-surface-500" />
                      </div>
                      <div className="flex justify-end">
                        <CompanyColumnHeader company={preview.secondary} role="secondary" />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-surface-700/50" />

                    {/* Field comparison groups */}
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-surface-400">
                        Click any field cell to select which value to keep in the merged
                        record. Highlighted cells (
                        <span className="inline-flex items-center gap-0.5 text-brand-400 font-medium">
                          <Check className="w-2.5 h-2.5" />
                          teal border
                        </span>
                        ) are the selected values. Fields with identical values are
                        automatically resolved.
                      </p>

                      {Object.entries(groupedFields).map(([group, fields]) => (
                        <FieldGroup
                          key={group}
                          groupName={group}
                          fields={fields}
                          primary={preview.primary}
                          secondary={preview.secondary}
                          selections={selections}
                          onToggle={toggleField}
                        />
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-surface-700/50" />

                    {/* Reassignment preview */}
                    <ReassignmentPreview
                      counts={preview.relatedCounts}
                      primaryName={
                        selections['name'] === 'secondary'
                          ? preview.secondary.name
                          : preview.primary.name
                      }
                    />
                  </div>
                )}
              </div>

              {/* ── Footer ───────────────────────────────────────────────── */}
              {!loading && !error && preview && (
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-700/50 flex-shrink-0">
                  <p className="text-xs text-surface-500 hidden sm:block">
                    Merging{' '}
                    <span className="text-surface-300 font-medium">
                      {preview.secondary.name}
                    </span>{' '}
                    into{' '}
                    <span className="text-surface-300 font-medium">
                      {preview.primary.name}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      disabled={merging}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      icon={Merge}
                      onClick={handleMerge}
                      loading={merging}
                      disabled={merging}
                    >
                      {merging ? 'Merging…' : 'Merge Companies'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
