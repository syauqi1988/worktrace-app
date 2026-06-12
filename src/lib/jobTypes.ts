// Job type definitions — drives selector, workflow bar, and lock rules.

export type JobType = 'standard' | 'deposit' | 'milestone' | 'contract' | 'express';

export interface JobTypeDef {
  id: JobType;
  icon: string;              // emoji
  color: string;             // tailwind color base (blue|amber|purple|teal|green)
  nameMs: string;
  nameEn: string;
  taglineMs: string;
  taglineEn: string;
  // Workflow steps shown on the job detail bar (ordered)
  steps: WorkflowStep[];
}

export type WorkflowStepKey =
  | 'quotation'
  | 'work_order'
  | 'invoice_deposit'
  | 'payment_deposit'
  | 'receipt_deposit'
  | 'completion_report'
  | 'invoice_balance'
  | 'payment_balance'
  | 'invoice'
  | 'payment'
  | 'receipt'
  | 'milestone_cycle'        // virtual repeating block
  | 'contract_cycle'         // virtual repeating block
  | 'work_order_contract'
  | 'invoice_final'
  | 'payment_final'
  | 'receipt_final';

export interface WorkflowStep {
  key: WorkflowStepKey;
  labelMs: string;
  labelEn: string;
  repeats?: boolean;         // shown as repeating block on UI
}

export const JOB_TYPES: JobTypeDef[] = [
  {
    id: 'standard',
    icon: '🔧',
    color: 'blue',
    nameMs: 'Standard Job',
    nameEn: 'Standard Job',
    taglineMs: 'Ikut workflow penuh',
    taglineEn: 'Full standard workflow',
    steps: [
      { key: 'quotation', labelMs: 'Sebut Harga', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'completion_report', labelMs: 'Laporan Siap', labelEn: 'Completion Report' },
      { key: 'invoice', labelMs: 'Invois', labelEn: 'Invoice' },
      { key: 'payment', labelMs: 'Bayaran', labelEn: 'Payment' },
      { key: 'receipt', labelMs: 'Resit', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'deposit',
    icon: '💰',
    color: 'amber',
    nameMs: 'Kerja Deposit',
    nameEn: 'Deposit Job',
    taglineMs: 'Deposit sebelum kerja',
    taglineEn: 'Deposit before work begins',
    steps: [
      { key: 'quotation', labelMs: 'Sebut Harga', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'invoice_deposit', labelMs: 'Invois Deposit', labelEn: 'Deposit Invoice' },
      { key: 'payment_deposit', labelMs: 'Bayar Deposit', labelEn: 'Deposit Payment' },
      { key: 'completion_report', labelMs: 'Laporan Siap', labelEn: 'Completion Report' },
      { key: 'invoice_balance', labelMs: 'Invois Baki', labelEn: 'Balance Invoice' },
      { key: 'payment_balance', labelMs: 'Bayar Baki', labelEn: 'Balance Payment' },
      { key: 'receipt', labelMs: 'Resit', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'milestone',
    icon: '🏗️',
    color: 'purple',
    nameMs: 'Kerja Berperingkat',
    nameEn: 'Milestone Job',
    taglineMs: 'Bayar ikut milestone',
    taglineEn: 'Pay by milestone',
    steps: [
      { key: 'quotation', labelMs: 'Sebut Harga', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'milestone_cycle', labelMs: 'Milestone → Bayar', labelEn: 'Milestone → Pay', repeats: true },
      { key: 'completion_report', labelMs: 'Laporan Siap', labelEn: 'Completion Report' },
      { key: 'invoice_final', labelMs: 'Invois Akhir', labelEn: 'Final Invoice' },
      { key: 'payment_final', labelMs: 'Bayar Akhir', labelEn: 'Final Payment' },
      { key: 'receipt_final', labelMs: 'Resit', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'contract',
    icon: '🔁',
    color: 'teal',
    nameMs: 'Kerja Kontrak',
    nameEn: 'Contract Job',
    taglineMs: 'Bayaran bulanan berulang',
    taglineEn: 'Recurring monthly billing',
    steps: [
      { key: 'work_order_contract', labelMs: 'Work Order (Kontrak)', labelEn: 'Contract Work Order' },
      { key: 'contract_cycle', labelMs: 'Invois → Bayar', labelEn: 'Invoice → Pay', repeats: true },
    ],
  },
  {
    id: 'express',
    icon: '⚡',
    color: 'green',
    nameMs: 'Kerja Kecil / Express',
    nameEn: 'Express Job',
    taglineMs: 'Terus invois tanpa dokumen',
    taglineEn: 'Straight to invoice',
    steps: [
      { key: 'invoice', labelMs: 'Invois', labelEn: 'Invoice' },
      { key: 'payment', labelMs: 'Bayaran', labelEn: 'Payment' },
      { key: 'receipt', labelMs: 'Resit', labelEn: 'Receipt' },
    ],
  },
];

export const getJobType = (id?: string | null): JobTypeDef => {
  return JOB_TYPES.find((t) => t.id === id) ?? JOB_TYPES[0];
};

// Tailwind classes per color (avoid dynamic class strings)
export const JOB_TYPE_COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-500' },
  amber:  { border: 'border-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-500' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-500' },
  teal:   { border: 'border-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-500' },
  green:  { border: 'border-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-500' },
};
