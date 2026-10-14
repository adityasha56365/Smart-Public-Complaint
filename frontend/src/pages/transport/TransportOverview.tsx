import { useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { challanService } from "../../services/challanService";
import type { TransportDashboardSummary } from "../../types/challan";

export default function TransportOverview({
  onNavigate,
}: {
  onNavigate: (tab: string, filter?: string) => void;
}) {
  const [summary, setSummary] = useState<TransportDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    challanService
      .getDashboardSummary()
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">TRANSPORT ADMIN DASHBOARD</span>
          <h1>Transport Admin Operations</h1>
          <p>
            Official workload review, active dispute verification, citizen response monitoring, and statutory orders.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("complaints")}
          >
            <Icon name="traffic" /> View Dispute Queue
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <Spinner />
          <p style={{ marginTop: 10 }}>Loading live Transport Department statistics...</p>
        </div>
      )}

      {summary && (
        <>
          {/* Top Operational Metrics */}
          <div className="admin-metrics">
            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints")}
            >
              <div className="metric-symbol blue">
                <Icon name="traffic" />
              </div>
              <span>Total Disputes</span>
              <strong>{summary.total_disputes}</strong>
              <small>All time challan filings</small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints", "submitted")}
            >
              <div className="metric-symbol teal">
                <Icon name="clock" />
              </div>
              <span>Newly Submitted</span>
              <strong>{summary.newly_submitted}</strong>
              <small>Pending initial intake</small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints", "under_review")}
            >
              <div className="metric-symbol navy">
                <Icon name="eye" />
              </div>
              <span>Under Review</span>
              <strong>{summary.under_review}</strong>
              <small>Being examined by officers</small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints", "awaiting_citizen_info")}
            >
              <div className="metric-symbol red">
                <Icon name="alert" />
              </div>
              <span>Awaiting Citizen</span>
              <strong>{summary.awaiting_citizen_info}</strong>
              <small>Additional documents requested</small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints", "cancellation_approved")}
            >
              <div className="metric-symbol green">
                <Icon name="check" />
              </div>
              <span>Approved Cancellations</span>
              <strong>{summary.cancellations_approved}</strong>
              <small>Supervisory approvals granted</small>
            </div>
          </div>

          {/* Dispute Disposal Summary Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 20 }}>
            <div className="admin-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "var(--navy)" }}>
                Statutory Decision Breakdown
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#f8faf9", borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
                    Total Decisions Issued
                  </span>
                  <strong style={{ fontSize: 24, color: "var(--navy)" }}>
                    {summary.decisions_issued}
                  </strong>
                </div>

                <div style={{ background: "#f4fcf7", borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: "#166442", display: "block" }}>
                    Cancellations Executed
                  </span>
                  <strong style={{ fontSize: 24, color: "var(--success)" }}>
                    {summary.cancellations_executed}
                  </strong>
                </div>

                <div style={{ background: "#fef6f5", borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: "#8a2c20", display: "block" }}>
                    Challans Upheld
                  </span>
                  <strong style={{ fontSize: 24, color: "var(--error)" }}>
                    {summary.upheld_count}
                  </strong>
                </div>

                <div style={{ background: "#fdf8f4", borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: "#8c561b", display: "block" }}>
                    Disputes Rejected
                  </span>
                  <strong style={{ fontSize: 24, color: "var(--warning)" }}>
                    {summary.rejected_count}
                  </strong>
                </div>
              </div>
            </div>

            <div className="admin-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "var(--navy)" }}>
                Operational Queue Rules
              </h3>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#4e5d67" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Icon name="shield" size={18} />
                  <span>
                    <strong>Strict Queue Isolation:</strong> Challan disputes are processed exclusively within this Transport Department portal and do not enter the general civic grievance queue.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Icon name="check" size={18} />
                  <span>
                    <strong>Transport Admin Authority:</strong> Full authority to investigate, request citizen documentation, uphold, or cancel disputed challans.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Icon name="bell" size={18} />
                  <span>
                    <strong>Live Citizen Sync:</strong> Status updates and additional document requests trigger instant citizen notifications.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
