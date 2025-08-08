-- Comprehensive Database Setup for Grind App
-- Run this script in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  level integer default 1,
  xp integer default 0,
  streak_days integer default 0,
  longest_streak integer default 0,
  experience_level text default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create goals table
create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  deadline timestamp with time zone not null,
  status text default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  category text,
  target_value integer default 100,
  progress_value integer default 0,
  unit text,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  color text,
  cover_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tasks table with comprehensive schema
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  goal_id uuid references public.goals(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('streak', 'today')),
  status text default 'pending' check (status in ('pending', 'completed', 'skipped', 'failed')),
  
  -- Date fields for different task types
  task_date date, -- Used for streak tasks (which day this streak task is for)
  due_at timestamp with time zone, -- Used for today tasks (when it's due)
  
  -- Task metadata
  load_score integer default 1 check (load_score >= 1 and load_score <= 5),
  proof_mode text default 'flex' check (proof_mode in ('flex', 'realtime')),
  
  -- Completion tracking
  completed_at timestamp with time zone,
  proof_image_url text,
  proof_text text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add constraint to ensure proper date usage by task type
alter table public.tasks add constraint if not exists tasks_type_shape check (
  (type = 'streak' and task_date is not null and due_at is null) or
  (type = 'today' and task_date is null and due_at is not null)
);

-- Create indexes for better performance
create index if not exists idx_profiles_user_id on public.profiles(id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goals_status on public.goals(status);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_goal_id on public.tasks(goal_id);
create index if not exists idx_tasks_type on public.tasks(type);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_task_date on public.tasks(task_date);
create index if not exists idx_tasks_due_at on public.tasks(due_at);
create index if not exists idx_tasks_goal_type_date on public.tasks(goal_id, type, task_date);
create index if not exists idx_tasks_goal_due on public.tasks(goal_id, (due_at::date));

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;

-- Create RLS policies for profiles
create policy if not exists "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy if not exists "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy if not exists "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- Create RLS policies for goals
create policy if not exists "Users can view own goals" 
  on public.goals for select 
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own goals" 
  on public.goals for insert 
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own goals" 
  on public.goals for update 
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own goals" 
  on public.goals for delete 
  using (auth.uid() = user_id);

-- Create RLS policies for tasks
create policy if not exists "Users can view own tasks" 
  on public.tasks for select 
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own tasks" 
  on public.tasks for insert 
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own tasks" 
  on public.tasks for update 
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own tasks" 
  on public.tasks for delete 
  using (auth.uid() = user_id);

-- Create function to ensure user profile exists
create or replace function public.ensure_user_profile(user_id uuid, user_name text default 'User')
returns boolean
language plpgsql
security definer
as $$
declare
  user_exists boolean;
begin
  -- Check if user exists in auth.users
  select exists(
    select 1 from auth.users where id = user_id
  ) into user_exists;
  
  if not user_exists then
    return false;
  end if;
  
  -- Insert or update profile
  insert into public.profiles (id, name, level, xp, streak_days, longest_streak)
  values (user_id, user_name, 1, 0, 0, 0)
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    updated_at = now();
    
  return true;
end;
$$;

-- Create function to check if user exists in auth.users
create or replace function public.check_user_exists(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists(select 1 from auth.users where id = user_id);
end;
$$;

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, level, xp, streak_days, longest_streak)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email, 'User'),
    1,
    0,
    0,
    0
  );
  return new;
end;
$$;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_goals_updated_at on public.goals;
create trigger update_goals_updated_at
  before update on public.goals
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_tasks_updated_at on public.tasks;
create trigger update_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.update_updated_at_column();

-- Create a health check function
create or replace function public.grind_check_core_tables()
returns jsonb
language plpgsql
security definer
as $$
declare 
  ok boolean;
begin
  ok := (
    to_regclass('public.profiles') is not null and
    to_regclass('public.goals') is not null and
    to_regclass('public.tasks') is not null
  );
  return jsonb_build_object('ok', ok);
end;
$$;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- Insert a demo user profile for development (optional)
-- This will only work if you have a user with this ID in auth.users
-- You can remove this if you don't need it
insert into public.profiles (id, name, level, xp, streak_days, longest_streak, experience_level)
values ('demo-user-id', 'Demo User', 1, 0, 0, 0, 'beginner')
on conflict (id) do nothing;

-- Verify the setup
select 
  'profiles' as table_name, 
  count(*) as row_count,
  case when count(*) >= 0 then 'OK' else 'ERROR' end as status
from public.profiles
union all
select 
  'goals' as table_name, 
  count(*) as row_count,
  case when count(*) >= 0 then 'OK' else 'ERROR' end as status
from public.goals
union all
select 
  'tasks' as table_name, 
  count(*) as row_count,
  case when count(*) >= 0 then 'OK' else 'ERROR' end as status
from public.tasks;

-- Test the health check function
select public.grind_check_core_tables();