import React, { useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import LocationPickerMap from "../../components/map/LocationPickerMap";
import { usePreferences } from "../../hooks/usePreferences";
import { categoryService, complaintService } from "../../services/services";
import { predictPriority, PROBLEM_TYPES } from "../../utils/priorityPredictor";
import type { Category } from "../../types";

interface EvidenceItem {
  id: string;
  file: File;
  preview: string;
}

export default function ReportFlow({
  close,
  onSuccess,
  openDetail,
  goToComplaints,
}: {
  close: () => void;
  onSuccess?: (ref: string, id: number) => void;
  openDetail?: (id: number) => void;
  goToComplaints?: () => void;
}) {
  const { t } = usePreferences();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("General");
  const [problemType, setProblemType] = useState("");
  const [otherText, setOtherText] = useState("");
  const [predictedPriority, setPredictedPriority] = useState("medium");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  // Citizen Contact Details
  const [contactName, setContactName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.full_name || "";
    } catch { return ""; }
  });
  const [contactEmail, setContactEmail] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.email || "";
    } catch { return ""; }
  });
  const [contactPhone, setContactPhone] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.phone || "";
    } catch { return ""; }
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    location_address: "",
    location_landmark: "",
    location_lat: null as number | null,
    location_lng: null as number | null,
  });

  const isOther = categoryName.toLowerCase().includes("other");
  const availableProblemTypes = PROBLEM_TYPES[categoryName.toLowerCase()] ?? [];

  // Auto-predict priority whenever relevant fields change
  useEffect(() => {
    const effectiveDesc = isOther ? otherText : form.description;
    setPredictedPriority(predictPriority(form.title, effectiveDesc, problemType));
  }, [form.title, form.description, otherText, problemType, isOther]);

  const steps = [
    t("step_category", "Category"),
    t("step_evidence", "Evidence"),
    t("step_location", "Location"),
    t("step_details", "Details"),
    t("step_review", "Review"),
  ];
  const categoryIcons: Record<string, IconName> = {
    "road": "road", "trash": "trash", "water": "water", "light": "light", "park": "park",
    "building": "building", "camera": "camera",
  };

  useEffect(() => {
    categoryService.list().then(setCategories).catch(() => {});
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      evidenceItems.forEach(item => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, [evidenceItems]);

  const next = () => (step < 5 ? setStep(step + 1) : handleSubmit());

  const handleSubmit = async () => {
    const effectiveDesc = isOther ? otherText : form.description;
    const effectiveTitle = isOther
      ? (otherText.slice(0, 60) || "Other Civic Issue")
      : form.title;
    if (!effectiveTitle || !effectiveDesc) {
      setError(isOther ? "Please describe your issue." : "Title and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fullDescription = problemType
        ? `[${problemType}] ${effectiveDesc}`
        : effectiveDesc;
      const complaint = await complaintService.create({
        title: effectiveTitle,
        description: fullDescription,
        category_id: category ?? undefined,
        location_address: form.location_address || undefined,
        location_landmark: form.location_landmark || undefined,
        location_lat: form.location_lat != null ? form.location_lat : undefined,
        location_lng: form.location_lng != null ? form.location_lng : undefined,
        priority: predictedPriority,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });

      // Upload all evidence attachments
      if (evidenceItems.length > 0) {
        for (const item of evidenceItems) {
          try {
            await complaintService.uploadAttachment(complaint.id, item.file, setUploadProgress);
          } catch (uploadErr) {
            console.error("Failed to upload evidence item:", uploadErr);
          }
        }
      }

      setReferenceNumber(complaint.reference_number);
      setCreatedId(complaint.id);
      setSubmitted(true);
      onSuccess?.(complaint.reference_number, complaint.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: EvidenceItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = URL.createObjectURL(file);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview,
      });
    }
    setEvidenceItems(prev => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeEvidence = (idToRemove: string) => {
    setEvidenceItems(prev => {
      const item = prev.find(x => x.id === idToRemove);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(x => x.id !== idToRemove);
    });
  };

  const copyRef = () => navigator.clipboard.writeText(referenceNumber).catch(() => {});

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={close}></div>
      <section className="report-modal" role="dialog" aria-modal="true" aria-label="Report a problem">
        <header>
          <div>
            <span className="eyebrow">{t("new_complaint_eyebrow", "NEW COMPLAINT")}</span>
            <h2>{submitted ? t("complaint_submitted_title", "Complaint submitted") : t("report_modal_title", "Report a problem")}</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        {!submitted ? (
          <>
            <div className="stepper">
              {steps.map((s, i) => (
                <div className={i + 1 === step ? "active" : i + 1 < step ? "done" : ""} key={s}>
                  <span>{i + 1 < step ? <Icon name="check" size={13} /> : i + 1}</span>
                  <small>{s}</small>
                </div>
              ))}
            </div>
            <div className="form-body">
              {step === 1 && (
                <div className="form-step">
                  <h3>{t("cat_step_title", "What would you like to report?")}</h3>
                  <p>{t("cat_step_desc", "Choose the category that best matches the issue.")}</p>
                  <div className="category-grid">
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCategory(c.id);
                          setCategoryName(c.name);
                          setProblemType("");
                          setOtherText("");
                        }}
                        className={category === c.id ? "selected" : ""}
                      >
                        <Icon name={(categoryIcons[c.icon || ""] || "building") as IconName} />
                        <span>{c.name}</span>
                        {category === c.id && <i><Icon name="check" size={13} /></i>}
                      </button>
                    ))}
                    {categories.length === 0 && <p style={{ color: "var(--muted)", fontSize: 12 }}>Loading categories...</p>}
                  </div>

                  {/* Other Civic Issue — free-text */}
                  {category !== null && isOther && (
                    <div className="problem-type-box" style={{ marginTop: 20 }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
                        {t("specify_issue", "Please specify your issue")}
                      </label>
                      <textarea
                        id="input-other-text"
                        value={otherText}
                        onChange={e => setOtherText(e.target.value)}
                        placeholder={t("specify_placeholder", "Please specify your issue…")}
                        rows={4}
                        style={{ width: "100%", resize: "vertical" }}
                      />
                    </div>
                  )}

                  {/* Specific category — Problem Type selector */}
                  {category !== null && !isOther && availableProblemTypes.length > 0 && (
                    <div className="problem-type-box" style={{ marginTop: 20 }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
                        {t("problem_type", "Problem Type")}
                      </label>
                      <div className="problem-type-grid">
                        {availableProblemTypes.map(pt => (
                          <button
                            key={pt}
                            type="button"
                            className={`problem-type-chip ${problemType === pt ? "selected" : ""}`}
                            onClick={() => setProblemType(prev => (prev === pt ? "" : pt))}
                          >
                            {problemType === pt && <Icon name="check" size={12} />}
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="form-step">
                  <h3>{t("evidence_title", "Add a photo or video")}</h3>
                  <p>{t("evidence_desc", "Clear evidence helps the civic team assess the issue faster. Preview and remove photos anytime.")}</p>

                  {/* Upload Dropzone */}
                  {evidenceItems.length === 0 ? (
                    <label className="upload-zone" htmlFor="file-upload" style={{ cursor: "pointer" }}>
                      <span><Icon name="camera" size={30} /></span>
                      <strong>{t("upload_hint", "Take a photo or upload files")}</strong>
                      <small>{t("upload_subhint", "JPG, PNG or MP4 · Up to 20 MB each")}</small>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                    </label>
                  ) : (
                    <div className="evidence-preview-container">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
                        {evidenceItems.map(item => (
                          <div
                            key={item.id}
                            style={{
                              position: "relative",
                              borderRadius: 10,
                              overflow: "hidden",
                              border: "2px solid #a3d9cb",
                              background: "#f0f7f4",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            }}
                          >
                            {item.file.type.startsWith("image/") ? (
                              <img
                                src={item.preview}
                                alt={item.file.name}
                                style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
                              />
                            ) : (
                              <div style={{ height: 110, display: "grid", placeItems: "center", background: "#e8f2ef", color: "var(--navy)" }}>
                                <Icon name="camera" size={28} />
                                <span style={{ fontSize: 9, fontWeight: 700 }}>Video file</span>
                              </div>
                            )}
                            <div style={{ padding: "6px 8px", background: "white", borderTop: "1px solid var(--border)" }}>
                              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--navy)" }} title={item.file.name}>
                                {item.file.name}
                              </p>
                              <small style={{ color: "var(--muted)", fontSize: 9 }}>
                                {(item.file.size / 1024 / 1024).toFixed(1)} MB
                              </small>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEvidence(item.id)}
                              aria-label="Remove uploaded image"
                              title="Remove image"
                              style={{
                                position: "absolute",
                                top: 5,
                                right: 5,
                                background: "#dc2626",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: 24,
                                height: 24,
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                              }}
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <label
                          htmlFor="file-upload-more"
                          className="secondary-button"
                          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "7px 14px", height: "auto" }}
                        >
                          <Icon name="plus" size={13} /> Add more photos
                          <input
                            id="file-upload-more"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                          />
                        </label>
                        <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 700 }}>
                          ✓ {evidenceItems.length} file{evidenceItems.length > 1 ? "s" : ""} attached
                        </span>
                      </div>
                    </div>
                  )}

                  <button className="skip-link" onClick={next} style={{ marginTop: 16 }}>
                    {evidenceItems.length > 0 ? "Continue with attached photos" : t("skip_media", "Continue without media")}
                  </button>
                </div>
              )}
              {step === 3 && (
                <div className="form-step">
                  <h3>{t("location_title", "Where is the problem?")}</h3>
                  <p>{t("location_desc", "Pick your exact spot on the interactive map or use current location.")}</p>
                  
                  <LocationPickerMap
                    initialLat={form.location_lat}
                    initialLng={form.location_lng}
                    initialAddress={form.location_address}
                    onLocationSelect={({ lat, lng, address }) => {
                      setForm(f => ({
                        ...f,
                        location_lat: lat || null,
                        location_lng: lng || null,
                        location_address: address ? address : f.location_address,
                      }));
                    }}
                  />

                  <div style={{ marginTop: 12 }}>
                    <label>
                      {t("address_label", "Address or landmark")}
                      <input
                        id="input-complaint-address"
                        placeholder={t("address_placeholder", "e.g. 12th Main Road, Indiranagar")}
                        value={form.location_address}
                        onChange={e => setForm(f => ({ ...f, location_address: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="form-step">
                  <h3>{t("details_title", "Tell us what happened")}</h3>
                  <p>{t("details_desc", "Include anything that may help the team respond.")}</p>
                  {isOther ? (
                    <>
                      <label>Issue summary<input id="input-complaint-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary of the issue" /></label>
                      <label>Additional details<textarea id="input-complaint-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Any extra details…" /></label>
                    </>
                  ) : (
                    <>
                      <label>{t("title_label", "Complaint title")}<input id="input-complaint-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("title_placeholder", "Brief summary of the issue")} /></label>
                      <label>{t("desc_label", "Description")}<textarea id="input-complaint-desc" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("desc_placeholder", "Describe the problem in detail...")} /></label>
                    </>
                  )}
                  <label>{t("landmark_label", "Nearby landmark")}<input id="input-complaint-landmark" value={form.location_landmark} onChange={e => setForm(f => ({ ...f, location_landmark: e.target.value }))} placeholder={t("landmark_placeholder", "Optional")} /></label>

                  {/* Citizen Contact Details Fields */}
                  <div style={{ marginTop: 16, marginBottom: 16, padding: "14px 16px", background: "#f8fbfa", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <Icon name="shield" size={16} />
                      <strong style={{ fontSize: 12, color: "var(--navy)" }}>Citizen Contact Details</strong>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ margin: 0 }}>
                        Full Name *
                        <input
                          id="input-contact-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                          placeholder="e.g. Aditya Sharma"
                        />
                      </label>
                      <label style={{ margin: 0 }}>
                        Phone Number *
                        <input
                          id="input-contact-phone"
                          type="tel"
                          required
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </label>
                    </div>
                    <label style={{ marginTop: 12, marginBottom: 0 }}>
                      Email Address
                      <input
                        id="input-contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="e.g. aditya@example.com"
                      />
                    </label>
                  </div>

                  <div className="priority-predict-banner" data-priority={predictedPriority}>
                    <span className="priority-predict-label">{t("auto_priority", "Auto-detected priority")}</span>
                    <span className="priority-predict-badge">
                      {predictedPriority === "high" || predictedPriority === "critical" ? "🔴" : predictedPriority === "medium" ? "🟡" : "🟢"}
                      {" "}{predictedPriority.charAt(0).toUpperCase() + predictedPriority.slice(1)}
                    </span>
                    <small>{t("priority_predicted_desc", "Predicted based on your complaint details")}</small>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="form-step review-step">
                  <h3>{t("review_title", "Review your complaint")}</h3>
                  <p>{t("review_desc", "Make sure everything looks right before submitting.")}</p>
                  <div className="review-card">
                    <div><span>{t("review_category", "Category")}</span><strong>{categoryName}</strong></div>
                    {problemType && <div><span>{t("problem_type", "Problem Type")}</span><strong>{problemType}</strong></div>}
                    <div>
                      <span>{t("review_location", "Location")}</span>
                      <strong>
                        {form.location_address || "Not specified"}
                        {form.location_lat != null && form.location_lng != null && (
                          <small style={{ display: "block", color: "var(--teal)", fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                            📍 GPS: {form.location_lat.toFixed(5)}, {form.location_lng.toFixed(5)}
                          </small>
                        )}
                      </strong>
                    </div>
                    <div><span>{t("title_label", "Title")}</span><strong>{isOther ? (otherText.slice(0, 60) || "Other Civic Issue") : (form.title || "—")}</strong></div>
                    <div><span>{t("desc_label", "Description")}</span><strong>{isOther ? otherText : (form.description || "—")}</strong></div>
                    <div>
                      <span>Contact Info</span>
                      <strong>
                        {contactName || "—"} {contactPhone ? `· ${contactPhone}` : ""} {contactEmail ? `· ${contactEmail}` : ""}
                      </strong>
                    </div>
                    {evidenceItems.length > 0 && (
                      <div>
                        <span>Evidence ({evidenceItems.length})</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {evidenceItems.map(item => (
                            <img
                              key={item.id}
                              src={item.preview}
                              alt={item.file.name}
                              style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <span>{t("review_priority", "Priority")}</span>
                      <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className={`priority-dot priority-${predictedPriority}`}></span>
                        {predictedPriority.charAt(0).toUpperCase() + predictedPriority.slice(1)}
                        <small style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>Auto-detected</small>
                      </strong>
                    </div>
                  </div>
                  <div className="privacy-box"><Icon name="shield" /><p>{t("privacy_box_desc", "Your contact details stay private. Only the complaint location and public updates may be visible to others.")}</p></div>
                </div>
              )}
              {error && <ErrorBanner message={error} />}
            </div>
            <footer>
              <button id="btn-report-cancel" className="text-button" onClick={() => (step > 1 ? setStep(step - 1) : close())}>{step > 1 ? t("btn_back", "Back") : t("btn_cancel", "Cancel")}</button>
              <button
                id="btn-report-next"
                className="primary-button"
                onClick={next}
                disabled={loading}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 160 }}
              >
                {loading && <span className="btn-spinner" />}
                <span>
                  {loading
                    ? (step === 5 ? "Submitting complaint..." : "Please wait...")
                    : (step === 5 ? t("submit_btn", "Submit complaint") : t("btn_continue", "Continue"))}
                </span>
                {!loading && <Icon name="arrow" />}
              </button>
            </footer>
          </>
        ) : (
          <div className="success-state">
            <div className="success-mark"><Icon name="check" size={36} /></div>
            <span className="eyebrow">{t("submitted_eyebrow", "SUCCESSFULLY SUBMITTED")}</span>
            <h3>{t("submitted_headline", "Your voice is now in motion.")}</h3>
            <p>{t("submitted_subheadline", "We've sent your report to the ward office. You'll receive an update when it's reviewed.")}</p>
            <div className="reference">
              <span>{t("ref_number", "Complaint reference")}</span>
              <strong>{referenceNumber}</strong>
              <button onClick={copyRef}>{t("btn_copy", "Copy")}</button>
            </div>
            <div className="success-actions">
              <button type="button" className="secondary-button" onClick={close}>{t("btn_return_home", "Return home")}</button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  close();
                  if (createdId && openDetail) {
                    openDetail(createdId);
                  } else if (goToComplaints) {
                    goToComplaints();
                  }
                }}
              >
                {t("btn_view_complaint", "View complaint")} <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
