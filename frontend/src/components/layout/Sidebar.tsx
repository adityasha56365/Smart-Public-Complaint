import Icon, { IconName } from "../common/Icon";
import Brand from "../common/Brand";
import { usePreferences } from "../../hooks/usePreferences";

export interface NavItemConfig {
  id: string;
  labelKey: string;
  label: string;
  icon: IconName;
}

export const navItems: NavItemConfig[] = [
  { id: "home", labelKey: "nav_home", label: "Home", icon: "home" },
  { id: "complaints", labelKey: "nav_complaints", label: "My complaints", icon: "file" },
  { id: "challan", labelKey: "nav_challan", label: "Challan Complaint", icon: "traffic" },
  { id: "map", labelKey: "nav_map", label: "Nearby issues", icon: "map" },
  { id: "notifications", labelKey: "nav_notifications", label: "Notifications", icon: "bell" },
  { id: "profile", labelKey: "nav_profile", label: "Profile", icon: "user" },
];

export default function Sidebar({
  active,
  onChange,
  unreadCount,
  onHelp,
}: {
  active: string;
  onChange: (id: string) => void;
  unreadCount: number;
  onHelp?: () => void;
}) {
  const { t } = usePreferences();

  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "active" : ""}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} />
            <span>{t(item.labelKey, item.label)}</span>
            {item.id === "notifications" && unreadCount > 0 && <i>{unreadCount}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-help">
        <Icon name="help" />
        <strong>{t("need_help", "Need help?")}</strong>
        <p>{t("need_help_desc", "Find answers or speak with our support team.")}</p>
        <button type="button" onClick={onHelp} aria-label="Visit help centre">
          {t("visit_help_centre", "Visit help centre")} <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="privacy-note">
        <Icon name="shield" size={18} />
        <span>{t("privacy_protected", "Your information is protected")}</span>
      </div>
    </aside>
  );
}
