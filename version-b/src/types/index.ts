export type UserRole = "admin" | "organiser" | "participant";

export interface Department {
  department_id: number;
  department_code: string;
  department_name: string;
  school_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  role_id: number;
  department_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: { role_name: string };
  department?: Department;
}

export interface Organizer {
  organizer_id: number;
  user_id: number;
  organizer_type: "faculty" | "student" | "staff" | "external";
  designation?: string;
  created_at: string;
}

export interface Participant {
  participant_id: number;
  full_name: string;
  roll_number?: string;
  university_email?: string;
  personal_email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  department_id?: number;
  year_of_study?: number;
  semester?: number;
  college_name?: string;
  participant_type: "student" | "faculty" | "alumni" | "external";
  is_internal: boolean;
  accessibility_needs?: string;
  consent_media: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  venue_id: number;
  venue_name: string;
  venue_type: "hall" | "lab" | "classroom" | "auditorium" | "ground" | "online" | "other";
  campus_block?: string;
  room_or_hall?: string;
  capacity?: number;
  is_indoor?: boolean;
  has_projector: boolean;
  has_audio: boolean;
  has_wifi: boolean;
  is_accessible: boolean;
  online_link?: string;
  created_at: string;
}

export type EventCategory = "technical" | "cultural" | "sports" | "workshop" | "seminar" | "other";
export type EventFormat = "competition" | "workshop" | "talk" | "seminar" | "performance" | "exhibition" | "meetup" | "hackathon" | "other";
export type EventMode = "offline" | "online" | "hybrid";
export type EventStatus = "draft" | "submitted" | "approved" | "published" | "completed" | "cancelled" | "archived";

export interface Event {
  event_id: number;
  event_code: string;
  event_name: string;
  short_name?: string;
  primary_department_id: number;
  category: EventCategory;
  format: EventFormat;
  venue_id?: number;
  event_mode: EventMode;
  participation_mode: "individual" | "team" | "audience" | "mixed";
  audience_type: "students" | "faculty" | "alumni" | "public" | "mixed";
  parent_event_name?: string;
  description?: string;
  objective?: string;
  target_audience?: string;
  rules_document_url?: string;
  poster_url?: string;
  registration_required: boolean;
  registration_fee: number;
  has_competition: boolean;
  has_certificates: boolean;
  max_participants?: number;
  min_team_size?: number;
  max_team_size?: number;
  registration_open_at?: string;
  registration_close_at?: string;
  event_start_at: string;
  event_end_at: string;
  result_publish_at?: string;
  status: EventStatus;
  created_by?: number;
  updated_by?: number;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  venue?: Venue;
}

export interface EventSession {
  session_id: number;
  event_id: number;
  session_name: string;
  session_type: "briefing" | "prelims" | "semifinals" | "finals" | "workshop_session" | "talk_session" | "performance_slot" | "other";
  round_number?: number;
  venue_id?: number;
  starts_at: string;
  ends_at: string;
  speaker_name?: string;
  resource_person_name?: string;
  capacity?: number;
  evaluation_weight?: number;
  status: "planned" | "ongoing" | "completed" | "cancelled" | "delayed";
  notes?: string;
  created_at: string;
}

export interface Team {
  team_id: number;
  event_id: number;
  team_name: string;
  team_code?: string;
  leader_participant_id?: number;
  created_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  team_member_id: number;
  team_id: number;
  participant_id: number;
  is_leader: boolean;
  joined_at: string;
  participant?: Participant;
}

export interface Registration {
  registration_id: number;
  event_id: number;
  participant_id: number;
  team_id?: number;
  registration_status: "pending" | "confirmed" | "waitlisted" | "cancelled" | "rejected";
  registration_source: "portal" | "walk_in" | "import" | "admin_entry";
  role_in_event: "contestant" | "attendee" | "volunteer" | "presenter" | "guest";
  eligibility_verified: boolean;
  verified_by?: number;
  verified_at?: string;
  payment_status: "not_applicable" | "pending" | "paid" | "failed" | "waived";
  amount_paid: number;
  registered_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  remarks?: string;
  created_at: string;
  participant?: Participant;
  event?: { event_name?: string; event_start_at?: string; event_code?: string; category?: string; status?: string };
  team?: { team_name?: string; team_code?: string };
}

export interface AttendanceLog {
  attendance_id: number;
  event_id: number;
  session_id?: number;
  participant_id: number;
  registration_id?: number;
  attendance_status: "present" | "absent" | "late" | "partial";
  check_in_at?: string;
  check_out_at?: string;
  attendance_source: "qr" | "manual" | "import" | "biometric" | "sheet";
  marked_by?: number;
  remarks?: string;
  created_at: string;
  participant?: { full_name?: string; roll_number?: string; university_email?: string };
  session?: { session_name?: string; session_type?: string };
}

export interface Judge {
  judge_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  affiliation?: string;
  expertise_area?: string;
  is_internal: boolean;
  created_at: string;
}

export interface Result {
  result_id: number;
  event_id: number;
  session_id?: number;
  participant_id?: number;
  team_id?: number;
  result_status: "winner" | "runner_up" | "finalist" | "participant" | "disqualified";
  rank_position?: number;
  prize_title?: string;
  prize_type?: string;
  prize_amount?: number;
  certificate_issued: boolean;
  certificate_url?: string;
  published_at?: string;
  remarks?: string;
  created_at: string;
  participant?: { full_name?: string; roll_number?: string; department_id?: number };
  team?: { team_name?: string; team_code?: string };
  event?: { event_name?: string; event_code?: string; category?: string };
}

export interface Feedback {
  feedback_id: number;
  event_id: number;
  session_id?: number;
  participant_id: number;
  overall_rating?: number;
  content_rating?: number;
  organization_rating?: number;
  venue_rating?: number;
  speaker_rating?: number;
  would_attend_again?: boolean;
  would_recommend?: boolean;
  best_aspect?: string;
  issues_faced?: string;
  suggestions?: string;
  submitted_at: string;
}

// Analytics view types
export interface DeptEventCount {
  department_name: string;
  total_events: number;
}

export interface TopEventRegistration {
  event_name: string;
  reg_count: number;
}

export interface EventConversionRate {
  event_name: string;
  total_registrations: number;
  total_attendance: number;
  conversion_rate: number;
}

export interface ParticipantRatio {
  event_name: string;
  internal_count: number;
  external_count: number;
}

export interface MonthlyEventFrequency {
  event_month: string;
  event_count: number;
}

export interface CategoryFeedback {
  category: string;
  avg_rating: number;
}

export interface ActiveOrganizer {
  full_name: string;
  events_managed: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}
