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
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "officer",
    department_id: "",
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({
        page,
        page_size: 20,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      if (res && Array.isArray(res.items)) {
        setData(res);
      } else {
        setData({ total: 0, page: 1, page_size: 20, items: [] });
      }
    } catch {
      setData({ total: 0, page: 1, page_size: 20, items: [] });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    departmentService
      .list()
      .then(res => {
        if (Array.isArray(res)) {
          setDepartments(res);
        } else if (res && Array.isArray((res as any).items)) {
          setDepartments((res as any).items);
        } else {
          setDepartments([]);
        }
      })
      .catch(() => setDepartments([]));
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const fullName = (newStaff.full_name || "").trim();
    const email = (newStaff.email || "").trim();
    const phone = (newStaff.phone || "").trim();
    const password = newStaff.password || "";

    if (!fullName) {
      setSaveMsg("Full name is required.");
      return;
    }
    if (!email) {
      setSaveMsg("Email address is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setSaveMsg("Please enter a valid email address (e.g. officer@example.com).");
      return;
    }
    if (!password) {
      setSaveMsg("Password is required.");
      return;
    }
    if (password.length < 6) {
      setSaveMsg("Password must be at least 6 characters long.");
      return;
    }

    setSaving(true);
    setSaveMsg("");

    try {
      await userService.create({
        full_name: fullName,
        email: email,
        phone: phone || undefined,
        password: password,
        role: newStaff.role,
        department_id: newStaff.department_id ? parseInt(newStaff.department_id, 10) : undefined,
      });

      setNewStaff({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role: "officer",
        department_id: "",
      });
      setSaveMsg("✓ Staff member created successfully!");
      await fetchStaff();

      // Automatically hide form after brief confirmation
      setTimeout(() => {
        setShowForm(false);
        setSaveMsg("");
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown } }; message?: string };
      const detail = axiosErr?.response?.data?.detail;
      let errorText = "Failed to create staff member. Please verify the entered information.";

      if (typeof detail === "string") {
        errorText = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorText = detail
          .map((d: any) => {
            if (d && typeof d === "object") {
              const field = Array.isArray(d.loc) ? d.loc.slice(-1)[0] : "field";
              return `${field}: ${d.msg || "invalid value"}`;
            }
            return String(d);
          })
          .join("; ");
      } else if (detail && typeof detail === "object") {
        errorText = JSON.stringify(detail);
      } else if (axiosErr?.message) {
        errorText = axiosErr.message;
      }

      setSaveMsg(errorText);
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

  const deptList = Array.isArray(departments) ? departments : [];
  const staffList = (Array.isArray(data?.items) ? data.items : []).filter(
    u => u && u.role !== "citizen"
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ORGANIZATION</span>
          <h1>Officers &amp; staff</h1>
          <p>Manage municipal staff accounts, departmental assignments, and role access.</p>
        </div>
        <button
          id="btn-create-staff-toggle"
          className="primary-button"
          onClick={() => {
            setShowForm(s => !s);
            setSaveMsg("");
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Icon name={showForm ? "more" : "plus"} />
          {showForm ? "Close form" : "Create Staff Member"}
        </button>
      </div>

      {saveMsg && !showForm && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 12,
            fontWeight: 600,
            background: saveMsg.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
            color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--error)",
            border: `1px solid ${saveMsg.startsWith("✓") ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          {saveMsg}
        </div>
      )}

      {showForm && (
        <form
          className="admin-panel"
          onSubmit={handleCreate}
          style={{ padding: 22, marginBottom: 18, border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
                Create New Staff Member
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>
                Add an officer, supervisor, or administrative team member to Civicly.
              </p>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setShowForm(false);
                setSaveMsg("");
              }}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              ✕ Cancel
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Full name <span style={{ color: "var(--error)" }}>*</span>
              <input
                id="input-staff-name"
                value={newStaff.full_name}
                onChange={e => setNewStaff(s => ({ ...s, full_name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
                required
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Email address <span style={{ color: "var(--error)" }}>*</span>
              <input
                id="input-staff-email"
                type="email"
                value={newStaff.email}
                onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))}
                placeholder="officer@civicly.app"
                required
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Password <span style={{ color: "var(--error)" }}>*</span>
              <input
                id="input-staff-password"
                type="password"
                value={newStaff.password}
                onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))}
                placeholder="Min 6 characters"
                required
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Role <span style={{ color: "var(--error)" }}>*</span>
              <select
                id="select-staff-role"
                value={newStaff.role}
                onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, height: 38 }}
              >
                <option value="officer">Officer (Field &amp; Resolution)</option>
                <option value="supervisor">Supervisor (Queue &amp; Assignments)</option>
                <option value="admin">Admin (Full System Access)</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Department
              <select
                id="select-staff-dept"
                value={newStaff.department_id}
                onChange={e => setNewStaff(s => ({ ...s, department_id: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, height: 38 }}
              >
                <option value="">No department (General)</option>
                {deptList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.jurisdiction ? `(${d.jurisdiction})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600 }}>
              Phone number (optional)
              <input
                id="input-staff-phone"
                type="tel"
                value={newStaff.phone}
                onChange={e => setNewStaff(s => ({ ...s, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              />
            </label>
          </div>

          {saveMsg && (
            <div
              style={{
                marginTop: 14,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: saveMsg.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
                color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--error)",
                border: `1px solid ${saveMsg.startsWith("✓") ? "#a7f3d0" : "#fecaca"}`,
              }}
            >
              {saveMsg}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <button
              id="btn-create-staff-submit"
              type="submit"
              className="primary-button"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 170 }}
            >
              {saving && <span className="btn-spinner" />}
              <span>{saving ? "Creating staff member..." : "Create staff member"}</span>
              {!saving && <Icon name="arrow" />}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setShowForm(false);
                setSaveMsg("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="admin-search" style={{ flex: 1 }}>
          <Icon name="search" />
          <input
            id="input-staff-search"
            placeholder="Search by staff name or email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          id="select-staff-role-filter"
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", fontSize: 11, height: 37 }}
        >
          <option value="">All staff roles</option>
          <option value="officer">Officers only</option>
          <option value="supervisor">Supervisors only</option>
          <option value="admin">Admins only</option>
        </select>
      </div>

      <section className="admin-panel">
        {loading && (
          <div style={{ padding: 30, textAlign: "center" }}>
            <Spinner />
          </div>
        )}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ textAlign: "right", paddingRight: 18 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(u => (
              <tr key={u.id}>
                <td>
                  <strong style={{ fontSize: 11, color: "var(--navy)" }}>{u.full_name || "—"}</strong>
                </td>
                <td>{u.email || "—"}</td>
                <td>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: u.role === "admin" ? "#e8f3ef" : u.role === "supervisor" ? "#fef3c7" : "#edf3f7",
                      color: u.role === "admin" ? "var(--teal)" : u.role === "supervisor" ? "#b45309" : "var(--navy)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      display: "inline-block",
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`status ${u.is_active ? "resolved" : "rejected"}`}>
                    <span></span>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}</td>
                <td style={{ textAlign: "right", paddingRight: 18 }}>
                  <button
                    className="secondary-button"
                    style={{ minHeight: 30, padding: "0 10px", fontSize: 10 }}
                    onClick={() => toggleActive(u)}
                    disabled={updatingId === u.id}
                  >
                    {updatingId === u.id ? <span className="btn-spinner" /> : u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && staffList.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                  No staff members found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && data.total > 20 && (
          <div className="pagination">
            <span>{data.total} total staff records</span>
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
