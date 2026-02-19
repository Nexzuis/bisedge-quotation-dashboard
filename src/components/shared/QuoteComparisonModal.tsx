import { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatZAR, formatDate, formatPercentage } from '../../engine/formatters';
import { storedToQuote } from '../../db/serialization';
import { calcSlotPricingFull } from '../../engine/calculationEngine';
import { getDb } from '../../db/DatabaseAdapter';
import type { StoredQuote } from '../../db/interfaces';
import type { QuoteState, QuoteStatus } from '../../types/quote';

interface QuoteComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuoteId?: string;
}

function getStatusVariant(status: QuoteStatus): 'success' | 'danger' | 'warning' | 'brand' | 'info' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending-approval': return 'warning';
    case 'in-review': return 'brand';
    default: return 'info';
  }
}

interface DiffRowProps {
  label: string;
  left: string | number;
  right: string | number;
  formatter?: (v: number) => string;
}

function DiffRow({ label, left, right, formatter }: DiffRowProps) {
  const leftStr = typeof left === 'number' && formatter ? formatter(left) : String(left);
  const rightStr = typeof right === 'number' && formatter ? formatter(right) : String(right);
  const isDifferent = leftStr !== rightStr;

  return (
    <div className={`grid grid-cols-3 gap-4 py-2 px-3 rounded ${isDifferent ? 'bg-yellow-500/5' : ''}`}>
      <div className="text-surface-400 text-sm">{label}</div>
      <div className={`text-sm ${isDifferent ? 'text-yellow-300 font-medium' : 'text-surface-300'}`}>
        {leftStr}
      </div>
      <div className={`text-sm ${isDifferent ? 'text-yellow-300 font-medium' : 'text-surface-300'}`}>
        {rightStr}
      </div>
    </div>
  );
}

export function QuoteComparisonModal({ isOpen, onClose, initialQuoteId }: QuoteComparisonModalProps) {
  const [allQuotes, setAllQuotes] = useState<StoredQuote[]>([]);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const [leftQuote, setLeftQuote] = useState<QuoteState | null>(null);
  const [rightQuote, setRightQuote] = useState<QuoteState | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLeftId('');
      setRightId('');
      setLeftQuote(null);
      setRightQuote(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadQuotes = async () => {
      const quotes = await getDb().listQuotes({ page: 1, pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' }).then((r) => r.items);
      setAllQuotes(quotes);
      if (initialQuoteId) {
        setLeftId(initialQuoteId);
      }
    };
    loadQuotes();
  }, [isOpen, initialQuoteId]);

  useEffect(() => {
    if (leftId) {
      const found = allQuotes.find((q) => q.id === leftId);
      setLeftQuote(found ? storedToQuote(found) : null);
    } else {
      setLeftQuote(null);
    }
  }, [leftId, allQuotes]);

  useEffect(() => {
    if (rightId) {
      const found = allQuotes.find((q) => q.id === rightId);
      setRightQuote(found ? storedToQuote(found) : null);
    } else {
      setRightQuote(null);
    }
  }, [rightId, allQuotes]);

  if (!isOpen) return null;

  const leftPricing = leftQuote?.slots
    .filter((s) => !s.isEmpty)
    .map((s) => calcSlotPricingFull(s, leftQuote.factoryROE));
  const rightPricing = rightQuote?.slots
    .filter((s) => !s.isEmpty)
    .map((s) => calcSlotPricingFull(s, rightQuote.factoryROE));

  const leftTotalMonthly = leftPricing?.reduce((sum, p) => sum + (p?.totalMonthly ?? 0), 0) ?? 0;
  const rightTotalMonthly = rightPricing?.reduce((sum, p) => sum + (p?.totalMonthly ?? 0), 0) ?? 0;
  const leftTotalContract = leftPricing?.reduce((sum, p) => sum + (p?.totalContractValue ?? 0), 0) ?? 0;
  const rightTotalContract = rightPricing?.reduce((sum, p) => sum + (p?.totalContractValue ?? 0), 0) ?? 0;
  const leftUnitCount = leftQuote?.slots.filter((s) => !s.isEmpty).length ?? 0;
  const rightUnitCount = rightQuote?.slots.filter((s) => !s.isEmpty).length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={onClose}
    >
      <div className="glass rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-surface-700 p-6">
          <div className="flex items-center justify-between">
            <h2 id="compare-modal-title" className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand-400" />
              Compare Quotes
            </h2>
            <button onClick={onClose} className="text-surface-400 hover:text-surface-100 transition-colors" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quote selectors */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="input text-sm"
            >
              <option value="">Select first quote...</option>
              {allQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteRef} — {q.clientName || 'No customer'}
                </option>
              ))}
            </select>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="input text-sm"
            >
              <option value="">Select second quote...</option>
              {allQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteRef} — {q.clientName || 'No customer'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!leftQuote || !rightQuote ? (
            <div className="text-center py-12 text-surface-400">
              Select two quotes above to compare them side-by-side.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-4 py-2 px-3 border-b border-surface-700/50">
                <div className="text-xs font-semibold text-surface-500 uppercase">Field</div>
                <div className="text-xs font-semibold text-brand-400 uppercase">
                  {leftQuote.quoteRef}
                  <Badge variant={getStatusVariant(leftQuote.status)} className="ml-2">
                    {leftQuote.status}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-brand-400 uppercase">
                  {rightQuote.quoteRef}
                  <Badge variant={getStatusVariant(rightQuote.status)} className="ml-2">
                    {rightQuote.status}
                  </Badge>
                </div>
              </div>

              {/* General */}
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase mb-1">General</h4>
                <DiffRow label="Customer" left={leftQuote.clientName} right={rightQuote.clientName} />
                <DiffRow label="Contact" left={leftQuote.contactName} right={rightQuote.contactName} />
                <DiffRow label="Quote Date" left={formatDate(leftQuote.quoteDate)} right={formatDate(rightQuote.quoteDate)} />
                <DiffRow label="Quote Type" left={leftQuote.quoteType} right={rightQuote.quoteType} />
              </div>

              {/* Pricing Config */}
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase mb-1">Pricing Configuration</h4>
                <DiffRow label="Factory ROE" left={leftQuote.factoryROE} right={rightQuote.factoryROE} />
                <DiffRow label="Customer ROE" left={leftQuote.customerROE} right={rightQuote.customerROE} />
                <DiffRow label="Interest Rate" left={leftQuote.annualInterestRate} right={rightQuote.annualInterestRate} formatter={(v) => formatPercentage(v, 1)} />
                <DiffRow label="Lease Term" left={`${leftQuote.defaultLeaseTermMonths} months`} right={`${rightQuote.defaultLeaseTermMonths} months`} />
              </div>

              {/* Fleet Summary */}
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase mb-1">Fleet Summary</h4>
                <DiffRow label="Units" left={leftUnitCount} right={rightUnitCount} />
                <DiffRow label="Total Monthly" left={leftTotalMonthly} right={rightTotalMonthly} formatter={(v) => formatZAR(v)} />
                <DiffRow label="Total Contract Value" left={leftTotalContract} right={rightTotalContract} formatter={(v) => formatZAR(v)} />
              </div>

              {/* Per-slot comparison */}
              {Array.from({ length: 6 }, (_, i) => {
                const lSlot = leftQuote.slots[i];
                const rSlot = rightQuote.slots[i];
                if (lSlot.isEmpty && rSlot.isEmpty) return null;
                const lp = leftPricing?.[leftQuote.slots.filter((s, j) => !s.isEmpty && j <= i).length - 1];
                const rp = rightPricing?.[rightQuote.slots.filter((s, j) => !s.isEmpty && j <= i).length - 1];

                return (
                  <div key={i}>
                    <h4 className="text-xs font-semibold text-surface-500 uppercase mb-1">Slot {i + 1}</h4>
                    <DiffRow label="Model" left={lSlot.modelName || '(empty)'} right={rSlot.modelName || '(empty)'} />
                    <DiffRow label="Quantity" left={lSlot.quantity} right={rSlot.quantity} />
                    <DiffRow label="EUR Cost" left={lSlot.eurCost} right={rSlot.eurCost} formatter={(v) => `€ ${v.toLocaleString()}`} />
                    <DiffRow label="Markup" left={lSlot.markupPct} right={rSlot.markupPct} formatter={(v) => formatPercentage(v, 1)} />
                    {lp && rp && (
                      <>
                        <DiffRow label="Selling Price" left={lp.sellingPriceZAR} right={rp.sellingPriceZAR} formatter={(v) => formatZAR(v)} />
                        <DiffRow label="Margin" left={lp.margin} right={rp.margin} formatter={(v) => formatPercentage(v, 1)} />
                        <DiffRow label="Monthly Total" left={lp.totalMonthly} right={rp.totalMonthly} formatter={(v) => formatZAR(v)} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
