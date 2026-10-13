import React, { useState } from "react";
import { SUPPORTED_LANGUAGES, LanguageOption } from "../../hooks/usePreferences";

interface LanguageModalProps {
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function LanguageModal({
  currentLanguage,
  onSelectLanguage,
  onClose,
  onToast,
}: LanguageModalProps) {
  const [search, setSearch] = useState("");

  const filtered = SUPPORTED_LANGUAGES.filter(
    l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.region.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (lang: LanguageOption) => {
    onSelectLanguage(lang);
    onToast(`Language updated to ${lang.name} (${lang.nativeName})`);
    onClose();
  };

  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="lang-modal-title">
        <header className="settings-modal-header">
          <div>
            <span className="eyebrow">PREFERENCES</span>
            <h2 id="lang-modal-title" style={{ margin: "2px 0 0", font: "700 18px 'Manrope', sans-serif", color: "var(--navy)" }}>
              Select Language / भाषा चुनें
            </h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div className="settings-modal-body">
          {/* Search Box */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by language or script..."
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "10px",
                border: "1.5px solid var(--border)",
                padding: "0 14px 0 38px",
                fontSize: "12.5px",
                outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: "12px", top: "12px", color: "var(--muted)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
          </div>

          <div className="lang-grid">
            {filtered.map(lang => {
              const isSelected = lang.code === currentLanguage.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-btn ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelect(lang)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isSelected ? "var(--teal)" : "var(--mint)",
                        color: isSelected ? "#ffffff" : "var(--teal)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                    >
                      {lang.code}
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "var(--navy)" }}>
                        {lang.nativeName}
                      </strong>
                      <small style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>
                        {lang.name} • {lang.region}
                      </small>
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: "var(--teal)", marginLeft: "8px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6"/></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
              <p style={{ margin: 0, fontSize: "13px" }}>No matching language found.</p>
            </div>
          )}
        </div>

        <footer className="settings-modal-footer">
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
