import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { departmentService } from "../../services/services";
import type { DepartmentWithStats } from "../../types";

const JURISDICTION_PRESETS = [
  "City-wide",
  "Central Zone",
  "North Zone",
  "South Zone",
  "East Zone",
  "West Zone",
  "Ward 1-10",
  "Industrial Area",
];

export default function AdminDepartments() {
  const cached = departmentService.getCachedWithStats();
  const [depts, setDepts] = useState<DepartmentWithStats[]>(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [showForm, setShowForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", jurisdiction: "", description: "" });
  const [editDept, setEditDept] = useState<DepartmentWithStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchDepts = useCallback(async (silent = false) => {
    if (!silent && !depts.length) setLoading(true);
    try {
      const data = await departmentService.listWithStats(true);
      setDepts(data);
    } catch (err: any) {
      if (!silent) {
        setErrorMsg(err.response?.data?.detail || "Failed to load departments.");
      }
    } finally {
      setLoading(false);
    }
  }, [depts.length]);

  useEffect(() => {
    fetchDepts();
    const onFocus = () => fetchDepts(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDepts]);

  // Create department handler
  const handleCreate = async () => {
    const trimmedName = newDept.name.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter a department name.");
      return;
    }
    if (trimmedName.length < 2) {
      setErrorMsg("Department name must be at least 2 characters long.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await departmentService.create({
        name: trimmedName,
        jurisdiction: newDept.jurisdiction.trim() || undefined,
        description: newDept.description.trim() || undefined,
      });
      setNewDept({ name: "", jurisdiction: "", description: "" });
      setShowForm(false);
      setSuccessMsg(`Department "${trimmedName}" created successfully!`);
      await fetchDepts(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create department. Please check details.");
    } finally {
      setSaving(false);
    }
  };

  // Save changes handler for edit
  const handleSaveEdit = async () => {
    if (!editDept) return;
    const trimmedName = editDept.name.trim();
    if (!trimmedName) {
      setErrorMsg("Department name cannot be empty.");
      return;
    }
    if (trimmedName.length < 2) {
      setErrorMsg("Department name must be at least 2 characters long.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await departmentService.update(editDept.id, {
        name: trimmedName,
        jurisdiction: editDept.jurisdiction?.trim() || "",
        description: editDept.description?.trim() || "",
        is_active: editDept.is_active,
      });
      setSuccessMsg(`Department "${trimmedName}" updated successfully!`);
      setEditDept(null);
      await fetchDepts(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to update department. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleActive = async (dept: DepartmentWithStats) => {
    setTogglingId(dept.id);
    setErrorMsg("");
    try {
      const updatedStatus = !dept.is_active;
      await departmentService.update(dept.id, { is_active: updatedStatus });
      setDepts(prev => prev.map(d => (d.id === dept.id ? { ...d, is_active: updatedStatus } : d)));
      setSuccessMsg(`Department "${dept.name}" marked as ${updatedStatus ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to change department status.");
    } finally {
      setTogglingId(null);
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = depts.length;
    const active = depts.filter(d => d.is_active).length;
    const officers = depts.reduce((acc, d) => acc + (d.officer_count || 0), 0);
    const avgResRate = total > 0
      ? Math.round(depts.reduce((acc, d) => acc + (d.resolution_rate || 0), 0) / total)
      : 0;
    const jurisdictionsCount = new Set(depts.map(d => d.jurisdiction).filter(Boolean)).size;
    return { total, active, officers, avgResRate, jurisdictionsCount };
  }, [depts]);

  // Filtered department list
  const filteredDepts = useMemo(() => {
    return depts.filter(d => {
      if (statusFilter === "active" && !d.is_active) return false;
      if (statusFilter === "inactive" && d.is_active) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.jurisdiction && d.jurisdiction.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    });
  }, [depts, statusFilter, searchQuery]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ORGANIZATION & TEAMS</span>
          <h1>Departments & Jurisdictions</h1>
          <p>Manage operational teams, assigned jurisdictions, and case resolution workloads.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setShowForm(true);
            setEditDept(null);
            setErrorMsg("");
            setSuccessMsg("");
          }}
        >
          <Icon name="plus" /> Add department
        </button>
      </div>

      {/* KPI Cards */}
      <div className="department-summary" style={{ marginBottom: 20 }}>
        <div>
          <span>Total Departments</span>
          <strong>{stats.total}</strong>
          <small style={{ color: "var(--muted)", fontSize: 10 }}>{stats.active} active in operations</small>
        </div>
        <div>
          <span>Covered Jurisdictions</span>
          <strong>{stats.jurisdictionsCount}</strong>
          <small style={{ color: "var(--muted)", fontSize: 10 }}>Zones & administrative areas</small>
        </div>
        <div>
          <span>Assigned Officers</span>
          <strong>{stats.officers}</strong>
          <small style={{ color: "var(--muted)", fontSize: 10 }}>Staff members across teams</small>
        </div>
        <div>
          <span>Avg. Resolution Rate</span>
          <strong style={{ color: stats.avgResRate >= 70 ? "var(--teal)" : "var(--navy)" }}>
            {stats.avgResRate}%
          </strong>
          <small style={{ color: "var(--muted)", fontSize: 10 }}>Across all active cases</small>
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div
          className="admin-alert"
          style={{
            borderColor: "var(--error)",
            background: "#fff5f5",
            marginBottom: 16,
            color: "var(--error)",
          }}
        >
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--error)", display: "block", fontSize: 12 }}>Error</strong>
            <p style={{ color: "#7a2a2a", margin: "2px 0 0", fontSize: 11 }}>{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          className="admin-alert"
          style={{
            borderColor: "var(--teal)",
            background: "#f0fbf9",
            marginBottom: 16,
            color: "var(--teal)",
          }}
        >
          <Icon name="check" />
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--teal)", display: "block", fontSize: 12 }}>Success</strong>
            <p style={{ color: "#17524e", margin: "2px 0 0", fontSize: 11 }}>{successMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Department Add/Edit Form */}
      {(showForm || editDept) && (
        <div className="admin-panel" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
              {editDept ? `Edit Department: ${editDept.name}` : "Create New Department"}
            </h3>
            <button
              type="button"
              className="table-more"
              onClick={() => {
                setShowForm(false);
                setEditDept(null);
                setErrorMsg("");
              }}
              style={{ cursor: "pointer", fontSize: 14, padding: "4px 8px" }}
              title="Close form"
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Department Name *
              </label>
              <input
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
                value={editDept ? editDept.name : newDept.name}
                onChange={e =>
                  editDept
                    ? setEditDept(d => (d ? { ...d, name: e.target.value } : d))
                    : setNewDept(d => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Sanitation & Waste Management"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Jurisdiction / Area
              </label>
              <input
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
                value={editDept ? editDept.jurisdiction || "" : newDept.jurisdiction}
                onChange={e =>
                  editDept
                    ? setEditDept(d => (d ? { ...d, jurisdiction: e.target.value } : d))
                    : setNewDept(d => ({ ...d, jurisdiction: e.target.value }))
                }
                placeholder="e.g. Central Zone or City-wide"
              />
              {/* Quick Preset Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "var(--muted)", alignSelf: "center", marginRight: 2 }}>
                  Quick zones:
                </span>
                {JURISDICTION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    style={{
                      border: "1px solid var(--border)",
                      background: (editDept ? editDept.jurisdiction : newDept.jurisdiction) === preset ? "var(--teal)" : "#f4f6f5",
                      color: (editDept ? editDept.jurisdiction : newDept.jurisdiction) === preset ? "white" : "var(--navy)",
                      borderRadius: 14,
                      padding: "2px 9px",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => {
                      if (editDept) {
                        setEditDept(d => (d ? { ...d, jurisdiction: preset } : d));
                      } else {
                        setNewDept(d => ({ ...d, jurisdiction: preset }));
                      }
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Department Description (Optional)
              </label>
              <textarea
                style={{
                  width: "100%",
                  minHeight: 65,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                value={editDept ? editDept.description || "" : newDept.description}
                onChange={e =>
                  editDept
                    ? setEditDept(d => (d ? { ...d, description: e.target.value } : d))
                    : setNewDept(d => ({ ...d, description: e.target.value }))
                }
                placeholder="Briefly describe operational responsibilities, emergency contacts, or jurisdiction boundaries..."
              />
            </div>

            {editDept && (
              <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={editDept.is_active}
                    onChange={e => setEditDept(d => (d ? { ...d, is_active: e.target.checked } : d))}
                    style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
                  />
                  <strong style={{ color: "var(--navy)" }}>Active Operational Department</strong>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    (Inactive departments cannot receive new complaint assignments)
                  </span>
                </label>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button
              type="button"
              className="primary-button"
              onClick={editDept ? handleSaveEdit : handleCreate}
              disabled={saving}
              style={{ minWidth: 150 }}
            >
              {saving ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Spinner />
                  <span>{editDept ? "Saving changes..." : "Creating..."}</span>
                </span>
              ) : (
                <span>{editDept ? "Save changes" : "Create department"}</span>
              )}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setShowForm(false);
                setEditDept(null);
                setErrorMsg("");
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Table Panel */}
      <section className="admin-panel">
        {/* Table Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Search Bar */}
          <div className="admin-search" style={{ maxWidth: 360, width: "100%" }}>
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search departments or jurisdictions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 11 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: statusFilter === "all" ? "var(--navy)" : "white",
                color: statusFilter === "all" ? "white" : "var(--muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              All ({depts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: statusFilter === "active" ? "var(--teal)" : "white",
                color: statusFilter === "active" ? "white" : "var(--muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: statusFilter === "inactive" ? "#a84e4e" : "white",
                color: statusFilter === "inactive" ? "white" : "var(--muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Inactive ({depts.length - stats.active})
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            <Spinner />
            <p style={{ marginTop: 10, fontSize: 12 }}>Loading departments and jurisdiction metrics...</p>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table department-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Jurisdiction</th>
                <th>Officers</th>
                <th>Open cases</th>
                <th>Resolution rate</th>
                <th>Status</th>
                <th style={{ textAlign: "right", paddingRight: 18 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.map(d => (
                <tr key={d.id}>
                  <td>
                    <span className="department-icon">
                      <Icon name="building" />
                    </span>
                    <div>
                      <strong style={{ fontSize: 12, color: "var(--navy)" }}>{d.name}</strong>
                      <small style={{ display: "block", fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                        {d.description || "No description provided"}
                      </small>
                    </div>
                  </td>
                  <td>
                    {d.jurisdiction ? (
                      <span
                        style={{
                          background: "#eef5f3",
                          color: "var(--teal)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {d.jurisdiction}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: 11 }}>{d.officer_count}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        color: d.open_count > 10 ? "var(--error)" : "inherit",
                        fontWeight: d.open_count > 10 ? 700 : 500,
                        fontSize: 11,
                      }}
                    >
                      {d.open_count}
                    </span>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span>
                        <i style={{ width: `${Math.min(100, Math.max(0, d.resolution_rate))}%` }}></i>
                      </span>
                      <strong>{d.resolution_rate}%</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${d.is_active ? "resolved" : "rejected"}`}>
                      <span></span>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 18 }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditDept(d);
                          setShowForm(false);
                          setErrorMsg("");
                          setSuccessMsg("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          border: "1px solid var(--border)",
                          background: "white",
                          color: "var(--navy)",
                          padding: "4px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Edit department name and jurisdiction"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(d)}
                        disabled={togglingId === d.id}
                        style={{
                          border: "1px solid var(--border)",
                          background: d.is_active ? "#fff8f8" : "#f2faf6",
                          color: d.is_active ? "#a84e4e" : "var(--teal)",
                          padding: "4px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: togglingId === d.id ? "not-allowed" : "pointer",
                        }}
                        title={d.is_active ? "Deactivate department" : "Activate department"}
                      >
                        {togglingId === d.id ? (
                          <Spinner />
                        ) : d.is_active ? (
                          "Deactivate"
                        ) : (
                          "Activate"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredDepts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    {searchQuery
                      ? `No departments found matching "${searchQuery}".`
                      : "No departments registered yet. Click 'Add department' above to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
