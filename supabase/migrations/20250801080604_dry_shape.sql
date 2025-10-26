/*
  # Create ERMS Dashboard Access Table

  1. New Tables
    - `erms.ermsdashboard_access`
      - `user_id` (uuid, references auth.users)
      - `name` (text, employee name)
      - `role` (text, role name from roles table)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - `sync_ermsdashboard_access()` - Function to sync data from public schema
    - `handle_user_roles_change()` - Trigger function for automatic sync

  3. Triggers
    - Trigger on public.user_roles for INSERT/UPDATE/DELETE
    - Trigger on public.roles for UPDATE

  4. Security
    - Enable RLS on ermsdashboard_access table
    - Add policies for authenticated users
*/

-- Create the ermsdashboard_access table in erms schema
CREATE TABLE IF NOT EXISTS erms.ermsdashboard_access (
  user_id uuid PRIMARY KEY,
  name text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE erms.ermsdashboard_access ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read ermsdashboard_access"
  ON erms.ermsdashboard_access
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage ermsdashboard_access"
  ON erms.ermsdashboard_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to sync data from public schema to erms schema
CREATE OR REPLACE FUNCTION sync_ermsdashboard_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing data
  DELETE FROM erms.ermsdashboard_access;
  
  -- Insert fresh data from public schema
  INSERT INTO erms.ermsdashboard_access (user_id, name, role, created_at, updated_at)
  SELECT 
    ur.user_id,
    ur.name,
    r.name as role,
    ur.created_at,
    ur.updated_at
  FROM public.user_roles ur
  INNER JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.name IS NOT NULL;
END;
$$;

-- Function to handle changes in user_roles table
CREATE OR REPLACE FUNCTION handle_user_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the entire ermsdashboard_access table
  PERFORM sync_ermsdashboard_access();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to handle changes in roles table
CREATE OR REPLACE FUNCTION handle_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the entire ermsdashboard_access table when role names change
  PERFORM sync_ermsdashboard_access();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on public.user_roles table
DROP TRIGGER IF EXISTS sync_ermsdashboard_access_trigger ON public.user_roles;
CREATE TRIGGER sync_ermsdashboard_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_roles_change();

-- Create trigger on public.roles table for role name changes
DROP TRIGGER IF EXISTS sync_ermsdashboard_access_roles_trigger ON public.roles;
CREATE TRIGGER sync_ermsdashboard_access_roles_trigger
  AFTER UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_roles_change();

-- Initial sync of existing data
SELECT sync_ermsdashboard_access();