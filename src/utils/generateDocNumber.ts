import type { SupabaseClient } from '@supabase/supabase-js';

export interface DocNumberSettings {
  prefix: string;
  padding: number;
  next_number: number;
  separator: string;
  suffix: string;
}

export type DocType =
  | 'quotation'
  | 'work_order'
  | 'invoice'
  | 'completion_report'
  | 'receipt'
  | 'vo';

export const DEFAULT_DOC_SETTINGS: Record<DocType, DocNumberSettings> = {
  quotation:         { prefix: 'QUO', padding: 4, next_number: 1, separator: '-', suffix: '' },
  work_order:        { prefix: 'WO',  padding: 4, next_number: 1, separator: '-', suffix: '' },
  invoice:           { prefix: 'INV', padding: 4, next_number: 1, separator: '-', suffix: '' },
  completion_report: { prefix: 'RPT', padding: 4, next_number: 1, separator: '-', suffix: '' },
  receipt:           { prefix: 'RCP', padding: 4, next_number: 1, separator: '-', suffix: '' },
  vo:                { prefix: 'VO',  padding: 4, next_number: 1, separator: '-', suffix: '' },
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: 'Quotation',
  work_order: 'Work Order',
  invoice: 'Invoice',
  completion_report: 'Completion Report',
  receipt: 'Payment Receipt',
  vo: 'VO / Deduction',
};

export const generateDocNumber = (settings: DocNumberSettings): string => {
  const padding = Math.max(1, Math.min(8, Number(settings.padding) || 4));
  const paddedNum = String(settings.next_number).padStart(padding, '0');
  const sep = settings.separator || '';
  let result = sep
    ? `${settings.prefix}${sep}${paddedNum}`
    : `${settings.prefix}${paddedNum}`;
  if (settings.suffix) result += settings.suffix;
  return result;
};

export const previewDocNumber = (
  prefix: string,
  padding: number,
  separator: string,
  suffix: string,
  startNumber = 1,
): string =>
  generateDocNumber({
    prefix: prefix || 'DOC',
    padding: padding || 4,
    next_number: startNumber || 1,
    separator,
    suffix: suffix || '',
  });

export const generateAndIncrement = async (
  supabase: SupabaseClient,
  userId: string,
  docType: DocType,
): Promise<string> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('doc_number_settings')
    .eq('id', userId)
    .single();

  const settings = (profile as any)?.doc_number_settings ?? {};
  const docSettings: DocNumberSettings = {
    ...DEFAULT_DOC_SETTINGS[docType],
    ...(settings?.[docType] ?? {}),
  };

  const docNumber = generateDocNumber(docSettings);

  const updatedSettings = {
    ...settings,
    [docType]: {
      ...docSettings,
      next_number: (Number(docSettings.next_number) || 0) + 1,
    },
  };

  await supabase
    .from('profiles')
    .update({ doc_number_settings: updatedSettings } as any)
    .eq('id', userId);

  return docNumber;
};
