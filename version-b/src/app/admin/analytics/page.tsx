"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#0f1b2d", "#f5a623", "#0284c7", "#16a34a", "#7e22ce", "#dc2626", "#d97706"];

export default function AnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "12px" }}>
      <div className="spinner" style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%" }} />
      <p style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
    </div>
  );

  if (!data) return <div>Failed to load analytics</div>;

  const summary = data.summary as Record<string, number>;
  const monthlyFreq = (data.monthlyFrequency as { event_month: string; event_count: number }[]) || [];
  const deptCounts = (data.deptEventCounts as { department_name: string; total_events: number }[]) || [];
  const topEvents = (data.topEvents as { event_name: string; reg_count: number }[]) || [];
  const categoryFeedback = (data.categoryFeedback as { category: string; avg_rating: number }[]) || [];
  const conversionRates = (data.conversionRates as { event_name: string; conversion_rate: number }[]) || [];
  const activeOrganizers = (data.activeOrganizers as { full_name: string; events_managed: number }[]) || [];
  const participantRatio = (data.participantRatio as { event_name: string; internal_count: number; external_count: number }[]) || [];

  const statCards = [
    { label: "Total Events", value: summary?.totalEvents || 0, color: "#0284c7" },
    { label: "Active Events", value: summary?.activeEvents || 0, color: "#16a34a" },
    { label: "Total Registrations", value: summary?.totalRegistrations || 0, color: "#d97706" },
    { label: "Unique Participants", value: summary?.totalParticipants || 0, color: "#7e22ce" },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Analytics</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>Live data from your event views</p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "6px" }}>{card.label}</div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: card.color, fontFamily: "'DM Serif Display', serif" }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Monthly + Department */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Events per Month</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyFreq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="event_month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="event_count" stroke="#0f1b2d" strokeWidth={2} dot={{ fill: "#f5a623", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Events by Department</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptCounts.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="department_name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="total_events" fill="#0f1b2d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Top events + Category feedback */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Top Events by Registrations</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topEvents.slice(0, 7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="event_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="reg_count" fill="#f5a623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Avg Feedback by Category</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryFeedback} dataKey="avg_rating" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, avg_rating }) => `${category}: ${avg_rating}`}>
                {categoryFeedback.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Conversion + Internal/External */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Registration → Attendance Conversion (%)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conversionRates.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="event_name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, "Conversion Rate"]} />
              <Bar dataKey="conversion_rate" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <h4 style={{ marginBottom: "16px", fontSize: "15px" }}>Internal vs External Participants</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={participantRatio.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="event_name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="internal_count" name="Internal" fill="#0f1b2d" stackId="a" />
              <Bar dataKey="external_count" name="External" fill="#f5a623" stackId="a" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active organizers table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h4 style={{ fontSize: "15px" }}>Most Active Organizers</h4>
        </div>
        <table>
          <thead>
            <tr><th>Organizer</th><th>Events Managed</th><th>Activity</th></tr>
          </thead>
          <tbody>
            {activeOrganizers.map((org, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{org.full_name}</td>
                <td>{org.events_managed}</td>
                <td>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 4, width: "100%", maxWidth: "200px" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: "var(--navy)",
                      width: `${Math.min(100, (org.events_managed / (activeOrganizers[0]?.events_managed || 1)) * 100)}%`,
                    }} />
                  </div>
                </td>
              </tr>
            ))}
            {activeOrganizers.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
