import React, { useState } from "react";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

interface EditProfileModalProps {
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error") => void;
}

const AVATAR_COLORS = [
  { name: "Teal", bg: "#087f8c", color: "#ffffff" },
  { name: "Navy", bg: "#17324d", color: "#ffffff" },
  { name: "Emerald", bg: "#23845b", color: "#ffffff" },
  { name: "Royal", bg: "#326cc5", color: "#ffffff" },
  { name: "Berry", bg: "#9b326c", color: "#ffffff" },
  { name: "Amber", bg: "#b7791f", color: "#ffffff" },
];

export default function EditProfileModal({ onClose, onToast }: EditProfileModalProps) {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"general" | "password">("general");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarColor, setAvatarColor] = useState(() => {
    return localStorage.getItem("civicly_avatar_bg") || AVATAR_COLORS[0].bg;
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initials = fullName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please provide a valid full name (minimum 2 characters).");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
      setError("Please enter a valid phone number (digits and optional + prefix).");
      return;
    }

    setLoading(true);
    try {
      const updated = await authService.updateProfile({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      updateUser({
        full_name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
      });

      localStorage.setItem("civicly_avatar_bg", avatarColor);
      onToast("Profile updated successfully!", "success");
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to update profile. Please try again.";
      setError(msg);
      onToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      onToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveTab("general");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to change password. Check current password.";
      setError(msg);
      onToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">ACCOUNT SETTINGS</span>
            <h2 id="edit-profile-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Edit Profile
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          {/* Tabs */}
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === "general" ? "active" : ""}`}
              onClick={() => { setActiveTab("general"); setError(""); }}
            >
              Personal details
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "password" ? "active" : ""}`}
              onClick={() => { setActiveTab("password"); setError(""); }}
            >
              Security &amp; password
            </button>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", color: "var(--error)", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px", border: "1px solid #fee2e2", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {activeTab === "general" ? (
            <form onSubmit={handleSaveProfile} id="profile-form">
              {/* Avatar Preview & Customization */}
              <div style={{ display: "flex", alignItems: "center", gap: "18px", padding: "14px 16px", background: "#f8faf9", borderRadius: "14px", marginBottom: "18px", border: "1px solid var(--border)" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: avatarColor,
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: "18px",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <strong style={{ fontSize: "13px", display: "block", color: "var(--navy)" }}>Profile Avatar Accent</strong>
                  <small style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "8px" }}>Choose badge accent color:</small>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={c.name}
                        onClick={() => setAvatarColor(c.bg)}
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: c.bg,
                          border: avatarColor === c.bg ? "2.5px solid white" : "1px solid rgba(0,0,0,0.1)",
                          outline: avatarColor === c.bg ? "2px solid var(--teal)" : "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <label>
                Full name *
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. priya@example.com"
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </label>

              <div style={{ background: "#edf7f5", borderRadius: "10px", padding: "12px 14px", marginTop: "12px", border: "1px solid #d4eae4", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ color: "var(--teal)", marginTop: "1px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </span>
                <p style={{ margin: 0, fontSize: "11px", color: "#275b52", lineHeight: 1.45 }}>
                  Role: <strong>{user?.role || "Citizen"}</strong>. Account changes are linked to your registered grievance history.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} id="password-form">
              <label>
                Current password *
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current account password"
                  required
                />
              </label>

              <label>
                New password *
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </label>

              <label>
                Confirm new password *
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 16px" }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ border: 0, background: "transparent", color: "var(--teal)", fontSize: "11.5px", fontWeight: 700, padding: 0, display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>
            </form>
          )}
        </div>

        <footer className="settings-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {activeTab === "general" ? (
            <button type="submit" form="profile-form" className="primary-button" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </button>
          ) : (
            <button type="submit" form="password-form" className="primary-button" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
