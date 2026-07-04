
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists reward_points integer not null default 0;
alter table public.profiles add column if not exists loyalty_tier text not null default 'bronze';
alter table public.profiles add column if not exists daddy_pass_status text not null default 'none';
alter table public.profiles add column if not exists daddy_pass_renews_at timestamptz;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referral_count integer not null default 0;
alter table public.profiles add column if not exists total_orders integer not null default 0;
alter table public.profiles add column if not exists total_spend_pkr integer not null default 0;
alter table public.profiles add column if not exists favorite_category text;

create unique index if not exists profiles_referral_code_key on public.profiles(referral_code) where referral_code is not null;

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    candidate := 'DZ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    select exists(select 1 from public.profiles where referral_code = candidate) into exists_already;
    if not exists_already then
      return candidate;
    end if;
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone, birthday, marketing_opt_in, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'birthday','')::date,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false),
    public.generate_referral_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;
