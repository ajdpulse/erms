/*
  # Create designations table

  1. New Tables
    - `designations`
      - `designation_id` (text, primary key)
      - `designation` (text, designation name)
      - `department_id` (text, foreign key to department)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `designations` table
    - Add policies for authenticated users to read and manage designations

  3. Triggers
    - Add trigger to automatically update `updated_at` column
*/

CREATE TABLE IF NOT EXISTS erms.designations (
  designation_id text NOT NULL,
  designation text NOT NULL,
  department_id text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT designations_pkey PRIMARY KEY (designation_id),
  CONSTRAINT designations_department_id_fkey FOREIGN KEY (department_id) REFERENCES erms.department (dept_id)
) TABLESPACE pg_default;

ALTER TABLE erms.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read designations"
  ON erms.designations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage designations"
  ON erms.designations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_designations_updated_at 
  BEFORE UPDATE ON erms.designations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();