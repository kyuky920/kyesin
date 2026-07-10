-- Migration 001: attendees 테이블 확장
-- 기존 DB에 이미 attendees 테이블이 있다면 이 파일을 Supabase SQL Editor에서 실행해 주세요.

-- 1. birth_year 제약 조건 확장 (1985 → 1955)
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_birth_year_check;
ALTER TABLE attendees ADD CONSTRAINT attendees_birth_year_check
  CHECK (birth_year BETWEEN 1955 AND 2015);

-- birth_year를 NULL 허용으로 변경 (생년 미입력 참가자 대비)
ALTER TABLE attendees ALTER COLUMN birth_year DROP NOT NULL;

-- 2. attendance_type 제약 조건 확장
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_attendance_type_check;
ALTER TABLE attendees ADD CONSTRAINT attendees_attendance_type_check
  CHECK (attendance_type IN ('full', 'fri_sat', 'thu_fri', 'thu_only', 'fri_only', 'sat_only'));

-- 3. attendance_days 제약 조건 완화 (1~3일 모두 허용)
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_attendance_days_check;
ALTER TABLE attendees ADD CONSTRAINT attendees_attendance_days_check
  CHECK (attendance_days BETWEEN 1 AND 3);

-- 4. tshirt_size 컬럼 추가 (티셔츠 사이즈)
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS tshirt_size TEXT;
