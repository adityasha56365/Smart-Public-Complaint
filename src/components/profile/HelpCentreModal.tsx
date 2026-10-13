import React, { useState } from "react";

interface HelpCentreModalProps {
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

interface FAQItem {
  id: string;
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    id: "f1",
    q: "How do I lodge a new complaint or public grievance?",
    a: "Click the '+ Report issue' button in the sidebar or top banner. Select the issue category (e.g. Pothole, Streetlight, Garbage), pin your locality, describe the hazard with optional photos, and submit. You'll instantly receive a unique reference code.",
    category: "Filing",
  },
  {
    id: "f2",
    q: "What is the official resolution timeframe (SLA)?",
    a: "Standard civic issues are resolved between 24 hours to 7 days depending on priority: Critical road/water hazards within 24 hours, sanitation/waste within 48 hours, streetlights within 72 hours, and structural repairs within 7 days.",
    category: "SLA",
  },
  {
    id: "f3",
    q: "How can I track the live status of my grievance?",
    a: "Go to the 'Complaints' tab in the left navigation. Click any complaint to view the assigned municipal officer, inspection updates, internal notes, and photographic evidence of completion.",
    category: "Tracking",
  },
  {
    id: "f4",
    q: "Can I file grievances anonymously?",
    a: "Yes. In 'Privacy & consent' settings, turn on 'Anonymous Complaint Filing'. Your personal name and contact details will remain masked from public feeds while preserving your ability to track the ticket.",
    category: "Privacy",
  },
  {
    id: "f5",
    q: "What if a complaint is marked resolved but work is unfinished?",
    a: "You have 7 days from the resolution timestamp to click 'Reopen grievance' on the complaint details view. This automatically escalates the ticket to the Ward Supervisor for re-inspection.",
    category: "Escalation",
  },
  {
    id: "f6",
    q: "Which municipal departments are integrated with Civicly?",
    a: "Civicly currently routes tickets directly to Roads & Infrastructure, Water Supply & Sewerage, Solid Waste Management, Electricity & Street Lighting, Public Parks & Horticulture, and Health & Sanitation.",
    category: "Departments",
  },
];

const HELPLINES = [
  { name: "Municipal Control Room", number: "1913", desc: "Toll-free 24/7 civic grievances" },
  { name: "Integrated Emergency", number: "112", desc: "Police, Fire, and Ambulance" },
  { name: "Traffic Management Cell", number: "1095", desc: "Road obstacles & traffic hazards" },
  { name: "Women & Child Helpline", number: "1091", desc: "Immediate 24/7 safety assistance" },
  { name: "Water Supply Emergency", number: "1916", desc: "Contamination & pipeline bursts" },
];

export default function HelpCentreModal({ onClose, onToast }: HelpCentreModalProps) {
  const [activeTab, setActiveTab] = useState<"faqs" | "helplines" | "inquiry">("faqs");
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>("f1");

  // Inquiry form state
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("General Support");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);

  const filteredFaqs = FAQS.filter(
    f =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      onToast("Please complete the inquiry subject and description.", "error");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const ticketId = `TIC-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketCreated(ticketId);
      setSubmitting(false);
      onToast(`Support ticket ${ticketId} created successfully!`, "success");
      setSubject("");
      setMessage("");
    }, 600);
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">SUPPORT &amp; REDRESSAL</span>
            <h2 id="help-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Help Centre &amp; FAQs
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
              className={`modal-tab ${activeTab === "faqs" ? "active" : ""}`}
              onClick={() => setActiveTab("faqs")}
            >
              Frequently asked questions
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "helplines" ? "active" : ""}`}
              onClick={() => setActiveTab("helplines")}
            >
              Emergency helplines
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "inquiry" ? "active" : ""}`}
              onClick={() => setActiveTab("inquiry")}
            >
              Submit support inquiry
            </button>
          </div>

          {activeTab === "faqs" && (
            <div>
              {/* Search */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search FAQ or keyword (e.g. SLA, tracking, anonymous)..."
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border)",
                    padding: "0 14px 0 38px",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
                <span style={{ position: "absolute", left: "12px", top: "12px", color: "var(--muted)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
              </div>

              {/* Accordion Items */}
              <div>
                {filteredFaqs.map(item => {
                  const isOpen = openFaq === item.id;
                  return (
                    <div key={item.id} className="faq-card">
                      <button
                        type="button"
                        className="faq-q"
                        onClick={() => setOpenFaq(isOpen ? null : item.id)}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "var(--mint)", color: "var(--teal)", fontWeight: 700 }}>
                            {item.category}
                          </span>
                          {item.q}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      {isOpen && <div className="faq-a">{item.a}</div>}
                    </div>
                  );
                })}

                {filteredFaqs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                    No matching FAQ found. You can submit a direct inquiry below.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "helplines" && (
            <div>
              <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--muted)" }}>
                Direct governmental helplines available 24 hours a day for immediate assistance:
              </p>
              <div className="helpline-grid">
                {HELPLINES.map(h => (
                  <div key={h.number} className="helpline-item">
                    <strong style={{ fontSize: "13px", color: "var(--navy)" }}>{h.name}</strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{h.desc}</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ font: "800 16px 'Manrope', sans-serif", color: "var(--teal)" }}>
                        {h.number}
                      </span>
                      <a href={`tel:${h.number}`} className="helpline-call-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Call Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "inquiry" && (
            <div>
              {ticketCreated ? (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--mint)", color: "var(--success)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6"/></svg>
                  </div>
                  <h3 style={{ font: "700 18px 'Manrope', sans-serif", color: "var(--navy)", margin: "0 0 6px" }}>
                    Inquiry Ticket Dispatched
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 18px" }}>
                    Your inquiry has been assigned tracking code:
                  </p>
                  <div style={{ display: "inline-block", background: "#f0f7f5", border: "1px dashed var(--teal)", padding: "8px 18px", borderRadius: "8px", font: "800 16px 'Manrope', sans-serif", color: "var(--teal)" }}>
                    {ticketCreated}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "14px" }}>
                    Our citizen assistance team replies within 4 business hours.
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setTicketCreated(null)}
                    style={{ marginTop: "14px" }}
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry}>
                  <label>
                    Inquiry subject *
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Assistance needed with complaint verification"
                      required
                    />
                  </label>

                  <label>
                    Department / Area
                    <select value={department} onChange={e => setDepartment(e.target.value)}>
                      <option value="General Support">General Citizen Assistance</option>
                      <option value="Roads & Infrastructure">Roads &amp; Potholes Desk</option>
                      <option value="Water Supply & Drainage">Water Supply &amp; Drainage</option>
                      <option value="Solid Waste Management">Garbage &amp; Sanitation</option>
                      <option value="Street Lighting">Street Lighting &amp; Electricity</option>
                      <option value="Technical Support">Portal Bug / Technical Issue</option>
                    </select>
                  </label>

                  <label>
                    Description of inquiry / question *
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Provide details of your query or case reference..."
                      style={{ height: "90px" }}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={submitting}
                    style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
                  >
                    {submitting ? "Sending..." : "Submit inquiry"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <footer className="settings-modal-footer">
          <button type="button" className="primary-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
