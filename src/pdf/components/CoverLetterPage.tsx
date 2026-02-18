import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import { defaultCoverLetterTemplate, fillCoverLetterTemplate } from '../templates/coverLetter';
import type { PdfQuoteData } from '../types';

interface CoverLetterPageProps {
  data: PdfQuoteData;
  pageNumber: number;
  totalPages: number;
}

export function CoverLetterPage({ data, pageNumber, totalPages }: CoverLetterPageProps) {
  // Format values for template
  const formatZAR = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filledTemplate = fillCoverLetterTemplate(defaultCoverLetterTemplate, {
    contactPerson: data.customer.contactPerson,
    unitCount: data.units.reduce((sum, u) => sum + u.quantity, 0),
    totalMonthly: formatZAR(data.totals.totalMonthly),
    leaseTerm: data.totals.leaseTerm || 60, // fallback if mixed
    totalContractValue: formatZAR(data.totals.totalContractValue),
    signatoryName: data.signatory.name,
    signatoryTitle: data.signatory.title,
  });

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      {/* Date (top right) */}
      <View style={{ alignItems: 'flex-end', marginBottom: 30 }}>
        <Text style={{ fontSize: 10, color: COLORS.darkGray }}>{data.date}</Text>
      </View>

      {/* Customer Address Block */}
      <View style={pdfStyles.addressBlock}>
        <Text style={{ ...pdfStyles.addressLine, fontWeight: 'bold' }}>
          {data.customer.contactPerson}
        </Text>
        <Text style={pdfStyles.addressLine}>{data.customer.name}</Text>
        {data.customer.address.map((line, idx) => (
          <Text key={idx} style={pdfStyles.addressLine}>
            {line}
          </Text>
        ))}
      </View>

      {/* Salutation */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 11, color: COLORS.darkGray }}>
          {filledTemplate.salutation}
        </Text>
      </View>

      {/* Letter Body */}
      <View style={{ marginBottom: 30 }}>
        {filledTemplate.paragraphs.map((paragraph, idx) => (
          <Text
            key={idx}
            style={{
              fontSize: 10,
              color: COLORS.darkGray,
              lineHeight: 1.6,
              marginBottom: 12,
              textAlign: 'justify',
            }}
          >
            {paragraph}
          </Text>
        ))}
      </View>

      {/* Closing */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ fontSize: 10, color: COLORS.darkGray, marginBottom: 30 }}>
          {filledTemplate.closing}
        </Text>

        {/* Signature (if available) */}
        {data.signatory.signature && (
          <View style={{ marginBottom: 10 }}>
            {/* Signature image would go here */}
          </View>
        )}

        {/* Signatory Details */}
        <Text style={{ fontSize: 10, color: COLORS.darkGray, fontWeight: 'bold' }}>
          {filledTemplate.signature.name}
        </Text>
        <Text style={{ fontSize: 10, color: COLORS.mediumGray }}>
          {filledTemplate.signature.title}
        </Text>
        <Text style={{ fontSize: 10, color: COLORS.mediumGray }}>
          {filledTemplate.signature.company}
        </Text>
      </View>

      {/* Company Footer Info */}
      <View
        style={{
          marginTop: 40,
          paddingTop: 15,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderGray,
        }}
      >
        <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
          {filledTemplate.footer.company}
        </Text>
        {filledTemplate.footer.address.map((line, idx) => (
          <Text key={idx} style={{ fontSize: 8, color: COLORS.mediumGray, marginBottom: 1 }}>
            {line}
          </Text>
        ))}
        <Text style={{ fontSize: 8, color: COLORS.mediumGray, marginTop: 4 }}>
          Tel: {filledTemplate.footer.phone} | Email: {filledTemplate.footer.email} | Web:{' '}
          {filledTemplate.footer.website}
        </Text>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
