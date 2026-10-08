-- FitForge initial schema
-- Run in the Supabase SQL editor (or `supabase db push`). Every user table has RLS
-- so a user can only ever read or write their own rows.

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  gender text check (gender in ('male', 'female', 'other')),
  dob date,
  height_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  target_weight_kg numeric(5, 1),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  training_months int,
  goal text check (goal in ('lose_fat', 'build_muscle', 'get_stronger', 'stay_fit', 'endurance')),
  days_per_week int check (days_per_week between 2 and 7),
  session_minutes int,
  training_location text check (training_location in ('home', 'gym', 'both')),
  equipment text[] not null default '{}',
  diet_type text,
  allergies text[] not null default '{}',
  cuisine text,
  meals_per_day int,
  injuries text,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  bmr int,
  tdee int,
  calorie_target int,
  protein_g int,
  carbs_g int,
  fat_g int,
  water_ml int,
  onboarding_step int not null default 0,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── exercise library (public, seeded) ─────────────────────────
create table if not exists public.exercises (
  id text primary key,
  name text not null,
  force text,
  level text not null,
  mechanic text,
  equipment text,
  category text not null,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions text[] not null default '{}',
  images text[] not null default '{}'
);
create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_level_idx on public.exercises (level);

alter table public.exercises enable row level security;
create policy "exercises: readable by everyone" on public.exercises for select using (true);

-- ───────────────────────── workout plans & sessions ─────────────────────────
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  location text not null check (location in ('home', 'gym')),
  plan jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists workout_plans_user_idx on public.workout_plans (user_id, is_active);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  day_index int,
  title text not null,
  type text not null default 'planned' check (type in ('planned', 'custom')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_min int,
  calories_est int,
  total_volume_kg numeric(10, 1),
  notes text
);
create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, started_at desc);

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text references public.exercises (id),
  exercise_name text not null,
  set_no int not null,
  reps int,
  weight_kg numeric(6, 2),
  duration_sec int,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists session_sets_session_idx on public.session_sets (session_id);
create index if not exists session_sets_user_ex_idx on public.session_sets (user_id, exercise_id, created_at desc);

-- ───────────────────────── diet ─────────────────────────
create table if not exists public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan jsonb not null,
  calorie_target int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists diet_plans_user_idx on public.diet_plans (user_id, is_active);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories int not null default 0,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  source text not null default 'manual' check (source in ('plan', 'ai', 'manual')),
  plan_meal_key text,
  created_at timestamptz not null default now()
);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, log_date);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  ml int not null,
  created_at timestamptz not null default now()
);
create index if not exists water_logs_user_date_idx on public.water_logs (user_id, log_date);

-- ───────────────────────── body metrics ─────────────────────────
create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5, 1),
  waist_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  photo_path text,
  created_at timestamptz not null default now()
);
create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, log_date);

-- ───────────────────────── AI coach chat ─────────────────────────
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversations_user_idx on public.chat_conversations (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  proposals jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conv_idx on public.chat_messages (conversation_id, created_at);

-- ───────────────────────── RLS for user-owned tables ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'workout_plans', 'workout_sessions', 'session_sets', 'diet_plans', 'meal_logs',
    'water_logs', 'body_metrics', 'chat_conversations', 'chat_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: own rows" on public.%1$I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- ───────────────────────── AI usage / rate limiting ─────────────────────────
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default current_date,
  kind text not null,
  count int not null default 0,
  primary key (user_id, usage_date, kind)
);
alter table public.ai_usage enable row level security;
-- Users may read their own counters but never write them directly.
create policy "ai_usage: read own" on public.ai_usage for select using (user_id = (select auth.uid()));

-- Atomically consume one unit of the caller's daily quota. Returns false when over the limit.
create or replace function public.consume_ai_quota(p_kind text, p_limit int)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_count int;
begin
  if uid is null then
    return false;
  end if;
  insert into public.ai_usage (user_id, usage_date, kind, count)
  values (uid, current_date, p_kind, 1)
  on conflict (user_id, usage_date, kind) do update set count = public.ai_usage.count + 1
  returning count into new_count;
  if new_count > p_limit then
    update public.ai_usage set count = count - 1
      where user_id = uid and usage_date = current_date and kind = p_kind;
    return false;
  end if;
  return true;
end;
$$;
revoke all on function public.consume_ai_quota(text, int) from public, anon;
grant execute on function public.consume_ai_quota(text, int) to authenticated;

-- ───────────────────────── storage: private progress photos ─────────────────────────
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress photos: own folder read" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress photos: own folder write" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress photos: own folder delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
