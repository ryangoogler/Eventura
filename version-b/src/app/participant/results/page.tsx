"use client";
import { useState } from "react";
import type { Result } from "@/types";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function ParticipantResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setSearched(false);

    const pRes = await fetch(`/api/participants?search=${encodeURIComponent(lookupEmail)}&limit=1`);
    const pData = await pRes.json();
    const participant = pData.data?.[0];

    if (!participant) {
      setError("No participant found with that email.");
      setLoading(false); return;
    }

    const rRes = await fetch(`/api/results?participant_id=${participant.participant_id}`);
    const rData = await rRes.json();
    setResults(rData.data || []);
    setSearched(true);
    setLoading(false);
  }

  // Also fetch public event results by event
  const [eventResults, setEventResults] = useState<Result[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [events, setEvents] = useState<{ event_id: number; event_name: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [evLoading, setEvLoading] = useState(false);

  useState(() => {
    fetch("/api/events?status=completed&limit=50")
      .then(r => r.json())
      .then(d => setEvents((d.data || []).map((e: { event_id: number; event_name: string }) => ({ event_id: e.event_id, event_name: e.event_name }))));
  });

  async function fetchEventResults(eventId: string) {
    setEvLoading(true);
    const res = await fetch(`/api/results?event_id=${eventId}`);
    const data = await res.json();
    setEventResults(data.data || []);
    setEvLoading(false);
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Results</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>View your personal results and public event leaderboards</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* My Results */}
        <div>
          <h3 style={{ fontSize: "18px", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>My Results</h3>
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <form onSubmit={lookup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {error && <div style={{ background: "#fee2e2", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}
              <div>
                <label className="label">Your Email</label>
                <input className="input" type="email" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} placeholder="you@dav.edu.in" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Looking up..." : "Find My Results"}</button>
            </form>
          </div>

          {searched && (
            results.length === 0 ? (
              <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>◎</div>
                <p>No results found yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {results.map(r => {
                  const evName = (r as { event?: { event_name?: string } }).event?.event_name;
                  return (
                    <div key={r.result_id} className="card" style={{ padding: "16px 18px", borderLeft: `3px solid ${r.result_status === "winner" ? "#f5a623" : r.result_status === "runner_up" ? "#94a3b8" : "#0284c7"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>{evName || "Event"}</span>
                        <span style={{ fontSize: "20px" }}>{RANK_MEDALS[r.rank_position || 0] || ""}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                        {r.result_status.replace("_", " ")} {r.rank_position ? `· Rank #${r.rank_position}` : ""}
                      </div>
                      {r.prize_title && <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>{r.prize_title} {r.prize_amount ? `· ₹${r.prize_amount.toLocaleString()}` : ""}</div>}
                      {r.certificate_issued && <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "6px", fontWeight: 600 }}>✓ Certificate Issued</div>}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Event Leaderboard */}
        <div>
          <h3 style={{ fontSize: "18px", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Event Leaderboard</h3>
          <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
            <select className="input" value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); if (e.target.value) fetchEventResults(e.target.value); }} style={{ flex: 1 }}>
              <option value="">Select a completed event</option>
              {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>)}
            </select>
          </div>

          {evLoading ? (
            <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto" }} />
            </div>
          ) : selectedEvent && eventResults.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {eventResults.slice(0, 10).map((r, i) => {
                const name = (r.participant as { full_name?: string })?.full_name || (r.team as { team_name?: string })?.team_name || "—";
                return (
                  <div key={r.result_id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "20px", width: 28, textAlign: "center" }}>
                      {RANK_MEDALS[r.rank_position || 0] || <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 700 }}>#{i + 1}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{name}</div>
                      {r.prize_title && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.prize_title}</div>}
                    </div>
                    {r.prize_amount && <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: 700 }}>₹{r.prize_amount.toLocaleString()}</div>}
                  </div>
                );
              })}
            </div>
          ) : selectedEvent ? (
            <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No results published yet</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
