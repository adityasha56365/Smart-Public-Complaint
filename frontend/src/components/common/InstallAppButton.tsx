import { useState } from "react";
import Icon from "./Icon";
import { usePwaInstall } from "../../hooks/usePwaInstall";

export function InstallInstructionsModal({
  isOpen,
  onClose,
  isIos,
}: {
  isOpen: boolean;
  onClose: () => void;
  isIos: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-scrim"
      style={{
        display: "grid",
        placeItems: "center",
        zIndex: 1500,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          background: "white",
          borderRadius: "18px",
          maxWidth: "440px",
          width: "100%",
          padding: "24px 22px",
          boxShadow: "0 25px 60px rgba(23, 50, 77, 0.25)",
          textAlign: "left",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--teal)",
                color: "white",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="download" size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 800 }}>
                Install Smart Complaint App
              </h3>
              <small style={{ color: "var(--muted)", fontSize: 11 }}>
                {isIos ? "For Apple iOS / Safari" : "For Android & Desktop"}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              fontSize: 18,
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {isIos ? (
          /* iOS Safari Step-by-Step Guidance */
          <div style={{ background: "#f8faf9", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>
              To install this app on your iPhone or iPad:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#334155", display: "grid", gap: 10 }}>
              <li>
                In Safari, tap the <strong>Share</strong> button{" "}
                <span style={{ display: "inline-block", background: "#e2e8f0", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                  [ ⎋ / Share ]
                </span>{" "}
                at the bottom or top of your screen.
              </li>
              <li>
                Scroll down in the share sheet and tap{" "}
                <strong style={{ color: "var(--teal)" }}>"Add to Home Screen" ➕</strong>.
              </li>
              <li>
                Tap <strong style={{ color: "var(--teal)" }}>"Add"</strong> in the top-right corner to finish.
              </li>
            </ol>
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              💡 The app icon will appear on your home screen with instant access, offline caching, and native experience!
            </div>
          </div>
        ) : (
          /* Android / Chrome Guidance */
          <div style={{ background: "#f8faf9", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>
              To install this app on your device:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#334155", display: "grid", gap: 10 }}>
              <li>
                Tap the browser menu button{" "}
                <strong style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 4 }}>⋮</strong> (three dots in Chrome or Edge).
              </li>
              <li>
                Select <strong style={{ color: "var(--teal)" }}>"Install app"</strong> or{" "}
                <strong style={{ color: "var(--teal)" }}>"Add to Home screen"</strong>.
              </li>
              <li>
                Confirm by tapping <strong style={{ color: "var(--teal)" }}>"Install"</strong>.
              </li>
            </ol>
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              ⚡ You'll enjoy full-screen standalone mode, fast loading, and quick access right from your app drawer!
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
            style={{ minHeight: 38, fontSize: 12, padding: "0 18px" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstallAppButton({
  variant = "hero",
  className = "",
}: {
  variant?: "hero" | "topbar" | "compact";
  className?: string;
}) {
  const { isInstalled, isIos, showInstructions, setShowInstructions, promptInstall } =
    usePwaInstall();

  if (isInstalled) {
    return (
      <div
        className={`pwa-installed-badge ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 700,
        }}
        title="Application is already installed on this device"
      >
        <Icon name="check" size={14} /> App Installed
      </div>
    );
  }

  if (variant === "topbar") {
    return (
      <>
        <button
          type="button"
          onClick={promptInstall}
          className={`pwa-install-topbar-btn ${className}`}
          title="Install Smart Public Complaint application on your phone or desktop"
          style={{
            height: 38,
            border: "1px solid var(--teal)",
            background: "#e8f6f5",
            color: "var(--teal)",
            borderRadius: 10,
            padding: "0 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="download" size={15} />
          <span className="install-text">Install App</span>
        </button>

        <InstallInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
          isIos={isIos}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={promptInstall}
        className={`pwa-install-hero-btn primary-button ${className}`}
        title="Install Smart Public Complaint application on your phone"
        style={{
          background: "linear-gradient(135deg, #087f8c 0%, #066b76 100%)",
          color: "white",
          border: "none",
          borderRadius: 10,
          padding: "0 18px",
          minHeight: 44,
          fontSize: 13,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(8, 127, 140, 0.35)",
        }}
      >
        <Icon name="download" size={17} />
        <span>Install App on Phone</span>
      </button>

      <InstallInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        isIos={isIos}
      />
    </>
  );
}
