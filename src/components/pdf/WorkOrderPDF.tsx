import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate, COLORS } from './pdfStyles';
import i18n from '@/i18n';

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
});

export default function WorkOrderPDF({ wo, job, quotation, customer, company }: WorkOrderPDFProps) {
  const t = (k: string, o?: any) => i18n.t(k, o) as string;
  const termsText = wo.terms || t('pdf.workOrder.defaultTerms');
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
              <Text style={s.companyName}>{company.company_name || t('pdf.common.company')}</Text>
              {ssm ? <Text style={s.companyText}>{t('pdf.common.regNo')}: {ssm}</Text> : null}
              {company.address ? <Text style={s.companyText}>{company.address}</Text> : null}
              {company.phone ? <Text style={s.companyText}>{t('pdf.common.contact')}: {company.phone}</Text> : null}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{t('pdf.workOrder.title')}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.no')}</Text>
              <Text style={s.metaValue}>{wo.wo_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.date')}</Text>
              <Text style={s.metaValue}>{fmtDate(wo.created_at)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.status')}</Text>
              <Text style={s.metaValue}>{wo.status}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Job + Customer */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>{t('pdf.workOrder.jobDetails')}</Text>
            {job ? <Text style={s.partyName}>{job.job_number}</Text> : null}
            <Text style={s.partyText}>{wo.title}</Text>
            {quotation ? (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>{t('pdf.workOrder.quotation')}</Text>
                <Text style={s.partyMetaValue}>{quotation.quote_number}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>{t('pdf.workOrder.customerInfo')}</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.phone ? <Text style={s.partyText}>{customer.phone}</Text> : null}
            {customer?.email ? <Text style={s.partyText}>{customer.email}</Text> : null}
            {customer?.address ? <Text style={s.partyText}>{customer.address}</Text> : null}
          </View>
        </View>

        {/* Schedule */}
        <Text style={s.sectionLabel}>{t('pdf.workOrder.schedule')}</Text>
        <View style={extra.scheduleBox}>
          <View style={extra.scheduleCell}>
            <Text style={extra.scheduleLabel}>{t('pdf.workOrder.startDate')}</Text>
            <Text style={extra.scheduleValue}>{fmtDate(wo.scheduled_start_date)}</Text>
          </View>
          <View style={extra.scheduleCell}>
            <Text style={extra.scheduleLabel}>{t('pdf.workOrder.endDate')}</Text>
            <Text style={extra.scheduleValue}>{fmtDate(wo.scheduled_end_date)}</Text>
          </View>
          {wo.estimated_duration ? (
            <View style={extra.scheduleCell}>
              <Text style={extra.scheduleLabel}>{t('pdf.workOrder.duration')}</Text>
              <Text style={extra.scheduleValue}>{wo.estimated_duration}</Text>
            </View>
          ) : null}
          {wo.technician_name ? (
            <View style={extra.scheduleCell}>
              <Text style={extra.scheduleLabel}>{t('pdf.workOrder.technician')}</Text>
              <Text style={extra.scheduleValue}>{wo.technician_name}</Text>
            </View>
          ) : null}
          {wo.location ? (
            <View style={{ width: '100%', marginTop: 4 }}>
              <Text style={extra.scheduleLabel}>{t('pdf.workOrder.location')}</Text>
              <Text style={extra.scheduleValue}>{wo.location}</Text>
            </View>
          ) : null}
        </View>

        {/* Scope */}
        <View style={{ marginTop: 12 }}>
          <Text style={s.sectionLabel}>{t('pdf.workOrder.scope')}</Text>
          <View style={extra.greyBox}>
            <Text style={extra.greyText}>{wo.scope_of_work}</Text>
          </View>
        </View>

        {/* Items table */}
        {wo.items && wo.items.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colNo]}>{t('pdf.common.no')}</Text>
              <Text style={[s.tableHeaderText, s.colDesc]}>{t('pdf.common.description')}</Text>
              <Text style={[s.tableHeaderText, s.colQty]}>{t('pdf.common.qty')}</Text>
              <Text style={[s.tableHeaderText, s.colUnit]}>{t('pdf.common.uPrice')}</Text>
              <Text style={[s.tableHeaderText, s.colAmt]}>{t('pdf.common.amt')}</Text>
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
                  <Text style={s.summaryTotalLabel}>{t('pdf.common.total')}</Text>
                  <Text style={s.summaryTotalValue}>{fmtRM(wo.total)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Special instructions */}
        {wo.special_instructions ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionLabel}>{t('pdf.workOrder.specialInstructions')}</Text>
            <View style={extra.greyBox}>
              <Text style={extra.greyText}>{wo.special_instructions}</Text>
            </View>
          </View>
        ) : null}

        {/* Terms */}
        <View style={s.block}>
          <Text style={s.blockLabel}>{t('pdf.workOrder.termsTitle')}</Text>
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


        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{t('pdf.common.generatedBy')}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${t('pdf.common.page')} ${pageNumber} ${t('pdf.common.of')} ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
