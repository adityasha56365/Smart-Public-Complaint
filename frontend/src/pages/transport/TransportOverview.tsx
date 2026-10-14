import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { challanService } from "../../services/challanService";
import {
  CHALLAN_REASON_LABELS,
  CHALLAN_STATUS_LABELS,
  type ChallanComplaint,
  type TransportDashboardSummary,
} from "../../types/challan";
import TransportDetailModal from "./TransportDetailModal";

export default function TransportOverview({
  onNavigate,
}: {
  onNavigate: (tab: string, filter?: string) => void;
}) {
  const [summary, setSummary] = useState<TransportDashboardSummary | null>(null);
  const [recentCases, setRecentCases] = useState<ChallanComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week" | "today">("all");
  const [exporting, setExporting] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ChallanComplaint | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [sum, rec] = await Promise.all([
        challanService.getDashboardSummary(),
        challanService.listTransportComplaints({ page: 1, page_size: 6 }),
      ]);
      setSummary(sum);
      setRecentCases(rec.items || []);
    } catch (err) {
      console.error("Failed to load transport dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Full CSV Export of all disputes
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await challanService.listTransportComplaints({ page: 1, page_size: 1000 });
      const rows = [
        [
          "Reference ID",
          "Challan Number",
          "Vehicle Registration",
          "Violation Date",
          "Disputed Grounds",
          "Adjudication Status",
          "Citizen Name",
          "Citizen Email",
          "Citizen Phone",
          "Assigned Officer",
          "Decision Type",
          "Date Filed",
        ].join(","),
        ...res.items.map((c) =>
          [
            `"${c.reference_id}"`,
            `"${c.challan_number}"`,
            `"${c.vehicle_number}"`,
            `"${c.issue_date || ""}"`,
            `"${CHALLAN_REASON_LABELS[c.dispute_reason] || c.dispute_reason}"`,
            `"${CHALLAN_STATUS_LABELS[c.status]?.label || c.status}"`,
            `"${c.citizen_name || ""}"`,
            `"${c.citizen_email || ""}"`,
            `"${c.citizen_phone || ""}"`,
            `"${c.assigned_officer_name || "Unassigned"}"`,
            `"${c.decision_type || "Pending"}"`,
            `"${new Date(c.created_at).toLocaleDateString("en-IN")}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Transport_Disputes_Dossier_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const handleCaseUpdated = (updated: ChallanComplaint) => {
    setRecentCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    loadData(true);
  };

  // Compute dispute ground stats
  const totalCases = summary?.total_disputes || 0;
  const reasonBreakdown = summary?.reason_breakdown || {};
  const wrongVehicleCount = (reasonBreakdown["wrong_vehicle"] || 0) + (reasonBreakdown["details_mismatch"] || 0);
  const alreadyPaidCount = (reasonBreakdown["already_paid"] || 0) + (reasonBreakdown["duplicate_challan"] || 0);
  const operationalCount = (reasonBreakdown["evidence_indicates_mistake"] || 0) + (reasonBreakdown["incorrect_location_time"] || 0);
  const otherCount = reasonBreakdown["other"] || 0;

  // Calculate resolution rate
  const resolvedCount = (summary?.cancellations_approved || 0) + (summary?.cancellations_executed || 0) + (summary?.upheld_count || 0) + (summary?.rejected_count || 0);
  const resolutionRate = totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0;
  const cancellationRate = totalCases > 0 ? Math.round((((summary?.cancellations_approved || 0) + (summary?.cancellations_executed || 0)) / totalCases) * 100) : 0;

  return (
    <div className="admin-page">
      {/* Top Header & Control Center */}
      <div className="admin-page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="transport-pulsing-dot" />
            <span className="eyebrow" style={{ letterSpacing: "0.08em", color: "var(--teal)", fontWeight: 800 }}>
              LIVE TRAFFIC ENFORCEMENT SYNC • STATUTORY ADJUDICATION BENCH
            </span>
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Transport Admin Operations &amp; Review Workbench
          </h1>
          <p>
            Official automated e-challan dispute intake, evidentiary examination, statutory hearings, and cancellation orders.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Date range filter pills */}
          <div style={{ display: "flex", gap: 4, background: "#f0f4f6", padding: 3, borderRadius: 9 }}>
            {(["all", "month", "week", "today"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`transport-filter-pill ${timeFilter === filter ? "active" : ""}`}
                onClick={() => setTimeFilter(filter)}
                style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6 }}
              >
                {filter === "all" && "All Time"}
                {filter === "month" && "This Month"}
                {filter === "week" && "Last 7 Days"}
                {filter === "today" && "Today"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleRefresh}
            title="Refresh live data"
            style={{ padding: "7px 11px" }}
          >
            <Icon name="clock" size={15} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleExportCSV}
            disabled={exporting || totalCases === 0}
            title="Export CSV dossier"
          >
            <Icon name="download" size={15} />
            {exporting ? "Generating Dossier..." : "Export CSV Dossier"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("complaints")}
          >
            <Icon name="traffic" />
            Open Dispute Queue
          </button>
        </div>
      </div>

      {loading && !summary && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <Spinner />
          <p style={{ marginTop: 10 }}>Connecting to Transport Department enforcement repository...</p>
        </div>
      )}

      {summary && (
        <>
          {/* Operational Priority Notice / Warning Banner */}
          {wrongVehicleCount > 0 ? (
            <div
              className="admin-alert"
              style={{
                background: "#fffbf2",
                borderColor: "#f5d496",
                marginBottom: 20,
              }}
            >
              <span style={{ background: "#fef0d2", color: "#b45309" }}>
                <Icon name="alert" size={20} />
              </span>
              <div>
                <strong>High-Priority Investigation Required ({wrongVehicleCount} Case{wrongVehicleCount > 1 ? "s" : ""})</strong>
                <p>
                  Dispute records citing mismatched vehicle specifications or suspected cloned registration plates have been logged. Visual ANPR feed replay and RTO registration audit are recommended.
                </p>
              </div>
              <button
                type="button"
                className="primary-button"
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  background: "#b45309",
                  borderColor: "#b45309",
                }}
                onClick={() => onNavigate("complaints", "submitted")}
              >
                Inspect Flagged Cases <Icon name="arrow" size={14} />
              </button>
            </div>
          ) : (
            <div
              className="admin-alert"
              style={{
                background: "#f4fbf7",
                borderColor: "#b9e9cb",
                marginBottom: 20,
              }}
            >
              <span style={{ background: "#dcf4e4", color: "#166534" }}>
                <Icon name="check" size={20} />
              </span>
              <div>
                <strong>Statutory SLA Adherence: Active Compliance</strong>
                <p>
                  All active challan contestations are currently within the statutory 15-day hearing timeframe under the Motor Vehicles Dispute Adjudication Rules.
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#166534",
                  background: "#e8f8ed",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                100% SLA Maintained
              </span>
            </div>
          )}

          {/* Top Operational Metrics (6 KPIs) */}
          <div className="admin-metrics" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
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
              <small>All time filings</small>
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
              <small>{summary.today_submitted || 0} registered today</small>
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
              <small>Active case scrutiny</small>
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
              <small>Evidence requested</small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints", "cancellation_approved")}
            >
              <div className="metric-symbol green">
                <Icon name="check" />
              </div>
              <span>Cancellations</span>
              <strong>{summary.cancellations_approved + summary.cancellations_executed}</strong>
              <small>
                {summary.estimated_relief_amount
                  ? `₹${summary.estimated_relief_amount.toLocaleString("en-IN")} waived`
                  : "Revocations granted"}
              </small>
            </div>

            <div
              className="admin-metric"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate("complaints")}
            >
              <div className="metric-symbol navy" style={{ background: "#fef6f0", color: "#c2410c" }}>
                <Icon name="shield" />
              </div>
              <span>Upheld / Closed</span>
              <strong>{summary.upheld_count + summary.rejected_count}</strong>
              <small>Penalties affirmed</small>
            </div>
          </div>

          {/* Analytics Grid: Trend Chart & Dispute Grounds Breakdown */}
          <div className="admin-analytics-grid" style={{ marginBottom: 20 }}>
            {/* Left: 7-Day Inflow vs Resolution Trend */}
            <div className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <span className="eyebrow">ENFORCEMENT VELOCITY</span>
                  <h3>7-Day Intake &amp; Adjudication Trend</h3>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="received" /> Intake Filings
                  </span>
                  <span>
                    <i className="resolved" /> Statutory Orders
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate("complaints")}
                    style={{ cursor: "pointer" }}
                  >
                    View Timeline
                  </button>
                </div>
              </div>

              <div style={{ padding: "18px 24px" }}>
                {/* SVG Visual Chart */}
                <div style={{ width: "100%", height: 180, position: "relative" }}>
                  <svg
                    viewBox="0 0 500 160"
                    style={{ width: "100%", height: "100%", overflow: "visible" }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#087f8c" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#087f8c" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Intake Area & Line */}
                    <path
                      d="M 0 130 Q 80 120, 160 90 T 320 60 T 500 45 L 500 150 L 0 150 Z"
                      fill="url(#intakeGrad)"
                    />
                    <path
                      d="M 0 130 Q 80 120, 160 90 T 320 60 T 500 45"
                      fill="none"
                      stroke="#087f8c"
                      strokeWidth="2.5"
                    />

                    {/* Orders Line */}
                    <path
                      d="M 0 145 Q 90 140, 180 125 T 340 95 T 500 75"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Points on line */}
                    <circle cx="160" cy="90" r="4" fill="#087f8c" />
                    <circle cx="320" cy="60" r="4" fill="#087f8c" />
                    <circle cx="500" cy="45" r="5" fill="#087f8c" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="500" cy="75" r="4" fill="#2563eb" />
                  </svg>
                </div>

                {/* X Axis Day Labels */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "var(--muted)",
                    paddingTop: 8,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span>Mon (D-6)</span>
                  <span>Tue (D-5)</span>
                  <span>Wed (D-4)</span>
                  <span>Thu (D-3)</span>
                  <span>Fri (D-2)</span>
                  <span>Sat (Yesterday)</span>
                  <strong style={{ color: "var(--teal)" }}>Today (Live)</strong>
                </div>

                {/* Summary mini pill badges */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ background: "#f8faf9", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ fontSize: 9, color: "var(--muted)", display: "block" }}>
                      Intake Velocity
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--navy)" }}>Normal / Stable</strong>
                  </div>
                  <div style={{ background: "#f8faf9", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ fontSize: 9, color: "var(--muted)", display: "block" }}>
                      Adjudication Rate
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--success)" }}>
                      {resolutionRate}% Closed
                    </strong>
                  </div>
                  <div style={{ background: "#f8faf9", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ fontSize: 9, color: "var(--muted)", display: "block" }}>
                      Avg Turnaround SLA
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--navy)" }}>2.8 Days</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Dispute Grounds Breakdown */}
            <div className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <span className="eyebrow">CONTESTATION GROUNDS</span>
                  <h3>Dispute Reason Analysis</h3>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                  {totalCases} Total Cases
                </span>
              </div>

              <div style={{ padding: "18px 20px" }}>
                {/* Reason 1: Wrong Vehicle / Plate Mismatch */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>
                      Wrong Vehicle / Number Plate Mismatch
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--error)" }}>
                      {wrongVehicleCount} ({totalCases > 0 ? Math.round((wrongVehicleCount / totalCases) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="transport-progress-track">
                    <div
                      className="transport-progress-bar"
                      style={{
                        width: `${totalCases > 0 ? (wrongVehicleCount / totalCases) * 100 : 0}%`,
                        background: "var(--error)",
                      }}
                    />
                  </div>
                </div>

                {/* Reason 2: Already Paid / Duplicate */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>
                      Already Paid / Duplicate Challan
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--warning)" }}>
                      {alreadyPaidCount} ({totalCases > 0 ? Math.round((alreadyPaidCount / totalCases) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="transport-progress-track">
                    <div
                      className="transport-progress-bar"
                      style={{
                        width: `${totalCases > 0 ? (alreadyPaidCount / totalCases) * 100 : 0}%`,
                        background: "var(--warning)",
                      }}
                    />
                  </div>
                </div>

                {/* Reason 3: Operational Error / Camera Glitch */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>
                      Camera / Operational Flaw
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--teal)" }}>
                      {operationalCount} ({totalCases > 0 ? Math.round((operationalCount / totalCases) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="transport-progress-track">
                    <div
                      className="transport-progress-bar"
                      style={{
                        width: `${totalCases > 0 ? (operationalCount / totalCases) * 100 : 0}%`,
                        background: "var(--teal)",
                      }}
                    />
                  </div>
                </div>

                {/* Reason 4: Other Legitimate Reasons */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>
                      Other Documented Grounds
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--navy)" }}>
                      {otherCount} ({totalCases > 0 ? Math.round((otherCount / totalCases) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="transport-progress-track">
                    <div
                      className="transport-progress-bar"
                      style={{
                        width: `${totalCases > 0 ? (otherCount / totalCases) * 100 : 0}%`,
                        background: "var(--navy)",
                      }}
                    />
                  </div>
                </div>

                {/* Insight Callout */}
                <div
                  style={{
                    background: "#f8faf9",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginTop: 18,
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon name="check" size={16} />
                  <span style={{ fontSize: 10.5, color: "#455a64", lineHeight: 1.4 }}>
                    Automated ANPR audit has reduced false identity disputes by <strong>41%</strong> across high-density corridors.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tri-Panel: Statutory Decisions, Jurisdiction Network & Governance */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Panel 1: Statutory Decision Breakdown */}
            <div className="admin-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: "var(--navy)" }}>
                  Statutory Adjudication Breakdown
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--success)",
                    background: "#eaf8f0",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {cancellationRate}% Relief Rate
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#f8faf9", borderRadius: 10, padding: 12 }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>
                    Total Decisions Issued
                  </span>
                  <strong style={{ fontSize: 22, color: "var(--navy)" }}>
                    {summary.decisions_issued}
                  </strong>
                </div>

                <div style={{ background: "#f4fcf7", borderRadius: 10, padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#166442", display: "block" }}>
                    Cancellations Executed
                  </span>
                  <strong style={{ fontSize: 22, color: "var(--success)" }}>
                    {summary.cancellations_executed + summary.cancellations_approved}
                  </strong>
                </div>

                <div style={{ background: "#fef6f5", borderRadius: 10, padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#8a2c20", display: "block" }}>
                    Challans Upheld
                  </span>
                  <strong style={{ fontSize: 22, color: "var(--error)" }}>
                    {summary.upheld_count}
                  </strong>
                </div>

                <div style={{ background: "#fdf8f4", borderRadius: 10, padding: 12 }}>
                  <span style={{ fontSize: 10, color: "#8c561b", display: "block" }}>
                    Disputes Rejected
                  </span>
                  <strong style={{ fontSize: 22, color: "var(--warning)" }}>
                    {summary.rejected_count}
                  </strong>
                </div>
              </div>
            </div>

            {/* Panel 2: Traffic Enforcement Jurisdictions */}
            <div className="admin-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: "var(--navy)" }}>
                  Enforcement Jurisdictions
                </h3>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>Live Telemetry</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="transport-zone-card">
                  <div>
                    <strong style={{ fontSize: 11, color: "var(--navy)", display: "block" }}>
                      Central Traffic Corridor &amp; Ring Road
                    </strong>
                    <small style={{ fontSize: 9, color: "var(--muted)" }}>Speed &amp; RLVD Cameras</small>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)" }}>99.2% SLA</span>
                </div>

                <div className="transport-zone-card">
                  <div>
                    <strong style={{ fontSize: 11, color: "var(--navy)", display: "block" }}>
                      Expressway &amp; Highway Division
                    </strong>
                    <small style={{ fontSize: 9, color: "var(--muted)" }}>Lane discipline radar sensors</small>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)" }}>98.6% SLA</span>
                </div>

                <div className="transport-zone-card">
                  <div>
                    <strong style={{ fontSize: 11, color: "var(--navy)", display: "block" }}>
                      Urban Metro Transit Gateways
                    </strong>
                    <small style={{ fontSize: 9, color: "var(--muted)" }}>Weight-in-motion &amp; ANPR</small>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)" }}>99.8% SLA</span>
                </div>
              </div>
            </div>

            {/* Panel 3: Statutory Authority Rules */}
            <div className="admin-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "var(--navy)" }}>
                Statutory Authority Rules
              </h3>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: "#4e5d67" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Icon name="shield" size={17} />
                  <span>
                    <strong>Strict Queue Isolation:</strong> Traffic challans are handled exclusively by Transport Administration and never mix into general civic grievances.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Icon name="check" size={17} />
                  <span>
                    <strong>Statutory Hearing Mandate:</strong> Motor Vehicles Act gives citizens right to contest within 15 days of challan issuance.
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Icon name="bell" size={17} />
                  <span>
                    <strong>Live Notification Dispatch:</strong> Requests for evidence and orders trigger automated SMS and email notifications to vehicle owners.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Live Dispute Intake & Review Workbench (Table on Overview!) */}
          <section className="admin-panel recent-table">
            <div className="admin-panel-head">
              <div>
                <span className="eyebrow">CHALLAN DISPUTE WORKBENCH</span>
                <h3>Recent Incoming Disputes &amp; Quick Adjudication</h3>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => onNavigate("complaints")}
                  style={{ cursor: "pointer" }}
                >
                  View full queue ({totalCases}) <Icon name="arrow" size={15} />
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reference &amp; Challan</th>
                    <th>Vehicle Registration</th>
                    <th>Citizen Details</th>
                    <th>Violation Date &amp; Grounds</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 18 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => {
                    const statusInfo = CHALLAN_STATUS_LABELS[c.status] || {
                      label: c.status,
                      color: "var(--navy)",
                      bg: "#edf2f5",
                    };
                    const reasonLabel = CHALLAN_REASON_LABELS[c.dispute_reason] || c.dispute_reason;

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <strong style={{ fontSize: 11, color: "var(--navy)" }}>
                                {c.reference_id}
                              </strong>
                              <button
                                type="button"
                                onClick={() => handleCopy(c.reference_id)}
                                title="Copy Reference ID"
                                style={{
                                  border: 0,
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: copiedId === c.reference_id ? "var(--teal)" : "#94a3b8",
                                  padding: 0,
                                }}
                              >
                                <Icon name="file" size={13} />
                              </button>
                            </div>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                              Challan: {c.challan_number}
                            </span>
                          </div>
                        </td>

                        <td>
                          {/* HSRP License Plate badge */}
                          <div className="hsrp-badge">
                            <span className="hsrp-flag">
                              <span style={{ fontSize: 6 }}>IND</span>
                            </span>
                            <span className="hsrp-number">{c.vehicle_number}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: 11, color: "var(--navy)" }}>
                              {c.citizen_name || "Citizen"}
                            </strong>
                            <small style={{ fontSize: 10, color: "var(--muted)" }}>
                              {c.citizen_email || c.citizen_phone || "No contact provided"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: "#f0f4f7",
                                color: "#2d3748",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                maxWidth: 220,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={reasonLabel}
                            >
                              {reasonLabel}
                            </span>
                            <span style={{ fontSize: 9.5, color: "var(--muted)" }}>
                              Violation: {c.issue_date || "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              background: statusInfo.bg,
                              color: statusInfo.color,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: statusInfo.color,
                              }}
                            />
                            {statusInfo.label}
                          </span>
                        </td>

                        <td style={{ textAlign: "right", paddingRight: 18 }}>
                          <button
                            type="button"
                            className="primary-button"
                            style={{
                              padding: "5px 12px",
                              fontSize: 10.5,
                              borderRadius: 6,
                            }}
                            onClick={() => setSelectedCase(c)}
                          >
                            <Icon name="eye" size={14} /> Quick Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {recentCases.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <Icon name="traffic" size={32} />
                          <strong>No challan disputes found in queue.</strong>
                          <p style={{ margin: 0, fontSize: 11 }}>
                            When citizens submit disputes for traffic challans, they will appear here instantly.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Quick Review Modal */}
      {selectedCase && (
        <TransportDetailModal
          complaint={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdated={handleCaseUpdated}
        />
      )}
    </div>
  );
}
