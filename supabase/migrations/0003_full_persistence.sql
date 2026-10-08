-- FitForge: store everything users create
-- Run after 0001_init.sql and 0002_progress_photos.sql. Safe to re-run.
--
-- Adds tables for AI results that were previously thrown away (weekly reviews,
-- meal estimates, swap requests), saves the user's timezone, enforces one weigh-in
-- per day, keeps updated_at current, and grants the API roles access to the tables.

-- ───────────────────────── weekly AI reviews ─────────────────────────
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  score int not null check (score between 1 and 10),
  headline text not null,
  wins text[] not null default '{}',
  improvements text[] not null default '{}',
  adjustments text[] not null default '{}',
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists weekly_reviews_user_idx on public.weekly_reviews (user_id, created_at desc);

-- ───────────────────────── AI generation log ─────────────────────────
-- One-off AI results whose input would otherwise be lost: meal estimates (what the
-- user typed + the AI's breakdown) and exercise/meal swaps (what was replaced and why).
-- Plans, chat and reviews have their own tables.
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('meal_estimate', 'exercise_swap', 'meal_swap')),
  input jsonb not null default '{}',
  output jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_generations_user_idx on public.ai_generations (user_id, kind, created_at desc);

-- ───────────────────────── RLS for the new tables ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['weekly_reviews', 'ai_generations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: own rows" on public.%1$I', t);
    execute format(
      'create policy "%1$s: own rows" on public.%1$I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- ───────────────────────── profiles: timezone ─────────────────────────
-- IANA name (e.g. "Africa/Lagos") synced from the browser, so "today" is the user's day.
alter table public.profiles add column if not exists timezone text;

-- ───────────────────────── body metrics: one entry per day ─────────────────────────
-- Keep the latest entry for any day that has duplicates, then enforce uniqueness so
-- the app can upsert. (Photos were copied to progress_photos in 0002.)
delete from public.body_metrics a
using public.body_metrics b
where a.user_id = b.user_id
  and a.log_date = b.log_date
  and (a.created_at, a.id) < (b.created_at, b.id);

create unique index if not exists body_metrics_user_date_key on public.body_metrics (user_id, log_date);
drop index if exists public.body_metrics_user_date_idx; -- covered by the unique index

-- ───────────────────────── updated_at maintenance ─────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists chat_conversations_set_updated_at on public.chat_conversations;
create trigger chat_conversations_set_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- ───────────────────────── API grants ─────────────────────────
-- Newer Supabase projects don't expose public tables to the Data API by default.
-- RLS still decides which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select on public.exercises to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.workout_plans,
  public.workout_sessions,
  public.session_sets,
  public.diet_plans,
  public.meal_logs,
  public.water_logs,
  public.body_metrics,
  public.progress_photos,
  public.chat_conversations,
  public.chat_messages,
  public.weekly_reviews,
  public.ai_generations
to authenticated;
-- Quota counters are read-only for users; consume_ai_quota() writes them.
grant select on public.ai_usage to authenticated;

-- ───────────────────────── storage: enforce photo limits server-side ─────────────────────────
update storage.buckets
set file_size_limit = 6 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'progress-photos';
