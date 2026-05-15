import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles, fmtRM, fmtDate, COLORS } from './pdfStyles';

export interface MonthlySummaryData {
  company: {
    name: string;
    logo_url?: string | null;
    logo_base64?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    ssm?: string | null;
  };
  periodLabel: string; // e.g. "Oktober 2025"
  periodStart: string;
  periodEnd: string;
  jobs: { total: number; completed: number; active: number; cancelled: number };
  invoices: { total: number; paid: number; outstanding: number; paidAmount: number; outstandingAmount: number };
  topCustomers: { name: string; amount: number; count: number }[];
  byCategory: { category: string; count: number }[];
}

export default function CompletionSummaryReportPDF({ data }: { data: MonthlySummaryData }) {
  const logo = data.company.logo_base64 || data.company.logo_url;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerLeftRow}>
            {logo && (
              <Image src={logo} style={pdfStyles.logo} />
            )}
            <View style={pdfStyles.companyBlock}>
              <Text style={pdfStyles.companyName}>{data.company.name}</Text>
              {data.company.ssm && <Text style={pdfStyles.companyText}>SSM: {data.company.ssm}</Text>}
              {data.company.address && <Text style={pdfStyles.companyText}>{data.company.address}</Text>}
              {data.company.phone && <Text style={pdfStyles.companyText}>{data.company.phone}</Text>}
              {data.company.email && <Text style={pdfStyles.companyText}>{data.company.email}</Text>}
            </View>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.docTitle}>LAPORAN BULANAN</Text>
            <View style={pdfStyles.metaRow}>
              <Text style={pdfStyles.metaLabel}>Tempoh:</Text>
              <Text style={pdfStyles.metaValue}>{data.periodLabel}</Text>
            </View>
            <View style={pdfStyles.metaRow}>
              <Text style={pdfStyles.metaLabel}>Tarikh Jana:</Text>
              <Text style={pdfStyles.metaValue}>{fmtDate(new Date().toISOString())}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.divider} />

        {/* Jobs Summary */}
        <View style={pdfStyles.block}>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.BLACK, marginBottom: 6 }}>
            Ringkasan Kerja
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatCell label="Jumlah Kerja" value={String(data.jobs.total)} />
            <StatCell label="Siap" value={String(data.jobs.completed)} />
            <StatCell label="Aktif" value={String(data.jobs.active)} />
            <StatCell label="Dibatal" value={String(data.jobs.cancelled)} />
          </View>
        </View>

        {/* Invoices Summary */}
        <View style={pdfStyles.block}>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.BLACK, marginBottom: 6 }}>
            Ringkasan Invois
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatCell label="Jumlah Invois" value={String(data.invoices.total)} />
            <StatCell label="Dibayar" value={String(data.invoices.paid)} />
            <StatCell label="Belum Bayar" value={String(data.invoices.outstanding)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <StatCell label="Diterima" value={fmtRM(data.invoices.paidAmount)} wide />
            <StatCell label="Tertunggak" value={fmtRM(data.invoices.outstandingAmount)} wide />
          </View>
        </View>

        {/* By Category */}
        {data.byCategory.length > 0 && (
          <View style={pdfStyles.block}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.BLACK, marginBottom: 6 }}>
              Kerja Mengikut Kategori
            </Text>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderText, { flex: 1 }]}>Kategori</Text>
              <Text style={[pdfStyles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Bilangan</Text>
            </View>
            {data.byCategory.map((c, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableText, { flex: 1 }]}>{c.category}</Text>
                <Text style={[pdfStyles.tableText, { width: 60, textAlign: 'right' }]}>{c.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Customers */}
        {data.topCustomers.length > 0 && (
          <View style={pdfStyles.block}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.BLACK, marginBottom: 6 }}>
              5 Pelanggan Teratas (Mengikut Pendapatan)
            </Text>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderText, { flex: 1 }]}>Pelanggan</Text>
              <Text style={[pdfStyles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Invois</Text>
              <Text style={[pdfStyles.tableHeaderText, { width: 90, textAlign: 'right' }]}>Jumlah</Text>
            </View>
            {data.topCustomers.map((c, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableText, { flex: 1 }]}>{c.name}</Text>
                <Text style={[pdfStyles.tableText, { width: 60, textAlign: 'right' }]}>{c.count}</Text>
                <Text style={[pdfStyles.tableText, { width: 90, textAlign: 'right' }]}>{fmtRM(c.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>Dijana oleh WorkTrace</Text>
          <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function StatCell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={{
      flex: wide ? 1 : 1,
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
      borderRadius: 4,
      padding: 8,
    }}>
      <Text style={{ fontSize: 8, color: COLORS.MUTED, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: wide ? 12 : 14, fontFamily: 'Helvetica-Bold', color: COLORS.BLACK }}>{value}</Text>
    </View>
  );
}
