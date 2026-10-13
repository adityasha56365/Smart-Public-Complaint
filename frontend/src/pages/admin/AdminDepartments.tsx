import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { departmentService } from "../../services/services";
import type { DepartmentWithStats } from "../../types";

export default function AdminDepartments() {
  const [depts, setDepts] = useState<DepartmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", jurisdiction: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentWithStats | null>(null);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      setDepts(await departmentService.listWithStats());
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  const handleCreate = async () => {
    if (!newDept.name) return;
    setSaving(true);
    try {
      await departmentService.create(newDept);
      setNewDept({ name: "", jurisdiction: "", description: "" });
      setShowForm(false);
      fetchDepts();
    } catch {
      /**/
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ORGANIZATION</span>
          <h1>Departments</h1>
          <p>Manage operational teams, jurisdiction, and workload.</p>
        </div>
        <button className="primary-button" onClick={() => { setShowForm(true); setEditDept(null); }}>
          <Icon name="plus" /> Add department
        </button>
      </div>
      {(showForm || editDept) && (
        <div className="admin-panel" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>{editDept ? `Edit: ${editDept.name}` : "New department"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label>Name
              <input
                value={editDept ? editDept.name : newDept.name}
                onChange={e => (editDept ? setEditDept(d => (d ? { ...d, name: e.target.value } : d)) : setNewDept(d => ({ ...d, name: e.target.value })))}
                placeholder="Department name"
              />
            </label>
            <label>Jurisdiction
              <input
                value={editDept ? editDept.jurisdiction || "" : newDept.jurisdiction}
                onChange={e => (editDept ? setEditDept(d => (d ? { ...d, jurisdiction: e.target.value } : d)) : setNewDept(d => ({ ...d, jurisdiction: e.target.value })))}
                placeholder="e.g. East Zone"
              />
            </label>
            <label>Description
              <input
                value={editDept ? editDept.description || "" : newDept.description}
                onChange={e => (editDept ? setEditDept(d => (d ? { ...d, description: e.target.value } : d)) : setNewDept(d => ({ ...d, description: e.target.value })))}
                placeholder="Optional"
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="primary-button"
              onClick={editDept ? () => { setEditDept(null); fetchDepts(); } : handleCreate}
              disabled={saving}
            >
              {saving ? <Spinner /> : editDept ? "Save changes" : "Create"}
            </button>
            <button className="secondary-button" onClick={() => { setShowForm(false); setEditDept(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <section className="admin-panel">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <table className="admin-table department-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Jurisdiction</th>
              <th>Officers</th>
              <th>Open cases</th>
              <th>Resolution rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {depts.map(d => (
              <tr key={d.id}>
                <td>
                  <span className="department-icon"><Icon name="building" /></span>
                  <strong>{d.name}</strong>
                  <small style={{ display: "block", fontSize: 8, color: "var(--muted)", marginTop: 2 }}>{d.description || ""}</small>
                </td>
                <td>{d.jurisdiction || "—"}</td>
                <td>{d.officer_count}</td>
                <td><span style={{ color: d.open_count > 10 ? "var(--error)" : "inherit" }}>{d.open_count}</span></td>
                <td>
                  <div className="progress-cell">
                    <span><i style={{ width: `${d.resolution_rate}%` }}></i></span>
                    <strong>{d.resolution_rate}%</strong>
                  </div>
                </td>
                <td><span className={`status ${d.is_active ? "resolved" : "rejected"}`}><span></span>{d.is_active ? "Active" : "Inactive"}</span></td>
                <td>
                  <button className="table-more" onClick={() => { setEditDept(d); setShowForm(false); }} title="Edit department">
                    <Icon name="more" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && depts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
