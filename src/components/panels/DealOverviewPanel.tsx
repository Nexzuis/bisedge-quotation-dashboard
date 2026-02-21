import { useState } from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { useQuoteStore } from '../../store/useQuoteStore';
import { validateEmail, validatePhone } from '../../engine/validators';
import { useIsReadOnly } from '../../hooks/ReadOnlyContext';

export function DealOverviewPanel() {
  const clientName = useQuoteStore((state) => state.clientName);
  const contactName = useQuoteStore((state) => state.contactName);
  const contactEmail = useQuoteStore((state) => state.contactEmail);
  const contactPhone = useQuoteStore((state) => state.contactPhone);
  const clientAddress = useQuoteStore((state) => state.clientAddress);
  const setCustomerInfo = useQuoteStore((state) => state.setCustomerInfo);

  const { isReadOnly } = useIsReadOnly();
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  return (
    <Panel accent="brand">
      <CardHeader icon={User} title="Deal Overview" />

      <fieldset disabled={isReadOnly} className="border-0 p-0 m-0 min-w-0">
      <div className="space-y-4">
        {/* Client Name */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setCustomerInfo({ clientName: e.target.value })}
            placeholder="Enter client name..."
            className="input w-full"
          />
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setCustomerInfo({ contactName: e.target.value })}
            placeholder="Enter contact name..."
            className="input w-full"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => {
              const value = e.target.value;
              setCustomerInfo({ contactEmail: value });
              setEmailError(validateEmail(value));
            }}
            placeholder="email@example.com"
            className={`input w-full ${emailError ? 'border-danger/50 focus:ring-danger/50' : ''}`}
          />
          {emailError && (
            <div className="text-xs text-danger mt-1">{emailError}</div>
          )}
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => {
              const value = e.target.value;
              setCustomerInfo({ contactPhone: value });
              setPhoneError(validatePhone(value));
            }}
            placeholder="+27 XX XXX XXXX"
            className={`input w-full ${phoneError ? 'border-danger/50 focus:ring-danger/50' : ''}`}
          />
          {phoneError && (
            <div className="text-xs text-danger mt-1">{phoneError}</div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </label>
          {clientAddress.map((line, index) => (
            <input
              key={index}
              type="text"
              value={line}
              onChange={(e) => {
                const newAddress = [...clientAddress];
                newAddress[index] = e.target.value;
                setCustomerInfo({ clientAddress: newAddress });
              }}
              placeholder={
                index === 0
                  ? 'Street address'
                  : index === 1
                  ? 'City'
                  : index === 2
                  ? 'Province, Postal Code'
                  : 'Country'
              }
              className="input w-full mt-2"
            />
          ))}
        </div>
      </div>
      </fieldset>
    </Panel>
  );
}
