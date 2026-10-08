-- FitForge: user testimonials
-- Run after 0003_full_persistence.sql. Safe to re-run.
--
-- Each user can write one review from Settings. It's saved as 'pending' and only
-- appears on the landing page after you set status = 'approved' (Supabase dashboard
-- → Table Editor → testimonials). Editing a review sends it back to 'pending'.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  context text check (char_length(context) <= 60),
  result text check (char_length(result) <= 60),
  quote text not null check (char_length(quote) between 20 and 600),
  rating int not null check (rating between 1 and 5),
  -- The user agreed to have this shown publicly under display_name.
  consent boolean not null check (consent),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_approved_idx on public.testimonials (approved_at desc) where status = 'approved';

-- ───────────────────────── RLS ─────────────────────────
-- Users manage only their own review and can never mark it approved themselves.
alter table public.testimonials enable row level security;

drop policy if exists "testimonials: read own" on public.testimonials;
create policy "testimonials: read own" on public.testimonials
  for select using (user_id = (select auth.uid()));

drop policy if exists "testimonials: insert own pending" on public.testimonials;
create policy "testimonials: insert own pending" on public.testimonials
  for insert with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "testimonials: update own pending" on public.testimonials;
create policy "testimonials: update own pending" on public.testimonials
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "testimonials: delete own" on public.testimonials;
create policy "testimonials: delete own" on public.testimonials
  for delete using (user_id = (select auth.uid()));

-- ───────────────────────── timestamps ─────────────────────────
-- approved_at is set when a review becomes approved and cleared when it leaves that state.
create or replace function public.testimonials_set_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from 'approved' or new.approved_at is null then
      new.approved_at = now();
    end if;
  else
    new.approved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists testimonials_set_timestamps on public.testimonials;
create trigger testimonials_set_timestamps
  before insert or update on public.testimonials
  for each row execute function public.testimonials_set_timestamps();

-- ───────────────────────── public read ─────────────────────────
-- The landing page reads approved reviews through this function, so visitors only
-- ever see the display fields and never a reviewer's user_id.
create or replace function public.public_testimonials(max_rows int default 12)
returns table (
  id uuid,
  display_name text,
  context text,
  result text,
  quote text,
  rating int,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.display_name, t.context, t.result, t.quote, t.rating, t.approved_at
  from public.testimonials t
  where t.status = 'approved' and t.consent
  order by t.approved_at desc
  limit least(greatest(max_rows, 1), 50);
$$;

-- ───────────────────────── API grants ─────────────────────────
grant select, insert, update, delete on public.testimonials to authenticated;
revoke execute on function public.public_testimonials(int) from public;
grant execute on function public.public_testimonials(int) to anon, authenticated;
