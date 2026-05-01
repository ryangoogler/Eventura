"use client";
import { useState, useEffect } from "react";
import type { Event, Department, Venue } from "@/types";

interface Props {
  event?: Event | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EventForm({ event, onClose, onSaved }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_code: event?.event_code || "",  // auto-generated on create; read-only display on edit
    event_name: event?.event_name || "",
    short_name: event?.short_name || "",
    primary_department_id: event?.primary_department_id || "",
    category: event?.category || "technical",
    format: event?.format || "competition",
    venue_id: event?.venue_id || "",
    event_mode: event?.event_mode || "offline",
    participation_mode: event?.participation_mode || "individual",
    audience_type: event?.audience_type || "students",
    description: event?.description || "",
    objective: event?.objective || "",
    registration_fee: event?.registration_fee || 0,
    has_competition: event?.has_competition || false,
    has_certificates: event?.has_certificates || false,
    registration_required: event?.registration_required ?? true,
    max_participants: event?.max_participants || "",
    min_team_size: event?.min_team_size || "",
    max_team_size: event?.max_team_size || "",
    registration_open_at: event?.registration_open_at?.slice(0, 16) || "",
    registration_close_at: event?.registration_close_at?.slice(0, 16) || "",
    event_start_at: event?.event_start_at?.slice(0, 16) || "",
    event_end_at: event?.event_end_at?.slice(0, 16) || "",
    status: event?.status || "draft",
    poster_url: event?.poster_url || "",
    rules_document_url: event?.rules_document_url || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/venues").then(r => r.json()),
    ]).then(([depts, vens]) => {
      setDepartments(depts.data || []);
      setVenues(vens.data || []);
    });
  }, []);

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // For new events, strip event_code so server auto-generates it
    const { event_code: _ec, ...formWithoutCode } = form;
    const baseForm = event ? form : formWithoutCode;

    const payload = {
      ...baseForm,
      primary_department_id: Number(form.primary_department_id),
      venue_id: form.venue_id ? Number(form.venue_id) : null,
      registration_fee: Number(form.registration_fee),
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      min_team_size: form.min_team_size ? Number(form.min_team_size) : null,
      max_team_size: form.max_team_size ? Number(form.max_team_size) : null,
      registration_open_at: form.registration_open_at || null,
      registration_close_at: form.registration_close_at || null,
    };

    const url = event ? `/api/events/${event.event_id}` : "/api/events";
    const method = event ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save event"); setLoading(false); return; }
    onSaved();
  }

  const inputStyle = { marginBottom: "14px" };
  const gridTwo = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,27,45,0.6)",
      zIndex: 1000, display: "flex", alignItems: "flex-start",
      justifyContent: "center", padding: "24px", overflowY: "auto",
      backdropFilter: "blur(4px)",
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "700px", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--navy)",
        }}>
          <div>
            <h2 style={{ color: "var(--white)", fontSize: "20px", fontFamily: "'DM Serif Display', serif" }}>
              {event ? "Edit Event" : "Create New Event"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "2px" }}>
              Fill in the event details below
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "var(--white)", width: 32, height: 32, borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* Basic info */}
          <div style={{ marginBottom: "8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Basic Information</div>
          <div style={gridTwo}>
            <div style={inputStyle}>
              <label className="label">Event Code</label>
              {event ? (
                <div style={{ padding: "9px 12px", background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: 600, color: "var(--navy)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {form.event_code}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 400, fontFamily: "inherit" }}>ID #{event.event_id}</span>
                </div>
              ) : (
                <div style={{ padding: "9px 12px", background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Auto-generated on save (e.g. TEC-2025-4821)
                </div>
              )}
            </div>
            <div style={inputStyle}>
              <label className="label">Short Name</label>
              <input className="input" value={form.short_name} onChange={e => set("short_name", e.target.value)} placeholder="TechFest" />
            </div>
          </div>

          <div style={inputStyle}>
            <label className="label">Event Name *</label>
            <input className="input" value={form.event_name} onChange={e => set("event_name", e.target.value)} placeholder="National Technical Symposium 2025" required />
          </div>

          <div style={gridTwo}>
            <div style={inputStyle}>
              <label className="label">Department *</label>
              <select className="input" value={form.primary_department_id} onChange={e => set("primary_department_id", e.target.value)} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </select>
            </div>
            <div style={inputStyle}>
              <label className="label">Venue</label>
              <select className="input" value={form.venue_id} onChange={e => set("venue_id", e.target.value)}>
                <option value="">Select venue</option>
                {venues.map(v => <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>)}
              </select>
            </div>
          </div>

          {/* Classification */}
          <div style={{ marginTop: "8px", marginBottom: "8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Classification</div>
          <div style={{ ...gridTwo, marginBottom: "14px" }}>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
                {["technical","cultural","sports","workshop","seminar","other"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Format *</label>
              <select className="input" value={form.format} onChange={e => set("format", e.target.value)}>
                {["competition","workshop","talk","seminar","performance","exhibition","meetup","hackathon","other"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Event Mode *</label>
              <select className="input" value={form.event_mode} onChange={e => set("event_mode", e.target.value)}>
                {["offline","online","hybrid"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Participation *</label>
              <select className="input" value={form.participation_mode} onChange={e => set("participation_mode", e.target.value)}>
                {["individual","team","audience","mixed"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audience *</label>
              <select className="input" value={form.audience_type} onChange={e => set("audience_type", e.target.value)}>
                {["students","faculty","alumni","public","mixed"].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
                {["draft","submitted","approved","published","completed","cancelled","archived"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={inputStyle}>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Describe the event..." style={{ resize: "vertical" }} />
          </div>

          {/* Dates */}
          <div style={{ marginTop: "8px", marginBottom: "8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Schedule</div>
          <div style={gridTwo}>
            <div style={inputStyle}>
              <label className="label">Event Start *</label>
              <input className="input" type="datetime-local" value={form.event_start_at} onChange={e => set("event_start_at", e.target.value)} required />
            </div>
            <div style={inputStyle}>
              <label className="label">Event End *</label>
              <input className="input" type="datetime-local" value={form.event_end_at} onChange={e => set("event_end_at", e.target.value)} required />
            </div>
            <div style={inputStyle}>
              <label className="label">Registration Opens</label>
              <input className="input" type="datetime-local" value={form.registration_open_at} onChange={e => set("registration_open_at", e.target.value)} />
            </div>
            <div style={inputStyle}>
              <label className="label">Registration Closes</label>
              <input className="input" type="datetime-local" value={form.registration_close_at} onChange={e => set("registration_close_at", e.target.value)} />
            </div>
          </div>

          {/* Registration settings */}
          <div style={{ marginTop: "8px", marginBottom: "8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Registration</div>
          <div style={gridTwo}>
            <div style={inputStyle}>
              <label className="label">Fee (₹)</label>
              <input className="input" type="number" min={0} value={form.registration_fee} onChange={e => set("registration_fee", e.target.value)} />
            </div>
            <div style={inputStyle}>
              <label className="label">Max Participants</label>
              <input className="input" type="number" min={1} value={form.max_participants} onChange={e => set("max_participants", e.target.value)} />
            </div>
            <div style={inputStyle}>
              <label className="label">Min Team Size</label>
              <input className="input" type="number" min={1} value={form.min_team_size} onChange={e => set("min_team_size", e.target.value)} />
            </div>
            <div style={inputStyle}>
              <label className="label">Max Team Size</label>
              <input className="input" type="number" min={1} value={form.max_team_size} onChange={e => set("max_team_size", e.target.value)} />
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[
              { key: "registration_required", label: "Registration Required" },
              { key: "has_competition", label: "Has Competition" },
              { key: "has_certificates", label: "Issues Certificates" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={e => set(key, e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--navy)" }}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Media URLs */}
          <div style={inputStyle}>
            <label className="label">Poster URL</label>
            <input className="input" value={form.poster_url} onChange={e => set("poster_url", e.target.value)} placeholder="https://..." />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : event ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
