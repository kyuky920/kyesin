-- Migration 002: 접속 추적용 first_viewed_at 컬럼 추가
-- Supabase SQL Editor에서 실행해 주세요.

ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ DEFAULT NULL;
