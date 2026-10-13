import { useEffect, useState } from "react";
import Status from "../../components/common/Status";
import ComplaintsMapView from "../../components/map/ComplaintsMapView";
import { complaintService } from "../../services/services";
import type { Complaint } from "../../types";

export default function AdminLiveMap({ openComplaint }: { openComplaint?: (id: number) => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    complaintService
      .list({ page: 1, page_size: 150 })
      .then(r => setComplaints(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusGroups: Record<string, number> = {};
  complaints.forEach(c => {
    statusGroups[c.status] = (statusGroups[c.status] || 0) + 1;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">LIVE MAP</span>
          <h1>Live complaint map</h1>
          <p>Real-time geographic distribution of complaints across zones via OpenStreetMap.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        <div>
          <ComplaintsMapView
            initialComplaints={complaints}
            onSelectComplaint={openComplaint}
            height={560}
            showFilters={true}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="admin-panel" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "var(--navy)" }}>Status breakdown</h3>
            {Object.entries(statusGroups).map(([status, count]) => (
              <div
                key={status}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Status value={status} />
                <strong style={{ fontSize: 11 }}>{count}</strong>
              </div>
            ))}
            {Object.keys(statusGroups).length === 0 && (
              <p style={{ fontSize: 10, color: "var(--muted)" }}>No data.</p>
            )}
          </div>
          <div className="admin-panel" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "var(--navy)" }}>Recent complaints</h3>
            {complaints.slice(0, 6).map(c => (
              <div
                key={c.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  cursor: openComplaint ? "pointer" : "default",
                }}
                onClick={() => openComplaint?.(c.id)}
                title="Click to view full complaint"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                  <strong style={{ fontSize: 11, color: "var(--navy)", display: "block" }}>{c.title}</strong>
                  {c.location_lat != null && (
                    <span style={{ fontSize: 9, color: "var(--teal)", fontWeight: 600 }}>📍 GPS</span>
                  )}
                </div>
                <small style={{ fontSize: 10, color: "var(--muted)" }}>
                  {c.location_address || c.location_landmark || "No location"}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
