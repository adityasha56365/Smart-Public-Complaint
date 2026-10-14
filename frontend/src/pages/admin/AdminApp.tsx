import { useState } from "react";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AdminTopbar from "../../components/layout/AdminTopbar";
import AdminOverview from "./AdminOverview";
import AdminComplaints from "./AdminComplaints";
import AdminComplaintDetailPage from "./AdminComplaintDetailPage";
import AdminDepartments from "./AdminDepartments";
import AdminReports from "./AdminReports";
import AdminAuditLogs from "./AdminAuditLogs";
import AdminStaff from "./AdminStaff";
import AdminCitizens from "./AdminCitizens";
import AdminEscalations from "./AdminEscalations";
import AdminLiveMap from "./AdminLiveMap";
import AdminSettings from "./AdminSettings";
import AdminHelp from "./AdminHelp";

export default function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState("overview");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["overview"]));

  const handleNavigate = (id: string) => {
    setActive(id);
    setDetailId(null);
    setVisitedTabs(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  return (
    <div className={`admin-shell ${menuOpen ? "menu-open" : ""}`}>
      <AdminSidebar
        active={active}
        onChange={id => {
          handleNavigate(id);
          setMenuOpen(false);
        }}
        onLogout={onLogout}
      />
      <div className="admin-sidebar-scrim" onClick={() => setMenuOpen(false)}></div>
      <main className="admin-main">
        <AdminTopbar
          active={detailId != null ? "admin-complaints" : active}
          onMenu={() => setMenuOpen(!menuOpen)}
        />
        <ErrorBoundary>
          {detailId != null ? (
            <AdminComplaintDetailPage id={detailId} close={() => setDetailId(null)} />
          ) : (
            <>
              <div style={{ display: active === "overview" ? "block" : "none" }}>
                <AdminOverview openComplaint={setDetailId} navigate={handleNavigate} />
              </div>
              {visitedTabs.has("admin-complaints") && (
                <div style={{ display: active === "admin-complaints" ? "block" : "none" }}>
                  <AdminComplaints openComplaint={setDetailId} />
                </div>
              )}
              {visitedTabs.has("departments") && (
                <div style={{ display: active === "departments" ? "block" : "none" }}>
                  <AdminDepartments />
                </div>
              )}
              {visitedTabs.has("reports") && (
                <div style={{ display: active === "reports" ? "block" : "none" }}>
                  <AdminReports />
                </div>
              )}
              {visitedTabs.has("audit") && (
                <div style={{ display: active === "audit" ? "block" : "none" }}>
                  <AdminAuditLogs />
                </div>
              )}
              {visitedTabs.has("staff") && (
                <div style={{ display: active === "staff" ? "block" : "none" }}>
                  <AdminStaff />
                </div>
              )}
              {visitedTabs.has("citizens") && (
                <div style={{ display: active === "citizens" ? "block" : "none" }}>
                  <AdminCitizens />
                </div>
              )}
              {visitedTabs.has("escalations") && (
                <div style={{ display: active === "escalations" ? "block" : "none" }}>
                  <AdminEscalations openComplaint={id => setDetailId(id)} />
                </div>
              )}
              {visitedTabs.has("admin-map") && (
                <div style={{ display: active === "admin-map" ? "block" : "none" }}>
                  <AdminLiveMap openComplaint={setDetailId} />
                </div>
              )}
              {visitedTabs.has("admin-settings") && (
                <div style={{ display: active === "admin-settings" ? "block" : "none" }}>
                  <AdminSettings />
                </div>
              )}
              {visitedTabs.has("admin-help") && (
                <div style={{ display: active === "admin-help" ? "block" : "none" }}>
                  <AdminHelp />
                </div>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
