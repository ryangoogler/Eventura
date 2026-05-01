"""
Eventura — Metrics Computation & Matplotlib Visualisation
=========================================================
Section 2.3 + 2.4 of project brief.

Computes derived metrics from the analytics views and generates
publication-quality charts saved to pipeline/charts/.

Usage:
    python compute_metrics.py

Output: pipeline/charts/*.png
"""

import os
import sys
import json
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # non-interactive backend — safe for servers
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import seaborn as sns
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in pipeline/.env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CHARTS_DIR = os.path.join(os.path.dirname(__file__), "charts")
os.makedirs(CHARTS_DIR, exist_ok=True)

# ── Design tokens matching Eventura web UI ─────────────────────────────────────
NAVY    = "#0f1b2d"
SAFFRON = "#f5a623"
BLUE    = "#0284c7"
GREEN   = "#16a34a"
PURPLE  = "#7e22ce"
RED     = "#dc2626"
CREAM   = "#faf8f3"

PALETTE = [NAVY, SAFFRON, BLUE, GREEN, PURPLE, RED, "#d97706", "#6366f1"]

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.facecolor": CREAM,
    "figure.facecolor": "white",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.color": "#e2e8f0",
    "grid.linewidth": 0.7,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.titlecolor": NAVY,
    "axes.labelcolor": NAVY,
    "xtick.color": "#4a6080",
    "ytick.color": "#4a6080",
})

# ── Helpers ────────────────────────────────────────────────────────────────────

def fetch(view: str) -> pd.DataFrame:
    """Fetch all rows from a Supabase view into a DataFrame."""
    try:
        resp = supabase.table(view).select("*").execute()
        return pd.DataFrame(resp.data or [])
    except Exception as e:
        print(f"  ⚠  Could not fetch {view}: {e}")
        return pd.DataFrame()


def save(fig: plt.Figure, name: str) -> None:
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  ✓ Saved {name}")


# ── Chart generators ───────────────────────────────────────────────────────────

def chart_monthly_trend() -> None:
    """Line chart: events + registrations trend over months."""
    df = fetch("v_semester_trends")
    if df.empty:
        print("  ⚠  v_semester_trends: no data"); return

    fig, ax1 = plt.subplots(figsize=(10, 4))
    ax2 = ax1.twinx()

    ax1.plot(df["event_month"], df["events_count"].astype(int),
             color=NAVY, marker="o", linewidth=2, markersize=5, label="Events")
    ax2.bar(df["event_month"], df["total_registrations"].astype(int),
            color=SAFFRON, alpha=0.45, label="Registrations")

    ax1.set_xlabel("Month")
    ax1.set_ylabel("Events", color=NAVY)
    ax2.set_ylabel("Registrations", color=SAFFRON)
    ax1.set_title("Monthly Event & Registration Trend")
    plt.xticks(rotation=45, ha="right")

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=9)
    fig.tight_layout()
    save(fig, "01_monthly_trend.png")


def chart_dept_events() -> None:
    """Horizontal bar: events hosted per department."""
    df = fetch("v_dept_event_counts")
    if df.empty:
        print("  ⚠  v_dept_event_counts: no data"); return

    df = df[df["total_events"] > 0].sort_values("total_events")
    fig, ax = plt.subplots(figsize=(9, max(4, len(df) * 0.45)))
    bars = ax.barh(df["department_name"], df["total_events"].astype(int),
                   color=NAVY, edgecolor="white", height=0.65)
    ax.bar_label(bars, padding=4, fontsize=9, color=NAVY)
    ax.set_xlabel("Number of Events")
    ax.set_title("Events Hosted by Department")
    fig.tight_layout()
    save(fig, "02_dept_events.png")


def chart_top_events() -> None:
    """Bar chart: top 10 events by registrations."""
    df = fetch("v_top_events_registrations")
    if df.empty:
        print("  ⚠  v_top_events_registrations: no data"); return

    df = df.nlargest(10, "reg_count")
    fig, ax = plt.subplots(figsize=(10, 5))
    colors = [PALETTE[i % len(PALETTE)] for i in range(len(df))]
    bars = ax.bar(df["event_name"], df["reg_count"].astype(int),
                  color=colors, edgecolor="white", linewidth=0.5)
    ax.bar_label(bars, padding=3, fontsize=9)
    ax.set_ylabel("Registrations")
    ax.set_title("Top 10 Events by Registration Count")
    plt.xticks(rotation=35, ha="right", fontsize=9)
    fig.tight_layout()
    save(fig, "03_top_events.png")


def chart_category_breakdown() -> None:
    """Donut + grouped bar: events and feedback by category."""
    df_cat = fetch("v_category_feedback")
    df_cnt = fetch("v_top_events_registrations")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Left: pie/donut of event count per category
    if not df_cnt.empty and "category" in df_cnt.columns:
        cat_counts = df_cnt.groupby("category")["reg_count"].sum().sort_values(ascending=False)
        wedges, texts, autotexts = axes[0].pie(
            cat_counts.values, labels=cat_counts.index,
            autopct="%1.1f%%", colors=PALETTE[:len(cat_counts)],
            startangle=90, pctdistance=0.8,
            wedgeprops={"width": 0.5, "edgecolor": "white", "linewidth": 1.5}
        )
        for t in autotexts:
            t.set_fontsize(9)
        axes[0].set_title("Registration Share by Category")
    else:
        axes[0].text(0.5, 0.5, "No data", ha="center", va="center")
        axes[0].set_title("Registration Share by Category")

    # Right: avg feedback by category
    if not df_cat.empty:
        df_cat = df_cat.sort_values("avg_overall_rating", ascending=False)
        x = range(len(df_cat))
        width = 0.28
        axes[1].bar([i - width for i in x], df_cat["avg_overall_rating"].astype(float),
                    width=width, label="Overall", color=NAVY)
        if "avg_content_rating" in df_cat.columns:
            axes[1].bar(list(x), df_cat["avg_content_rating"].astype(float),
                        width=width, label="Content", color=SAFFRON)
        if "avg_organization_rating" in df_cat.columns:
            axes[1].bar([i + width for i in x], df_cat["avg_organization_rating"].astype(float),
                        width=width, label="Organisation", color=BLUE)
        axes[1].set_xticks(list(x))
        axes[1].set_xticklabels(df_cat["category"], rotation=30, ha="right", fontsize=9)
        axes[1].set_ylim(0, 5.5)
        axes[1].set_ylabel("Avg Rating (out of 5)")
        axes[1].set_title("Feedback Ratings by Category")
        axes[1].legend(fontsize=8)
    else:
        axes[1].text(0.5, 0.5, "No feedback data", ha="center", va="center")
        axes[1].set_title("Feedback Ratings by Category")

    fig.tight_layout()
    save(fig, "04_category_breakdown.png")


def chart_internal_external() -> None:
    """Stacked bar: internal vs external participants per event."""
    df = fetch("v_participant_ratio")
    if df.empty:
        print("  ⚠  v_participant_ratio: no data"); return

    df = df.nlargest(10, "total_participants") if "total_participants" in df.columns else df.head(10)
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(df["event_name"], df["internal_count"].astype(int),
           label="Internal", color=NAVY, edgecolor="white")
    ax.bar(df["event_name"], df["external_count"].astype(int),
           bottom=df["internal_count"].astype(int),
           label="External", color=SAFFRON, edgecolor="white")
    ax.set_ylabel("Participants")
    ax.set_title("Internal vs External Participants (Top 10 Events)")
    ax.legend()
    plt.xticks(rotation=35, ha="right", fontsize=9)
    fig.tight_layout()
    save(fig, "05_internal_external.png")


def chart_conversion_rates() -> None:
    """Bar chart: registration-to-attendance conversion %."""
    df = fetch("v_event_conversion_rates")
    if df.empty:
        print("  ⚠  v_event_conversion_rates: no data"); return

    df = df[df["total_registrations"] > 0].nlargest(10, "total_registrations")
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(df["event_name"], df["conversion_rate"].astype(float),
                  color=GREEN, edgecolor="white")
    ax.bar_label(bars, fmt="%.1f%%", padding=3, fontsize=9)
    ax.set_ylim(0, 115)
    ax.set_ylabel("Conversion Rate (%)")
    ax.set_title("Registration-to-Attendance Conversion Rate")
    plt.xticks(rotation=35, ha="right", fontsize=9)
    ax.axhline(y=100, color=RED, linestyle="--", linewidth=0.8, alpha=0.5)
    fig.tight_layout()
    save(fig, "06_conversion_rates.png")


def chart_dept_participation() -> None:
    """Grouped bar: dept participation volume."""
    df = fetch("v_dept_participation_volume")
    if df.empty:
        print("  ⚠  v_dept_participation_volume: no data"); return

    df = df[df["events_hosted"] > 0].head(10)
    x = range(len(df))
    width = 0.3
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.bar([i - width for i in x], df["events_hosted"].astype(int),
           width=width, label="Events Hosted", color=NAVY)
    ax.bar(list(x), df["unique_participants"].astype(int),
           width=width, label="Unique Participants", color=SAFFRON)
    ax.bar([i + width for i in x], df["total_registrations"].astype(int),
           width=width, label="Total Registrations", color=BLUE)
    ax.set_xticks(list(x))
    ax.set_xticklabels(df["department_name"], rotation=35, ha="right", fontsize=9)
    ax.set_ylabel("Count")
    ax.set_title("Department Participation Volume")
    ax.legend(fontsize=9)
    fig.tight_layout()
    save(fig, "07_dept_participation.png")


def chart_top_performers() -> None:
    """Bar chart: top student performers."""
    df = fetch("v_top_performers")
    if df.empty:
        print("  ⚠  v_top_performers: no data"); return

    df = df.head(10)
    fig, ax = plt.subplots(figsize=(10, 5))
    x = range(len(df))
    width = 0.28
    ax.bar([i - width for i in x], df["gold_count"].astype(int),
           width=width, label="1st Place", color=SAFFRON)
    ax.bar(list(x), df["silver_count"].astype(int),
           width=width, label="2nd Place", color="#94a3b8")
    ax.bar([i + width for i in x], df["finalist_count"].astype(int),
           width=width, label="Finalist", color=BLUE)
    ax.set_xticks(list(x))
    ax.set_xticklabels(df["full_name"], rotation=35, ha="right", fontsize=9)
    ax.set_ylabel("Count")
    ax.set_title("Top Performers Across Competitions")
    ax.legend(fontsize=9)
    fig.tight_layout()
    save(fig, "08_top_performers.png")


def compute_derived_metrics() -> dict:
    """
    Compute summary derived metrics and print them.
    These are the 'derived/composite metrics beyond raw counts'
    required by the brief.
    """
    print("\n── Derived Metrics ──────────────────────────────────────")

    metrics: dict = {}

    # Overall participation rate
    events_df = fetch("v_participation_rate")
    if not events_df.empty and "fill_rate_pct" in events_df.columns:
        avg_fill = events_df["fill_rate_pct"].astype(float).dropna().mean()
        metrics["avg_event_fill_rate_pct"] = round(float(avg_fill), 2)
        print(f"  Avg event fill rate     : {avg_fill:.1f}%")

    # Avg conversion rate
    conv_df = fetch("v_event_conversion_rates")
    if not conv_df.empty and "conversion_rate" in conv_df.columns:
        avg_conv = conv_df["conversion_rate"].astype(float).dropna().mean()
        metrics["avg_conversion_rate_pct"] = round(float(avg_conv), 2)
        print(f"  Avg conversion rate     : {avg_conv:.1f}%")

    # Internal/external ratio overall
    ratio_df = fetch("v_participant_ratio")
    if not ratio_df.empty:
        total_int = ratio_df["internal_count"].astype(int).sum()
        total_ext = ratio_df["external_count"].astype(int).sum()
        if total_int + total_ext > 0:
            ext_pct = (total_ext / (total_int + total_ext)) * 100
            metrics["external_participant_pct"] = round(float(ext_pct), 2)
            print(f"  External participant %  : {ext_pct:.1f}%")

    # Most active month
    trend_df = fetch("v_semester_trends")
    if not trend_df.empty and "total_registrations" in trend_df.columns:
        peak_row = trend_df.loc[trend_df["total_registrations"].astype(int).idxmax()]
        metrics["peak_month"] = str(peak_row["event_month"])
        print(f"  Peak participation month: {peak_row['event_month']}")

    # Save metrics as JSON
    metrics_path = os.path.join(CHARTS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n  Metrics saved to charts/metrics.json")
    return metrics


def run() -> None:
    print("=" * 60)
    print("  Eventura Metrics & Visualisation Pipeline")
    print("=" * 60)

    print("\n── Generating charts ────────────────────────────────────")
    chart_monthly_trend()
    chart_dept_events()
    chart_top_events()
    chart_category_breakdown()
    chart_internal_external()
    chart_conversion_rates()
    chart_dept_participation()
    chart_top_performers()
    compute_derived_metrics()

    print(f"\n  All charts saved to: {CHARTS_DIR}")
    print("  Done.\n")


if __name__ == "__main__":
    run()
