
-- Drop old trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Replace the signup trigger function
create or replace function public.handle_new_user_signup()
returns trigger
language plpgsql
security definer
as $$
declare
  meta jsonb;
  raw_company_id text;
  valid_company_id uuid;
begin
  -- The correct path is raw_app_meta_data -> 'user_metadata'
  meta := new.raw_app_meta_data -> 'user_metadata';

  -- Extract values safely
  raw_company_id := meta ->> 'company_id';

  -- Attempt to cast company_id to UUID
  begin
    valid_company_id := raw_company_id::uuid;
  exception when others then
    raise notice 'Invalid company_id: %', raw_company_id;
    valid_company_id := null;
  end;

  insert into public.user_profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    company_name
  ) values (
    new.id,
    new.email,
    meta ->> 'full_name',
    meta ->> 'role',
    valid_company_id,
    meta ->> 'company_name'
  );

  return new;
end;
$$;

-- Re-create trigger
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user_signup();
