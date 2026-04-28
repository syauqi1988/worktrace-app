import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtDate, COLORS } from './pdfStyles';

// WorkTrace palette overlay
const WT = {
  ORANGE: '#E85C26',
  DARK: '#1A1A1A',
  MID: '#4A4A4A',
  MUTED: '#888888',
  LINE: '#E5E5E5',
  SURFACE: '#F8F8F6',
  GREEN: '#2D7D46',
  GREEN_BG: '#EDF7F1',
  AMBER: '#A0620D',
  AMBER_BG: '#FEF3E2',
  BLUE: '#1B5FA8',
  BLUE_BG: '#EBF3FD',
};

const x = StyleSheet.create({
  // Header bar
  hbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: WT.LINE,
    paddingBottom: 10,
    marginBottom: 12,
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  hLogo: { width: 36, height: 36, marginRight: 10, objectFit: 'contain' },
  hLogoFallback: { width: 36, height: 36, marginRight: 10, backgroundColor: WT.ORANGE, borderRadius: 6 },
  hCompany: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: WT.DARK },
  hTag: { fontSize: 8, color: WT.MUTED, marginTop: 1, letterSpacing: 0.5 },
  hRight: { alignItems: 'flex-end' },
  hTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WT.DARK, letterSpacing: -0.5 },
  hNum: { fontSize: 9, color: WT.MUTED, marginTop: 2, fontFamily: 'Helvetica' },

  // Status pill
  pillRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  pillText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  pillDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },

  // Title block
  titleBlock: { marginBottom: 12 },
  jobTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: WT.DARK, marginBottom: 3, letterSpacing: -0.3 },
  jobSubtitle: { fontSize: 9, color: WT.MUTED },

  // Meta strip (4 cells)
  metaStrip: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  metaCell: { flex: 1, backgroundColor: WT.SURFACE, borderRadius: 6, padding: 8 },
  metaLabel: { fontSize: 7, color: WT.MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontSize: 10, color: WT.DARK, fontFamily: 'Helvetica-Bold' },

  // Section heading
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: WT.MUTED, letterSpacing: 1, textTransform: 'uppercase', marginRight: 8 },
  sectionCount: { fontSize: 8, color: WT.MUTED, backgroundColor: WT.LINE, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginRight: 8 },
  sectionLine: { flex: 1, height: 0.5, backgroundColor: WT.LINE },

  // Cards
  card: { backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: WT.LINE, borderRadius: 6, padding: 10 },
  softCard: { backgroundColor: WT.SURFACE, borderRadius: 6, padding: 10 },
  cardText: { fontSize: 9.5, color: WT.DARK, lineHeight: 1.5 },

  // Customer
  custName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WT.DARK, marginBottom: 2 },
  custLine: { fontSize: 9, color: WT.MID, lineHeight: 1.4 },

  // Photo grid (2 cols)
  photoRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  photoCard: { flex: 1, borderWidth: 0.5, borderColor: WT.LINE, borderRadius: 6, overflow: 'hidden' },
  photoImg: { width: '100%', height: 130, objectFit: 'cover', backgroundColor: WT.SURFACE },
  photoTagWrap: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  photoTagText: { fontSize: 7, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  photoBody: { padding: 7 },
  photoCaption: { fontSize: 8.5, color: WT.DARK, lineHeight: 1.35, marginBottom: 3 },
  photoTime: { fontSize: 7.5, color: WT.MUTED },

  // Checklist
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: WT.LINE, borderRadius: 6, padding: 8, marginBottom: 5 },
  checkDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  checkDotDone: { backgroundColor: WT.GREEN_BG },
  checkDotPending: { backgroundColor: WT.AMBER_BG },
  checkMark: { fontSize: 7, color: WT.GREEN, fontFamily: 'Helvetica-Bold' },
  checkBang: { fontSize: 7, color: WT.AMBER, fontFamily: 'Helvetica-Bold' },
  checkBody: { flex: 1 },
  checkTitle: { fontSize: 9.5, color: WT.DARK, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  checkNote: { fontSize: 8.5, color: WT.MUTED, lineHeight: 1.4 },
  checkPending: { fontSize: 7, color: WT.AMBER, backgroundColor: WT.AMBER_BG, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, marginLeft: 6 },

  // Sign-off
  signRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  signCard: { flex: 1, borderWidth: 0.5, borderColor: WT.LINE, borderRadius: 6, padding: 10, backgroundColor: '#FFFFFF' },
  signRole: { fontSize: 7.5, color: WT.MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  signName: { fontSize: 10, color: WT.DARK, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  signNamePending: { fontSize: 10, color: WT.MUTED, fontStyle: 'italic', marginBottom: 2 },
  signDate: { fontSize: 8, color: WT.MUTED },
  signLine: { borderBottomWidth: 1, borderBottomColor: WT.LINE, marginTop: 12, marginBottom: 4, height: 14 },
  signSub: { fontSize: 8, color: WT.MUTED },

  // Footer
  ftr: { position: 'absolute', bottom: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: WT.LINE, paddingTop: 8 },
  ftrText: { fontSize: 7.5, color: WT.MUTED },
  ftrBrand: { fontSize: 7.5, color: WT.DARK, fontFamily: 'Helvetica-Bold' },
});

export interface ChecklistItemPDF {
  title: string;
  done?: boolean;
  note?: string | null;
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
    submitted_at?: string | null;
    photos?: string[];
    before_photos?: string[];
    after_photos?: string[];
    location_label?: string | null;
    project_ref?: string | null;
    checklist?: ChecklistItemPDF[];
    photo_captions?: { before?: string[]; after?: string[] };
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

function statusPill(status?: string | null) {
  const v = (status || 'draft').toLowerCase();
  if (v === 'accepted') return { label: 'Disahkan', bg: WT.GREEN_BG, color: WT.GREEN, dot: WT.GREEN };
  if (v === 'rejected') return { label: 'Ditolak', bg: '#FEE2E2', color: '#B91C1C', dot: '#B91C1C' };
  if (v === 'submitted') return { label: 'Menunggu Pengesahan', bg: WT.BLUE_BG, color: WT.BLUE, dot: WT.BLUE };
  return { label: 'Draf', bg: WT.SURFACE, color: WT.MUTED, dot: WT.MUTED };
}

export default function CompletionReportPDF({ report, job, customer, company }: CompletionReportPDFProps) {
  const logo = company.logo_base64 || company.logo_url;
  const before = report.before_photos ?? [];
  const after = (report.after_photos && report.after_photos.length > 0)
    ? report.after_photos
    : (report.photos ?? []);
  const beforeCaps = report.photo_captions?.before ?? [];
  const afterCaps = report.photo_captions?.after ?? [];
  const checklist = report.checklist ?? [];
  const totalPhotos = before.length + after.length;
  const pill = statusPill(report.status);

  // Build paired photo array for 2-col rendering
  type PhotoEntry = { src: string; kind: 'Sebelum' | 'Selepas'; caption?: string };
  const photoList: PhotoEntry[] = [
    ...before.map((src, i) => ({ src, kind: 'Sebelum' as const, caption: beforeCaps[i] })),
    ...after.map((src, i) => ({ src, kind: 'Selepas' as const, caption: afterCaps[i] })),
  ];
  const photoRows: PhotoEntry[][] = [];
  for (let i = 0; i < photoList.length; i += 2) photoRows.push(photoList.slice(i, i + 2));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header bar */}
        <View style={x.hbar}>
          <View style={x.hLeft}>
            {logo ? <Image src={logo} style={x.hLogo} /> : <View style={x.hLogoFallback} />}
            <View>
              <Text style={x.hCompany}>{company.company_name || 'WorkTrace'}</Text>
              <Text style={x.hTag}>LAPORAN SIAP KERJA</Text>
            </View>
          </View>
          <View style={x.hRight}>
            <Text style={x.hTitle}>Completion Report</Text>
            <Text style={x.hNum}>No. {report.report_number}</Text>
          </View>
        </View>

        {/* Status pill */}
        <View style={x.pillRow}>
          <View style={[x.pill, { backgroundColor: pill.bg }]}>
            <View style={[x.pillDot, { backgroundColor: pill.dot }]} />
            <Text style={[x.pillText, { color: pill.color }]}>{pill.label}</Text>
          </View>
        </View>

        {/* Title block */}
        <View style={x.titleBlock}>
          <Text style={x.jobTitle}>{job?.title || 'Laporan Siap Kerja'}</Text>
          <Text style={x.jobSubtitle}>
            {job?.job_number ? `Kerja: ${job.job_number}` : ''}
            {report.project_ref ? `   ·   Ref: ${report.project_ref}` : ''}
          </Text>
        </View>

        {/* Meta strip */}
        <View style={x.metaStrip}>
          <View style={x.metaCell}>
            <Text style={x.metaLabel}>Tarikh Siap</Text>
            <Text style={x.metaValue}>{fmtDate(report.completion_date)}</Text>
          </View>
          <View style={x.metaCell}>
            <Text style={x.metaLabel}>Kategori</Text>
            <Text style={x.metaValue}>{job?.category || '—'}</Text>
          </View>
          <View style={x.metaCell}>
            <Text style={x.metaLabel}>Lokasi</Text>
            <Text style={x.metaValue}>{report.location_label || '—'}</Text>
          </View>
          <View style={x.metaCell}>
            <Text style={x.metaLabel}>Disediakan</Text>
            <Text style={x.metaValue}>{report.technician_name || '—'}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={x.sectionHead}>
          <Text style={x.sectionLabel}>Pelanggan</Text>
          <View style={x.sectionLine} />
        </View>
        <View style={x.card}>
          <Text style={x.custName}>{(customer?.name || '—').toUpperCase()}</Text>
          {customer?.phone ? <Text style={x.custLine}>{customer.phone}</Text> : null}
          {customer?.address ? <Text style={x.custLine}>{customer.address}</Text> : null}
        </View>

        {/* Work description */}
        {report.work_description ? (
          <>
            <View style={x.sectionHead}>
              <Text style={x.sectionLabel}>Kerja Dilaksanakan</Text>
              <View style={x.sectionLine} />
            </View>
            <View style={x.softCard}>
              <Text style={x.cardText}>{report.work_description}</Text>
            </View>
          </>
        ) : null}

        {/* Materials */}
        {report.materials_used ? (
          <>
            <View style={x.sectionHead}>
              <Text style={x.sectionLabel}>Bahan / Alatan</Text>
              <View style={x.sectionLine} />
            </View>
            <View style={x.softCard}>
              <Text style={x.cardText}>{report.materials_used}</Text>
            </View>
          </>
        ) : null}

        {/* Photos */}
        {totalPhotos > 0 ? (
          <>
            <View style={x.sectionHead}>
              <Text style={x.sectionLabel}>Gambar Kerja</Text>
              <Text style={x.sectionCount}>{totalPhotos} gambar</Text>
              <View style={x.sectionLine} />
            </View>
            {photoRows.map((row, ri) => (
              <View key={ri} style={x.photoRow} wrap={false}>
                {row.map((p, ci) => (
                  <View key={ci} style={x.photoCard}>
                    <View>
                      <Image src={p.src} style={x.photoImg} />
                      <View style={x.photoTagWrap}>
                        <Text style={x.photoTagText}>{p.kind}</Text>
                      </View>
                    </View>
                    {(p.caption || report.completion_date) && (
                      <View style={x.photoBody}>
                        {p.caption ? <Text style={x.photoCaption}>{p.caption}</Text> : null}
                        <Text style={x.photoTime}>{fmtDate(report.completion_date)}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Checklist */}
        {checklist.length > 0 ? (
          <>
            <View style={x.sectionHead}>
              <Text style={x.sectionLabel}>Senarai Semak</Text>
              <Text style={x.sectionCount}>{checklist.length} item</Text>
              <View style={x.sectionLine} />
            </View>
            {checklist.map((item, i) => {
              const done = item.done !== false;
              return (
                <View key={i} style={x.checkRow} wrap={false}>
                  <View style={[x.checkDot, done ? x.checkDotDone : x.checkDotPending]}>
                    <Text style={done ? x.checkMark : x.checkBang}>{done ? '✓' : '!'}</Text>
                  </View>
                  <View style={x.checkBody}>
                    <Text style={x.checkTitle}>{item.title}</Text>
                    {item.note ? <Text style={x.checkNote}>{item.note}</Text> : null}
                  </View>
                  {!done ? <Text style={x.checkPending}>Pending</Text> : null}
                </View>
              );
            })}
          </>
        ) : null}

        {/* Notes */}
        {report.notes ? (
          <>
            <View style={x.sectionHead}>
              <Text style={x.sectionLabel}>Catatan / Nota Tapak</Text>
              <View style={x.sectionLine} />
            </View>
            <View style={x.card}>
              <Text style={x.cardText}>{report.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Sign-off */}
        <View style={x.sectionHead} wrap={false}>
          <Text style={x.sectionLabel}>Pengesahan</Text>
          <View style={x.sectionLine} />
        </View>
        <View style={x.signRow} wrap={false}>
          <View style={x.signCard}>
            <Text style={x.signRole}>Disediakan oleh (Juruteknik)</Text>
            <Text style={x.signName}>{report.technician_name || company.company_name || '—'}</Text>
            <Text style={x.signDate}>{fmtDate(report.completion_date)}</Text>
            <View style={x.signLine} />
            <Text style={x.signSub}>{company.company_name || ''}</Text>
          </View>
          <View style={x.signCard}>
            <Text style={x.signRole}>Disahkan oleh (Pelanggan)</Text>
            {report.status === 'accepted' ? (
              <>
                <Text style={x.signName}>{customer?.name || report.customer_signature || 'Pelanggan'}</Text>
                <Text style={x.signDate}>{fmtDate(report.accepted_at || null)}</Text>
                <View style={x.signLine} />
                <Text style={x.signSub}>Disahkan via WhatsApp</Text>
              </>
            ) : (
              <>
                <Text style={x.signNamePending}>
                  {report.customer_signature || 'Menunggu pengesahan'}
                </Text>
                <Text style={x.signDate}>— — —</Text>
                <View style={x.signLine} />
                <Text style={x.signSub}>Belum disahkan</Text>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={x.ftr} fixed>
          <Text style={x.ftrText}>
            <Text style={x.ftrBrand}>WorkTrace</Text> · {report.report_number}
            {company.address ? `  ·  ${company.address}` : ''}
          </Text>
          <Text style={x.ftrText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
