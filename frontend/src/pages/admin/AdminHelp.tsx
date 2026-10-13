import Icon from "../../components/common/Icon";

export default function AdminHelp() {
  const faqs = [
    {
      q: "How do I assign a complaint to an officer?",
      a: "Open the complaint from the queue, select the officer in the Case Actions panel, and click 'Save and assign'.",
    },
    {
      q: "What does the SLA timer represent?",
      a: "The SLA timer counts hours since submission. Complaints exceeding the configured threshold appear in Escalations.",
    },
    {
      q: "How do I add a new department?",
      a: "Navigate to Departments → click 'Add department', fill in the name and jurisdiction, then submit.",
    },
    {
      q: "Can I export complaint data?",
      a: "Yes — in the Complaint Queue and Reports pages, use the 'Export CSV' button to download filtered data.",
    },
    {
      q: "How is complaint priority determined?",
      a: "Priority is auto-predicted by the system based on keywords in the title and description when a citizen submits.",
    },
    {
      q: "How do I post a public update to a citizen?",
      a: "Open the complaint detail, switch to the 'Comments' tab, type your update, and click 'Post'.",
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>Help &amp; support</h1>
          <p>Admin documentation, FAQs, and platform support.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <section className="admin-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "var(--navy)" }}>Frequently asked questions</h3>
          {faqs.map((f, i) => (
            <details key={i} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--navy)",
                  listStyle: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {f.q} <Icon name="chevron" size={14} />
              </summary>
              <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--muted)", lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section className="admin-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "var(--navy)" }}>Quick links</h3>
            {[
              ["📋 Complaint queue", "admin-complaints"],
              ["🏢 Departments", "departments"],
              ["📊 Reports", "reports"],
              ["🔍 Audit logs", "audit"],
              ["⚙️ Settings", "admin-settings"],
            ].map(([label]) => (
              <div key={label} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--teal)", cursor: "pointer", fontWeight: 600 }}>
                {label}
              </div>
            ))}
          </section>
          <section className="admin-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--navy)" }}>Platform info</h3>
            <div style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.9 }}>
              <div>Version: <strong style={{ color: "var(--navy)" }}>Civicly v2.0</strong></div>
              <div>API: <strong style={{ color: "var(--navy)" }}>FastAPI / Python</strong></div>
              <div>Frontend: <strong style={{ color: "var(--navy)" }}>React + Tailwind</strong></div>
              <div>Support: <strong style={{ color: "var(--teal)" }}>admin@civicly.app</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
