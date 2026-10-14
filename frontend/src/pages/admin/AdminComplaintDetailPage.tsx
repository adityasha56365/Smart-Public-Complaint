import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import AttachmentGallery from "../citizen/AttachmentGallery";
import { complaintService, departmentService, userService } from "../../services/services";
import type { ComplaintDetail as ComplaintDetailType, Department, User } from "../../types";

export default function AdminComplaintDetailPage({ id, close }: { id: number; close: () => void }) {
  const [complaint, setComplaint] = useState<ComplaintDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusValue, setStatusValue] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  const reload = useCallback(async () => {
    const updated = await complaintService.get(id);
    setComplaint(updated);
    setStatusValue(updated.status);
    if (updated.current_assignment?.department_id) {
      setSelectedDept(String(updated.current_assignment.department_id));
    }
    if (updated.current_assignment?.officer_id) {
      setSelectedOfficer(String(updated.current_assignment.officer_id));
    }
  }, [id]);

  useEffect(() => {
    Promise.all([
      complaintService.get(id),
      userService.listOfficers().catch(() => []),
      departmentService.list().catch(() => []),
    ])
      .then(([c, o, d]) => {
        setComplaint(c);
        setStatusValue(c.status);
        setOfficers(o);
        setDepartments(d);
        if (c.current_assignment?.department_id) {
          setSelectedDept(String(c.current_assignment.department_id));
        }
        if (c.current_assignment?.officer_id) {
          setSelectedOfficer(String(c.current_assignment.officer_id));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveAndAssign = async () => {
    if (!complaint) return;
    setSaving(true);
    setSaveMsg("");
    try {
      let latestComplaint = complaint;

      // 1. Assign department/officer if selected
      if (selectedOfficer || selectedDept) {
        latestComplaint = await complaintService.assign(id, {
          officer_id: selectedOfficer ? parseInt(selectedOfficer) : undefined,
          department_id: selectedDept ? parseInt(selectedDept) : undefined,
        });
      }

      // 2. Update status ONLY if statusValue is different from the current/assigned status
      if (statusValue && statusValue !== latestComplaint.status) {
        latestComplaint = await complaintService.updateStatus(id, statusValue);
      }

      // 3. Add internal note if provided
      if (noteContent.trim()) {
        await complaintService.addInternalNote(id, noteContent.trim());
        setNoteContent("");
      }

      await reload();
      setSaveMsg("✓ Saved and assigned successfully.");
    } catch (err: unknown) {
      const resData = (err as any)?.response?.data;
      let errorDetail = "Save failed.";
      if (typeof resData?.detail === "string") {
        errorDetail = resData.detail;
      } else if (Array.isArray(resData?.detail) && resData.detail.length > 0) {
        errorDetail = resData.detail[0]?.msg || JSON.stringify(resData.detail[0]);
      } else if (typeof resData?.message === "string") {
        errorDetail = resData.message;
      }
      setSaveMsg(`✕ ${errorDetail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEscalate = async () => {
    if (!complaint) return;
    setEscalating(true);
    try {
      await complaintService.updateStatus(id, "under_review", "Escalated by admin — requires urgent attention");
      await complaintService.addInternalNote(id, "⚠️ Escalated: this complaint has been flagged for priority review.");
      await reload();
      setSaveMsg("✓ Complaint escalated successfully.");
    } catch {
      setSaveMsg("Failed to escalate.");
    } finally {
      setEscalating(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentContent.trim()) return;
    try {
      await complaintService.addComment(id, commentContent);
      setCommentContent("");
      await reload();
      setActiveTab("comments");
    } catch {
      /**/
    }
  };

  if (loading || !complaint) return <div className="admin-page"><Spinner /></div>;

  return (
    <div className="admin-page admin-detail">
      <button className="back-link" onClick={close}>← Back to complaint queue</button>
      <div className="admin-detail-head">
        <div>
          <div>
            <span className="eyebrow">{complaint.reference_number} · SUBMITTED {new Date(complaint.created_at).toLocaleString("en-IN")}</span>
            <h1>{complaint.title}</h1>
          </div>
          <Status value={complaint.status} />
        </div>
        <p><Icon name="pin" size={15} /> {complaint.location_address || "Location not specified"}</p>
      </div>
      <div className="admin-detail-layout">
        <div className="admin-detail-main">
          <section className="admin-panel case-section">
            <div className="case-block-head">
              <h3>Complaint information</h3>
              <span className={`priority ${complaint.priority}`}><i></i>{complaint.priority} priority</span>
            </div>
            <p className="case-description">{complaint.description}</p>
            <div className="case-facts">
              <div><span>Category</span><strong>{complaint.category_name || "Uncategorized"}</strong></div>
              <div><span>Citizen</span><strong>{complaint.contact_name || complaint.citizen_name || `#${complaint.citizen_id}`}</strong></div>
              {complaint.contact_phone && (
                <div><span>Phone</span><strong>{complaint.contact_phone}</strong></div>
              )}
              {complaint.contact_email && (
                <div><span>Email</span><strong>{complaint.contact_email}</strong></div>
              )}
              <div><span>Priority</span><strong style={{ textTransform: "capitalize" }}>{complaint.priority}</strong></div>
              <div><span>Submitted</span><strong>{new Date(complaint.created_at).toLocaleDateString("en-IN")}</strong></div>
              <div><span>Department</span><strong>{complaint.current_assignment?.department_name || "Unassigned"}</strong></div>
              <div><span>Officer</span><strong>{complaint.current_assignment?.officer_name || "Unassigned"}</strong></div>
            </div>
            {/* Attachments with lightbox */}
            <AttachmentGallery attachments={complaint.attachments} />
          </section>
          <section className="admin-panel case-section">
            <div className="case-block-head">
              <h3>Activity &amp; communication</h3>
              <div className="case-tabs">
                {["timeline", "comments", "notes"].map(t => (
                  <button key={t} className={activeTab === t ? "active" : ""} onClick={() => setActiveTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    {t === "comments" && complaint.comments.length > 0 && (
                      <span style={{ marginLeft: 4, background: "var(--teal)", color: "white", borderRadius: 8, padding: "1px 5px", fontSize: 8 }}>
                        {complaint.comments.length}
                      </span>
                    )}
                    {t === "notes" && complaint.internal_notes.length > 0 && (
                      <span style={{ marginLeft: 4, background: "var(--navy)", color: "white", borderRadius: 8, padding: "1px 5px", fontSize: 8 }}>
                        {complaint.internal_notes.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {activeTab === "timeline" && (
              <div className="admin-timeline">
                {complaint.status_history.map(h => (
                  <div key={h.id}>
                    <span><Icon name="check" size={14} /></span>
                    <p>
                      <strong>{h.new_status.replace(/_/g, " ")}</strong>
                      <small>{new Date(h.created_at).toLocaleString("en-IN")} · {h.changed_by_name || "System"}</small>
                      {h.reason && <span style={{ fontSize: 9, color: "var(--muted)", display: "block" }}>{h.reason}</span>}
                    </p>
                  </div>
                ))}
                {complaint.status_history.length === 0 && <p style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>No history yet.</p>}
              </div>
            )}
            {activeTab === "comments" && (
              <div style={{ padding: "0 4px" }}>
                {complaint.comments.map(cm => (
                  <div key={cm.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: 10 }}>{cm.author_name}</strong>
                    <small style={{ marginLeft: 8, color: "var(--muted)", fontSize: 9 }}>{new Date(cm.created_at).toLocaleDateString("en-IN")}</small>
                    <p style={{ margin: "4px 0 0", fontSize: 10 }}>{cm.content}</p>
                  </div>
                ))}
                {complaint.comments.length === 0 && <p style={{ fontSize: 10, color: "var(--muted)", padding: "8px 0" }}>No public comments yet.</p>}
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <input
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    placeholder="Post a public update to the citizen..."
                    style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 11 }}
                    onKeyDown={e => e.key === "Enter" && handlePostComment()}
                  />
                  <button className="primary-button" onClick={handlePostComment} style={{ minHeight: 36, padding: "0 12px", fontSize: 11 }}>Post</button>
                </div>
              </div>
            )}
            {activeTab === "notes" && (
              <div style={{ padding: "0 4px" }}>
                {complaint.internal_notes.map(n => (
                  <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: 10 }}>{n.author_name}</strong>
                    <small style={{ marginLeft: 8, color: "var(--muted)", fontSize: 9 }}>{new Date(n.created_at).toLocaleDateString("en-IN")}</small>
                    <p style={{ margin: "4px 0 0", fontSize: 10 }}>{n.content}</p>
                  </div>
                ))}
                {complaint.internal_notes.length === 0 && <p style={{ fontSize: 10, color: "var(--muted)", padding: "8px 0" }}>No internal notes.</p>}
              </div>
            )}
          </section>
        </div>
        <aside className="admin-action-panel">
          <section className="admin-panel action-card">
            <h3>Case actions</h3>
            <label>Assigned department
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label>Assign officer
              <select value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}>
                <option value="">Select an officer</option>
                {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </label>
            <label>Update status
              <select value={statusValue} onChange={e => setStatusValue(e.target.value)}>
                {["submitted","under_review","assigned","in_progress","awaiting_info","resolved","rejected","closed"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
            <label>Internal note<textarea placeholder="Add context for the assigned team..." value={noteContent} onChange={e => setNoteContent(e.target.value)} /></label>
            {saveMsg && <p style={{ fontSize: 10, color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--error)", margin: "4px 0" }}>{saveMsg}</p>}
            <button className="primary-button" onClick={handleSaveAndAssign} disabled={saving}>{saving ? <Spinner /> : <>Save and assign <Icon name="arrow" /></>}</button>
            <button className="secondary-button" onClick={handleEscalate} disabled={escalating} style={{ marginTop: 6 }}>
              {escalating ? <Spinner /> : <><Icon name="alert" /> Escalate complaint</>}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
