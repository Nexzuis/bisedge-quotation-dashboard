import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { PdfQuoteData } from '../types';

interface BisedgePartnerPageProps {
  data: PdfQuoteData;
  pageNumber: number;
  totalPages: number;
}

export function BisedgePartnerPage({ data, pageNumber, totalPages }: BisedgePartnerPageProps) {
  const services = [
    'Comprehensive forklift rental and leasing solutions',
    'Full-service maintenance and repair programs',
    'Fleet management and telematics integration',
    'Operator training and safety certification',
    'Parts supply and genuine Linde components',
    'Customized attachment solutions',
    'Short-term and long-term rental options',
    '24/7 emergency breakdown support',
  ];

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      <Text style={pdfStyles.h2}>Your Partner: Bisedge South Africa</Text>

      {/* Company Overview */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.body}>
          Bisedge South Africa is the authorized Linde Material Handling dealer, providing
          industry-leading forklift solutions backed by exceptional local service and support. With
          decades of experience in the material handling industry, we understand the unique
          challenges faced by South African businesses and deliver tailored solutions that maximize
          productivity and minimize downtime.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.body}>
          Our commitment to customer success goes beyond equipment supply. We partner with you to
          understand your operational needs, optimize your fleet configuration, and ensure your
          material handling operations run smoothly and efficiently. Our team of certified
          technicians and industry experts are always ready to support your business.
        </Text>
      </View>

      {/* Key Services */}
      <View style={{ marginTop: 20, marginBottom: 20 }}>
        <Text style={pdfStyles.h3}>Our Services</Text>
        <View style={{ marginTop: 10 }}>
          {services.map((service, idx) => (
            <View key={idx} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>✓</Text>
              <Text style={pdfStyles.listItemText}>{service}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Authorized Dealer Badge */}
      <View
        style={{
          marginTop: 20,
          padding: 20,
          backgroundColor: COLORS.offWhite,
          borderWidth: 2,
          borderColor: COLORS.lindeRed,
          borderRadius: 4,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: COLORS.lindeRed,
            marginBottom: 8,
          }}
        >
          AUTHORIZED LINDE DEALER
        </Text>
        <Text style={{ fontSize: 10, color: COLORS.darkGray, textAlign: 'center' }}>
          Official dealer for Linde Material Handling in South Africa
        </Text>
      </View>

      {/* Contact Information */}
      <View
        style={{
          marginTop: 30,
          padding: 15,
          backgroundColor: COLORS.bisedgeBlue,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: COLORS.white,
            marginBottom: 8,
          }}
        >
          Contact Us
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 9, color: COLORS.white, marginBottom: 3 }}>
              Phone: +27 11 123 4567
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.white, marginBottom: 3 }}>
              Email: quotes@bisedge.co.za
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.white }}>Web: www.bisedge.co.za</Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: COLORS.white, marginBottom: 3 }}>
              123 Industrial Avenue
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.white, marginBottom: 3 }}>
              Johannesburg, 2001
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.white }}>South Africa</Text>
          </View>
        </View>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
