import { useEffect, useState } from "react";
import Spinner from "../../components/common/Spinner";
import { auditService } from "../../services/services";
import type { AuditLog } from "../../types";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    auditService
      .list(page)
      .then(r => {
        setLogs(r.items);
        setTotal(r.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Audit logs</h1>
          <p>Review immutable records of administrative actions.</p>
        </div>
      </div>
      <section className="admin-panel">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td><strong style={{ fontSize: 9 }}>{log.action}</strong></td>
                  <td>{log.actor_name || "System"}</td>
                  <td>{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ""}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{log.details || "—"}</td>
                  <td>{log.ip_address || "—"}</td>
                  <td>{new Date(log.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    No audit logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div className="pagination">
            <span>{total} records</span>
            <div>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
