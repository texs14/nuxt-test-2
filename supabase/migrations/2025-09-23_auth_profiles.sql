-- Profiles table, triggers, RLS and indexes
-- Requires: Postgres, Supabase default roles

begin;

-- Case-insensitive text extension for email/username
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  username citext unique,
  age smallint check (age >= 0 and age <= 150),
  first_name text,
  last_name text,
  avatar_url text check (avatar_url ~* '^https?://'),
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional additional index by city for filtering
create index if not exists idx_profiles_city on public.profiles (city);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_handle_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

-- Create profile automatically from auth.users metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  v_username text;
  v_first text;
  v_last text;
  v_avatar text;
  v_city text;
  v_age smallint;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username := coalesce(
    meta->>'username',
    meta->>'user_name',
    regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-z0-9._-]', '', 'g')
  );
  v_first := coalesce(meta->>'first_name', meta->>'given_name');
  v_last := coalesce(meta->>'last_name', meta->>'family_name');
  v_avatar := coalesce(meta->>'avatar_url', meta->>'picture');
  v_city := meta->>'city';
  begin
    v_age := nullif(meta->>'age', '')::smallint;
  exception when others then
    v_age := null;
  end;

  insert into public.profiles (id, email, username, first_name, last_name, avatar_url, city, age)
  values (new.id, new.email, nullif(lower(v_username), ''), v_first, v_last, v_avatar, v_city, v_age)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Sync email from auth.users to profiles
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.sync_profile_email();

-- RLS: only owner can select/insert/update
alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

commit;
