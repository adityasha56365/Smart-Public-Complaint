import { useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import AdminMetric from "./AdminMetric";
import { adminService, complaintService } from "../../services/services";
import type { Complaint, DashboardStats } from "../../types";

export default function AdminOverview({
  openComplaint,
  navigate,
}: {
  openComplaint: (id: number) => void;
  navigate: (id: string) => void;
}) {
  const cachedStats = adminService.getCachedStats();
  const cachedComplaints = complaintService.getCached({ page: 1, page_size: 5 });

  const [stats, setStats] = useState<DashboardStats | null>(cachedStats);
  const [complaints, setComplaints] = useState<Complaint[]>(() => cachedComplaints?.items || []);
  const [loading, setLoading] = useState(() => !cachedStats);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const load = () => {
      Promise.all([
        adminService.stats(),
        complaintService.list({ page: 1, page_size: 5 }),
      ])
        .then(([s, c]) => {
          if (!isCancelled) {
            setStats(s);
            setComplaints(c.items);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled && !stats) setError("Failed to load dashboard data.");
          if (!isCancelled) setLoading(false);
        });
    };

    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(load, 45000);

    return () => {
      isCancelled = true;
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="admin-page" style={{ padding: 40, textAlign: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">OPERATIONAL OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>Here&apos;s what needs attention today.</p>
        </div>
        <div>
          <button className="secondary-button" onClick={() => navigate("reports")}>
            <Icon name="download" /> Export report
          </button>
          <button className="primary-button" onClick={() => navigate("admin-complaints")}>
            <Icon name="file" /> Open complaint queue
          </button>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      {stats && (
        <div className="admin-metrics">
          <AdminMetric label="Total complaints" value={stats.total.toLocaleString()} note="All time" icon="file" tone="navy" />
          <AdminMetric label="New today" value={stats.new_today} note="Pending review" icon="plus" tone="blue" />
          <AdminMetric label="In progress" value={stats.in_progress} note="Active cases" icon="clock" tone="teal" />
          <AdminMetric
            label="Resolved"
            value={stats.resolved.toLocaleString()}
            note={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% of all cases`}
            icon="check"
            tone="green"
          />
          <AdminMetric label="Overdue" value={stats.overdue} note="Require attention" icon="alert" tone="red" />
        </div>
      )}
      <section className="admin-panel recent-table">
        <div className="admin-panel-head">
          <div><span className="eyebrow">LATEST SUBMISSIONS</span><h3>Recent complaints</h3></div>
          <button onClick={() => navigate("admin-complaints")}>View all <Icon name="arrow" size={16} /></button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Location</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td>
                    <button className="table-title" onClick={() => openComplaint(c.id)}>
                      <span>{c.reference_number}</span>
                      <strong>{c.title}</strong>
                      <small>{c.category_name || "Uncategorized"}</small>
                    </button>
                  </td>
                  <td>{c.location_address || "—"}</td>
                  <td><Status value={c.status} /></td>
                  <td><span className={`priority ${c.priority}`}><i></i>{c.priority}</span></td>
                  <td>{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <button className="table-more" onClick={() => openComplaint(c.id)}><Icon name="more" /></button>
                  </td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                    No complaints yet.
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
