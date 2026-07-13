-- Allow historied empty legs that came from JetInsight HOLD / soft_hold
ALTER TYPE "EmptyLegHistoryReason" ADD VALUE IF NOT EXISTS 'unbooked_hold';
