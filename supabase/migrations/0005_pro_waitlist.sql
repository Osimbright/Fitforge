-- FitForge: Pro plan waitlist
-- Run after 0004_testimonials.sql. Safe to re-run.
--
-- Pro isn't sold yet. Visitors (signed in or not) can leave their email from the
-- pricing section. Nobody can read the list through the API: view it in the
-- Supabase dashboard (Table Editor → pro_waitlist).

create table if not exists public.pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254 and email like '%@%'),
  -- Set when the person was signed in; their row is removed if they delete their account.
  user_id uuid references auth.users (id) on delete cascade,
  billing text not null default 'monthly' check (billing in ('monthly', 'yearly')),
  created_at timestamptz not null default now()
);
create unique index if not exists pro_waitlist_email_key on public.pro_waitlist (lower(email));

-- ───────────────────────── RLS ─────────────────────────
alter table public.pro_waitlist enable row level security;

-- Anyone may join, but only as themselves (or anonymously).
drop policy if exists "pro_waitlist: join" on public.pro_waitlist;
create policy "pro_waitlist: join" on public.pro_waitlist
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Signed-in users can see and leave their own entry (and it's in their data export).
drop policy if exists "pro_waitlist: read own" on public.pro_waitlist;
create policy "pro_waitlist: read own" on public.pro_waitlist
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "pro_waitlist: delete own" on public.pro_waitlist;
create policy "pro_waitlist: delete own" on public.pro_waitlist
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────────────────────── API grants ─────────────────────────
grant insert on public.pro_waitlist to anon;
grant select, insert, delete on public.pro_waitlist to authenticated;
