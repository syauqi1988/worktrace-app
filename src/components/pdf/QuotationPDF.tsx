import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate } from './pdfStyles';
import i18n from '@/i18n';

export interface QuotationPDFProps {
  quotation: {
    quote_number: string;
    created_at: string;
    valid_until: string | null;
    status: string;
    items: Array<{ description: string; description_detail?: string; qty: number; uom?: string; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
    notes: string | null;
    terms?: string | null;
    deductions?: Array<{ id?: string; name: string; type: 'fixed' | 'percentage'; value: number }> | null;
    payment_details?: {
      bank_name?: string;
      account_number?: string;
      account_holder?: string;
      payment_types?: string[];
      note?: string;
    } | null;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  company: { company_name: string | null; phone: string | null; address: string | null; logo_url: string | null; logo_base64?: string; ssm_number_new?: string | null; ssm_number_old?: string | null };
}

export default function QuotationPDF({ quotation, job, customer, company }: QuotationPDFProps) {
  const t = (k: string, o?: any) => i18n.t(k, o) as string;
  const afterDiscount = quotation.subtotal - quotation.discount;
  const sstAmount = quotation.tax_rate > 0 ? afterDiscount * (quotation.tax_rate / 100) : 0;
  // Strip both legacy HTML-comment markers and new invisible zero-width markers
  // so the auto-injected payment terms block renders cleanly in the PDF.
  const rawTerms = quotation.terms || t('pdf.quotation.defaultTerms');
  const termsText = rawTerms
    .replace(/<!--\s*SYARAT_BAYARAN_AUTO_(START|END)\s*-->/g, '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  const termsLines = termsText.split('\n').map(l => l.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trimEnd()).filter(l => l.trim());
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
              {ssm && <Text style={s.companyText}>{t('pdf.common.regNo')}: {ssm}</Text>}
              {company.address && <Text style={s.companyText}>{company.address}</Text>}
              {company.phone && <Text style={s.companyText}>{t('pdf.common.contact')}: {company.phone}</Text>}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{t('pdf.quotation.title')}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.no')}</Text>
              <Text style={s.metaValue}>{quotation.quote_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.date')}</Text>
              <Text style={s.metaValue}>{fmtDate(quotation.created_at)}</Text>
            </View>
            {quotation.valid_until && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{t('pdf.quotation.validUntil')}</Text>
                <Text style={s.metaValue}>{fmtDate(quotation.valid_until)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Quote To / Job */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>{t('pdf.quotation.quoteTo')}</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.address && <Text style={s.partyText}>{customer.address}</Text>}
            {customer?.phone && (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>{t('pdf.common.phoneNo')}</Text>
                <Text style={s.partyMetaValue}>{customer.phone}</Text>
              </View>
            )}
            {customer?.email && (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>{t('pdf.common.email')}</Text>
                <Text style={s.partyMetaValue}>{customer.email}</Text>
              </View>
            )}
          </View>
          {job && (
            <View style={s.col}>
              <Text style={s.sectionLabel}>{t('pdf.common.referenceJob')}</Text>
              <Text style={s.partyName}>{job.job_number}</Text>
              <Text style={s.partyText}>{job.title}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNo]}>{t('pdf.common.no')}</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>{t('pdf.common.description')}</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>{t('pdf.common.qty')}</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>{t('pdf.common.uPrice')}</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>{t('pdf.common.amt')}</Text>
        </View>
        {quotation.items.map((item, i) => {
          const detailLines = (item.description_detail || '').split('\n').map(l => l.trim()).filter(Boolean);
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
              <View style={s.itemPriceWrap}>
                <Text style={s.itemPriceNum}>{(item.unit_price || 0).toFixed(2)}</Text>
                {item.uom && <Text style={s.itemPricePer}>/{item.uom}</Text>}
              </View>
              <Text style={s.itemAmt}>{(item.amount || 0).toFixed(2)}</Text>
            </View>
          );
        })}

        {/* Summary */}
        <View style={s.summaryWrap}>
          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{t('pdf.common.subtotal')}</Text>
              <Text style={s.summaryValue}>{fmtRM(quotation.subtotal)}</Text>
            </View>
            {quotation.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{t('pdf.common.discount')}</Text>
                <Text style={s.summaryValue}>-{fmtRM(quotation.discount)}</Text>
              </View>
            )}
            {Array.isArray(quotation.deductions) && quotation.deductions.map((d, i) => {
              const amt = d.type === 'percentage' ? (quotation.subtotal * (Number(d.value) || 0)) / 100 : (Number(d.value) || 0);
              if (amt <= 0 && !d.name) return null;
              return (
                <View key={i} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{d.name || 'Potongan'}{d.type === 'percentage' ? ` (${d.value}%)` : ''}</Text>
                  <Text style={s.summaryValue}>-{fmtRM(amt)}</Text>
                </View>
              );
            })}
            {quotation.tax_rate > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{t('pdf.common.sst')} ({quotation.tax_rate}%)</Text>
                <Text style={s.summaryValue}>{fmtRM(sstAmount)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>{t('pdf.common.total')}</Text>
              <Text style={s.summaryTotalValue}>{fmtRM(quotation.total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        {quotation.payment_details && (
          (quotation.payment_details.bank_name ||
           quotation.payment_details.account_number ||
           quotation.payment_details.account_holder ||
           (quotation.payment_details.payment_types && quotation.payment_details.payment_types.length > 0) ||
           quotation.payment_details.note) && (
            <View style={s.block}>
              <Text style={s.blockLabel}>Maklumat Pembayaran</Text>
              {quotation.payment_details.bank_name && (
                <Text style={s.blockText}>Bank: {quotation.payment_details.bank_name}</Text>
              )}
              {quotation.payment_details.account_number && (
                <Text style={s.blockText}>No. Akaun: {quotation.payment_details.account_number}</Text>
              )}
              {quotation.payment_details.account_holder && (
                <Text style={s.blockText}>Nama: {quotation.payment_details.account_holder}</Text>
              )}
              {quotation.payment_details.payment_types && quotation.payment_details.payment_types.length > 0 && (
                <Text style={s.blockText}>Jenis: {quotation.payment_details.payment_types.join(' / ')}</Text>
              )}
              {quotation.payment_details.note && (
                <Text style={s.blockText}>Nota: {quotation.payment_details.note}</Text>
              )}
            </View>
          )
        )}

        {/* Notes */}
        {quotation.notes && (
          <View style={s.block}>
            <Text style={s.blockLabel}>{t('pdf.common.notes')}</Text>
            <Text style={s.blockText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Terms */}
        <View style={s.block}>
          <Text style={s.blockLabel}>{t('pdf.common.termsTitle')}</Text>
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
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${t('pdf.common.page')} ${pageNumber} ${t('pdf.common.of')} ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
