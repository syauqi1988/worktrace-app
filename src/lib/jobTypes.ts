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
    taglineMs: 'Full standard workflow',
    taglineEn: 'Full standard workflow',
    steps: [
      { key: 'quotation', labelMs: 'Quotation', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'completion_report', labelMs: 'Completion Report', labelEn: 'Completion Report' },
      { key: 'invoice', labelMs: 'Invoice', labelEn: 'Invoice' },
      { key: 'payment', labelMs: 'Payment', labelEn: 'Payment' },
      { key: 'receipt', labelMs: 'Receipt', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'deposit',
    icon: '💰',
    color: 'amber',
    nameMs: 'Deposit Job',
    nameEn: 'Deposit Job',
    taglineMs: 'Deposit before work begins',
    taglineEn: 'Deposit before work begins',
    steps: [
      { key: 'quotation', labelMs: 'Quotation', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'invoice_deposit', labelMs: 'Deposit Invoice', labelEn: 'Deposit Invoice' },
      { key: 'payment_deposit', labelMs: 'Deposit Payment', labelEn: 'Deposit Payment' },
      { key: 'completion_report', labelMs: 'Completion Report', labelEn: 'Completion Report' },
      { key: 'invoice_balance', labelMs: 'Balance Invoice', labelEn: 'Balance Invoice' },
      { key: 'payment_balance', labelMs: 'Balance Payment', labelEn: 'Balance Payment' },
      { key: 'receipt', labelMs: 'Receipt', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'milestone',
    icon: '🏗️',
    color: 'purple',
    nameMs: 'Milestone Job',
    nameEn: 'Milestone Job',
    taglineMs: 'Pay by milestone',
    taglineEn: 'Pay by milestone',
    steps: [
      { key: 'quotation', labelMs: 'Quotation', labelEn: 'Quotation' },
      { key: 'work_order', labelMs: 'Work Order', labelEn: 'Work Order' },
      { key: 'milestone_cycle', labelMs: 'Milestone → Pay', labelEn: 'Milestone → Pay', repeats: true },
      { key: 'completion_report', labelMs: 'Completion Report', labelEn: 'Completion Report' },
      { key: 'invoice_final', labelMs: 'Final Invoice', labelEn: 'Final Invoice' },
      { key: 'payment_final', labelMs: 'Final Payment', labelEn: 'Final Payment' },
      { key: 'receipt_final', labelMs: 'Receipt', labelEn: 'Receipt' },
    ],
  },
  {
    id: 'contract',
    icon: '🔁',
    color: 'teal',
    nameMs: 'Contract Job',
    nameEn: 'Contract Job',
    taglineMs: 'Recurring monthly billing',
    taglineEn: 'Recurring monthly billing',
    steps: [
      { key: 'work_order_contract', labelMs: 'Work Order (Contract)', labelEn: 'Contract Work Order' },
      { key: 'contract_cycle', labelMs: 'Invoice → Pay', labelEn: 'Invoice → Pay', repeats: true },
    ],
  },
  {
    id: 'express',
    icon: '⚡',
    color: 'green',
    nameMs: 'Express Job',
    nameEn: 'Express Job',
    taglineMs: 'Straight to invoice',
    taglineEn: 'Straight to invoice',
    steps: [
      { key: 'invoice', labelMs: 'Invoice', labelEn: 'Invoice' },
      { key: 'payment', labelMs: 'Payment', labelEn: 'Payment' },
      { key: 'receipt', labelMs: 'Receipt', labelEn: 'Receipt' },
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
