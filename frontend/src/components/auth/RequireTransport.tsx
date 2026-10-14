import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "../common/Spinner";

export default function RequireTransport({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Citizen redirect to home
  if (user?.role === "citizen") return <Navigate to="/" replace />;

  // Regular public complaints staff redirect to admin dashboard
  if (user?.role === "officer" || user?.role === "supervisor") {
    return <Navigate to="/admin" replace />;
  }

  // Only transport personnel or admin
  const isTransport =
    user?.role === "transport_officer" ||
    user?.role === "transport_supervisor" ||
    user?.role === "admin";

  if (!isTransport) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
