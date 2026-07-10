-- ============================================================
-- 2026 청년 하계 연합수련회 (WALK WITH HIM)
-- Supabase / PostgreSQL Schema
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. retreats — 수련회 기본 정보
-- ============================================================
CREATE TABLE IF NOT EXISTS retreats (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  theme        TEXT,
  scripture    TEXT,
  venue        TEXT,
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. churches — 교회 정규화 마스터
-- ============================================================
CREATE TABLE IF NOT EXISTS churches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT        NOT NULL UNIQUE,
  display_name   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. church_aliases — 교회 별칭 매핑 (raw 입력값 → canonical)
-- ============================================================
CREATE TABLE IF NOT EXISTS church_aliases (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID        NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  alias_name  TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. attendees — 참석자
-- ============================================================
CREATE TABLE IF NOT EXISTS attendees (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id                UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  registration_no           INTEGER,
  church_id                 UUID        REFERENCES churches(id),
  church_name_raw           TEXT,
  full_name                 TEXT        NOT NULL,
  gender                    TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
  birth_year                INTEGER     CHECK (birth_year BETWEEN 1955 AND 2015),

  -- Generated columns (read-only)
  age      INTEGER GENERATED ALWAYS AS (2026 - birth_year) STORED,
  age_band TEXT    GENERATED ALWAYS AS (
    CASE
      WHEN (2026 - birth_year) <= 24 THEN '20_24'
      WHEN (2026 - birth_year) <= 28 THEN '25_28'
      ELSE '29_plus'
    END
  ) STORED,

  shirt_size                TEXT,
  lodging_required          BOOLEAN     NOT NULL DEFAULT false,

  -- 참석일: day1=목(7/30), day2=금(7/31), day3=토(8/1)
  attends_day1              BOOLEAN     NOT NULL DEFAULT true,
  attends_day2              BOOLEAN     NOT NULL DEFAULT true,
  attends_day3              BOOLEAN     NOT NULL DEFAULT true,

  meal_notes                TEXT,
  arrival_notes             TEXT,
  admin_notes               TEXT,
  attendance_status         TEXT        DEFAULT 'confirmed',

  -- 본인확인 입력 원본 (로그용)
  identity_church_input     TEXT,
  identity_name_input       TEXT,
  identity_birth_year_input INTEGER,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendees_retreat    ON attendees(retreat_id);
CREATE INDEX IF NOT EXISTS idx_attendees_church     ON attendees(church_id);
CREATE INDEX IF NOT EXISTS idx_attendees_name       ON attendees(full_name);
CREATE INDEX IF NOT EXISTS idx_attendees_birth_year ON attendees(birth_year);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendees_updated_at ON attendees;
CREATE TRIGGER trg_attendees_updated_at
  BEFORE UPDATE ON attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. retreat_groups — 조
-- ============================================================
CREATE TABLE IF NOT EXISTS retreat_groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id   UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  group_number INTEGER     NOT NULL,
  group_name   TEXT,
  leader_id    UUID        REFERENCES attendees(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (retreat_id, group_number)
);

CREATE INDEX IF NOT EXISTS idx_retreat_groups_retreat ON retreat_groups(retreat_id);

-- ============================================================
-- 6. group_assignments — 조 배정 (참가자 ↔ 조, 1:1)
-- ============================================================
CREATE TABLE IF NOT EXISTS group_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES retreat_groups(id) ON DELETE CASCADE,
  attendee_id UUID        NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attendee_id)
);

CREATE INDEX IF NOT EXISTS idx_group_assignments_group    ON group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_assignments_attendee ON group_assignments(attendee_id);

-- ============================================================
-- 7. schedule_items — 일정
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id  UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  day_index   INTEGER     NOT NULL CHECK (day_index BETWEEN 1 AND 3),
  date        DATE        NOT NULL,
  start_time  TIME,
  end_time    TIME,
  title       TEXT        NOT NULL,
  description TEXT,
  speaker     TEXT,
  venue       TEXT,
  category    TEXT,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_items_retreat ON schedule_items(retreat_id);

-- ============================================================
-- 8. venues — 장소 안내
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id  UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT,
  description TEXT,
  floor       TEXT,
  building    TEXT,
  capacity    INTEGER,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. announcements — 공지사항
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id   UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  content      TEXT,
  is_pinned    BOOLEAN     NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. attendee_lookup_logs — 본인확인 조회 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS attendee_lookup_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id       UUID        REFERENCES attendees(id) ON DELETE SET NULL,
  church_name_input TEXT,
  name_input        TEXT,
  birth_year_input  INTEGER,
  found             BOOLEAN     NOT NULL DEFAULT false,
  ip_address        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. group_constraint_sets — 조편성 제약 묶음
--     must_together : 항상 같은 조 (예: 초월제일교회 전원)
--     must_separate : 반드시 다른 조
-- ============================================================
CREATE TABLE IF NOT EXISTS group_constraint_sets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id      UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  name            TEXT,
  constraint_type TEXT        NOT NULL CHECK (constraint_type IN ('must_together', 'must_separate')),
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. group_constraint_members — 제약 묶음 멤버
-- ============================================================
CREATE TABLE IF NOT EXISTS group_constraint_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_set_id UUID NOT NULL REFERENCES group_constraint_sets(id) ON DELETE CASCADE,
  attendee_id       UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  UNIQUE (constraint_set_id, attendee_id)
);

-- ============================================================
-- 13. group_generation_runs — 자동 조편성 실행 이력
-- ============================================================
CREATE TABLE IF NOT EXISTS group_generation_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id        UUID        NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  run_by            TEXT,
  target_group_size INTEGER,
  total_groups      INTEGER,
  total_assigned    INTEGER,
  settings          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE retreats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_aliases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE retreat_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues                ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendee_lookup_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_constraint_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_constraint_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_generation_runs ENABLE ROW LEVEL SECURITY;

-- anon 읽기 허용 (참가자용 공개 데이터)
CREATE POLICY "anon_read" ON retreats          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON churches          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON church_aliases    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON attendees         FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON retreat_groups    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON group_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON schedule_items    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON venues            FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON announcements     FOR SELECT TO anon USING (true);

-- 조회 로그 insert: anon 허용
CREATE POLICY "anon_insert_logs" ON attendee_lookup_logs FOR INSERT TO anon WITH CHECK (true);
