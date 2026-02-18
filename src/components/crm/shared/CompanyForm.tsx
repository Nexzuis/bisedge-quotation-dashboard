import { useState, useEffect } from 'react';
import { useCompanies } from '../../../hooks/useCompanies';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import type { PipelineStage } from '../../../types/crm';

interface CompanyFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CompanyForm({ onSaved, onCancel }: CompanyFormProps) {
  const { saveCompany, listCompanies } = useCompanies();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    estimatedValue: 0,
  });

  // Fuzzy duplicate detection on company name
  useEffect(() => {
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setDuplicateWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const companies = await listCompanies();
        const nameLower = formData.name.toLowerCase().trim();
        const match = companies.find((c) =>
          c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase())
        );
        if (match) {
          setDuplicateWarning(`Similar company exists: "${match.name}"`);
        } else {
          setDuplicateWarning('');
        }
      } catch {
        // ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, listCompanies]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await saveCompany({
        name: formData.name,
        tradingName: formData.name,
        registrationNumber: '',
        vatNumber: '',
        industry: formData.industry,
        website: '',
        address: [],
        city: '',
        province: '',
        postalCode: '',
        country: 'South Africa',
        phone: formData.phone,
        email: formData.email,
        pipelineStage: 'lead' as PipelineStage,
        assignedTo: user?.id || '',
        estimatedValue: formData.estimatedValue,
        creditLimit: 0,
        paymentTerms: 30,
        tags: [],
        notes: '',
      });
      toast.success(`Company "${formData.name}" created successfully`);
      onSaved();
    } catch (err) {
      console.error('Failed to create company:', err);
      toast.error('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Company Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          onBlur={validate}
          className={`input w-full ${errors.name ? 'border-danger/50' : ''}`}
          placeholder="Enter company name"
          aria-required="true"
          autoFocus
        />
        {errors.name && <div className="text-xs text-danger mt-1">{errors.name}</div>}
        {duplicateWarning && (
          <div className="text-xs text-warning mt-1">{duplicateWarning}</div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          onBlur={() => {
            if (formData.email && !isValidEmail(formData.email)) {
              setErrors((prev) => ({ ...prev, email: 'Invalid email format' }));
            } else {
              setErrors((prev) => { const { email, ...rest } = prev; return rest; });
            }
          }}
          className={`input w-full ${errors.email ? 'border-danger/50' : ''}`}
          placeholder="contact@company.com"
        />
        {errors.email && <div className="text-xs text-danger mt-1">{errors.email}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="input w-full"
          placeholder="+27 XX XXX XXXX"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Industry
        </label>
        <input
          type="text"
          value={formData.industry}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          className="input w-full"
          placeholder="e.g., Logistics, Manufacturing"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Estimated Value (ZAR)
        </label>
        <input
          type="number"
          value={formData.estimatedValue}
          onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
          className="input w-full"
          placeholder="0"
          min="0"
          step="1000"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          Create Company
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
