-- ───────────────────────── progress photos ─────────────────────────
-- Standalone photo log: as many photos as a member wants, optionally tied to the
-- workout they were taken after. Files live in the private `progress-photos` bucket.
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.workout_sessions (id) on delete set null,
  taken_on date not null default current_date,
  path text not null,
  caption text check (char_length(caption) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists progress_photos_user_idx on public.progress_photos (user_id, created_at desc);

alter table public.progress_photos enable row level security;
create policy "progress_photos: own rows" on public.progress_photos for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Carry over photos attached to weigh-ins before this table existed.
insert into public.progress_photos (user_id, taken_on, path, created_at)
select user_id, log_date, photo_path, created_at
from public.body_metrics
where photo_path is not null
  and not exists (select 1 from public.progress_photos p where p.path = body_metrics.photo_path);
