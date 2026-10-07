ALTER FUNCTION public.set_lead_stages_updated_at() SET search_path = public;
ALTER FUNCTION public.update_blog_updated_at() SET search_path = public;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef LOOP
    IF r.proname IN ('generate_referral_code','handle_new_user','notify_customer_approval','notify_payment_proof','notify_ticket_reply','populate_profile_email','sync_referral_row_on_profile','rls_auto_enable',
                     'cleanup_deleted_user_email','complete_referral_reward','complete_referral_reward_old','next_subscription_receipt_number','expire_subscriptions','increment_free_months','increment_free_months_by','increment_referral_count','create_notification') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    ELSIF r.proname IN ('generate_ticket_number','set_onboarding_plan','admin_list_plan_matrix','admin_upsert_plan_feature','admin_upsert_pricing_plan','publish_announcement','generate_approval_token') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;