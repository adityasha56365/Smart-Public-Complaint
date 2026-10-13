import React from "react";
import { AccessibilitySettings } from "../../hooks/usePreferences";

interface AccessibilityModalProps {
  settings: AccessibilitySettings;
  onUpdate: (patch: Partial<AccessibilitySettings>) => void;
  onReset: () => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const FONT_SCALES = [
  { label: "Small", percent: 85, example: "Aa" },
  { label: "Default", percent: 100, example: "Aa" },
  { label: "Large", percent: 115, example: "Aa" },
  { label: "Extra Large", percent: 130, example: "Aa" },
];

export default function AccessibilityModal({
  settings,
  onUpdate,
  onReset,
  onClose,
  onToast,
}: AccessibilityModalProps) {
  const handleScaleChange = (percent: number) => {
    onUpdate({ fontSizePercent: percent });
    onToast(`Text scale set to ${percent}%`);
  };

  const handleContrastToggle = () => {
    const next = !settings.highContrast;
    onUpdate({ highContrast: next });
    onToast(next ? "High contrast mode enabled." : "High contrast mode disabled.");
  };

  const handleMotionToggle = () => {
    const next = !settings.reduceMotion;
    onUpdate({ reduceMotion: next });
    onToast(next ? "Reduced motion enabled." : "Standard motion enabled.");
  };

  const handleThemeChange = (theme: "light" | "dark") => {
    onUpdate({ theme });
    onToast(`Theme set to ${theme === "dark" ? "Dark Mode" : "Light Mode"}`);
  };

  const handleReset = () => {
    onReset();
    onToast("Accessibility settings reset to default values.");
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="access-modal-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">INCLUSIVE ACCESS</span>
            <h2 id="access-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Accessibility &amp; Display
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          {/* Text Size Scaling */}
          <div style={{ marginBottom: "24px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Text Size &amp; Typography Scale
            </span>
            <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--muted)" }}>
              Adjusts the overall text reading size across the entire application interface.
            </p>

            <div className="font-scale-group">
              {FONT_SCALES.map(s => {
                const isActive = settings.fontSizePercent === s.percent;
                return (
                  <button
                    key={s.percent}
                    type="button"
                    className={`font-scale-btn ${isActive ? "active" : ""}`}
                    onClick={() => handleScaleChange(s.percent)}
                  >
                    <span style={{ fontSize: `${s.percent * 0.13}px`, display: "block", marginBottom: "4px" }}>
                      {s.example}
                    </span>
                    <span>{s.label}</span>
                    <small style={{ display: "block", fontSize: "10px", color: isActive ? "var(--teal)" : "var(--muted)", marginTop: "2px" }}>
                      {s.percent}%
                    </small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual & Motion Controls */}
          <div style={{ marginBottom: "24px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Visual &amp; Motion Ergonomics
            </span>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>High Contrast Display</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Enhance borders, text sharpness, and color contrast for optimal legibility.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${settings.highContrast ? "active" : ""}`}
                onClick={handleContrastToggle}
                aria-pressed={settings.highContrast}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="toggle-row">
              <div>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>Reduce Motion &amp; Animations</strong>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>Minimize sliding transitions and continuous UI animations.</small>
              </div>
              <button
                type="button"
                className={`toggle-switch ${settings.reduceMotion ? "active" : ""}`}
                onClick={handleMotionToggle}
                aria-pressed={settings.reduceMotion}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Theme Color Mode */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Theme Appearance
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: settings.theme === "light" ? "2px solid var(--teal)" : "1px solid var(--border)",
                  background: settings.theme === "light" ? "#f1f8f6" : "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "18px" }}>☀️</span>
                <div>
                  <strong style={{ display: "block", fontSize: "12.5px", color: "var(--navy)" }}>Light Mode</strong>
                  <small style={{ fontSize: "10px", color: "var(--muted)" }}>Crisp civic light theme</small>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: settings.theme === "dark" ? "2px solid var(--teal)" : "1px solid var(--border)",
                  background: settings.theme === "dark" ? "#1e293b" : "#ffffff",
                  color: settings.theme === "dark" ? "#ffffff" : "var(--navy)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "18px" }}>🌙</span>
                <div>
                  <strong style={{ display: "block", fontSize: "12.5px", color: settings.theme === "dark" ? "#ffffff" : "var(--navy)" }}>Dark Mode</strong>
                  <small style={{ fontSize: "10px", color: settings.theme === "dark" ? "#94a3b8" : "var(--muted)" }}>Eye-comfort dark theme</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <footer className="settings-modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
            style={{ marginRight: "auto" }}
          >
            Reset defaults
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
