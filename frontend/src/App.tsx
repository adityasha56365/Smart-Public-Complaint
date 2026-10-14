import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { PreferencesProvider } from "./hooks/usePreferences";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";
import RequireTransport from "./components/auth/RequireTransport";
import AuthPage from "./pages/auth/AuthPage";
import CitizenApp from "./pages/citizen/CitizenApp";
import AdminApp from "./pages/admin/AdminApp";
import TransportApp from "./pages/transport/TransportApp";

/**
 * Root Application Routing
 * - /login: Citizen and Staff authentication
 * - /admin/*: Admin portal (requires admin/supervisor/officer role)
 * - /transport-dashboard/*: Transport portal (requires transport_officer/transport_supervisor/admin role)
 * - /*: Citizen portal (requires authenticated user)
 */
function AppRoutes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={
                user.role === "citizen"
                  ? "/"
                  : user.role === "transport_officer" || user.role === "transport_supervisor"
                  ? "/transport-dashboard"
                  : "/admin"
              }
              replace
            />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <AdminApp onLogout={handleLogout} />
          </RequireAdmin>
        }
      />
      <Route
        path="/transport-dashboard/*"
        element={
          <RequireTransport>
            <TransportApp onLogout={handleLogout} />
          </RequireTransport>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <CitizenApp />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <AppRoutes />
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
