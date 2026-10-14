import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { challanService } from "../../services/challanService";
import {
  CHALLAN_REASON_LABELS,
  CHALLAN_STATUS_LABELS,
  type ChallanComplaint,
} from "../../types/challan";
import TransportDetailModal from "./TransportDetailModal";

export default function TransportComplaints({
  initialStatusFilter,
  initialSearch,
}: {
  initialStatusFilter?: string;
  initialSearch?: string;
}) {
  const [complaints, setComplaints] = useState<ChallanComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  // Filters
  const [search, setSearch] = useState(initialSearch || "");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "");
  const [maskVehicles, setMaskVehicles] = useState(false);
  const [selectedCase, setSelectedCase] = useState<ChallanComplaint | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setPage(1);
    }
  }, [initialSearch]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await challanService.listTransportComplaints({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page,
        page_size: pageSize,
      });
      setComplaints(res.items || []);
      setTotal(res.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);


  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Vehicle masking helper
  const formatVehicleNumber = (v: string) => {
    if (!maskVehicles || v.length < 5) return v;
    const start = v.slice(0, 4);
    const end = v.slice(-2);
    return `${start} •••• ${end}`;
  };

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
      a.download = `Challan_Queue_Export_${new Date().toISOString().split("T")[0]}.csv`;
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

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">TRANSPORT ADMIN PORTAL</span>
          <h1>Challan Dispute Queue</h1>
          <p>
            Official intake, examination, and statutory review queue for traffic enforcement disputes.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportCSV}
            disabled={exporting || total === 0}
            style={{ fontSize: 11 }}
          >
            <Icon name="download" size={15} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setMaskVehicles(!maskVehicles)}
            style={{ fontSize: 11 }}
          >
            <Icon name={maskVehicles ? "eye" : "eye-off"} size={16} />
            {maskVehicles ? "Show Full Vehicle Numbers" : "Mask Vehicle Numbers"}
          </button>
        </div>
      </div>


      <section className="admin-panel">
        {/* Toolbar */}
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
          {/* Search bar */}
          <div className="admin-search" style={{ maxWidth: 360, width: "100%" }}>
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search by Ref ID, Challan #, or Vehicle #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 11 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "", label: "All Cases" },
              { id: "submitted", label: "Newly Submitted" },
              { id: "under_review", label: "Under Review" },
              { id: "awaiting_citizen_info", label: "Info Awaiting" },
              { id: "cancellation_approved", label: "Cancellations Approved" },
              { id: "upheld", label: "Upheld" },
              { id: "dispute_rejected", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: statusFilter === tab.id ? "var(--teal)" : "white",
                  color: statusFilter === tab.id ? "white" : "var(--muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            <Spinner />
            <p style={{ marginTop: 10, fontSize: 12 }}>Loading dispute cases...</p>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Challan No.</th>
                <th>Vehicle No.</th>
                <th>Dispute Grounds</th>
                <th>Filing Date</th>
                <th>Status</th>
                <th>Assigned Officer</th>
                <th style={{ textAlign: "right", paddingRight: 18 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => {
                const statusCfg = CHALLAN_STATUS_LABELS[c.status] || {
                  label: c.status,
                  color: "var(--navy)",
                  bg: "#eee",
                };

                return (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ fontSize: 12, color: "var(--teal)" }}>
                        {c.reference_id}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ fontSize: 12, color: "var(--navy)" }}>
                        {c.challan_number}
                      </strong>
                      <small style={{ color: "var(--muted)", fontSize: 10 }}>
                        {c.issuing_authority || "Traffic Cell"}
                      </small>
                    </td>
                    <td>
                      <div className="hsrp-badge">
                        <span className="hsrp-flag">
                          <span style={{ fontSize: 6 }}>IND</span>
                        </span>
                        <span className="hsrp-number">{formatVehicleNumber(c.vehicle_number)}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "#333" }}>
                        {CHALLAN_REASON_LABELS[c.dispute_reason] || c.dispute_reason}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {c.assigned_officer_name || "Unassigned"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 18 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCase(c)}
                        style={{
                          border: "1px solid var(--border)",
                          background: [
                            "cancellation_approved",
                            "cancellation_executed",
                            "dispute_rejected",
                            "upheld",
                          ].includes(c.status)
                            ? "white"
                            : "var(--teal)",
                          color: [
                            "cancellation_approved",
                            "cancellation_executed",
                            "dispute_rejected",
                            "upheld",
                          ].includes(c.status)
                            ? "var(--navy)"
                            : "white",
                          padding: "6px 13px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {[
                          "cancellation_approved",
                          "cancellation_executed",
                          "dispute_rejected",
                          "upheld",
                        ].includes(c.status) ? (
                          "View Case"
                        ) : (
                          <>
                            <Icon name="check" size={13} /> Review & Decide
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && complaints.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                    {search || statusFilter
                      ? "No challan disputes found matching your query."
                      : "No challan disputes in the queue."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>
              Showing Page {page} of {totalPages} ({total} total disputes)
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Review Workspace Modal */}
      {selectedCase && (
        <TransportDetailModal
          complaint={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdated={(updated) => {
            setComplaints((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setSelectedCase(updated);
          }}
        />
      )}
    </div>
  );
}
