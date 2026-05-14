create extension if not exists pgcrypto;

create table if not exists public.videos (
  id text primary key,
  title text not null,
  description text,
  category text,
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  file_path text not null,
  file_url text not null,
  poster_url text,
  duration numeric,
  views integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.video_events (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.videos(id) on delete cascade,
  session_id text not null,
  event_type text not null check (event_type in ('play','pause','progress','resume','ended','abandon')),
  time_sec integer not null default 0,
  duration_sec integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_events_video_id_created_at on public.video_events(video_id, created_at);
create index if not exists idx_video_events_session_id on public.video_events(session_id);

alter table public.videos enable row level security;
alter table public.video_events enable row level security;

drop policy if exists "public can read videos" on public.videos;
create policy "public can read videos"
on public.videos
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert videos" on public.videos;
create policy "public can insert videos"
on public.videos
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update videos" on public.videos;
create policy "public can update videos"
on public.videos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can delete videos" on public.videos;
create policy "public can delete videos"
on public.videos
for delete
to anon, authenticated
using (true);

drop policy if exists "public can read video_events" on public.video_events;
create policy "public can read video_events"
on public.video_events
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert video_events" on public.video_events;
create policy "public can insert video_events"
on public.video_events
for insert
to anon, authenticated
with check (true);

insert into storage.buckets (id, name, public)
values ('streamvault-videos', 'streamvault-videos', true)
on conflict (id) do nothing;

drop policy if exists "public read storage" on storage.objects;
create policy "public read storage"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'streamvault-videos');

drop policy if exists "public insert storage" on storage.objects;
create policy "public insert storage"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'streamvault-videos');

drop policy if exists "public update storage" on storage.objects;
create policy "public update storage"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'streamvault-videos')
with check (bucket_id = 'streamvault-videos');

drop policy if exists "public delete storage" on storage.objects;
create policy "public delete storage"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'streamvault-videos');
