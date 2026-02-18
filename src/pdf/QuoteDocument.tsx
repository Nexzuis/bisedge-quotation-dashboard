import React from 'react';
import { Document } from '@react-pdf/renderer';
import {
  CoverPage,
  CoverLetterPage,
  TableOfContentsPage,
  LindeFactorPage,
  BisedgePartnerPage,
  SpecImagePage,
  SpecDataPage,
  QuotationTablePage,
  TermsConditionsPage,
  SignaturePage,
} from './components';
import type { PdfQuoteData, PageNumbers } from './types';

interface QuoteDocumentProps {
  data: PdfQuoteData;
  qrCodes: Map<string, string>;
}

/**
 * Calculate page numbers for all sections
 */
function calculatePageNumbers(data: PdfQuoteData, uniqueModels: number): PageNumbers {
  let currentPage = 1;

  const pageNumbers: PageNumbers = {
    cover: currentPage++,
    coverLetter: currentPage++,
    toc: currentPage++,
    quotationStart: 0,
    termsStart: 0,
    signatureStart: 0,
    total: 0,
  };

  // Marketing pages (if included)
  if (data.options.includeMarketing) {
    pageNumbers.lindeFactorStart = currentPage++;
    pageNumbers.bisedgePartnerStart = currentPage++;
  }

  // Spec pages (if included) - 2 pages per unique model
  if (data.options.includeSpecs && uniqueModels > 0) {
    pageNumbers.specsStart = currentPage;
    currentPage += uniqueModels * 2; // Image + Data page per model
  }

  // Quotation page(s)
  pageNumbers.quotationStart = currentPage++;
  if (data.options.quoteType === 'dual') {
    currentPage++; // Additional page for rent-to-own table
  }

  // Terms & Conditions (can be multiple pages, but we'll assume 1-2)
  pageNumbers.termsStart = currentPage;
  currentPage += 2; // Assume 2 pages for T&Cs

  // Signature page
  pageNumbers.signatureStart = currentPage++;

  // Total pages
  pageNumbers.total = currentPage - 1;

  return pageNumbers;
}

/**
 * Get unique models from units (deduplicate by model code)
 */
function getUniqueModels(data: PdfQuoteData) {
  const uniqueMap = new Map<string, typeof data.units[0]>();

  data.units.forEach((unit) => {
    if (!uniqueMap.has(unit.model.code)) {
      uniqueMap.set(unit.model.code, unit);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Main Quote Document Component
 */
export function QuoteDocument({ data, qrCodes }: QuoteDocumentProps) {
  const uniqueModels = getUniqueModels(data);
  const pageNumbers = calculatePageNumbers(data, uniqueModels.length);

  return (
    <Document>
      {/* Page 1: Cover */}
      <CoverPage data={data} />

      {/* Page 2: Cover Letter */}
      <CoverLetterPage data={data} pageNumber={pageNumbers.coverLetter} totalPages={pageNumbers.total} />

      {/* Page 3: Table of Contents */}
      <TableOfContentsPage data={data} pageNumbers={pageNumbers} currentPage={pageNumbers.toc} />

      {/* Pages 4-5: Marketing (optional) */}
      {data.options.includeMarketing && (
        <>
          <LindeFactorPage
            data={data}
            pageNumber={pageNumbers.lindeFactorStart!}
            totalPages={pageNumbers.total}
          />
          <BisedgePartnerPage
            data={data}
            pageNumber={pageNumbers.bisedgePartnerStart!}
            totalPages={pageNumbers.total}
          />
        </>
      )}

      {/* Pages N-M: Product Specifications (optional) */}
      {data.options.includeSpecs &&
        uniqueModels.map((unit, idx) => {
          const pageOffset = idx * 2;
          const imagePage = pageNumbers.specsStart! + pageOffset;
          const dataPage = imagePage + 1;

          return (
            <React.Fragment key={unit.model.code}>
              {/* Spec Image Page */}
              <SpecImagePage
                model={unit.model}
                qrCode={qrCodes.get(unit.model.code)}
                quoteRef={data.quoteRef}
                pageNumber={imagePage}
                totalPages={pageNumbers.total}
              />

              {/* Spec Data Page */}
              <SpecDataPage
                model={unit.model}
                battery={unit.battery}
                quoteRef={data.quoteRef}
                pageNumber={dataPage}
                totalPages={pageNumbers.total}
              />
            </React.Fragment>
          );
        })}

      {/* Quotation Table Page(s) */}
      <QuotationTablePage
        data={data}
        pageNumber={pageNumbers.quotationStart}
        totalPages={pageNumbers.total}
        variant="rental"
      />

      {data.options.quoteType === 'dual' && (
        <QuotationTablePage
          data={data}
          pageNumber={pageNumbers.quotationStart + 1}
          totalPages={pageNumbers.total}
          variant="rent-to-own"
        />
      )}

      {/* Terms & Conditions Page(s) */}
      <TermsConditionsPage
        template={data.termsTemplate}
        customNotes={data.options.customNotes}
        quoteRef={data.quoteRef}
        pageNumber={pageNumbers.termsStart}
        totalPages={pageNumbers.total}
      />

      {/* Signature Page */}
      <SignaturePage
        data={data}
        pageNumber={pageNumbers.signatureStart}
        totalPages={pageNumbers.total}
      />
    </Document>
  );
}
