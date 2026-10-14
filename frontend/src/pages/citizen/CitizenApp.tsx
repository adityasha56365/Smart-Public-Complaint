import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/common/Icon";
import Sidebar, { navItems } from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Home from "./Home";
import ComplaintsPage from "./ComplaintsPage";
import ComplaintDetailPage from "./ComplaintDetailPage";
import CitizenChallanPage from "./CitizenChallanPage";
import MapPage from "./MapPage";
import NotificationsPage from "./NotificationsPage";
import ProfilePage from "./ProfilePage";
import ReportFlow from "./ReportFlow";
import LanguageModal from "../../components/profile/LanguageModal";
import HelpCentreModal from "../../components/profile/HelpCentreModal";
import JanSahayakChat from "../../components/chat/JanSahayakChat";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";
import { notificationService } from "../../services/services";

export default function CitizenApp() {
  const { logout } = useAuth();
  const { language, setLanguage, t } = usePreferences();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const navigate = useNavigate();
  const [active, setActive] = useState("home");
  const [reportOpen, setReportOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentNav = useMemo(() => navItems.find((n) => n.id === active), [active]);
  const pageTitle = useMemo(() => {
    if (detailId != null) return t("complaint_details", "Complaint details");
    if (currentNav) return t(currentNav.labelKey, currentNav.label);
    return "JanSeva";
  }, [detailId, currentNav, t]);

  useEffect(() => {
    notificationService
      .list()
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["home"]));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (id: string) => {
    setActive(id);
    setDetailId(null);
    setSidebarOpen(false);
    setVisitedTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "menu-open" : ""}`}>
      <Sidebar
        active={active}
        onChange={handleTabChange}
        unreadCount={unreadCount}
        onHelp={() => setHelpModalOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div
        className="sidebar-scrim"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <main className="main">
        <Topbar
          title={pageTitle}
          onBell={() => handleTabChange("notifications")}
          onLanguage={() => setLangModalOpen(true)}
          onProfile={() => handleTabChange("profile")}
          onMenu={() => setSidebarOpen(true)}
          langCode={language.code}
        />
        {detailId != null ? (
          <ComplaintDetailPage id={detailId} close={() => setDetailId(null)} />
        ) : (
          <>
            <div style={{ display: active === "home" ? "block" : "none" }}>
              <Home openReport={() => setReportOpen(true)} openDetail={setDetailId} />
            </div>
            {visitedTabs.has("complaints") && (
              <div style={{ display: active === "complaints" ? "block" : "none" }}>
                <ComplaintsPage openDetail={setDetailId} openReport={() => setReportOpen(true)} />
              </div>
            )}
            {visitedTabs.has("challan") && (
              <div style={{ display: active === "challan" ? "block" : "none" }}>
                <CitizenChallanPage />
              </div>
            )}
            {visitedTabs.has("map") && (
              <div style={{ display: active === "map" ? "block" : "none" }}>
                <MapPage openDetail={setDetailId} />
              </div>
            )}
            {visitedTabs.has("notifications") && (
              <div style={{ display: active === "notifications" ? "block" : "none" }}>
                <NotificationsPage />
              </div>
            )}
            {visitedTabs.has("profile") && (
              <div style={{ display: active === "profile" ? "block" : "none" }}>
                <ProfilePage onLogout={handleLogout} />
              </div>
            )}
          </>
        )}
      </main>
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "active" : ""}
            onClick={() => {
              setActive(item.id);
              setDetailId(null);
            }}
          >
            <Icon name={item.icon} />
            <span>{t(item.labelKey, item.label).split(" ")[0]}</span>
          </button>
        ))}
      </nav>
      {reportOpen && <ReportFlow close={() => setReportOpen(false)} />}
      {langModalOpen && (
        <LanguageModal
          currentLanguage={language}
          onSelectLanguage={setLanguage}
          onClose={() => setLangModalOpen(false)}
          onToast={() => {}}
        />
      )}
      {helpModalOpen && (
        <HelpCentreModal
          onClose={() => setHelpModalOpen(false)}
          onToast={() => {}}
        />
      )}
      <button
        className="mobile-fab"
        onClick={() => setReportOpen(true)}
        aria-label="Report a problem"
      >
        <Icon name="plus" />
      </button>
      {/* JanSahayak AI — floating chatbot */}
      <JanSahayakChat />
    </div>
  );
}
