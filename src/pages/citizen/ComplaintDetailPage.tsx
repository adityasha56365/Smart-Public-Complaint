import { useEffect, useState } from "react";
import Icon from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import AttachmentGallery from "./AttachmentGallery";
import { complaintService } from "../../services/services";
import type { ComplaintDetail as ComplaintDetailType } from "../../types";

export default function ComplaintDetailPage({ id, close }: { id: number; close: () => void }) {
  const [complaint, setComplaint] = useState<ComplaintDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    complaintService
      .get(id)
      .then(setComplaint)
      .catch(() => setError("Failed to load complaint."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  }
  if (error || !complaint) {
    return (
      <div className="page">
        <ErrorBanner message={error || "Not found"} />
        <button className="back-link" onClick={close}>← Back</button>
      </div>
    );
  }

  const timelineItems = complaint.status_history.map(h => ({
    label: h.new_status.replace(/_/g, " "),
    time: new Date(h.created_at).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    note: h.reason || (h.changed_by_name ? `Updated by ${h.changed_by_name}` : ""),
    isCurrent: false,
  }));
  if (timelineItems.length > 0) timelineItems[timelineItems.length - 1].isCurrent = true;

  return (
    <div className="page detail-page">
      <button className="back-link" onClick={close}>← Back to complaints</button>
      <div className="detail-head">
        <div>
          <span className="eyebrow">{complaint.reference_number}</span>
          <h2>{complaint.title}</h2>
          <p>
            <Icon name="pin" size={16} /> {complaint.location_address || "Location not specified"} · Submitted{" "}
            {new Date(complaint.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
          </p>
        </div>
        <Status value={complaint.status} />
      </div>
      <div className="detail-layout">
        <section className="panel detail-panel">
          <h3>Complaint details</h3>
          <AttachmentGallery attachments={complaint.attachments} />
          <p className="description">{complaint.description}</p>
          <div className="detail-facts">
            <div><span>Category</span><strong>{complaint.category_name || "Uncategorized"}</strong></div>
            <div><span>Priority</span><strong style={{ textTransform: "capitalize" }}>{complaint.priority}</strong></div>
            <div><span>Responsible team</span><strong>{complaint.current_assignment?.department_name || "Unassigned"}</strong></div>
            <div><span>Assigned officer</span><strong>{complaint.current_assignment?.officer_name || "Unassigned"}</strong></div>
          </div>
          {complaint.rejection_reason && (
            <div style={{ marginTop: 16, padding: 12, background: "#fff5f5", borderRadius: 8, border: "1px solid #fcc" }}>
              <strong style={{ fontSize: 11, color: "var(--error)" }}>Rejection reason:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--error)" }}>{complaint.rejection_reason}</p>
            </div>
          )}
          {complaint.resolution_details && (
            <div style={{ marginTop: 16, padding: 12, background: "#f0faf5", borderRadius: 8, border: "1px solid #aee" }}>
              <strong style={{ fontSize: 11, color: "var(--success)" }}>Resolution:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>{complaint.resolution_details}</p>
            </div>
          )}
          {complaint.comments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 12, color: "var(--navy)", marginBottom: 8 }}>Updates from civic team</h4>
              {complaint.comments.map(cm => (
                <div key={cm.id} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <strong style={{ fontSize: 11 }}>{cm.author_name}</strong>
                  <small style={{ marginLeft: 8, color: "var(--muted)", fontSize: 10 }}>
                    {new Date(cm.created_at).toLocaleDateString("en-IN")}
                  </small>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>{cm.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel timeline-panel">
          <div className="section-head">
            <div><span className="eyebrow">LIVE TRACKING</span><h3>Resolution timeline</h3></div>
          </div>
          <div className="timeline">
            {timelineItems.map((item, i) => (
              <div className={`timeline-item ${item.isCurrent ? "current" : ""}`} key={i}>
                <span className="timeline-dot"><Icon name={item.isCurrent ? "clock" : "check"} size={14} /></span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.time}</small>
                  {item.note && <p>{item.note}</p>}
                </div>
              </div>
            ))}
            {timelineItems.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", padding: "0 24px" }}>No updates yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
