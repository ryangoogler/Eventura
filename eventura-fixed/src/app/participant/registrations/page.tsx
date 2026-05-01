"use client";
import { useState, useEffect } from "react";
import type { Registration } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#16a34a", pending: "#d97706", waitlisted: "#0284c7",
  cancelled: "#dc2626", rejected: "#94a3b8",
};

const STATUS_BG: Record<string, string> = {
  confirmed: "#dcfce7", pending: "#fef3c7", waitlisted: "#dbeafe",
  cancelled: "#fee2e2", rejected: "#f1f5f9",
};

export default function ParticipantRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  async function lookupRegistrations(e: React.FormEvent) {
    e.preventDefault();
    setLookupLoading(true); setLookupError("");

    // First find participant by email
    const pRes = await fetch(`/api/participants?search=${encodeURIComponent(lookupEmail)}&limit=1`);
    const pData = await pRes.json();
    const participant = pData.data?.[0];

    if (!participant) {
      setLookupError("No participant found with that email. Please register for an event first.");
      setLookupLoading(false); return;
    }

    setParticipantId(String(participant.participant_id));
    const rRes = await fetch(`/api/registrations?participant_id=${participant.participant_id}&limit=50`);
    const rData = await rRes.json();
    setRegistrations(rData.data || []);
    setLoading(false);
    setLookupLoading(false);
  }

  useEffect(() => {
    if (participantId) {
      setLoading(true);
      fetch(`/api/registrations?participant_id=${participantId}&limit=50`)
        .then(r => r.json())
        .then(d => { setRegistrations(d.data || []); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [participantId]);

  async function cancelRegistration(regId: number) {
    if (!confirm("Cancel this registration?")) return;
    await fetch(`/api/registrations/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_status: "cancelled" }),
    });
    setRegistrations(prev => prev.map(r =>
      r.registration_id === regId ? { ...r, registration_status: "cancelled" } : r
    ));
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>My Registrations</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Track all your event registrations</p>
      </div>

      {/* Email lookup */}
      {!participantId && (
        <div className="card" style={{ padding: "28px", maxWidth: "460px", marginBottom: "24px" }}>
          <h4 style={{ marginBottom: "6px", fontSize: "16px" }}>Look up your registrations</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>Enter your university email to find your registrations</p>
          <form onSubmit={lookupRegistrations} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {lookupError && <div style={{ background: "#fee2e2", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{lookupError}</div>}
            <div>
              <label className="label">University / Personal Email</label>
              <input
                className="input"
                type="email"
                value={lookupEmail}
                onChange={e => setLookupEmail(e.target.value)}
                placeholder="you@dav.edu.in"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={lookupLoading}>
              {lookupLoading ? "Looking up..." : "Find My Registrations"}
            </button>
          </form>
        </div>
      )}

      {participantId && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{registrations.length} registration{registrations.length !== 1 ? "s" : ""} found</p>
            <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setParticipantId(""); setRegistrations([]); }}>
              Switch Account
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
            </div>
          ) : registrations.length === 0 ? (
            <div className="card" style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>◈</div>
              <p>No registrations found. Browse events to register!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {registrations.map(reg => {
                const ev = reg.event as { event_name?: string; event_start_at?: string; event_code?: string; category?: string } | undefined;
                return (
                  <div key={reg.registration_id} className="card" style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <h4 style={{ fontSize: "15px", fontWeight: 700 }}>{ev?.event_name || "Event"}</h4>
                          <span style={{
                            fontSize: "10px", padding: "2px 8px",
                            background: STATUS_BG[reg.registration_status] || "#f1f5f9",
                            color: STATUS_COLORS[reg.registration_status] || "#94a3b8",
                            borderRadius: "99px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>{reg.registration_status}</span>
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          {ev?.event_start_at && (
                            <span>📅 {new Date(ev.event_start_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          <span style={{ textTransform: "capitalize" }}>🎭 {reg.role_in_event}</span>
                          {(reg.team as { team_name?: string })?.team_name && (
                            <span>👥 {(reg.team as { team_name?: string }).team_name}</span>
                          )}
                          <span>💳 {reg.payment_status}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                          Registered on {new Date(reg.registered_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      {reg.registration_status === "pending" && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "12px", padding: "5px 12px", color: "#dc2626", borderColor: "#dc2626" }}
                          onClick={() => cancelRegistration(reg.registration_id)}
                        >Cancel</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
