import Icon from "../common/Icon";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";

export default function Topbar({
  title,
  onBell,
  onLanguage,
  onProfile,
  langCode = "EN",
}: {
  title: string;
  onBell: () => void;
  onLanguage?: () => void;
  onProfile?: () => void;
  langCode?: string;
}) {
  const { user } = useAuth();
  const { t } = usePreferences();
  const initials = user?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";
  const avatarBg = localStorage.getItem("civicly_avatar_bg") || "var(--teal)";

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">{t("portal_eyebrow", "Citizen portal")}</span>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
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
          style={{ background: avatarBg, cursor: onProfile ? "pointer" : "default" }}
          title="Account profile"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
