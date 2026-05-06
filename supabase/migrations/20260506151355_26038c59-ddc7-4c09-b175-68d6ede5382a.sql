
-- 1. Ensure team plan exists
INSERT INTO public.plans (slug, name) VALUES ('team', 'Team')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed feature catalog (idempotent on slug)
INSERT INTO public.features (slug, name, kind) VALUES
  ('whatsapp_share', 'WhatsApp Share', 'boolean'),
  ('whatsapp_template_quotation', 'WA Template: Quotation', 'boolean'),
  ('whatsapp_template_invoice', 'WA Template: Invoice', 'boolean'),
  ('whatsapp_template_receipt', 'WA Template: Receipt', 'boolean'),
  ('whatsapp_template_work_order', 'WA Template: Work Order', 'boolean'),
  ('company_logo_pdf', 'Logo on PDF', 'boolean'),
  ('custom_doc_numbering', 'Custom Doc Numbering', 'boolean'),
  ('work_order_module', 'Work Order Module', 'boolean'),
  ('completion_report', 'Completion Report', 'boolean'),
  ('lhdn_einvoice', 'LHDN e-Invoice', 'boolean'),
  ('push_notifications', 'Push Notifications', 'boolean'),
  ('customer_approval_links', 'Customer Approval Links', 'boolean'),
  ('payment_proof', 'Payment Proof Collection', 'boolean'),
  ('support_priority', 'Priority Support', 'boolean'),
  ('max_jobs_per_month', 'Max Jobs / Month', 'limit'),
  ('max_customers_per_month', 'Max Customers / Month', 'limit')
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed defaults for plan_feature_flags (skip if already configured)
-- Helper: defaults table
WITH defaults(plan_slug, feature_slug, is_unlocked, limit_value) AS (
  VALUES
    -- Free
    ('free','whatsapp_share', true,  NULL::int),
    ('free','whatsapp_template_quotation', true, NULL),
    ('free','whatsapp_template_invoice', true, NULL),
    ('free','whatsapp_template_receipt', true, NULL),
    ('free','whatsapp_template_work_order', false, NULL),
    ('free','company_logo_pdf', false, NULL),
    ('free','custom_doc_numbering', false, NULL),
    ('free','work_order_module', false, NULL),
    ('free','completion_report', true, NULL),
    ('free','lhdn_einvoice', false, NULL),
    ('free','push_notifications', true, NULL),
    ('free','customer_approval_links', true, NULL),
    ('free','payment_proof', true, NULL),
    ('free','support_priority', false, NULL),
    ('free','max_jobs_per_month', true, 5),
    ('free','max_customers_per_month', true, 3),
    -- Pro
    ('pro','whatsapp_share', true, NULL),
    ('pro','whatsapp_template_quotation', true, NULL),
    ('pro','whatsapp_template_invoice', true, NULL),
    ('pro','whatsapp_template_receipt', true, NULL),
    ('pro','whatsapp_template_work_order', false, NULL),
    ('pro','company_logo_pdf', true, NULL),
    ('pro','custom_doc_numbering', true, NULL),
    ('pro','work_order_module', false, NULL),
    ('pro','completion_report', true, NULL),
    ('pro','lhdn_einvoice', true, NULL),
    ('pro','push_notifications', true, NULL),
    ('pro','customer_approval_links', true, NULL),
    ('pro','payment_proof', true, NULL),
    ('pro','support_priority', false, NULL),
    ('pro','max_jobs_per_month', true, NULL),
    ('pro','max_customers_per_month', true, NULL),
    -- Team
    ('team','whatsapp_share', true, NULL),
    ('team','whatsapp_template_quotation', true, NULL),
    ('team','whatsapp_template_invoice', true, NULL),
    ('team','whatsapp_template_receipt', true, NULL),
    ('team','whatsapp_template_work_order', true, NULL),
    ('team','company_logo_pdf', true, NULL),
    ('team','custom_doc_numbering', true, NULL),
    ('team','work_order_module', true, NULL),
    ('team','completion_report', true, NULL),
    ('team','lhdn_einvoice', true, NULL),
    ('team','push_notifications', true, NULL),
    ('team','customer_approval_links', true, NULL),
    ('team','payment_proof', true, NULL),
    ('team','support_priority', true, NULL),
    ('team','max_jobs_per_month', true, NULL),
    ('team','max_customers_per_month', true, NULL)
)
INSERT INTO public.plan_feature_flags (plan_id, feature_id, is_unlocked, limit_value)
SELECT p.id, f.id, d.is_unlocked, d.limit_value
FROM defaults d
JOIN public.plans p ON p.slug = d.plan_slug
JOIN public.features f ON f.slug = d.feature_slug
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- 4. Admin RPC: list matrix
CREATE OR REPLACE FUNCTION public.admin_list_plan_matrix()
RETURNS TABLE(
  plan_slug text, plan_name text,
  feature_slug text, feature_name text, feature_kind text,
  is_unlocked boolean, limit_value integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.slug, p.name, f.slug, f.name, f.kind,
         COALESCE(pff.is_unlocked, false), pff.limit_value
  FROM public.plans p
  CROSS JOIN public.features f
  LEFT JOIN public.plan_feature_flags pff
    ON pff.plan_id = p.id AND pff.feature_id = f.id
  WHERE public.is_admin()
  ORDER BY p.slug, f.name;
$$;

-- 5. Admin RPC: upsert one plan/feature
CREATE OR REPLACE FUNCTION public.admin_upsert_plan_feature(
  p_plan_slug text, p_feature_slug text,
  p_is_unlocked boolean, p_limit_value integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_plan uuid; v_feature uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT id INTO v_plan FROM public.plans WHERE slug = p_plan_slug;
  SELECT id INTO v_feature FROM public.features WHERE slug = p_feature_slug;
  IF v_plan IS NULL OR v_feature IS NULL THEN RAISE EXCEPTION 'Unknown plan or feature'; END IF;

  INSERT INTO public.plan_feature_flags (plan_id, feature_id, is_unlocked, limit_value)
  VALUES (v_plan, v_feature, COALESCE(p_is_unlocked, false), p_limit_value)
  ON CONFLICT (plan_id, feature_id) DO UPDATE
    SET is_unlocked = EXCLUDED.is_unlocked,
        limit_value = EXCLUDED.limit_value;
END;
$$;

-- 6. Admin RPC: patch a pricing_plans row
CREATE OR REPLACE FUNCTION public.admin_upsert_pricing_plan(
  p_plan_key text, p_patch jsonb
)
RETURNS public.pricing_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.pricing_plans%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.pricing_plans SET
    name                = COALESCE(p_patch->>'name', name),
    tagline             = COALESCE(p_patch->>'tagline', tagline),
    monthly_price       = COALESCE((p_patch->>'monthly_price')::numeric, monthly_price),
    yearly_price        = COALESCE((p_patch->>'yearly_price')::numeric, yearly_price),
    yearly_discount_pct = COALESCE((p_patch->>'yearly_discount_pct')::numeric, yearly_discount_pct),
    currency            = COALESCE(p_patch->>'currency', currency),
    max_jobs            = CASE WHEN p_patch ? 'max_jobs' THEN NULLIF(p_patch->>'max_jobs','')::int ELSE max_jobs END,
    max_customers       = CASE WHEN p_patch ? 'max_customers' THEN NULLIF(p_patch->>'max_customers','')::int ELSE max_customers END,
    features            = COALESCE(p_patch->'features', features),
    is_active           = COALESCE((p_patch->>'is_active')::boolean, is_active),
    is_featured         = COALESCE((p_patch->>'is_featured')::boolean, is_featured),
    badge_text          = CASE WHEN p_patch ? 'badge_text' THEN p_patch->>'badge_text' ELSE badge_text END,
    badge_color         = COALESCE(p_patch->>'badge_color', badge_color),
    sort_order          = COALESCE((p_patch->>'sort_order')::int, sort_order),
    updated_by          = auth.uid(),
    updated_at          = now()
  WHERE plan_key = p_plan_key
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'Plan % not found', p_plan_key; END IF;
  RETURN v_row;
END;
$$;
