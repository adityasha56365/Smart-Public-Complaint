import Icon from "../common/Icon";
import { transportNav } from "./TransportSidebar";
import { useAuth } from "../../hooks/useAuth";

export default function TransportTopbar({
  active,
  onMenu,
}: {
  active: string;
  onMenu: () => void;
}) {
  const { user } = useAuth();
  const allItems = transportNav.reduce<Array<readonly [string, string, string]>>(
    (acc, g) => [...acc, ...g.items],
    []
  );
  const title = allItems.find((i) => i[0] === active)?.[1] || "Dashboard Overview";

  const initials =
    user?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "TA";

  return (
    <header className="admin-topbar">
      <div className="admin-crumb">
        <button className="admin-menu" onClick={onMenu} type="button">
          <Icon name="more" />
        </button>
        <span>Transport Administration</span>
        <b>/</b>
        <strong>{title}</strong>
      </div>
      <div className="admin-search">
        <Icon name="search" />
        <input placeholder="Search Challan No, Vehicle Plate, or Reference ID..." />
      </div>
      <div className="admin-top-actions">
        <button className="bell-button" type="button" title="Notifications">
          <Icon name="bell" />
          <span></span>
        </button>
        <div className="avatar" style={{ background: "var(--teal)", color: "#fff" }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
