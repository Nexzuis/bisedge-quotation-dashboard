import { Page, View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { bisedgeLogo } from '../assets';
import type { PdfQuoteData } from '../types';

interface CoverPageProps {
  data: PdfQuoteData;
}

export function CoverPage({ data }: CoverPageProps) {
  return (
    <Page size="A4" style={pdfStyles.pageFullBleed}>
      {/* Brand Bar at Top */}
      <View style={{ height: 8, backgroundColor: COLORS.lindeRed }} />

      {/* Main Cover Content */}
      <View style={pdfStyles.coverContainer}>
        {/* Logo */}
        <Image
          src={bisedgeLogo.base64}
          style={{ width: 200, height: 67, marginBottom: 40 }}
        />

        {/* Title */}
        <Text style={pdfStyles.coverTitle}>QUOTATION</Text>

        {/* Quote Reference */}
        <View style={{ marginBottom: 40 }}>
          <Text style={pdfStyles.coverSubtitle}>Quote {data.quoteRef}</Text>
        </View>

        {/* Customer Name */}
        <View style={{ marginBottom: 60 }}>
          <Text style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: COLORS.bisedgeBlue,
            textAlign: 'center',
            marginBottom: 10,
          }}>
            {data.customer.name}
          </Text>
          <Text style={{
            fontSize: 16,
            color: COLORS.mediumGray,
            textAlign: 'center',
          }}>
            Prepared for {data.customer.contactPerson}
          </Text>
        </View>

        {/* Date */}
        <View style={{ marginBottom: 20 }}>
          <Text style={pdfStyles.coverDetail}>
            Date: {data.date}
          </Text>
        </View>

        {/* Valid Until */}
        <View style={{
          backgroundColor: COLORS.offWhite,
          padding: 15,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: COLORS.bisedgeBlue,
        }}>
          <Text style={{
            fontSize: 12,
            color: COLORS.bisedgeBlue,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            Valid Until: {data.validUntil}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: 10, color: COLORS.mediumGray }}>
          Linde Material Handling | Official Dealer
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.mediumGray, marginTop: 4 }}>
          Bisedge South Africa (Pty) Ltd
        </Text>
      </View>
    </Page>
  );
}
