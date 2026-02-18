import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { PdfQuoteData, PageNumbers } from '../types';

interface TableOfContentsPageProps {
  data: PdfQuoteData;
  pageNumbers: PageNumbers;
  currentPage: number;
}

export function TableOfContentsPage({
  data,
  pageNumbers,
  currentPage,
}: TableOfContentsPageProps) {
  const tocItems = [
    { title: 'Cover Letter', page: pageNumbers.coverLetter },
    ...(data.options.includeMarketing
      ? [
          { title: 'The Linde Factor', page: pageNumbers.lindeFactorStart! },
          { title: 'About Bisedge', page: pageNumbers.bisedgePartnerStart! },
        ]
      : []),
    ...(data.options.includeSpecs
      ? [{ title: 'Product Specifications', page: pageNumbers.specsStart! }]
      : []),
    { title: 'Quotation', page: pageNumbers.quotationStart },
    { title: 'Terms & Conditions', page: pageNumbers.termsStart },
    { title: 'Client Acceptance', page: pageNumbers.signatureStart },
  ];

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      <Text style={pdfStyles.h2}>Table of Contents</Text>

      <View style={{ marginTop: 20 }}>
        {tocItems.map((item, idx) => (
          <View key={idx} style={pdfStyles.tocItem}>
            <Text style={pdfStyles.tocTitle}>{item.title}</Text>
            <View style={pdfStyles.tocDots} />
            <Text style={pdfStyles.tocPage}>{item.page}</Text>
          </View>
        ))}
      </View>

      {/* Note about validity */}
      <View
        style={{
          marginTop: 40,
          padding: 12,
          backgroundColor: COLORS.offWhite,
          borderLeftWidth: 4,
          borderLeftColor: COLORS.bisedgeBlue,
        }}
      >
        <Text style={{ fontSize: 9, color: COLORS.darkGray, fontWeight: 'bold', marginBottom: 4 }}>
          Important Note
        </Text>
        <Text style={{ fontSize: 9, color: COLORS.darkGray, lineHeight: 1.4 }}>
          This quotation is valid until {data.validUntil}. All pricing is subject to credit
          approval and acceptance of the terms and conditions outlined in this document.
        </Text>
      </View>

      <PdfFooter pageNumber={currentPage} totalPages={pageNumbers.total} />
    </Page>
  );
}
