import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import { organizeSpecs } from '../templates/specLabels';

interface SpecDataPageProps {
  model: {
    code: string;
    name: string;
    category: string;
    specifications: Record<string, string>;
  };
  battery?: {
    name: string;
    chemistry: string;
    voltage: number;
    capacity: number;
  };
  quoteRef: string;
  pageNumber: number;
  totalPages: number;
}

export function SpecDataPage({
  model,
  battery,
  quoteRef,
  pageNumber,
  totalPages,
}: SpecDataPageProps) {
  const specSections = organizeSpecs(model.specifications);

  // Skip battery section for IC Counterbalance models
  const isICCounterbalance = model.category.toLowerCase().includes('ic counterbalance');

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={quoteRef} />

      <Text style={pdfStyles.h2}>Technical Specifications</Text>
      <Text style={{ ...pdfStyles.h3, color: COLORS.bisedgeBlue }}>
        {model.code} - {model.name}
      </Text>

      {/* Specifications Table */}
      <View style={{ marginTop: 20 }}>
        {specSections.map((section, sectionIdx) => (
          <View key={sectionIdx} style={{ marginBottom: 20 }}>
            {/* Section Title */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: COLORS.bisedgeBlue,
                marginBottom: 8,
                paddingBottom: 4,
                borderBottomWidth: 2,
                borderBottomColor: COLORS.bisedgeBlue,
              }}
            >
              {section.title}
            </Text>

            {/* Section Specs */}
            <View style={pdfStyles.specTable}>
              {section.specs.map((spec, specIdx) => (
                <View
                  key={specIdx}
                  style={{
                    ...pdfStyles.specRow,
                    borderBottomWidth: specIdx === section.specs.length - 1 ? 0 : 1,
                  }}
                >
                  <Text style={pdfStyles.specLabel}>{spec.label}</Text>
                  <Text style={pdfStyles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Battery Specifications (if applicable) */}
        {battery && !isICCounterbalance && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: COLORS.bisedgeBlue,
                marginBottom: 8,
                paddingBottom: 4,
                borderBottomWidth: 2,
                borderBottomColor: COLORS.bisedgeBlue,
              }}
            >
              Battery Specifications
            </Text>

            <View style={pdfStyles.specTable}>
              <View style={pdfStyles.specRow}>
                <Text style={pdfStyles.specLabel}>Battery Model</Text>
                <Text style={pdfStyles.specValue}>{battery.name}</Text>
              </View>
              <View style={pdfStyles.specRow}>
                <Text style={pdfStyles.specLabel}>Battery Chemistry</Text>
                <Text style={pdfStyles.specValue}>
                  {battery.chemistry === 'lithium-ion' ? 'Lithium-Ion' : 'Lead-Acid'}
                </Text>
              </View>
              <View style={pdfStyles.specRow}>
                <Text style={pdfStyles.specLabel}>Voltage (V)</Text>
                <Text style={pdfStyles.specValue}>{battery.voltage}V</Text>
              </View>
              <View style={{ ...pdfStyles.specRow, borderBottomWidth: 0 }}>
                <Text style={pdfStyles.specLabel}>Capacity (Ah)</Text>
                <Text style={pdfStyles.specValue}>{battery.capacity} Ah</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Note */}
      <View
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: COLORS.offWhite,
          borderLeftWidth: 3,
          borderLeftColor: COLORS.bisedgeBlue,
        }}
      >
        <Text style={{ fontSize: 8, color: COLORS.mediumGray, fontStyle: 'italic' }}>
          Note: Specifications are subject to change. Please consult with Bisedge for the most
          current technical data. Some specifications may vary based on configuration and options
          selected.
        </Text>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
