# Eventura — Python Data Pipeline

This folder contains the Python data processing scripts required by the project brief (Section 2.3).

## Setup

```bash
cd pipeline
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in this folder:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Scripts

| Script | Purpose |
|---|---|
| `clean_and_load.py` | Clean nulls, duplicates, standardise categories. Safe to re-run. |
| `compute_metrics.py` | Compute derived metrics and output charts via Matplotlib. |
| `visualise.py` | Generate standalone PNG charts from the analytics views. |

## Running

```bash
# Step 1: Clean and validate data
python clean_and_load.py

# Step 2: Compute metrics and generate charts
python compute_metrics.py

# Charts are saved to pipeline/charts/
```
