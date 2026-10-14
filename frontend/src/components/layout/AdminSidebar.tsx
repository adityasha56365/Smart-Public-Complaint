import { useNavigate } from "react-router-dom";
import Icon, { IconName } from "../common/Icon";
import Brand from "../common/Brand";
import { useAuth } from "../../hooks/useAuth";

export const adminNav = [
  {
    group: "WORKSPACE",
    items: [
      ["overview", "Overview", "home"],
      ["admin-complaints", "Complaint management", "file"],
      ["admin-map", "Live complaint map", "map"],
    ],
  },
  {
    group: "ORGANIZATION",
    items: [
      ["departments", "Departments", "building"],
      ["staff", "Officers & staff", "users"],
      ["citizens", "Citizens & users", "user"],
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      ["escalations", "Escalations & SLA", "alert"],
      ["reports", "Reports & analytics", "chart"],
      ["audit", "Audit logs", "shield"],
    ],
  },
  {
    group: "SYSTEM",
    items: [
      ["admin-settings", "System settings", "settings"],
      ["admin-help", "Help & support", "help"],
    ],
  },
] as const;

export default function AdminSidebar({
  active,
  onChange,
  onLogout,
}: {
  active: string;
  onChange: (id: string) => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = user?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "AD";

  return (
    <aside className="admin-sidebar">
      <Brand />
      <div style={{ padding: "0 14px 12px" }}>
        <button
          type="button"
          onClick={() => navigate("/transport-dashboard")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(55,180,177,0.12)",
            border: "1px solid rgba(55,180,177,0.3)",
            color: "var(--teal)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <Icon name="traffic" size={16} />
          <span>Transport Admin Portal</span>
        </button>
      </div>
      <div className="admin-nav-scroll">
        {adminNav.map(group => (
          <div className="admin-nav-group" key={group.group}>
            <span>{group.group}</span>
            {group.items.map(item => (
              <button
                key={item[0]}
                className={active === item[0] ? "active" : ""}
                onClick={() => onChange(item[0])}
              >
                <Icon name={item[2] as IconName} />
                <b>{item[1]}</b>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="admin-user">
        <div className="avatar">{initials}</div>
        <div>
          <strong>{user?.full_name || "Administrator"}</strong>
          <small>{user?.role || "admin"}</small>
        </div>
        <button onClick={onLogout} aria-label="Log out">
          <Icon name="logout" size={18} />
        </button>
      </div>
    </aside>
  );
}
