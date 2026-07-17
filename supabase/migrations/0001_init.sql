-- AI Byte Studio — initial schema
-- Tables: projects, generations, profiles + RLS so users only see their own rows.
-- Storage: private buckets for photos, voice samples and generated videos.

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('solo', 'cinema', 'cartoon')),
  title text not null default '',
  payload jsonb not null default '{}'::jsonb, -- characters, script, scene, style
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

create index if not exists projects_user_idx on public.projects (user_id, updated_at desc);

-- ---------- generations ----------
create table if not exists public.generations (
  id uuid primary key,
  project_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'done',
  steps jsonb not null default '{}'::jsonb,     -- pipeline steps + job metadata
  result_url text,
  share_kit jsonb not null default '{}'::jsonb, -- per-platform titles/descriptions/hashtags
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);
create policy "generations_insert_own" on public.generations
  for insert with check (auth.uid() = user_id);
create policy "generations_update_own" on public.generations
  for update using (auth.uid() = user_id);
create policy "generations_delete_own" on public.generations
  for delete using (auth.uid() = user_id);

create index if not exists generations_user_idx on public.generations (user_id, created_at desc);

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  video_provider text not null default 'heygen' check (video_provider in ('heygen', 'runway')),
  default_style text,
  last_tab text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- storage buckets (private; access via signed URLs) ----------
insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', false),
  ('voice-samples', 'voice-samples', false),
  ('videos', 'videos', false)
on conflict (id) do nothing;

-- Users can only touch objects inside their own folder: <user_id>/...
create policy "storage_read_own" on storage.objects
  for select using (
    bucket_id in ('photos', 'voice-samples', 'videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_insert_own" on storage.objects
  for insert with check (
    bucket_id in ('photos', 'voice-samples', 'videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_delete_own" on storage.objects
  for delete using (
    bucket_id in ('photos', 'voice-samples', 'videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
