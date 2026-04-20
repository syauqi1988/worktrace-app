import { StyleSheet } from '@react-pdf/renderer';

// Clean minimalist palette inspired by HS Partnership design
export const COLORS = {
  BLACK: '#000000',
  TEXT: '#1F2937',
  MUTED: '#6B7280',
  LABEL: '#9CA3AF',
  BORDER: '#D1D5DB',
  BORDER_LIGHT: '#E5E7EB',
  HEADER_BG: '#F3F4F6',
  WHITE: '#FFFFFF',
};

const C = COLORS;

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 60, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9, color: C.TEXT },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerLeftRow: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  logo: { width: 70, height: 70, marginRight: 12, objectFit: 'contain' },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.BLACK, marginBottom: 2 },
  companyText: { fontSize: 9, color: C.TEXT, marginBottom: 1, lineHeight: 1.3 },

  headerRight: { width: 220, flexDirection: 'column' },
  docTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.BLACK, marginBottom: 6, textAlign: 'right' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  metaLabel: { fontSize: 9, color: C.MUTED, width: 90, textAlign: 'left' },
  metaValue: { fontSize: 9, color: C.BLACK, width: 130, textAlign: 'left' },

  // Divider
  divider: { height: 0.5, backgroundColor: C.BORDER, marginVertical: 10 },

  // Bill To / Ship To
  twoCol: { flexDirection: 'row', marginBottom: 12, gap: 24 },
  col: { flex: 1 },
  sectionLabel: { fontSize: 9, color: C.MUTED, marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.BLACK, marginBottom: 2 },
  partyText: { fontSize: 9, color: C.TEXT, marginBottom: 1, lineHeight: 1.3 },
  partyMetaRow: { flexDirection: 'row', marginTop: 2 },
  partyMetaLabel: { fontSize: 9, color: C.MUTED, width: 70 },
  partyMetaValue: { fontSize: 9, color: C.TEXT, flex: 1 },

  // Subject line
  subject: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.BLACK, marginTop: 4, marginBottom: 8, textDecoration: 'underline' },

  // Table
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.BORDER,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  tableHeaderText: { fontSize: 9, color: C.BLACK, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: C.BORDER_LIGHT },
  tableText: { fontSize: 9, color: C.TEXT },
  tableSection: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.BLACK, paddingVertical: 6, paddingHorizontal: 2 },

  // Columns
  colNo: { width: 28 },
  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 36, textAlign: 'right' },
  colUom: { width: 50, paddingLeft: 6 },
  colUnit: { width: 60, textAlign: 'right' },
  colAmt: { width: 70, textAlign: 'right' },

  // Summary (right-aligned, no border, simple)
  summaryWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  summary: { width: 240 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: C.BORDER_LIGHT },
  summaryLabel: { fontSize: 9, color: C.TEXT },
  summaryValue: { fontSize: 9, color: C.TEXT },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: C.BORDER },
  summaryTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.BLACK },
  summaryTotalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.BLACK },

  // Sections
  block: { marginTop: 14 },
  blockLabel: { fontSize: 9, color: C.MUTED, marginBottom: 4 },
  blockText: { fontSize: 9, color: C.TEXT, lineHeight: 1.4 },

  // Terms list
  termItem: { flexDirection: 'row', marginBottom: 2, paddingLeft: 4 },
  termNumber: { fontSize: 9, color: C.TEXT, width: 20 },
  termContent: { fontSize: 9, color: C.TEXT, flex: 1, lineHeight: 1.4 },

  // Payment
  paymentBox: { marginTop: 10 },
  paymentTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.BLACK, marginBottom: 4 },
  paymentRow: { flexDirection: 'row', marginBottom: 2 },
  paymentLabel: { fontSize: 9, color: C.MUTED, width: 90 },
  paymentValue: { fontSize: 9, color: C.TEXT },
  qrImage: { width: 90, height: 90, marginTop: 4 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: C.MUTED },
});

export function fmtRM(n: number) {
  const abs = Math.abs(n || 0);
  const formatted = abs.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}RM${formatted}`;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
