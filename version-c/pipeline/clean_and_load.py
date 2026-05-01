"""
Eventura — Data Cleaning & Validation Pipeline
==============================================
Section 2.3 of project brief: Python processing layer.

What this does:
  1. Pulls raw data from Supabase (events, participants, registrations)
  2. Cleans nulls, duplicates, and inconsistent formatting
  3. Standardises categorical fields (department names, event categories)
  4. Writes cleaned data back — idempotent, safe to re-run multiple times

Usage:
    python clean_and_load.py
"""

import os
import re
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in pipeline/.env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Standardisation maps ───────────────────────────────────────────────────────

CATEGORY_MAP: dict[str, str] = {
    "tech": "technical", "Technical": "technical", "TECHNICAL": "technical",
    "cultural": "cultural", "Cultural": "cultural", "CULTURAL": "cultural",
    "sport": "sports", "Sports": "sports", "SPORTS": "sports",
    "workshop": "workshop", "Workshop": "workshop", "WORKSHOP": "workshop",
    "seminar": "seminar", "Seminar": "seminar", "SEMINAR": "seminar",
}

VALID_CATEGORIES = {"technical", "cultural", "sports", "workshop", "seminar", "other"}
VALID_PARTICIPANT_TYPES = {"student", "faculty", "alumni", "external"}

# ── Utility functions ──────────────────────────────────────────────────────────

def standardise_category(value: str | None) -> str:
    """Map raw category string to a valid enum value."""
    if not value:
        return "other"
    cleaned = str(value).strip().lower()
    return CATEGORY_MAP.get(value, CATEGORY_MAP.get(cleaned, cleaned if cleaned in VALID_CATEGORIES else "other"))


def clean_phone(value: str | None) -> str | None:
    """Normalise phone numbers — strip spaces, dashes, leading country codes."""
    if not value:
        return None
    digits = re.sub(r"[^\d]", "", str(value))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return digits if 7 <= len(digits) <= 15 else None


def clean_name(value: str | None) -> str | None:
    """Title-case names, strip extra whitespace."""
    if not value:
        return None
    return " ".join(str(value).strip().split()).title()


def clean_email(value: str | None) -> str | None:
    """Lowercase and strip email addresses."""
    if not value:
        return None
    return str(value).strip().lower() or None


# ── Main cleaning routines ────────────────────────────────────────────────────

def clean_events() -> dict:
    """Fetch events, clean categories and text fields, report issues."""
    print("\n── Events ──────────────────────────────────────────────")
    resp = supabase.table("events").select("*").execute()
    events: list[dict] = resp.data or []
    df = pd.DataFrame(events)

    if df.empty:
        print("  No events found. Add some data first.")
        return {"total": 0, "cleaned": 0, "issues": []}

    print(f"  Loaded {len(df)} events")

    issues: list[str] = []
    cleaned = 0

    # Check for and report null required fields
    for field in ["event_name", "event_start_at", "event_end_at"]:
        null_count = df[field].isna().sum() if field in df.columns else 0
        if null_count:
            issues.append(f"  ⚠  {null_count} events missing '{field}'")

    # Standardise category
    if "category" in df.columns:
        df["category_clean"] = df["category"].apply(standardise_category)
        changed = df[df["category"] != df["category_clean"]]
        if not changed.empty:
            print(f"  Standardising {len(changed)} event category values...")
            for _, row in changed.iterrows():
                supabase.table("events").update(
                    {"category": row["category_clean"]}
                ).eq("event_id", row["event_id"]).execute()
                cleaned += 1

    # Drop duplicate event codes
    if "event_code" in df.columns:
        dupes = df[df.duplicated(subset=["event_code"], keep="first")]
        if not dupes.empty:
            issues.append(f"  ⚠  {len(dupes)} duplicate event_code values detected")

    for issue in issues:
        print(issue)
    print(f"  ✓ Cleaned {cleaned} event records")
    return {"total": len(df), "cleaned": cleaned, "issues": issues}


def clean_participants() -> dict:
    """Fetch participants, clean names/emails/phones, fill missing types."""
    print("\n── Participants ─────────────────────────────────────────")
    resp = supabase.table("participants").select("*").execute()
    participants: list[dict] = resp.data or []
    df = pd.DataFrame(participants)

    if df.empty:
        print("  No participants found.")
        return {"total": 0, "cleaned": 0, "issues": []}

    print(f"  Loaded {len(df)} participants")

    issues: list[str] = []
    cleaned = 0

    for _, row in df.iterrows():
        updates: dict = {}

        # Clean name
        clean = clean_name(row.get("full_name"))
        if clean and clean != row.get("full_name"):
            updates["full_name"] = clean

        # Clean email fields
        for email_field in ["university_email", "personal_email"]:
            raw = row.get(email_field)
            cleaned_email = clean_email(raw)
            if cleaned_email and cleaned_email != raw:
                updates[email_field] = cleaned_email

        # Clean phone
        raw_phone = row.get("phone")
        clean_p = clean_phone(raw_phone)
        if clean_p != raw_phone:
            updates["phone"] = clean_p

        # Standardise participant_type
        ptype = str(row.get("participant_type") or "").strip().lower()
        if ptype not in VALID_PARTICIPANT_TYPES:
            updates["participant_type"] = "external"

        if updates:
            supabase.table("participants").update(updates).eq(
                "participant_id", row["participant_id"]
            ).execute()
            cleaned += 1

    # Report null roll numbers for internal participants
    if "roll_number" in df.columns and "is_internal" in df.columns:
        missing_rolls = df[(df["is_internal"] == True) & (df["roll_number"].isna())]
        if not missing_rolls.empty:
            issues.append(f"  ⚠  {len(missing_rolls)} internal participants missing roll_number")

    for issue in issues:
        print(issue)
    print(f"  ✓ Cleaned {cleaned} participant records")
    return {"total": len(df), "cleaned": cleaned, "issues": issues}


def clean_registrations() -> dict:
    """Detect and report duplicate registrations (same event + participant)."""
    print("\n── Registrations ────────────────────────────────────────")
    resp = supabase.table("registrations").select("event_id,participant_id,registration_id").execute()
    regs: list[dict] = resp.data or []
    df = pd.DataFrame(regs)

    if df.empty:
        print("  No registrations found.")
        return {"total": 0, "cleaned": 0, "issues": []}

    print(f"  Loaded {len(df)} registrations")
    issues: list[str] = []

    dupes = df[df.duplicated(subset=["event_id", "participant_id"], keep="first")]
    if not dupes.empty:
        issues.append(f"  ⚠  {len(dupes)} duplicate registrations detected (same event+participant)")
        print(issues[-1])
    else:
        print("  ✓ No duplicate registrations found")

    return {"total": len(df), "cleaned": 0, "issues": issues}


def run_pipeline() -> None:
    print("=" * 60)
    print("  Eventura Data Cleaning Pipeline")
    print("=" * 60)

    results = {
        "events":        clean_events(),
        "participants":  clean_participants(),
        "registrations": clean_registrations(),
    }

    print("\n── Summary ──────────────────────────────────────────────")
    total_cleaned = sum(r["cleaned"] for r in results.values())
    total_issues  = sum(len(r["issues"]) for r in results.values())
    print(f"  Records cleaned : {total_cleaned}")
    print(f"  Issues flagged  : {total_issues}")
    print("  Pipeline complete. Safe to re-run.\n")


if __name__ == "__main__":
    run_pipeline()
