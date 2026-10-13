import React, { useState } from "react";
import { NotificationSettings } from "../../hooks/usePreferences";

interface NotificationModalProps {
  settings: NotificationSettings;
  onUpdate: (patch: Partial<NotificationSettings>) => void;
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function NotificationModal({
  settings,
  onUpdate,
  onClose,
  onToast,
}: NotificationModalProps) {
  const [local, setLocal] = useState<NotificationSettings>({ ...settings });
  const [testSent, setTestSent] = useState(false);

  const toggle = (key: keyof NotificationSettings) => {
    setLocal(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onUpdate(local);
    onToast("Notification preferences updated successfully!", "success");
    onClose();
  };

  const handleTestNotification = () => {
    setTestSent(true);
    onToast("🔔 Test notification received: 'Water supply pipeline repaired in Ward 4.'", "success");
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="notif-modal-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">COMMUNICATION</span>
            <h2 id="notif-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Notification Preferences
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          {testSent && (
            <div style={{ background: "#edf7f5", border: "1px solid #c7e8df", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "var(--teal)", fontSize: "18px" }}>🔔</span>
              <div>
                <strong style={{ fontSize: "12px", color: "var(--navy)", display: "block" }}>Test Alert Delivered</strong>
                <small style={{ fontSize: "11px", color: "#2f6b5f" }}>Push delivery channel responded with latency 42ms.</small>
              </div>
            </div>
          )}

          {/* Delivery Channels */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Delivery Channels
            </span>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Push Notifications</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Receive real-time alerts in browser and mobile.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.push ? "active" : ""}`}
                onClick={() => toggle("push")}
                aria-pressed={local.push}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Email Digests</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Weekly resolution summaries and official escalation notices.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.email ? "active" : ""}`}
                onClick={() => toggle("email")}
                aria-pressed={local.email}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>SMS Urgent Alerts</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>SMS messages for emergency or high-priority citizen hazards.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.sms ? "active" : ""}`}
                onClick={() => toggle("sms")}
                aria-pressed={local.sms}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Grievance Updates */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Complaint &amp; Civic Activities
            </span>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Status Updates</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Notifies when your grievance is assigned, in-progress, or resolved.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.statusUpdates ? "active" : ""}`}
                onClick={() => toggle("statusUpdates")}
                aria-pressed={local.statusUpdates}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Officer Inquiries</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Alerts when a designated municipal officer asks for landmark clarification.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.officerInquiries ? "active" : ""}`}
                onClick={() => toggle("officerInquiries")}
                aria-pressed={local.officerInquiries}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Civic Broadcasts</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Road maintenance schedules and sanitation drive announcements.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.announcements ? "active" : ""}`}
                onClick={() => toggle("announcements")}
                aria-pressed={local.announcements}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Audio Alert Chime</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Play subtle audible chime on new notifications.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${local.sound ? "active" : ""}`}
                onClick={() => toggle("sound")}
                aria-pressed={local.sound}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong style={{ fontSize: "12.5px", color: "var(--navy)" }}>Test Push Alert Delivery</strong>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>Verify your browser and audio notification channels.</small>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleTestNotification}
              style={{ minHeight: "34px", padding: "0 12px", fontSize: "11px" }}
            >
              Send test alert
            </button>
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save preferences
          </button>
        </footer>
      </div>
    </div>
  );
}
