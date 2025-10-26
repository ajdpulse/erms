/*
  # Create report_templates table

  1. New Tables
    - `report_templates`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Name of the report template
      - `description` (text) - Optional description of the template
      - `report_type` (text, not null) - Type of report (table, bar, pie, line)
      - `tables` (jsonb, not null) - Array of table names used in the report
      - `columns` (jsonb, not null) - Array of column names selected for the report
      - `filters` (jsonb) - Array of filter conditions applied to the report
      - `joins` (jsonb) - Array of join conditions between tables
      - `user_id` (uuid, not null) - Reference to the user who created the template
      - `created_at` (timestamptz) - When the template was created
      - `updated_at` (timestamptz) - When the template was last updated

  2. Security
    - Enable RLS on `report_templates` table
    - Add policy for users to manage their own templates only
    - Add policy for users to read their own templates only

  3. Indexes
    - Index on user_id for faster queries
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL CHECK (report_type IN ('table', 'bar', 'pie', 'line')),
  tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb DEFAULT '[]'::jsonb,
  joins jsonb DEFAULT '[]'::jsonb,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can read own report templates"
  ON report_templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own report templates"
  ON report_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own report templates"
  ON report_templates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own report templates"
  ON report_templates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON report_templates(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_report_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_report_templates_updated_at
      BEFORE UPDATE ON report_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;