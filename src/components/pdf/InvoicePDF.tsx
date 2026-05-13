import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate } from './pdfStyles';
import i18n from '@/i18n';

interface PaymentMethod {
  id: string;
  type: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  provider?: string;
  qr_image_url?: string;
  is_primary?: boolean;
}

export interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    created_at: string;
    issued_date: string | null;
    due_date: string | null;
    paid_date: string | null;
    status: string;
    items: Array<{ description: string; description_detail?: string; qty: number; uom?: string; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
    notes: string | null;
    terms?: string | null;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null; tin_number?: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    logo_base64?: string;
    lhdn_enabled?: boolean;
    tin_number?: string | null;
    msic_code?: string | null;
    sst_registered?: boolean;
    ssm_number_new?: string | null;
    ssm_number_old?: string | null;
  };
  paymentMethods?: PaymentMethod[];
}

export default function InvoicePDF({ invoice, job, customer, company, paymentMethods }: InvoicePDFProps) {
  const t = (k: string, o?: any) => i18n.t(k, o) as string;
  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;
  const termsText = invoice.terms || t('pdf.invoice.defaultTerms');
  const termsLines = termsText.split('\n').filter(l => l.trim());
  const banks = paymentMethods?.filter(m => m.type === 'bank_transfer') || [];
  const qrs = paymentMethods?.filter(m => m.type === 'qr_payment') || [];
  const logo = company.logo_base64 || company.logo_url;
  const ssm = [company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ');
  const isPaid = invoice.status === 'Paid' && invoice.paid_date;
  const balance = invoice.total - (isPaid ? invoice.total : 0);

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
              {company.tin_number && <Text style={s.companyText}>{t('pdf.common.tin')}: {company.tin_number}</Text>}
              {company.address && <Text style={s.companyText}>{company.address}</Text>}
              {company.phone && <Text style={s.companyText}>{t('pdf.common.contact')}: {company.phone}</Text>}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{t('pdf.invoice.title')}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.no')}</Text>
              <Text style={s.metaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{t('pdf.common.date')}</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.issued_date || invoice.created_at)}</Text>
            </View>
            {invoice.due_date && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{t('pdf.invoice.dueDate')}</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.due_date)}</Text>
              </View>
            )}
            {isPaid && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{t('pdf.invoice.paidDate')}</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.paid_date)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Bill To / Job */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>{t('pdf.invoice.billTo')}</Text>
            <Text style={s.partyName}>{(customer?.name || '-').toUpperCase()}</Text>
            {customer?.address && <Text style={s.partyText}>{customer.address}</Text>}
            {customer?.tin_number && (
              <View style={s.partyMetaRow}>
                <Text style={s.partyMetaLabel}>{t('pdf.common.tinNo')}</Text>
                <Text style={s.partyMetaValue}>{customer.tin_number}</Text>
              </View>
            )}
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

        {job?.title && <Text style={s.subject}>{job.title.toUpperCase()}</Text>}

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNo]}>{t('pdf.common.no')}</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>{t('pdf.common.description')}</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>{t('pdf.common.qty')}</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>{t('pdf.common.uPrice')}</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>{t('pdf.common.amt')}</Text>
        </View>
        {invoice.items.map((item, i) => (
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
              <Text style={s.summaryLabel}>{t('pdf.common.subtotal')}</Text>
              <Text style={s.summaryValue}>{fmtRM(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{t('pdf.common.discount')}</Text>
                <Text style={s.summaryValue}>-{fmtRM(invoice.discount)}</Text>
              </View>
            )}
            {invoice.tax_rate > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>{t('pdf.common.sst')} ({invoice.tax_rate}%)</Text>
                <Text style={s.summaryValue}>{fmtRM(sstAmount)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>{t('pdf.common.total')}</Text>
              <Text style={s.summaryTotalValue}>{fmtRM(invoice.total)}</Text>
            </View>
            {isPaid && (
              <>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{t('pdf.common.paymentReceived')}</Text>
                  <Text style={s.summaryValue}>-{fmtRM(invoice.total)}</Text>
                </View>
                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLabel}>{t('pdf.common.balance')}</Text>
                  <Text style={s.summaryTotalValue}>{fmtRM(balance)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Methods */}
        {(banks.length > 0 || qrs.length > 0) && (
          <View style={s.block}>
            <Text style={s.blockLabel}>{t('pdf.invoice.paymentMethods')}</Text>
            {banks.map((b, i) => (
              <View key={i} style={s.paymentBox} wrap={false}>
                <Text style={s.paymentTitle}>{t('pdf.invoice.bankTransfer')}</Text>
                {b.bank_name && (
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>{t('pdf.invoice.bank')}</Text>
                    <Text style={s.paymentValue}>{b.bank_name}</Text>
                  </View>
                )}
                {b.account_name && (
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>{t('pdf.invoice.accountName')}</Text>
                    <Text style={s.paymentValue}>{b.account_name}</Text>
                  </View>
                )}
                {b.account_number && (
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>{t('pdf.invoice.accountNo')}</Text>
                    <Text style={s.paymentValue}>{b.account_number}</Text>
                  </View>
                )}
              </View>
            ))}
            {qrs.map((q, i) => (
              <View key={i} style={s.paymentBox} wrap={false}>
                <Text style={s.paymentTitle}>{q.provider || t('pdf.invoice.qrPayment')}</Text>
                {q.qr_image_url && <Image src={q.qr_image_url} style={s.qrImage} />}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={s.block}>
            <Text style={s.blockLabel}>{t('pdf.common.remarks')}</Text>
            <Text style={s.blockText}>{invoice.notes}</Text>
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
