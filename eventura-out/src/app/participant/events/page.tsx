"use client";
import { useState, useEffect, useCallback } from "react";
import type { Event } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  technical: "⚙️", cultural: "🎭", sports: "⚽", workshop: "🛠️", seminar: "🎤", other: "◆",
};

export default function ParticipantEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState("");
  const [regError, setRegError] = useState("");

  const [regForm, setRegForm] = useState({
    full_name: "", roll_number: "", university_email: "",
    phone: "", participant_type: "student", year_of_study: "",
    team_name: "", role_in_event: "contestant",
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "published", limit: "100" });
    if (filterCategory) params.set("category", filterCategory);
    if (filterMode) params.set("event_mode", filterMode);
    const res = await fetch(`/api/events?${params}`);
    const { data } = await res.json();
    setEvents(data || []);
    setLoading(false);
  }, [filterCategory, filterMode]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    setRegistering(true); setRegError(""); setRegSuccess("");

    const payload = {
      event_id: selectedEvent.event_id,
      registration_status: "pending",
      registration_source: "portal",
      role_in_event: regForm.role_in_event,
      payment_status: selectedEvent.registration_fee > 0 ? "pending" : "not_applicable",
      participant: {
        full_name: regForm.full_name,
        roll_number: regForm.roll_number || null,
        university_email: regForm.university_email || null,
        phone: regForm.phone || null,
        participant_type: regForm.participant_type,
        year_of_study: regForm.year_of_study ? Number(regForm.year_of_study) : null,
        is_internal: true,
        consent_media: false,
      },
      team_name: regForm.team_name || null,
    };

    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) { setRegError(data.error || "Registration failed"); setRegistering(false); return; }
    setRegSuccess(`Successfully registered for ${selectedEvent.event_name}! Your registration is pending confirmation.`);
    setRegistering(false);
  }

  const filtered = events.filter(e =>
    !search || e.event_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const isOpen = (ev: Event) => {
    const now = new Date();
    const open = ev.registration_open_at ? new Date(ev.registration_open_at) : null;
    const close = ev.registration_close_at ? new Date(ev.registration_close_at) : null;
    if (open && now < open) return false;
    if (close && now > close) return false;
    return true;
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Browse Events</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Discover and register for upcoming college events</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input className="input" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: "240px" }} />
        <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: "auto" }}>
          <option value="">All categories</option>
          {["technical", "cultural", "sports", "workshop", "seminar", "other"].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>
        <select className="input" value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ width: "auto" }}>
          <option value="">All modes</option>
          {["offline", "online", "hybrid"].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px", color: "var(--text-muted)", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%" }} />
          Loading events...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {filtered.map(ev => {
            const open = isOpen(ev);
            const fee = ev.registration_fee > 0;
            return (
              <div key={ev.event_id} className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Card header with category color */}
                <div style={{
                  padding: "16px 20px",
                  background: ev.category === "technical" ? "#0f1b2d" : ev.category === "cultural" ? "#7e22ce" : ev.category === "sports" ? "#15803d" : ev.category === "workshop" ? "#b45309" : "#0284c7",
                  color: "white",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "24px" }}>{CATEGORY_ICONS[ev.category] || "◆"}</span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "10px", padding: "2px 8px", background: "rgba(255,255,255,0.2)", borderRadius: "99px", fontWeight: 600, textTransform: "capitalize" }}>{ev.event_mode}</span>
                      {fee && <span style={{ fontSize: "10px", padding: "2px 8px", background: "rgba(245,166,35,0.8)", color: "#0f1b2d", borderRadius: "99px", fontWeight: 700 }}>₹{ev.registration_fee}</span>}
                      {!fee && <span style={{ fontSize: "10px", padding: "2px 8px", background: "rgba(22,163,74,0.8)", borderRadius: "99px", fontWeight: 700 }}>FREE</span>}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{ev.event_name}</h3>
                  {ev.description && (
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5, flex: 1 }}>
                      {ev.description.slice(0, 100)}{ev.description.length > 100 ? "..." : ""}
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      📅 {new Date(ev.event_start_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                      👥 {ev.participation_mode} · {ev.audience_type}
                    </div>
                    {ev.registration_close_at && (
                      <div style={{ fontSize: "12px", color: open ? "#d97706" : "#dc2626", fontWeight: 600 }}>
                        {open ? `⏳ Closes ${new Date(ev.registration_close_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "🔒 Registration closed"}
                      </div>
                    )}
                  </div>

                  <button
                    className={`btn ${open && ev.registration_required ? "btn-primary" : "btn-ghost"}`}
                    style={{ width: "100%", justifyContent: "center" }}
                    disabled={!open || !ev.registration_required}
                    onClick={() => { setSelectedEvent(ev); setRegSuccess(""); setRegError(""); setRegForm(f => ({ ...f, role_in_event: ev.has_competition ? "contestant" : "attendee" })); }}
                  >
                    {!ev.registration_required ? "Open Entry" : !open ? "Closed" : "Register Now →"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>◆</div>
              <p>No events found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Registration modal */}
      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,45,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto", backdropFilter: "blur(4px)" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "520px", padding: 0, overflow: "hidden", margin: "auto" }}>
            <div style={{ padding: "20px 24px", background: "var(--navy)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: "var(--white)", fontSize: "18px", fontFamily: "'DM Serif Display', serif", marginBottom: "2px" }}>Register</h2>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>{selectedEvent.event_name}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "var(--white)", width: 30, height: 30, borderRadius: "8px", cursor: "pointer" }}>✕</button>
            </div>

            {regSuccess ? (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
                <h3 style={{ marginBottom: "10px" }}>Registered Successfully!</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>{regSuccess}</p>
                <button className="btn btn-primary" onClick={() => setSelectedEvent(null)}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {regError && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{regError}</div>}

                <div><label className="label">Full Name *</label>
                  <input className="input" value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} required /></div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><label className="label">Roll Number</label>
                    <input className="input" value={regForm.roll_number} onChange={e => setRegForm(f => ({ ...f, roll_number: e.target.value }))} placeholder="e.g. 21CS001" /></div>
                  <div><label className="label">Year of Study</label>
                    <input className="input" type="number" min={1} max={5} value={regForm.year_of_study} onChange={e => setRegForm(f => ({ ...f, year_of_study: e.target.value }))} /></div>
                </div>

                <div><label className="label">University Email</label>
                  <input className="input" type="email" value={regForm.university_email} onChange={e => setRegForm(f => ({ ...f, university_email: e.target.value }))} placeholder="you@dav.edu.in" /></div>

                <div><label className="label">Phone</label>
                  <input className="input" type="tel" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} /></div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><label className="label">Participant Type</label>
                    <select className="input" value={regForm.participant_type} onChange={e => setRegForm(f => ({ ...f, participant_type: e.target.value }))}>
                      {["student", "faculty", "alumni", "external"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                  <div><label className="label">Role in Event</label>
                    <select className="input" value={regForm.role_in_event} onChange={e => setRegForm(f => ({ ...f, role_in_event: e.target.value }))}>
                      {["contestant", "attendee", "volunteer", "presenter", "guest"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select></div>
                </div>

                {selectedEvent.participation_mode === "team" && (
                  <div><label className="label">Team Name</label>
                    <input className="input" value={regForm.team_name} onChange={e => setRegForm(f => ({ ...f, team_name: e.target.value }))} placeholder="Your team name" /></div>
                )}

                {selectedEvent.registration_fee > 0 && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#92400e" }}>
                    ⚠️ This event has a registration fee of <strong>₹{selectedEvent.registration_fee}</strong>. Payment details will be shared after confirmation.
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelectedEvent(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={registering}>
                    {registering ? "Registering..." : "Confirm Registration"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
