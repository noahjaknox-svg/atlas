-- Step 1: add staff role (must commit before using the new enum value)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'staff';
