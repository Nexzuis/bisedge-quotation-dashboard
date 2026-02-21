import { useState, useMemo, useEffect } from 'react';
import { Truck, ChevronDown, ChevronUp, DollarSign, Clock, Settings, Zap } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { useQuoteStore } from '../../store/useQuoteStore';
import { useIsReadOnly } from '../../hooks/ReadOnlyContext';
import {
  usePriceListSeries,
  useSeriesData,
  useModelOptions,
  useTelematicsPackages,
  getOptionAvailability,
  getAvailabilityBadge,
  calculateOptionsCost,
  getStandardOptionsForModel,
} from '../../hooks/usePriceList';
import { formatZAR } from '../../engine/formatters';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { SlotIndex, LeaseTermMonths, PriceListOption, ClearingCharges, LocalCosts } from '../../types/quote';

const LEASE_TERMS: LeaseTermMonths[] = [36, 48, 60, 72, 84];

// Group options by spec code prefix for display categories
function getSpecCategory(specCode: string): string {
  const code = parseInt(specCode, 10);
  if (code >= 1100 && code < 1200) return 'Basic';
  if (code >= 1200 && code < 1400) return 'Pedals & Brakes';
  if (code >= 1300 && code < 1400) return 'Wheels & Tires';
  if (code >= 1400 && code < 2000) return 'Wheels & Tires';
  if (code >= 2000 && code < 2300) return 'Battery Compartment';
  if (code >= 2300 && code < 3000) return 'Axle';
  if (code >= 3000 && code < 3500) return 'Mast';
  if (code >= 3500 && code < 4000) return 'Forks & Hydraulics';
  if (code >= 4000 && code < 5000) return 'Controls & Safety';
  if (code >= 5000 && code < 6000) return 'Cabin & Comfort';
  if (code >= 6000 && code < 7000) return 'Electrical';
  if (code >= 7000 && code < 8000) return 'Forks';
  return 'Other';
}

function FleetSlot({ slotIndex }: { slotIndex: SlotIndex }) {
  const { isReadOnly } = useIsReadOnly();
  const slot = useQuoteStore((state) => state.slots[slotIndex]);
  const factoryROE = useQuoteStore((state) => state.factoryROE);
  const defaultLeaseTermMonths = useQuoteStore((state) => state.defaultLeaseTermMonths);
  const selectSeries = useQuoteStore((state) => state.selectSeries);
  const selectModel = useQuoteStore((state) => state.selectModel);
  const toggleOption = useQuoteStore((state) => state.toggleOption);
  const setLocalBatteryCost = useQuoteStore((state) => state.setLocalBatteryCost);
  const selectTelematicsPackage = useQuoteStore((state) => state.selectTelematicsPackage);
  const setClearingCharge = useQuoteStore((state) => state.setClearingCharge);
  const setLocalCost = useQuoteStore((state) => state.setLocalCost);
  const setCommercialField = useQuoteStore((state) => state.setCommercialField);
  const updateSlot = useQuoteStore((state) => state.updateSlot);
  const clearSlot = useQuoteStore((state) => state.clearSlot);
  const getSlotPricing = useQuoteStore((state) => state.getSlotPricing);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showCommercial, setShowCommercial] = useState(false);

  // Series and model data
  const allSeries = usePriceListSeries();
  const seriesData = useSeriesData(slot.seriesCode);
  const modelOptions = useModelOptions(slot.seriesCode, slot.indxColumn);
  const telematicsPackages = useTelematicsPackages();

  // Group options by category
  const groupedOptions = useMemo(() => {
    if (!modelOptions.length) return {};
    const groups: Record<string, PriceListOption[]> = {};
    modelOptions.forEach((opt) => {
      // Skip MODEL spec (1100)
      if (opt.specCode === '1100') return;
      const cat = getSpecCategory(opt.specCode);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(opt);
    });
    return groups;
  }, [modelOptions]);

  // Auto-select standard options when model changes
  useEffect(() => {
    if (!seriesData || !slot.indxColumn || Object.keys(slot.configuration).length > 0) return;

    const stdOpts = getStandardOptionsForModel(seriesData.options, slot.indxColumn, seriesData.models);
    if (Object.keys(stdOpts).length > 0) {
      // Apply standard options
      Object.entries(stdOpts).forEach(([specCode, matNum]) => {
        toggleOption(slotIndex, specCode, matNum);
      });
    }
  }, [slot.indxColumn, seriesData?.seriesCode]);

  // Recalculate configuration cost when options change
  useEffect(() => {
    if (!seriesData || !slot.indxColumn) return;
    const cost = calculateOptionsCost(slot.configuration, seriesData.options, slot.indxColumn, seriesData.models);
    if (cost !== slot.configurationCost) {
      updateSlot(slotIndex, { configurationCost: cost });
    }
  }, [slot.configuration, slot.indxColumn, seriesData]);

  const pricing = getSlotPricing(slotIndex);

  const handleSeriesChange = (seriesCode: string) => {
    if (seriesCode === '') {
      clearSlot(slotIndex);
      setIsExpanded(false);
    } else {
      selectSeries(slotIndex, seriesCode);
      setIsExpanded(true);
    }
  };

  const handleModelChange = (materialNumber: string) => {
    if (!seriesData || materialNumber === '') return;
    const model = seriesData.models.find((m) => m.materialNumber === materialNumber);
    if (model) {
      selectModel(slotIndex, model.materialNumber, model.modelName, model.baseEurCost, model.indxColumn);
    }
  };

  const handleOptionToggle = (option: PriceListOption) => {
    toggleOption(slotIndex, option.specCode, option.materialNumber);
  };

  const handleTelematicsChange = (packageId: string) => {
    if (!packageId) {
      selectTelematicsPackage(slotIndex, '', 0);
      return;
    }
    const pkg = telematicsPackages.find((p) => p.id === packageId);
    if (pkg) {
      selectTelematicsPackage(slotIndex, pkg.id, pkg.costZAR);
    }
  };

  return (
    <fieldset disabled={isReadOnly} className={`border-0 p-0 m-0 min-w-0 glass rounded-lg p-3 transition-all ${slot.isEmpty && !slot.seriesCode ? 'opacity-60' : 'opacity-100 border-brand-500/20'} ${isExpanded ? 'bg-brand-500/5' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-surface-400">Unit {slotIndex + 1}</span>
        <div className="flex items-center gap-1">
          {slot.modelName && (
            <Badge variant="brand" className="text-xs px-1.5 py-0.5">{slot.modelName}</Badge>
          )}
          {pricing && (
            <Badge variant="success" className="text-xs px-1.5 py-0.5">
              {formatZAR(pricing.totalMonthly, false)}/mo
            </Badge>
          )}
        </div>
      </div>

      {/* Step 1: Series Selection */}
      <div className="mb-2">
        <label className="block text-xs text-surface-400 mb-1">Series</label>
        <SearchableSelect
          value={slot.seriesCode}
          onChange={handleSeriesChange}
          placeholder="-- Select Series --"
          options={allSeries.map((s) => ({
            value: s.seriesCode,
            label: `${s.seriesName} (${s.modelCount} models)`,
          }))}
        />
      </div>

      {/* Step 2: Model Selection */}
      {slot.seriesCode && seriesData && (
        <div className="mb-2">
          <label className="block text-xs text-surface-400 mb-1">Model</label>
          <SearchableSelect
            value={slot.modelMaterialNumber}
            onChange={handleModelChange}
            placeholder="-- Select Model --"
            options={seriesData.models.map((m) => ({
              value: m.materialNumber,
              label: `${m.modelName} (Base: R${Math.round(m.baseEurCost * factoryROE).toLocaleString()})`,
            }))}
          />
        </div>
      )}

      {/* Collapsed summary */}
      {slot.modelName && !isExpanded && (
        <div className="space-y-1">
          {pricing && (
            <div className="text-xs text-surface-500 grid grid-cols-2 gap-1">
              <span>Landed: {formatZAR(pricing.landedCostZAR, false)}</span>
              <span>Selling: {formatZAR(pricing.sellingPriceZAR, false)}</span>
            </div>
          )}
          <button onClick={() => setIsExpanded(true)} className="w-full text-xs text-brand-400 hover:text-brand-300 flex items-center justify-center gap-1 mt-1">
            Configure <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Expanded configuration */}
      {slot.modelName && isExpanded && (
        <>
          {/* Quantity, Discount & Lease Term Row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Qty</label>
              <input type="number" min="1" max="99" value={slot.quantity}
                onChange={(e) => updateSlot(slotIndex, { quantity: parseInt(e.target.value) || 1 })}
                className="input w-full text-xs py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Discount %</label>
              <input type="number" min="0" max="100" step="1" value={slot.discountPct || ''}
                onChange={(e) => updateSlot(slotIndex, { discountPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                placeholder="0"
                className="input w-full text-xs py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Term</label>
              <select value={slot.leaseTermMonths}
                onChange={(e) => updateSlot(slotIndex, { leaseTermMonths: parseInt(e.target.value) as LeaseTermMonths })}
                className="input w-full text-xs py-1.5">
                {LEASE_TERMS.map((t) => (
                  <option key={t} value={t}>{t}mo{t === defaultLeaseTermMonths ? ' (Default)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="mb-2">
            <label className="block text-xs text-surface-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Hours/Month
            </label>
            <input type="number" min="0" max="720" value={slot.operatingHoursPerMonth}
              onChange={(e) => updateSlot(slotIndex, { operatingHoursPerMonth: parseInt(e.target.value) || 0 })}
              className="input w-full text-xs py-1.5" />
          </div>

          {/* Step 3: Configuration Options */}
          <div className="mb-2">
            <button onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between text-xs font-semibold text-surface-300 py-1.5 px-2 bg-surface-800/50 rounded hover:bg-surface-700/50">
              <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> Configuration Options ({Object.keys(slot.configuration).length})</span>
              {slot.configurationCost > 0 && <span className="text-brand-400">+R{Math.round(slot.configurationCost * factoryROE).toLocaleString()}</span>}
              {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showConfig && (
              <div className="max-h-60 overflow-y-auto space-y-2 mt-1 bg-surface-900/50 rounded p-2">
                {Object.entries(groupedOptions).map(([category, options]) => (
                  <div key={category}>
                    <div className="text-xs font-bold text-surface-500 uppercase mb-1">{category}</div>
                    {options.map((option) => {
                      if (!seriesData) return null;
                      const avail = getOptionAvailability(option, slot.indxColumn, seriesData.models);
                      if (avail === 0) return null;

                      const badge = getAvailabilityBadge(avail);
                      const isSelected = slot.configuration[option.specCode] === option.materialNumber;
                      const isStandard = avail === 1;

                      return (
                        <label key={option.materialNumber}
                          className={`flex items-center gap-2 text-xs py-0.5 cursor-pointer ${isStandard ? 'text-surface-400' : 'text-surface-300 hover:text-surface-100'}`}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => handleOptionToggle(option)}
                            disabled={isStandard}
                            className="rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500/50 disabled:opacity-50" />
                          {option.notes ? (
                            <Tooltip content={option.notes}>
                              <span className="flex-1 truncate">{option.description}</span>
                            </Tooltip>
                          ) : (
                            <span className="flex-1 truncate">{option.description}</span>
                          )}
                          <span className={`text-xs ${badge.textClass}`}>{badge.label}</span>
                          {avail >= 2 && option.eurPrice > 0 && (
                            <span className="text-xs text-brand-400 font-medium whitespace-nowrap">+R{Math.round(option.eurPrice * factoryROE).toLocaleString()}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4: Costs Section */}
          <div className="mb-2">
            <button onClick={() => setShowCosts(!showCosts)}
              className="w-full flex items-center justify-between text-xs font-semibold text-surface-300 py-1.5 px-2 bg-surface-800/50 rounded hover:bg-surface-700/50">
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Costs</span>
              {showCosts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showCosts && (
              <div className="mt-1 space-y-3 bg-surface-900/50 rounded p-2">
                {/* Local Battery */}
                <div>
                  <div className="text-xs font-bold text-surface-500 uppercase mb-1">Local Battery Cost</div>
                  <input type="text" placeholder="Battery description"
                    value={slot.localBatteryDescription}
                    onChange={(e) => setLocalBatteryCost(slotIndex, slot.localBatteryCostZAR, e.target.value)}
                    className="input w-full text-xs py-1 mb-1" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-surface-500">R</span>
                    <input type="number" min="0" step="100" value={slot.localBatteryCostZAR || ''}
                      onChange={(e) => setLocalBatteryCost(slotIndex, parseFloat(e.target.value) || 0, slot.localBatteryDescription)}
                      placeholder="0" className="input w-full text-xs py-1" />
                  </div>
                </div>

                {/* Telematics Package */}
                <div>
                  <div className="text-xs font-bold text-surface-500 uppercase mb-1">Telematics Package</div>
                  <SearchableSelect
                    value={slot.telematicsPackageId}
                    onChange={handleTelematicsChange}
                    placeholder="None"
                    options={telematicsPackages.map((p) => ({
                      value: p.id,
                      label: `${p.name} (R${p.costZAR.toLocaleString()})`,
                    }))}
                  />
                </div>

                {/* Local Attachment Cost */}
                <div>
                  <div className="text-xs font-bold text-surface-500 uppercase mb-1">Local Attachment Cost (ZAR)</div>
                  <input type="number" min="0" step="100" value={slot.localAttachmentCostZAR || ''}
                    onChange={(e) => updateSlot(slotIndex, { localAttachmentCostZAR: parseFloat(e.target.value) || 0 })}
                    placeholder="0" className="input w-full text-xs py-1" />
                </div>

                {/* Clearing Charges */}
                <div>
                  <div className="text-xs font-bold text-surface-500 uppercase mb-1">Clearing Charges</div>
                  {(['inlandFreight', 'seaFreight', 'portCharges', 'transport', 'destuffing', 'duties', 'warranty'] as (keyof ClearingCharges)[]).map((field) => (
                    <div key={field} className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-surface-400 w-24 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                      <input type="number" min="0" step="100" value={slot.clearingCharges[field] || ''}
                        onChange={(e) => setClearingCharge(slotIndex, field, parseFloat(e.target.value) || 0)}
                        className="input flex-1 text-xs py-0.5" />
                    </div>
                  ))}
                </div>

                {/* Local Costs */}
                <div>
                  <div className="text-xs font-bold text-surface-500 uppercase mb-1">Local Costs</div>
                  {(['assembly', 'loadTest', 'delivery', 'pdi', 'extras'] as (keyof LocalCosts)[]).map((field) => (
                    <div key={field} className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-surface-400 w-24 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                      <input type="number" min="0" step="100" value={slot.localCosts[field] || ''}
                        onChange={(e) => setLocalCost(slotIndex, field, parseFloat(e.target.value) || 0)}
                        className="input flex-1 text-xs py-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 5: Commercial Fields */}
          <div className="mb-2">
            <button onClick={() => setShowCommercial(!showCommercial)}
              className="w-full flex items-center justify-between text-xs font-semibold text-surface-300 py-1.5 px-2 bg-surface-800/50 rounded hover:bg-surface-700/50">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Commercial</span>
              {showCommercial ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showCommercial && (
              <div className="mt-1 space-y-2 bg-surface-900/50 rounded p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Markup %</label>
                    <input type="number" step="0.5" value={slot.markupPct || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'markupPct', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Finance Cost %</label>
                    <input type="number" step="0.25" value={slot.financeCostPct || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'financeCostPct', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                </div>

                <div className="text-xs font-bold text-surface-500 uppercase">Residual Values</div>
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Truck %</label>
                    <input type="number" step="1" value={slot.residualValueTruckPct || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'residualValueTruckPct', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Battery %</label>
                    <input type="number" step="1" value={slot.residualValueBatteryPct || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'residualValueBatteryPct', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Attach %</label>
                    <input type="number" step="1" value={slot.residualValueAttachmentPct || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'residualValueAttachmentPct', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                </div>

                <div className="text-xs font-bold text-surface-500 uppercase">Maintenance Rates (R/hr)</div>
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Truck</label>
                    <input type="number" step="1" value={slot.maintenanceRateTruckPerHr || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'maintenanceRateTruckPerHr', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Tires</label>
                    <input type="number" step="1" value={slot.maintenanceRateTiresPerHr || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'maintenanceRateTiresPerHr', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Attach</label>
                    <input type="number" step="1" value={slot.maintenanceRateAttachmentPerHr || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'maintenanceRateAttachmentPerHr', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                </div>

                <div className="text-xs font-bold text-surface-500 uppercase">Telematics Subscription</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Cost/mo</label>
                    <input type="number" step="10" value={slot.telematicsSubscriptionCostPerMonth || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'telematicsSubscriptionCostPerMonth', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-0.5">Selling/mo</label>
                    <input type="number" step="10" value={slot.telematicsSubscriptionSellingPerMonth || ''}
                      onChange={(e) => setCommercialField(slotIndex, 'telematicsSubscriptionSellingPerMonth', parseFloat(e.target.value) || 0)}
                      className="input w-full text-xs py-0.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-surface-400 mb-0.5">Operator Price/mo (ZAR)</label>
                  <input type="number" step="100" value={slot.operatorPricePerMonth || ''}
                    onChange={(e) => setCommercialField(slotIndex, 'operatorPricePerMonth', parseFloat(e.target.value) || 0)}
                    className="input w-full text-xs py-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* Step 6: Summary Line */}
          {pricing && (
            <div className="bg-surface-800/80 rounded p-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-400">Factory EUR:</span>
                <span className="font-mono text-surface-200">€{pricing.factoryCostEUR.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Factory ZAR:</span>
                <span className="font-mono text-surface-200">{formatZAR(pricing.factoryCostZAR, false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Landed Cost:</span>
                <span className="font-mono text-surface-200">{formatZAR(pricing.landedCostZAR, false)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-700/50 pt-1">
                <span className="text-surface-300 font-semibold">Selling Price:</span>
                <span className="font-mono text-brand-400 font-semibold">{formatZAR(pricing.sellingPriceZAR, false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Margin:</span>
                <span className={`font-mono font-semibold ${pricing.margin >= 25 ? 'text-green-400' : pricing.margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pricing.margin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Lease Rate:</span>
                <span className="font-mono text-surface-200">{formatZAR(pricing.leaseRate, false)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Maintenance:</span>
                <span className="font-mono text-surface-200">{formatZAR(pricing.maintenanceMonthly, false)}/mo</span>
              </div>
              <div className="flex justify-between border-t border-surface-700/50 pt-1">
                <span className="text-surface-300 font-semibold">Total Monthly:</span>
                <span className="font-mono text-brand-400 font-semibold">{formatZAR(pricing.totalMonthly, false)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Cost/hr:</span>
                <span className="font-mono text-surface-200">{formatZAR(pricing.costPerHour, false)}</span>
              </div>
              {slot.quantity > 1 && (
                <div className="flex justify-between border-t border-surface-700/50 pt-1">
                  <span className="text-surface-400">x{slot.quantity} Total Contract:</span>
                  <span className="font-mono text-brand-400">{formatZAR(pricing.totalContractValue, false)}</span>
                </div>
              )}
            </div>
          )}

          {/* Clear / Collapse */}
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => clearSlot(slotIndex)} className="text-xs text-red-400 hover:text-red-300">
              Clear Unit
            </button>
            <button onClick={() => setIsExpanded(false)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Collapse <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </fieldset>
  );
}

export function FleetBuilderPanel() {
  const slots = useQuoteStore((state) => state.slots);

  return (
    <Panel accent="brand">
      <CardHeader icon={Truck} title="Fleet Builder" />

      {/* Fleet Slots Grid */}
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => (
          <FleetSlot key={slot.slotIndex} slotIndex={slot.slotIndex} />
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-surface-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-surface-400">
            {slots.filter((s) => !s.isEmpty && s.modelCode !== '0').length} of 6 units configured
          </span>
          <span className="text-surface-400">
            {slots.reduce((sum, s) => sum + (s.isEmpty ? 0 : s.quantity), 0)} total units
          </span>
        </div>
      </div>
    </Panel>
  );
}
