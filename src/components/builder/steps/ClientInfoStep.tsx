import { useEffect, useState, useRef } from 'react';
import { Building2, AlertTriangle } from 'lucide-react';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { useBuilder } from '../BuilderContext';
import { StepHeader } from '../shared/StepHeader';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { CompanyPickerModal } from '../../crm/shared/CompanyPickerModal';
import { CompanyAutocomplete } from '../../ui/CompanyAutocomplete';
import { ContactPicker } from '../shared/ContactPicker';
import { useCompanies } from '../../../hooks/useCompanies';
import { isSimilarCompanyName } from '../../../utils/fuzzyMatch';
import type { StoredCompany, StoredContact } from '../../../db/interfaces';

export function ClientInfoStep() {
  const clientName = useQuoteStore((s) => s.clientName);
  const contactName = useQuoteStore((s) => s.contactName);
  const contactTitle = useQuoteStore((s) => s.contactTitle);
  const contactEmail = useQuoteStore((s) => s.contactEmail);
  const contactPhone = useQuoteStore((s) => s.contactPhone);
  const clientAddress = useQuoteStore((s) => s.clientAddress);
  const companyId = useQuoteStore((s) => s.companyId);
  const setCustomerField = useQuoteStore((s) => s.setCustomerField);
  const setCustomerInfo = useQuoteStore((s) => s.setCustomerInfo);

  const [showPicker, setShowPicker] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<StoredCompany | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { setCanProceed } = useBuilder();
  const { searchCompanies } = useCompanies();
  const dupeSearchIdRef = useRef(0);

  const handleCompanySelect = (company: StoredCompany, primaryContact: StoredContact | null) => {
    setCustomerInfo({
      companyId: company.id,
      clientName: company.name,
      clientAddress: [company.address?.[0] || '', company.city || '', company.province || '', company.postalCode || ''],
      ...(primaryContact && {
        contactName: `${primaryContact.firstName} ${primaryContact.lastName}`.trim(),
        contactTitle: primaryContact.title || '',
        contactEmail: primaryContact.email || '',
        contactPhone: primaryContact.phone || '',
      }),
    } as any);
    setShowPicker(false);
    setDuplicateMatch(null);
    setDuplicateDismissed(false);
  };

  // Handle inline autocomplete selection
  const handleAutocompleteSelect = (company: StoredCompany) => {
    setCustomerInfo({
      companyId: company.id,
      clientName: company.name,
      clientAddress: [company.address?.[0] || '', company.city || '', company.province || '', company.postalCode || ''],
    } as any);
    setDuplicateMatch(null);
    setDuplicateDismissed(false);
  };

  // Handle unlink
  const handleUnlink = () => {
    setCustomerField('companyId', undefined);
  };

  // Handle contact selection from ContactPicker
  const handleContactSelect = (contact: StoredContact) => {
    setCustomerInfo({
      contactName: `${contact.firstName} ${contact.lastName}`.trim(),
      contactTitle: contact.title || '',
      contactEmail: contact.email || '',
      contactPhone: contact.phone || '',
    } as any);
  };

  // Handle manual contact entry
  const handleManualContact = () => {
    setCustomerInfo({
      contactName: '',
      contactTitle: '',
      contactEmail: '',
      contactPhone: '',
    } as any);
  };

  // Link duplicate match
  const handleLinkDuplicate = async () => {
    if (!duplicateMatch) return;
    // Use the same flow as autocomplete select — fills company + address
    handleAutocompleteSelect(duplicateMatch);
  };

  // Validation: client name + contact name required
  useEffect(() => {
    setCanProceed(clientName.trim().length > 0 && contactName.trim().length > 0);
  }, [clientName, contactName, setCanProceed]);

  // Duplicate detection (fuzzy) — runs when companyId is NOT set
  useEffect(() => {
    if (companyId || clientName.trim().length < 3 || duplicateDismissed) {
      setDuplicateMatch(null);
      return;
    }

    const id = ++dupeSearchIdRef.current;
    const timer = setTimeout(async () => {
      const candidates = await searchCompanies(clientName);
      if (id !== dupeSearchIdRef.current) return;

      const match = candidates.find(
        (c) =>
          isSimilarCompanyName(clientName, c.name) ||
          (c.tradingName && isSimilarCompanyName(clientName, c.tradingName))
      );
      setDuplicateMatch(match || null);
    }, 500);

    return () => clearTimeout(timer);
  }, [clientName, companyId, duplicateDismissed, searchCompanies]);

  const updateAddress = (index: number, value: string) => {
    const newAddress = [...clientAddress];
    newAddress[index] = value;
    setCustomerField('clientAddress', newAddress);
  };

  return (
    <div className="glass rounded-xl p-6">
      <StepHeader
        step={0}
        title="Client Information"
        subtitle="Enter the client and contact details for this quote."
      />

      <div className="space-y-6">
        {/* Company Info */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-300">Company</h3>
            <Button variant="ghost" icon={Building2} onClick={() => setShowPicker(true)}>
              {companyId ? 'Change Company' : 'Link Company'}
            </Button>
          </div>

          <CompanyAutocomplete
            value={clientName}
            onChange={(val) => setCustomerField('clientName', val)}
            onSelect={handleAutocompleteSelect}
            onClear={handleUnlink}
            linkedCompanyId={companyId}
            onOpenChange={setDropdownOpen}
          />

          {/* Duplicate warning */}
          {duplicateMatch && !companyId && !dropdownOpen && (
            <div className="mt-3 flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-200">
                  A company called <span className="font-semibold">"{duplicateMatch.name}"</span> already exists.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleLinkDuplicate}
                    className="px-2.5 py-1 text-[11px] font-medium rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                  >
                    Link to it
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDuplicateDismissed(true); setDuplicateMatch(null); }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Contact Person</h3>

          {companyId && (
            <ContactPicker
              companyId={companyId}
              onSelect={handleContactSelect}
              onManual={handleManualContact}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Name *"
              placeholder="e.g. John Smith"
              value={contactName}
              onChange={(e) => setCustomerField('contactName', e.target.value)}
            />
            <Input
              label="Title"
              placeholder="e.g. Warehouse Manager"
              value={contactTitle}
              onChange={(e) => setCustomerField('contactTitle', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@company.co.za"
              value={contactEmail}
              onChange={(e) => setCustomerField('contactEmail', e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+27 72 839 9058"
              value={contactPhone}
              onChange={(e) => setCustomerField('contactPhone', e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Address Line 1"
              placeholder="Street address"
              value={clientAddress[0] || ''}
              onChange={(e) => updateAddress(0, e.target.value)}
            />
            <Input
              label="Address Line 2"
              placeholder="Suburb / area"
              value={clientAddress[1] || ''}
              onChange={(e) => updateAddress(1, e.target.value)}
            />
            <Input
              label="City"
              placeholder="City"
              value={clientAddress[2] || ''}
              onChange={(e) => updateAddress(2, e.target.value)}
            />
            <Input
              label="Postal Code"
              placeholder="Postal code"
              value={clientAddress[3] || ''}
              onChange={(e) => updateAddress(3, e.target.value)}
            />
          </div>
        </div>
      </div>

      <CompanyPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleCompanySelect}
        onSkip={() => setShowPicker(false)}
      />
    </div>
  );
}
