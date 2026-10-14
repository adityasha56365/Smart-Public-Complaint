import { useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { challanService } from "../../services/challanService";
import {
  CHALLAN_REASON_LABELS,
  CHALLAN_STATUS_LABELS,
  EVIDENCE_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
  type ChallanComplaint,
} from "../../types/challan";

export default function TransportDetailModal({
  complaint,
  onClose,
  onUpdated,
}: {
  complaint: ChallanComplaint;
  onClose: () => void;
  onUpdated: (updated: ChallanComplaint) => void;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<ChallanComplaint>(complaint);
  const [loadingAction, setLoadingAction] = useState(false);
  const [activeAction, setActiveAction] = useState<
    "none" | "request_info" | "record_findings" | "approve" | "reject" | "decision"
  >("none");

  // Form states for actions
  const [infoMessage, setInfoMessage] = useState("");
  const [findingsText, setFindingsText] = useState("");
  const [decisionType, setDecisionType] = useState("upheld");
  const [decisionReason, setDecisionReason] = useState("");
  const [showConfirmDecision, setShowConfirmDecision] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const APPROVE_PRESETS = [
    "Vehicle make/model & plate mismatch verified from uploaded photos",
    "Technical camera OCR read error confirmed at traffic junction",
    "Valid emergency / statutory exemption verified",
    "Duplicate challan issued for single recorded occurrence",
  ];

  const REJECT_PRESETS = [
    "Photographic evidence and camera logs confirm legitimate violation",
    "Submitted supporting documents are insufficient to refute the violation",
    "Vehicle registration and offence details match statutory records",
    "Dispute grounds do not meet cancellation criteria",
  ];

  const isSupervisorOrAdmin =
    user?.role === "transport_admin" ||
    user?.role === "transport_supervisor" ||
    user?.role === "admin";

  // Action: Accept for Review
  const handleAccept = async () => {
    setLoadingAction(true);
    setActionError("");
    try {
      const res = await challanService.acceptForReview(data.id);
      setData(res);
      onUpdated(res);
      setActionSuccess("Case accepted for official review.");
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to accept case.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Request Info
  const handleRequestInfoSubmit = async () => {
    if (!infoMessage.trim()) return;
    setLoadingAction(true);
    setActionError("");
    try {
      const res = await challanService.requestInfo(data.id, infoMessage.trim());
      setData(res);
      onUpdated(res);
      setActiveAction("none");
      setInfoMessage("");
      setActionSuccess("Additional information request sent to the citizen.");
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to send request.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Record Review Findings
  const handleRecordFindingsSubmit = async () => {
    if (!findingsText.trim()) return;
    setLoadingAction(true);
    setActionError("");
    try {
      const res = await challanService.recordReview(data.id, findingsText.trim());
      setData(res);
      onUpdated(res);
      setActiveAction("none");
      setFindingsText("");
      setActionSuccess("Internal findings recorded in case history.");
    } catch (err: any) {
      setActionError(err.response?.data?.detail || "Failed to record findings.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Action: Decision
  const handleDecisionSubmit = async () => {
    if (!decisionReason.trim()) {
      setActionError("Decision reason / remarks are mandatory.");
      return;
    }
    setLoadingAction(true);
    setActionError("");
    try {
      const res = await challanService.recordDecision(data.id, decisionType, decisionReason.trim());
      setData(res);
      onUpdated(res);
      setShowConfirmDecision(false);
      setActiveAction("none");
      setActionSuccess(`Official decision (${decisionType.replace(/_/g, " ").toUpperCase()}) has been issued.`);
    } catch (err: any) {
      setShowConfirmDecision(false);
      setActionError(err.response?.data?.detail || "Failed to record decision.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="modal-scrim" style={{ display: "grid", placeItems: "center", zIndex: 110 }}>
      <div
        style={{
          background: "white",
          borderRadius: 14,
          maxWidth: 820,
          width: "94%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--teal)" }}>
                {data.reference_id}
              </span>
              <span
                style={{
                  background: CHALLAN_STATUS_LABELS[data.status]?.bg || "#eee",
                  color: CHALLAN_STATUS_LABELS[data.status]?.color || "#333",
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {CHALLAN_STATUS_LABELS[data.status]?.label || data.status}
              </span>
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, color: "var(--navy)" }}>
              Challan #{data.challan_number} — Vehicle {data.vehicle_number}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div style={{ background: "#f0faf5", border: "1px solid #cceee0", borderRadius: 8, padding: "8px 14px", marginTop: 12, color: "var(--teal)", fontSize: 12 }}>
            ✓ {actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{ background: "#fff5f5", border: "1px solid #f8d7d7", borderRadius: 8, padding: "8px 14px", marginTop: 12, color: "var(--error)", fontSize: 12 }}>
            ✕ {actionError}
          </div>
        )}

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, margin: "16px 0", fontSize: 12 }}>
          <div style={{ background: "#fafbf9", borderRadius: 10, padding: 14 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--navy)" }}>Challan Information</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><strong>Vehicle Reg:</strong> {data.vehicle_number}</div>
              <div><strong>Vehicle Type:</strong> {VEHICLE_TYPE_OPTIONS.find((v) => v.value === data.vehicle_type)?.label || data.vehicle_type || "N/A"}</div>
              <div><strong>Owner as per RC:</strong> {data.owner_name || "N/A"}</div>
              <div><strong>Issue Date:</strong> {new Date(data.issue_date).toLocaleDateString()}</div>
              <div><strong>Authority:</strong> {data.issuing_authority || "Traffic Cell"}</div>
              <div style={{ gridColumn: "span 2" }}>
                <strong>Dispute Reason:</strong> {CHALLAN_REASON_LABELS[data.dispute_reason] || data.dispute_reason}
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <strong>Assigned Officer:</strong> {data.assigned_officer_name || "Unassigned"}
              </div>
            </div>
          </div>

          <div style={{ background: "#fafbf9", borderRadius: 10, padding: 14 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--navy)" }}>Citizen Applicant</h4>
            <div><strong>Name:</strong> {data.contact_name || data.citizen_name || "Citizen User"}</div>
            <div><strong>Email:</strong> {data.contact_email || data.citizen_email || "N/A"}</div>
            <div><strong>Phone:</strong> {data.contact_phone || data.citizen_phone || "N/A"}</div>
            <div><strong>Filed On:</strong> {new Date(data.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* Citizen's Explanation */}
        <div style={{ background: "#fdfefd", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
            Citizen's Dispute Statement:
          </strong>
          <p style={{ margin: 0, fontSize: 12, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {data.description}
          </p>
        </div>

        {/* Citizen Additional Response (if submitted) */}
        {data.citizen_response_text && (
          <div style={{ background: "#eaf6f4", border: "1px solid #c7ede7", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: "var(--teal)", display: "block", marginBottom: 6 }}>
              Citizen Response to Information Request:
            </strong>
            <p style={{ margin: 0, fontSize: 12, color: "#164c45", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {data.citizen_response_text}
            </p>
          </div>
        )}

        {/* Official Decision (if issued) */}
        {data.decision_type && (
          <div style={{ background: "#f0fbf5", border: "1px solid #c9eedb", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: "#166442", display: "block", marginBottom: 4 }}>
              Statutory Decision: {data.decision_type.replace(/_/g, " ").toUpperCase()}
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#222" }}>
              <strong>Findings / Order Remarks:</strong> {data.decision_reason}
            </p>
            <small style={{ display: "block", marginTop: 4, color: "var(--muted)", fontSize: 10 }}>
              Recorded by {data.decision_by_name} on {new Date(data.decision_date || "").toLocaleString()}
            </small>
          </div>
        )}

        {/* Evidence Documents */}
        <div style={{ marginBottom: 16 }}>
          <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 8 }}>
            Evidence & Supporting Records ({data.evidence.length})
          </strong>
          {data.evidence.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--muted)" }}>No files uploaded with dispute.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {data.evidence.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 8,
                    textAlign: "center",
                    background: "white",
                  }}
                >
                  {ev.file_data && ev.attachment_type === "image" ? (
                    <a href={ev.file_data} target="_blank" rel="noopener noreferrer">
                      <img
                        src={ev.file_data}
                        alt={ev.original_filename}
                        style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }}
                      />
                    </a>
                  ) : (
                    <div style={{ height: 80, display: "grid", placeItems: "center", background: "#f2f5f4", borderRadius: 6 }}>
                      <Icon name="file" size={26} />
                      <span style={{ fontSize: 9, color: "var(--muted)" }}>Document</span>
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: ev.evidence_type?.startsWith("vehicle_") ? "#eaf6f4" : "#eee",
                        color: ev.evidence_type?.startsWith("vehicle_") ? "var(--teal)" : "#444",
                        display: "inline-block",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {EVIDENCE_TYPE_LABELS[ev.evidence_type || ""] || ev.evidence_type || "Supporting Evidence"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--navy)" }} title={ev.original_filename}>
                    {ev.original_filename}
                  </p>
                  {ev.is_citizen_response && (
                    <span style={{ fontSize: 8, color: "var(--teal)", fontWeight: 700 }}>
                      [From Response]
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prior Review Findings */}
        {data.reviews.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
              Recorded Examination Notes:
            </strong>
            <div style={{ display: "grid", gap: 6 }}>
              {data.reviews.map((r) => (
                <div key={r.id} style={{ background: "#f9fafb", padding: "8px 12px", borderRadius: 6, fontSize: 11 }}>
                  <strong>{r.officer_name || "Reviewing Officer"}:</strong> {r.findings}
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION WORKSPACE CONTROLS */}
        <div style={{ borderTop: "2px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: "var(--navy)" }}>Officer Review & Decision Actions</h4>
            {["cancellation_approved", "cancellation_executed", "dispute_rejected", "upheld"].includes(data.status) && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background:
                    data.status === "cancellation_approved" || data.status === "cancellation_executed"
                      ? "#f0fdf4"
                      : "#fef2f2",
                  color:
                    data.status === "cancellation_approved" || data.status === "cancellation_executed"
                      ? "#15803d"
                      : "#b91c1c",
                  border:
                    data.status === "cancellation_approved" || data.status === "cancellation_executed"
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                }}
              >
                Case Resolved: {data.status.replace(/_/g, " ").toUpperCase()}
              </span>
            )}
          </div>

          {activeAction === "none" && (
            <div>
              {/* PRIMARY DECISION BUTTONS: APPROVE / REJECT */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                {/* APPROVE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setDecisionType("cancellation_approved");
                    setDecisionReason("");
                    setActiveAction("approve");
                  }}
                  disabled={loadingAction}
                  style={{
                    minHeight: 46,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                    transition: "transform 0.1s ease, background 0.15s ease",
                  }}
                >
                  <Icon name="check" size={18} /> Approve Dispute (Cancel / Waive Challan)
                </button>

                {/* REJECT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setDecisionType("dispute_rejected");
                    setDecisionReason("");
                    setActiveAction("reject");
                  }}
                  disabled={loadingAction}
                  style={{
                    minHeight: 46,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
                    transition: "transform 0.1s ease, background 0.15s ease",
                  }}
                >
                  <Icon name="x" size={18} /> Reject Dispute (Uphold Challan)
                </button>
              </div>

              {/* SECONDARY REVIEW ACTIONS */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.status === "submitted" && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAccept}
                    disabled={loadingAction}
                    style={{ minHeight: 36, fontSize: 12 }}
                  >
                    <Icon name="check" size={14} /> Accept for Review
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveAction("request_info")}
                  disabled={loadingAction}
                  style={{ minHeight: 36, fontSize: 12 }}
                >
                  <Icon name="alert" size={14} /> Request Additional Info
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveAction("record_findings")}
                  disabled={loadingAction}
                  style={{ minHeight: 36, fontSize: 12 }}
                >
                  <Icon name="file" size={14} /> Record Inspection Notes
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveAction("decision")}
                  disabled={loadingAction}
                  style={{ minHeight: 36, fontSize: 12 }}
                >
                  <Icon name="shield" size={14} /> More Statutory Actions...
                </button>
              </div>
            </div>
          )}

          {/* Sub-form: APPROVE DISPUTE */}
          {activeAction === "approve" && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "#16a34a", color: "white", borderRadius: "50%", width: 24, height: 24, display: "grid", placeItems: "center" }}>
                  <Icon name="check" size={15} />
                </span>
                <h5 style={{ margin: 0, fontSize: 15, color: "#166534", fontWeight: 700 }}>
                  Approve Challan Dispute (Cancel Fine)
                </h5>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#15803d" }}>
                Confirm that the citizen's dispute grounds are valid. The fine will be waived and an official clearance decision dispatched to the citizen.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                    Disposal Type *
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #86efac", fontSize: 12, background: "white" }}
                  >
                    <option value="cancellation_approved">Cancellation Approved (Standard)</option>
                    <option value="cancellation_executed">Execute Immediate Cancellation & Waiver</option>
                  </select>
                </div>

                <div>
                  {!isSupervisorOrAdmin && (
                    <div style={{ background: "#fff5f5", color: "var(--error)", padding: 8, borderRadius: 6, fontSize: 11 }}>
                      ⚠️ Cancellation requires <strong>Transport Admin</strong> authorization.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick-fill presets */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 5 }}>
                  Quick-Select Finding Reason:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {APPROVE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDecisionReason(preset)}
                      style={{
                        background: decisionReason === preset ? "#16a34a" : "white",
                        color: decisionReason === preset ? "white" : "#166534",
                        border: "1px solid #86efac",
                        padding: "4px 9px",
                        borderRadius: 14,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                  Statutory Order & Findings Remarks *
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Record formal reasons supporting this challan cancellation..."
                  style={{
                    width: "100%",
                    minHeight: 76,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #86efac",
                    fontSize: 12,
                    fontFamily: "inherit",
                    marginBottom: 12,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setActiveAction("none");
                    setDecisionReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDecision(true)}
                  disabled={loadingAction || !decisionReason.trim()}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "0 18px",
                    height: 38,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: !decisionReason.trim() ? "not-allowed" : "pointer",
                    opacity: !decisionReason.trim() ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="check" size={16} /> Confirm Approval & Cancel Challan
                </button>
              </div>
            </div>
          )}

          {/* Sub-form: REJECT DISPUTE */}
          {activeAction === "reject" && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "#dc2626", color: "white", borderRadius: "50%", width: 24, height: 24, display: "grid", placeItems: "center" }}>
                  <Icon name="x" size={15} />
                </span>
                <h5 style={{ margin: 0, fontSize: 15, color: "#991b1b", fontWeight: 700 }}>
                  Reject Challan Dispute (Uphold Challan)
                </h5>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#b91c1c" }}>
                Confirm that the traffic violation is valid or the submitted evidence is insufficient. The challan remains active and must be paid.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                    Rejection Outcome *
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #fca5a5", fontSize: 12, background: "white" }}
                  >
                    <option value="dispute_rejected">Dispute Rejected (Insufficient Grounds / Evidence Mismatch)</option>
                    <option value="upheld">Challan Upheld (Legitimate Violation Confirmed by Camera/Sensor)</option>
                  </select>
                </div>
              </div>

              {/* Quick-fill presets */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 5 }}>
                  Quick-Select Rejection Reason:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {REJECT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDecisionReason(preset)}
                      style={{
                        background: decisionReason === preset ? "#dc2626" : "white",
                        color: decisionReason === preset ? "white" : "#991b1b",
                        border: "1px solid #fca5a5",
                        padding: "4px 9px",
                        borderRadius: 14,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                  Statutory Findings & Rejection Grounds *
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Record formal reasons why this dispute is rejected..."
                  style={{
                    width: "100%",
                    minHeight: 76,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #fca5a5",
                    fontSize: 12,
                    fontFamily: "inherit",
                    marginBottom: 12,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setActiveAction("none");
                    setDecisionReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDecision(true)}
                  disabled={loadingAction || !decisionReason.trim()}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "0 18px",
                    height: 38,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: !decisionReason.trim() ? "not-allowed" : "pointer",
                    opacity: !decisionReason.trim() ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="x" size={16} /> Confirm Rejection & Uphold Challan
                </button>
              </div>
            </div>
          )}

          {/* Sub-form: Request Information */}
          {activeAction === "request_info" && (
            <div style={{ background: "#fff9ee", border: "1px solid #f2dbb3", borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: "0 0 8px", fontSize: 13, color: "#774a16" }}>
                Request Specific Documents / Details from Citizen
              </h5>
              <textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="e.g. Please provide a clear copy of your Vehicle Registration Certificate (RC) showing engine number..."
                style={{
                  width: "100%",
                  minHeight: 70,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontFamily: "inherit",
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={() => setActiveAction("none")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleRequestInfoSubmit}
                  disabled={loadingAction || !infoMessage.trim()}
                >
                  {loadingAction ? "Sending..." : "Dispatch Request to Citizen"}
                </button>
              </div>
            </div>
          )}

          {/* Sub-form: Record Findings */}
          {activeAction === "record_findings" && (
            <div style={{ background: "#f8faf9", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--navy)" }}>
                Internal Review Findings & Remarks
              </h5>
              <textarea
                value={findingsText}
                onChange={(e) => setFindingsText(e.target.value)}
                placeholder="e.g. Verified ANPR camera logs at junction; camera OCR missed character; recommendation for correction..."
                style={{
                  width: "100%",
                  minHeight: 70,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontFamily: "inherit",
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={() => setActiveAction("none")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleRecordFindingsSubmit}
                  disabled={loadingAction || !findingsText.trim()}
                >
                  {loadingAction ? "Saving..." : "Save Findings"}
                </button>
              </div>
            </div>
          )}

          {/* Sub-form: Custom Statutory Decision */}
          {activeAction === "decision" && (
            <div style={{ background: "#f7fafc", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
              <h5 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--navy)" }}>
                Custom Statutory Order / Disposal
              </h5>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Decision Outcome *
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "white" }}
                  >
                    <option value="cancellation_approved">Cancellation Approved (Pending Execution)</option>
                    <option value="cancellation_executed">Cancellation Executed</option>
                    <option value="dispute_rejected">Dispute Rejected (Insufficient grounds)</option>
                    <option value="upheld">Challan Upheld (Valid violation)</option>
                    <option value="correction_recommended">Correction Recommended</option>
                    <option value="correction_approved">Correction Approved</option>
                  </select>
                </div>

                <div>
                  {(decisionType === "cancellation_approved" || decisionType === "cancellation_executed") && !isSupervisorOrAdmin && (
                    <div style={{ background: "#fff5f5", color: "var(--error)", padding: 8, borderRadius: 6, fontSize: 11, marginTop: 18 }}>
                      ⚠️ Cancellation requires <strong>Transport Admin</strong> authorization.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  Findings & Statutory Order Remarks *
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Record formal reasons supporting this decision..."
                  style={{
                    width: "100%",
                    minHeight: 80,
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    marginBottom: 12,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={() => setActiveAction("none")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowConfirmDecision(true)}
                  disabled={loadingAction || !decisionReason.trim()}
                  style={{ background: "var(--navy)" }}
                >
                  Finalize Decision...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DECISION CONFIRMATION MODAL */}
        {showConfirmDecision && (
          <div className="modal-scrim" style={{ display: "grid", placeItems: "center", zIndex: 120 }}>
            <div style={{ background: "white", borderRadius: 12, padding: 22, maxWidth: 480, width: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    background:
                      decisionType === "cancellation_approved" || decisionType === "cancellation_executed"
                        ? "#16a34a"
                        : decisionType === "dispute_rejected" || decisionType === "upheld"
                        ? "#dc2626"
                        : "var(--navy)",
                    color: "white",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon
                    name={
                      decisionType === "cancellation_approved" || decisionType === "cancellation_executed"
                        ? "check"
                        : decisionType === "dispute_rejected" || decisionType === "upheld"
                        ? "x"
                        : "shield"
                    }
                    size={16}
                  />
                </span>
                <h4 style={{ margin: 0, fontSize: 16, color: "var(--navy)" }}>
                  {decisionType === "cancellation_approved" || decisionType === "cancellation_executed"
                    ? "Confirm Challan Cancellation"
                    : decisionType === "dispute_rejected" || decisionType === "upheld"
                    ? "Confirm Dispute Rejection"
                    : "Confirm Official Decision"}
                </h4>
              </div>

              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                {decisionType === "cancellation_approved" || decisionType === "cancellation_executed" ? (
                  <>
                    You are approving the dispute for Challan <strong>#{data.challan_number}</strong> (Vehicle <strong>{data.vehicle_number}</strong>). The challan fine will be cancelled/waived and an official clearance order will be dispatched.
                  </>
                ) : decisionType === "dispute_rejected" || decisionType === "upheld" ? (
                  <>
                    You are rejecting the dispute for Challan <strong>#{data.challan_number}</strong> (Vehicle <strong>{data.vehicle_number}</strong>). The challan will remain active and legally enforceable.
                  </>
                ) : (
                  <>
                    You are about to issue the decision <strong>{decisionType.replace(/_/g, " ").toUpperCase()}</strong> on Challan #{data.challan_number}.
                  </>
                )}
              </p>

              <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, fontSize: 11, marginBottom: 16, border: "1px solid var(--border)" }}>
                <strong>Recorded Reason:</strong> {decisionReason}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="secondary-button" onClick={() => setShowConfirmDecision(false)} disabled={loadingAction}>
                  Back / Edit
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleDecisionSubmit}
                  disabled={loadingAction}
                  style={{
                    background:
                      decisionType === "cancellation_approved" || decisionType === "cancellation_executed"
                        ? "#16a34a"
                        : decisionType === "dispute_rejected" || decisionType === "upheld"
                        ? "#dc2626"
                        : "var(--navy)",
                  }}
                >
                  {loadingAction
                    ? "Processing..."
                    : decisionType === "cancellation_approved" || decisionType === "cancellation_executed"
                    ? "Confirm & Waive Challan"
                    : decisionType === "dispute_rejected" || decisionType === "upheld"
                    ? "Confirm & Reject Dispute"
                    : "Confirm & Issue"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
