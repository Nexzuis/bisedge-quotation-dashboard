import { useState } from 'react';
import { FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from '../ui/Toast';
import { useQuoteStore } from '../../store/useQuoteStore';
import { generateQuotePDF, type PdfGenerationOptions } from '../../pdf/generatePDF';
import { validateQuoteSync } from '../../engine/validators';
import { formatDateFilename } from '../../engine/formatters';

export function QuoteGeneratorPanel() {
  const [isExporting, setIsExporting] = useState(false);

  // PDF Options State
  const [includeSpecs, setIncludeSpecs] = useState(true);
  const [includeMarketing, setIncludeMarketing] = useState(true);
  const [customNotes, setCustomNotes] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');

  const quote = useQuoteStore((state) => state);
  const setQuoteType = useQuoteStore((state) => state.setQuoteType);
  const setValidityDays = useQuoteStore((state) => state.setValidityDays);
  const getQuoteTotals = useQuoteStore((state) => state.getQuoteTotals);
  const getSlotPricing = useQuoteStore((state) => state.getSlotPricing);
  const getActiveSlots = useQuoteStore((state) => state.getActiveSlots);

  const totals = getQuoteTotals();
  const activeSlots = getActiveSlots();
  const validationErrors = validateQuoteSync(quote, totals.irr, totals.totalContractValue);

  const hasErrors = validationErrors.some((e) => e.severity === 'error');
  const hasWarnings = validationErrors.some((e) => e.severity === 'warning');

  // Generate preview filename
  const dateStr = formatDateFilename(quote.quoteDate);
  const quoteNum = quote.quoteRef.split('.')[0];
  const clientName = quote.clientName || 'Customer';
  const modelCodes = activeSlots.map((s) => s.modelCode).join(', ');
  const previewFilename = `${dateStr} - Bisedge Quote ${quoteNum} - ${clientName} (${modelCodes}).pdf`;

  const handleExportPDF = async () => {
    if (hasErrors) {
      toast.error('Cannot export PDF', {
        description: 'Please fix validation errors first'
      });
      return;
    }

    setIsExporting(true);

    try {
      // Build slot pricing map
      const slotPricingMap = new Map();
      quote.slots.forEach((slot) => {
        if (!slot.isEmpty && slot.modelCode !== '0') {
          const pricing = getSlotPricing(slot.slotIndex);
          if (pricing) {
            slotPricingMap.set(slot.slotIndex, pricing);
          }
        }
      });

      // Build PDF options
      const pdfOptions: PdfGenerationOptions = {
        includeSpecs,
        includeMarketing,
        quoteType: quote.quoteType,
        customNotes: customNotes.trim() || undefined,
        signatoryName,
        signatoryTitle,
      };

      // Generate PDF
      const result = await generateQuotePDF(quote, totals, slotPricingMap, pdfOptions);

      if (result.success) {
        toast.success('PDF exported successfully!', {
          description: result.filename
        });
      } else {
        toast.error('PDF export failed', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF', {
        description: 'Check console for details'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Panel accent="feature">
      <CardHeader icon={FileText} title="Quote Generator" />

      <div className="space-y-4">
        {/* PDF Status */}
        <div className="glass-feature rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-surface-200">PDF Status</span>
            {hasErrors ? (
              <Badge variant="danger">Has Errors</Badge>
            ) : hasWarnings ? (
              <Badge variant="warning">Has Warnings</Badge>
            ) : (
              <Badge variant="success">Ready</Badge>
            )}
          </div>
          <div className="text-xs text-surface-400">
            {hasErrors
              ? `${validationErrors.filter((e) => e.severity === 'error').length} error(s) must be fixed`
              : hasWarnings
              ? `${validationErrors.filter((e) => e.severity === 'warning').length} warning(s) detected`
              : 'Quote is ready to export'}
          </div>
        </div>

        {/* PDF Options */}
        <div>
          <div className="text-xs font-semibold text-surface-300 mb-2">PDF Options</div>
          <div className="space-y-3">
            {/* Include Specs Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSpecs}
                onChange={(e) => setIncludeSpecs(e.target.checked)}
                className="w-4 h-4 rounded border-surface-700 bg-surface-900 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-surface-300">Include Product Specifications</span>
            </label>

            {/* Include Marketing Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMarketing}
                onChange={(e) => setIncludeMarketing(e.target.checked)}
                className="w-4 h-4 rounded border-surface-700 bg-surface-900 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-surface-300">Include Marketing Pages</span>
            </label>

            {/* Quote Type Dropdown */}
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Quote Type</label>
              <select
                value={quote.quoteType}
                onChange={(e) => setQuoteType(e.target.value as 'rental' | 'rent-to-own' | 'dual')}
                className="w-full px-3 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="rental">Standard Rental</option>
                <option value="rent-to-own">Rent-to-Own</option>
                <option value="dual">Dual Comparison</option>
              </select>
            </div>

            {/* Quote Validity */}
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Quote Validity (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={quote.validityDays ?? 30}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-xs text-surface-500 mt-1">
                Valid until:{' '}
                {(() => {
                  const d = new Date(quote.quoteDate);
                  d.setDate(d.getDate() + (quote.validityDays ?? 30));
                  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
                })()}
              </p>
            </div>

            {/* Signatory Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Sales Manager"
                />
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Custom Notes (optional)</label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                placeholder="Additional notes to append to Terms & Conditions..."
              />
            </div>
          </div>
        </div>

        {/* PDF Content Summary */}
        <div>
          <div className="text-xs font-semibold text-surface-300 mb-2">PDF Contents</div>
          <div className="space-y-1.5">
            <PDFContentItem icon={CheckCircle2} label="Cover Page" included />
            <PDFContentItem icon={CheckCircle2} label="Cover Letter" included />
            <PDFContentItem icon={CheckCircle2} label="Table of Contents" included />
            <PDFContentItem icon={CheckCircle2} label="Marketing Pages" included={includeMarketing} />
            <PDFContentItem icon={CheckCircle2} label="Product Specifications" included={includeSpecs} />
            <PDFContentItem
              icon={activeSlots.length > 0 ? CheckCircle2 : AlertCircle}
              label={`Quotation Table (${activeSlots.length} units)`}
              included={activeSlots.length > 0}
            />
            <PDFContentItem icon={CheckCircle2} label="Terms & Conditions" included />
            <PDFContentItem icon={CheckCircle2} label="Signature Page" included />
          </div>
        </div>

        {/* Filename Preview */}
        <div className="glass rounded-lg p-3">
          <div className="text-xs text-surface-400 mb-1">Export Filename</div>
          <div className="text-xs font-mono text-surface-200 break-all">{previewFilename}</div>
        </div>

        {/* Export Actions */}
        <div className="space-y-2">
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExportPDF}
            loading={isExporting}
            disabled={isExporting || hasErrors}
            className="w-full"
          >
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
          </Button>

          {hasErrors && (
            <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              Fix validation errors before exporting PDF
            </div>
          )}
        </div>

        {/* PDF Info */}
        <div className="text-xs text-surface-500 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-brand-500" />
            <span>Format: A4 Portrait</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-brand-500" />
            <span>Pages: ~13+ (professional quotation)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-brand-500" />
            <span>Includes QR codes and product images</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-brand-500" />
            <span>Auto-downloads to browser default folder</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// Helper component for PDF content list
function PDFContentItem({
  icon: Icon,
  label,
  included,
}: {
  icon: any;
  label: string;
  included: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon
        className={`w-3.5 h-3.5 ${included ? 'text-success' : 'text-surface-600'}`}
      />
      <span className={included ? 'text-surface-300' : 'text-surface-600'}>{label}</span>
    </div>
  );
}
