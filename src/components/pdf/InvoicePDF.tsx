import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const BLUE = '#2563EB';
const TEXT_PRIMARY = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ROW_ALT = '#F8FAFC';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: TEXT_PRIMARY },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  logo: { maxHeight: 60, maxWidth: 120, marginBottom: 6 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  docTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4 },
  invoiceNum: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  label: { fontSize: 8, color: TEXT_MUTED, marginBottom: 1 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 12 },
  thinDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  billTo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billToCol: { flex: 1 },
  sectionLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 4 },
  name: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  text: { fontSize: 10, marginBottom: 1 },
  muted: { fontSize: 10, color: TEXT_MUTED, marginBottom: 1 },
  tableHeader: { flexDirection: 'row', backgroundColor: BLUE, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 2 },
  tableHeaderText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { backgroundColor: ROW_ALT },
  colBil: { width: 30 },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'center' },
  colUnit: { width: 80, textAlign: 'right' },
  colAmt: { width: 80, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  summaryLabel: { width: 120, textAlign: 'right', paddingRight: 8 },
  summaryValue: { width: 100, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTopWidth: 2, borderTopColor: BLUE },
  totalLabel: { width: 120, textAlign: 'right', paddingRight: 8, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  totalValue: { width: 100, textAlign: 'right', fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLUE },
  notesBox: { marginTop: 16 },
  notesLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 10, color: TEXT_MUTED },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  footerDivider: { height: 1, backgroundColor: BORDER, marginBottom: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: TEXT_MUTED },
  lhdnBox: { marginTop: 12, padding: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  lhdnTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  lhdnRow: { flexDirection: 'row', marginBottom: 2 },
  lhdnLabel: { fontSize: 9, color: TEXT_MUTED, width: 120 },
  lhdnValue: { fontSize: 9 },
  statusBadge: { fontSize: 10, color: TEXT_MUTED, marginTop: 2 },
});

function fmt(n: number) {
  return `RM ${(n || 0).toFixed(2)}`;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    created_at: string;
    issued_date: string | null;
    due_date: string | null;
    paid_date: string | null;
    status: string;
    items: Array<{ description: string; qty: number; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
    notes: string | null;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null; tin_number?: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    lhdn_enabled?: boolean;
    tin_number?: string | null;
    msic_code?: string | null;
    sst_registered?: boolean;
  };
}

export default function InvoicePDF({ invoice, job, customer, company }: InvoicePDFProps) {
  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {company.logo_url && <Image src={company.logo_url} style={s.logo} />}
            <Text style={s.companyName}>{company.company_name || 'Syarikat'}</Text>
            {company.phone && <Text style={s.muted}>{company.phone}</Text>}
            {company.address && <Text style={s.muted}>{company.address}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>INVOIS</Text>
            <Text style={s.invoiceNum}>{invoice.invoice_number}</Text>
            <Text style={s.muted}>Tarikh: {formatDate(invoice.issued_date || invoice.created_at)}</Text>
            <Text style={s.muted}>Tarikh Bayaran Akhir: {formatDate(invoice.due_date)}</Text>
            {invoice.status === 'Paid' && invoice.paid_date && (
              <Text style={s.muted}>Tarikh Dibayar: {formatDate(invoice.paid_date)}</Text>
            )}
            <Text style={s.statusBadge}>Status: {invoice.status}</Text>
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
            {customer?.address && <Text style={s.muted}>{customer.address}</Text>}
          </View>
          {job && (
            <View style={s.billToCol}>
              <Text style={s.sectionLabel}>BERKAITAN KERJA</Text>
              <Text style={s.name}>{job.job_number}</Text>
              <Text style={s.text}>{job.title}</Text>
            </View>
          )}
        </View>

        {/* LHDN Section */}
        {company.lhdn_enabled && (
          <View style={s.lhdnBox}>
            <Text style={s.lhdnTitle}>Maklumat LHDN</Text>
            {company.tin_number && (
              <View style={s.lhdnRow}>
                <Text style={s.lhdnLabel}>No. TIN Syarikat:</Text>
                <Text style={s.lhdnValue}>{company.tin_number}</Text>
              </View>
            )}
            {customer?.tin_number && (
              <View style={s.lhdnRow}>
                <Text style={s.lhdnLabel}>No. TIN Pelanggan:</Text>
                <Text style={s.lhdnValue}>{customer.tin_number}</Text>
              </View>
            )}
            {company.msic_code && (
              <View style={s.lhdnRow}>
                <Text style={s.lhdnLabel}>Kod MSIC:</Text>
                <Text style={s.lhdnValue}>{company.msic_code}</Text>
              </View>
            )}
            {company.sst_registered && (
              <View style={s.lhdnRow}>
                <Text style={s.lhdnLabel}>SST Berdaftar:</Text>
                <Text style={s.lhdnValue}>Ya</Text>
              </View>
            )}
          </View>
        )}

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colBil]}>Bil.</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>Penerangan</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Harga Seunit</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Jumlah</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.colBil}>{i + 1}</Text>
            <Text style={s.colDesc}>{item.description}</Text>
            <Text style={s.colQty}>{item.qty}</Text>
            <Text style={s.colUnit}>{fmt(item.unit_price)}</Text>
            <Text style={s.colAmt}>{fmt(item.amount)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={{ marginTop: 12 }}>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, s.muted]}>Subtotal</Text>
            <Text style={s.summaryValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, s.muted]}>Diskaun</Text>
              <Text style={s.summaryValue}>- {fmt(invoice.discount)}</Text>
            </View>
          )}
          {invoice.tax_rate > 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, s.muted]}>SST ({invoice.tax_rate}%)</Text>
              <Text style={s.summaryValue}>{fmt(sstAmount)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>JUMLAH KESELURUHAN</Text>
            <Text style={s.totalValue}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>NOTA</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>Dokumen ini dijana secara automatik oleh WorkTrace</Text>
            <Text style={s.footerText}>{company.company_name || ''} | worktrace.app</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
