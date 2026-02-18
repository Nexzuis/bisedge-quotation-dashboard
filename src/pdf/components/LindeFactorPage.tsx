import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { PdfQuoteData } from '../types';

interface LindeFactorPageProps {
  data: PdfQuoteData;
  pageNumber: number;
  totalPages: number;
}

export function LindeFactorPage({ data, pageNumber, totalPages }: LindeFactorPageProps) {
  const quadrants = [
    {
      icon: '★',
      title: 'Quality & Reliability',
      points: [
        'German engineering excellence with proven track record',
        'Superior build quality for demanding industrial environments',
        'Industry-leading uptime and reliability ratings',
      ],
    },
    {
      icon: '⚙',
      title: 'Service & Support',
      points: [
        'Comprehensive maintenance and support packages',
        'Nationwide network of certified technicians',
        'Rapid response times and genuine parts availability',
      ],
    },
    {
      icon: '💡',
      title: 'Innovation & Technology',
      points: [
        'Advanced safety features and operator assistance systems',
        'Energy-efficient drives and battery management',
        'Telematics and fleet management integration',
      ],
    },
    {
      icon: '💰',
      title: 'Total Cost of Ownership',
      points: [
        'Predictable operating costs with inclusive maintenance',
        'Higher residual values reduce total cost',
        'Energy savings through efficient technology',
      ],
    },
  ];

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      <Text style={pdfStyles.h2}>The Linde Factor</Text>

      <View style={{ marginBottom: 15 }}>
        <Text style={pdfStyles.body}>
          Linde Material Handling is a global leader in forklift manufacturing, delivering
          innovative solutions that maximize productivity and minimize total cost of ownership.
        </Text>
      </View>

      {/* 4-Quadrant Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
        {quadrants.map((quadrant, idx) => (
          <View
            key={idx}
            style={{
              width: '48%',
              marginRight: idx % 2 === 0 ? '4%' : 0,
              marginBottom: 20,
              padding: 15,
              borderWidth: 1,
              borderColor: COLORS.borderGray,
              borderRadius: 4,
              backgroundColor: COLORS.white,
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 40,
                height: 40,
                backgroundColor: COLORS.bisedgeBlue,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 20, color: COLORS.white }}>{quadrant.icon}</Text>
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: COLORS.bisedgeBlue,
                marginBottom: 8,
              }}
            >
              {quadrant.title}
            </Text>

            {/* Points */}
            <View>
              {quadrant.points.map((point, pointIdx) => (
                <View key={pointIdx} style={pdfStyles.listItem}>
                  <Text style={pdfStyles.bullet}>•</Text>
                  <Text style={{ ...pdfStyles.listItemText, fontSize: 9 }}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Bottom Banner */}
      <View
        style={{
          marginTop: 20,
          padding: 15,
          backgroundColor: COLORS.bisedgeBlue,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: COLORS.white,
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          Trusted by leading companies across South Africa and the world
        </Text>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
