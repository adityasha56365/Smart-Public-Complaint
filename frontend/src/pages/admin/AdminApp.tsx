import { useState } from "react";
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

  const handleNavigate = (id: string) => {
    setActive(id);
    setDetailId(null);
  };

  const page =
    detailId != null ? (
      <AdminComplaintDetailPage id={detailId} close={() => setDetailId(null)} />
    ) : active === "overview" ? (
      <AdminOverview openComplaint={setDetailId} navigate={handleNavigate} />
    ) : active === "admin-complaints" ? (
      <AdminComplaints openComplaint={setDetailId} />
    ) : active === "departments" ? (
      <AdminDepartments />
    ) : active === "reports" ? (
      <AdminReports />
    ) : active === "audit" ? (
      <AdminAuditLogs />
    ) : active === "staff" ? (
      <AdminStaff />
    ) : active === "citizens" ? (
      <AdminCitizens />
    ) : active === "escalations" ? (
      <AdminEscalations openComplaint={id => setDetailId(id)} />
    ) : active === "admin-map" ? (
      <AdminLiveMap openComplaint={setDetailId} />
    ) : active === "admin-settings" ? (
      <AdminSettings />
    ) : active === "admin-help" ? (
      <AdminHelp />
    ) : (
      <AdminOverview openComplaint={setDetailId} navigate={handleNavigate} />
    );

  return (
    <div className={`admin-shell ${menuOpen ? "menu-open" : ""}`}>
      <AdminSidebar
        active={active}
        onChange={id => {
          setActive(id);
          setDetailId(null);
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
        {page}
      </main>
    </div>
  );
}
