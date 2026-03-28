-- Create the grind_check_core_tables function for health diagnostics
create or replace function public.grind_check_core_tables()
returns jsonb
language plpgsql
security definer
as $$
declare 
  ok boolean;
  profiles_exists boolean;
  goals_exists boolean;
  tasks_exists boolean;
begin
  -- Check if core tables exist
  profiles_exists := (to_regclass('public.profiles') is not null);
  goals_exists := (to_regclass('public.goals') is not null);
  tasks_exists := (to_regclass('public.tasks') is not null);
  
  ok := profiles_exists and goals_exists and tasks_exists;
  
  return jsonb_build_object(
    'ok', ok,
    'tables', jsonb_build_object(
      'profiles', profiles_exists,
      'goals', goals_exists,
      'tasks', tasks_exists
    )
  );
end;
$$;

-- Grant execute permission to anon and authenticated users
grant execute on function public.grind_check_core_tables() to anon;
grant execute on function public.grind_check_core_tables() to authenticated;