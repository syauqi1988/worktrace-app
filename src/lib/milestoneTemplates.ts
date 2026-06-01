// Milestone templates used by the MilestoneBuilder component.

export type MilestoneTrigger =
  | 'on_wo_accepted'
  | 'after_deposit_paid'
  | 'mid_progress'
  | 'half_done'
  | 'on_completion_report'
  | 'on_handover'
  | 'days_from_invoice'
  | 'specific_date';

export const TRIGGER_OPTIONS: { value: MilestoneTrigger; labelMs: string; labelEn: string }[] = [
  { value: 'on_wo_accepted',      labelMs: 'Sebelum kerja bermula (Work Order diterima)', labelEn: 'Before work starts (WO accepted)' },
  { value: 'after_deposit_paid',  labelMs: 'Selepas bayaran deposit diterima',            labelEn: 'After deposit received' },
  { value: 'mid_progress',        labelMs: 'Semasa kerja berjalan',                       labelEn: 'Mid-progress' },
  { value: 'half_done',           labelMs: 'Kerja 50% siap',                              labelEn: 'Work 50% done' },
  { value: 'on_completion_report',labelMs: 'Laporan Siap dihantar',                        labelEn: 'Completion report submitted' },
  { value: 'on_handover',         labelMs: 'Penyerahan kerja kepada pelanggan',           labelEn: 'Handover to customer' },
  { value: 'days_from_invoice',   labelMs: 'Dalam X hari dari tarikh invois',             labelEn: 'X days from invoice date' },
  { value: 'specific_date',       labelMs: 'Tarikh tertentu',                              labelEn: 'Specific date' },
];

export interface MilestoneTemplate {
  key: string;
  label: string;
  stages: {
    labelMs: string;
    labelEn: string;
    percentage: number;
    trigger: MilestoneTrigger;
  }[];
}

export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    key: '30/40/30',
    label: '30/40/30',
    stages: [
      { labelMs: 'Deposit',           labelEn: 'Deposit',        percentage: 30, trigger: 'on_wo_accepted' },
      { labelMs: 'Bayaran Pertengahan', labelEn: 'Mid-payment',  percentage: 40, trigger: 'mid_progress' },
      { labelMs: 'Bayaran Akhir',     labelEn: 'Final Payment',  percentage: 30, trigger: 'on_completion_report' },
    ],
  },
  {
    key: '50/50',
    label: '50/50',
    stages: [
      { labelMs: 'Deposit',       labelEn: 'Deposit',       percentage: 50, trigger: 'on_wo_accepted' },
      { labelMs: 'Bayaran Akhir', labelEn: 'Final Payment', percentage: 50, trigger: 'on_completion_report' },
    ],
  },
  {
    key: '20/30/30/20',
    label: '20/30/30/20',
    stages: [
      { labelMs: 'Deposit',       labelEn: 'Deposit',       percentage: 20, trigger: 'on_wo_accepted' },
      { labelMs: 'Peringkat 1',   labelEn: 'Stage 1',       percentage: 30, trigger: 'mid_progress' },
      { labelMs: 'Peringkat 2',   labelEn: 'Stage 2',       percentage: 30, trigger: 'mid_progress' },
      { labelMs: 'Bayaran Akhir', labelEn: 'Final Payment', percentage: 20, trigger: 'on_completion_report' },
    ],
  },
  {
    key: '25/25/25/25',
    label: '25/25/25/25',
    stages: [
      { labelMs: 'Bayaran 1', labelEn: 'Payment 1', percentage: 25, trigger: 'on_wo_accepted' },
      { labelMs: 'Bayaran 2', labelEn: 'Payment 2', percentage: 25, trigger: 'mid_progress' },
      { labelMs: 'Bayaran 3', labelEn: 'Payment 3', percentage: 25, trigger: 'mid_progress' },
      { labelMs: 'Bayaran 4', labelEn: 'Payment 4', percentage: 25, trigger: 'on_completion_report' },
    ],
  },
  {
    key: '30/70',
    label: '30/70',
    stages: [
      { labelMs: 'Deposit',       labelEn: 'Deposit',       percentage: 30, trigger: 'on_wo_accepted' },
      { labelMs: 'Bayaran Akhir', labelEn: 'Final Payment', percentage: 70, trigger: 'on_completion_report' },
    ],
  },
];

export const getTemplate = (key?: string | null) =>
  MILESTONE_TEMPLATES.find((t) => t.key === key) ?? MILESTONE_TEMPLATES[0];
