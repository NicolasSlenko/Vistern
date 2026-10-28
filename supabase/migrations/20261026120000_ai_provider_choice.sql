-- Per-user AI provider choice, plus a daily counter for requests on paid providers.

-- null means "use the server default" (AI_PROVIDER in .env).
alter table public.user_settings
  add column ai_provider text check (ai_provider in ('hipergator', 'openai', 'claude'));

alter table public.daily_usage drop constraint daily_usage_feature_check;
alter table public.daily_usage add constraint daily_usage_feature_check
  check (feature in ('analyzeMatch', 'tailorResume', 'paidAi'));

-- Same body as the original, with 'paidAi' accepted. create or replace keeps the existing grants.
create or replace function public.consume_daily_usage(p_feature text, p_daily_limit integer)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clerk_user_id text := (select auth.jwt() ->> 'sub');
  v_count integer;
begin
  if v_clerk_user_id is null then
    raise exception 'A signed-in Clerk user is required' using errcode = '42501';
  end if;
  if p_feature not in ('analyzeMatch', 'tailorResume', 'paidAi') or p_daily_limit < 1 then
    raise exception 'Invalid feature or daily limit' using errcode = '22023';
  end if;

  insert into public.daily_usage (clerk_user_id, usage_date, feature, count)
  values (v_clerk_user_id, (now() at time zone 'utc')::date, p_feature, 1)
  on conflict (clerk_user_id, usage_date, feature)
  do update set count = public.daily_usage.count + 1, updated_at = now()
  where public.daily_usage.count < p_daily_limit
  returning public.daily_usage.count into v_count;

  if v_count is null then
    select du.count into v_count
    from public.daily_usage as du
    where du.clerk_user_id = v_clerk_user_id
      and du.usage_date = (now() at time zone 'utc')::date
      and du.feature = p_feature;
    return query select false, v_count, greatest(p_daily_limit - v_count, 0);
  else
    return query select true, v_count, greatest(p_daily_limit - v_count, 0);
  end if;
end;
$$;
