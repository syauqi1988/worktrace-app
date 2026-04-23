import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate, COLORS } from './pdfStyles';

export interface WorkOrderPDFProps {
  wo: {
    wo_number: string;
    title: string;
    scope_of_work: string;
    scheduled_start_date: string | null;
    scheduled_end_date: string | null;
    estimated_duration: string | null;
    location: string | null;
    technician_name: string | null;
    special_instructions: string | null;
    terms: string | null;
    status: string;
    items: Array<{ description: string; qty: number; unit_price: number }>;
    total: number;
    created_at: string;
  };
  job: { job_number: string; title: string } | null;
  quotation: { quote_number: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    logo_base64?: string;
    ssm_number_new?: string | null;
    ssm_number_old?: string | null;
  };
}

const extra = StyleSheet.create({
  greyBox: {
    backgroundColor: COLORS.HEADER_BG,
    padding: 8,
    borderRadius: 2,
    marginTop: 4,
  },
  greyText: { fontSize: 9, color: COLORS.TEXT, lineHeight: 1.4 },
  scheduleBox: {
    borderWidth: 0.5,
    borderColor: COLORS.BORDER,
    padding: 8,
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  scheduleCell: { width: '50%', marginBottom: 4 },
  scheduleLabel: { fontSize: 8, color: COLORS.MUTED },
  scheduleValue: { fontSize: 9, color: COLORS.BLACK, marginTop: 1 },
  signatureRow: { flexDirection: 'row', gap: 24, marginTop: 30 },
  signatureBox: { flex: 1 },
  signatureLine: { borderTopWidth: 0.5, borderTopColor: COLORS.BLACK, paddingTop: 4 },
  signatureLabel: { fontSize: 8, color: COLORS.MUTED, textAlign: 'center' },
  signatureName: { fontSize: 9, color: COLORS.BLACK, marginTop: 2, textAlign: 'center' },
});

const DEFAULT_TERMS = `1. Kerja dilaksanakan mengikut spesifikasi dipersetujui.
2. Perubahan skop memerlukan kelulusan bertulis.
3. Pembayaran dalam 14 hari dari tarikh invois.`;

export default function WorkOrderPDF({ wo, job, quotation, customer, company }: WorkOrderPDFProps) {
  const termsText = wo.terms || DEFAULT_TERMS;
  const termsLines = termsText.split('\n').filter(l => l.trim());
  const logo = company.logo_base64 || company.logo_url;
  const ssm = [company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ');

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeftRow}>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{company.company_name || 'Syarikat'}</Text>
              {ssm ? <Text style={s.companyText}>Reg No: {ssm}</Text> : null}
              {company.address ? <Text style={s.companyText}>{company.address}</Text> : null}
              {company.phone ? <Text style={s.companyText}>Contact: {company.phone}</Text> : null}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>WORK ORDER</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>No.</Text>
              <Text style={s.metaValue}>{wo.wo_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{fmtDate(wo.created_at)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Status</Text>
              <Text style={s.metaValue}>{wo.status}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Job + Customer */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Butiran Kerja</Text>
            {job ? <Text style={s.partyName}>{job.job_number}</Text> : null}
            <Text style={s.partyText}>{wo.title}</Text>
            {quotation ? (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>Sebut Harga</Text>
                <Text style={s.partyMetaValue}>{quotation.quote_number}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Maklumat Pelanggan</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.phone ? <Text style={s.partyText}>{customer.phone}</Text> : null}
            {customer?.email ? <Text style={s.partyText}>{customer.email}</Text> : null}
            {customer?.address ? <Text style={s.partyText}>{customer.address}</Text> : null}
          </View>
        </View>

        {/* Schedule */}
        <Text style={s.sectionLabel}>Jadual Kerja</Text>
        <View style={extra.scheduleBox}>
          <View style={extra.scheduleCell}>
            <Text style={extra.scheduleLabel}>Tarikh Mula</Text>
            <Text style={extra.scheduleValue}>{fmtDate(wo.scheduled_start_date)}</Text>
          </View>
          <View style={extra.scheduleCell}>
            <Text style={extra.scheduleLabel}>Tarikh Siap Anggaran</Text>
            <Text style={extra.scheduleValue}>{fmtDate(wo.scheduled_end_date)}</Text>
          </View>
          {wo.estimated_duration ? (
            <View style={extra.scheduleCell}>
              <Text style={extra.scheduleLabel}>Tempoh Anggaran</Text>
              <Text style={extra.scheduleValue}>{wo.estimated_duration}</Text>
            </View>
          ) : null}
          {wo.technician_name ? (
            <View style={extra.scheduleCell}>
              <Text style={extra.scheduleLabel}>Juruteknik</Text>
              <Text style={extra.scheduleValue}>{wo.technician_name}</Text>
            </View>
          ) : null}
          {wo.location ? (
            <View style={{ width: '100%', marginTop: 4 }}>
              <Text style={extra.scheduleLabel}>Lokasi</Text>
              <Text style={extra.scheduleValue}>{wo.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Scope */}
        <View style={{ marginTop: 12 }}>
          <Text style={s.sectionLabel}>Skop Kerja</Text>
          <View style={extra.greyBox}>
            <Text style={extra.greyText}>{wo.scope_of_work}</Text>
          </View>
        </View>

        {/* Items table */}
        {wo.items && wo.items.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colNo]}>No.</Text>
              <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
              <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
              <Text style={[s.tableHeaderText, s.colUnit]}>U/Price</Text>
              <Text style={[s.tableHeaderText, s.colAmt]}>Amt</Text>
            </View>
            {wo.items.map((item, i) => (
              <View key={i} style={s.tableRow} wrap={false}>
                <Text style={[s.tableText, s.colNo]}>{i + 1}</Text>
                <Text style={[s.tableText, s.colDesc]}>{item.description}</Text>
                <Text style={[s.tableText, s.colQty]}>{item.qty}</Text>
                <Text style={[s.tableText, s.colUnit]}>{(Number(item.unit_price) || 0).toFixed(2)}</Text>
                <Text style={[s.tableText, s.colAmt]}>
                  {((item.qty || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={s.summaryWrap}>
              <View style={s.summary}>
                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLabel}>Total</Text>
                  <Text style={s.summaryTotalValue}>{fmtRM(wo.total)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Special instructions */}
        {wo.special_instructions ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionLabel}>Arahan Khas</Text>
            <View style={extra.greyBox}>
              <Text style={extra.greyText}>{wo.special_instructions}</Text>
            </View>
          </View>
        ) : null}

        {/* Terms */}
        <View style={s.block}>
          <Text style={s.blockLabel}>Syarat & Terma</Text>
          {termsLines.map((line, i) => {
            const m = line.match(/^\s*(\d+)[\.\)]\s*(.*)$/);
            if (m) {
              return (
                <View key={i} style={s.termItem}>
                  <Text style={s.termNumber}>{m[1]}.</Text>
                  <Text style={s.termContent}>{m[2]}</Text>
                </View>
              );
            }
            return <Text key={i} style={s.blockText}>{line}</Text>;
          })}
        </View>

        {/* Acceptance signatures */}
        <View style={extra.signatureRow}>
          <View style={extra.signatureBox}>
            <View style={extra.signatureLine}>
              <Text style={extra.signatureLabel}>Tandatangan Syarikat</Text>
              <Text style={extra.signatureName}>{company.company_name || ''}</Text>
            </View>
          </View>
          <View style={extra.signatureBox}>
            <View style={extra.signatureLine}>
              <Text style={extra.signatureLabel}>Tandatangan Pelanggan</Text>
              <Text style={extra.signatureName}>{customer?.name || ''}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Jana oleh WorkTrace</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
