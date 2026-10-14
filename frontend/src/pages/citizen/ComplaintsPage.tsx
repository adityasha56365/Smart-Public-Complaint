import { useCallback, useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import { usePreferences } from "../../hooks/usePreferences";
import { complaintService } from "../../services/services";
import { getAttachmentUrl } from "../../services/api";
import type { Complaint } from "../../types";

export default function ComplaintsPage({ openDetail, openReport }: { openDetail: (id: number) => void; openReport: () => void }) {
  const { t } = usePreferences();

  // Instant render from cache to avoid 0-flashing
  const cached = complaintService.getCached({ page: 1, page_size: 50 }) || complaintService.getCached({ page_size: 50 });
  const [complaints, setComplaints] = useState<Complaint[]>(() => cached?.items || []);
  const [loading, setLoading] = useState(() => complaints.length === 0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(() => cached?.total || complaints.length);

  const fetchComplaints = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page: 1, page_size: 50 };
      if (statusFilter !== "all") {
        if (statusFilter === "active") {
          params.status = "in_progress";
        } else {
          params.status = statusFilter;
        }
      }
      if (search) params.search = search;
      const res = await complaintService.list(params as Parameters<typeof complaintService.list>[0]);
      setComplaints(res.items);
      setTotal(res.total);
    } catch {
      setError("Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const iconMap: Record<string, IconName> = {
    "roads & potholes": "road", "garbage & sanitation": "trash", "water supply": "water",
    "streetlights": "light", "parks & public property": "park",
  };
  const toneMap: Record<string, string> = {
    in_progress: "teal", assigned: "blue", resolved: "green", submitted: "amber", under_review: "amber",
  };

  const activeCount = complaints.filter(c => !["resolved", "closed", "rejected"].includes(c.status)).length;
  const resolvedCount = complaints.filter(c => ["resolved", "closed"].includes(c.status)).length;

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("your_reports", "YOUR REPORTS")}</span>
          <h2>{t("my_complaints", "My complaints")}</h2>
          <p>{t("complaints_desc", "Track progress and review updates from civic teams.")}</p>
        </div>
        <button className="primary-button" onClick={openReport}>
          <Icon name="plus" /> {t("new_complaint", "New complaint")}
        </button>
      </div>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            aria-label={t("search_placeholder", "Search by title or reference number")}
            placeholder={t("search_placeholder", "Search by title or reference number")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className={`filter ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
          {t("filter_all", "All")} <span>{total}</span>
        </button>
        <button className={`filter ${statusFilter === "active" ? "active" : ""}`} onClick={() => setStatusFilter("active")}>
          {t("filter_active", "Active")} <span>{activeCount}</span>
        </button>
        <button className={`filter ${statusFilter === "resolved" ? "active" : ""}`} onClick={() => setStatusFilter("resolved")}>
          {t("filter_resolved", "Resolved")} <span>{resolvedCount}</span>
        </button>
      </div>
      <section className="panel complaint-table">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        {error && <ErrorBanner message={error} onRetry={fetchComplaints} />}
        {!loading && complaints.map(c => {
          const icon = iconMap[c.category_name?.toLowerCase() || ""] || "building";
          const tone = toneMap[c.status] || "navy";
          const timeAgo = new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          const firstAtt = c.attachments && c.attachments[0];
          const thumbUrl = firstAtt?.data_url || (firstAtt?.url ? getAttachmentUrl(firstAtt.url) : null);
          return (
            <button className="complaint-row" key={c.id} onClick={() => openDetail(c.id)}>
              <span className={`issue-icon ${tone}`} style={{ overflow: "hidden", position: "relative" }}>
                {thumbUrl && firstAtt?.attachment_type === "image" ? (
                  <img src={thumbUrl} alt="evidence" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Icon name={icon as IconName} />
                )}
              </span>
              <span className="complaint-main">
                <span className="complaint-meta">
                  {c.reference_number} · Updated {timeAgo}
                  {c.attachments && c.attachments.length > 0 && (
                    <span style={{ marginLeft: 8, color: "var(--teal)", fontWeight: 700, fontSize: 10, background: "#e8f4f0", padding: "1px 6px", borderRadius: 4 }}>
                      📷 {c.attachments.length} {c.attachments.length > 1 ? "photos" : "photo"}
                    </span>
                  )}
                </span>
                <strong>{c.title}</strong>
                <small><Icon name="pin" size={14} />{c.location_address || "Location not specified"}</small>
              </span>
              <Status value={c.status} />
              <Icon name="chevron" />
            </button>
          );
        })}
        {!loading && complaints.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
            <Icon name="file" size={32} />
            <p style={{ marginTop: 12, fontSize: 13 }}>{t("no_complaints_found", "No complaints found.")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
