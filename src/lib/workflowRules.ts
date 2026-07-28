// Workflow gating — DEPRECATED.
//
// Customer approval as a blocking mechanism has been removed system-wide.
// Every document can now be created back-to-back as soon as the previous one
// exists (or freely, if the workflow has no prerequisite). checkWorkflowGate()
// is kept for backwards compatibility with call sites, but it always returns
// `allowed: true`. Do not reintroduce approval-based gating here.

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

// Intentionally empty: no gating. Kept for type compatibility with old imports.
export const WORKFLOW_MATRIX: WorkflowMatrix = {
  standard: {},
  deposit: {},
  milestone: {},
  contract: {},
  express: {},
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
  _jobType: JobType,
  _targetDoc: DocumentType,
  _jobData: GateInput,
): GateResult {
  return { allowed: true, lockLevel: 'open', message: '' };
}

export const SKIP_REASON_OPTIONS: { value: string; labelMs: string }[] = [];
