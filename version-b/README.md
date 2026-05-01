# Eventura — College Event Management Portal

A full-stack Next.js 15 event management system for DAV College — with role-based portals for **Admins**, **Organisers**, and **Participants**, an analytics dashboard with charts, and a natural-language **AI assistant** backed by Claude.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| AI | HuggingFace Inference API (Mistral-7B-Instruct) |
| Charts | Recharts |
| Hosting | Vercel |
| Styling | Plain CSS with CSS variables (no Tailwind runtime needed) |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         login · logout · me
│   │   ├── events/       CRUD + sessions
│   │   ├── registrations/  participants + teams
│   │   ├── attendance/   log check-ins
│   │   ├── results/      winners + certificates
│   │   ├── analytics/    reads all 7 Supabase views
│   │   ├── ai/           Claude-powered NL analytics
│   │   ├── departments/
│   │   ├── venues/
│   │   ├── participants/
│   │   ├── users/
│   │   ├── user-roles/
│   │   └── feedback/
│   ├── login/            Auth page
│   ├── admin/            Admin portal (dashboard, events, users, analytics, AI)
│   ├── organiser/        Organiser portal (events, participants, attendance, results, analytics, AI)
│   └── participant/      Participant portal (browse events, register, results, profile)
├── components/
│   ├── layout/Sidebar.tsx
│   └── forms/EventForm.tsx
├── lib/
│   └── supabase/         client · server · middleware
├── types/index.ts
└── middleware.ts
```

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo-url>
cd dav-portal
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. In the SQL Editor, run your **table creation script** (the one you already have)
3. Then run **`supabase-setup.sql`** from this repo — it sets up:
   - User role seeds (admin, management, organiser, participant)
   - Row Level Security (RLS) policies
   - The `safe_select` RPC function for the AI chatbot
   - `updated_at` triggers
   - View permissions

### 3. Create your first admin user

In Supabase Dashboard → **Authentication → Users → Invite user**, create a user with your email.

Then in SQL Editor:
```sql
-- Get the role_id for admin
SELECT role_id FROM user_roles WHERE role_name = 'admin';
-- e.g. returns 1

-- Insert into users table
INSERT INTO users (full_name, email, role_id)
VALUES ('Your Name', 'your@email.com', 1);
```

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://mrpifvozqgcpzunrrcxc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HUGGINGFACE_TOKEN=your-new-hf-read-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find these:**
- Supabase URL + Anon Key: Project Settings → API
- Service Role Key: Project Settings → API → `service_role` (keep secret!)
- HuggingFace Token: huggingface.co/settings/tokens → New token (Read role)

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Deploy to Vercel

### Option A: Vercel CLI (fastest)

```bash
npm i -g vercel
vercel
```

Follow the prompts, then add environment variables:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel --prod
```

### Option B: GitHub + Vercel Dashboard

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo
3. In **Environment Variables**, add all 5 variables from above
4. Click **Deploy**

Vercel auto-detects Next.js — no build config needed.

---

## Role-Based Access

| Role | Portal URL | Access |
|------|-----------|--------|
| `admin` | `/admin/dashboard` | Everything — users, events, analytics, AI |
| `management` | `/admin/dashboard` | Read-only analytics, dashboards, AI |
| `organiser` | `/organiser/events` | Create/manage events, participants, attendance, results, AI |
| `participant` | `/participant/events` | Browse events, register, view results |

### Creating users

Admins can create users from `/admin/users`. This calls Supabase Auth + inserts a record into `users` table with the correct `role_id`.

Alternatively via SQL:
```sql
-- Create organiser
INSERT INTO users (full_name, email, phone, role_id, department_id)
VALUES ('Dr. Jane Smith', 'jane@dav.edu.in', '9876543210',
  (SELECT role_id FROM user_roles WHERE role_name = 'organiser'),
  (SELECT department_id FROM departments WHERE department_code = 'CS')
);
```

---

## AI Assistant

The AI chatbot (`/admin/ai` and `/organiser/ai`) uses Claude to answer natural language questions about your event data.

**How it works:**
1. First tries to answer from your 7 pre-built analytics views
2. If the question needs more detail, generates a safe `SELECT` query via `safe_select` RPC
3. All mutating SQL (`INSERT`, `UPDATE`, `DELETE`, etc.) is blocked at both the application and database level

**Example questions:**
- *"Which department runs the most events?"*
- *"What's the attendance conversion rate for technical events?"*
- *"Who are the top 5 most active organisers?"*
- *"How many external participants joined workshops this month?"*

**Enabling the "Preload context" toggle** sends all view data in the system prompt for more accurate answers (uses more tokens).

---

## Analytics Views

The portal reads from these pre-built Supabase views:

| View | Description |
|------|-------------|
| `v_dept_event_counts` | Events per department |
| `v_top_events_registrations` | Top events by registrations |
| `v_event_conversion_rates` | Registration → attendance % |
| `v_participant_ratio` | Internal vs external per event |
| `v_monthly_event_frequency` | Events per month |
| `v_category_feedback` | Avg feedback rating per category |
| `v_active_organizers` | Organisers by events managed |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/login` | Sign in with email + password |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user + profile |

### Events
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/events` | List events (filter: status, category, department_id) |
| POST | `/api/events` | Create event (with sessions, departments, organizers) |
| GET | `/api/events/[id]` | Get full event with sessions, organizers |
| PATCH | `/api/events/[id]` | Update event |
| DELETE | `/api/events/[id]` | Archive event |

### Registrations
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/registrations` | List (filter: event_id, participant_id, status) |
| POST | `/api/registrations` | Register participant (creates participant + team if needed) |
| GET | `/api/registrations/[id]` | Get single registration |
| PATCH | `/api/registrations/[id]` | Update status (confirm/cancel/waitlist) |

### Attendance
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/attendance` | Get logs (filter: event_id, session_id) |
| POST | `/api/attendance` | Mark attendance (single or bulk array) |

### Results
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/results` | Get results (filter: event_id, session_id) |
| POST | `/api/results` | Add result(s) |
| PATCH | `/api/results` | Update result (e.g. issue certificate) |

### Analytics
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/analytics` | All views + summary stats |
| GET | `/api/analytics?view=top_events` | Single view |

### AI
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/ai` | Chat with analytics AI (body: `{messages, preload_context}`) |

---

## Troubleshooting

**Login redirects back to login page**
→ Make sure you've inserted the user into the `users` table with a valid `role_id` after creating them in Supabase Auth.

**"relation does not exist" errors**
→ Run the table creation SQL first, then `supabase-setup.sql`.

**AI chatbot returns "Raw SQL not available"**
→ Run the `safe_select` function from `supabase-setup.sql` in your Supabase SQL Editor.

**Charts show empty / no data**
→ Your analytics views work on live data. Add some events and registrations first, or check that `GRANT SELECT ON v_... TO authenticated` ran successfully.

**Vercel build fails**
→ Ensure all 5 environment variables are set in your Vercel project settings before deploying.
