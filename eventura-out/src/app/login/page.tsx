"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("Something seems off — check your email or password.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/auth/me");
      const { profile } = await res.json();
      const role = profile?.role?.role_name;
      if (role === "admin" || role === "management") router.push("/admin/dashboard");
      else if (role === "organiser") router.push("/organiser/events");
      else router.push("/participant/events");
    } catch {
      setError("Something seems off — please try again.");
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something seems off — please try again.");
        setLoading(false);
        return;
      }
      setSignupSuccess(true);
      setLoading(false);
    } catch {
      setError("Something seems off — please try again.");
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    color: "var(--white)",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--navy)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(245,166,35,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(58,95,138,0.3) 0%, transparent 50%)",
      }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--saffron)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px", padding: "24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "14px",
            background: "var(--saffron)", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            marginBottom: "14px", fontSize: "26px",
          }}>✦</div>
          <h1 style={{ color: "var(--white)", fontSize: "30px", fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.5px" }}>
            Eventura
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "5px" }}>
            Collegiate Event Management
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", background: "rgba(255,255,255,0.06)",
          borderRadius: "12px", padding: "4px", marginBottom: "20px",
        }}>
          {(["signin", "signup"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSignupSuccess(false); }}
              style={{
                flex: 1, padding: "9px", border: "none", borderRadius: "9px", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                background: tab === t ? "var(--saffron)" : "transparent",
                color: tab === t ? "var(--navy)" : "rgba(255,255,255,0.5)",
                transition: "all 0.15s",
              }}>
              {t === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px", padding: "28px",
          backdropFilter: "blur(12px)",
        }}>
          {/* Sign In */}
          {tab === "signin" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Email address</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required style={inputStyle} />
              </div>
              <div>
                <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={inputStyle} />
              </div>
              {error && (
                <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn" style={{ background: "var(--saffron)", color: "var(--navy)", justifyContent: "center", padding: "12px", fontSize: "15px", marginTop: "2px" }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(15,27,45,0.3)", borderTopColor: "var(--navy)", borderRadius: "50%", display: "inline-block" }} />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          )}

          {/* Sign Up */}
          {tab === "signup" && (
            signupSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <h3 style={{ color: "var(--white)", marginBottom: "8px", fontFamily: "'DM Serif Display', serif" }}>Account Created!</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.6, marginBottom: "18px" }}>
                  Your participant account is ready. You can sign in now.
                </p>
                <button className="btn" onClick={() => { setTab("signin"); setSignupSuccess(false); setError(""); }}
                  style={{ background: "var(--saffron)", color: "var(--navy)", justifyContent: "center", width: "100%", padding: "11px" }}>
                  Go to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Full Name</label>
                  <input className="input" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name" required style={inputStyle} />
                </div>
                <div>
                  <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Email address</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required style={inputStyle} />
                </div>
                <div>
                  <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters" required style={inputStyle} />
                </div>
                <div>
                  <label className="label" style={{ color: "rgba(255,255,255,0.7)" }}>Confirm Password</label>
                  <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required style={inputStyle} />
                </div>
                {error && (
                  <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>
                    {error}
                  </div>
                )}
                <div style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: "8px", padding: "10px 13px" }}>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    New accounts are created as <strong style={{ color: "var(--saffron)" }}>Participant</strong> by default. An admin can upgrade your role later.
                  </p>
                </div>
                <button type="submit" disabled={loading} className="btn" style={{ background: "var(--saffron)", color: "var(--navy)", justifyContent: "center", padding: "12px", fontSize: "15px" }}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
