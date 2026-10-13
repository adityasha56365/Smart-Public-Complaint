import { useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { categoryService } from "../../services/services";
import type { Category } from "../../types";

export default function AdminSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", description: "", icon: "building" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    categoryService.list().then(setCategories).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreateCat = async () => {
    if (!newCat.name) return;
    setSaving(true);
    try {
      await categoryService.create(newCat);
      const updated = await categoryService.list();
      setCategories(updated);
      setNewCat({ name: "", description: "", icon: "building" });
      setShowCatForm(false);
      setSaveMsg("✓ Category created.");
    } catch {
      setSaveMsg("Failed to create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">SYSTEM</span>
          <h1>System settings</h1>
          <p>Configure categories, workflows, and operational preferences.</p>
        </div>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        <section className="admin-panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "var(--navy)" }}>Complaint categories</h3>
            <button className="primary-button" style={{ minHeight: 36, fontSize: 11 }} onClick={() => setShowCatForm(s => !s)}>
              <Icon name="plus" /> Add category
            </button>
          </div>
          {showCatForm && (
            <div style={{ background: "var(--cream)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 10 }}>Category name
                  <input value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Water Supply" />
                </label>
                <label style={{ fontSize: 10 }}>Description
                  <input value={newCat.description} onChange={e => setNewCat(c => ({ ...c, description: e.target.value }))} placeholder="Optional" />
                </label>
                <label style={{ fontSize: 10 }}>Icon key
                  <input value={newCat.icon} onChange={e => setNewCat(c => ({ ...c, icon: e.target.value }))} placeholder="e.g. water" />
                </label>
              </div>
              {saveMsg && (
                <p style={{ fontSize: 9, color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--error)", margin: "6px 0 0" }}>
                  {saveMsg}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="primary-button" style={{ minHeight: 34, fontSize: 11 }} onClick={handleCreateCat} disabled={saving}>
                  {saving ? <Spinner /> : "Create"}
                </button>
                <button className="secondary-button" style={{ minHeight: 34, fontSize: 11 }} onClick={() => setShowCatForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {loading && <Spinner />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
            {categories.map(c => (
              <div key={c.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 34, height: 34, background: "var(--mint)", borderRadius: 9, display: "grid", placeItems: "center", color: "var(--teal)" }}>
                  <Icon name={(c.icon as IconName) || "building"} size={16} />
                </span>
                <div>
                  <strong style={{ fontSize: 11 }}>{c.name}</strong>
                  <small style={{ display: "block", fontSize: 9, color: "var(--muted)" }}>{c.description || "No description"}</small>
                </div>
              </div>
            ))}
            {!loading && categories.length === 0 && <p style={{ fontSize: 10, color: "var(--muted)" }}>No categories yet.</p>}
          </div>
        </section>
        <section className="admin-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "var(--navy)" }}>SLA configuration</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              ["Response SLA", "72", "Hours to first response"],
              ["Resolution SLA", "168", "Hours to resolve"],
              ["Escalation threshold", "48", "Hours before auto-escalate"],
            ].map(([label, val, hint]) => (
              <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <span style={{ fontSize: 9, color: "var(--muted)", display: "block", marginBottom: 4 }}>{hint}</span>
                <strong style={{ fontSize: 13, color: "var(--navy)" }}>{label}</strong>
                <input
                  defaultValue={val}
                  style={{ display: "block", width: "100%", marginTop: 8, border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", fontSize: 12 }}
                  type="number"
                />
              </div>
            ))}
          </div>
          <button className="primary-button" style={{ marginTop: 12, fontSize: 11, minHeight: 36 }}>
            <Icon name="check" size={14} /> Save SLA settings
          </button>
        </section>
      </div>
    </div>
  );
}
