import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as s, fmtRM, fmtDate } from './pdfStyles';
import type { PurchaseData } from '@/pages/purchases/shared';
import { calcTotals } from '@/pages/purchases/shared';

export interface PurchasePDFProps {
  en: boolean;
  docTitle: string;
  number: string;
  date: string;
  reference: string | null;
  referenceLabel: string;
  status: string;
  party: string;
  data: PurchaseData;
  company: {
    company_name: string | null; phone: string | null; address: string | null;
    logo_url: string | null; logo_base64?: string; ssm_number_new?: string | null; ssm_number_old?: string | null;
  };
}

export default function PurchasePDF({ en, docTitle, number, date, reference, referenceLabel, status, party, data, company }: PurchasePDFProps) {
  const L = (e: string, m: string) => (en ? e : m);
  const t = calcTotals(data);
  const logo = company.logo_base64 || company.logo_url;
  const ssm = [company.ssm_number_new, company.ssm_number_old].filter(Boolean).join(' / ');
  const lines = (data.lines || []).filter(l => l.item.trim() || l.price);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeftRow}>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{company.company_name || L('Company', 'Syarikat')}</Text>
              {ssm ? <Text style={s.companyText}>{L('Reg. No.', 'No. Daftar')}: {ssm}</Text> : null}
              {company.address ? <Text style={s.companyText}>{company.address}</Text> : null}
              {company.phone ? <Text style={s.companyText}>Tel: {company.phone}</Text> : null}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{docTitle}</Text>
            <View style={s.metaRow}><Text style={s.metaLabel}>No.</Text><Text style={s.metaValue}>{number}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>{L('Date', 'Tarikh')}</Text><Text style={s.metaValue}>{fmtDate(date)}</Text></View>
            {reference ? <View style={s.metaRow}><Text style={s.metaLabel}>{referenceLabel}</Text><Text style={s.metaValue}>{reference}</Text></View> : null}
            <View style={s.metaRow}><Text style={s.metaLabel}>Status</Text><Text style={s.metaValue}>{status}</Text></View>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>{L('Supplier', 'Pembekal')}</Text>
            <Text style={s.partyName}>{party}</Text>
            {data.billingAttention ? <Text style={s.partyText}>{L('Attn', 'U/P')}: {data.billingAttention}</Text> : null}
            {data.billingAddress ? <Text style={s.partyText}>{data.billingAddress}</Text> : null}
          </View>
          {data.showShipping ? (
            <View style={s.col}>
              <Text style={s.sectionLabel}>{L('Ship To', 'Hantar Ke')}</Text>
              {data.shippingAttention ? <Text style={s.partyName}>{data.shippingAttention}</Text> : null}
              {data.shippingAddress ? <Text style={s.partyText}>{data.shippingAddress}</Text> : null}
              {data.shippingInfo ? <Text style={s.partyText}>{data.shippingInfo}</Text> : null}
            </View>
          ) : <View style={s.col} />}
        </View>

        {data.title ? <Text style={s.subject}>{data.title}</Text> : null}
        {data.description ? <Text style={[s.blockText, { marginBottom: 8 }]}>{data.description}</Text> : null}

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNo]}>#</Text>
          <Text style={[s.tableHeaderText, s.colDesc]}>{L('Item', 'Item')}</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>{L('Qty', 'Kuan.')}</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>{L('Unit Price', 'Harga')}</Text>
          <Text style={[s.tableHeaderText, s.colUnit]}>{L('Discount', 'Diskaun')}</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>{L('Tax %', 'Cukai %')}</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>{L('Amount', 'Jumlah')}</Text>
        </View>
        {lines.map((l, i) => (
          <View key={l.id} style={s.tableRow} wrap={false}>
            <Text style={[s.tableText, s.colNo]}>{i + 1}</Text>
            <View style={s.colDesc}>
              <Text style={s.itemDescMain}>{l.item || '-'}</Text>
              {l.description_detail ? <Text style={s.itemDescDetail}>{l.description_detail}</Text> : null}
              {l.account ? <Text style={s.itemDescDetail}>{l.account}</Text> : null}
            </View>
            <Text style={[s.tableText, s.colQty]}>{l.qty}{l.uom ? ` ${l.uom}` : ''}</Text>
            <Text style={[s.tableText, s.colUnit]}>{fmtRM(l.price)}</Text>
            <Text style={[s.tableText, s.colUnit]}>{l.discount ? fmtRM(l.discount) : '-'}</Text>
            <Text style={[s.tableText, s.colQty]}>{l.tax || 0}</Text>
            <Text style={[s.tableText, s.colAmt]}>{fmtRM(l.qty * l.price - (l.discount || 0))}</Text>
          </View>
        ))}

        <View style={s.summaryWrap}>
          <View style={s.summary}>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>{L('Sub Total', 'Jumlah Kecil')}</Text><Text style={s.summaryValue}>{fmtRM(t.subTotal)}</Text></View>
            {t.discount ? <View style={s.summaryRow}><Text style={s.summaryLabel}>{L('Discount', 'Diskaun')}</Text><Text style={s.summaryValue}>-{fmtRM(t.discount)}</Text></View> : null}
            {t.tax ? <View style={s.summaryRow}><Text style={s.summaryLabel}>{data.taxMode === 'inclusive' ? L('Tax (included)', 'Cukai (termasuk)') : L('Tax', 'Cukai')}</Text><Text style={s.summaryValue}>{fmtRM(t.tax)}</Text></View> : null}
            {data.rounding ? <View style={s.summaryRow}><Text style={s.summaryLabel}>{L('Rounding', 'Pembundaran')}</Text><Text style={s.summaryValue}>{fmtRM(t.rounding)}</Text></View> : null}
            <View style={s.summaryTotalRow}><Text style={s.summaryTotalLabel}>{L('TOTAL', 'JUMLAH')}</Text><Text style={s.summaryTotalValue}>{fmtRM(t.total)}</Text></View>
          </View>
        </View>

        {data.terms?.length ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>{L('Payment Terms', 'Terma Bayaran')}</Text>
            {data.terms.map((tm, i) => (
              <View key={tm.id} style={s.termItem}>
                <Text style={s.termNumber}>{i + 1}.</Text>
                <Text style={s.termContent}>{tm.term} — {L('due', 'tamat')} {fmtDate(tm.dueOn)} — {fmtRM(tm.amount)}{tm.description ? ` (${tm.description})` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.remarks ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>{L('Remarks', 'Catatan')}</Text>
            <Text style={s.blockText}>{data.remarks}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company.company_name || ''} · {number}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
