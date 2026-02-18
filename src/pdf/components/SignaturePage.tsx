import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { PdfQuoteData } from '../types';

interface SignaturePageProps {
  data: PdfQuoteData;
  pageNumber: number;
  totalPages: number;
}

export function SignaturePage({ data, pageNumber, totalPages }: SignaturePageProps) {
  const formatZAR = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      <Text style={pdfStyles.h2}>CLIENT ACCEPTANCE</Text>

      {/* Declaration */}
      <View style={{ marginTop: 20, marginBottom: 30 }}>
        <Text
          style={{
            fontSize: 11,
            color: COLORS.darkGray,
            lineHeight: 1.6,
            textAlign: 'justify',
          }}
        >
          I/We, the undersigned, accept the quotation as detailed in this document and agree to be
          bound by the Terms & Conditions set forth herein. This acceptance constitutes a binding
          agreement between {data.customer.name} and Bisedge South Africa (Pty) Ltd.
        </Text>
      </View>

      {/* Quote Summary */}
      <View style={{ ...pdfStyles.summaryBox, marginBottom: 30 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: COLORS.bisedgeBlue,
            marginBottom: 12,
          }}
        >
          Quote Summary
        </Text>
        <View style={pdfStyles.summaryRow}>
          <Text style={pdfStyles.summaryLabel}>Total Monthly Cost:</Text>
          <Text style={pdfStyles.summaryValueLarge}>{formatZAR(data.totals.totalMonthly)}</Text>
        </View>
        {data.totals.leaseTerm && (
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Lease Term:</Text>
            <Text style={pdfStyles.summaryValue}>{data.totals.leaseTerm} months</Text>
          </View>
        )}
        <View style={{ ...pdfStyles.summaryRow, marginBottom: 0 }}>
          <Text style={pdfStyles.summaryLabel}>Total Contract Value:</Text>
          <Text style={pdfStyles.summaryValue}>
            {formatZAR(data.totals.totalContractValue)}
          </Text>
        </View>
      </View>

      {/* Signature Blocks */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        {/* Client Signature */}
        <View style={{ ...pdfStyles.signatureBlock, flex: 1 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: COLORS.bisedgeBlue,
              marginBottom: 10,
            }}
          >
            CLIENT
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Full Name:
            </Text>
            <View style={pdfStyles.signatureLine} />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Signature:
            </Text>
            <View style={pdfStyles.signatureLine} />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Date:
            </Text>
            <View style={pdfStyles.signatureLine} />
          </View>

          <View>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Company Stamp:
            </Text>
            <View style={{ height: 60, borderWidth: 1, borderColor: COLORS.borderGray }} />
          </View>
        </View>

        {/* Bisedge Signature */}
        <View style={{ ...pdfStyles.signatureBlock, flex: 1 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: COLORS.bisedgeBlue,
              marginBottom: 10,
            }}
          >
            BISEDGE SOUTH AFRICA
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Full Name:
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.darkGray, paddingTop: 8 }}>
              {data.signatory.name}
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderGray,
                marginTop: 20,
              }}
            />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Signature:
            </Text>
            {data.signatory.signature ? (
              <View>
                {/* Signature image would be rendered here */}
                <View style={pdfStyles.signatureLine} />
              </View>
            ) : (
              <View style={pdfStyles.signatureLine} />
            )}
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>
              Title:
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.darkGray, paddingTop: 8 }}>
              {data.signatory.title}
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderGray,
                marginTop: 20,
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 9, color: COLORS.mediumGray, marginBottom: 2 }}>Date:</Text>
            <Text style={{ fontSize: 10, color: COLORS.darkGray, paddingTop: 8 }}>
              {data.date}
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderGray,
                marginTop: 20,
              }}
            />
          </View>
        </View>
      </View>

      {/* Important Notice */}
      <View
        style={{
          marginTop: 30,
          padding: 12,
          backgroundColor: COLORS.offWhite,
          borderLeftWidth: 4,
          borderLeftColor: COLORS.lindeRed,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            color: COLORS.darkGray,
            fontWeight: 'bold',
            marginBottom: 4,
          }}
        >
          Important Notice
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.darkGray, lineHeight: 1.4 }}>
          By signing this document, you confirm that you have read, understood, and agree to all
          terms and conditions outlined in this quotation. Please retain a copy for your records.
        </Text>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
