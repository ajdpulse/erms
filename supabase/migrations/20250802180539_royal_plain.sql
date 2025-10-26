/*
  # Create FIMS (Field Inspection Management System) Schema

  1. New Tables
    - `fims_categories` - Inspection categories (अंगणवाडी केंद्र, दस्तऐवज तपासणी)
    - `fims_inspections` - Main inspection records with location data
    - `fims_anganwadi_forms` - Anganwadi center inspection form data
    - `fims_document_forms` - Document inspection form data
    - `fims_inspection_photos` - Photo storage references
    - `fims_assignments` - Assignment and review workflow

  2. Security
    - Enable RLS on all tables
    - Role-based policies for inspectors, admins, and reviewers
    - User-specific data access based on assignments

  3. Features
    - Location tracking with accuracy
    - Photo storage integration
    - Draft/submit workflow
    - Assignment and review system
    - Analytics and reporting
*/

-- Create FIMS schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS fims;

-- Categories table for inspection types
CREATE TABLE IF NOT EXISTS fims_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_marathi text NOT NULL,
  description text,
  form_type text NOT NULL CHECK (form_type IN ('anganwadi', 'document')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Main inspections table
CREATE TABLE IF NOT EXISTS fims_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number text UNIQUE NOT NULL,
  category_id uuid REFERENCES fims_categories(id),
  inspector_id uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  location_name text NOT NULL,
  latitude numeric(10,8),
  longitude numeric(11,8),
  location_accuracy numeric(5,2), -- in meters
  address text,
  planned_date date,
  inspection_date timestamptz,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'reassigned')),
  form_data jsonb DEFAULT '{}',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comments text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  is_compliant boolean,
  non_compliance_reason text,
  requires_revisit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Anganwadi inspection form data
CREATE TABLE IF NOT EXISTS fims_anganwadi_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES fims_inspections(id) ON DELETE CASCADE,
  anganwadi_name text,
  anganwadi_number text,
  supervisor_name text,
  helper_name text,
  village_name text,
  building_condition text CHECK (building_condition IN ('excellent', 'good', 'average', 'poor')),
  room_availability boolean,
  toilet_facility boolean,
  drinking_water boolean,
  electricity boolean,
  kitchen_garden boolean,
  weighing_machine boolean,
  height_measuring_scale boolean,
  first_aid_kit boolean,
  teaching_materials boolean,
  toys_available boolean,
  attendance_register boolean,
  growth_chart_updated boolean,
  vaccination_records boolean,
  nutrition_records boolean,
  total_registered_children integer DEFAULT 0,
  children_present_today integer DEFAULT 0,
  children_0_3_years integer DEFAULT 0,
  children_3_6_years integer DEFAULT 0,
  hot_meal_served boolean,
  meal_quality text CHECK (meal_quality IN ('excellent', 'good', 'average', 'poor')),
  take_home_ration boolean,
  health_checkup_conducted boolean,
  immunization_updated boolean,
  vitamin_a_given boolean,
  iron_tablets_given boolean,
  general_observations text,
  recommendations text,
  action_required text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document inspection form data
CREATE TABLE IF NOT EXISTS fims_document_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES fims_inspections(id) ON DELETE CASCADE,
  document_type text,
  document_number text,
  document_date date,
  issuing_authority text,
  document_available boolean,
  document_condition text CHECK (document_condition IN ('excellent', 'good', 'damaged', 'missing')),
  information_accurate boolean,
  signatures_present boolean,
  stamps_present boolean,
  meets_requirements boolean,
  deficiencies_found text,
  corrective_action_needed text,
  remarks text,
  follow_up_required boolean,
  follow_up_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Photo storage references
CREATE TABLE IF NOT EXISTS fims_inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES fims_inspections(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_name text,
  description text,
  photo_order integer DEFAULT 1,
  uploaded_at timestamptz DEFAULT now()
);

-- Assignment and workflow management
CREATE TABLE IF NOT EXISTS fims_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES fims_inspections(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  assignment_type text CHECK (assignment_type IN ('inspection', 'review', 'revisit')),
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE fims_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fims_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fims_anganwadi_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fims_document_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fims_inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fims_assignments ENABLE ROW LEVEL SECURITY;

-- Categories policies (readable by all authenticated users)
CREATE POLICY "Anyone can read categories"
  ON fims_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON fims_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Inspections policies
CREATE POLICY "Users can read own inspections"
  ON fims_inspections FOR SELECT
  TO authenticated
  USING (
    inspector_id = auth.uid() OR 
    assigned_by = auth.uid() OR 
    reviewed_by = auth.uid()
  );

CREATE POLICY "Admins can read all inspections"
  ON fims_inspections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

CREATE POLICY "Users can create inspections"
  ON fims_inspections FOR INSERT
  TO authenticated
  WITH CHECK (inspector_id = auth.uid());

CREATE POLICY "Users can update own inspections"
  ON fims_inspections FOR UPDATE
  TO authenticated
  USING (inspector_id = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Admins can update all inspections"
  ON fims_inspections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Form data policies (linked to inspections)
CREATE POLICY "Users can read own form data"
  ON fims_anganwadi_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_anganwadi_forms.inspection_id
      AND (fi.inspector_id = auth.uid() OR fi.assigned_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own form data"
  ON fims_anganwadi_forms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_anganwadi_forms.inspection_id
      AND fi.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all form data"
  ON fims_anganwadi_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Document form policies (same pattern)
CREATE POLICY "Users can read own document forms"
  ON fims_document_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_document_forms.inspection_id
      AND (fi.inspector_id = auth.uid() OR fi.assigned_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own document forms"
  ON fims_document_forms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_document_forms.inspection_id
      AND fi.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all document forms"
  ON fims_document_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Photo policies
CREATE POLICY "Users can read own inspection photos"
  ON fims_inspection_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_inspection_photos.inspection_id
      AND (fi.inspector_id = auth.uid() OR fi.assigned_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage own inspection photos"
  ON fims_inspection_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fims_inspections fi
      WHERE fi.id = fims_inspection_photos.inspection_id
      AND fi.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all photos"
  ON fims_inspection_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Assignment policies
CREATE POLICY "Users can read own assignments"
  ON fims_assignments FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Users can update own assignments"
  ON fims_assignments FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Admins can create assignments"
  ON fims_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer', 'officer')
    )
  );

CREATE POLICY "Admins can read all assignments"
  ON fims_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'developer')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fims_inspections_inspector ON fims_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_fims_inspections_status ON fims_inspections(status);
CREATE INDEX IF NOT EXISTS idx_fims_inspections_date ON fims_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_fims_inspections_location ON fims_inspections(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fims_photos_inspection ON fims_inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_fims_assignments_assigned_to ON fims_assignments(assigned_to);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fims_categories_updated_at
    BEFORE UPDATE ON fims_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fims_inspections_updated_at
    BEFORE UPDATE ON fims_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fims_anganwadi_forms_updated_at
    BEFORE UPDATE ON fims_anganwadi_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fims_document_forms_updated_at
    BEFORE UPDATE ON fims_document_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fims_assignments_updated_at
    BEFORE UPDATE ON fims_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO fims_categories (name, name_marathi, description, form_type) VALUES
('Anganwadi Center Inspection', 'अंगणवाडी केंद्र तपासणी फॉर्म', 'Comprehensive inspection of Anganwadi centers including infrastructure, facilities, and services', 'anganwadi'),
('Document Inspection', 'दस्तऐवज तपासणी प्रपत्र', 'Verification and inspection of official documents and records', 'document')
ON CONFLICT DO NOTHING;