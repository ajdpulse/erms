/*
  # Update retirement reason constraint to Marathi

  1. Changes
    - Drop existing constraint on employee table
    - Add new constraint with Marathi retirement reasons
    - Update existing records to use Marathi values

  2. New Values
    - 'Retirement Due to Death' → 'मृत्यू झाल्याने'
    - 'Retirement Due to Prescribed Age' → 'नियत वयोमान'
    - 'Voluntary Retirement' → 'स्वेच्छा सेवा निवृत्ती'
*/

-- First, update existing records to use Marathi values
UPDATE erms.employee 
SET reason = CASE 
  WHEN reason = 'Retirement Due to Death' THEN 'मृत्यू झाल्याने'
  WHEN reason = 'Retirement Due to Prescribed Age' THEN 'नियत वयोमान'
  WHEN reason = 'Voluntary Retirement' THEN 'स्वेच्छा सेवा निवृत्ती'
  ELSE reason
END
WHERE reason IN ('Retirement Due to Death', 'Retirement Due to Prescribed Age', 'Voluntary Retirement');

-- Drop the existing constraint
ALTER TABLE erms.employee DROP CONSTRAINT IF EXISTS employee_retirement_reason_check;

-- Add new constraint with Marathi values
ALTER TABLE erms.employee ADD CONSTRAINT employee_retirement_reason_check 
CHECK (
  reason = ANY (
    ARRAY[
      'मृत्यू झाल्याने'::text,
      'नियत वयोमान'::text,
      'स्वेच्छा सेवा निवृत्ती'::text
    ]
  )
);