import { StyleSheet } from '@react-pdf/renderer';
import { COLORS } from './colors';

/**
 * Comprehensive PDF StyleSheet for Bisedge Quotations
 */
export const pdfStyles = StyleSheet.create({
  // Page Layouts
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
  },

  pageFullBleed: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
  },

  // Typography
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.bisedgeBlue,
    marginBottom: 12,
  },

  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.bisedgeBlue,
    marginBottom: 10,
  },

  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 8,
  },

  h4: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 6,
  },

  body: {
    fontSize: 10,
    color: COLORS.darkGray,
    lineHeight: 1.5,
  },

  bodySmall: {
    fontSize: 9,
    color: COLORS.mediumGray,
    lineHeight: 1.4,
  },

  caption: {
    fontSize: 8,
    color: COLORS.mediumGray,
    lineHeight: 1.3,
  },

  // Header & Footer
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.bisedgeBlue,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    fontSize: 8,
    color: COLORS.mediumGray,
  },

  // Sections & Containers
  section: {
    marginBottom: 20,
  },

  sectionSmall: {
    marginBottom: 12,
  },

  container: {
    padding: 15,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 4,
  },

  card: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 4,
    marginBottom: 10,
  },

  // Rows & Columns
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  column: {
    flexDirection: 'column',
  },

  // Text Helpers
  label: {
    fontWeight: 'bold',
    color: COLORS.mediumGray,
    fontSize: 9,
    marginBottom: 2,
  },

  value: {
    color: COLORS.darkGray,
    fontSize: 10,
  },

  valueLarge: {
    color: COLORS.darkGray,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bisedgeBlue,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bisedgeBlue,
  },

  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.white,
  },

  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },

  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: COLORS.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },

  tableRowTotal: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: COLORS.lightBackground,
    borderTopWidth: 2,
    borderTopColor: COLORS.bisedgeBlue,
    fontWeight: 'bold',
  },

  tableCell: {
    fontSize: 9,
    color: COLORS.darkGray,
  },

  tableCellBold: {
    fontSize: 9,
    color: COLORS.darkGray,
    fontWeight: 'bold',
  },

  tableCellRight: {
    fontSize: 9,
    color: COLORS.darkGray,
    textAlign: 'right',
  },

  tableCellCenter: {
    fontSize: 9,
    color: COLORS.darkGray,
    textAlign: 'center',
  },

  // Spec Table (Two-Column)
  specTable: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },

  specRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },

  specLabel: {
    width: '40%',
    padding: 8,
    backgroundColor: COLORS.offWhite,
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderGray,
  },

  specValue: {
    width: '60%',
    padding: 8,
    fontSize: 9,
    color: COLORS.darkGray,
  },

  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  bullet: {
    width: 15,
    fontSize: 10,
    color: COLORS.bisedgeBlue,
  },

  listItemText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.darkGray,
    lineHeight: 1.4,
  },

  // Badges & Tags
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },

  badgeSuccess: {
    backgroundColor: COLORS.success,
    color: COLORS.white,
  },

  badgeWarning: {
    backgroundColor: COLORS.warning,
    color: COLORS.white,
  },

  badgeDanger: {
    backgroundColor: COLORS.danger,
    color: COLORS.white,
  },

  badgeInfo: {
    backgroundColor: COLORS.bisedgeBlue,
    color: COLORS.white,
  },

  // Separator Lines
  horizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    marginVertical: 10,
  },

  horizontalLineThick: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.bisedgeBlue,
    marginVertical: 15,
  },

  // Special Elements
  brandBar: {
    height: 4,
    backgroundColor: COLORS.lindeRed,
    marginBottom: 15,
  },

  logo: {
    width: 120,
    height: 40,
  },

  qrCode: {
    width: 100,
    height: 100,
  },

  productImage: {
    width: 300,
    height: 225,
    objectFit: 'contain',
  },

  // Text Alignment
  textLeft: {
    textAlign: 'left',
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  // Spacing
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },

  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },

  // Color Classes
  textBisedgeBlue: { color: COLORS.bisedgeBlue },
  textLindeRed: { color: COLORS.lindeRed },
  textSuccess: { color: COLORS.success },
  textWarning: { color: COLORS.warning },
  textDanger: { color: COLORS.danger },

  // Signature Blocks
  signatureBlock: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 12,
    borderRadius: 4,
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
    marginTop: 30,
    marginBottom: 5,
  },

  // Summary Boxes
  summaryBox: {
    backgroundColor: COLORS.offWhite,
    borderWidth: 2,
    borderColor: COLORS.bisedgeBlue,
    padding: 15,
    borderRadius: 4,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },

  summaryValue: {
    fontSize: 11,
    color: COLORS.darkGray,
  },

  summaryValueLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.bisedgeBlue,
  },

  // Cover Page Specific
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },

  coverTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.bisedgeBlue,
    marginBottom: 20,
    textAlign: 'center',
  },

  coverSubtitle: {
    fontSize: 24,
    color: COLORS.mediumGray,
    marginBottom: 40,
    textAlign: 'center',
  },

  coverDetail: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Address Block
  addressBlock: {
    marginBottom: 20,
  },

  addressLine: {
    fontSize: 10,
    color: COLORS.darkGray,
    marginBottom: 2,
  },

  // TOC Specific
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },

  tocTitle: {
    fontSize: 11,
    color: COLORS.darkGray,
  },

  tocPage: {
    fontSize: 11,
    color: COLORS.mediumGray,
    fontWeight: 'bold',
  },

  tocDots: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    borderStyle: 'dotted',
    marginHorizontal: 10,
    marginBottom: 4,
  },
});
