import { useState } from "react";
import Icon from "../common/Icon";
import { transportNav } from "./TransportSidebar";
import { useAuth } from "../../hooks/useAuth";

export default function TransportTopbar({
  active,
  onMenu,
  onSearch,
}: {
  active: string;
  onMenu: () => void;
  onSearch?: (query: string) => void;
}) {
  const { user } = useAuth();
  const [searchVal, setSearchVal] = useState("");

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(searchVal.trim());
    }
  };

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

      <div className="admin-search" style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => onSearch && onSearch(searchVal.trim())}
          style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}
          title="Search"
        >
          <Icon name="search" />
        </button>
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search Challan No, Vehicle Plate, or Reference ID... (Press Enter)"
        />
        {searchVal && (
          <button
            type="button"
            onClick={() => {
              setSearchVal("");
              if (onSearch) onSearch("");
            }}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 12,
              padding: "0 4px",
            }}
            title="Clear"
          >
            ×
          </button>
        )}
      </div>

      <div className="admin-top-actions">
        <button className="bell-button" type="button" title="Live System Alerts">
          <Icon name="bell" />
          <span style={{ background: "var(--teal)" }}></span>
        </button>
        <div className="avatar" style={{ background: "var(--teal)", color: "#fff", fontWeight: 700 }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
