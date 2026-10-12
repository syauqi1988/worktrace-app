import { pdf } from '@react-pdf/renderer';
import i18n from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import PurchasePDF from '@/components/pdf/PurchasePDF';
import { embedPdfCompanyLogo } from '@/utils/imageToBase64';
import { MS_DICT } from '@/i18n/dual';
import { PURCHASE_CONFIG, PurchaseData, PurchaseType } from './shared';

export type PurchaseRecord = {
  doc_type: PurchaseType; doc_number: string; party: string; reference: string | null;
  doc_date: string; status: string; data: PurchaseData;
};

export async function buildPurchasePdfBlob(rec: PurchaseRecord, profile: any) {
  const en = !!i18n.language?.startsWith('en');
  const cfg = PURCHASE_CONFIG[rec.doc_type];
  const tr = (s: string) => (en ? s : (MS_DICT as any)[s] || s);
  const props = await embedPdfCompanyLogo({
    en,
    docTitle: en ? cfg.pdfTitle[0] : cfg.pdfTitle[1],
    number: rec.doc_number, date: rec.doc_date, reference: rec.reference,
    referenceLabel: tr(cfg.referenceLabel), status: tr(rec.status), party: rec.party, data: rec.data,
    company: {
      company_name: profile?.company_name || null, phone: profile?.phone || null, address: profile?.address || null,
      logo_url: profile?.logo_url || null, ssm_number_new: profile?.ssm_number_new || null, ssm_number_old: profile?.ssm_number_old || null,
    },
  } as any);
  return pdf(<PurchasePDF {...(props as any)} />).toBlob();
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadPurchasePdf(id: string, profile: any) {
  const { data, error } = await (supabase as any).from('purchase_documents').select('*').eq('id', id).single();
  if (error || !data) throw error || new Error('not found');
  const blob = await buildPurchasePdfBlob(data as PurchaseRecord, profile);
  saveBlob(blob, `${data.doc_number}.pdf`);
}
