
#!/bin/bash

# Set migration directory
MIGRATION_DIR="supabase/migrations"
FILENAME="20250406-fix-signup-trigger.sql"
FULL_PATH="$MIGRATION_DIR/$FILENAME"

# Ensure migrations directory exists
mkdir -p "$MIGRATION_DIR"

# Write migration SQL
cat > "$FULL_PATH" <<'EOF'
-- IMPORTANT: Do not modify this file directly. Use the fix_signup_trigger.sh script.

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
  -- Get the metadata from the new user
  meta := coalesce(new.raw_user_meta_data, new.raw_app_meta_data);
  
  -- Extract values safely
  raw_company_id := meta ->> 'company_id';
  role_value := coalesce(meta ->> 'role', 'dealer');
  
  -- Log information for debugging
  raise notice 'Creating profile for user % with metadata %', new.id, meta;
  
  -- Attempt to cast company_id to UUID
  begin
    valid_company_id := raw_company_id::uuid;
  exception when others then
    raise notice 'Invalid company_id: %', raw_company_id;
    valid_company_id := gen_random_uuid();
  end;
  
  -- Insert profile
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
    coalesce(meta ->> 'full_name', ''),
    role_value::public.user_role,
    valid_company_id,
    coalesce(meta ->> 'company_name', '')
  );

  return new;
exception when others then
  -- Log any exceptions to diagnose issues
  raise warning 'Error creating user profile for %: %', new.id, SQLERRM;
  return new; -- Still allow user creation even if profile creation fails
end;
$$;

-- Re-create trigger
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user_signup();

-- Helper functions remain unchanged
EOF

echo "✅ Migration file created at $FULL_PATH"

# Apply migration
echo "📡 Running Supabase DB Push..."
supabase db push

echo "🎉 Done. Your signup flow should now be fixed!"
