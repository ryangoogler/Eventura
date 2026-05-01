"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Registration } from "@/types";

interface EventOption { event_id: number; event_name: string; }

function ParticipantsContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("event_id") || "";

  const [selectedEvent, setSelectedEvent] = useState(initialEventId);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/events?status=published&limit=100")
      .then(r => r.json())
      .then(d => setEvents((d.data || []).map((e: { event_id: number; event_name: string }) => ({ event_id: e.event_id, event_name: e.event_name }))));
  }, []);

  const fetchRegistrations = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    const params = new URLSearchParams({ event_id: selectedEvent, limit: "200" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/registrations?${params}`);
    const { data, count } = await res.json();
    setRegistrations(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [selectedEvent, statusFilter]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  async function updateStatus(regId: number, status: string) {
    await fetch(`/api/registrations/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_status: status }),
    });
    fetchRegistrations();
  }

  const filtered = registrations.filter(r => {
    const p = r.participant;
    if (!p) return true;
    return !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.roll_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.university_email || "").toLowerCase().includes(search.toLowerCase());
  });

  const STATUS_COLORS: Record<string, string> = {
    confirmed: "#16a34a", pending: "#d97706", waitlisted: "#0284c7",
    cancelled: "#dc2626", rejected: "#94a3b8",
  };

  function exportCSV() {
    const headers = ["Name", "Roll No", "Email", "Type", "Status", "Payment", "Registered At"];
    const rows = filtered.map(r => [
      r.participant?.full_name || "",
      r.participant?.roll_number || "",
      r.participant?.university_email || r.participant?.personal_email || "",
      r.participant?.participant_type || "",
      r.registration_status,
      r.payment_status,
      new Date(r.registered_at).toLocaleString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `participants-event-${selectedEvent}.csv`; a.click();
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Participants</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Manage registrations and verify eligibility</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select className="input" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={{ minWidth: "240px" }}>
          <option value="">Select an event</option>
          {events.map(e => <option key={e.event_id} value={e.event_id}>{e.event_name}</option>)}
        </select>
        <input className="input" placeholder="Search by name, roll no, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: "240px" }} />
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">All statuses</option>
          {["pending", "confirmed", "waitlisted", "cancelled", "rejected"].map(s =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
        {selectedEvent && (
          <button className="btn btn-ghost" onClick={exportCSV} style={{ marginLeft: "auto" }}>
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* Stats row */}
      {selectedEvent && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["confirmed", "pending", "waitlisted", "cancelled"].map(s => {
            const count = registrations.filter(r => r.registration_status === s).length;
            return (
              <div key={s} style={{
                background: "var(--white)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "10px 16px", fontSize: "13px",
              }}>
                <span style={{ fontWeight: 700, color: STATUS_COLORS[s], marginRight: "6px" }}>{count}</span>
                <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>{s}</span>
              </div>
            );
          })}
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px" }}>
            <span style={{ fontWeight: 700, color: "var(--navy)", marginRight: "6px" }}>{total}</span>
            <span style={{ color: "var(--text-muted)" }}>Total</span>
          </div>
        </div>
      )}

      {/* Table */}
      {!selectedEvent ? (
        <div className="card" style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>◉</div>
          <p>Select an event above to view its participants</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
                Loading participants...
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participant</th>
                    <th>Roll / Email</th>
                    <th>Type</th>
                    <th>Team</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, idx) => {
                    const p = reg.participant;
                    return (
                      <tr key={reg.registration_id}>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "14px" }}>{p?.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {new Date(reg.registered_at).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          <div>{p?.roll_number || "—"}</div>
                          <div style={{ color: "var(--text-muted)" }}>{p?.university_email || p?.personal_email || ""}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", textTransform: "capitalize", color: p?.is_internal ? "#0284c7" : "#7e22ce", fontWeight: 600 }}>
                            {p?.is_internal ? "Internal" : "External"}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {(reg.team as { team_name?: string })?.team_name || "—"}
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", textTransform: "capitalize", fontWeight: 600, color: reg.payment_status === "paid" ? "#16a34a" : reg.payment_status === "not_applicable" ? "#94a3b8" : "#d97706" }}>
                            {reg.payment_status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={reg.registration_status}
                            onChange={e => updateStatus(reg.registration_id, e.target.value)}
                            style={{
                              border: "none", background: "none", fontSize: "12px",
                              fontWeight: 700, textTransform: "capitalize",
                              color: STATUS_COLORS[reg.registration_status] || "#94a3b8",
                              cursor: "pointer",
                            }}
                          >
                            {["pending", "confirmed", "waitlisted", "cancelled", "rejected"].map(s =>
                              <option key={s} value={s}>{s}</option>
                            )}
                          </select>
                        </td>
                        <td>
                          {reg.registration_status === "pending" && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "4px 10px", fontSize: "11px", color: "#16a34a", borderColor: "#16a34a" }}
                              onClick={() => updateStatus(reg.registration_id, "confirmed")}
                            >✓ Confirm</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                      No participants found for this event
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
      <ParticipantsContent />
    </Suspense>
  );
}
