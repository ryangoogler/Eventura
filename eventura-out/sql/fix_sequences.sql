-- ============================================================
-- FIX DUPLICATE KEY ERRORS — Reset BIGSERIAL sequences
-- Run this in Supabase SQL Editor if you get:
--   "duplicate key value violates unique constraint *_pkey"
-- 
-- This happens when rows were inserted directly via SQL
-- (bypassing the sequence counter). This script syncs
-- each sequence to max(id)+1 so new inserts don't conflict.
-- ============================================================

SELECT setval('events_event_id_seq',        COALESCE((SELECT MAX(event_id)        FROM events),        1));
SELECT setval('results_result_id_seq',       COALESCE((SELECT MAX(result_id)       FROM results),       1));
SELECT setval('participants_participant_id_seq', COALESCE((SELECT MAX(participant_id) FROM participants), 1));
SELECT setval('registrations_registration_id_seq', COALESCE((SELECT MAX(registration_id) FROM registrations), 1));
SELECT setval('users_user_id_seq',           COALESCE((SELECT MAX(user_id)         FROM users),         1));
SELECT setval('departments_department_id_seq', COALESCE((SELECT MAX(department_id)  FROM departments),   1));
SELECT setval('venues_venue_id_seq',         COALESCE((SELECT MAX(venue_id)        FROM venues),        1));
SELECT setval('teams_team_id_seq',           COALESCE((SELECT MAX(team_id)         FROM teams),         1));
SELECT setval('attendance_logs_attendance_id_seq', COALESCE((SELECT MAX(attendance_id) FROM attendance_logs), 1));
SELECT setval('feedback_feedback_id_seq',    COALESCE((SELECT MAX(feedback_id)     FROM feedback),      1));
SELECT setval('organizers_organizer_id_seq', COALESCE((SELECT MAX(organizer_id)    FROM organizers),    1));

-- Verify — all should show a number >= 1
SELECT 'events'        AS tbl, last_value FROM events_event_id_seq
UNION ALL
SELECT 'results',      last_value FROM results_result_id_seq
UNION ALL
SELECT 'participants', last_value FROM participants_participant_id_seq
UNION ALL
SELECT 'registrations',last_value FROM registrations_registration_id_seq
UNION ALL
SELECT 'users',        last_value FROM users_user_id_seq;
