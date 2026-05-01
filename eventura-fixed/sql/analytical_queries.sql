-- ============================================================
-- EVENTURA — ANALYTICAL SQL QUERIES
-- At least 5 meaningful queries demonstrating analytical SQL
-- Run individually in Supabase SQL Editor as needed
-- ============================================================

-- QUERY 1: Department Activity Ranking
-- Which departments are most active? Combines events hosted,
-- participants attracted, and average feedback into one score.
SELECT
  d.department_name,
  COUNT(DISTINCT e.event_id)             AS events_hosted,
  COUNT(DISTINCT r.participant_id)       AS total_participants,
  ROUND(AVG(f.overall_rating)::numeric, 2) AS avg_feedback,
  ROUND(
    (COUNT(DISTINCT e.event_id) * 0.4
     + COUNT(DISTINCT r.participant_id) * 0.4
     + COALESCE(AVG(f.overall_rating), 0) * 0.2)::numeric
  , 2) AS activity_score
FROM departments d
LEFT JOIN events e ON d.department_id = e.primary_department_id
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN feedback f ON e.event_id = f.event_id
GROUP BY d.department_name
ORDER BY activity_score DESC;

-- QUERY 2: Semester Participation Trend
-- How does student participation change month by month?
-- Useful for identifying peak event periods.
SELECT
  TO_CHAR(e.event_start_at, 'YYYY-MM')  AS month,
  e.category,
  COUNT(DISTINCT e.event_id)             AS events,
  COUNT(DISTINCT r.registration_id)      AS registrations,
  COUNT(DISTINCT CASE WHEN p.is_internal THEN r.participant_id END) AS internal,
  COUNT(DISTINCT CASE WHEN NOT p.is_internal THEN r.participant_id END) AS external
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN participants p ON r.participant_id = p.participant_id
GROUP BY month, e.category
ORDER BY month, e.category;

-- QUERY 3: Top Performers with Department Context
-- Students with the highest number of wins/podium finishes,
-- grouped by department for inter-department comparison.
SELECT
  d.department_name,
  p.full_name,
  p.roll_number,
  p.year_of_study,
  COUNT(CASE WHEN res.result_status = 'winner'    THEN 1 END) AS first_place,
  COUNT(CASE WHEN res.result_status = 'runner_up' THEN 1 END) AS second_place,
  COUNT(CASE WHEN res.result_status = 'finalist'  THEN 1 END) AS finals_reached,
  COUNT(res.result_id) AS total_results
FROM participants p
JOIN results res ON p.participant_id = res.participant_id
LEFT JOIN departments d ON p.department_id = d.department_id
WHERE p.is_internal = true
GROUP BY d.department_name, p.full_name, p.roll_number, p.year_of_study
HAVING COUNT(res.result_id) > 0
ORDER BY first_place DESC, second_place DESC, total_results DESC
LIMIT 20;

-- QUERY 4: Event Category Performance Summary
-- Which event categories attract the most participants,
-- generate the best feedback, and have the best attendance?
SELECT
  e.category,
  COUNT(DISTINCT e.event_id)             AS total_events,
  COUNT(DISTINCT r.registration_id)      AS total_registrations,
  COUNT(DISTINCT a.attendance_id)        AS total_attendance,
  ROUND(AVG(f.overall_rating)::numeric, 2) AS avg_rating,
  ROUND(
    (COUNT(DISTINCT a.attendance_id)::numeric
     / NULLIF(COUNT(DISTINCT r.registration_id), 0)) * 100, 2
  )                                      AS avg_conversion_pct
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN attendance_logs a ON e.event_id = a.event_id
LEFT JOIN feedback f ON e.event_id = f.event_id
GROUP BY e.category
ORDER BY total_registrations DESC;

-- QUERY 5: Individual Student Participation History
-- Full participation history for a given roll number.
-- Replace 'ROLL001' with the actual roll number.
SELECT
  e.event_name,
  e.category,
  TO_CHAR(e.event_start_at, 'DD Mon YYYY') AS event_date,
  d.department_name,
  r.role_in_event,
  r.registration_status,
  COALESCE(res.result_status, 'N/A') AS result,
  COALESCE(res.rank_position::text, '-') AS rank,
  COALESCE(res.prize_title, '-') AS prize
FROM participants p
JOIN registrations r ON p.participant_id = r.participant_id
JOIN events e ON r.event_id = e.event_id
LEFT JOIN departments d ON e.primary_department_id = d.department_id
LEFT JOIN results res ON e.event_id = res.event_id AND p.participant_id = res.participant_id
WHERE p.roll_number = 'ROLL001'  -- replace with actual roll number
ORDER BY e.event_start_at DESC;

-- QUERY 6: Null/Completeness Audit
-- Data quality check — how complete is our event data?
-- Highlights fields that need attention.
SELECT
  'events' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(description)      AS has_description,
  COUNT(venue_id)         AS has_venue,
  COUNT(max_participants) AS has_capacity,
  COUNT(poster_url)       AS has_poster,
  ROUND((COUNT(description)::numeric / COUNT(*))*100,1) AS pct_with_description
FROM events
UNION ALL
SELECT
  'participants',
  COUNT(*),
  COUNT(roll_number),
  COUNT(department_id),
  COUNT(year_of_study),
  COUNT(university_email),
  ROUND((COUNT(roll_number)::numeric / COUNT(*))*100,1)
FROM participants;

-- QUERY 7: Events with No Registrations (data gap analysis)
-- Find events that were published but got zero registrations.
SELECT
  e.event_name,
  e.category,
  d.department_name,
  TO_CHAR(e.event_start_at, 'DD Mon YYYY') AS event_date,
  e.status
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN departments d ON e.primary_department_id = d.department_id
WHERE r.registration_id IS NULL
  AND e.status IN ('published', 'completed')
ORDER BY e.event_start_at DESC;

-- QUERY 8: Year-of-Study Participation Breakdown
-- Which year of study participates the most?
SELECT
  p.year_of_study,
  COUNT(DISTINCT p.participant_id) AS unique_students,
  COUNT(r.registration_id)         AS total_registrations,
  ROUND(AVG(
    CASE WHEN res.result_status IS NOT NULL THEN 1.0 ELSE 0.0 END
  )*100, 1)                        AS result_entry_pct
FROM participants p
JOIN registrations r ON p.participant_id = r.participant_id
LEFT JOIN results res ON p.participant_id = res.participant_id
WHERE p.is_internal = true AND p.year_of_study IS NOT NULL
GROUP BY p.year_of_study
ORDER BY p.year_of_study;
