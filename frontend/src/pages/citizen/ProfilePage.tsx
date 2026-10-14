import { useState } from "react";
import Icon, { IconName } from "../../components/common/Icon";
import EditProfileModal from "../../components/profile/EditProfileModal";
import LanguageModal from "../../components/profile/LanguageModal";
import NotificationModal from "../../components/profile/NotificationModal";
import PrivacyModal from "../../components/profile/PrivacyModal";
import HelpCentreModal from "../../components/profile/HelpCentreModal";
import AccessibilityModal from "../../components/profile/AccessibilityModal";
import TermsModal from "../../components/profile/TermsModal";
import Toast, { ToastMessage } from "../../components/profile/Toast";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";

export default function ProfilePage({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const {
    language,
    setLanguage,
    accessibility,
    updateAccessibility,
    resetAccessibility,
    notifications,
    updateNotifications,
    privacy,
    updatePrivacy,
    t,
  } = usePreferences();

  const [confirming, setConfirming] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "edit-profile" | "language" | "notifications" | "privacy" | "help" | "accessibility" | "terms" | null
  >(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const initials = (() => {
    const name = user?.full_name || (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.full_name || "";
      } catch { return ""; }
    })() || "Citizen";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || "CZ").toUpperCase();
  })();
  const avatarBg = localStorage.getItem("civicly_avatar_bg") || "#087f8c";

  const accessibilitySubtitle = `${accessibility.fontSizePercent}% text • ${
    accessibility.reduceMotion ? "Reduced motion" : "Default motion"
  }${accessibility.highContrast ? " • High contrast" : ""}`;

  const settingsCards: Array<{
    id: "language" | "notifications" | "privacy" | "help" | "accessibility" | "terms";
    icon: IconName;
    title: string;
    subtitle: string;
  }> = [
    {
      id: "language",
      icon: "globe",
      title: t("settings_language", "Language"),
      subtitle: `${language.name} (${language.nativeName})`,
    },
    {
      id: "notifications",
      icon: "bell",
      title: t("settings_notifications", "Notifications"),
      subtitle: `${notifications.push ? "Push on" : "Push off"} • ${notifications.email ? "Email digest on" : "Email off"}`,
    },
    {
      id: "privacy",
      icon: "shield",
      title: t("settings_privacy", "Privacy & consent"),
      subtitle: `${privacy.anonymousComplaints ? "Anonymous active" : "Standard identity"} • Manage data`,
    },
    {
      id: "help",
      icon: "help",
      title: t("settings_help", "Help centre"),
      subtitle: "FAQs, helplines & queries",
    },
    {
      id: "accessibility",
      icon: "settings",
      title: t("settings_accessibility", "Accessibility"),
      subtitle: accessibilitySubtitle,
    },
    {
      id: "terms",
      icon: "file",
      title: t("settings_terms", "Terms & policies"),
      subtitle: "Citizen Charter, SLA & Privacy policy",
    },
  ];

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("account_eyebrow", "ACCOUNT")}</span>
          <h2>{t("profile_settings", "Profile & settings")}</h2>
          <p>{t("profile_settings_desc", "Manage your preferences, privacy, language, and support options.")}</p>
        </div>
      </div>

      <div className="profile-card panel">
        <div className="profile-identity">
          <div
            className="avatar large"
            style={{
              background: avatarBg,
              color: "#ffffff",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "22px",
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              border: "2px solid rgba(255,255,255,0.25)",
            }}
            onClick={() => setActiveModal("edit-profile")}
            title="Click to edit profile"
          >
            {initials}
          </div>
          <div>
            <h3>{user?.full_name || "—"}</h3>
            <p>
              Role: <strong style={{ textTransform: "capitalize", color: "var(--teal)" }}>{user?.role || "citizen"}</strong>
              {user?.email && ` • ${user.email}`}
              {user?.phone && ` • ${user.phone}`}
            </p>
            <button
              type="button"
              onClick={() => setActiveModal("edit-profile")}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Icon name="user" size={13} /> {t("btn_edit_profile", "Edit profile")}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {settingsCards.map(s => (
          <button
            className="setting panel"
            key={s.id}
            type="button"
            onClick={() => setActiveModal(s.id)}
            aria-label={`Open ${s.title} settings`}
          >
            <span><Icon name={s.icon} /></span>
            <div>
              <strong>{s.title}</strong>
              <small>{s.subtitle}</small>
            </div>
            <Icon name="chevron" />
          </button>
        ))}
      </div>

      <section className="logout-section">
        <div>
          <strong>{t("sign_out_title", "Sign out of JanSeva")}</strong>
          <p>{t("sign_out_desc", "You can sign in again anytime to track and report issues.")}</p>
        </div>
        <button className="logout-button" type="button" onClick={() => setConfirming(true)}>
          <Icon name="arrow" size={18} /> {t("btn_logout", "Log out")}
        </button>
      </section>

      {/* Confirmation Dialog for Logout */}
      {confirming && (
        <div className="confirm-wrap">
          <div className="confirm-backdrop" onClick={() => setConfirming(false)}></div>
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Confirm logout">
            <span className="confirm-icon"><Icon name="shield" /></span>
            <h3>Log out of your account?</h3>
            <p>You&apos;ll need to sign in again to access your complaints and track status.</p>
            <div>
              <button className="secondary-button" type="button" onClick={() => setConfirming(false)}>Stay signed in</button>
              <button className="logout-button solid" type="button" onClick={onLogout}>Yes, log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for all buttons */}
      {activeModal === "edit-profile" && (
        <EditProfileModal
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "language" && (
        <LanguageModal
          currentLanguage={language}
          onSelectLanguage={setLanguage}
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "notifications" && (
        <NotificationModal
          settings={notifications}
          onUpdate={updateNotifications}
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "privacy" && (
        <PrivacyModal
          settings={privacy}
          onUpdate={updatePrivacy}
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "help" && (
        <HelpCentreModal
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "accessibility" && (
        <AccessibilityModal
          settings={accessibility}
          onUpdate={updateAccessibility}
          onReset={resetAccessibility}
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {activeModal === "terms" && (
        <TermsModal
          onClose={() => setActiveModal(null)}
          onToast={addToast}
        />
      )}

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
