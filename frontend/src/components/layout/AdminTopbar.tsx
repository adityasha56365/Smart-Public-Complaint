import Icon from "../common/Icon";
import { adminNav } from "./AdminSidebar";

export default function AdminTopbar({ active, onMenu }: { active: string; onMenu: () => void }) {
  const allItems = adminNav.reduce<Array<readonly [string, string, string]>>((acc, g) => [...acc, ...g.items], []);
  const title = allItems.find(i => i[0] === active)?.[1] || "Overview";

  return (
    <header className="admin-topbar">
      <div className="admin-crumb">
        <button className="admin-menu" onClick={onMenu}><Icon name="more" /></button>
        <span>Administration</span>
        <b>/</b>
        <strong>{title}</strong>
      </div>
      <div className="admin-search">
        <Icon name="search" />
        <input placeholder="Search complaint ID, title or locality" />
      </div>
      <div className="admin-top-actions">
        <button className="bell-button"><Icon name="bell" /><span></span></button>
        <div className="avatar">RK</div>
      </div>
    </header>
  );
}
