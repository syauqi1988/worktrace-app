import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate } from './pdfStyles';

export interface ReceiptPDFProps {
  receipt: {
    receipt_number: string;
    payment_date: string | null;
    amount_paid: number;
  };
  invoice: {
    invoice_number: string;
    issued_date: string | null;
    items: Array<{ description: string; qty: number; unit_price: number; amount: number }>;
    subtotal: number;
    discount: number;
    tax_rate: number;
    total: number;
  };
  job: { job_number: string; title: string } | null;
  customer: { name: string; phone: string | null; email: string | null; address: string | null } | null;
  company: {
    company_name: string | null;
    phone: string | null;
    address: string | null;
    logo_url?: string | null;
    logo_base64?: string;
    ssm_number_new?: string | null;
    ssm_number_old?: string | null;
  };
  paymentMethod?: string;
}

export default function ReceiptPDF({ receipt, invoice, job, customer, company, paymentMethod }: ReceiptPDFProps) {
  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;
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
            <Text style={s.docTitle}>RECEIPT</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>No.</Text>
              <Text style={s.metaValue}>{receipt.receipt_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Payment Date</Text>
              <Text style={s.metaValue}>{fmtDate(receipt.payment_date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice No.</Text>
              <Text style={s.metaValue}>{invoice.invoice_number}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Received From / Job */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Received From</Text>
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
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{fmtRM(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount</Text>
                <Text style={s.summaryValue}>-{fmtRM(invoice.discount)}</Text>
              </View>
            )}
            {invoice.tax_rate > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>SST ({invoice.tax_rate}%)</Text>
                <Text style={s.summaryValue}>{fmtRM(sstAmount)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>Total</Text>
              <Text style={s.summaryTotalValue}>{fmtRM(invoice.total)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Payment Received</Text>
              <Text style={s.summaryValue}>-{fmtRM(receipt.amount_paid)}</Text>
            </View>
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>Balance</Text>
              <Text style={s.summaryTotalValue}>{fmtRM(invoice.total - receipt.amount_paid)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        {paymentMethod && (
          <View style={s.block}>
            <Text style={s.blockLabel}>Payment Method</Text>
            <Text style={s.blockText}>{paymentMethod}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company.company_name || ''}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
