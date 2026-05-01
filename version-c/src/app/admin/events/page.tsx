"use client";
import { useState, useEffect, useCallback } from "react";
import type { Event } from "@/types";
import EventForm from "@/components/forms/EventForm";

const STATUS_COLORS: Record<string, string> = {
  published: "#16a34a", draft: "#94a3b8", submitted: "#d97706",
  approved: "#0284c7", cancelled: "#dc2626", completed: "#7e22ce", archived: "#94a3b8",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/events?${params}`);
    const { data, count } = await res.json();
    setEvents(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [filterStatus, filterCategory]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function updateStatus(eventId: number, status: string) {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchEvents();
  }

  const filtered = events.filter(e =>
    !search || e.event_name.toLowerCase().includes(search.toLowerCase()) ||
    e.event_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "30px", color: "var(--navy)", marginBottom: "4px" }}>Events</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{total} events total</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowForm(true); }}>
          + Create Event
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          className="input" placeholder="Search events..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: "240px" }}
        />
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: "auto" }}>
          <option value="">All statuses</option>
          {["draft","submitted","approved","published","completed","cancelled","archived"].map(s =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
        <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: "auto" }}>
          <option value="">All categories</option>
          {["technical","cultural","sports","workshop","seminar","other"].map(c =>
            <option key={c} value={c}>{c}</option>
          )}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
              Loading events...
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev.event_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.event_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{ev.event_code}</div>
                    </td>
                    <td><span className={`badge badge-${ev.category}`}>{ev.category}</span></td>
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{ev.event_mode}</td>
                    <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {new Date(ev.event_start_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <select
                        value={ev.status}
                        onChange={e => updateStatus(ev.event_id, e.target.value)}
                        style={{
                          border: "none", background: "none", fontSize: "12px",
                          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                          color: STATUS_COLORS[ev.status] || "#94a3b8", cursor: "pointer",
                        }}
                      >
                        {["draft","submitted","approved","published","completed","cancelled","archived"].map(s =>
                          <option key={s} value={s}>{s}</option>
                        )}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "5px 10px", fontSize: "12px" }}
                          onClick={() => { setEditEvent(ev); setShowForm(true); }}
                        >Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                    No events found
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Event form modal */}
      {showForm && (
        <EventForm
          event={editEvent}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchEvents(); }}
        />
      )}
    </div>
  );
}
