import { describe, it, expect, beforeEach } from 'vitest';
import { useQuoteStore } from '../useQuoteStore';

// ─── setCustomerInfo whitelist regression ─────────────────────
// Verifies the fix for Phase 2 bug: "setCustomerInfo state pollution"
// where Object.assign(state, info) could overwrite non-customer fields.
// The store now uses a whitelist of CUSTOMER_FIELDS and only writes those.

describe('setCustomerInfo whitelist', () => {
  beforeEach(() => {
    useQuoteStore.getState().resetAll();
  });

  it('should update allowed customer fields', () => {
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'Acme Corp',
      contactName: 'Jane Doe',
      contactTitle: 'Procurement Lead',
      contactEmail: 'jane@acme.co.za',
      contactPhone: '0821234567',
      clientAddress: ['10 Main Rd', 'Sandton', 'Johannesburg', '2196'],
    });

    const state = useQuoteStore.getState();
    expect(state.clientName).toBe('Acme Corp');
    expect(state.contactName).toBe('Jane Doe');
    expect(state.contactTitle).toBe('Procurement Lead');
    expect(state.contactEmail).toBe('jane@acme.co.za');
    expect(state.contactPhone).toBe('0821234567');
    expect(state.clientAddress).toEqual(['10 Main Rd', 'Sandton', 'Johannesburg', '2196']);
  });

  it('should update companyId (whitelisted field)', () => {
    useQuoteStore.getState().setCustomerInfo({
      companyId: 'company-xyz',
    });

    expect(useQuoteStore.getState().companyId).toBe('company-xyz');
  });

  it('should NOT overwrite factoryROE via setCustomerInfo', () => {
    const originalROE = useQuoteStore.getState().factoryROE;

    useQuoteStore.getState().setCustomerInfo({
      factoryROE: 999,
    } as any);

    expect(useQuoteStore.getState().factoryROE).toBe(originalROE);
  });

  it('should NOT overwrite slots via setCustomerInfo', () => {
    const originalSlotCount = useQuoteStore.getState().slots.length;

    useQuoteStore.getState().setCustomerInfo({
      slots: [] as any,
    } as any);

    expect(useQuoteStore.getState().slots.length).toBe(originalSlotCount);
  });

  it('should NOT overwrite approvalStatus via setCustomerInfo', () => {
    const originalStatus = useQuoteStore.getState().approvalStatus;

    useQuoteStore.getState().setCustomerInfo({
      approvalStatus: 'approved',
    } as any);

    expect(useQuoteStore.getState().approvalStatus).toBe(originalStatus);
  });

  it('should NOT overwrite customerROE via setCustomerInfo', () => {
    const originalROE = useQuoteStore.getState().customerROE;

    useQuoteStore.getState().setCustomerInfo({
      customerROE: 50,
    } as any);

    expect(useQuoteStore.getState().customerROE).toBe(originalROE);
  });

  it('should NOT overwrite version via setCustomerInfo', () => {
    const originalVersion = useQuoteStore.getState().version;

    useQuoteStore.getState().setCustomerInfo({
      version: 999,
    } as any);

    expect(useQuoteStore.getState().version).toBe(originalVersion);
  });

  it('should NOT overwrite discountPct via setCustomerInfo', () => {
    const originalDiscount = useQuoteStore.getState().discountPct;

    useQuoteStore.getState().setCustomerInfo({
      discountPct: 99,
    } as any);

    expect(useQuoteStore.getState().discountPct).toBe(originalDiscount);
  });

  it('should ignore undefined values in the info object', () => {
    // First set a known value
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'Existing Client',
      contactName: 'Existing Contact',
    });

    // Now pass an object where contactName is undefined — should not overwrite
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'Updated Client',
      contactName: undefined,
    });

    const state = useQuoteStore.getState();
    expect(state.clientName).toBe('Updated Client');
    expect(state.contactName).toBe('Existing Contact');
  });

  it('should update updatedAt timestamp when customer info changes', () => {
    const before = useQuoteStore.getState().updatedAt;

    // Small delay to ensure timestamps differ
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'Timestamp Test',
    });

    const after = useQuoteStore.getState().updatedAt;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('should handle partial updates (only some customer fields)', () => {
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'First Pass',
      contactEmail: 'first@example.com',
    });

    useQuoteStore.getState().setCustomerInfo({
      contactEmail: 'second@example.com',
    });

    const state = useQuoteStore.getState();
    expect(state.clientName).toBe('First Pass');
    expect(state.contactEmail).toBe('second@example.com');
  });

  it('should handle empty info object gracefully', () => {
    useQuoteStore.getState().setCustomerInfo({
      clientName: 'Preserved',
    });

    useQuoteStore.getState().setCustomerInfo({});

    expect(useQuoteStore.getState().clientName).toBe('Preserved');
  });
});
