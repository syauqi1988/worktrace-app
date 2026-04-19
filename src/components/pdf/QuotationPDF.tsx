import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const BLACK = '#0F172A';
const DARK = '#1E293B';
const MID = '#475569';
const MUTED = '#94A3B8';
const BORDER = '#CBD5E1';
const BG_LIGHT = '#F8FAFC';
const BG_MED = '#F1F5F9';
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
  billTo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billToCol: { flex: 1 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  name: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: BLACK },
  text: { fontSize: 9, color: MID, marginBottom: 1 },
  tableHeader: { flexDirection: 'row', backgroundColor: DARK, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 2 },
  tableHeaderText: { color: WHITE, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: BG_LIGHT },
  colBil: { width: 30 },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'center' },
  colUnit: { width: 80, textAlign: 'right' },
  colAmt: { width: 80, textAlign: 'right' },
  summaryBox: { marginTop: 12, borderWidth: 0.5, borderColor: BORDER, backgroundColor: BG_LIGHT, borderRadius: 4, padding: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  summaryLabel: { width: 120, textAlign: 'right', paddingRight: 8, fontSize: 9, color: MID },
  summaryValue: { width: 100, textAlign: 'right', fontSize: 9 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER },
  totalLabel: { width: 120, textAlign: 'right', paddingRight: 8, fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLACK },
  totalValue: { width: 100, textAlign: 'right', fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLACK },
  termsBox: { marginTop: 16, backgroundColor: BG_MED, borderRadius: 4, padding: 8 },
  termsTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  termsText: { fontSize: 8, color: MID },
  notesBox: { marginTop: 16 },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  notesText: { fontSize: 9, color: MID },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  footerDivider: { height: 0.5, backgroundColor: BORDER, marginBottom: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: MUTED },
  footerCenter: { fontSize: 7, color: MUTED, textAlign: 'center' },
  tableText: { fontSize: 9, color: BLACK },
});

function fmt(n: number) {
  return `RM ${(n || 0).toFixed(2)}`;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface QuotationPDFProps {
  quotation: {
    quote_number: string;
    created_at: string;
    valid_until: string | null;
    status: string;
    items: Array<{ description: string; qty: number; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
    notes: string | null;
    terms?: string | null;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  company: { company_name: string | null; phone: string | null; address: string | null; logo_url: string | null; logo_base64?: string; ssm_number_new?: string | null; ssm_number_old?: string | null };
}

const DEFAULT_TERMS = `1. Sebut harga ini sah selama 30 hari dari tarikh di atas.
2. Harga tertakluk kepada perubahan tanpa notis.
3. Pembayaran deposit diperlukan sebelum kerja dimulakan.`;

export default function QuotationPDF({ quotation, job, customer, company }: QuotationPDFProps) {
  const afterDiscount = quotation.subtotal - quotation.discount;
  const sstAmount = quotation.tax_rate > 0 ? afterDiscount * (quotation.tax_rate / 100) : 0;
  const termsText = quotation.terms || DEFAULT_TERMS;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {company.logo_base64 ? (
              <Image src={company.logo_base64} style={s.logo} />
            ) : company.logo_url ? (
              <Image src={company.logo_url} style={s.logo} />
            ) : null}
            <Text style={s.companyName}>{company.company_name || 'Syarikat'}</Text>
            {(company.ssm_number_new || company.ssm_number_old) && (
              <Text style={s.companySmall}>
                SSM: {[company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ')}
              </Text>
            )}
            {company.phone && <Text style={s.companyText}>{company.phone}</Text>}
            {company.address && <Text style={s.companySmall}>{company.address}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>SEBUT HARGA</Text>
            <Text style={s.docNum}>{quotation.quote_number}</Text>
            <Text style={s.dateText}>Tarikh: {formatDate(quotation.created_at)}</Text>
            <Text style={s.dateText}>Sah Hingga: {formatDate(quotation.valid_until)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Bill To */}
        <View style={s.billTo}>
          <View style={s.billToCol}>
            <Text style={s.sectionLabel}>KEPADA</Text>
            <Text style={s.name}>{customer?.name || '-'}</Text>
            {customer?.phone && <Text style={s.text}>{customer.phone}</Text>}
            {customer?.email && <Text style={s.text}>{customer.email}</Text>}
            {customer?.address && <Text style={s.text}>{customer.address}</Text>}
          </View>
          {job && (
            <View style={s.billToCol}>
              <Text style={s.sectionLabel}>BERKAITAN KERJA</Text>
              <Text style={s.name}>{job.job_number}</Text>
              <Text style={s.text}>{job.title}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colBil]}>Bil.</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>Penerangan</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Harga Seunit</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Jumlah</Text>
        </View>
        {quotation.items.map((item, i) => (
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
            <Text style={s.summaryValue}>{fmt(quotation.subtotal)}</Text>
          </View>
          {quotation.discount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Diskaun</Text>
              <Text style={s.summaryValue}>- {fmt(quotation.discount)}</Text>
            </View>
          )}
          {quotation.tax_rate > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>SST ({quotation.tax_rate}%)</Text>
              <Text style={s.summaryValue}>{fmt(sstAmount)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>JUMLAH KESELURUHAN</Text>
            <Text style={s.totalValue}>{fmt(quotation.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>NOTA</Text>
            <Text style={s.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Terms */}
        <View style={s.termsBox}>
          <Text style={s.termsTitle}>TERMA & SYARAT</Text>
          {termsText.split('\n').map((line, i) => (
            <Text key={i} style={s.termsText}>{line}</Text>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>Jana oleh WorkTrace</Text>
            <Text style={s.footerCenter}>Halaman 1 dari 1</Text>
            <Text style={s.footerText}>{company.company_name || ''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
