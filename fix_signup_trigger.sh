
#!/bin/bash

# Set migration directory
MIGRATION_DIR="supabase/migrations"
FILENAME="20250405-fix-signup-trigger.sql"
FULL_PATH="$MIGRATION_DIR/$FILENAME"

# Ensure migrations directory exists
mkdir -p "$MIGRATION_DIR"

# Write migration SQL
cat > "$FULL_PATH" <<'EOF'
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
  role_value text;
begin
  -- The correct path is raw_app_meta_data -> 'user_metadata'
  meta := new.raw_app_meta_data -> 'user_metadata';
  
  -- Extract values safely
  raw_company_id := meta ->> 'company_id';
  role_value := meta ->> 'role';
  
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
    (role_value)::public.user_role,
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
EOF

echo "✅ Migration file created at $FULL_PATH"

# Apply migration
echo "📡 Running Supabase DB Push..."
supabase db push

echo "🎉 Done. Your signup flow should now be fixed!"
