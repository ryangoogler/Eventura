"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    subtitle: "Full system control",
    href: "/admin/dashboard",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    icon: "◈",
    perms: ["Manage all events", "Manage users & roles", "View all analytics", "AI assistant", "System configuration"],
  },
  {
    key: "organiser",
    label: "Organiser",
    subtitle: "Event management",
    href: "/organiser/events",
    color: "#0284c7",
    bg: "rgba(2,132,199,0.08)",
    icon: "◆",
    perms: ["Create & edit events", "Manage participants", "Track attendance", "Publish results", "View analytics"],
  },
  {
    key: "participant",
    label: "Participant",
    subtitle: "Browse & register",
    href: "/participant/events",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.08)",
    icon: "◉",
    perms: ["Browse events", "Register for events", "View results", "Track registrations"],
  },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If role already chosen in this session, go straight in
    const saved = sessionStorage.getItem("portal_role");
    if (saved) {
      const r = ROLES.find(x => x.key === saved);
      if (r) router.replace(r.href);
    }
  }, [router]);

  function enter(role: typeof ROLES[0]) {
    sessionStorage.setItem("portal_role", role.key);
    router.push(role.href);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ fontSize: "13px", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
          DAV Event Portal
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, color: "var(--navy)", margin: 0, letterSpacing: "-0.02em" }}>
          Who are you?
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "12px", fontSize: "15px" }}>
          Select your role to continue
        </p>
      </div>

      {/* Role cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
        width: "100%",
        maxWidth: "820px",
      }}>
        {ROLES.map(role => (
          <button
            key={role.key}
            onClick={() => enter(role)}
            style={{
              background: "var(--card-bg)",
              border: `2px solid transparent`,
              borderRadius: "16px",
              padding: "28px 24px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = role.color;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.12)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
            }}
          >
            {/* Icon + label */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: role.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "22px", color: role.color,
              }}>
                {role.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--navy)" }}>{role.label}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{role.subtitle}</div>
              </div>
            </div>

            {/* Permissions list */}
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {role.perms.map(p => (
                <li key={p} style={{ fontSize: "13px", color: "var(--text-muted)", padding: "3px 0", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: role.color, fontSize: "10px" }}>●</span>
                  {p}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div style={{
              marginTop: "20px", padding: "10px 0", borderTop: "1px solid var(--border)",
              fontSize: "13px", fontWeight: 600, color: role.color, display: "flex",
              alignItems: "center", justifyContent: "space-between",
            }}>
              Enter as {role.label} <span>→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Demo note */}
      <p style={{
        marginTop: "40px", fontSize: "12px", color: "var(--text-muted)",
        textAlign: "center", maxWidth: "440px", lineHeight: 1.6,
      }}>
        <strong>Demo mode</strong> — login authentication is a planned feature.
        Role-based access controls are enforced at the data layer.
      </p>
    </div>
  );
}
