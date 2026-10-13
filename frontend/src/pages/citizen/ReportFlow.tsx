import React, { useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import LocationPickerMap from "../../components/map/LocationPickerMap";
import { categoryService, complaintService } from "../../services/services";
import { predictPriority, PROBLEM_TYPES } from "../../utils/priorityPredictor";
import type { Category } from "../../types";

export default function ReportFlow({ close, onSuccess }: { close: () => void; onSuccess?: (ref: string, id: number) => void }) {
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
  const [, setCreatedId] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const steps = ["Category", "Evidence", "Location", "Details", "Review"];
  const categoryIcons: Record<string, IconName> = {
    "road": "road", "trash": "trash", "water": "water", "light": "light", "park": "park",
    "building": "building", "camera": "camera",
  };

  useEffect(() => {
    categoryService.list().then(setCategories).catch(() => {});
  }, []);

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
      });
      // Upload file if provided
      if (uploadedFile) {
        try {
          await complaintService.uploadAttachment(complaint.id, uploadedFile, setUploadProgress);
        } catch {
          // Non-fatal — complaint is saved even if upload fails
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
    const f = e.target.files?.[0];
    if (f) setUploadedFile(f);
  };

  const copyRef = () => navigator.clipboard.writeText(referenceNumber).catch(() => {});

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={close}></div>
      <section className="report-modal" role="dialog" aria-modal="true" aria-label="Report a problem">
        <header>
          <div>
            <span className="eyebrow">NEW COMPLAINT</span>
            <h2>{submitted ? "Complaint submitted" : "Report a problem"}</h2>
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
                  <h3>What would you like to report?</h3>
                  <p>Choose the category that best matches the issue.</p>
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
                        Please specify your issue
                      </label>
                      <textarea
                        id="input-other-text"
                        value={otherText}
                        onChange={e => setOtherText(e.target.value)}
                        placeholder="Please specify your issue…"
                        rows={4}
                        style={{ width: "100%", resize: "vertical" }}
                      />
                    </div>
                  )}

                  {/* Specific category — Problem Type selector */}
                  {category !== null && !isOther && availableProblemTypes.length > 0 && (
                    <div className="problem-type-box" style={{ marginTop: 20 }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: "var(--navy)", display: "block", marginBottom: 6 }}>
                        Problem Type
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
                  <h3>Add a photo or video</h3>
                  <p>Clear evidence helps the civic team assess the issue faster.</p>
                  <label className="upload-zone" htmlFor="file-upload">
                    <span><Icon name="camera" size={30} /></span>
                    <strong>{uploadedFile ? uploadedFile.name : "Take a photo or upload a file"}</strong>
                    <small>JPG, PNG or MP4 · Up to 20 MB</small>
                    <input id="file-upload" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" style={{ display: "none" }} onChange={handleFileChange} />
                  </label>
                  {uploadedFile && <p style={{ fontSize: 11, color: "var(--success)", marginTop: 8 }}>✓ {uploadedFile.name} ready to upload</p>}
                  <button className="skip-link" onClick={next}>Continue without media</button>
                </div>
              )}
              {step === 3 && (
                <div className="form-step">
                  <h3>Where is the problem?</h3>
                  <p>Pick your exact spot on the interactive map or use current location.</p>
                  
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
                      Address or landmark
                      <input
                        id="input-complaint-address"
                        placeholder="e.g. 12th Main Road, Indiranagar"
                        value={form.location_address}
                        onChange={e => setForm(f => ({ ...f, location_address: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="form-step">
                  <h3>Tell us what happened</h3>
                  <p>Include anything that may help the team respond.</p>
                  {isOther ? (
                    <>
                      <label>Issue summary<input id="input-complaint-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary of the issue" /></label>
                      <label>Additional details<textarea id="input-complaint-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Any extra details…" /></label>
                    </>
                  ) : (
                    <>
                      <label>Complaint title<input id="input-complaint-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary of the issue" /></label>
                      <label>Description<textarea id="input-complaint-desc" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the problem in detail..." /></label>
                    </>
                  )}
                  <label>Nearby landmark<input id="input-complaint-landmark" value={form.location_landmark} onChange={e => setForm(f => ({ ...f, location_landmark: e.target.value }))} placeholder="Optional" /></label>
                  <div className="priority-predict-banner" data-priority={predictedPriority}>
                    <span className="priority-predict-label">Auto-detected priority</span>
                    <span className="priority-predict-badge">
                      {predictedPriority === "high" || predictedPriority === "critical" ? "🔴" : predictedPriority === "medium" ? "🟡" : "🟢"}
                      {" "}{predictedPriority.charAt(0).toUpperCase() + predictedPriority.slice(1)}
                    </span>
                    <small>Predicted based on your complaint details</small>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="form-step review-step">
                  <h3>Review your complaint</h3>
                  <p>Make sure everything looks right before submitting.</p>
                  <div className="review-card">
                    <div><span>Category</span><strong>{categoryName}</strong></div>
                    {problemType && <div><span>Problem Type</span><strong>{problemType}</strong></div>}
                    <div>
                      <span>Location</span>
                      <strong>
                        {form.location_address || "Not specified"}
                        {form.location_lat != null && form.location_lng != null && (
                          <small style={{ display: "block", color: "var(--teal)", fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                            📍 GPS: {form.location_lat.toFixed(5)}, {form.location_lng.toFixed(5)}
                          </small>
                        )}
                      </strong>
                    </div>
                    <div><span>Title</span><strong>{isOther ? (otherText.slice(0, 60) || "Other Civic Issue") : (form.title || "—")}</strong></div>
                    <div><span>Description</span><strong>{isOther ? otherText : (form.description || "—")}</strong></div>
                    <div>
                      <span>Priority</span>
                      <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className={`priority-dot priority-${predictedPriority}`}></span>
                        {predictedPriority.charAt(0).toUpperCase() + predictedPriority.slice(1)}
                        <small style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>Auto-detected</small>
                      </strong>
                    </div>
                  </div>
                  <div className="privacy-box"><Icon name="shield" /><p>Your contact details stay private. Only the complaint location and public updates may be visible to others.</p></div>
                </div>
              )}
              {error && <ErrorBanner message={error} />}
            </div>
            <footer>
              <button id="btn-report-cancel" className="text-button" onClick={() => (step > 1 ? setStep(step - 1) : close())}>{step > 1 ? "Back" : "Cancel"}</button>
              <button id="btn-report-next" className="primary-button" onClick={next} disabled={loading}>
                {loading ? <Spinner /> : step === 5 ? "Submit complaint" : "Continue"}
                {!loading && <Icon name="arrow" />}
              </button>
            </footer>
          </>
        ) : (
          <div className="success-state">
            <div className="success-mark"><Icon name="check" size={36} /></div>
            <span className="eyebrow">SUCCESSFULLY SUBMITTED</span>
            <h3>Your voice is now in motion.</h3>
            <p>We&apos;ve sent your report to the ward office. You&apos;ll receive an update when it&apos;s reviewed.</p>
            <div className="reference">
              <span>Complaint reference</span>
              <strong>{referenceNumber}</strong>
              <button onClick={copyRef}>Copy</button>
            </div>
            <div className="success-actions">
              <button className="secondary-button" onClick={close}>Return home</button>
              <button className="primary-button" onClick={() => { close(); }}>View complaint <Icon name="arrow" /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
