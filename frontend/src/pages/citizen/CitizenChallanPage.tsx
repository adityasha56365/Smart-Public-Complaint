import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { challanService } from "../../services/challanService";
import {
  CHALLAN_REASON_LABELS,
  CHALLAN_STATUS_LABELS,
  EVIDENCE_TYPE_LABELS,
  EVIDENCE_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
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
  evidenceType: string;
}

export default function CitizenChallanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"form" | "my_disputes">("form");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disputes, setDisputes] = useState<ChallanComplaint[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<ChallanComplaint | null>(null);

  // Form State
  const [challanNumber, setChallanNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [vehicleType, setVehicleType] = useState("two_wheeler");
  const [contactName, setContactName] = useState(user?.full_name || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [issueDate, setIssueDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [disputeReason, setDisputeReason] = useState<ChallanDisputeReason>("wrong_vehicle");
  const [description, setDescription] = useState("");
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>("vehicle_front");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ChallanComplaint | null>(null);

  // Auto-sync contact details when user context loads
  useEffect(() => {
    if (user) {
      if (!contactName && user.full_name) setContactName(user.full_name);
      if (!contactEmail && user.email) setContactEmail(user.email);
      if (!contactPhone && user.phone) setContactPhone(user.phone);
    }
  }, [user]);

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

  // File Upload Handler (supports multiple images at once)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isResponse = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const item: UploadedFilePreview = {
          file,
          previewUrl,
          dataUrl,
          name: file.name,
          size: file.size,
          type: file.type.startsWith("image/") ? "image" : "document",
          evidenceType: isResponse ? "other_document" : selectedEvidenceType,
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

  const updateFileEvidenceType = (index: number, newType: string) => {
    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, evidenceType: newType } : f))
    );
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
    if (!ownerName.trim()) errors.ownerName = "Owner name as per RC is required.";
    if (!vehicleType.trim()) errors.vehicleType = "Vehicle type is required.";
    if (!contactName.trim()) errors.contactName = "Applicant full name is required.";
    if (!contactEmail.trim()) errors.contactEmail = "Email address is required.";
    if (!contactPhone.trim()) errors.contactPhone = "Contact phone number is required.";
    if (!issueDate) errors.issueDate = "Challan issue date is required.";
    if (!description.trim() || description.trim().length < 10) {
      errors.description = "Please provide an explanation of at least 10 characters.";
    }

    // Vehicle photo is compulsory (front image or back image of vehicle)
    const hasVehiclePhoto = uploadedFiles.some(
      (f) => f.evidenceType === "vehicle_front" || f.evidenceType === "vehicle_back"
    );
    if (!hasVehiclePhoto) {
      errors.evidence = "Vehicle Photo (Front Image or Back Image of Vehicle) is compulsory.";
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
        owner_name: ownerName.trim(),
        vehicle_type: vehicleType,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
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
          evidence_type: f.evidenceType,
          file_data: f.dataUrl,
        })),
      };

      const result = await challanService.create(payload);
      setShowPreviewModal(false);
      setSubmissionSuccess(result);
      // Reset form
      setChallanNumber("");
      setVehicleNumber("");
      setOwnerName("");
      setVehicleType("two_wheeler");
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
          {/* SECTION 1: Vehicle & Challan Particulars */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "var(--teal)", color: "white", borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>1</span>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
                Vehicle & Challan Particulars
              </h3>
            </div>

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

              {/* Owner Name as per RC */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Owner Name (as per RC) *
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar Sharma"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: fieldErrors.ownerName ? "1px solid var(--error)" : "1px solid var(--border)",
                    fontSize: 13,
                  }}
                />
                {fieldErrors.ownerName && (
                  <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.ownerName}</span>
                )}
              </div>

              {/* Vehicle Type */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: fieldErrors.vehicleType ? "1px solid var(--error)" : "1px solid var(--border)",
                    fontSize: 13,
                    background: "white",
                  }}
                >
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.vehicleType && (
                  <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.vehicleType}</span>
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
            </div>
          </div>

          {/* SECTION 2: Citizen / Applicant Contact Information */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "var(--teal)", color: "white", borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>2</span>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
                Applicant & Contact Details
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your full name"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: fieldErrors.contactName ? "1px solid var(--error)" : "1px solid var(--border)",
                    fontSize: 13,
                  }}
                />
                {fieldErrors.contactName && (
                  <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.contactName}</span>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: fieldErrors.contactEmail ? "1px solid var(--error)" : "1px solid var(--border)",
                    fontSize: 13,
                  }}
                />
                {fieldErrors.contactEmail && (
                  <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.contactEmail}</span>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: fieldErrors.contactPhone ? "1px solid var(--error)" : "1px solid var(--border)",
                    fontSize: 13,
                  }}
                />
                {fieldErrors.contactPhone && (
                  <span style={{ color: "var(--error)", fontSize: 11 }}>{fieldErrors.contactPhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Dispute Reason & Explanation */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: "var(--teal)", color: "white", borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>3</span>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
                Dispute Reason & Justification
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              {/* Dispute Reason */}
              <div>
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
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                  Detailed Explanation & Justification *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain clearly why this challan is disputed (e.g. vehicle was parked in another city, incorrect camera OCR capture, registration mismatch, already paid on portal)..."
                  style={{
                    width: "100%",
                    minHeight: 90,
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
            </div>
          </div>

          {/* SECTION 4: Categorized Supporting Evidence */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "var(--teal)", color: "white", borderRadius: "50%", width: 22, height: 22, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>4</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 700 }}>
                  Supporting Evidence & Document Upload
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 700 }}>
                Multiple images & PDF supported
              </span>
            </div>

            {/* Compulsory Evidence Rule Banner */}
            <div
              style={{
                background: "#f0f8f7",
                border: "1px solid #c7ece7",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "#154d45",
                lineHeight: 1.5,
              }}
            >
              <div>
                <strong>📸 Compulsory Document:</strong> Front Image or Back Image of the vehicle is <strong>strictly required</strong> to verify vehicle make, model, and registration plate.
              </div>
              <div style={{ marginTop: 4, color: "#3e6e66", fontSize: 11 }}>
                📄 Optional Documents: RC Book Copy, Payment Proof / Receipt, Aadhar Card, Toll Slips, or any other supporting proof.
              </div>
            </div>

            {fieldErrors.evidence && (
              <div style={{ background: "#fff5f5", border: "1px solid var(--error)", color: "var(--error)", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                ⚠️ {fieldErrors.evidence}
              </div>
            )}

            {/* Select Evidence Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 6, color: "var(--navy)" }}>
                Select Evidence Type to Upload:
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EVIDENCE_TYPE_OPTIONS.map((opt) => {
                  const isSelected = selectedEvidenceType === opt.value;
                  const countForType = uploadedFiles.filter((f) => f.evidenceType === opt.value).length;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedEvidenceType(opt.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: isSelected ? "2px solid var(--teal)" : "1px solid var(--border)",
                        background: isSelected ? "#eaf6f4" : "white",
                        color: isSelected ? "var(--teal)" : "var(--navy)",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{opt.label}</span>
                      {opt.compulsory && (
                        <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                          Required
                        </span>
                      )}
                      {countForType > 0 && (
                        <span style={{ fontSize: 10, background: "var(--teal)", color: "white", borderRadius: "50%", width: 16, height: 16, display: "grid", placeItems: "center" }}>
                          {countForType}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drag & Drop / Upload Box */}
            <div
              style={{
                border: "2px dashed var(--teal)",
                borderRadius: 10,
                padding: 22,
                textAlign: "center",
                background: "#fafbf9",
                cursor: "pointer",
                transition: "background 0.2s ease",
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
              <Icon name="camera" size={30} />
              <p style={{ margin: "8px 0 2px", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
                Click to upload multiple images or documents for &ldquo;{EVIDENCE_TYPE_LABELS[selectedEvidenceType]}&rdquo;
              </p>
              <small style={{ color: "var(--muted)", fontSize: 11 }}>
                Supports JPG, PNG, WEBP, and PDF. Maximum 10MB per file. You can upload multiple files at once.
              </small>
            </div>

            {/* Uploaded Files Grid */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
                  Attached Files ({uploadedFiles.length}):
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {uploadedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: 8,
                        background: "white",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      }}
                    >
                      {f.type === "image" ? (
                        <img
                          src={f.previewUrl}
                          alt={f.name}
                          style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }}
                        />
                      ) : (
                        <div style={{ height: 90, display: "grid", placeItems: "center", background: "#f2f5f4", borderRadius: 6 }}>
                          <Icon name="file" size={26} />
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>PDF Document</span>
                        </div>
                      )}

                      <div style={{ marginTop: 6 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "var(--navy)",
                          }}
                          title={f.name}
                        >
                          {f.name}
                        </p>
                        <small style={{ color: "var(--muted)", fontSize: 10 }}>
                          {(f.size / 1024).toFixed(0)} KB
                        </small>

                        {/* Inline Evidence Type Selector */}
                        <div style={{ marginTop: 6 }}>
                          <select
                            value={f.evidenceType}
                            onChange={(e) => updateFileEvidenceType(idx, e.target.value)}
                            style={{
                              width: "100%",
                              fontSize: 10,
                              padding: "3px 4px",
                              borderRadius: 4,
                              border: "1px solid var(--border)",
                              background: f.evidenceType.startsWith("vehicle_") ? "#eaf6f4" : "#fbfbfb",
                              fontWeight: f.evidenceType.startsWith("vehicle_") ? 700 : 500,
                              color: f.evidenceType.startsWith("vehicle_") ? "var(--teal)" : "#333",
                            }}
                          >
                            {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx, false);
                        }}
                        title="Remove file"
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,0.65)",
                          color: "white",
                          border: 0,
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                          fontSize: 11,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="submit" className="primary-button" style={{ minWidth: 180 }}>
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
              maxWidth: 620,
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)" }}>
              Confirm Challan Dispute Submission
            </h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 12 }}>
              Please review all particulars carefully before routing to the Transport Department.
            </p>

            <div style={{ background: "#f8faf9", borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderBottom: "1px solid #e5e9e7", paddingBottom: 10, marginBottom: 10 }}>
                <div><strong>Challan Number:</strong> {challanNumber.toUpperCase()}</div>
                <div><strong>Vehicle Number:</strong> {vehicleNumber.toUpperCase()}</div>
                <div><strong>Owner as per RC:</strong> {ownerName}</div>
                <div>
                  <strong>Vehicle Type:</strong>{" "}
                  {VEHICLE_TYPE_OPTIONS.find((v) => v.value === vehicleType)?.label || vehicleType}
                </div>
                <div><strong>Issue Date:</strong> {issueDate}</div>
                {issuingAuthority && <div><strong>Authority:</strong> {issuingAuthority}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderBottom: "1px solid #e5e9e7", paddingBottom: 10, marginBottom: 10 }}>
                <div><strong>Applicant Name:</strong> {contactName}</div>
                <div><strong>Contact Phone:</strong> {contactPhone}</div>
                <div style={{ gridColumn: "span 2" }}><strong>Email Address:</strong> {contactEmail}</div>
              </div>

              <div>
                <strong>Dispute Reason:</strong> {CHALLAN_REASON_LABELS[disputeReason]}
              </div>

              <div style={{ marginTop: 8 }}>
                <strong>Explanation:</strong>
                <p style={{ margin: "4px 0 0", color: "#333", whiteSpace: "pre-wrap" }}>{description}</p>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e9e7" }}>
                <strong>Attached Evidence ({uploadedFiles.length}):</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {uploadedFiles.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        background: f.evidenceType.startsWith("vehicle_") ? "#eaf6f4" : "#eee",
                        color: f.evidenceType.startsWith("vehicle_") ? "var(--teal)" : "#333",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {EVIDENCE_TYPE_LABELS[f.evidenceType] || f.evidenceType}: {f.name}
                    </span>
                  ))}
                </div>
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
              {selectedDispute.owner_name && <div><strong>Owner as per RC:</strong> {selectedDispute.owner_name}</div>}
              {selectedDispute.vehicle_type && (
                <div>
                  <strong>Vehicle Type:</strong>{" "}
                  {VEHICLE_TYPE_OPTIONS.find((v) => v.value === selectedDispute.vehicle_type)?.label || selectedDispute.vehicle_type}
                </div>
              )}
              <div><strong>Issue Date:</strong> {new Date(selectedDispute.issue_date).toLocaleDateString()}</div>
              <div><strong>Authority:</strong> {selectedDispute.issuing_authority || "Traffic Enforcement"}</div>
              <div><strong>Dispute Reason:</strong> {CHALLAN_REASON_LABELS[selectedDispute.dispute_reason]}</div>
              {(selectedDispute.contact_name || selectedDispute.citizen_name) && (
                <div><strong>Applicant:</strong> {selectedDispute.contact_name || selectedDispute.citizen_name}</div>
              )}
              {(selectedDispute.contact_phone || selectedDispute.citizen_phone) && (
                <div><strong>Contact Phone:</strong> {selectedDispute.contact_phone || selectedDispute.citizen_phone}</div>
              )}
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
                          {EVIDENCE_TYPE_LABELS[ev.evidence_type || ""] || ev.evidence_type || "Evidence"}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "var(--navy)",
                        }}
                        title={ev.original_filename}
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
