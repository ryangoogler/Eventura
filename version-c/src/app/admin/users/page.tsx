"use client";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@/types";

interface Role { role_id: number; role_name: string; }
interface Department { department_id: number; department_name: string; }

const ROLE_COLORS: Record<string, string> = {
  admin: "#dc2626", management: "#d97706", organiser: "#0284c7", participant: "#16a34a",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", role_id: "", department_id: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [usersRes, rolesRes, deptsRes] = await Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/user-roles").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
    ]);
    setUsers(usersRes.data || []);
    setRoles(rolesRes.data || []);
    setDepartments(deptsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditUser(null);
    setForm({ full_name: "", email: "", password: "", phone: "", role_id: "", department_id: "", is_active: true });
    setError(""); setShowForm(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, password: "", phone: u.phone || "", role_id: String(u.role_id), department_id: String(u.department_id || ""), is_active: u.is_active });
    setError(""); setShowForm(true);
  }

  // Inline role change directly from the table row
  async function changeRole(userId: number, newRoleId: number) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role_id: newRoleId }),
    });
    fetchAll();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = { ...form, role_id: Number(form.role_id), department_id: form.department_id ? Number(form.department_id) : null };

    if (editUser) {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: editUser.user_id, ...payload }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
    } else {
      if (!form.password) { setError("Password is required for new users"); setSaving(false); return; }
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
    }
    setShowForm(false); fetchAll(); setSaving(false);
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || String(u.role_id) === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "30px", color: "var(--navy)" }}>Users</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{users.length} registered users — change roles directly from the table</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input className="input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: "280px" }} />
        <select className="input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: "auto" }}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", margin: "0 auto 12px" }} />
              Loading users...
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const roleName = (u.role as { role_name?: string })?.role_name || "";
                  const deptName = (u.department as { department_name?: string })?.department_name;
                  return (
                    <tr key={u.user_id}>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{u.email}</td>
                      <td>
                        {/* Inline role changer */}
                        <select
                          value={u.role_id}
                          onChange={e => changeRole(u.user_id, Number(e.target.value))}
                          style={{
                            border: "1px solid var(--border)", borderRadius: "6px",
                            padding: "3px 8px", fontSize: "12px", fontWeight: 700,
                            color: ROLE_COLORS[roleName] || "#64748b",
                            background: `${ROLE_COLORS[roleName] || "#64748b"}14`,
                            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>{deptName || "—"}</td>
                      <td>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: u.is_active ? "#16a34a" : "#94a3b8" }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => openEdit(u)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,45,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", backdropFilter: "blur(4px)" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "480px", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", background: "var(--navy)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "var(--white)", fontSize: "18px", fontFamily: "'DM Serif Display', serif" }}>{editUser ? "Edit User" : "Add New User"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "var(--white)", width: 30, height: 30, borderRadius: "8px", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}
              <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={!!editUser} /></div>
              {!editUser && <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div>}
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Role *</label>
                <select className="input" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} required>
                  <option value="">Select role</option>
                  {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                </select>
              </div>
              <div><label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                  <option value="">None</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
              </div>
              {editUser && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: "var(--navy)" }} />
                  Active account
                </label>
              )}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : editUser ? "Update" : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
