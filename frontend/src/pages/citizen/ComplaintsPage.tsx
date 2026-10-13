import { useCallback, useEffect, useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import Status from "../../components/common/Status";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import { complaintService } from "../../services/services";
import type { Complaint } from "../../types";

export default function ComplaintsPage({ openDetail, openReport }: { openDetail: (id: number) => void; openReport: () => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
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
          <span className="eyebrow">YOUR REPORTS</span>
          <h2>My complaints</h2>
          <p>Track progress and review updates from civic teams.</p>
        </div>
        <button className="primary-button" onClick={openReport}>
          <Icon name="plus" /> New complaint
        </button>
      </div>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            aria-label="Search complaints"
            placeholder="Search by title or reference number"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className={`filter ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
          All <span>{total}</span>
        </button>
        <button className={`filter ${statusFilter === "active" ? "active" : ""}`} onClick={() => setStatusFilter("active")}>
          Active <span>{activeCount}</span>
        </button>
        <button className={`filter ${statusFilter === "resolved" ? "active" : ""}`} onClick={() => setStatusFilter("resolved")}>
          Resolved <span>{resolvedCount}</span>
        </button>
      </div>
      <section className="panel complaint-table">
        {loading && <div style={{ padding: 20 }}><Spinner /></div>}
        {error && <ErrorBanner message={error} onRetry={fetchComplaints} />}
        {!loading && complaints.map(c => {
          const icon = iconMap[c.category_name?.toLowerCase() || ""] || "building";
          const tone = toneMap[c.status] || "navy";
          const timeAgo = new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          return (
            <button className="complaint-row" key={c.id} onClick={() => openDetail(c.id)}>
              <span className={`issue-icon ${tone}`}><Icon name={icon as IconName} /></span>
              <span className="complaint-main">
                <span className="complaint-meta">{c.reference_number} · Updated {timeAgo}</span>
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
            <p style={{ marginTop: 12, fontSize: 13 }}>No complaints found.</p>
          </div>
        )}
      </section>
    </div>
  );
}
