import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate } from './pdfStyles';

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

const DEFAULT_TERMS = `1. Sebut harga ini sah selama 30 hari dari tarikh dikeluarkan.
2. Harga adalah tertakluk kepada perubahan tanpa notis.
3. Pembayaran deposit diperlukan sebelum kerja dimulakan.`;

export default function QuotationPDF({ quotation, job, customer, company }: QuotationPDFProps) {
  const afterDiscount = quotation.subtotal - quotation.discount;
  const sstAmount = quotation.tax_rate > 0 ? afterDiscount * (quotation.tax_rate / 100) : 0;
  const termsText = quotation.terms || DEFAULT_TERMS;
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
              {ssm && <Text style={s.companyText}>Reg No: {ssm}</Text>}
              {company.address && <Text style={s.companyText}>{company.address}</Text>}
              {company.phone && <Text style={s.companyText}>Contact: {company.phone}</Text>}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>QUOTATION</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>No.</Text>
              <Text style={s.metaValue}>{quotation.quote_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{fmtDate(quotation.created_at)}</Text>
            </View>
            {quotation.valid_until && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Valid Until</Text>
                <Text style={s.metaValue}>{fmtDate(quotation.valid_until)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Quote To / Job */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Quote To</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.address && <Text style={s.partyText}>{customer.address}</Text>}
            {customer?.phone && (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>Phone No.</Text>
                <Text style={s.partyMetaValue}>{customer.phone}</Text>
              </View>
            )}
            {customer?.email && (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>Email</Text>
                <Text style={s.partyMetaValue}>{customer.email}</Text>
              </View>
            )}
          </View>
          {job && (
            <View style={s.col}>
              <Text style={s.sectionLabel}>Reference Job</Text>
              <Text style={s.partyName}>{job.job_number}</Text>
              <Text style={s.partyText}>{job.title}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNo]}>No.</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>U/Price</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Amt</Text>
        </View>
        {quotation.items.map((item, i) => (
          <View key={i} style={s.tableRow} wrap={false}>
            <Text style={[s.tableText, s.colNo]}>{i + 1}</Text>
            <Text style={[s.tableText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tableText, s.colQty]}>{item.qty}</Text>
            <Text style={[s.tableText, s.colUnit]}>{(item.unit_price || 0).toFixed(2)}</Text>
            <Text style={[s.tableText, s.colAmt]}>{(item.amount || 0).toFixed(2)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summaryWrap}>
          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{fmtRM(quotation.subtotal)}</Text>
            </View>
            {quotation.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount</Text>
                <Text style={s.summaryValue}>-{fmtRM(quotation.discount)}</Text>
              </View>
            )}
            {quotation.tax_rate > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>SST ({quotation.tax_rate}%)</Text>
                <Text style={s.summaryValue}>{fmtRM(sstAmount)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>Total</Text>
              <Text style={s.summaryTotalValue}>{fmtRM(quotation.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={s.block}>
            <Text style={s.blockLabel}>Notes</Text>
            <Text style={s.blockText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Terms */}
        <View style={s.block}>
          <Text style={s.blockLabel}>Terms and Conditions</Text>
          {termsLines.map((line, i) => {
            const match = line.match(/^\s*(\d+)[\.\)]\s*(.*)$/);
            if (match) {
              return (
                <View key={i} style={s.termItem}>
                  <Text style={s.termNumber}>{match[1]}.</Text>
                  <Text style={s.termContent}>{match[2]}</Text>
                </View>
              );
            }
            return <Text key={i} style={s.blockText}>{line}</Text>;
          })}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company.company_name || ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
