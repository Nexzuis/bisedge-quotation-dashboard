import { useState } from 'react';
import { Building2, Pencil, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PipelineStageBadge } from '../shared/PipelineStageBadge';
import { PIPELINE_STAGES } from '../shared/stageConfig';
import { useCompanies } from '../../../hooks/useCompanies';
import { useActivities } from '../../../hooks/useActivities';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../ui/Toast';
import type { StoredCompany } from '../../../db/interfaces';
import type { PipelineStage } from '../../../types/crm';

interface CompanyInfoCardProps {
  company: StoredCompany;
  onUpdate: () => void;
}

export function CompanyInfoCard({ company, onUpdate }: CompanyInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...company });
  const { updateCompany } = useCompanies();
  const { logStageChange } = useActivities();
  const { user } = useAuth();

  const handleSave = async () => {
    try {
      // Check if stage changed
      if (form.pipelineStage !== company.pipelineStage) {
        await logStageChange(company.id, company.pipelineStage, form.pipelineStage, user?.id || '');
      }
      await updateCompany(company.id, {
        name: form.name,
        tradingName: form.tradingName,
        registrationNumber: form.registrationNumber,
        vatNumber: form.vatNumber,
        industry: form.industry,
        website: form.website,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        country: form.country,
        estimatedValue: Number(form.estimatedValue) || 0,
        creditLimit: Number(form.creditLimit) || 0,
        paymentTerms: Number(form.paymentTerms) || 30,
        pipelineStage: form.pipelineStage as PipelineStage,
        notes: form.notes,
        tags: form.tags,
      });
      toast.success('Company updated');
      setEditing(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update company');
    }
  };

  const setField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateAddress = (index: number, value: string) => {
    const newAddr = [...form.address];
    newAddr[index] = value;
    setField('address', newAddr);
  };

  return (
    <div className="glass rounded-xl p-5">
      <AnimatePresence mode="wait">
        {!editing ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-semibold text-surface-100">Company Info</h3>
              </div>
              <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-surface-400 w-28">Stage</span>
                <PipelineStageBadge stage={company.pipelineStage as PipelineStage} />
              </div>
              {company.tradingName && <Row label="Trading As" value={company.tradingName} />}
              {company.registrationNumber && <Row label="Reg. No." value={company.registrationNumber} />}
              {company.vatNumber && <Row label="VAT No." value={company.vatNumber} />}
              {company.industry && <Row label="Industry" value={company.industry} />}
              {company.website && <Row label="Website" value={company.website} />}
              {company.phone && <Row label="Phone" value={company.phone} />}
              {company.email && <Row label="Email" value={company.email} />}
              {company.address?.filter(Boolean).length > 0 && (
                <Row label="Address" value={company.address.filter(Boolean).join(', ')} />
              )}
              {(company.city || company.province) && (
                <Row label="City/Province" value={[company.city, company.province].filter(Boolean).join(', ')} />
              )}
              {company.estimatedValue > 0 && (
                <Row label="Est. Value" value={`R ${company.estimatedValue.toLocaleString()}`} />
              )}
              {company.notes && (
                <div>
                  <div className="text-surface-400 mb-1">Notes</div>
                  <div className="text-surface-300 whitespace-pre-wrap">{company.notes}</div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-semibold text-surface-100">Edit Company</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" icon={X} onClick={() => { setEditing(false); setForm({ ...company }); }}>Cancel</Button>
                <Button variant="primary" icon={Save} onClick={handleSave}>Save</Button>
              </div>
            </div>
            <div className="space-y-3">
              <Input label="Company Name *" value={form.name} onChange={(e) => setField('name', e.target.value)} />
              <Input label="Trading Name" value={form.tradingName} onChange={(e) => setField('tradingName', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Registration No." value={form.registrationNumber} onChange={(e) => setField('registrationNumber', e.target.value)} />
                <Input label="VAT No." value={form.vatNumber} onChange={(e) => setField('vatNumber', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Industry" value={form.industry} onChange={(e) => setField('industry', e.target.value)} />
                <Input label="Website" value={form.website} onChange={(e) => setField('website', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                <Input label="Email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Address Line 1" value={form.address?.[0] || ''} onChange={(e) => updateAddress(0, e.target.value)} />
                <Input label="Address Line 2" value={form.address?.[1] || ''} onChange={(e) => updateAddress(1, e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                <Input label="Province" value={form.province} onChange={(e) => setField('province', e.target.value)} />
                <Input label="Postal Code" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Pipeline Stage</label>
                <select
                  value={form.pipelineStage}
                  onChange={(e) => setField('pipelineStage', e.target.value)}
                  className="input w-full text-sm"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Estimated Value (R)" type="number" value={String(form.estimatedValue || '')} onChange={(e) => setField('estimatedValue', e.target.value)} />
                <Input label="Credit Limit (R)" type="number" value={String(form.creditLimit || '')} onChange={(e) => setField('creditLimit', e.target.value)} />
                <Input label="Payment Terms (days)" type="number" value={String(form.paymentTerms || '')} onChange={(e) => setField('paymentTerms', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="input w-full text-sm min-h-[80px] resize-y"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-surface-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-surface-200">{value}</span>
    </div>
  );
}
