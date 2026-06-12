import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate, COLORS } from './pdfStyles';

export interface VariationOrderPDFProps {
  vo: {
    vo_number: string;
    type: 'addition' | 'deduction';
    reason: string | null;
    items: Array<{ description: string; description_detail?: string; qty: number; uom?: string; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
    deductions?: Array<{ id?: string; name: string; type: 'fixed' | 'percentage'; value: number }>;
    notes: string | null;
    created_at: string;
  };
  job: { job_number: string; title: string } | null;
  quotation: { quote_number: string; total: number } | null;
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
  reasonBox: { backgroundColor: COLORS.HEADER_BG, padding: 8, borderRadius: 2, marginTop: 4 },
  reasonText: { fontSize: 9, color: COLORS.TEXT, lineHeight: 1.4 },
  typeBadge: { fontSize: 10, fontWeight: 'bold', padding: 4, marginTop: 4 },
  redText: { color: '#B91C1C' },
  greenText: { color: '#15803D' },
  signRow: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  signBox: { width: '45%', borderTopWidth: 0.5, borderTopColor: COLORS.BORDER, paddingTop: 4 },
  signLabel: { fontSize: 8, color: COLORS.MUTED },
  signLine: { fontSize: 9, marginTop: 14, color: COLORS.BLACK },
});

export default function VariationOrderPDF({ vo, job, quotation, customer, company }: VariationOrderPDFProps) {
  const isDeduction = vo.type === 'deduction';
  const sign = isDeduction ? -1 : 1;
  const deductions = Array.isArray(vo.deductions) ? vo.deductions : [];
  const deductionsTotal = deductions.reduce((s2, d) => s2 + (d.type === 'percentage' ? (vo.subtotal * (Number(d.value) || 0) / 100) : (Number(d.value) || 0)), 0);
  const afterDiscount = vo.subtotal - vo.discount - deductionsTotal;
  const sstAmount = vo.tax_rate > 0 ? afterDiscount * (vo.tax_rate / 100) : 0;
  const logo = company.logo_base64 || company.logo_url;
  const ssm = [company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ');
  const docTitle = isDeduction ? 'BORANG POTONGAN' : 'VARIATION ORDER';
  const finalAmount = quotation ? Number(quotation.total) + sign * Number(vo.total) : sign * Number(vo.total);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeftRow}>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{company.company_name || 'Company'}</Text>
              {ssm ? <Text style={s.companyText}>Reg. No: {ssm}</Text> : null}
              {company.address ? <Text style={s.companyText}>{company.address}</Text> : null}
              {company.phone ? <Text style={s.companyText}>Tel: {company.phone}</Text> : null}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{docTitle}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>No.</Text>
              <Text style={s.metaValue}>{vo.vo_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{fmtDate(vo.created_at)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Type</Text>
              <Text style={[s.metaValue, isDeduction ? extra.redText : extra.greenText]}>
                {isDeduction ? 'Deduction' : 'Addition'}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Job Reference</Text>
            {job ? <Text style={s.partyName}>{job.job_number}</Text> : null}
            {job ? <Text style={s.partyText}>{job.title}</Text> : null}
            {quotation ? (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>Original Quotation</Text>
                <Text style={s.partyMetaValue}>{quotation.quote_number}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Pelanggan</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.phone ? <Text style={s.partyText}>{customer.phone}</Text> : null}
            {customer?.address ? <Text style={s.partyText}>{customer.address}</Text> : null}
          </View>
        </View>

        {vo.reason ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionLabel}>Sebab / Alasan</Text>
            <View style={extra.reasonBox}>
              <Text style={extra.reasonText}>{vo.reason}</Text>
            </View>
          </View>
        ) : null}

        <View style={[s.tableHeader, { marginTop: 12 }]}>
          <Text style={[s.tableHeaderText, s.colNo]}>No</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>Price</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Amount</Text>
        </View>
        {vo.items.map((item, i) => {
          const detailLines = (item.description_detail || '').split('\n').map(l => l.trim()).filter(Boolean);
          const amt = Number(item.amount) || 0;
          return (
            <View key={i} style={s.tableRow} wrap={false}>
              <Text style={[s.tableText, s.colNo]}>{i + 1}</Text>
              <View style={s.itemDescWrap}>
                <Text style={s.itemDescMain}>{item.description}</Text>
                {detailLines.map((line, j) => (
                  <Text key={j} style={s.itemDescDetail}>— {line}</Text>
                ))}
              </View>
              <View style={s.itemQtyWrap}>
                <Text style={s.itemQtyNum}>{item.qty}</Text>
                {item.uom && <Text style={s.itemQtyUom}>{item.uom}</Text>}
              </View>
              <Text style={[s.tableText, s.colUnit]}>{(Number(item.unit_price) || 0).toFixed(2)}</Text>
              <Text style={[s.itemAmt, isDeduction ? extra.redText : null]}>
                {isDeduction ? '-' : ''}{amt.toFixed(2)}
              </Text>
            </View>
          );
        })}

        <View style={s.summaryWrap}>
          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{fmtRM(vo.subtotal)}</Text>
            </View>
            {vo.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount</Text>
                <Text style={s.summaryValue}>-{fmtRM(vo.discount)}</Text>
              </View>
            )}
            {deductions.map((d, i) => {
              const amt = d.type === 'percentage' ? (vo.subtotal * (Number(d.value) || 0) / 100) : (Number(d.value) || 0);
              return (
                <View key={i} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{d.name || 'Deduction'}{d.type === 'percentage' ? ` (${d.value}%)` : ''}</Text>
                  <Text style={s.summaryValue}>-{fmtRM(amt)}</Text>
                </View>
              );
            })}
            {vo.tax_rate > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>SST ({vo.tax_rate}%)</Text>
                <Text style={s.summaryValue}>{fmtRM(sstAmount)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>{isDeduction ? 'Deduction' : 'Addition'}</Text>
              <Text style={[s.summaryTotalValue, isDeduction ? extra.redText : extra.greenText]}>
                {isDeduction ? '-' : '+'}{fmtRM(vo.total)}
              </Text>
            </View>
          </View>
        </View>

        {quotation && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sectionLabel}>Impact on Quotation</Text>
            <View style={extra.reasonBox}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Original Amount</Text>
                <Text style={s.summaryValue}>{fmtRM(quotation.total)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{isDeduction ? 'Deduction' : 'VO Addition'}</Text>
                <Text style={[s.summaryValue, isDeduction ? extra.redText : extra.greenText]}>
                  {isDeduction ? '-' : '+'}{fmtRM(vo.total)}
                </Text>
              </View>
              <View style={s.summaryTotalRow}>
                <Text style={s.summaryTotalLabel}>Final Amount</Text>
                <Text style={s.summaryTotalValue}>{fmtRM(finalAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        {vo.notes ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Notes</Text>
            <Text style={s.blockText}>{vo.notes}</Text>
          </View>
        ) : null}

        <View style={extra.signRow}>
          <View style={extra.signBox}>
            <Text style={extra.signLabel}>Company Signature</Text>
            <Text style={extra.signLine}>Nama: ____________________</Text>
            <Text style={extra.signLine}>Date: ___________________</Text>
          </View>
          <View style={extra.signBox}>
            <Text style={extra.signLabel}>Customer Signature</Text>
            <Text style={extra.signLine}>Nama: ____________________</Text>
            <Text style={extra.signLine}>Date: ___________________</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company.company_name || ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Muka ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
