import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const BLACK = '#0F172A';
const DARK = '#1E293B';
const MID = '#475569';
const MUTED = '#94A3B8';
const BORDER = '#CBD5E1';
const BG_LIGHT = '#F8FAFC';
const WHITE = '#FFFFFF';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: BLACK },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  logo: { maxHeight: 60, maxWidth: 120, marginBottom: 6 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: BLACK },
  companyText: { fontSize: 10, color: MID, marginBottom: 1 },
  companySmall: { fontSize: 9, color: MID, marginBottom: 1 },
  docTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 4, letterSpacing: 2 },
  docNum: { fontSize: 10, color: BLACK, marginBottom: 4 },
  dateText: { fontSize: 9, color: MID, marginBottom: 1 },
  divider: { height: 2, backgroundColor: DARK, marginVertical: 12 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  name: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: BLACK },
  text: { fontSize: 9, color: MID, marginBottom: 1 },
  infoBox: { borderWidth: 0.5, borderColor: BORDER, backgroundColor: BG_LIGHT, borderRadius: 4, padding: 10, marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 120, fontSize: 9, color: MUTED },
  infoValue: { flex: 1, fontSize: 9, color: BLACK },
  tableHeader: { flexDirection: 'row', backgroundColor: DARK, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 2 },
  tableHeaderText: { color: WHITE, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: BG_LIGHT },
  colBil: { width: 30 },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'center' },
  colUnit: { width: 80, textAlign: 'right' },
  colAmt: { width: 80, textAlign: 'right' },
  tableText: { fontSize: 9, color: BLACK },
  summaryBox: { marginTop: 12, borderWidth: 0.5, borderColor: BORDER, backgroundColor: BG_LIGHT, borderRadius: 4, padding: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  summaryLabel: { width: 120, textAlign: 'right', paddingRight: 8, fontSize: 9, color: MUTED },
  summaryValue: { width: 100, textAlign: 'right', fontSize: 9 },
  paidBox: { backgroundColor: DARK, borderRadius: 4, padding: 16, marginTop: 16, alignItems: 'center' },
  paidCheckText: { color: WHITE, fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 8 },
  paidAmount: { color: WHITE, fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  paidSubtext: { color: MUTED, fontSize: 9 },
  paymentBox: { marginTop: 12 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  footerDivider: { height: 0.5, backgroundColor: BORDER, marginBottom: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: MUTED },
});

function fmt(n: number) {
  return `RM ${(n || 0).toFixed(2)}`;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface ReceiptPDFProps {
  receipt: {
    receipt_number: string;
    payment_date: string | null;
    amount_paid: number;
  };
  invoice: {
    invoice_number: string;
    issued_date: string | null;
    items: Array<{ description: string; qty: number; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_base64?: string;
  };
  paymentMethod?: string;
}

export default function ReceiptPDF({ receipt, invoice, job, customer, company, paymentMethod }: ReceiptPDFProps) {
  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {company.logo_base64 ? (
              <Image src={company.logo_base64} style={s.logo} />
            ) : null}
            <Text style={s.companyName}>{company.company_name || 'Syarikat'}</Text>
            {company.phone && <Text style={s.companyText}>{company.phone}</Text>}
            {company.address && <Text style={s.companySmall}>{company.address}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>RESIT PEMBAYARAN</Text>
            <Text style={s.docNum}>No. Resit: {receipt.receipt_number}</Text>
            <Text style={s.dateText}>Tarikh Bayaran: {formatDate(receipt.payment_date)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Customer */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.sectionLabel}>DITERIMA DARIPADA</Text>
          <Text style={s.name}>{customer?.name || '-'}</Text>
          {customer?.phone && <Text style={s.text}>{customer.phone}</Text>}
          {customer?.email && <Text style={s.text}>{customer.email}</Text>}
          {customer?.address && <Text style={s.text}>{customer.address}</Text>}
        </View>

        {/* Payment Details */}
        <View style={s.infoBox}>
          <Text style={[s.sectionLabel, { marginBottom: 6 }]}>BUTIRAN PEMBAYARAN</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>No. Invois:</Text>
            <Text style={s.infoValue}>{invoice.invoice_number}</Text>
          </View>
          {job && (
            <>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>No. Kerja:</Text>
                <Text style={s.infoValue}>{job.job_number}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Tajuk Kerja:</Text>
                <Text style={s.infoValue}>{job.title}</Text>
              </View>
            </>
          )}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Tarikh Invois:</Text>
            <Text style={s.infoValue}>{formatDate(invoice.issued_date)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Tarikh Bayaran:</Text>
            <Text style={s.infoValue}>{formatDate(receipt.payment_date)}</Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colBil]}>Bil.</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>Penerangan</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Harga</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Jumlah</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableText, s.colBil]}>{i + 1}</Text>
            <Text style={[s.tableText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tableText, s.colQty]}>{item.qty}</Text>
            <Text style={[s.tableText, s.colUnit]}>{fmt(item.unit_price)}</Text>
            <Text style={[s.tableText, s.colAmt]}>{fmt(item.amount)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Diskaun</Text>
              <Text style={s.summaryValue}>- {fmt(invoice.discount)}</Text>
            </View>
          )}
          {invoice.tax_rate > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>SST ({invoice.tax_rate}%)</Text>
              <Text style={s.summaryValue}>{fmt(sstAmount)}</Text>
            </View>
          )}
        </View>

        {/* Paid Amount Box */}
        <View style={s.paidBox}>
          <Text style={s.paidCheckText}>✓ JUMLAH DITERIMA</Text>
          <Text style={s.paidAmount}>{fmt(receipt.amount_paid)}</Text>
          <Text style={s.paidSubtext}>Pembayaran telah diterima dengan jayanya</Text>
        </View>

        {/* Payment Method */}
        {paymentMethod && (
          <View style={s.paymentBox}>
            <Text style={s.sectionLabel}>KAEDAH PEMBAYARAN</Text>
            <Text style={[s.text, { marginTop: 2 }]}>{paymentMethod}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>Dokumen ini adalah resit pembayaran rasmi yang dijana oleh WorkTrace</Text>
            <Text style={s.footerText}>{company.company_name || ''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
