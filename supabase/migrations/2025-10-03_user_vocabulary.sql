-- Add vocabulary field to profiles table
-- Vocabulary stored as array of dictionary IDs

begin;

-- Drop old user_vocabulary table if exists
drop table if exists public.user_vocabulary cascade;

-- Add vocabulary column to profiles
alter table public.profiles
add column if not exists vocabulary bigint[] default '{}';

-- Create index for faster vocabulary lookups
create index if not exists idx_profiles_vocabulary on public.profiles using gin(vocabulary);

commit;
