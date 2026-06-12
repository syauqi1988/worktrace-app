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
  { value: 'on_wo_accepted',      labelMs: 'Before work starts (WO accepted)', labelEn: 'Before work starts (WO accepted)' },
  { value: 'after_deposit_paid',  labelMs: 'After deposit received',            labelEn: 'After deposit received' },
  { value: 'mid_progress',        labelMs: 'Mid-progress',                       labelEn: 'Mid-progress' },
  { value: 'half_done',           labelMs: 'Work 50% done',                              labelEn: 'Work 50% done' },
  { value: 'on_completion_report',labelMs: 'Completion report submitted',                        labelEn: 'Completion report submitted' },
  { value: 'on_handover',         labelMs: 'Handover to customer',           labelEn: 'Handover to customer' },
  { value: 'days_from_invoice',   labelMs: 'X days from invoice date',             labelEn: 'X days from invoice date' },
  { value: 'specific_date',       labelMs: 'Specific date',                              labelEn: 'Specific date' },
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
  ...buildEvenSplitTemplates([6, 7, 8, 9, 10]),
];

function buildEvenSplitTemplates(counts: number[]): MilestoneTemplate[] {
  return counts.map((n) => {
    const base = Math.floor((100 / n) * 100) / 100; // 2dp
    const stages = Array.from({ length: n }, (_, i) => {
      const isFirst = i === 0;
      const isLast = i === n - 1;
      const pct = isLast ? Math.round((100 - base * (n - 1)) * 100) / 100 : base;
      const trigger: MilestoneTrigger = isFirst ? 'on_wo_accepted' : isLast ? 'on_completion_report' : 'mid_progress';
      return {
        labelMs: isFirst ? 'Deposit' : isLast ? 'Bayaran Akhir' : `Peringkat ${i}`,
        labelEn: isFirst ? 'Deposit' : isLast ? 'Final Payment' : `Stage ${i}`,
        percentage: pct,
        trigger,
      };
    });
    return { key: `${n}x`, label: `${n} Peringkat`, stages };
  });
}

export const getTemplate = (key?: string | null) =>
  MILESTONE_TEMPLATES.find((t) => t.key === key) ?? MILESTONE_TEMPLATES[0];
