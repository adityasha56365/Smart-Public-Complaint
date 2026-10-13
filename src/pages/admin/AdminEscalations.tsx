import { useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { complaintService } from "../../services/services";
import type { Complaint, PaginatedResponse } from "../../types";

export default function AdminEscalations({ openComplaint }: { openComplaint: (id: number) => void }) {
  const [data, setData] = useState<PaginatedResponse<Complaint> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    complaintService
      .list({ page: 1, page_size: 50, status: "under_review" })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const slaHours = 72;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">SLA &amp; ESCALATIONS</span>
          <h1>Escalations &amp; SLA</h1>
          <p>Review overdue and high-priority cases requiring urgent action.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <div className="admin-panel" style={{ padding: 16 }}>
          <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>SLA Target</span>
          <strong style={{ display: "block", font: "800 22px Manrope", color: "var(--navy)", margin: "4px 0" }}>72 hours</strong>
          <small style={{ fontSize: 9, color: "var(--muted)" }}>Response & assignment SLA</small>
        </div>
        <div className="admin-panel" style={{ padding: 16 }}>
          <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Under Review</span>
          <strong style={{ display: "block", font: "800 22px Manrope", color: "var(--warning)", margin: "4px 0" }}>{data?.total || 0}</strong>
          <small style={{ fontSize: 9, color: "var(--muted)" }}>Awaiting assignment</small>
        </div>
        <div className="admin-panel" style={{ padding: 16 }}>
          <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Overdue (Est.)</span>
          <strong style={{ display: "block", font: "800 22px Manrope", color: "var(--error)", margin: "4px 0" }}>
            {(data?.items || []).filter(c => now - new Date(c.created_at).getTime() > slaHours * 3600000).length}
          </strong>
          <small style={{ fontSize: 9, color: "var(--muted)" }}>Exceeded {slaHours}h SLA</small>
        </div>
      </div>
      <section className="admin-panel">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Complaint</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Submitted</th>
              <th>Age</th>
              <th>SLA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map(c => {
              const ageMs = now - new Date(c.created_at).getTime();
              const ageHours = Math.floor(ageMs / 3600000);
              const isOverdue = ageHours > slaHours;
              return (
                <tr key={c.id}>
                  <td>
                    <button className="table-title" onClick={() => openComplaint(c.id)}>
                      <span>{c.reference_number}</span>
                      <strong>{c.title}</strong>
                    </button>
                  </td>
                  <td>{c.category_name || "—"}</td>
                  <td><span className={`priority ${c.priority}`}><i></i>{c.priority}</span></td>
                  <td>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  <td style={{ color: isOverdue ? "var(--error)" : "inherit", fontWeight: isOverdue ? 700 : 400 }}>{ageHours}h</td>
                  <td>
                    {isOverdue ? (
                      <span style={{ fontSize: 8, background: "#fff0ee", color: "var(--error)", borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>OVERDUE</span>
                    ) : (
                      <span style={{ fontSize: 8, background: "#e8f3ef", color: "var(--success)", borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>ON TRACK</span>
                    )}
                  </td>
                  <td>
                    <button className="table-more" onClick={() => openComplaint(c.id)}>
                      <Icon name="more" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && (data?.items || []).length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  No pending escalations. All complaints are assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
