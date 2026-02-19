import { describe, it, expect } from 'vitest';
import { quoteToStored, storedToQuote } from '../serialization';
import type { QuoteState } from '../../types/quote';

function createTestQuoteState(): QuoteState {
  const now = new Date('2025-06-15T10:30:00.000Z');
  return {
    id: 'test-id-123',
    quoteRef: 'Q-2142.0',
    version: 1,
    quoteDate: now,
    status: 'draft',

    clientName: 'Test Company Pty Ltd',
    contactName: 'John Doe',
    contactTitle: 'Procurement Manager',
    contactEmail: 'john@test.co.za',
    contactPhone: '0728399058',
    clientAddress: ['123 Main Street', 'Sandton', 'Johannesburg', '2196'],

    factoryROE: 20.60,
    customerROE: 21.50,
    discountPct: 5,
    annualInterestRate: 9.5,

    defaultLeaseTermMonths: 60,
    batteryChemistryLock: null,
    quoteType: 'rental',

    slots: Array.from({ length: 6 }, (_, i) => ({
      slotIndex: i,
      isEmpty: i > 0,
      seriesCode: i === 0 ? '12750000000' : '',
      modelCode: i === 0 ? 'E16C' : '0',
      modelName: i === 0 ? 'E16C-01' : '',
      modelDescription: i === 0 ? 'Electric Counterbalance 1.6t' : '',
      modelMaterialNumber: i === 0 ? 'MAT-001' : '',
      indxColumn: 0,
      eurCost: i === 0 ? 15000 : 0,
      discountPct: 0,
      quantity: 1,
      operatingHoursPerMonth: 180,
      leaseTermMonths: 60,
      configuration: {},
      configurationCost: 0,
      configurationSummary: [],
      isConfigured: true,
      batteryCompartmentOption: '',
      localBatteryCostZAR: 0,
      localBatteryDescription: '',
      telematicsPackageId: '',
      telematicsPackageCostZAR: 0,
      localAttachmentCostZAR: 0,
      localTelematicsCostZAR: 0,
      attachments: [],
      attachmentsCost: 0,
      clearingCharges: { inlandFreight: 0, seaFreight: 0, portCharges: 0, transport: 0, destuffing: 0, duties: 0, warranty: 0 },
      localCosts: { assembly: 0, loadTest: 0, delivery: 0, pdi: 0, extras: 0 },
      markupPct: 25,
      residualValueTruckPct: 15,
      residualValueBatteryPct: 0,
      residualValueAttachmentPct: 0,
      financeCostPct: 9.5,
      maintenanceRateTruckPerHr: 10,
      maintenanceRateTiresPerHr: 5,
      maintenanceRateAttachmentPerHr: 3,
      telematicsSubscriptionCostPerMonth: 200,
      telematicsSubscriptionSellingPerMonth: 350,
      operatorPricePerMonth: 0,
      containerLength: 0,
      containerWidth: 0,
      containerHeight: 0,
      containerWeight: 0,
      batteryId: '',
      batteryChemistry: null,
      batteryName: '',
      batteryCost: 0,
      maintenanceCostPerMonth: 0,
      fleetMgmtCostPerMonth: 0,
      telematicsCostPerMonth: 250,
      mastType: '',
      selectedVariant: '',
    })),
    shippingEntries: [
      {
        id: 'ship-1',
        description: 'Main shipment',
        containerType: "40' standard",
        quantity: 2,
        costZAR: 85000,
      },
    ],

    approvalTier: 0,
    approvalStatus: 'draft',
    approvalNotes: '',
    overrideIRR: false,
    submittedBy: '',
    submittedAt: null,
    approvedBy: '',
    approvedAt: null,

    currentAssigneeId: null,
    currentAssigneeRole: null,
    approvalChain: [],

    createdBy: 'user-1',
    assignedTo: null,
    lockedBy: null,
    lockedAt: null,

    companyId: 'company-abc',

    createdAt: now,
    updatedAt: now,
  };
}

// ─── quoteToStored ─────────────────────────────────────────────
describe('quoteToStored', () => {
  it('converts Date fields to ISO strings', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);

    expect(typeof stored.quoteDate).toBe('string');
    expect(typeof stored.createdAt).toBe('string');
    expect(typeof stored.updatedAt).toBe('string');
    expect(stored.quoteDate).toBe('2025-06-15T10:30:00.000Z');
  });

  it('serializes slots to JSON string', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);

    expect(typeof stored.slots).toBe('string');
    const parsed = JSON.parse(stored.slots);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(6);
  });

  it('serializes shipping entries to JSON string', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);

    expect(typeof stored.shippingEntries).toBe('string');
    const parsed = JSON.parse(stored.shippingEntries as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('serializes approvalChain to JSON string', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);

    expect(typeof stored.approvalChain).toBe('string');
    expect(JSON.parse(stored.approvalChain as string)).toEqual([]);
  });

  it('handles null date fields', () => {
    const state = createTestQuoteState();
    state.submittedAt = null;
    state.approvedAt = null;
    state.lockedAt = null;

    const stored = quoteToStored(state);
    expect(stored.submittedAt).toBeNull();
    expect(stored.approvedAt).toBeNull();
    expect(stored.lockedAt).toBeNull();
  });

  it('preserves scalar fields exactly', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);

    expect(stored.id).toBe('test-id-123');
    expect(stored.quoteRef).toBe('Q-2142.0');
    expect(stored.version).toBe(1);
    expect(stored.status).toBe('draft');
    expect(stored.clientName).toBe('Test Company Pty Ltd');
    expect(stored.factoryROE).toBe(20.60);
    expect(stored.companyId).toBe('company-abc');
  });
});

// ─── storedToQuote ─────────────────────────────────────────────
describe('storedToQuote', () => {
  it('converts ISO strings back to Date objects', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);
    const restored = storedToQuote(stored);

    expect(restored.quoteDate).toBeInstanceOf(Date);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.updatedAt).toBeInstanceOf(Date);
  });

  it('deserializes slots from JSON string', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);
    const restored = storedToQuote(stored);

    expect(Array.isArray(restored.slots)).toBe(true);
    expect(restored.slots).toHaveLength(6);
    expect(restored.slots[0].modelCode).toBe('E16C');
    expect(restored.slots[0].eurCost).toBe(15000);
  });

  it('deserializes shipping entries from JSON string', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);
    const restored = storedToQuote(stored);

    expect(Array.isArray(restored.shippingEntries)).toBe(true);
    expect(restored.shippingEntries).toHaveLength(1);
    expect(restored.shippingEntries[0].description).toBe('Main shipment');
  });

  it('handles null submittedAt/approvedAt/lockedAt', () => {
    const state = createTestQuoteState();
    const stored = quoteToStored(state);
    const restored = storedToQuote(stored);

    expect(restored.submittedAt).toBeNull();
    expect(restored.approvedAt).toBeNull();
    expect(restored.lockedAt).toBeNull();
  });
});

// ─── Roundtrip ─────────────────────────────────────────────────
describe('serialization roundtrip', () => {
  it('preserves all data through serialize → deserialize', () => {
    const original = createTestQuoteState();
    const stored = quoteToStored(original);
    const restored = storedToQuote(stored);

    // Identity
    expect(restored.id).toBe(original.id);
    expect(restored.quoteRef).toBe(original.quoteRef);
    expect(restored.version).toBe(original.version);
    expect(restored.status).toBe(original.status);

    // Customer info
    expect(restored.clientName).toBe(original.clientName);
    expect(restored.contactName).toBe(original.contactName);
    expect(restored.contactEmail).toBe(original.contactEmail);

    // Pricing config
    expect(restored.factoryROE).toBe(original.factoryROE);
    expect(restored.customerROE).toBe(original.customerROE);
    expect(restored.discountPct).toBe(original.discountPct);
    expect(restored.annualInterestRate).toBe(original.annualInterestRate);

    // Dates (compare timestamps since Date objects won't be ===)
    expect(restored.quoteDate.getTime()).toBe(original.quoteDate.getTime());
    expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
    expect(restored.updatedAt.getTime()).toBe(original.updatedAt.getTime());

    // Slots
    expect(restored.slots).toHaveLength(6);
    expect(restored.slots[0].modelCode).toBe(original.slots[0].modelCode);
    expect(restored.slots[0].eurCost).toBe(original.slots[0].eurCost);
    expect(restored.slots[0].markupPct).toBe(original.slots[0].markupPct);
    expect(restored.slots[0].financeCostPct).toBe(original.slots[0].financeCostPct);

    // CRM
    expect(restored.companyId).toBe(original.companyId);
    expect(restored.shippingEntries).toEqual(original.shippingEntries);

    // Approval
    expect(restored.approvalChain).toEqual(original.approvalChain);
  });

  it('preserves slot with non-null Date fields through roundtrip', () => {
    const original = createTestQuoteState();
    original.submittedAt = new Date('2025-07-01T14:00:00.000Z');
    original.approvedAt = new Date('2025-07-02T09:00:00.000Z');
    original.lockedAt = new Date('2025-07-01T13:55:00.000Z');

    const stored = quoteToStored(original);
    const restored = storedToQuote(stored);

    expect(restored.submittedAt!.getTime()).toBe(original.submittedAt.getTime());
    expect(restored.approvedAt!.getTime()).toBe(original.approvedAt.getTime());
    expect(restored.lockedAt!.getTime()).toBe(original.lockedAt.getTime());
  });

  it('handles approval chain roundtrip', () => {
    const original = createTestQuoteState();
    original.approvalChain = [
      {
        id: 'chain-1',
        timestamp: '2025-07-01T14:00:00.000Z',
        fromUserId: 'user-1',
        fromUserName: 'John',
        fromRole: 'sales_rep',
        toUserId: 'user-2',
        toUserName: 'Jane',
        toRole: 'sales_manager',
        action: 'submitted',
        notes: 'Please review',
      },
    ];

    const stored = quoteToStored(original);
    const restored = storedToQuote(stored);

    expect(restored.approvalChain).toHaveLength(1);
    expect(restored.approvalChain[0].id).toBe('chain-1');
    expect(restored.approvalChain[0].action).toBe('submitted');
    expect(restored.approvalChain[0].notes).toBe('Please review');
  });
});
