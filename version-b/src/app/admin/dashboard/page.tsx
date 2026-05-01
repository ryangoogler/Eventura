import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [events, registrations, participants, activeEvents, recentEvents] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("participants").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("events")
      .select("event_id, event_name, event_code, category, status, event_start_at, primary_department_id")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  return {
    totalEvents: events.count || 0,
    totalRegistrations: registrations.count || 0,
    totalParticipants: participants.count || 0,
    activeEvents: activeEvents.count || 0,
    recentEvents: recentEvents.data || [],
  };
}

const STATUS_COLORS: Record<string, string> = {
  published: "#16a34a", draft: "#94a3b8", submitted: "#d97706",
  approved: "#0284c7", cancelled: "#dc2626", completed: "#7e22ce", archived: "#94a3b8",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const stats = await getStats(supabase);

  const statCards = [
    { label: "Total Events", value: stats.totalEvents, icon: "◆", color: "#0284c7", sub: "All time" },
    { label: "Active Events", value: stats.activeEvents, icon: "◉", color: "#16a34a", sub: "Currently published" },
    { label: "Registrations", value: stats.totalRegistrations, icon: "◈", color: "#d97706", sub: "Across all events" },
    { label: "Participants", value: stats.totalParticipants, icon: "◎", color: "#7e22ce", sub: "Unique individuals" },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", color: "var(--navy)", marginBottom: "6px" }}>
          Overview
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
          Welcome back — here&apos;s what&apos;s happening across the portal.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card" style={{ "--accent": card.color } as React.CSSProperties}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--navy)", lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>
                  {card.value.toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>{card.sub}</div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: "12px", fontSize: "20px",
                background: `${card.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: card.color,
              }}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent events + quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px" }}>
        {/* Recent Events */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "17px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Recent Events</h3>
            <Link href="/admin/events" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "13px" }}>View all →</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map((ev) => (
                  <tr key={ev.event_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{ev.event_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{ev.event_code}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${ev.category}`}>{ev.category}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                        color: STATUS_COLORS[ev.status] || "#94a3b8",
                        letterSpacing: "0.04em",
                      }}>{ev.status}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {new Date(ev.event_start_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
                {stats.recentEvents.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>No events yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h4 style={{ marginBottom: "14px", fontSize: "15px" }}>Quick Actions</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Create New Event", href: "/admin/events?new=1", icon: "◆" },
                { label: "View Analytics", href: "/admin/analytics", icon: "◎" },
                { label: "Ask AI Assistant", href: "/admin/ai", icon: "✦" },
                { label: "Manage Users", href: "/admin/users", icon: "◉" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "8px",
                    background: "var(--cream)", border: "1px solid var(--border)",
                    textDecoration: "none", color: "var(--text-primary)",
                    fontSize: "13px", fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ color: "var(--saffron-dark)", fontSize: "14px" }}>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "20px", background: "var(--navy)" }}>
            <div style={{ color: "var(--saffron)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              ✦ AI Assistant
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5, marginBottom: "14px" }}>
              Ask anything about your event data in plain English.
            </p>
            <Link href="/admin/ai" className="btn btn-accent" style={{ fontSize: "13px", width: "100%", justifyContent: "center" }}>
              Open Chat →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
