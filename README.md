# Eventura — College Event Statistics Portal

> **Live demo:** [eventura-ryangooglers-projects.vercel.app](https://eventura-ryangooglers-projects.vercel.app)  
> **Course:** Data Analytics & Visualization — Mini Project  
> **Team:** 2 students &nbsp;|&nbsp; **Instructors:** K. Shivaprasad, Nitish Hegde &nbsp;|&nbsp; DAV Institution, 2025–26

---

## What is Eventura?

Eventura replaces scattered spreadsheets, WhatsApp messages, and paper registers with a single structured portal for managing and analysing college events. It serves four groups:

- **Organisers** — create events, manage registrations, record attendance, publish results
- **Administrators** — manage users, view system-wide analytics, run AI-powered queries
- **Participants** — browse published events, register, track their results and history
- **HODs / Management** — department-wise trends, participation comparisons, feedback summaries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 |
| Database | Supabase — PostgreSQL 15, cloud-hosted, RLS-enabled |
| Auth | `@supabase/ssr` v0.6, `@supabase/supabase-js` v2 |
| Charts (web) | Recharts v2, Lucide React |
| AI assistant | Mistral-7B-Instruct-v0.3 via HuggingFace Inference API |
| Python pipeline | Python 3.11, Pandas 2.2, Matplotlib 3.9, Seaborn 0.13 |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (app) + Supabase (database) |

---

## Architecture

```
Browser (Next.js / React)
         │
         ▼
Next.js API Routes (/api/*)        ← server-side only; holds all secrets
         │
         ├──► Supabase PostgreSQL   ← 19 tables · 12 analytics views · RLS
         │       └── safe_select()  ← read-only RPC used by AI assistant
         │
         └──► HuggingFace Inference API
                 └── Mistral-7B-Instruct-v0.3

Python Pipeline (standalone)
         └──► Supabase (service role, read-write)
                 └── Generates pipeline/charts/*.png + metrics.json
```

**Security note:** the Supabase service role key and `HUGGINGFACE_TOKEN` are never sent to the browser — all API calls go through Next.js server routes.

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── admin/          # Admin dashboard, analytics, AI, users, events
│   │   ├── organiser/      # Event management, participants, attendance, results
│   │   ├── participant/    # Browse events, register, view results
│   │   ├── api/            # All REST endpoints (events, auth, AI, analytics, …)
│   │   └── login/
│   ├── components/
│   │   ├── forms/          # EventForm and other shared forms
│   │   └── layout/         # Sidebar
│   ├── lib/supabase/       # Client, server, and middleware helpers
│   └── types/              # Shared TypeScript types
├── pipeline/
│   ├── clean_and_load.py   # Data cleaning + Supabase write-back
│   ├── compute_metrics.py  # Chart generation + metrics.json
│   └── requirements.txt
├── supabase-setup.sql      # Seed data, safe_select() RPC, demo users
├── .env.local.example
└── README.md
```

> SQL schema and analytics views are maintained separately — see the [SQL scripts](#database-setup) section below.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [HuggingFace](https://huggingface.co) account with a Read token

### 1. Clone and install

```bash
git clone https://github.com/ryangoogler/Eventura
cd Eventura
npm install
```

### 2. Environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
HUGGINGFACE_TOKEN=hf_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Never commit `.env.local`** — it is in `.gitignore`. For Vercel, add these under **Project Settings → Environment Variables**.

### 3. Database setup

Run these scripts **in order** in the Supabase SQL Editor:

| Order | File | What it does |
|---|---|---|
| 1 | `sql/schema.sql` | Creates all 19 tables, RLS policies, triggers |
| 2 | `sql/analytics_views.sql` | Creates 12 analytics views |
| 3 | `supabase-setup.sql` | Seeds roles, creates `safe_select()` RPC, sets up demo users |
| 4 | `sql/analytical_queries.sql` | Reference queries — run individually as needed |

Verify setup: `SELECT * FROM v_dept_event_counts LIMIT 5;`

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Python pipeline

The pipeline is standalone — it connects directly to Supabase and does not require the web app to be running.

```bash
cd pipeline
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create pipeline/.env
echo "SUPABASE_URL=https://your-project.supabase.co" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=eyJ..." >> .env

python clean_and_load.py        # Clean and validate data, write back to Supabase
python compute_metrics.py       # Generate charts → pipeline/charts/
```

---

## Role Access

Select your role on the home page — no login required in demo mode.

| Role | Entry point | Key capabilities |
|---|---|---|
| Admin | `/admin/dashboard` | Full system access, users, analytics, AI assistant |
| Organiser | `/organiser/events` | Create events, manage participants, attendance, results |
| Participant | `/participant/events` | Browse events, register, view results and history |

---

## Analytics Views

12 PostgreSQL views separate derived data from raw tables. All are created by `sql/analytics_views.sql`.

| View | What it shows |
|---|---|
| `v_dept_event_counts` | Events hosted per department |
| `v_top_events_registrations` | Top events by registration count |
| `v_event_conversion_rates` | Registration-to-attendance % per event |
| `v_participant_ratio` | Internal vs external participants per event |
| `v_monthly_event_frequency` | Events per calendar month |
| `v_category_feedback` | Average feedback ratings by event category |
| `v_active_organizers` | Organisers ranked by events managed |
| `v_dept_participation_volume` | Registrations and unique participants per department |
| `v_semester_trends` | Composite monthly trend (events + registrations + participants) |
| `v_participation_rate` | Capacity fill rate per event |
| `v_top_performers` | Winners and runners-up across competitions |
| `v_interdept_comparison` | Side-by-side department comparison with feedback |

---

## Python Pipeline — Output Charts

`compute_metrics.py` reads from the analytics views and writes 8 charts to `pipeline/charts/`:

| File | Metric |
|---|---|
| `01_monthly_trend.png` | Events + registrations composite line/bar |
| `02_dept_events.png` | Events hosted per department (horizontal bar) |
| `03_top_events.png` | Top 10 events by registration count |
| `04_category_breakdown.png` | Category distribution donut + feedback grouped bar |
| `05_internal_external.png` | Internal vs external participants stacked bar |
| `06_conversion_rates.png` | Registration-to-attendance conversion % |
| `07_dept_participation.png` | Department registrations, unique participants, events (grouped bar) |
| `08_top_performers.png` | Top students by wins, runner-up, finalist count |

Derived metrics are also saved to `pipeline/charts/metrics.json`: average fill rate, average conversion rate, external participant %, and peak participation month.

---

## AI Assistant

Available to Admin and Organiser roles. Users ask questions in plain English; the system queries the analytics views and returns a text response alongside a live data table.

| Detail | Value |
|---|---|
| Model | Mistral-7B-Instruct-v0.3 |
| API | HuggingFace Inference API (REST, not SDK) |
| Prompt format | Mistral instruct chat template |
| SQL safety | `safe_select()` RPC blocks all non-SELECT at the database level |
| Context | Optional — preloads 10 rows from each analytics view per request |
| Rate limits | HuggingFace free tier: model may take 20–30 s to warm up; 429 errors possible under load |

---

## Deployment (Vercel)

The app is configured for zero-config Vercel deployment via `vercel.json`.

```bash
vercel deploy
```

Make sure all five environment variables from `.env.local` are added to your Vercel project before deploying. The database stays on Supabase — no changes needed there.

---

## Known Limitations

- **Auth is in demo mode** — role is selected on the home page, not gated by login. Full Supabase Auth infrastructure is implemented in the codebase and ready to activate.
- **HuggingFace free tier** — the AI assistant can be slow on cold starts (~30 s) and may hit rate limits under sustained use.
- **Pipeline charts are standalone** — generated PNGs are not embedded in the web UI; they are intended for reports and presentations.

---

## Deliverables

| Deliverable | Status | Location |
|---|---|---|
| Working web portal | ✅ Complete | [Live URL](https://eventura-ryangooglers-projects.vercel.app) |
| Database schema (ER diagram) | ⏳ Pending export | `sql/schema_erd.png` |
| SQL schema scripts | ✅ Complete | `sql/schema.sql`, `sql/analytics_views.sql` |
| Analytical SQL queries (8) | ✅ Complete | `sql/analytical_queries.sql` |
| Python processing scripts | ✅ Complete | `pipeline/clean_and_load.py`, `pipeline/compute_metrics.py` |
| Dashboard / visualisation | ✅ Complete | Recharts (web) + `pipeline/charts/*.png` |
| Final report | ✅ Complete | `Eventura_Technical_Report.docx` |
