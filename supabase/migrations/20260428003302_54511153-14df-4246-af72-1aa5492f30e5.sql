CREATE OR REPLACE FUNCTION public.complete_referral_reward(p_referred_id uuid, p_billing_period text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_referral_id uuid;
  v_referrer_id uuid;
  v_referrer_code text;
  v_months integer;
  v_already_rewarded boolean;
begin
  v_months := case lower(coalesce(p_billing_period,''))
                when 'yearly' then 2
                when 'year' then 2
                when 'monthly' then 1
                when 'month' then 1
                else 0
              end;

  if v_months = 0 then
    return;
  end if;

  -- Short-circuit: if this referred user has ALREADY produced a rewarded referral, do nothing.
  select exists(
    select 1 from public.referrals
    where referred_id = p_referred_id
      and status = 'rewarded'
  ) into v_already_rewarded;

  if v_already_rewarded then
    return;
  end if;

  select referred_by into v_referrer_code
  from public.profiles
  where id = p_referred_id;

  if v_referrer_code is null then
    return;
  end if;

  select id into v_referrer_id
  from public.profiles
  where referral_code = v_referrer_code
  limit 1;

  if v_referrer_id is null then
    return;
  end if;

  insert into public.referrals (referrer_id, referred_id, referral_code, status, created_at, months_awarded)
  values (v_referrer_id, p_referred_id, v_referrer_code, 'pending', now(), 0)
  on conflict (referrer_id, referred_id) do nothing;

  -- Atomically flip the row from pending -> rewarded; only proceed if we actually changed it.
  update public.referrals
  set status = 'rewarded',
      completed_at = now(),
      rewarded_at = now(),
      months_awarded = v_months
  where referred_id = p_referred_id
    and status = 'pending'
  returning id into v_referral_id;

  if v_referral_id is not null then
    perform public.increment_free_months_by(v_referrer_id, v_months);
    perform public.increment_referral_count(v_referrer_id);
  end if;
end;
$function$;