import Icon from "../common/Icon";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";
import InstallAppButton from "../common/InstallAppButton";

export default function Topbar({
  title,
  onBell,
  onLanguage,
  onProfile,
  onMenu,
  langCode = "EN",
}: {
  title: string;
  onBell: () => void;
  onLanguage?: () => void;
  onProfile?: () => void;
  onMenu?: () => void;
  langCode?: string;
}) {
  const { user } = useAuth();
  const { t } = usePreferences();
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

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        {onMenu && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onMenu}
            aria-label="Open menu drawer"
          >
            <Icon name="more" size={20} />
          </button>
        )}
        <div>
          <span className="eyebrow">{t("portal_eyebrow", "Citizen portal")}</span>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        <InstallAppButton variant="topbar" />
        <button className="language" type="button" onClick={onLanguage} title={t("change_lang", "Change language")}>
          <Icon name="globe" size={18} /> {langCode} <Icon name="chevron" size={14} />
        </button>
        <button className="bell-button" aria-label="Notifications" onClick={onBell}>
          <Icon name="bell" />
          <span></span>
        </button>
        <div
          className="avatar"
          onClick={onProfile}
          style={{
            background: avatarBg,
            color: "#ffffff",
            fontWeight: 700,
            cursor: onProfile ? "pointer" : "default",
          }}
          title="Account profile"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
