"use client";
import { useState, useEffect, useCallback } from "react";
import type { AttendanceLog, EventSession } from "@/types";

interface EventOption { event_id: number; event_name: string; }

export default function OrganiserAttendancePage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [manualRoll, setManualRoll] = useState("");
  const [marking, setMarking] = useState(false);
  const [markMsg, setMarkMsg] = useState("");

  useEffect(() => {
    fetch("/api/events?limit=100")
      .then(r => r.json())
      .then(d => setEvents((d.data || []).map((e: { event_id: number; event_name: string }) => ({ event_id: e.event_id, event_name: e.event_name }))));
  }, []);

  useEffect(() => {
    if (!selectedEvent) { setSessions([]); return; }
    fetch(`/api/events/${selectedEvent}`)
      .then(r => r.json())
      .then(d => setSessions(d.data?.sessions || []));
  }, [selectedEvent]);

  const fetchAttendance = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    const params = new URLSearchParams({ event_id: selectedEvent });
    if (selectedSession) params.set("session_id", selectedSession);
    const res = await fetch(`/api/attendance?${params}`);
    const { data } = await res.json();
    setAttendance(data || []);
    setLoading(false);
  }, [selectedEvent, selectedSession]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  async function markManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualRoll || !selectedEvent) return;
    setMarking(true); setMarkMsg("");

    // Find participant by roll number
    const pRes = await fetch(`/api/participants?search=${manualRoll}&limit=1`);
    const pData = await pRes.json();
    const participant = pData.data?.[0];

    if (!participant) {
      setMarkMsg("❌ Participant not found with that roll number");
      setMarking(false); return;
    }

    const payload = {
      event_id: Number(selectedEvent),
      session_id: selectedSession ? Number(selectedSession) : null,
      participant_id: participant.participant_id,
      attendance_status: "present",
      attendance_source: "manual",
      check_in_at: new Date().toISOString(),
    };

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMarkMsg(`✓ Marked ${participant.full_name} as present`);
      setManualRoll("");
      fetchAttendance();
    } else {
      const d = await res.json();
      setMarkMsg(`❌ ${d.error}`);
    }
    setMarking(false);
  }

  const presentCount = attendance.filter(a => a.attendance_status === "present").length;
  const lateCount = attendance.filter(a => a.attendance_status === "late").length;

  const STATUS_COLORS: Record<string, string> = {
    present: "#16a34a", absent: "#dc2626", late: "#d97706", partial: "#0284c7",
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Attendance</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Track and mark participant attendance</p>
        </div>
        <button
          className={`btn ${markMode ? "btn-accent" : "btn-primary"}`}
          onClick={() => setMarkMode(m => !m)}
        >
          {markMode ? "✕ Close Mark Mode" : "◈ Mark Attendance"}
        </button>
      </div>

      {/* Selectors */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select className="input" value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); setSelectedSession(""); }} style={{ minWidth: "220px" }}>
          <option value="">Select event</option>
          {events.map(e => <option key={e.event_id} value={e.event_id}>{e.event_name}</option>)}
        </select>
        {sessions.length > 0 && (
          <select className="input" value={selectedSession} onChange={e => setSelectedSession(e.target.value)} style={{ minWidth: "180px" }}>
            <option value="">All sessions</option>
            {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.session_name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      {selectedEvent && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "Present", value: presentCount, color: "#16a34a" },
            { label: "Late", value: lateCount, color: "#d97706" },
            { label: "Total Logged", value: attendance.length, color: "var(--navy)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 18px" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Manual mark panel */}
      {markMode && selectedEvent && (
        <div className="card" style={{ padding: "20px", marginBottom: "16px", borderLeft: "3px solid var(--saffron)" }}>
          <h4 style={{ marginBottom: "12px", fontSize: "15px" }}>Manual Entry</h4>
          <form onSubmit={markManual} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="label">Roll Number / Name Search</label>
              <input
                className="input"
                value={manualRoll}
                onChange={e => setManualRoll(e.target.value)}
                placeholder="Enter roll number..."
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={marking || !manualRoll}>
              {marking ? "Marking..." : "Mark Present"}
            </button>
          </form>
          {markMsg && (
            <div style={{ marginTop: "10px", fontSize: "13px", color: markMsg.startsWith("✓") ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
              {markMsg}
            </div>
          )}
        </div>
      )}

      {/* Attendance log table */}
      {!selectedEvent ? (
        <div className="card" style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>◈</div>
          <p>Select an event to view attendance logs</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
                Loading attendance...
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participant</th>
                    <th>Roll No</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((log, idx) => {
                    const p = (log as any).participant;
                    const s = (log as any).session;
                    return (
                      <tr key={log.attendance_id}>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p?.full_name || "—"}</td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{p?.roll_number || "—"}</td>
                        <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{s?.session_name || "All"}</td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: STATUS_COLORS[log.attendance_status] }}>
                            {log.attendance_status}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {log.check_in_at ? new Date(log.check_in_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", padding: "2px 7px", background: "var(--cream-dark)", borderRadius: "4px", textTransform: "capitalize" }}>
                            {log.attendance_source}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {attendance.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                      No attendance records yet for this event
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
