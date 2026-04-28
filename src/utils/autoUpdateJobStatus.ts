import type { SupabaseClient } from '@supabase/supabase-js';

type Trigger =
  | 'quotation_created'
  | 'quotation_sent'
  | 'quotation_accepted'
  | 'quotation_rejected'
  | 'work_order_accepted'
  | 'work_order_rejected'
  | 'report_submitted'
  | 'invoice_created';

export const autoUpdateJobStatus = async (
  supabase: SupabaseClient,
  jobId: string,
  userId: string,
  trigger: Trigger,
  extraFields?: Record<string, any>
): Promise<string | null> => {
  const { data: job } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (!job) return null;

  let newStatus: string | null = null;

  switch (trigger) {
    case 'quotation_created':
      if (job.status === 'Lead') newStatus = 'Scheduled';
      break;
    case 'quotation_sent':
      if (['Lead', 'Scheduled'].includes(job.status)) newStatus = 'Scheduled';
      break;
    case 'quotation_accepted':
      // With Work Order skipped (Team-only), move directly to In Progress
      if (['Lead', 'Scheduled'].includes(job.status)) newStatus = 'In Progress';
      break;
    case 'quotation_rejected':
      // No auto change
      break;
    case 'work_order_accepted':
      newStatus = 'In Progress';
      break;
    case 'work_order_rejected':
      if (job.status === 'In Progress') newStatus = 'Scheduled';
      break;
    case 'report_submitted':
      newStatus = 'Completed';
      break;
    case 'invoice_created':
      break;
  }

  if (newStatus && newStatus !== job.status) {
    await supabase
      .from('jobs')
      .update({ status: newStatus, ...(extraFields || {}) })
      .eq('id', jobId)
      .eq('user_id', userId);

    return newStatus;
  }

  return null;
};
