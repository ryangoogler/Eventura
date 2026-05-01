[README.md](https://github.com/user-attachments/files/27285879/README.md)# Eventura — Collegiate Event Management Portal

A full-stack event management portal built for DAV college networks. Eventura handles the complete lifecycle of collegiate events — from creation and registration through attendance, results, analytics, and AI-assisted data exploration.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Routes](#api-routes)
- [Role-Based Access](#role-based-access)
- [Analytics Views](#analytics-views)
- [AI Assistant](#ai-assistant)
- [Known Limitations & Planned Features](#known-limitations--planned-features)

---

## Overview

Eventura is a **Next.js 15** application backed by **Supabase** (PostgreSQL + Auth). It operates in **demo mode** — authentication is bypassed and role selection happens on the home page. Full login/signup infrastructure exists in the codebase and is ready to be enabled.

Three role views are available:

| Role | Entry Point | Key Capabilities |
|---|---|---|
| **Admin** | `/admin/dashboard` | Full system control, user management, analytics, AI assistant |
| **Organiser** | `/organiser/events` | Create/edit events, manage participants, attendance, results |
| **Participant** | `/participant/events` | Browse events, register, view results and registrations |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (infrastructure present, bypassed in demo mode) |
| Supabase Client | `@supabase/supabase-js` v2 + `@supabase/ssr` v0.6 |
| Charts | Recharts v2 |
| Icons | Lucide React |
| Fonts | DM Serif Display, DM Sans, JetBrains Mono (Google Fonts) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| AI Model | Mistral-7B-Instruct-v0.3 via HuggingFace Inference API |
| Date Utilities | date-fns v4 |
| Utilities | clsx |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Role picker (home)
│   ├── login/page.tsx            # Login page (unused in demo mode)
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── events/page.tsx
│   │   ├── users/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── ai/page.tsx
│   ├── organiser/
│   │   ├── layout.tsx
│   │   ├── events/page.tsx
│   │   ├── participants/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── results/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── ai/page.tsx
│   ├── participant/
│   │   ├── layout.tsx
│   │   ├── events/page.tsx
│   │   ├── registrations/page.tsx
│   │   ├── results/page.tsx
│   │   └── profile/page.tsx
│   └── api/                      # All API routes (see below)
├── components/
│   ├── layout/Sidebar.tsx
│   └── forms/EventForm.tsx
├── lib/supabase/
│   ├── server.ts                 # createClient() + createAdminClient()
│   ├── client.ts                 # Browser-side Supabase client
│   └── middleware.ts             # SSR session helper
├── middleware.ts                 # Route middleware (open in demo mode)
└── types/index.ts                # Full TypeScript interfaces for all DB entities
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works fine)
- A HuggingFace account with a Read token (for the AI assistant)

### Installation

```bash
# 1. Extract the project zip
unzip dav-portal-version-b-no-login.zip
cd version-b

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.local.example .env.local
# Edit .env.local with your actual keys

# 4. Run the database setup (see Database Setup)

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Edit `.env.local` — **all three values are required**:

```env
# From Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# From Supabase → Project Settings → API → service_role
# This key bypasses Row Level Security — keep it secret, never commit it
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# From huggingface.co/settings/tokens → New token (Read role)
HUGGINGFACE_TOKEN=hf_...your-token...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important:** Every time this project is shared or re-deployed, regenerate the `SUPABASE_SERVICE_ROLE_KEY` and `HUGGINGFACE_TOKEN` before adding them to `.env.local`. Never commit `.env.local` to version control.

---

## Database Setup

Run these scripts **in order** in the Supabase SQL Editor (Dashboard → SQL Editor):

### Step 1 — Schema

Run the full schema from `supabase-setup.sql` in the project root. This creates all tables, RLS policies, triggers, and helper functions.

### Step 2 — Analytics Views

Run the following to create the 7 analytics views the portal depends on:

```sql
CREATE OR REPLACE VIEW v_monthly_event_frequency AS
SELECT TO_CHAR(event_start_at, 'YYYY-MM') AS event_month, COUNT(event_id) AS event_count
FROM events GROUP BY event_month ORDER BY event_month;

CREATE OR REPLACE VIEW v_dept_event_counts AS
SELECT d.department_name, COUNT(e.event_id) AS total_events
FROM departments d LEFT JOIN events e ON d.department_id = e.primary_department_id
GROUP BY d.department_name ORDER BY total_events DESC;

CREATE OR REPLACE VIEW v_top_events_registrations AS
SELECT e.event_name, COUNT(r.registration_id) AS reg_count
FROM events e LEFT JOIN registrations r ON e.event_id = r.event_id
GROUP BY e.event_name ORDER BY reg_count DESC;

CREATE OR REPLACE VIEW v_event_conversion_rates AS
SELECT e.event_name,
  COUNT(DISTINCT r.registration_id) AS total_registrations,
  COUNT(DISTINCT a.attendance_id) AS total_attendance,
  ROUND((COUNT(DISTINCT a.attendance_id)::numeric / NULLIF(COUNT(DISTINCT r.registration_id),0))*100, 2) AS conversion_rate
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
LEFT JOIN attendance_logs a ON e.event_id = a.event_id AND r.participant_id = a.participant_id
GROUP BY e.event_name;

CREATE OR REPLACE VIEW v_participant_ratio AS
SELECT e.event_name,
  SUM(CASE WHEN p.is_internal = true THEN 1 ELSE 0 END) AS internal_count,
  SUM(CASE WHEN p.is_internal = false THEN 1 ELSE 0 END) AS external_count
FROM events e
JOIN registrations r ON e.event_id = r.event_id
JOIN participants p ON r.participant_id = p.participant_id
GROUP BY e.event_name;

CREATE OR REPLACE VIEW v_category_feedback AS
SELECT e.category, ROUND(AVG(f.overall_rating)::numeric, 2) AS avg_rating
FROM events e JOIN feedback f ON e.event_id = f.event_id
WHERE f.overall_rating IS NOT NULL GROUP BY e.category;

CREATE OR REPLACE VIEW v_active_organizers AS
SELECT u.full_name, COUNT(eo.event_id) AS events_managed
FROM users u
JOIN organizers o ON u.user_id = o.user_id
JOIN event_organizers eo ON o.organizer_id = eo.organizer_id
GROUP BY u.full_name ORDER BY events_managed DESC;

-- Grant access
GRANT SELECT ON v_monthly_event_frequency TO authenticated;
GRANT SELECT ON v_dept_event_counts TO authenticated;
GRANT SELECT ON v_top_events_registrations TO authenticated;
GRANT SELECT ON v_event_conversion_rates TO authenticated;
GRANT SELECT ON v_participant_ratio TO authenticated;
GRANT SELECT ON v_category_feedback TO authenticated;
GRANT SELECT ON v_active_organizers TO authenticated;
```

### Step 3 — Verify

Test a view: `SELECT * FROM v_dept_event_counts LIMIT 5;`

---

## API Routes

All routes use the Supabase **service role client** and are open (no auth guard) in demo mode.

| Method | Route | Description |
|---|---|---|
| GET | `/api/events` | List events with filters (status, category, department, pagination) |
| POST | `/api/events` | Create a new event with optional sessions and organizers |
| GET | `/api/events/[id]` | Get full event detail with sessions, organizers, departments |
| PATCH | `/api/events/[id]` | Update event fields |
| DELETE | `/api/events/[id]` | Archive event (sets status to `archived`) |
| GET | `/api/participants` | List participants or get registrations for a specific event |
| POST | `/api/participants` | Upsert participant by university email |
| GET | `/api/registrations` | List registrations with filters |
| POST | `/api/registrations` | Register participant, handle team creation, check capacity |
| GET | `/api/registrations/[id]` | Get single registration with full relations |
| PATCH | `/api/registrations/[id]` | Update registration status (confirm, cancel, waitlist) |
| GET | `/api/results` | List results for an event or session |
| POST | `/api/results` | Insert single or bulk results |
| PATCH | `/api/results` | Update result (e.g. mark certificate issued) |
| GET | `/api/attendance` | List attendance logs |
| POST | `/api/attendance` | Mark attendance (single or bulk upsert) |
| GET | `/api/analytics` | Full analytics payload from all 7 views + summary counts |
| GET | `/api/users` | List users with role and department |
| POST | `/api/users` | Create user (creates Supabase Auth account + users table row) |
| PATCH | `/api/users` | Update user fields |
| GET | `/api/departments` | List active departments |
| GET | `/api/venues` | List venues |
| GET | `/api/user-roles` | List all roles |
| GET | `/api/feedback` | List feedback for an event |
| POST | `/api/feedback` | Submit feedback (upsert) |
| POST | `/api/ai` | Send message to AI assistant, optionally preload analytics context |
| POST | `/api/auth/setup-demo` | Create demo accounts in Supabase Auth + users table |

---

## Role-Based Access

In demo mode, role is stored in `sessionStorage` under the key `portal_role`. Each role section has its own layout and sidebar navigation:

**Admin** — Dashboard, Events, Users, Analytics, AI Assistant

**Organiser** — My Events, Participants, Attendance, Results, Analytics, AI Assistant

**Participant** — Browse Events, My Registrations, My Results, Profile

Clicking "Switch Role" in the sidebar clears sessionStorage and returns to the role picker at `/`.

---

## Analytics Views

The Analytics page queries 7 Supabase views and renders them as interactive Recharts visualisations:

| View | Chart Type | Description |
|---|---|---|
| `v_monthly_event_frequency` | Line chart | Events run per calendar month |
| `v_dept_event_counts` | Horizontal bar chart | Event count per department |
| `v_top_events_registrations` | Bar chart | Top 10 events by registration count |
| `v_category_feedback` | Pie chart | Average feedback rating by event category |
| `v_event_conversion_rates` | Bar chart | Registration-to-attendance conversion % |
| `v_participant_ratio` | Stacked bar chart | Internal vs external participants per event |
| `v_active_organizers` | Table with bar indicator | Organizers ranked by events managed |

Summary stat cards at the top (Total Events, Active Events, Total Registrations, Unique Participants) query the base tables directly.

---

## AI Assistant

The AI assistant is available to Admin and Organiser roles at `/admin/ai` and `/organiser/ai`.

**Model:** `mistralai/Mistral-7B-Instruct-v0.3` via HuggingFace Inference API

**How it works:**
1. User sends a natural language question
2. The route builds a Mistral instruct-format prompt with the database schema context
3. If the model generates a `{"sql": "..."}` block, the route executes it safely via the `safe_select` RPC function (read-only, blocks mutating keywords)
4. Query results are returned alongside the model's text response and rendered as a table in the chat UI

**Context preloading:** Toggle "Include data context" to send a snapshot of all 7 analytics views to the model before it responds — improves accuracy for specific data questions at the cost of higher token usage.

**Requires:** `HUGGINGFACE_TOKEN` in `.env.local` with access to the Mistral model. Free HuggingFace accounts may hit rate limits on this model.

---

## Known Limitations & Planned Features

| Area | Current State | Planned |
|---|---|---|
| Authentication | Demo mode — role picker, no login | Full Supabase Auth login/signup |
| Role enforcement | Client-side only (sessionStorage) | Server-side middleware JWT checks |
| AI model | HuggingFace free tier (rate limited, slower) | Upgrade to Claude API or GPT-4o |
| File uploads | Not implemented | Poster/document uploads via Supabase Storage |
| Email notifications | Not implemented | Registration confirmation emails |
| QR attendance | Not implemented | QR code generation + scan flow |
| Certificate generation | Not implemented | PDF certificate generation on result publish |
| Mobile | Responsive but not native | PWA or React Native app |

