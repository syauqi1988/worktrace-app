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
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 4, letterSpacing: 2 },
  docNum: { fontSize: 10, color: BLACK, marginBottom: 4 },
  dateText: { fontSize: 9, color: MID, marginBottom: 1 },
  divider: { height: 2, backgroundColor: DARK, marginVertical: 12 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  name: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: BLACK },
  text: { fontSize: 9, color: MID, marginBottom: 1 },
  textBlack: { fontSize: 10, color: BLACK, marginBottom: 1 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  col: { flex: 1 },
  contentBox: { borderWidth: 0.5, borderColor: BORDER, backgroundColor: BG_LIGHT, borderRadius: 4, padding: 10, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  photoContainer: { width: 240, height: 180, borderWidth: 0.5, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  photoCaption: { fontSize: 8, color: MUTED, textAlign: 'center', marginTop: 2 },
  // Side-by-side before/after grid
  comparisonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  comparisonCell: { flex: 1 },
  comparisonHeader: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  comparisonHeaderText: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MID, textAlign: 'center' },
  smallPhotoContainer: { width: '100%', height: 140, borderWidth: 0.5, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  confirmBox: { backgroundColor: DARK, borderRadius: 4, padding: 12, marginTop: 12 },
  confirmTitle: { color: WHITE, fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  confirmRow: { flexDirection: 'row', marginBottom: 3 },
  confirmLabel: { width: 140, fontSize: 9, color: MUTED },
  confirmValue: { fontSize: 9, color: WHITE },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
  footerDivider: { height: 0.5, backgroundColor: BORDER, marginBottom: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: MUTED },
});

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
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
    logo_base64?: string;
  };
}

export default function CompletionReportPDF({ report, job, customer, company }: CompletionReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {company.logo_base64 ? <Image src={company.logo_base64} style={s.logo} /> : null}
            <Text style={s.companyName}>{company.company_name || 'Syarikat'}</Text>
            {company.phone && <Text style={s.companyText}>{company.phone}</Text>}
            {company.address && <Text style={s.companySmall}>{company.address}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>LAPORAN SIAP KERJA</Text>
            <Text style={s.docNum}>No. Laporan: {report.report_number}</Text>
            <Text style={s.dateText}>Tarikh: {formatDate(report.completion_date)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Job + Customer Info */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>BUTIRAN KERJA</Text>
            {job && (
              <>
                <Text style={s.name}>{job.job_number}</Text>
                <Text style={s.text}>Tajuk: {job.title}</Text>
                <Text style={s.text}>Kategori: {job.category}</Text>
                <Text style={s.text}>Tarikh Siap: {formatDate(report.completion_date)}</Text>
              </>
            )}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>PELANGGAN</Text>
            {customer && (
              <>
                <Text style={s.name}>{customer.name}</Text>
                {customer.phone && <Text style={s.text}>{customer.phone}</Text>}
                {customer.address && <Text style={s.text}>{customer.address}</Text>}
              </>
            )}
          </View>
        </View>

        {/* Work Description */}
        {report.work_description && (
          <>
            <Text style={s.sectionLabel}>PENERANGAN KERJA DILAKSANAKAN</Text>
            <View style={s.contentBox}>
              <Text style={s.textBlack}>{report.work_description}</Text>
            </View>
          </>
        )}

        {/* Materials */}
        {report.materials_used && (
          <>
            <Text style={s.sectionLabel}>BAHAN/ALATAN DIGUNAKAN</Text>
            <View style={s.contentBox}>
              <Text style={s.textBlack}>{report.materials_used}</Text>
            </View>
          </>
        )}

        {/* Photos */}
        {report.photos.length > 0 && (
          <>
            <Text style={s.sectionLabel}>GAMBAR KERJA SIAP</Text>
            <View style={s.photoGrid}>
              {report.photos.map((photo, i) => (
                <View key={i}>
                  <View style={s.photoContainer}>
                    <Image src={photo} style={s.photo} />
                  </View>
                  <Text style={s.photoCaption}>Gambar {i + 1}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Confirmation */}
        <View style={s.confirmBox}>
          <Text style={s.confirmTitle}>✓ PENGESAHAN SIAP KERJA</Text>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Juruteknik:</Text>
            <Text style={s.confirmValue}>{report.technician_name || '-'}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Tarikh:</Text>
            <Text style={s.confirmValue}>{formatDate(report.completion_date)}</Text>
          </View>
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Pengesahan Pelanggan:</Text>
            <Text style={s.confirmValue}>{report.customer_signature || '—'}</Text>
          </View>
        </View>

        {/* Notes */}
        {report.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionLabel}>NOTA</Text>
            <Text style={s.text}>{report.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>Jana oleh WorkTrace</Text>
            <Text style={s.footerText}>{company.company_name || ''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
