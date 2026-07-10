// ─────────────────────────────────────────────────────────
// 실제 Supabase DB 스키마 기반 타입
// ─────────────────────────────────────────────────────────

export interface Retreat {
  id: string;
  name: string;
  theme?: string;
  scripture?: string;
  location?: string;
  start_date: string;
  end_date: string;
}

export interface Church {
  id: string;
  name: string;
}

export interface Attendee {
  id: string;
  retreat_id: string;
  import_batch_id?: string;
  registration_no?: number;
  church_id?: string;
  church_name_raw?: string;
  full_name: string;
  gender: "male" | "female";
  birth_year?: number;
  age?: number;
  age_band?: "20_24" | "25_28" | "29_plus";
  shirt_size?: string;
  lodging_required: boolean;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  meal_notes?: string;
  arrival_notes?: string;
  admin_notes?: string;
  attendance_status?: string;
  identity_church_input?: string;
  identity_name_input?: string;
  identity_birth_year_input?: number;
  created_at?: string;
  updated_at?: string;
  // 조인 필드
  churches?: { name: string };
}

export interface RetreatGroup {
  id: string;
  retreat_id: string;
  group_number: number;
  group_name: string;
  leader_id?: string;
}

export interface GroupAssignment {
  id: string;
  group_id: string;
  attendee_id: string;
}

export interface ScheduleItem {
  id: string;
  retreat_id: string;
  day_date: string;             // "2026-07-30" | "2026-07-31" | "2026-08-01"
  start_time: string;
  end_time?: string | null;
  title: string;
  subtitle?: string | null;     // 강사 정보
  item_type?: string | null;    // worship | lecture | meal | group | prayer | activity | break | registration
  audience_note?: string | null; // 장소
  body?: string | null;         // 상세 설명
  sort_order?: number | null;
}

export interface Venue {
  id: string;
  retreat_id: string;
  name: string;
  type: string;
  description?: string;
  capacity?: number;
  floor?: string;
  building?: string;
}

export interface Announcement {
  id: string;
  retreat_id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}
