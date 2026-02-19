import { pdf } from '@react-pdf/renderer';
import { QuoteDocument } from './QuoteDocument';
import { generateQRCode, getLindeProductUrl } from './assets/qrCodeGenerator';
import { getProductImage } from './assets/productImages';
import { defaultTermsTemplate } from './templates/defaultTerms';
import { formatDate, formatDateFilename } from '../engine/formatters';
import type { QuoteState } from '../types/quote';
import type { PdfQuoteData } from './types';
import { getDb } from '../db/DatabaseAdapter';

/**
 * PDF Generation Options
 */
export interface PdfGenerationOptions {
  includeSpecs?: boolean;
  includeMarketing?: boolean;
  quoteType?: 'rental' | 'rent-to-own' | 'dual';
  customNotes?: string;
  termsTemplateId?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

/**
 * Generate and download a quote PDF
 */
export async function generateQuotePDF(
  quoteState: QuoteState,
  totals: any,
  slotPricingMap: Map<number, any>,
  options: PdfGenerationOptions = {}
) {
  try {
    // Set defaults
    const pdfOptions: Required<PdfGenerationOptions> = {
      includeSpecs: options.includeSpecs ?? true,
      includeMarketing: options.includeMarketing ?? true,
      quoteType: options.quoteType ?? quoteState.quoteType,
      customNotes: options.customNotes ?? '',
      termsTemplateId: options.termsTemplateId ?? '',
      signatoryName: options.signatoryName ?? '',
      signatoryTitle: options.signatoryTitle ?? '',
    };

    // Load terms template from database
    let termsTemplate = defaultTermsTemplate;
    if (pdfOptions.termsTemplateId) {
      const template = await getDb().getTemplate(pdfOptions.termsTemplateId);
      if (template && template.content && typeof template.content === 'object') {
        termsTemplate = template.content as typeof defaultTermsTemplate;
      }
    }

    // Get active slots
    const activeSlots = quoteState.slots.filter((s) => !s.isEmpty && s.modelCode !== '0');

    // Build unit data from slot state (no DB lookups needed)
    const unitsData = activeSlots.map((slot, idx) => {
      const pricing = slotPricingMap.get(slot.slotIndex);
      if (!pricing) return null;

      return {
        itemNo: idx + 1,
        model: {
          code: slot.modelCode,
          name: slot.modelName,
          category: '',
          specifications: {} as Record<string, string>,
        },
        battery: slot.batteryId && slot.batteryId !== 'none'
          ? {
              id: slot.batteryId,
              name: slot.batteryName || slot.batteryId,
              chemistry: slot.batteryChemistry || 'lead-acid',
              voltage: 0,
              capacity: 0,
            }
          : undefined,
        quantity: slot.quantity,
        operatingHours: slot.operatingHoursPerMonth,
        leaseTerm: slot.leaseTermMonths,
        monthlyLeaseRate: pricing.leaseRate,
        additionalCosts: {
          maintenance: pricing.maintenanceMonthly,
          fleetManagement: slot.operatorPricePerMonth,
          telematics: slot.telematicsSubscriptionSellingPerMonth,
        },
        totalMonthly: pricing.totalMonthly,
      };
    });

    // Filter out nulls
    const validUnits = unitsData.filter((u) => u !== null) as NonNullable<typeof unitsData[0]>[];

    // Calculate totals
    const uniqueTerms = [...new Set(validUnits.map((u) => u.leaseTerm))];
    const hasMixedTerms = uniqueTerms.length > 1;

    // Format dates — use canonical formatDate from formatters
    const validityDays = quoteState.validityDays ?? 30;
    const quoteDate = formatDate(new Date(quoteState.quoteDate));
    const validUntilDate = new Date(quoteState.quoteDate);
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);
    const validUntil = formatDate(validUntilDate);

    // Build PDF data structure
    const pdfData: PdfQuoteData = {
      quoteRef: quoteState.quoteRef,
      version: quoteState.version,
      date: quoteDate,
      validUntil: validUntil,
      customer: {
        name: quoteState.clientName || 'Customer',
        contactPerson: quoteState.contactName || 'Contact Person',
        address: quoteState.clientAddress.length > 0 ? quoteState.clientAddress : ['Address Line 1', 'City, Postal Code'],
        phone: quoteState.contactPhone || undefined,
        email: quoteState.contactEmail || undefined,
      },
      units: validUnits,
      totals: {
        totalMonthly: totals.totalMonthly,
        leaseTerm: hasMixedTerms ? null : validUnits[0]?.leaseTerm || 60,
        totalContractValue: totals.totalContractValue,
      },
      options: {
        includeSpecs: pdfOptions.includeSpecs,
        includeMarketing: pdfOptions.includeMarketing,
        quoteType: pdfOptions.quoteType,
        customNotes: pdfOptions.customNotes,
      },
      termsTemplate,
      signatory: {
        name: pdfOptions.signatoryName,
        title: pdfOptions.signatoryTitle,
      },
    };

    // Pre-generate QR codes and product images for unique models
    const qrCodes = new Map<string, string>();
    const productImages = new Map<string, string>();
    const uniqueModels = new Set(validUnits.map((u) => u.model.code));

    for (const modelCode of uniqueModels) {
      const url = getLindeProductUrl(modelCode);
      const qrCode = await generateQRCode(url);
      qrCodes.set(modelCode, qrCode);

      const unit = validUnits.find((u) => u.model.code === modelCode)!;
      productImages.set(modelCode, getProductImage(modelCode, unit.model.name));
    }

    // Generate PDF
    const blob = await pdf(<QuoteDocument data={pdfData} qrCodes={qrCodes} productImages={productImages} />).toBlob();

    // Generate filename
    const dateStr = formatDateFilename(quoteState.quoteDate);
    const quoteNum = quoteState.quoteRef.split('.')[0];
    const clientName = quoteState.clientName || 'Customer';
    const modelCodes = Array.from(uniqueModels).join(', ');
    const filename = `${dateStr} - Bisedge Quote ${quoteNum} - ${clientName} (${modelCodes}).pdf`;

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
