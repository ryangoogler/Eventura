"use client";
import { useState, useEffect, useCallback } from "react";
import type { Result } from "@/types";

interface EventOption { event_id: number; event_name: string; }

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const STATUS_COLORS: Record<string, string> = {
  winner: "#f5a623", runner_up: "#94a3b8", finalist: "#0284c7",
  participant: "#64748b", disqualified: "#dc2626",
};

export default function OrganiserResultsPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    participant_id: "", team_id: "", result_status: "participant",
    rank_position: "", prize_title: "", prize_amount: "",
    certificate_issued: false, remarks: "",
  });

  useEffect(() => {
    fetch("/api/events?limit=100")
      .then(r => r.json())
      .then(d => setEvents((d.data || []).map((e: { event_id: number; event_name: string }) => ({ event_id: e.event_id, event_name: e.event_name }))));
  }, []);

  const fetchResults = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    const res = await fetch(`/api/results?event_id=${selectedEvent}`);
    const { data } = await res.json();
    setResults(data || []);
    setLoading(false);
  }, [selectedEvent]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = {
      event_id: Number(selectedEvent),
      participant_id: form.participant_id ? Number(form.participant_id) : null,
      team_id: form.team_id ? Number(form.team_id) : null,
      result_status: form.result_status,
      rank_position: form.rank_position ? Number(form.rank_position) : null,
      prize_title: form.prize_title || null,
      prize_amount: form.prize_amount ? Number(form.prize_amount) : null,
      certificate_issued: form.certificate_issued,
      remarks: form.remarks || null,
      published_at: new Date().toISOString(),
    };

    if (!payload.participant_id && !payload.team_id) {
      setError("Either participant ID or team ID is required"); setSaving(false); return;
    }

    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setShowForm(false);
    setForm({ participant_id: "", team_id: "", result_status: "participant", rank_position: "", prize_title: "", prize_amount: "", certificate_issued: false, remarks: "" });
    fetchResults();
    setSaving(false);
  }

  async function issueCertificate(resultId: number) {
    await fetch("/api/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result_id: resultId, certificate_issued: true }),
    });
    fetchResults();
  }

  const winners = results.filter(r => ["winner", "runner_up", "finalist"].includes(r.result_status))
    .sort((a, b) => (a.rank_position || 99) - (b.rank_position || 99));

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Results</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Publish winners, ranks and certificates</p>
        </div>
        {selectedEvent && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Result</button>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select className="input" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={{ maxWidth: "320px" }}>
          <option value="">Select an event</option>
          {events.map(e => <option key={e.event_id} value={e.event_id}>{e.event_name}</option>)}
        </select>
      </div>

      {!selectedEvent ? (
        <div className="card" style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>◎</div>
          <p>Select an event to manage its results</p>
        </div>
      ) : loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
        </div>
      ) : (
        <>
          {/* Winners podium */}
          {winners.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {winners.slice(0, 3).map(r => {
                const name = (r.participant as { full_name?: string })?.full_name || (r.team as { team_name?: string })?.team_name || "—";
                return (
                  <div key={r.result_id} className="card" style={{ padding: "20px", textAlign: "center", borderTop: `3px solid ${STATUS_COLORS[r.result_status]}` }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>{RANK_MEDALS[r.rank_position || 0] || "🏅"}</div>
                    <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>{name}</div>
                    <div style={{ fontSize: "12px", color: STATUS_COLORS[r.result_status], fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{r.result_status.replace("_", " ")}</div>
                    {r.prize_title && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{r.prize_title}</div>}
                    {r.prize_amount && <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: 700, marginTop: "4px" }}>₹{r.prize_amount.toLocaleString()}</div>}
                    {!r.certificate_issued && (
                      <button
                        className="btn btn-ghost"
                        style={{ marginTop: "10px", fontSize: "11px", padding: "4px 10px" }}
                        onClick={() => issueCertificate(r.result_id)}
                      >Issue Certificate</button>
                    )}
                    {r.certificate_issued && <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "8px", fontWeight: 600 }}>✓ Certificate Issued</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Full results table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: "14px", fontWeight: 600 }}>
              All Results ({results.length})
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Participant / Team</th>
                    <th>Status</th>
                    <th>Prize</th>
                    <th>Certificate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => {
                    const name = (r.participant as { full_name?: string })?.full_name || (r.team as { team_name?: string })?.team_name || "—";
                    return (
                      <tr key={r.result_id}>
                        <td style={{ fontWeight: 700, fontSize: "16px" }}>{RANK_MEDALS[r.rank_position || 0] || r.rank_position || "—"}</td>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: STATUS_COLORS[r.result_status] }}>
                            {r.result_status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ fontSize: "13px" }}>
                          {r.prize_title && <div>{r.prize_title}</div>}
                          {r.prize_amount && <div style={{ color: "#16a34a", fontWeight: 600 }}>₹{r.prize_amount.toLocaleString()}</div>}
                        </td>
                        <td>
                          {r.certificate_issued
                            ? <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>✓ Issued</span>
                            : <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Not issued</span>}
                        </td>
                        <td>
                          {!r.certificate_issued && (
                            <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => issueCertificate(r.result_id)}>
                              Issue Cert
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {results.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>No results published yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add result modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,45,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", backdropFilter: "blur(4px)" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "460px", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", background: "var(--navy)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "var(--white)", fontSize: "18px", fontFamily: "'DM Serif Display', serif" }}>Add Result</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "var(--white)", width: 30, height: 30, borderRadius: "8px", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}
              <div>
                <label className="label">Participant ID (or leave blank for team)</label>
                <input className="input" type="number" value={form.participant_id} onChange={e => setForm(f => ({ ...f, participant_id: e.target.value }))} placeholder="e.g. 42" />
              </div>
              <div>
                <label className="label">Team ID (or leave blank for individual)</label>
                <input className="input" type="number" value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))} placeholder="e.g. 7" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="label">Result Status *</label>
                  <select className="input" value={form.result_status} onChange={e => setForm(f => ({ ...f, result_status: e.target.value }))}>
                    {["winner", "runner_up", "finalist", "participant", "disqualified"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Rank Position</label>
                  <input className="input" type="number" min={1} value={form.rank_position} onChange={e => setForm(f => ({ ...f, rank_position: e.target.value }))} placeholder="1, 2, 3..." />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="label">Prize Title</label>
                  <input className="input" value={form.prize_title} onChange={e => setForm(f => ({ ...f, prize_title: e.target.value }))} placeholder="Best Project" />
                </div>
                <div>
                  <label className="label">Prize Amount (₹)</label>
                  <input className="input" type="number" min={0} value={form.prize_amount} onChange={e => setForm(f => ({ ...f, prize_amount: e.target.value }))} placeholder="5000" />
                </div>
              </div>
              <div>
                <label className="label">Remarks</label>
                <input className="input" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.certificate_issued} onChange={e => setForm(f => ({ ...f, certificate_issued: e.target.checked }))} style={{ accentColor: "var(--navy)" }} />
                Certificate already issued
              </label>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Add Result"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
