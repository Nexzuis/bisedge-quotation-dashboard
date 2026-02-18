import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { TermsTemplate } from '../types';

interface TermsConditionsPageProps {
  template: TermsTemplate;
  customNotes?: string;
  quoteRef: string;
  pageNumber: number;
  totalPages: number;
}

export function TermsConditionsPage({
  template,
  customNotes,
  quoteRef,
  pageNumber,
  totalPages,
}: TermsConditionsPageProps) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={quoteRef} />

      <Text style={pdfStyles.h2}>{template.title}</Text>

      {/* Terms Sections */}
      <View style={{ marginTop: 15 }}>
        {template.sections.map((section, idx) => (
          <View key={idx} style={{ marginBottom: 15 }}>
            {/* Section Title */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: COLORS.bisedgeBlue,
                marginBottom: 6,
              }}
            >
              {section.number}. {section.title}
            </Text>

            {/* Section Content */}
            <View style={{ marginLeft: 15 }}>
              {section.content.map((item, itemIdx) => (
                <View key={itemIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text
                    style={{
                      width: 20,
                      fontSize: 9,
                      color: COLORS.mediumGray,
                    }}
                  >
                    {section.number}.{itemIdx + 1}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 9,
                      color: COLORS.darkGray,
                      lineHeight: 1.4,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Custom Notes */}
      {customNotes && (
        <View
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: COLORS.offWhite,
            borderWidth: 1,
            borderColor: COLORS.borderGray,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: COLORS.bisedgeBlue,
              marginBottom: 6,
            }}
          >
            Additional Notes
          </Text>
          <Text
            style={{
              fontSize: 9,
              color: COLORS.darkGray,
              lineHeight: 1.4,
            }}
          >
            {customNotes}
          </Text>
        </View>
      )}

      {/* Footer Text */}
      {template.footer && (
        <View
          style={{
            marginTop: 20,
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: COLORS.borderGray,
          }}
        >
          <Text
            style={{
              fontSize: 8,
              color: COLORS.mediumGray,
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            {template.footer}
          </Text>
        </View>
      )}

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
