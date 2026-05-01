-- ============================================================
-- DAV EVENT PORTAL — SUPABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor after creating your tables
-- ============================================================

-- 1. SEED USER ROLES
-- ============================================================
INSERT INTO user_roles (role_name, description) VALUES
  ('admin',       'Full system access — manage users, events, analytics'),
  ('management',  'Read access to all analytics and dashboards'),
  ('organiser',   'Create and manage events, participants, attendance, results'),
  ('participant', 'Browse events, register, view results')
ON CONFLICT (role_name) DO NOTHING;


-- 2. SAFE SELECT RPC (for AI chatbot raw SQL fallback)
-- ============================================================
-- This function allows the AI assistant to run read-only SELECT
-- queries safely via Supabase RPC.
CREATE OR REPLACE FUNCTION safe_select(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Block any mutating keywords
  IF query ~* '\m(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC|EXECUTE)\M' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block multiple statements
  IF query LIKE '%;%' THEN
    RAISE EXCEPTION 'Multiple statements not allowed';
  END IF;

  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION safe_select(text) TO authenticated;


-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_organizers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_judges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles        ENABLE ROW LEVEL SECURITY;


-- 4. HELPER FUNCTION: get current user's role name
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ur.role_name
  FROM users u
  JOIN user_roles ur ON u.role_id = ur.role_id
  WHERE u.email = auth.jwt()->>'email'
  LIMIT 1;
$$;


-- 5. RLS POLICIES
-- ============================================================

-- departments: readable by all authenticated
CREATE POLICY "departments_read" ON departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "departments_write_admin" ON departments
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'management'));

-- user_roles: readable by all
CREATE POLICY "user_roles_read" ON user_roles
  FOR SELECT TO authenticated USING (true);

-- venues: readable by all authenticated
CREATE POLICY "venues_read" ON venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "venues_write_admin" ON venues
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- users: admins see all; others see own row
CREATE POLICY "users_admin_all" ON users
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "users_self_read" ON users
  FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');

CREATE POLICY "users_self_update" ON users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email');

-- events: published events visible to all; admins/organisers see all
CREATE POLICY "events_published_read" ON events
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR get_my_role() IN ('admin', 'management', 'organiser')
  );

CREATE POLICY "events_write_organiser" ON events
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'organiser'));

CREATE POLICY "events_update_organiser" ON events
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- event_sessions
CREATE POLICY "sessions_read" ON event_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sessions_write" ON event_sessions
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- event_organizers
CREATE POLICY "event_organizers_read" ON event_organizers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_organizers_write" ON event_organizers
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- event_departments
CREATE POLICY "event_departments_read" ON event_departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_departments_write" ON event_departments
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- organizers
CREATE POLICY "organizers_read" ON organizers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "organizers_write" ON organizers
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- participants: admins/organisers see all; participants see own row
CREATE POLICY "participants_admin_read" ON participants
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "participants_self_read" ON participants
  FOR SELECT TO authenticated
  USING (
    university_email = auth.jwt()->>'email'
    OR personal_email = auth.jwt()->>'email'
  );

CREATE POLICY "participants_insert" ON participants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "participants_self_update" ON participants
  FOR UPDATE TO authenticated
  USING (
    university_email = auth.jwt()->>'email'
    OR personal_email = auth.jwt()->>'email'
    OR get_my_role() IN ('admin', 'organiser')
  );

-- registrations
CREATE POLICY "registrations_admin_read" ON registrations
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "registrations_insert" ON registrations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "registrations_update_organiser" ON registrations
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- attendance_logs
CREATE POLICY "attendance_admin_read" ON attendance_logs
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "attendance_write" ON attendance_logs
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- results: published results visible to all; others admin/organiser
CREATE POLICY "results_published_read" ON results
  FOR SELECT TO authenticated
  USING (published_at IS NOT NULL OR get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "results_write" ON results
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- feedback
CREATE POLICY "feedback_admin_read" ON feedback
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "feedback_insert" ON feedback
  FOR INSERT TO authenticated WITH CHECK (true);

-- teams
CREATE POLICY "teams_read" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "teams_write" ON teams
  FOR ALL TO authenticated USING (true);

-- team_members
CREATE POLICY "team_members_read" ON team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_write" ON team_members
  FOR ALL TO authenticated USING (true);

-- judges
CREATE POLICY "judges_read" ON judges
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'management', 'organiser'));

CREATE POLICY "judges_write" ON judges
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));

-- event_judges
CREATE POLICY "event_judges_read" ON event_judges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_judges_write" ON event_judges
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'organiser'));


-- 6. GRANT VIEW ACCESS TO AUTHENTICATED USERS
-- ============================================================
GRANT SELECT ON v_dept_event_counts        TO authenticated;
GRANT SELECT ON v_top_events_registrations TO authenticated;
GRANT SELECT ON v_event_conversion_rates   TO authenticated;
GRANT SELECT ON v_participant_ratio        TO authenticated;
GRANT SELECT ON v_monthly_event_frequency  TO authenticated;
GRANT SELECT ON v_category_feedback        TO authenticated;
GRANT SELECT ON v_active_organizers        TO authenticated;


-- 7. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER events_updated_at      BEFORE UPDATE ON events      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- DONE — your database is ready!
-- ============================================================
