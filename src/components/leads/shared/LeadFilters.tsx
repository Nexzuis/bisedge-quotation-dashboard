import { RotateCcw } from 'lucide-react';
import { useLeadStore } from '../../../store/useLeadStore';
import type { QualificationStatus, LeadSourceName } from '../../../types/leads';

const STATUS_OPTIONS: { value: QualificationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'stale', label: 'Stale' },
];

const SOURCE_OPTIONS: { value: LeadSourceName | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'google', label: 'Google' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'industry_directory', label: 'Industry Directory' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'manual', label: 'Manual' },
  { value: 'ai_scraper', label: 'AI Scraper' },
];

const PROVINCE_OPTIONS = [
  '', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Mpumalanga',
  'Free State', 'Limpopo', 'North West', 'Northern Cape',
];

const INDUSTRY_OPTIONS = [
  '', 'Mining', 'Manufacturing', 'Logistics', 'Food & Beverage', 'Retail',
  'Construction', 'Agriculture', 'Automotive', 'Warehousing', 'Chemical',
];

const SCORE_OPTIONS = [
  { value: 0, label: 'Any Score' },
  { value: 5, label: '5+ Score' },
  { value: 7, label: '7+ Score' },
  { value: 8, label: '8+ Hot' },
  { value: 9, label: '9+ Very Hot' },
];

export function LeadFilters() {
  const statusFilter = useLeadStore((s) => s.statusFilter);
  const sourceFilter = useLeadStore((s) => s.sourceFilter);
  const provinceFilter = useLeadStore((s) => s.provinceFilter);
  const industryFilter = useLeadStore((s) => s.industryFilter);
  const minScoreFilter = useLeadStore((s) => s.minScoreFilter);
  const setStatusFilter = useLeadStore((s) => s.setStatusFilter);
  const setSourceFilter = useLeadStore((s) => s.setSourceFilter);
  const setProvinceFilter = useLeadStore((s) => s.setProvinceFilter);
  const setIndustryFilter = useLeadStore((s) => s.setIndustryFilter);
  const setMinScoreFilter = useLeadStore((s) => s.setMinScoreFilter);
  const resetFilters = useLeadStore((s) => s.resetFilters);

  const hasFilters = statusFilter !== 'all' || sourceFilter !== 'all' || provinceFilter !== '' || industryFilter !== '' || minScoreFilter > 0;

  const selectClass = 'bg-surface-800/50 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as QualificationStatus | 'all')}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value as LeadSourceName | 'all')}
        className={selectClass}
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={provinceFilter}
        onChange={(e) => setProvinceFilter(e.target.value)}
        className={selectClass}
      >
        <option value="">All Provinces</option>
        {PROVINCE_OPTIONS.filter(Boolean).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <select
        value={industryFilter}
        onChange={(e) => setIndustryFilter(e.target.value)}
        className={selectClass}
      >
        <option value="">All Industries</option>
        {INDUSTRY_OPTIONS.filter(Boolean).map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      <select
        value={minScoreFilter}
        onChange={(e) => setMinScoreFilter(Number(e.target.value))}
        className={selectClass}
      >
        {SCORE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
