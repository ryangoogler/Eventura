-- ============================================================
-- EVENTURA — ANALYTICS VIEWS
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Events per month
CREATE OR REPLACE VIEW v_monthly_event_frequency AS
SELECT
  TO_CHAR(event_start_at, 'YYYY-MM') AS event_month,
  COUNT(event_id)                     AS event_count
FROM events
GROUP BY event_month ORDER BY event_month;

-- 2. Events by department
CREATE OR REPLACE VIEW v_dept_event_counts AS
SELECT d.department_name, COUNT(e.event_id) AS total_events
FROM departments d
LEFT JOIN events e ON d.department_id = e.primary_department_id
GROUP BY d.department_name ORDER BY total_events DESC;

-- 3. Top events by registrations
CREATE OR REPLACE VIEW v_top_events_registrations AS
SELECT e.event_name, e.category, d.department_name,
       COUNT(r.registration_id) AS reg_count
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN departments d ON e.primary_department_id = d.department_id
GROUP BY e.event_name, e.category, d.department_name
ORDER BY reg_count DESC;

-- 4. Registration to attendance conversion rate
CREATE OR REPLACE VIEW v_event_conversion_rates AS
SELECT e.event_name, e.category,
  COUNT(DISTINCT r.registration_id) AS total_registrations,
  COUNT(DISTINCT a.attendance_id)   AS total_attendance,
  ROUND((COUNT(DISTINCT a.attendance_id)::numeric
         / NULLIF(COUNT(DISTINCT r.registration_id),0))*100,2) AS conversion_rate
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN attendance_logs a ON e.event_id = a.event_id AND r.participant_id = a.participant_id
GROUP BY e.event_name, e.category;

-- 5. Internal vs external participants
CREATE OR REPLACE VIEW v_participant_ratio AS
SELECT e.event_name, e.category,
  SUM(CASE WHEN p.is_internal = true  THEN 1 ELSE 0 END) AS internal_count,
  SUM(CASE WHEN p.is_internal = false THEN 1 ELSE 0 END) AS external_count,
  COUNT(r.registration_id) AS total_participants
FROM events e
JOIN registrations r ON e.event_id = r.event_id
JOIN participants p ON r.participant_id = p.participant_id
GROUP BY e.event_name, e.category;

-- 6. Average feedback by category (with sub-ratings)
CREATE OR REPLACE VIEW v_category_feedback AS
SELECT e.category,
  ROUND(AVG(f.overall_rating)::numeric,      2) AS avg_overall_rating,
  ROUND(AVG(f.content_rating)::numeric,      2) AS avg_content_rating,
  ROUND(AVG(f.organization_rating)::numeric, 2) AS avg_organization_rating,
  COUNT(f.feedback_id) AS feedback_count
FROM events e
JOIN feedback f ON e.event_id = f.event_id
WHERE f.overall_rating IS NOT NULL
GROUP BY e.category;

-- 7. Most active organizers
CREATE OR REPLACE VIEW v_active_organizers AS
SELECT u.full_name, o.organizer_type,
       COUNT(DISTINCT eo.event_id) AS events_managed
FROM users u
JOIN organizers o ON u.user_id = o.user_id
JOIN event_organizers eo ON o.organizer_id = eo.organizer_id
GROUP BY u.full_name, o.organizer_type
ORDER BY events_managed DESC;

-- 8. Department participation volume (HODs view)
CREATE OR REPLACE VIEW v_dept_participation_volume AS
SELECT d.department_name,
  COUNT(DISTINCT r.registration_id) AS total_registrations,
  COUNT(DISTINCT r.participant_id)  AS unique_participants,
  COUNT(DISTINCT e.event_id)        AS events_hosted
FROM departments d
LEFT JOIN events e ON d.department_id = e.primary_department_id
LEFT JOIN registrations r ON e.event_id = r.event_id
GROUP BY d.department_name ORDER BY total_registrations DESC;

-- 9. Semester trend (events + registrations + unique participants by month)
CREATE OR REPLACE VIEW v_semester_trends AS
SELECT
  TO_CHAR(e.event_start_at, 'YYYY-MM') AS event_month,
  COUNT(DISTINCT e.event_id)            AS events_count,
  COUNT(DISTINCT r.registration_id)     AS total_registrations,
  COUNT(DISTINCT r.participant_id)      AS unique_participants
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
GROUP BY event_month ORDER BY event_month;

-- 10. Event fill rate (capacity utilisation)
CREATE OR REPLACE VIEW v_participation_rate AS
SELECT e.event_name, e.category, e.max_participants,
  COUNT(r.registration_id) AS registered,
  CASE WHEN e.max_participants IS NULL OR e.max_participants = 0 THEN NULL
       ELSE ROUND((COUNT(r.registration_id)::numeric/e.max_participants)*100,2)
  END AS fill_rate_pct
FROM events e
LEFT JOIN registrations r
  ON e.event_id = r.event_id
  AND r.registration_status IN ('confirmed','pending')
WHERE e.max_participants IS NOT NULL
GROUP BY e.event_name, e.category, e.max_participants
ORDER BY fill_rate_pct DESC NULLS LAST;

-- 11. Top performers across competitions
CREATE OR REPLACE VIEW v_top_performers AS
SELECT p.full_name, p.roll_number, d.department_name,
  COUNT(CASE WHEN res.result_status = 'winner'    THEN 1 END) AS gold_count,
  COUNT(CASE WHEN res.result_status = 'runner_up' THEN 1 END) AS silver_count,
  COUNT(CASE WHEN res.result_status = 'finalist'  THEN 1 END) AS finalist_count,
  COUNT(res.result_id) AS total_achievements
FROM participants p
JOIN results res ON p.participant_id = res.participant_id
LEFT JOIN departments d ON p.department_id = d.department_id
GROUP BY p.full_name, p.roll_number, d.department_name
ORDER BY gold_count DESC, silver_count DESC, total_achievements DESC;

-- 12. Inter-department comparison
CREATE OR REPLACE VIEW v_interdept_comparison AS
SELECT d.department_name,
  COUNT(DISTINCT e.event_id)       AS events_hosted,
  COUNT(DISTINCT r.participant_id) AS total_participants,
  ROUND(AVG(f.overall_rating)::numeric,2) AS avg_feedback_rating,
  COUNT(DISTINCT CASE WHEN p.is_internal = false THEN r.participant_id END) AS external_participants
FROM departments d
LEFT JOIN events e    ON d.department_id = e.primary_department_id
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN participants p  ON r.participant_id = p.participant_id
LEFT JOIN feedback f      ON e.event_id = f.event_id
GROUP BY d.department_name ORDER BY events_hosted DESC;

-- Grant access
GRANT SELECT ON v_monthly_event_frequency   TO authenticated;
GRANT SELECT ON v_dept_event_counts         TO authenticated;
GRANT SELECT ON v_top_events_registrations  TO authenticated;
GRANT SELECT ON v_event_conversion_rates    TO authenticated;
GRANT SELECT ON v_participant_ratio         TO authenticated;
GRANT SELECT ON v_category_feedback         TO authenticated;
GRANT SELECT ON v_active_organizers         TO authenticated;
GRANT SELECT ON v_dept_participation_volume TO authenticated;
GRANT SELECT ON v_semester_trends           TO authenticated;
GRANT SELECT ON v_participation_rate        TO authenticated;
GRANT SELECT ON v_top_performers            TO authenticated;
GRANT SELECT ON v_interdept_comparison      TO authenticated;
