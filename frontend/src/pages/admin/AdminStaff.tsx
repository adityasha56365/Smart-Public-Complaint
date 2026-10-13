import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { departmentService, userService } from "../../services/services";
import type { Department, PaginatedResponse, User } from "../../types";

export default function AdminStaff() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [newStaff, setNewStaff] = useState({ full_name: "", email: "", password: "", role: "officer", department_id: "" });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ page, page_size: 20, role: roleFilter || undefined, search: search || undefined });
      setData(res);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    departmentService.list().then(setDepartments).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newStaff.full_name || !newStaff.email || !newStaff.password) {
      setSaveMsg("Name, email, and password are required.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      await userService.create({
        ...newStaff,
        department_id: newStaff.department_id ? parseInt(newStaff.department_id) : undefined,
      });
      setNewStaff({ full_name: "", email: "", password: "", role: "officer", department_id: "" });
      setShowForm(false);
      fetchStaff();
      setSaveMsg("✓ Staff member created.");
    } catch (err: unknown) {
      setSaveMsg((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    setUpdatingId(u.id);
    try {
      await userService.update(u.id, { is_active: !u.is_active });
      fetchStaff();
    } catch {
      /**/
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ORGANIZATION</span>
          <h1>Officers &amp; staff</h1>
          <p>Manage staff roles, departments, and access.</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm(s => !s)}>
          <Icon name="plus" /> Add staff
        </button>
      </div>
      {showForm && (
        <div className="admin-panel" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>New staff member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label>Full name
              <input value={newStaff.full_name} onChange={e => setNewStaff(s => ({ ...s, full_name: e.target.value }))} placeholder="Full name" />
            </label>
            <label>Email
              <input type="email" value={newStaff.email} onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))} placeholder="officer@civicly.app" />
            </label>
            <label>Password
              <input type="password" value={newStaff.password} onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))} placeholder="Min 8 characters" />
            </label>
            <label>Role
              <select value={newStaff.role} onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}>
                <option value="officer">Officer</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>Department
              <select value={newStaff.department_id} onChange={e => setNewStaff(s => ({ ...s, department_id: e.target.value }))}>
                <option value="">No department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          </div>
          {saveMsg && (
            <p style={{ fontSize: 10, color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--error)", margin: "8px 0 0" }}>
              {saveMsg}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="primary-button" onClick={handleCreate} disabled={saving}>
              {saving ? <Spinner /> : "Create staff member"}
            </button>
            <button className="secondary-button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div className="admin-search" style={{ flex: 1 }}>
          <Icon name="search" />
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px", fontSize: 9, height: 37 }}
        >
          <option value="">All roles</option>
          <option value="officer">Officers</option>
          <option value="supervisor">Supervisors</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <section className="admin-panel">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.filter(u => u.role !== "citizen").map(u => (
              <tr key={u.id}>
                <td><strong style={{ fontSize: 10, color: "var(--navy)" }}>{u.full_name}</strong></td>
                <td>{u.email || "—"}</td>
                <td>
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: u.role === "admin" ? "#e8f3ef" : "#edf3f7",
                      color: u.role === "admin" ? "var(--teal)" : "var(--navy)",
                      borderRadius: 6,
                      padding: "3px 7px",
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td><span className={`status ${u.is_active ? "resolved" : "rejected"}`}><span></span>{u.is_active ? "Active" : "Inactive"}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td>
                  <button
                    className="secondary-button"
                    style={{ minHeight: 30, padding: "0 10px", fontSize: 9 }}
                    onClick={() => toggleActive(u)}
                    disabled={updatingId === u.id}
                  >
                    {updatingId === u.id ? <Spinner /> : u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && (data?.items || []).filter(u => u.role !== "citizen").length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  No staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && data.total > 20 && (
          <div className="pagination">
            <span>{data.total} staff members</span>
            <div>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
