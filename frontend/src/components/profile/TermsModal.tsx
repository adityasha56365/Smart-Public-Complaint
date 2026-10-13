import React, { useState } from "react";

interface TermsModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function TermsModal({ onClose, onToast }: TermsModalProps) {
  const [activeTab, setActiveTab] = useState<"charter" | "terms" | "privacy" | "rules">("charter");

  const handlePrint = () => {
    window.print();
    onToast("Print preview triggered for Terms & Citizen Charter.");
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title" style={{ maxWidth: "680px" }}>
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">LEGAL &amp; STATUTORY COMPLIANCE</span>
            <h2 id="terms-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Terms, Policies &amp; Citizen Charter
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          {/* Navigation Tabs */}
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === "charter" ? "active" : ""}`}
              onClick={() => setActiveTab("charter")}
            >
              Citizen charter &amp; SLA
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "terms" ? "active" : ""}`}
              onClick={() => setActiveTab("terms")}
            >
              Terms of service
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => setActiveTab("privacy")}
            >
              Privacy policy
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "rules" ? "active" : ""}`}
              onClick={() => setActiveTab("rules")}
            >
              Grievance rules
            </button>
          </div>

          <div style={{ fontSize: "12px", lineHeight: "1.65", color: "#334155" }}>
            {activeTab === "charter" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--navy)" }}>
                  Municipal Citizen Charter &amp; Service Delivery Commitments
                </h4>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "11px" }}>
                  Effective Date: October 2026 • Mandated under Right to Public Services Legislation.
                </p>

                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: "16px" }}>
                  <strong style={{ display: "block", color: "var(--navy)", marginBottom: "6px" }}>Core Service Delivery Targets (SLA):</strong>
                  <ul style={{ margin: 0, paddingLeft: "18px" }}>
                    <li><strong>Hazardous Potholes &amp; Cave-ins:</strong> Temporary cordon in 4 hours; permanent repair in 48 hours.</li>
                    <li><strong>Drinking Water Pipeline Rupture:</strong> Isolation in 2 hours; restoration in 12 hours.</li>
                    <li><strong>Streetlight Blackouts:</strong> Bulb/circuit restoration in 72 hours.</li>
                    <li><strong>Solid Waste &amp; Overflowing Bins:</strong> Clearance within 24 hours of notification.</li>
                    <li><strong>Drainage Clogs &amp; Monsoon Overflow:</strong> Suction clearance in 12 hours.</li>
                  </ul>
                </div>

                <h4 style={{ margin: "16px 0 6px", fontSize: "13px", color: "var(--navy)" }}>Citizen Rights</h4>
                <p style={{ margin: 0 }}>
                  Every resident has the statutory right to obtain an immutable tracking number, review time-stamped geo-tagged photographic proof upon task closure, and escalate unresolved grievances to the Zonal Joint Commissioner.
                </p>
              </div>
            )}

            {activeTab === "terms" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--navy)" }}>
                  Terms of Service &amp; Platform Usage
                </h4>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "11px" }}>
                  Version 2.4 • Applicable to all registered citizen and officer accounts.
                </p>

                <p><strong>1. Account Authenticity:</strong> Users agree that contact details provided during registration are accurate to ensure verification and prevent frivolous grievance submissions.</p>

                <p><strong>2. Evidence Authenticity:</strong> Media uploaded as grievance attachments must represent genuine civic hazards observed in the field. Tampered or deceptive submissions may lead to account suspension.</p>

                <p><strong>3. Civil Decorum:</strong> Remarks, comments, and inquiries directed toward municipal field engineers must remain constructive and free of defamatory language.</p>

                <p><strong>4. Availability:</strong> The platform operates 24/7 with a 99.9% target uptime backed by resilient municipal cloud infrastructure.</p>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--navy)" }}>
                  Citizen Privacy &amp; Data Governance Policy
                </h4>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "11px" }}>
                  In accordance with the Digital Personal Data Protection Act (DPDP).
                </p>

                <p><strong>Data Minimization:</strong> We only collect information strictly required to dispatch civic resolution personnel (incident coordinates, category, and citizen contact for verification).</p>

                <p><strong>Masking on Public Displays:</strong> When complaints appear on public city dashboards, citizen phone numbers and email addresses are cryptographically redacted.</p>

                <p><strong>Zero Commercial Monetization:</strong> No citizen data or telemetry is shared with commercial marketing agencies.</p>

                <p><strong>Data Portability:</strong> Citizens can download their full grievance records at any time from the Privacy &amp; Consent panel.</p>
              </div>
            )}

            {activeTab === "rules" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--navy)" }}>
                  Grievance Redressal &amp; Dispute Escalation Rules
                </h4>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "11px" }}>
                  Municipal Administrative Code • Part IV (Public Works).
                </p>

                <p><strong>Stage 1 (Primary Response):</strong> Ward Junior Engineer must inspect and update status within 24 hours of ticket assignment.</p>

                <p><strong>Stage 2 (Supervisory Review):</strong> If resolution exceeds SLA, ticket automatically alerts the Executive Engineer with high-priority escalation flag.</p>

                <p><strong>Stage 3 (Reopening Rights):</strong> Citizens unsatisfied with resolution quality may reopen the case within 7 calendar days, attaching reason and updated photographs.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={handlePrint}
            style={{ marginRight: "auto" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
            Print copy
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            I understand &amp; accept
          </button>
        </footer>
      </div>
    </div>
  );
}
