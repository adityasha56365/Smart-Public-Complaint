import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { challanService } from "../../services/challanService";
import {
  CHALLAN_REASON_LABELS,
  CHALLAN_STATUS_LABELS,
  type ChallanComplaint,
  type ChallanDisputeReason,
} from "../../types/challan";

interface UploadedFilePreview {
  file: File;
  previewUrl: string;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

export default function CitizenChallanPage() {
  const [activeTab, setActiveTab] = useState<"form" | "my_disputes">("form");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disputes, setDisputes] = useState<ChallanComplaint[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<ChallanComplaint | null>(null);

  // Form State
  const [challanNumber, setChallanNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [disputeReason, setDisputeReason] = useState<ChallanDisputeReason>("wrong_vehicle");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ChallanComplaint | null>(null);

  // Additional Info Response State
  const [responseText, setResponseText] = useState("");
  const [responseFiles, setResponseFiles] = useState<UploadedFilePreview[]>([]);
  const [responding, setResponding] = useState(false);
  const [responseSuccessMsg, setResponseSuccessMsg] = useState("");

  const fetchMyDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await challanService.listMy({ page_size: 50 });
      setDisputes(res.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "my_disputes") {
      fetchMyDisputes();
    }
  }, [activeTab, fetchMyDisputes]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isResponse = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFilePreview[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const item = {
          file,
          previewUrl,
          dataUrl,
          name: file.name,
          size: file.size,
          type: file.type.startsWith("image/") ? "image" : "document",
        };
        if (isResponse) {
          setResponseFiles((prev) => [...prev, item]);
        } else {
          setUploadedFiles((prev) => [...prev, item]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeFile = (index: number, isResponse = false) => {
    if (isResponse) {
      setResponseFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!challanNumber.trim()) errors.challanNumber = "Challan number is required.";
    if (!vehicleNumber.trim()) errors.vehicleNumber = "Vehicle registration number is required.";
    if (!issueDate) errors.issueDate = "Challan issue date is required.";
    if (!description.trim() || description.trim().length < 10) {
      errors.description = "Please provide an explanation of at least 10 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowPreviewModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = {
        challan_number: challanNumber.trim().toUpperCase(),
        vehicle_number: vehicleNumber.trim().toUpperCase().replace(/\s+/g, ""),
        issue_date: new Date(issueDate).toISOString(),
        issuing_authority: issuingAuthority.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
        dispute_reason: disputeReason,
        description: description.trim(),
        evidence: uploadedFiles.map((f) => ({
          original_filename: f.name,
          mime_type: f.file.type || "application/octet-stream",
          size_bytes: f.size,
          attachment_type: f.type,
          file_data: f.dataUrl,
        })),
      };

      const result = await challanService.create(payload);
      setShowPreviewModal(false);
      setSubmissionSuccess(result);
      // Reset form
      setChallanNumber("");
      setVehicleNumber("");
      setIssueDate("");
      setIssuingAuthority("");
      setJurisdiction("");
      setDescription("");
      setUploadedFiles([]);
    } catch (err: any) {
      setShowPreviewModal(false);
      alert(err.response?.data?.detail || "Failed to submit challan dispute. Please check the details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCitizenResponse = async () => {
    if (!selectedDispute || !responseText.trim()) return;
    setResponding(true);
    try {
      const payload = {
        response_text: responseText.trim(),
        evidence: responseFiles.map((f) => ({
          original_filename: f.name,
          mime_type: f.file.type || "application/octet-stream",
          size_bytes: f.size,
          attachment_type: f.type,
          file_data: f.dataUrl,
        })),
      };
      const updated = await challanService.respond(selectedDispute.id, payload);
      setSelectedDispute(updated);
      setResponseText("");
      setResponseFiles([]);
      setResponseSuccessMsg("Your response and documents have been submitted to the Transport Department.");
      fetchMyDisputes();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit response.");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px 40px" }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--teal)",
              color: "white",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="traffic" size={24} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>
              Challan Complaint & Dispute Portal
            </h1>
            <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 13 }}>
              Challenge incorrect traffic challans, submit verifiable evidence, and track official Transport Department review.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 12, marginTop: 20, borderBottom: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("form");
              setSubmissionSuccess(null);
            }}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: 0,
              borderBottom: activeTab === "form" ? "3px solid var(--teal)" : "3px solid transparent",
              fontWeight: 700,
              fontSize: 13,
              color: activeTab === "form" ? "var(--teal)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            Dispute a Traffic Challan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my_disputes")}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: 0,
              borderBottom: activeTab === "my_disputes" ? "3px solid var(--teal)" : "3px solid transparent",
              fontWeight: 700,
              fontSize: 13,
              color: activeTab === "my_disputes" ? "var(--teal)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            My Challan Disputes {disputes.length > 0 && `(${disputes.length})`}
          </button>
        </div>
      </div>

      {/* SUCCESS STATE CARD */}
      {submissionSuccess && (
        <div
          style={{
            background: "#f0faf5",
            border: "1px solid #cceee0",
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--teal)",
              color: "white",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
            }}
          >
            <Icon name="check" size={28} />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "var(--navy)" }}>
            Dispute Registered Successfully!
          </h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            Your complaint has been forwarded to the **Transport Admin** for official verification.
          </p>

          <div
            style={{
              background: "white",
              display: "inline-block",
              border: "2px dashed var(--teal)",
              borderRadius: 10,
              padding: "12px 24px",
              margin: "18px 0",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
              YOUR OFFICIAL REFERENCE NUMBER
            </span>
            <strong style={{ fontSize: 22, color: "var(--navy)", letterSpacing: 1.5 }}>
              {submissionSuccess.reference_id}
            </strong>
          </div>

          <div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setSubmissionSuccess(null);
                setActiveTab("my_disputes");
              }}
            >
              Track Dispute in My Complaints
            </button>
          </div>
        </div>
      )}

      {/* FORM TAB */}
      {activeTab === "form" && !submissionSuccess && (
        <form onSubmit={handleOpenPreview} className="report-flow-card" style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "var(--navy)" }}>
            Vehicle & Challan Particulars
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Challan Number */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Challan Number *
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. DL123456789012"
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: fieldErrors.challanNumber ? "1px solid var(--error)" : "1px solid var(--border)",
                  fontSize: 13,
                  textTransform: "uppercase",
                }}
              />
              {fieldErrors.challanNumber && (
                <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.challanNumber}</span>
              )}
            </div>

            {/* Vehicle Number */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. DL 01 AB 1234"
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: fieldErrors.vehicleNumber ? "1px solid var(--error)" : "1px solid var(--border)",
                  fontSize: 13,
                  textTransform: "uppercase",
                }}
              />
              {fieldErrors.vehicleNumber && (
                <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.vehicleNumber}</span>
              )}
            </div>

            {/* Challan Issue Date */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Challan Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: fieldErrors.issueDate ? "1px solid var(--error)" : "1px solid var(--border)",
                  fontSize: 13,
                }}
              />
              {fieldErrors.issueDate && (
                <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.issueDate}</span>
              )}
            </div>

            {/* Issuing Authority */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Issuing Authority / Police Jurisdiction
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g. Delhi Traffic Police, South Circle"
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Dispute Reason */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Primary Reason for Disputing Challan *
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value as ChallanDisputeReason)}
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  background: "white",
                }}
              >
                {Object.entries(CHALLAN_REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Explanation */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Detailed Explanation & Justification *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain clearly why this challan is disputed (e.g. vehicle was parked in another city, incorrect camera OCR capture, registration mismatch, already paid on portal)..."
                style={{
                  width: "100%",
                  minHeight: 110,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: fieldErrors.description ? "1px solid var(--error)" : "1px solid var(--border)",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
              {fieldErrors.description && (
                <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.description}</span>
              )}
            </div>

            {/* Supporting Evidence Upload */}
            <div style={{ gridColumn: "span 2", marginTop: 8 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Supporting Evidence (RC copy, Photos, Payment Receipts, Toll slips)
              </label>
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 10,
                  padding: 20,
                  textAlign: "center",
                  background: "#fafbf9",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("challan-file-input")?.click()}
              >
                <input
                  id="challan-file-input"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, false)}
                  style={{ display: "none" }}
                />
                <Icon name="camera" size={28} />
                <p style={{ margin: "6px 0 2px", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
                  Click to upload photos or PDF documents
                </p>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>
                  Maximum 10MB per file. High-resolution images and clear PDF receipts supported.
                </small>
              </div>

              {/* Uploaded Files Previews */}
              {uploadedFiles.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginTop: 12 }}>
                  {uploadedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 6,
                        background: "white",
                        textAlign: "center",
                      }}
                    >
                      {f.type === "image" ? (
                        <img
                          src={f.previewUrl}
                          alt={f.name}
                          style={{ width: "100%", height: 75, objectFit: "cover", borderRadius: 6 }}
                        />
                      ) : (
                        <div style={{ height: 75, display: "grid", placeItems: "center", background: "#f2f5f4", borderRadius: 6 }}>
                          <Icon name="file" size={24} />
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>PDF Document</span>
                        </div>
                      )}
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {f.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx, false);
                        }}
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          background: "rgba(0,0,0,0.65)",
                          color: "white",
                          border: 0,
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="submit" className="primary-button" style={{ minWidth: 160 }}>
              Review & Submit Dispute
            </button>
          </div>
        </form>
      )}

      {/* PREVIEW & CONFIRMATION MODAL */}
      {showPreviewModal && (
        <div className="modal-scrim" style={{ display: "grid", placeItems: "center", zIndex: 100 }}>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              maxWidth: 580,
              width: "90%",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "var(--navy)" }}>
              Confirm Challan Dispute Submission
            </h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 12 }}>
              Please verify all particulars. Once submitted, your case will be routed to the Transport Admin review team.
            </p>

            <div style={{ background: "#f8faf9", borderRadius: 10, padding: 14, fontSize: 12, lineHeight: 1.6 }}>
              <div><strong>Challan Number:</strong> {challanNumber.toUpperCase()}</div>
              <div><strong>Vehicle Number:</strong> {vehicleNumber.toUpperCase()}</div>
              <div><strong>Issue Date:</strong> {issueDate}</div>
              <div><strong>Dispute Reason:</strong> {CHALLAN_REASON_LABELS[disputeReason]}</div>
              {issuingAuthority && <div><strong>Authority:</strong> {issuingAuthority}</div>}
              <div style={{ marginTop: 8 }}>
                <strong>Explanation:</strong>
                <p style={{ margin: "4px 0 0", color: "#333", whiteSpace: "pre-wrap" }}>{description}</p>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Attached Evidence:</strong> {uploadedFiles.length} file(s) attached
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowPreviewModal(false)}
                disabled={submitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleFinalSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Spinner /> <span>Submitting dispute...</span>
                  </span>
                ) : (
                  "Confirm & Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MY DISPUTES TAB */}
      {activeTab === "my_disputes" && (
        <div>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <Spinner />
              <p style={{ marginTop: 10 }}>Loading your challan disputes...</p>
            </div>
          )}

          {!loading && disputes.length === 0 && (
            <div
              style={{
                background: "white",
                borderRadius: 14,
                padding: 48,
                textAlign: "center",
                border: "1px solid var(--border)",
              }}
            >
              <Icon name="traffic" size={36} />
              <h3 style={{ margin: "12px 0 6px", fontSize: 18, color: "var(--navy)" }}>
                No Challan Disputes Yet
              </h3>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
                You have not challenged any traffic challans yet.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveTab("form")}
              >
                Dispute a Challan Now
              </button>
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            {disputes.map((d) => {
              const statusCfg = CHALLAN_STATUS_LABELS[d.status] || {
                label: d.status,
                color: "var(--navy)",
                bg: "#eee",
              };
              const isActionRequired = d.status === "awaiting_citizen_info";

              return (
                <div
                  key={d.id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    border: isActionRequired ? "2px solid var(--warning)" : "1px solid var(--border)",
                    padding: 18,
                    cursor: "pointer",
                    transition: "box-shadow 0.2s ease",
                  }}
                  onClick={() => {
                    setSelectedDispute(d);
                    setResponseSuccessMsg("");
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--teal)" }}>
                          {d.reference_id}
                        </span>
                        <span
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <h4 style={{ margin: "6px 0 2px", fontSize: 15, color: "var(--navy)" }}>
                        Challan #{d.challan_number} — Vehicle {d.vehicle_number}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                        Dispute Reason: {CHALLAN_REASON_LABELS[d.dispute_reason] || d.dispute_reason}
                      </p>
                    </div>

                    <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                      <div>Submitted: {new Date(d.created_at).toLocaleDateString()}</div>
                      <div>{d.evidence.length} evidence file(s)</div>
                    </div>
                  </div>

                  {/* Action Required Banner */}
                  {isActionRequired && (
                    <div
                      style={{
                        background: "#fff9ee",
                        border: "1px solid #f2dbb3",
                        borderRadius: 8,
                        padding: "8px 12px",
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#774a16",
                        fontSize: 12,
                      }}
                    >
                      <Icon name="alert" size={18} />
                      <span>
                        <strong>Action Needed:</strong> The Transport Department requested additional information. Click to respond.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DISPUTE DETAIL & ACTION MODAL */}
      {selectedDispute && (
        <div className="modal-scrim" style={{ display: "grid", placeItems: "center", zIndex: 100 }}>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              maxWidth: 720,
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--teal)" }}>
                  {selectedDispute.reference_id}
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, color: "var(--navy)" }}>
                  Challan #{selectedDispute.challan_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                style={{ border: 0, background: "transparent", fontSize: 18, cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Status & Particulars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0", fontSize: 12 }}>
              <div><strong>Vehicle Number:</strong> {selectedDispute.vehicle_number}</div>
              <div><strong>Issue Date:</strong> {new Date(selectedDispute.issue_date).toLocaleDateString()}</div>
              <div><strong>Authority:</strong> {selectedDispute.issuing_authority || "Traffic Enforcement"}</div>
              <div><strong>Dispute Reason:</strong> {CHALLAN_REASON_LABELS[selectedDispute.dispute_reason]}</div>
              <div style={{ gridColumn: "span 2" }}>
                <strong>Current Status:</strong>{" "}
                <span
                  style={{
                    background: CHALLAN_STATUS_LABELS[selectedDispute.status]?.bg || "#eee",
                    color: CHALLAN_STATUS_LABELS[selectedDispute.status]?.color || "#333",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  {CHALLAN_STATUS_LABELS[selectedDispute.status]?.label || selectedDispute.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{ background: "#f8faf9", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <strong style={{ fontSize: 12, color: "var(--navy)", display: "block", marginBottom: 4 }}>
                Citizen's Explanation:
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {selectedDispute.description}
              </p>
            </div>

            {/* Official Decision (if issued) */}
            {selectedDispute.decision_type && (
              <div
                style={{
                  background: "#f0fbf5",
                  border: "1px solid #c9eedb",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icon name="check" size={18} />
                  <strong style={{ fontSize: 13, color: "var(--navy)" }}>
                    Official Transport Department Decision
                  </strong>
                </div>
                <div style={{ fontSize: 12, color: "#195640" }}>
                  <div><strong>Outcome:</strong> {selectedDispute.decision_type.replace(/_/g, " ").toUpperCase()}</div>
                  {selectedDispute.decision_reason && (
                    <div style={{ marginTop: 4 }}><strong>Findings / Order Remarks:</strong> {selectedDispute.decision_reason}</div>
                  )}
                  {selectedDispute.decision_by_name && (
                    <small style={{ display: "block", marginTop: 4, color: "var(--muted)" }}>
                      Issued by {selectedDispute.decision_by_name} on {new Date(selectedDispute.decision_date || "").toLocaleString()}
                    </small>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info Request & Response Area */}
            {selectedDispute.status === "awaiting_citizen_info" && (
              <div style={{ background: "#fff9ee", border: "1px solid #f2dbb3", borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <strong style={{ color: "#774a16", fontSize: 13, display: "block", marginBottom: 6 }}>
                  ⚠️ Additional Information Required by Reviewing Officer:
                </strong>
                <p style={{ margin: "0 0 12px", color: "#443118", fontSize: 12 }}>
                  {selectedDispute.additional_info_requested || "Please provide supporting documentation."}
                </p>

                {responseSuccessMsg ? (
                  <div style={{ color: "var(--teal)", fontWeight: 700, fontSize: 12 }}>
                    ✓ {responseSuccessMsg}
                  </div>
                ) : (
                  <div>
                    <textarea
                      placeholder="Type your response / clarification here..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 70,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        fontFamily: "inherit",
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ cursor: "pointer", fontSize: 11, color: "var(--teal)", fontWeight: 700 }}>
                        + Attach additional documents
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, true)}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleCitizenResponse}
                        disabled={responding || !responseText.trim()}
                        style={{ minHeight: 34, fontSize: 12 }}
                      >
                        {responding ? "Submitting..." : "Submit Response"}
                      </button>
                    </div>

                    {responseFiles.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                        {responseFiles.map((f, i) => (
                          <span key={i} style={{ display: "inline-block", background: "#eee", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                            {f.name} ({(f.size / 1024).toFixed(0)}KB)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Evidence Gallery */}
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                Evidence Documents ({selectedDispute.evidence.length})
              </strong>
              {selectedDispute.evidence.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--muted)" }}>No files uploaded.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                  {selectedDispute.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 6,
                        textAlign: "center",
                      }}
                    >
                      {ev.file_data && ev.attachment_type === "image" ? (
                        <a href={ev.file_data} target="_blank" rel="noopener noreferrer">
                          <img
                            src={ev.file_data}
                            alt={ev.original_filename}
                            style={{ width: "100%", height: 75, objectFit: "cover", borderRadius: 6 }}
                          />
                        </a>
                      ) : (
                        <div style={{ height: 75, display: "grid", placeItems: "center", background: "#f2f5f4", borderRadius: 6 }}>
                          <Icon name="file" size={24} />
                          <span style={{ fontSize: 9, color: "var(--muted)" }}>Document</span>
                        </div>
                      )}
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ev.original_filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div>
              <strong style={{ fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                Audit Timeline & History
              </strong>
              <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 12, marginLeft: 6 }}>
                {selectedDispute.status_history.map((h) => (
                  <div key={h.id} style={{ marginBottom: 10, position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -18,
                        top: 2,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--teal)",
                      }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                      {h.to_status.replace(/_/g, " ").toUpperCase()}
                      {h.changed_by_name && ` — by ${h.changed_by_name}`}
                    </div>
                    {h.note && <div style={{ fontSize: 11, color: "var(--muted)" }}>{h.note}</div>}
                    <div style={{ fontSize: 9, color: "#999" }}>
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedDispute(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
