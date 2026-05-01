# Eventura — College Event Statistics Portal

> **Live URL:** https://eventura-8prmwone6-ryangooglers-projects.vercel.app/admin/ai 
> **GitHub:** https://github.com/ryangoogler/Eventura  
> **Course:** Data Analytics & Visualization — Mini Project  
> **Team:** 2 students | **Instructors:** K. Shivaprasad, Nitish Hegde

---

## What It Does

Eventura is a centralised web portal for managing and analysing college events across departments. It replaces scattered spreadsheets with a structured system where:

- **Organisers** log events, manage participant registrations, track attendance, and publish results
- **Administrators** manage users, view system-wide analytics, and interact with an AI data assistant
- **Participants** browse published events, register, and view their results and history
- **HODs / Management** see department-wise analytics, participation trends, and inter-department comparisons

---

## Architecture Diagram

```
Browser (Next.js React)
        │
        ▼
Next.js API Routes (/api/*)          ← Server-side, uses service role key
        │
        ▼
Supabase (PostgreSQL)                ← Cloud-hosted, RLS-enabled
  ├── 19 tables (raw event data)
  ├── 12 analytics views (derived)
  └── safe_select() RPC (read-only SQL)
        │
        ▼
HuggingFace Inference API            ← Mistral-7B-Instruct-v0.3
(AI natural language queries)

Python Pipeline (standalone)         ← Data cleaning + Matplotlib charts
        │
        └── Supabase (read/write via service role)
```

*ER diagram: see `sql/schema_erd.png` (to be added after export from Supabase)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19, TypeScript 5 |
| Database | Supabase (PostgreSQL 15, cloud-hosted) |
| Auth client | `@supabase/supabase-js` v2, `@supabase/ssr` v0.6 |
| Charts (web) | Recharts v2 |
| Charts (Python) | Matplotlib 3.9, Seaborn 0.13 |
| Data pipeline | Python 3.11, Pandas 2.2 |
| AI model | Mistral-7B-Instruct-v0.3 via HuggingFace Inference API |
| Hosting | Vercel (app), Supabase (database) |
| Styling | Tailwind CSS v4 + CSS custom properties |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Supabase project (free tier)
- A HuggingFace account with a Read API token

### 1 — Clone and install

```bash
git clone https://github.com/ryangoogler/Eventura
cd Eventura/version-b
npm install
```

### 2 — Environment variables

Create `version-b/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
HUGGINGFACE_TOKEN=hf_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Never commit `.env.local`** — it is in `.gitignore`.  
> For Vercel deployment, add these via **Project Settings → Environment Variables**.

### 3 — Database setup

In Supabase SQL Editor, run the following scripts **in order**:

1. `sql/schema.sql` — creates all 19 tables, RLS policies, triggers
2. `sql/analytics_views.sql` — creates 12 analytics views
3. `sql/analytical_queries.sql` — reference queries (run individually as needed)

Verify with: `SELECT * FROM v_dept_event_counts LIMIT 5;`

### 4 — Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5 — Python pipeline (optional but required for submission)

```bash
cd pipeline
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create pipeline/.env with your Supabase credentials
echo "SUPABASE_URL=..." > .env
echo "SUPABASE_SERVICE_ROLE_KEY=..." >> .env

python clean_and_load.py     # clean and validate data
python compute_metrics.py    # generate charts in pipeline/charts/
```

---

## Role Access

Select your role on the home page — no login required in demo mode.

| Role | Entry | Capabilities |
|---|---|---|
| Admin | `/admin/dashboard` | Full system, users, analytics, AI |
| Organiser | `/organiser/events` | Events, participants, attendance, results, analytics |
| Participant | `/participant/events` | Browse events, register, view results |

---

## Analytics Views (SQL)

12 PostgreSQL views power the dashboard. Run `sql/analytics_views.sql` to create them.

| View | Brief Requirement |
|---|---|
| `v_dept_event_counts` | Department-wise event count |
| `v_top_events_registrations` | Top events by participation |
| `v_event_conversion_rates` | Registration-to-attendance conversion |
| `v_participant_ratio` | Internal vs external ratio |
| `v_monthly_event_frequency` | Events per month |
| `v_category_feedback` | Avg feedback by category |
| `v_active_organizers` | Active organizers ranking |
| `v_dept_participation_volume` | HODs — participation volume per dept |
| `v_semester_trends` | Composite semester trend |
| `v_participation_rate` | Event capacity fill rate |
| `v_top_performers` | Top competition performers |
| `v_interdept_comparison` | Inter-department comparison |

---

## Analytical SQL Queries

See `sql/analytical_queries.sql` for 8 documented queries covering:

1. Department activity ranking (composite score)
2. Semester participation trend by category
3. Top performers with department context
4. Event category performance summary
5. Individual student participation history
6. Null/completeness audit
7. Events with no registrations
8. Year-of-study participation breakdown

---

## Deliverables Checklist

- [x] Working web portal — deployed at live URL above
- [ ] ER diagram — export from Supabase and add to `sql/schema_erd.png`
- [x] SQL scripts — `sql/schema.sql`, `sql/analytics_views.sql`, `sql/analytical_queries.sql`
- [x] Python processing scripts — `pipeline/clean_and_load.py`, `pipeline/compute_metrics.py`
- [x] Dashboard / visualisation — embedded Recharts + Python Matplotlib charts
- [x] Final report — `Eventura_Technical_Report.docx`

---

## Known Limitations

- Authentication is in demo mode (role picked on home page, not login-gated)
- HuggingFace free tier is rate-limited; AI responses may be slow
- Python pipeline charts are standalone (not embedded in web UI) — generated separately
