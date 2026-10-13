import Icon, { IconName } from "../common/Icon";
import Brand from "../common/Brand";

export const navItems = [
  { id: "home", label: "Home", icon: "home" as IconName },
  { id: "complaints", label: "My complaints", icon: "file" as IconName },
  { id: "map", label: "Nearby issues", icon: "map" as IconName },
  { id: "notifications", label: "Notifications", icon: "bell" as IconName },
  { id: "profile", label: "Profile", icon: "user" as IconName },
];

export default function Sidebar({
  active,
  onChange,
  unreadCount,
}: {
  active: string;
  onChange: (id: string) => void;
  unreadCount: number;
}) {
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
            <span>{item.label}</span>
            {item.id === "notifications" && unreadCount > 0 && <i>{unreadCount}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-help">
        <Icon name="help" />
        <strong>Need help?</strong>
        <p>Find answers or speak with our support team.</p>
        <button>Visit help centre <Icon name="arrow" size={16} /></button>
      </div>
      <div className="privacy-note">
        <Icon name="shield" size={18} />
        <span>Your information is protected</span>
      </div>
    </aside>
  );
}
