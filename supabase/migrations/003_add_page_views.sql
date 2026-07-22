-- Migration 003: 페이지 접속 로그 테이블
-- Supabase SQL Editor에서 실행해 주세요.

CREATE TABLE IF NOT EXISTS page_views (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID        REFERENCES attendees(id) ON DELETE SET NULL,
  page_path   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx  ON page_views(created_at);
CREATE INDEX IF NOT EXISTS page_views_attendee_id_idx ON page_views(attendee_id);
CREATE INDEX IF NOT EXISTS page_views_page_path_idx   ON page_views(page_path);
