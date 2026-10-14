import { useEffect, useState } from "react";
import Icon from "./Icon";
import { usePwaInstall } from "../../hooks/usePwaInstall";

/**
 * Clean floating PWA Install Card Popup
 * Matches the reference image:
 * - App Logo with gradient background
 * - App Name & Subtitle ("Install Civicly" / "Smart Public Services")
 * - Concise copy ("Install our app on your device for quick access, full-screen view, and smoother performance.")
 * - "Install Now" (primary button with download icon) and "Later" (dismiss)
 * - Close 'x' icon
 * - Dismissal persisted so it doesn't repeatedly annoy the user if closed
 */
export default function InstallAppPopup() {
  const { isInstalled, isIos, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("civicly_pwa_dismissed") === "true";
  });
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already installed in standalone mode, never show
  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("civicly_pwa_dismissed", "true");
  };

  const handleInstallClick = () => {
    if (isIos) {
      setShowIosGuide(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <div
        className="pwa-install-popup-card"
        role="dialog"
        aria-label="Install App"
        style={{
          position: "fixed",
          bottom: "24px",
          left: "24px",
          zIndex: 1200,
          background: "#ffffff",
          borderRadius: "20px",
          padding: "20px 22px",
          maxWidth: "380px",
          width: "calc(100vw - 32px)",
          boxShadow: "0 20px 50px rgba(23, 50, 77, 0.18), 0 4px 16px rgba(0,0,0,0.06)",
          border: "1px solid rgba(8, 127, 140, 0.12)",
          animation: "pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          color: "#18232d",
        }}
      >
        <style>{`
          @keyframes pwaSlideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @media (max-width: 640px) {
            .pwa-install-popup-card {
              left: 16px !important;
              right: 16px !important;
              bottom: 80px !important; /* Above mobile bottom nav */
              width: auto !important;
              max-width: none !important;
              border-radius: 18px !important;
              padding: 16px 18px !important;
            }
          }
        `}</style>

        {/* Top Header Row with Logo, Title, and Close 'x' */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* App Logo */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #087f8c 0%, #17324d 100%)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(8, 127, 140, 0.25)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "2.5px",
                  height: "22px",
                }}
              >
                <span style={{ width: "3.5px", height: "10px", background: "#ffffff", borderRadius: "2px 2px 0 0" }} />
                <span style={{ width: "3.5px", height: "22px", background: "#ffffff", borderRadius: "2px 2px 0 0" }} />
                <span style={{ width: "3.5px", height: "15px", background: "#ffffff", borderRadius: "2px 2px 0 0" }} />
              </div>
            </div>

            {/* Title & Tagline */}
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#17324d", letterSpacing: "-0.01em" }}>
                Install Civicly
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#65727d", fontWeight: 500 }}>
                Smart Public Grievance Portal
              </p>
            </div>
          </div>

          {/* Close 'x' Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            style={{
              background: "transparent",
              border: 0,
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: 1,
              padding: "4px",
              borderRadius: "6px",
              display: "grid",
              placeItems: "center",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#17324d")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            ✕
          </button>
        </div>

        {/* Informative Description */}
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#475569",
          }}
        >
          Install our app on your device for quick access, full-screen view, and smoother performance.
        </p>

        {/* Action Buttons: "Install Now" (Primary) and "Later" (Secondary) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              flex: 1,
              height: "42px",
              background: "#087f8c",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(8, 127, 140, 0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#066b76";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#087f8c";
              e.currentTarget.style.transform = "none";
            }}
          >
            <Icon name="download" size={16} />
            <span>Install Now</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              height: "42px",
              padding: "0 18px",
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            Later
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal if on Safari iOS */}
      {showIosGuide && (
        <div
          className="modal-scrim"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(9, 27, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1500,
            padding: "16px",
          }}
          onClick={() => setShowIosGuide(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "18px",
              maxWidth: "380px",
              width: "100%",
              padding: "22px 20px",
              boxShadow: "0 25px 60px rgba(23, 50, 77, 0.25)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--navy)", fontWeight: 800 }}>
                Install on iPhone / iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                style={{ background: "transparent", border: 0, fontSize: 18, color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#334155" }}>
              To install this app on iOS Safari:
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", display: "grid", gap: 8 }}>
              <li>
                Tap the <strong>Share</strong> icon in the Safari toolbar.
              </li>
              <li>
                Scroll down and select <strong style={{ color: "var(--teal)" }}>"Add to Home Screen"</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right corner.
              </li>
            </ol>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowIosGuide(false)}
                style={{ minHeight: 36, fontSize: 12, padding: "0 16px" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
