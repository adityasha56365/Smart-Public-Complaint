import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import { complaintService } from "../../services/services";
import { exportToCSV } from "../../utils/csvExport";
import type { Complaint, PaginatedResponse } from "../../types";

export default function AdminComplaints({ openComplaint }: { openComplaint: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);

  const cached = complaintService.getCached({
    page,
    page_size: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const [data, setData] = useState<PaginatedResponse<Complaint> | null>(cached);
  const [loading, setLoading] = useState(() => !cached);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent && !data) setLoading(true);
    try {
      const res = await complaintService.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setData(res);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, data]);

  useEffect(() => {
    fetchData();
    const onFocus = () => fetchData(true);
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => fetchData(true), 40000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [fetchData]);

  const tabs = [
    { label: "All complaints", value: "" },
    { label: "New", value: "submitted" },
    { label: "Under review", value: "under_review" },
    { label: "In progress", value: "in_progress" },
    { label: "Awaiting info", value: "awaiting_info" },
    { label: "Resolved", value: "resolved" },
  ];

  const filtered = priorityFilter
    ? (data?.items || []).filter(c => c.priority === priorityFilter)
    : data?.items || [];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">CASE MANAGEMENT</span>
          <h1>Complaint queue</h1>
          <p>Review, assign, and monitor all complaints.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="secondary-button"
            onClick={() => data && exportToCSV(data.items, `complaints-${Date.now()}.csv`)}
          >
            <Icon name="download" /> Export CSV
          </button>
        </div>
      </div>
      <div className="queue-tabs">
        {tabs.map(t => (
          <button
            key={t.value}
            className={statusFilter === t.value ? "active" : ""}
            onClick={() => {
              setStatusFilter(t.value);
              setPage(1);
            }}
          >
            {t.label}
            {data && t.value === statusFilter && <span>{data.total}</span>}
          </button>
        ))}
      </div>
      <section className="admin-panel queue-panel">
        <div className="queue-tools">
          <div className="admin-search wide">
            <Icon name="search" />
            <input
              placeholder="Search ID, title or locality"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{
              height: 36,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "white",
              padding: "0 10px",
              fontSize: 9,
              color: "var(--muted)",
            }}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            className="secondary-button"
            style={{ height: 36, fontSize: 10, padding: "0 10px" }}
            onClick={fetchData}
          >
            <Icon name="arrow" size={14} /> Refresh
          </button>
        </div>
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>Complaint</th>
                <th>Location</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><input type="checkbox" aria-label={`Select ${c.reference_number}`} /></td>
                  <td>
                    <button className="table-title" onClick={() => openComplaint(c.id)}>
                      <span>
                        {c.reference_number}
                        {c.attachments && c.attachments.length > 0 && (
                          <span style={{ marginLeft: 6, color: "var(--teal)", fontWeight: 700, fontSize: 10, background: "#e8f4f0", padding: "1px 5px", borderRadius: 4 }}>
                            📷 {c.attachments.length}
                          </span>
                        )}
                      </span>
                      <strong>{c.title}</strong>
                      <small>
                        {c.category_name || "Uncategorized"}
                        {c.contact_name ? ` · ${c.contact_name}` : ""}
                      </small>
                    </button>
                  </td>
                  <td>
                    {c.location_address || "—"}
                    <small>{new Date(c.created_at).toLocaleDateString("en-IN")}</small>
                  </td>
                  <td><Status value={c.status} /></td>
                  <td><span className={`priority ${c.priority}`}><i></i>{c.priority}</span></td>
                  <td>{new Date(c.updated_at).toLocaleString("en-IN")}</td>
                  <td>
                    <button className="table-more" onClick={() => openComplaint(c.id)}><Icon name="more" /></button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    No complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="pagination">
            <span>
              Showing {Math.min((page - 1) * 20 + 1, data.total)}–{Math.min(page * 20, data.total)} of {data.total} complaints
            </span>
            <div>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              {Array.from({ length: Math.min(5, Math.ceil(data.total / 20)) }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
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
