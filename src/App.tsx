import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";
import AuthPage from "./pages/auth/AuthPage";
import CitizenApp from "./pages/citizen/CitizenApp";
import AdminApp from "./pages/admin/AdminApp";

/**
 * Root Application Routing
 * - /login: Citizen and Staff authentication
 * - /admin/*: Admin portal (requires admin/supervisor/officer role)
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
            <Navigate to={user.role === "citizen" ? "/" : "/admin"} replace />
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
