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
  const [activeAction, setActiveAction] = useState<"none" | "request_info" | "record_findings" | "decision">("none");

  // Form states for actions
  const [infoMessage, setInfoMessage] = useState("");
  const [findingsText, setFindingsText] = useState("");
  const [decisionType, setDecisionType] = useState("upheld");
  const [decisionReason, setDecisionReason] = useState("");
  const [showConfirmDecision, setShowConfirmDecision] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

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
          <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "var(--navy)" }}>Officer Review Actions</h4>

          {activeAction === "none" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {data.status === "submitted" && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleAccept}
                  disabled={loadingAction}
                  style={{ minHeight: 38, fontSize: 12 }}
                >
                  <Icon name="check" size={16} /> Accept for Review
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveAction("request_info")}
                disabled={loadingAction}
                style={{ minHeight: 38, fontSize: 12 }}
              >
                <Icon name="alert" size={16} /> Request Additional Info
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveAction("record_findings")}
                disabled={loadingAction}
                style={{ minHeight: 38, fontSize: 12 }}
              >
                <Icon name="file" size={16} /> Record Inspection Notes
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveAction("decision")}
                disabled={loadingAction}
                style={{ minHeight: 38, fontSize: 12, background: "var(--navy)" }}
              >
                <Icon name="shield" size={16} /> Issue Statutory Decision
              </button>
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

          {/* Sub-form: Issue Decision */}
          {activeAction === "decision" && (
            <div style={{ background: "#f7fafc", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
              <h5 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--navy)" }}>
                Issue Official Disposal / Decision
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
                    <option value="upheld">Challan Upheld (Valid violation)</option>
                    <option value="dispute_rejected">Dispute Rejected (Insufficient grounds)</option>
                    <option value="correction_recommended">Correction Recommended</option>
                    <option value="correction_approved">Correction Approved</option>
                    <option value="cancellation_approved">Cancellation Approved (Pending Execution)</option>
                    <option value="cancellation_executed">Cancellation Executed</option>
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
              <h4 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--navy)" }}>
                Confirm Official Decision
              </h4>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
                You are about to issue the decision <strong>{decisionType.replace(/_/g, " ").toUpperCase()}</strong> on Challan #{data.challan_number}. This status will be permanently timestamped in the audit log and dispatched to the citizen.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="secondary-button" onClick={() => setShowConfirmDecision(false)} disabled={loadingAction}>
                  Back
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleDecisionSubmit}
                  disabled={loadingAction}
                  style={{ background: "var(--navy)" }}
                >
                  {loadingAction ? "Processing..." : "Confirm & Issue"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
