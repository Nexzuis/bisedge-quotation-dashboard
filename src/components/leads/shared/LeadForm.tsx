import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Save, X } from 'lucide-react';
import type { StoredLead } from '../../../db/interfaces';
import type { LeadSourceName, CompanySize } from '../../../types/leads';

interface LeadFormProps {
  initial?: Partial<StoredLead>;
  onSave: (data: Omit<StoredLead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Mpumalanga', 'Free State', 'Limpopo', 'North West', 'Northern Cape'];
const SOURCES: { value: LeadSourceName; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'google', label: 'Google' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'industry_directory', label: 'Industry Directory' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
];
const SIZES: { value: CompanySize; label: string }[] = [
  { value: '', label: 'Unknown' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

export function LeadForm({ initial, onSave, onCancel }: LeadFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: initial?.companyName || '',
    tradingName: initial?.tradingName || '',
    industry: initial?.industry || '',
    website: initial?.website || '',
    companySize: (initial?.companySize || '') as CompanySize,
    annualRevenueEstimate: initial?.annualRevenueEstimate || '',
    address: initial?.address || '',
    city: initial?.city || '',
    province: initial?.province || '',
    country: initial?.country || 'South Africa',
    decisionMakerName: initial?.decisionMakerName || '',
    decisionMakerTitle: initial?.decisionMakerTitle || '',
    decisionMakerEmail: initial?.decisionMakerEmail || '',
    decisionMakerPhone: initial?.decisionMakerPhone || '',
    decisionMakerLinkedin: initial?.decisionMakerLinkedin || '',
    sourceName: (initial?.sourceName || 'manual') as LeadSourceName,
    sourceUrl: initial?.sourceUrl || '',
    buyProbability: initial?.buyProbability || 5,
    aiReasoning: initial?.aiReasoning || '',
    notes: initial?.notes || '',
    tags: initial?.tags || [],
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        aiConfidence: initial?.aiConfidence || 0,
        scrapedAt: initial?.scrapedAt || '',
        qualificationStatus: initial?.qualificationStatus || 'new',
        qualifiedBy: initial?.qualifiedBy || '',
        qualifiedAt: initial?.qualifiedAt || '',
        rejectionReason: initial?.rejectionReason || '',
        convertedCompanyId: initial?.convertedCompanyId || '',
        convertedContactId: initial?.convertedContactId || '',
        convertedAt: initial?.convertedAt || '',
        convertedBy: initial?.convertedBy || '',
        assignedTo: initial?.assignedTo || '',
        createdBy: initial?.createdBy || '',
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'input w-full text-sm';
  const labelClass = 'text-xs font-medium text-surface-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Company Name *</label>
          <input className={inputClass} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Trading Name</label>
          <input className={inputClass} value={form.tradingName} onChange={(e) => update('tradingName', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Industry</label>
          <input className={inputClass} value={form.industry} onChange={(e) => update('industry', e.target.value)} placeholder="e.g., Mining, Logistics" />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input className={inputClass} value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className={labelClass}>Company Size</label>
          <select className={inputClass} value={form.companySize} onChange={(e) => update('companySize', e.target.value)}>
            {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Province</label>
          <select className={inputClass} value={form.province} onChange={(e) => update('province', e.target.value)}>
            <option value="">Select...</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input className={inputClass} value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
      </div>

      {/* Decision Maker */}
      <div className="border-t border-surface-700/50 pt-4">
        <h4 className="text-sm font-semibold text-surface-200 mb-3">Decision Maker</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} value={form.decisionMakerName} onChange={(e) => update('decisionMakerName', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} value={form.decisionMakerTitle} onChange={(e) => update('decisionMakerTitle', e.target.value)} placeholder="e.g., Operations Manager" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.decisionMakerEmail} onChange={(e) => update('decisionMakerEmail', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={form.decisionMakerPhone} onChange={(e) => update('decisionMakerPhone', e.target.value)} placeholder="+27..." />
          </div>
        </div>
      </div>

      {/* Lead Info */}
      <div className="border-t border-surface-700/50 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Source</label>
            <select className={inputClass} value={form.sourceName} onChange={(e) => update('sourceName', e.target.value)}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Buy Probability (1-10)</label>
            <input type="number" min={1} max={10} className={inputClass} value={form.buyProbability} onChange={(e) => update('buyProbability', Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3">
          <label className={labelClass}>AI Reasoning / Notes</label>
          <textarea className={`${inputClass} h-20 resize-none`} value={form.aiReasoning} onChange={(e) => update('aiReasoning', e.target.value)} placeholder="Why is this a good lead?" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" icon={X} onClick={onCancel}>Cancel</Button>
        <Button variant="primary" icon={Save} loading={saving} disabled={!form.companyName.trim()}>
          {initial?.companyName ? 'Update Lead' : 'Save Lead'}
        </Button>
      </div>
    </form>
  );
}
