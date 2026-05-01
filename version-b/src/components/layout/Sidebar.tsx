"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  role: "admin" | "organiser" | "participant";
  userName?: string;
  userEmail?: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "◈" },
    { label: "Events", href: "/admin/events", icon: "◆" },
    { label: "Users", href: "/admin/users", icon: "◉" },
    { label: "Analytics", href: "/admin/analytics", icon: "◎" },
    { label: "AI Assistant", href: "/admin/ai", icon: "✦" },
  ],
  organiser: [
    { label: "My Events", href: "/organiser/events", icon: "◆" },
    { label: "Participants", href: "/organiser/participants", icon: "◉" },
    { label: "Attendance", href: "/organiser/attendance", icon: "◈" },
    { label: "Results", href: "/organiser/results", icon: "◎" },
    { label: "Analytics", href: "/organiser/analytics", icon: "▣" },
    { label: "AI Assistant", href: "/organiser/ai", icon: "✦" },
  ],
  participant: [
    { label: "Browse Events", href: "/participant/events", icon: "◆" },
    { label: "My Registrations", href: "/participant/registrations", icon: "◈" },
    { label: "My Results", href: "/participant/results", icon: "◎" },
    { label: "Profile", href: "/participant/profile", icon: "◉" },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#dc2626",
  organiser: "#0284c7",
  participant: "#16a34a",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  organiser: "Organiser",
  participant: "Participant",
};

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = NAV_ITEMS[role] || [];

  function handleLogout() {
    sessionStorage.removeItem("portal_role");
    router.push("/");
  }

  return (
    <div className="sidebar">
      {/* Top saffron bar */}
      <div style={{ height: "3px", background: "var(--saffron)", flexShrink: 0 }} />

      {/* Logo */}
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 36, height: 36, background: "var(--saffron)",
            borderRadius: "10px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "18px", flexShrink: 0,
          }}>🎓</div>
          <div>
            <div style={{ color: "var(--white)", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>Eventura</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Event Management
            </div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: ROLE_COLORS[role],
            }} />
            <span style={{ fontSize: "10px", color: ROLE_COLORS[role], fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {ROLE_LABELS[role]}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "var(--white)", fontWeight: 600 }}>{userName || "User"}</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 16px 12px" }} />

      {/* Nav */}
      <nav style={{ padding: "0 10px", flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              style={{ marginBottom: "2px" }}
            >
              <span style={{ fontSize: "14px", width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
              {item.label === "AI Assistant" && (
                <span style={{
                  marginLeft: "auto", fontSize: "9px", padding: "1px 6px",
                  background: isActive ? "rgba(15,27,45,0.2)" : "var(--saffron)",
                  color: isActive ? "var(--navy)" : "var(--navy)",
                  borderRadius: "99px", fontWeight: 700, letterSpacing: "0.04em",
                }}>BETA</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 10px 20px" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: "12px" }} />
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ width: "100%", border: "none", cursor: "pointer", background: "none" }}
        >
          <span style={{ fontSize: "14px" }}>⎋</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}
