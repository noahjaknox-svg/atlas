-- Step 2: departments column and role data migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppDepartment') THEN
    CREATE TYPE "AppDepartment" AS ENUM (
      'aircraft_management',
      'charter',
      'data_warehouse'
    );
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS departments "AppDepartment"[] NOT NULL DEFAULT '{}';

ALTER TABLE user_invites
  ADD COLUMN IF NOT EXISTS departments "AppDepartment"[] NOT NULL DEFAULT '{}';

UPDATE users
SET role = 'staff',
    departments = ARRAY['aircraft_management']::"AppDepartment"[]
WHERE role::text IN ('sales', 'reviewer');

UPDATE users
SET role = 'staff',
    departments = ARRAY['charter']::"AppDepartment"[]
WHERE role::text = 'charter';

UPDATE user_invites
SET role = 'staff',
    departments = ARRAY['aircraft_management']::"AppDepartment"[]
WHERE role::text IN ('sales', 'reviewer')
  AND status = 'pending';

UPDATE user_invites
SET role = 'staff',
    departments = ARRAY['charter']::"AppDepartment"[]
WHERE role::text = 'charter'
  AND status = 'pending';
