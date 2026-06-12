// Workflow lock matrix — single source of truth for "can I create this doc?".
//
// HARD = blocked, must satisfy prereq first
// WARN = allowed with skip-reason modal
// OPEN = no restriction
// NA   = doc not part of this job type's workflow

import type { JobType } from './jobTypes';

export type DocumentType =
  | 'quotation'
  | 'work_order'
  | 'completion_report'
  | 'invoice'
  | 'vo'
  | 'receipt';

export type LockLevel = 'hard' | 'warn' | 'open' | 'na';

export interface WorkflowRule {
  prerequisite: DocumentType;
  lockLevel: LockLevel;
  prerequisiteStatus?: string[];
  errorMessage: string;
  warnMessage: string;
}

type WorkflowMatrix = Record<JobType, Partial<Record<DocumentType, WorkflowRule | null>>>;

export const WORKFLOW_MATRIX: WorkflowMatrix = {
  standard: {
    quotation: null,
    work_order: {
      prerequisite: 'quotation',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted', 'Sent'],
      errorMessage: '',
      warnMessage: 'Quotation has not been sent. Customer does not have written approval.',
    },
    completion_report: {
      prerequisite: 'work_order',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted', 'Sent'],
      errorMessage: '',
      warnMessage: 'Work Order has not been accepted. Customer has no record of work scope agreement.',
    },
    invoice: {
      prerequisite: 'completion_report',
      lockLevel: 'hard',
      prerequisiteStatus: ['submitted', 'Completed', 'accepted'],
      errorMessage: 'Completion Report must be submitted before invoice can be generated. This ensures work has been completed before payment.',
      warnMessage: '',
    },
    vo: null,
    receipt: null,
  },
  deposit: {
    quotation: null,
    work_order: {
      prerequisite: 'quotation',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted'],
      errorMessage: '',
      warnMessage: 'Quotation has not been accepted by customer.',
    },
    completion_report: {
      prerequisite: 'work_order',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted'],
      errorMessage: '',
      warnMessage: 'Work Order belum diterima.',
    },
    invoice: null, // per-stage logic handled in milestone flow
    vo: null,
    receipt: null,
  },
  milestone: {
    quotation: null,
    work_order: {
      prerequisite: 'quotation',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted'],
      errorMessage: '',
      warnMessage: 'Quotation has not been accepted by customer.',
    },
    completion_report: {
      prerequisite: 'work_order',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted'],
      errorMessage: '',
      warnMessage: 'Work Order belum diterima.',
    },
    invoice: null, // final-stage lock handled in milestone flow
    vo: null,
    receipt: null,
  },
  contract: {
    quotation: null,
    work_order: {
      prerequisite: 'quotation',
      lockLevel: 'warn',
      prerequisiteStatus: ['Accepted'],
      errorMessage: '',
      warnMessage: 'Contract Work Order recommended before starting cycle.',
    },
    completion_report: null,
    invoice: null,
    vo: null,
    receipt: null,
  },
  express: {
    quotation: null,
    work_order: null,
    completion_report: null,
    invoice: null,
    vo: null,
    receipt: null,
  },
};

export interface GateInput {
  quotation?: { status?: string | null } | null;
  work_order?: { status?: string | null } | null;
  completion_report?: { status?: string | null } | null;
}

export interface GateResult {
  allowed: boolean;
  lockLevel: LockLevel;
  message: string;
  prerequisite?: DocumentType;
}

export function checkWorkflowGate(
  jobType: JobType,
  targetDoc: DocumentType,
  jobData: GateInput
): GateResult {
  const rule = WORKFLOW_MATRIX[jobType]?.[targetDoc];
  if (!rule) {
    return { allowed: true, lockLevel: 'open', message: '' };
  }

  const prereqDoc = jobData[rule.prerequisite as keyof GateInput];
  const prereqStatus = prereqDoc?.status ?? null;
  const met = !!prereqDoc && (!rule.prerequisiteStatus || rule.prerequisiteStatus.includes(String(prereqStatus)));

  if (met) {
    return { allowed: true, lockLevel: 'open', message: '', prerequisite: rule.prerequisite };
  }

  return {
    allowed: rule.lockLevel !== 'hard',
    lockLevel: rule.lockLevel,
    message: rule.lockLevel === 'hard' ? rule.errorMessage : rule.warnMessage,
    prerequisite: rule.prerequisite,
  };
}

export const SKIP_REASON_OPTIONS: { value: string; labelMs: string }[] = [
  { value: 'small_or_repeat',  labelMs: 'Small job / repeat customer' },
  { value: 'verbal_agreement', labelMs: 'Customer agreed verbally' },
  { value: 'emergency',        labelMs: 'Emergency — document later' },
  { value: 'customer_request', labelMs: 'Customer requested to skip' },
  { value: 'other',            labelMs: 'Other' },
];
