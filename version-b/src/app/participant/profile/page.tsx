"use client";
import { useState } from "react";
import type { Participant } from "@/types";

export default function ParticipantProfilePage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Participant>>({});

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch(`/api/participants?search=${encodeURIComponent(email)}&limit=1`);
    const data = await res.json();
    const p = data.data?.[0];
    if (!p) { setError("No profile found with that email."); setLoading(false); return; }
    setProfile(p);
    setForm(p);
    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { setProfile(data.data); setEditing(false); }
    setSaving(false);
  }

  const inputRow = { marginBottom: "14px" };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>My Profile</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>View and update your participant information</p>
      </div>

      {!profile ? (
        <div className="card" style={{ padding: "28px", maxWidth: "440px" }}>
          <h4 style={{ marginBottom: "6px" }}>Find Your Profile</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>Enter your email to load your profile</p>
          <form onSubmit={lookup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {error && <div style={{ background: "#fee2e2", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@dav.edu.in" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Loading..." : "Load Profile"}</button>
          </form>
        </div>
      ) : (
        <div style={{ maxWidth: "640px" }}>
          {/* Profile header */}
          <div className="card" style={{ padding: "24px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "14px", background: "var(--navy)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--saffron)", fontSize: "22px", fontWeight: 700, fontFamily: "'DM Serif Display', serif",
              }}>
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: "20px", marginBottom: "2px" }}>{profile.full_name}</h2>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{profile.university_email || profile.personal_email}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", textTransform: "capitalize" }}>
                  {profile.participant_type} · {profile.is_internal ? "Internal" : "External"}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: "13px" }} onClick={() => setEditing(e => !e)}>
              {editing ? "Cancel" : "✎ Edit"}
            </button>
          </div>

          {editing ? (
            <div className="card" style={{ padding: "24px" }}>
              <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={inputRow}>
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.full_name || ""} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                </div>
                <div style={{ ...grid2, ...inputRow }}>
                  <div>
                    <label className="label">Roll Number</label>
                    <input className="input" value={form.roll_number || ""} onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" type="tel" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div style={{ ...grid2, ...inputRow }}>
                  <div>
                    <label className="label">Year of Study</label>
                    <input className="input" type="number" min={1} max={5} value={form.year_of_study || ""} onChange={e => setForm(f => ({ ...f, year_of_study: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={form.gender || ""} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">Prefer not to say</option>
                      {["Male", "Female", "Non-binary", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div style={inputRow}>
                  <label className="label">Accessibility Needs</label>
                  <textarea className="input" value={form.accessibility_needs || ""} onChange={e => setForm(f => ({ ...f, accessibility_needs: e.target.value }))} rows={2} style={{ resize: "vertical" }} placeholder="Any accessibility requirements..." />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", marginBottom: "16px" }}>
                  <input type="checkbox" checked={form.consent_media || false} onChange={e => setForm(f => ({ ...f, consent_media: e.target.checked }))} style={{ accentColor: "var(--navy)" }} />
                  I consent to media coverage (photos/videos) during events
                </label>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { label: "Roll Number", value: profile.roll_number },
                  { label: "Phone", value: profile.phone },
                  { label: "University Email", value: profile.university_email },
                  { label: "Personal Email", value: profile.personal_email },
                  { label: "Year of Study", value: profile.year_of_study ? `Year ${profile.year_of_study}` : null },
                  { label: "Semester", value: profile.semester ? `Sem ${profile.semester}` : null },
                  { label: "Gender", value: profile.gender },
                  { label: "College", value: profile.college_name },
                  { label: "Media Consent", value: profile.consent_media ? "✓ Given" : "✗ Not given" },
                  { label: "Accessibility", value: profile.accessibility_needs },
                ].map(({ label, value }) => value && (
                  <div key={label}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "3px" }}>{label}</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
