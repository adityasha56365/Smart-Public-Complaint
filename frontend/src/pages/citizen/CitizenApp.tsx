import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/common/Icon";
import Sidebar, { navItems } from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import Home from "./Home";
import ComplaintsPage from "./ComplaintsPage";
import ComplaintDetailPage from "./ComplaintDetailPage";
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

  const content =
    detailId != null ? (
      <ComplaintDetailPage id={detailId} close={() => setDetailId(null)} />
    ) : active === "home" ? (
      <Home openReport={() => setReportOpen(true)} openDetail={setDetailId} />
    ) : active === "complaints" ? (
      <ComplaintsPage openDetail={setDetailId} openReport={() => setReportOpen(true)} />
    ) : active === "map" ? (
      <MapPage openDetail={setDetailId} />
    ) : active === "notifications" ? (
      <NotificationsPage />
    ) : (
      <ProfilePage onLogout={handleLogout} />
    );

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        onChange={(id) => {
          setActive(id);
          setDetailId(null);
        }}
        unreadCount={unreadCount}
        onHelp={() => setHelpModalOpen(true)}
      />
      <main className="main">
        <Topbar
          title={pageTitle}
          onBell={() => setActive("notifications")}
          onLanguage={() => setLangModalOpen(true)}
          onProfile={() => {
            setActive("profile");
            setDetailId(null);
          }}
          langCode={language.code}
        />
        {content}
      </main>
      <nav className="mobile-nav">
        {navItems.slice(0, 5).map((item) => (
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
