/*
  # Add retirement reason constraint to employee table

  1. Changes
    - Add CHECK constraint to limit retirement reasons to 3 specific values
    - Ensures data integrity for retirement reason field
    - Prevents invalid retirement reasons from being entered

  2. Allowed Values
    - "Retirement Due to Death"
    - "Retirement Due to Prescribed Age" 
    - "Voluntary Retirement"
*/

-- Add constraint to limit retirement reasons to specific values
DO $$
BEGIN
  -- Check if constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employee_retirement_reason_check' 
    AND table_name = 'employee' 
    AND table_schema = 'erms'
  ) THEN
    ALTER TABLE erms.employee 
    ADD CONSTRAINT employee_retirement_reason_check 
    CHECK (reason IN (
      'Retirement Due to Death',
      'Retirement Due to Prescribed Age', 
      'Voluntary Retirement'
    ));
  END IF;
END $$;

-- Add comment to document the constraint
COMMENT ON CONSTRAINT employee_retirement_reason_check ON erms.employee IS 
'Ensures retirement reason is one of: Death, Prescribed Age, or Voluntary Retirement';