import React, { useEffect } from "react";

export interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "error" | "info";
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      onDismiss(toasts[0].id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
        maxWidth: "380px",
      }}
    >
      {toasts.map(t => {
        const isError = t.type === "error";
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              background: isError ? "#b91c1c" : "var(--navy)",
              color: "#ffffff",
              padding: "12px 18px",
              borderRadius: "12px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "12.5px",
              fontWeight: 600,
              animation: "slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <span style={{ fontSize: "16px", flexShrink: 0 }}>
              {isError ? "⚠️" : "✓"}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              style={{
                border: 0,
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                padding: "2px",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
