import { Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { COLORS } from '../styles/colors';
import { PdfHeader, PdfFooter } from '.';
import type { PdfQuoteData } from '../types';

interface QuotationTablePageProps {
  data: PdfQuoteData;
  pageNumber: number;
  totalPages: number;
  variant?: 'rental' | 'rent-to-own';
}

export function QuotationTablePage({
  data,
  pageNumber,
  totalPages,
  variant = 'rental',
}: QuotationTablePageProps) {
  const formatZAR = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Check if we have mixed lease terms
  const uniqueTerms = [...new Set(data.units.map((u) => u.leaseTerm))];
  const hasMixedTerms = uniqueTerms.length > 1;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <PdfHeader quoteRef={data.quoteRef} />

      <Text style={pdfStyles.h2}>QUOTATION</Text>
      <Text style={{ fontSize: 12, color: COLORS.mediumGray, marginBottom: 20 }}>
        {variant === 'rent-to-own' ? 'Rent-to-Own Agreement' : 'Rental Agreement'}
      </Text>

      {/* Quotation Table */}
      <View style={pdfStyles.table}>
        {/* Table Header */}
        <View style={pdfStyles.tableHeader}>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '5%' }}>No.</Text>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '25%' }}>Description</Text>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '6%', textAlign: 'center' }}>
            Qty
          </Text>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '10%', textAlign: 'right' }}>
            Hrs/Mo
          </Text>
          {hasMixedTerms && (
            <Text style={{ ...pdfStyles.tableHeaderText, width: '8%', textAlign: 'right' }}>
              Term
            </Text>
          )}
          <Text style={{ ...pdfStyles.tableHeaderText, width: '14%', textAlign: 'right' }}>
            Lease (pm)
          </Text>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '16%', textAlign: 'right' }}>
            Add. Costs (pm)
          </Text>
          <Text style={{ ...pdfStyles.tableHeaderText, width: '16%', textAlign: 'right' }}>
            Total (pm)
          </Text>
        </View>

        {/* Table Rows */}
        {data.units.map((unit, idx) => {
          const batteryInfo = unit.battery
            ? `${unit.battery.chemistry === 'lithium-ion' ? 'Li-Ion' : 'Pb-Acid'} Battery`
            : '';

          const additionalCosts =
            unit.additionalCosts.maintenance +
            unit.additionalCosts.fleetManagement +
            unit.additionalCosts.telematics;

          return (
            <View
              key={idx}
              style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}
            >
              <Text style={{ ...pdfStyles.tableCell, width: '5%' }}>{unit.itemNo}</Text>
              <View style={{ width: '25%' }}>
                <Text style={{ ...pdfStyles.tableCell, fontWeight: 'bold' }}>
                  {unit.model.code}
                </Text>
                <Text style={{ ...pdfStyles.tableCell, fontSize: 8, color: COLORS.mediumGray }}>
                  {unit.model.name}
                </Text>
                {batteryInfo && (
                  <Text
                    style={{ ...pdfStyles.tableCell, fontSize: 8, color: COLORS.mediumGray }}
                  >
                    {batteryInfo}
                  </Text>
                )}
              </View>
              <Text style={{ ...pdfStyles.tableCellCenter, width: '6%' }}>
                {unit.quantity}
              </Text>
              <Text style={{ ...pdfStyles.tableCellRight, width: '10%' }}>
                {unit.operatingHours}
              </Text>
              {hasMixedTerms && (
                <Text style={{ ...pdfStyles.tableCellRight, width: '8%' }}>
                  {unit.leaseTerm}m
                </Text>
              )}
              <Text style={{ ...pdfStyles.tableCellRight, width: '14%' }}>
                {formatZAR(unit.monthlyLeaseRate)}
              </Text>
              <Text style={{ ...pdfStyles.tableCellRight, width: '16%' }}>
                {formatZAR(additionalCosts)}
              </Text>
              <Text
                style={{
                  ...pdfStyles.tableCellRight,
                  width: '16%',
                  fontWeight: 'bold',
                }}
              >
                {formatZAR(unit.totalMonthly * unit.quantity)}
              </Text>
            </View>
          );
        })}

        {/* Total Row */}
        <View style={pdfStyles.tableRowTotal}>
          <Text
            style={{
              ...pdfStyles.tableCellBold,
              width: hasMixedTerms ? '46%' : '54%',
            }}
          >
            TOTAL
          </Text>
          {hasMixedTerms && <Text style={{ width: '8%' }} />}
          <Text style={{ ...pdfStyles.tableCellRight, width: '14%' }} />
          <Text style={{ ...pdfStyles.tableCellRight, width: '16%' }} />
          <Text
            style={{
              ...pdfStyles.tableCellRight,
              width: '16%',
              fontWeight: 'bold',
              fontSize: 11,
              color: COLORS.bisedgeBlue,
            }}
          >
            {formatZAR(data.totals.totalMonthly)}
          </Text>
        </View>
      </View>

      {/* Summary Box */}
      <View style={{ ...pdfStyles.summaryBox, marginTop: 20 }}>
        <View style={pdfStyles.summaryRow}>
          <Text style={pdfStyles.summaryLabel}>Total Monthly Cost:</Text>
          <Text style={pdfStyles.summaryValueLarge}>{formatZAR(data.totals.totalMonthly)}</Text>
        </View>
        {data.totals.leaseTerm && (
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Contract Duration:</Text>
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

      {/* Notes */}
      <View
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: COLORS.offWhite,
          borderLeftWidth: 3,
          borderLeftColor: COLORS.bisedgeBlue,
        }}
      >
        <Text style={{ fontSize: 9, color: COLORS.darkGray, marginBottom: 4 }}>
          <Text style={{ fontWeight: 'bold' }}>Notes:</Text>
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.darkGray, lineHeight: 1.4 }}>
          • All prices are exclusive of VAT
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.darkGray, lineHeight: 1.4 }}>
          • Additional costs include maintenance, fleet management, and telematics services
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.darkGray, lineHeight: 1.4 }}>
          • Monthly payments are due in advance
        </Text>
        <Text style={{ fontSize: 8, color: COLORS.darkGray, lineHeight: 1.4 }}>
          • This quotation is valid for 30 days from issue date
        </Text>
      </View>

      <PdfFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
}
