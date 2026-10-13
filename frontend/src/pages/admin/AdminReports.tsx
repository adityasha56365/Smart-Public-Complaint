import { useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { adminService } from "../../services/services";
import type { ReportSummary } from "../../types";

export default function AdminReports() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    adminService
      .reports(days)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const handleExportCSV = () => {
    if (!report) return;
    const rows = [
      ["Category", "Count", "Percentage"].join(","),
      ...report.category_distribution.map(r => [r.category, r.count, r.percentage + "%"].join(",")),
      "",
      ["Date", "Received", "Resolved"].join(","),
      ...report.daily_trend.map(r => [r.date, r.received, r.resolved].join(",")),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${days}days-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">PERFORMANCE INSIGHTS</span>
          <h1>Reports &amp; analytics</h1>
          <p>Understand complaint trends and operational performance.</p>
        </div>
        <div>
          <button className="primary-button" onClick={handleExportCSV} disabled={!report}>
            <Icon name="download" /> Export CSV
          </button>
        </div>
      </div>
      <div className="report-filters">
        <button className={days === 7 ? "active" : ""} onClick={() => setDays(7)}>Last 7 days</button>
        <button className={days === 30 ? "active" : ""} onClick={() => setDays(30)}>Last 30 days</button>
        <button className={days === 90 ? "active" : ""} onClick={() => setDays(90)}>Last 90 days</button>
        <button className={days === 365 ? "active" : ""} onClick={() => setDays(365)}>Last year</button>
      </div>
      {loading && <Spinner />}
      {report && (
        <>
          <div className="report-kpis">
            <div>
              <span>Complaints received</span>
              <strong>{report.total_received.toLocaleString()}</strong>
              <small>In selected period</small>
            </div>
            <div>
              <span>Complaints resolved</span>
              <strong>{report.total_resolved.toLocaleString()}</strong>
              <small>In selected period</small>
            </div>
            <div>
              <span>Median resolution</span>
              <strong>{report.median_resolution_days.toFixed(1)} days</strong>
            </div>
            <div>
              <span>Reopened rate</span>
              <strong className={report.reopened_rate > 10 ? "positive" : ""}>
                {report.reopened_rate.toFixed(1)}%
              </strong>
            </div>
          </div>
          <div className="admin-analytics-grid">
            <section className="admin-panel category-report">
              <div className="admin-panel-head">
                <div><span className="eyebrow">DISTRIBUTION</span><h3>Complaints by category</h3></div>
              </div>
              {report.category_distribution.map(item => (
                <div className="bar-row" key={item.category}>
                  <span>{item.category}</span>
                  <div><i style={{ width: `${item.percentage}%` }}></i></div>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {report.category_distribution.length === 0 && (
                <p style={{ padding: "0 18px 16px", fontSize: 11, color: "var(--muted)" }}>No data yet.</p>
              )}
            </section>
            <section className="admin-panel" style={{ padding: 18 }}>
              <div className="admin-panel-head" style={{ marginBottom: 12 }}>
                <div><span className="eyebrow">DAILY TREND</span><h3>Received vs Resolved</h3></div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--muted)" }}>Date</th>
                      <th style={{ color: "var(--teal)" }}>Received</th>
                      <th style={{ color: "var(--success)" }}>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily_trend.slice(-14).map(d => (
                      <tr key={d.date} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "5px 8px" }}>{d.date}</td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--teal)" }}>{d.received}</td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--success)" }}>{d.resolved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
