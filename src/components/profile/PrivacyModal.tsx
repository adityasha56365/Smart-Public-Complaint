import React, { useState } from "react";
import { PrivacySettings } from "../../hooks/usePreferences";
import { useAuth } from "../../hooks/useAuth";

interface PrivacyModalProps {
  settings: PrivacySettings;
  onUpdate: (patch: Partial<PrivacySettings>) => void;
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function PrivacyModal({
  settings,
  onUpdate,
  onClose,
  onToast,
}: PrivacyModalProps) {
  const { user } = useAuth();
  const [local, setLocal] = useState<PrivacySettings>({ ...settings });
  const [downloading, setDownloading] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  const toggle = (key: keyof PrivacySettings) => {
    setLocal(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onUpdate(local);
    onToast("Privacy and consent settings updated successfully!", "success");
    onClose();
  };

  const handleExportData = () => {
    setDownloading(true);
    try {
      const exportObject = {
        title: "Civicly Citizen Data Export",
        generatedAt: new Date().toISOString(),
        user: {
          id: user?.id,
          full_name: user?.full_name,
          email: user?.email,
          phone: user?.phone,
          role: user?.role,
        },
        preferences: {
          privacy: local,
          exportedBy: "Citizen Portal Settings",
        },
        dataRightsNotice: "Under the Digital Personal Data Protection Act and Municipal Governance Rules, citizens are entitled to an export of personal grievances and interaction history.",
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `civicly_data_export_${user?.id || "user"}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onToast("Data export file downloaded successfully!", "success");
    } catch {
      onToast("Failed to compile export data.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    onToast("Temporary session cache cleared successfully.", "success");
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">DATA PROTECTION</span>
            <h2 id="privacy-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Privacy &amp; Consent
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          <div style={{ background: "#edf7f5", borderRadius: "12px", padding: "14px 16px", marginBottom: "18px", border: "1px solid #d1eae3", display: "flex", gap: "12px" }}>
            <span style={{ color: "var(--teal)", marginTop: "2px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/></svg>
            </span>
            <div>
              <strong style={{ fontSize: "12.5px", color: "var(--navy)", display: "block" }}>Citizen Privacy Safeguards</strong>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#2d6157", lineHeight: 1.45 }}>
                Civicly complies with Municipal Public Redressal regulations. Your personal identity is never sold or shared with commercial entities.
              </p>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div style={{ marginBottom: "22px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Visibility &amp; Anonymity Controls
            </span>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Anonymous Complaint Filing</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Hide your name and telephone from public community grievance cards.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.anonymousComplaints ? "active" : ""}`}
                onClick={() => toggle("anonymousComplaints")}
                aria-pressed={local.anonymousComplaints}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Precise GPS Geolocation</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Share pinpoint coordinates with municipal engineers for faster dispatch.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.preciseLocation ? "active" : ""}`}
                onClick={() => toggle("preciseLocation")}
                aria-pressed={local.preciseLocation}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Public Resolution Gallery</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Allow resolved before/after site photos to appear in civic showcase.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.publicGallery ? "active" : ""}`}
                onClick={() => toggle("publicGallery")}
                aria-pressed={local.publicGallery}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Two-Factor Security Verification</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Require confirmation PIN before updating sensitive contact credentials.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.twoFactor ? "active" : ""}`}
                onClick={() => toggle("twoFactor")}
                aria-pressed={local.twoFactor}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Data Portability & Rights */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Data Rights &amp; Management
            </span>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleExportData}
                disabled={downloading}
                style={{ flex: 1, minWidth: "180px", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>
                {downloading ? "Exporting..." : "Download my data (JSON)"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleClearCache}
                style={{ flex: 1, minWidth: "180px", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Clear local cache
              </button>
            </div>

            <div style={{ padding: "14px", border: "1px solid #fee2e2", background: "#fef8f8", borderRadius: "12px" }}>
              <strong style={{ fontSize: "12.5px", color: "var(--error)", display: "block" }}>
                Account Deletion &amp; Data Erasure
              </strong>
              <p style={{ fontSize: "11px", color: "#8a3c3c", margin: "4px 0 10px", lineHeight: 1.45 }}>
                Under municipal record-keeping rules, closed grievances are retained in an anonymized state for 3 years for civil audit and public scrutiny.
              </p>
              {!showDeletePrompt ? (
                <button
                  type="button"
                  onClick={() => setShowDeletePrompt(true)}
                  style={{ border: "1px solid #e28e8e", background: "white", color: "var(--error)", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: 700 }}
                >
                  Request account deactivation
                </button>
              ) : (
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #fed7d7" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 600, color: "var(--error)" }}>
                    Are you sure? You will not be able to track ongoing complaints once deactivated.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeletePrompt(false);
                        onToast("Account deactivation request logged with municipal grievance cell.", "success");
                      }}
                      style={{ border: 0, background: "var(--error)", color: "white", borderRadius: "6px", padding: "5px 10px", fontSize: "10.5px", fontWeight: 700 }}
                    >
                      Confirm Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeletePrompt(false)}
                      style={{ border: "1px solid #cbd5e1", background: "white", color: "var(--muted)", borderRadius: "6px", padding: "5px 10px", fontSize: "10.5px", fontWeight: 700 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save settings
          </button>
        </footer>
      </div>
    </div>
  );
}
