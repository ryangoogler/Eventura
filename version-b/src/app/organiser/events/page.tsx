"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Event } from "@/types";
import EventForm from "@/components/forms/EventForm";

const STATUS_COLORS: Record<string, string> = {
  published: "#16a34a", draft: "#94a3b8", submitted: "#d97706",
  approved: "#0284c7", cancelled: "#dc2626", completed: "#7e22ce",
};

export default function OrganiserEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/events?limit=100");
    const { data } = await res.json();
    setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>My Events</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{events.length} events</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowForm(true); }}>
          + New Event
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
          Loading your events...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {events.map(ev => (
            <div key={ev.event_id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span className={`badge badge-${ev.category}`}>{ev.category}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: STATUS_COLORS[ev.status] || "#94a3b8" }}>
                  {ev.status}
                </span>
              </div>
              <h3 style={{ fontSize: "16px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{ev.event_name}</h3>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{ev.event_code}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                {new Date(ev.event_start_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: "12px", padding: "6px 12px", flex: 1 }}
                  onClick={() => { setEditEvent(ev); setShowForm(true); }}
                >Edit</button>
                <Link
                  href={`/organiser/participants?event_id=${ev.event_id}`}
                  className="btn btn-primary"
                  style={{ fontSize: "12px", padding: "6px 12px", flex: 1, justifyContent: "center" }}
                >Participants →</Link>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>◆</div>
              <p style={{ marginBottom: "16px" }}>No events yet. Create your first one!</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Event</button>
            </div>
          )}
        </div>
      )}

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
