"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, Area,
} from "recharts";

const C = {
  navy: "#0f1b2d", saffron: "#f5a623", blue: "#0284c7",
  green: "#16a34a", purple: "#7e22ce", red: "#dc2626",
  amber: "#d97706", indigo: "#6366f1", slate: "#94a3b8",
};
const PALETTE = Object.values(C);

type AnalyticsData = Record<string, unknown>;

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "32px", fontWeight: 800, color, fontFamily: "'DM Serif Display', serif" }}>
        {(value ?? 0).toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)" }}>{title}</h4>
        {subtitle && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>
      No data yet
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "participants" | "performance">("overview");

  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "12px" }}>
      <div className="spinner" style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%" }} />
      <p style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
    </div>
  );

  if (!data) return <div style={{ padding: 24, color: "var(--danger)" }}>Failed to load analytics. Check your Supabase views.</div>;

  const summary     = data.summary as Record<string, number> ?? {};
  const semTrends   = (data.semesterTrends as { event_month: string; events_count: number; total_registrations: number; unique_participants: number }[]) ?? [];
  const deptCounts  = (data.deptEventCounts as { department_name: string; total_events: number }[]) ?? [];
  const topEvents   = (data.topEvents as { event_name: string; reg_count: number; category: string }[]) ?? [];
  const catFeedback = (data.categoryFeedback as { category: string; avg_overall_rating: number; avg_content_rating: number; avg_organization_rating: number; feedback_count: number }[]) ?? [];
  const convRates   = (data.conversionRates as { event_name: string; conversion_rate: number; total_registrations: number }[]) ?? [];
  const partRatio   = (data.participantRatio as { event_name: string; internal_count: number; external_count: number }[]) ?? [];
  const activeOrgs  = (data.activeOrganizers as { full_name: string; events_managed: number; organizer_type: string }[]) ?? [];
  const deptPartic  = (data.deptParticipation as { department_name: string; total_registrations: number; unique_participants: number; events_hosted: number }[]) ?? [];
  const topPerf     = (data.topPerformers as { full_name: string; gold_count: number; silver_count: number; finalist_count: number; department_name: string }[]) ?? [];
  const interdept   = (data.interdeptComparison as { department_name: string; events_hosted: number; total_participants: number; avg_feedback_rating: number }[]) ?? [];

  const tabs = [
    { key: "overview",     label: "Overview" },
    { key: "departments",  label: "Departments" },
    { key: "participants", label: "Participants" },
    { key: "performance",  label: "Performance" },
  ] as const;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Analytics</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Live insights across all events — for HODs, management, and organisers
        </p>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        <StatCard label="Total Events"        value={summary.totalEvents ?? 0}        color={C.blue}   sub="All time" />
        <StatCard label="Active Events"       value={summary.activeEvents ?? 0}       color={C.green}  sub="Currently published" />
        <StatCard label="Total Registrations" value={summary.totalRegistrations ?? 0} color={C.amber}  sub="Across all events" />
        <StatCard label="Unique Participants" value={summary.totalParticipants ?? 0}  color={C.purple} sub="Distinct individuals" />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid var(--border)", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 18px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              background: "transparent", fontFamily: "'DM Sans', sans-serif",
              color: activeTab === t.key ? C.navy : "var(--text-muted)",
              borderBottom: activeTab === t.key ? `3px solid ${C.saffron}` : "3px solid transparent",
              marginBottom: "-2px", transition: "all 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Semester trend */}
          <ChartCard title="Semester Participation Trend" subtitle="Events, registrations and unique participants over time">
            {semTrends.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={semTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="event_month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="left" type="monotone" dataKey="total_registrations" name="Registrations"
                    fill={`${C.saffron}30`} stroke={C.saffron} strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="unique_participants" name="Unique Participants"
                    stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} />
                  <Bar yAxisId="right" dataKey="events_count" name="Events" fill={C.navy} opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Top events */}
            <ChartCard title="Top Events by Registrations" subtitle="Highest participation events">
              {topEvents.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topEvents.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="event_name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="reg_count" name="Registrations" fill={C.saffron} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Category distribution */}
            <ChartCard title="Category Breakdown" subtitle="Events by type">
              {topEvents.length === 0 ? <EmptyChart /> : (() => {
                const catMap: Record<string, number> = {};
                topEvents.forEach(e => { catMap[e.category] = (catMap[e.category] ?? 0) + e.reg_count; });
                const catData = Object.entries(catMap).map(([category, value]) => ({ category, value }));
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={catData} dataKey="value" nameKey="category" cx="50%" cy="50%"
                        outerRadius={80} innerRadius={35}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {catData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </ChartCard>
          </div>

          {/* Conversion rates */}
          <ChartCard title="Registration-to-Attendance Conversion" subtitle="How many registered participants actually attended">
            {convRates.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={convRates.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="event_name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 110]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`${v}%`, "Conversion"]} />
                  <Bar dataKey="conversion_rate" name="Conversion %" fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── TAB: Departments ──────────────────────────────────────────────── */}
      {activeTab === "departments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Events by dept */}
            <ChartCard title="Events Hosted by Department" subtitle="Department-wise event count">
              {deptCounts.filter(d => d.total_events > 0).length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptCounts.filter(d => d.total_events > 0).slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="department_name" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="total_events" name="Events" fill={C.navy} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Dept participation volume */}
            <ChartCard title="Participation Volume" subtitle="Registrations and unique participants per department">
              {deptPartic.filter(d => d.events_hosted > 0).length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptPartic.filter(d => d.events_hosted > 0).slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="department_name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={55} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total_registrations" name="Registrations" fill={C.saffron} />
                    <Bar dataKey="unique_participants" name="Unique Participants" fill={C.navy} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Inter-dept comparison table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700 }}>Inter-Department Comparison</h4>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Events, participants, external reach, and feedback score</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Events Hosted</th>
                  <th>Total Participants</th>
                  <th>External Participants</th>
                  <th>Avg Feedback</th>
                </tr>
              </thead>
              <tbody>
                {interdept.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No data yet</td></tr>
                ) : interdept.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.department_name}</td>
                    <td>{d.events_hosted}</td>
                    <td>{d.total_participants}</td>
                    <td>{(d as { external_participants?: number }).external_participants ?? "—"}</td>
                    <td>{d.avg_feedback_rating ? `${d.avg_feedback_rating} / 5` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Participants ─────────────────────────────────────────────── */}
      {activeTab === "participants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Internal vs external */}
            <ChartCard title="Internal vs External Participants" subtitle="Per event breakdown">
              {partRatio.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={partRatio.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="event_name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="internal_count" name="Internal" fill={C.navy} stackId="a" />
                    <Bar dataKey="external_count" name="External" fill={C.saffron} stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Feedback ratings */}
            <ChartCard title="Avg Feedback Ratings by Category" subtitle="Overall, content, and organisation scores">
              {catFeedback.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={catFeedback}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [Number(v).toFixed(2), ""]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avg_overall_rating"      name="Overall"       fill={C.navy}   />
                    <Bar dataKey="avg_content_rating"      name="Content"       fill={C.saffron} />
                    <Bar dataKey="avg_organization_rating" name="Organisation"  fill={C.blue}   />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── TAB: Performance ─────────────────────────────────────────────── */}
      {activeTab === "performance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Top performers */}
          <ChartCard title="Top Performers Across Competitions" subtitle="Students with most wins, runner-up finishes, and final appearances">
            {topPerf.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topPerf.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="full_name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gold_count"     name="1st Place" fill={C.saffron} />
                  <Bar dataKey="silver_count"   name="2nd Place" fill={C.slate}   />
                  <Bar dataKey="finalist_count" name="Finalist"  fill={C.blue}    />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Active organizers table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700 }}>Active Organizers</h4>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Ranked by number of events managed</p>
            </div>
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Events Managed</th><th>Activity</th></tr>
              </thead>
              <tbody>
                {activeOrgs.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No data yet</td></tr>
                ) : activeOrgs.map((org, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{org.full_name}</td>
                    <td><span style={{ fontSize: 11, padding: "2px 8px", background: "var(--cream-dark)", borderRadius: 4, textTransform: "capitalize" }}>{org.organizer_type}</span></td>
                    <td>{org.events_managed}</td>
                    <td>
                      <div style={{ height: 7, background: "var(--border)", borderRadius: 4, width: "100%", maxWidth: 160 }}>
                        <div style={{ height: "100%", borderRadius: 4, background: C.navy, width: `${Math.min(100, (org.events_managed / (activeOrgs[0]?.events_managed || 1)) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
