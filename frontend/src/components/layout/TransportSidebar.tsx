import { useNavigate } from "react-router-dom";
import Icon, { IconName } from "../common/Icon";
import Brand from "../common/Brand";
import { useAuth } from "../../hooks/useAuth";

export const transportNav = [
  {
    group: "CHALLAN WORKSPACE",
    items: [
      ["overview", "Dashboard Overview", "home"],
      ["complaints", "All Challan Disputes", "traffic"],
      ["pending", "Pending Reviews", "clock"],
      ["under_review", "Under Review", "eye"],
    ],
  },
  {
    group: "ACTIONS & DECISIONS",
    items: [
      ["info_requested", "Additional Info Awaiting", "alert"],
      ["decisions", "Decisions Issued", "check"],
    ],
  },
] as const;

export default function TransportSidebar({
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
  const initials =
    user?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "TA";

  const roleTitle =
    user?.role === "admin"
      ? "Super Administrator"
      : "Transport Admin";

  return (
    <aside className="admin-sidebar" style={{ background: "#0e2433" }}>
      <Brand />
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            display: "inline-block",
            background: "rgba(55,180,177,0.18)",
            color: "var(--teal)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.5,
            textAlign: "center",
          }}
        >
          TRANSPORT ADMIN PORTAL
        </span>

        {user?.role === "admin" && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#e2e8f0",
              fontSize: 11,
              padding: "6px 10px",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
            }}
          >
            <Icon name="home" size={14} />
            <span>Public Admin Dashboard</span>
          </button>
        )}
      </div>

      <div className="admin-nav-scroll">
        {transportNav.map((group) => (
          <div className="admin-nav-group" key={group.group}>
            <span>{group.group}</span>
            {group.items.map((item) => (
              <button
                key={item[0]}
                className={active === item[0] ? "active" : ""}
                onClick={() => onChange(item[0])}
                type="button"
              >
                <Icon name={item[2] as IconName} />
                <b>{item[1]}</b>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="admin-user">
        <div className="avatar" style={{ background: "var(--teal)", color: "white" }}>
          {initials}
        </div>
        <div>
          <strong>{user?.full_name || "Transport Officer"}</strong>
          <small>{roleTitle}</small>
        </div>
        <button type="button" onClick={onLogout} title="Log out" aria-label="Log out">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
