import { Page, View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';

interface SpecImagePageProps {
  model: {
    code: string;
    name: string;
    category: string;
  };
  qrCode?: string;
  productImage?: string;
  quoteRef: string;
  pageNumber: number;
  totalPages: number;
}

export function SpecImagePage({
  model,
  qrCode,
  productImage,
  quoteRef,
  pageNumber,
  totalPages,
}: SpecImagePageProps) {

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={quoteRef} />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Model Title */}
        <View style={{ marginBottom: 30, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: COLORS.bisedgeBlue,
              marginBottom: 8,
            }}
          >
            {model.code}
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.mediumGray, marginBottom: 4 }}>
            {model.name}
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.mediumGray }}>{model.category}</Text>
        </View>

        {/* Product Image */}
        {productImage && (
          <View
            style={{
              marginBottom: 30,
              padding: 20,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.borderGray,
              borderRadius: 8,
            }}
          >
            <Image src={productImage} style={{ width: 400, height: 300 }} />
          </View>
        )}

        {/* QR Code Section */}
        {qrCode && (
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                padding: 15,
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.borderGray,
                borderRadius: 4,
              }}
            >
              <Image src={qrCode} style={{ width: 120, height: 120 }} />
            </View>
            <Text
              style={{
                fontSize: 10,
                color: COLORS.mediumGray,
                marginTop: 10,
                textAlign: 'center',
              }}
            >
              Scan for more information
            </Text>
          </View>
        )}
      </View>

      {/* Linde Badge */}
      <View
        style={{
          position: 'absolute',
          bottom: 80,
          left: 40,
          right: 40,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            padding: 10,
            backgroundColor: COLORS.lindeRed,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.white }}>
            LINDE MATERIAL HANDLING
          </Text>
        </View>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
