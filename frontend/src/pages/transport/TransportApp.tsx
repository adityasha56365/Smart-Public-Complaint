import { useState } from "react";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import TransportSidebar from "../../components/layout/TransportSidebar";
import TransportTopbar from "../../components/layout/TransportTopbar";
import TransportOverview from "./TransportOverview";
import TransportComplaints from "./TransportComplaints";

export default function TransportApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState("overview");
  const [statusParam, setStatusParam] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (id: string, filter?: string) => {
    setActive(id);
    setStatusParam(filter);
    setMenuOpen(false);
  };

  return (
    <div className={`admin-shell ${menuOpen ? "menu-open" : ""}`}>
      <TransportSidebar
        active={active}
        onChange={(id) => handleNavigate(id)}
        onLogout={onLogout}
      />
      <div className="admin-sidebar-scrim" onClick={() => setMenuOpen(false)}></div>
      <main className="admin-main">
        <TransportTopbar
          active={active}
          onMenu={() => setMenuOpen(!menuOpen)}
        />
        <ErrorBoundary>
          {active === "overview" && (
            <TransportOverview onNavigate={handleNavigate} />
          )}
          {active === "complaints" && (
            <TransportComplaints initialStatusFilter={statusParam} />
          )}
          {active === "pending" && (
            <TransportComplaints initialStatusFilter="submitted" />
          )}
          {active === "under_review" && (
            <TransportComplaints initialStatusFilter="under_review" />
          )}
          {active === "info_requested" && (
            <TransportComplaints initialStatusFilter="awaiting_citizen_info" />
          )}
          {active === "decisions" && (
            <TransportComplaints initialStatusFilter="cancellation_approved" />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
