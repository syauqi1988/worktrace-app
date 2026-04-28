import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtDate, COLORS } from './pdfStyles';

const extra = StyleSheet.create({
  greyBox: {
    backgroundColor: COLORS.HEADER_BG,
    padding: 8,
    borderRadius: 2,
    marginTop: 4,
  },
  greyText: { fontSize: 9, color: COLORS.TEXT, lineHeight: 1.4 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoContainer: {
    width: 240,
    height: 180,
    borderWidth: 0.5,
    borderColor: COLORS.BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  photoCaption: { fontSize: 8, color: COLORS.MUTED, textAlign: 'center', marginTop: 2 },

  // Side-by-side comparison
  comparisonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  comparisonCell: { flex: 1 },
  comparisonHeader: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.MUTED,
    textAlign: 'center',
  },
  smallPhotoContainer: {
    width: '100%',
    height: 140,
    borderWidth: 0.5,
    borderColor: COLORS.BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },

  // Confirmation info box (clean light style, matches WO greyBox)
  infoBox: {
    backgroundColor: COLORS.HEADER_BG,
    borderRadius: 2,
    padding: 10,
    marginTop: 4,
  },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 150, fontSize: 9, color: COLORS.MUTED },
  infoValue: { fontSize: 9, color: COLORS.BLACK, flex: 1 },
});

function formatDateTime(d: string | null | undefined) {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export interface CompletionReportPDFProps {
  report: {
    report_number: string;
    completion_date: string | null;
    technician_name: string | null;
    work_description: string | null;
    materials_used: string | null;
    customer_signature: string | null;
    notes: string | null;
    status?: string | null;
    accepted_at?: string | null;
    /** Legacy single list (kept for compatibility). Used as "after" when before/after not provided. */
    photos?: string[];
    before_photos?: string[];
    after_photos?: string[];
  };
  job: { job_number: string; title: string; category: string } | null;
  customer: { name: string; phone: string | null; address: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_url?: string | null;
    logo_base64?: string;
    ssm_number_new?: string | null;
    ssm_number_old?: string | null;
  };
}

export default function CompletionReportPDF({ report, job, customer, company }: CompletionReportPDFProps) {
  const logo = company.logo_base64 || company.logo_url;
  const ssm = [company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ');
  const status = (report.status || 'draft').toString();
  const before = report.before_photos ?? [];
  const after = (report.after_photos && report.after_photos.length > 0)
    ? report.after_photos
    : (report.photos ?? []);
  const customerConfirmation =
    report.accepted_at
      ? `${customer?.name || report.customer_signature || 'Pelanggan'} — ${formatDateTime(report.accepted_at)}`
      : (report.customer_signature || '—');

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
            <Text style={s.docTitle}>LAPORAN SIAP KERJA</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>No.</Text>
              <Text style={s.metaValue}>{report.report_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{fmtDate(report.completion_date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Status</Text>
              <Text style={s.metaValue}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Job + Customer */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Butiran Kerja</Text>
            {job ? <Text style={s.partyName}>{job.job_number}</Text> : null}
            {job ? <Text style={s.partyText}>{job.title}</Text> : null}
            {job?.category ? (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>Kategori</Text>
                <Text style={s.partyMetaValue}>{job.category}</Text>
              </View>
            ) : null}
            <View style={s.partyMetaRow}>
              <Text style={s.partyMetaLabel}>Tarikh Siap</Text>
              <Text style={s.partyMetaValue}>{fmtDate(report.completion_date)}</Text>
            </View>
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Maklumat Pelanggan</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.phone ? <Text style={s.partyText}>{customer.phone}</Text> : null}
            {customer?.address ? <Text style={s.partyText}>{customer.address}</Text> : null}
          </View>
        </View>

        {/* Work Description */}
        {report.work_description ? (
          <View style={{ marginTop: 4 }}>
            <Text style={s.sectionLabel}>Penerangan Kerja Dilaksanakan</Text>
            <View style={extra.greyBox}>
              <Text style={extra.greyText}>{report.work_description}</Text>
            </View>
          </View>
        ) : null}

        {/* Materials */}
        {report.materials_used ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionLabel}>Bahan / Alatan Digunakan</Text>
            <View style={extra.greyBox}>
              <Text style={extra.greyText}>{report.materials_used}</Text>
            </View>
          </View>
        ) : null}

        {/* Photos */}
        {(before.length > 0 || after.length > 0) ? (
          <View style={{ marginTop: 12 }}>
            {before.length === 0 ? (
              <>
                <Text style={s.sectionLabel}>Gambar Selepas Kerja</Text>
                <View style={extra.photoGrid}>
                  {after.map((photo, i) => (
                    <View key={i} wrap={false}>
                      <View style={extra.photoContainer}>
                        <Image src={photo} style={extra.photo} />
                      </View>
                      <Text style={extra.photoCaption}>Selepas {i + 1}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={s.sectionLabel}>Perbandingan Sebelum & Selepas</Text>
                <View style={extra.comparisonHeader}>
                  <Text style={extra.comparisonHeaderText}>SEBELUM</Text>
                  <Text style={extra.comparisonHeaderText}>SELEPAS</Text>
                </View>
                {Array.from({ length: Math.max(before.length, after.length) }).map((_, i) => (
                  <View key={i} style={extra.comparisonRow} wrap={false}>
                    <View style={extra.comparisonCell}>
                      {before[i] ? (
                        <>
                          <View style={extra.smallPhotoContainer}>
                            <Image src={before[i]} style={extra.photo} />
                          </View>
                          <Text style={extra.photoCaption}>Sebelum {i + 1}</Text>
                        </>
                      ) : null}
                    </View>
                    <View style={extra.comparisonCell}>
                      {after[i] ? (
                        <>
                          <View style={extra.smallPhotoContainer}>
                            <Image src={after[i]} style={extra.photo} />
                          </View>
                          <Text style={extra.photoCaption}>Selepas {i + 1}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        ) : null}

        {/* Notes */}
        {report.notes ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Nota</Text>
            <Text style={s.blockText}>{report.notes}</Text>
          </View>
        ) : null}

        {/* Confirmation */}
        <View style={{ marginTop: 12 }} wrap={false}>
          <Text style={s.sectionLabel}>Pengesahan Siap Kerja</Text>
          <View style={extra.infoBox}>
            <View style={extra.infoRow}>
              <Text style={extra.infoLabel}>Juruteknik</Text>
              <Text style={extra.infoValue}>{report.technician_name || '-'}</Text>
            </View>
            <View style={extra.infoRow}>
              <Text style={extra.infoLabel}>Tarikh Siap</Text>
              <Text style={extra.infoValue}>{fmtDate(report.completion_date)}</Text>
            </View>
            <View style={extra.infoRow}>
              <Text style={extra.infoLabel}>Pengesahan Pelanggan</Text>
              <Text style={extra.infoValue}>{customerConfirmation}</Text>
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
