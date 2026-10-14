import { useState } from "react";
import Icon from "../../components/common/Icon";
import { getAttachmentUrl } from "../../services/api";
import type { AttachmentOut } from "../../types";

export default function AttachmentGallery({ attachments }: { attachments: AttachmentOut[] }) {
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);
  const [failedIds, setFailedIds] = useState<Record<number, boolean>>({});

  if (!attachments || attachments.length === 0) {
    return (
      <div className="evidence-placeholder" style={{ padding: 18, border: "1px dashed var(--border)", borderRadius: 10, background: "#f9fbfa", textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--muted)" }}>
          <Icon name="camera" size={32} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>No evidence photos attached</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        {attachments.map(att => {
          const displayUrl = att.data_url || getAttachmentUrl(att.url);
          const hasFailed = failedIds[att.id];

          return (
            <div
              key={att.id}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "#f4f8f6",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                type="button"
                onClick={() => setLightbox({ url: displayUrl, type: att.attachment_type, name: att.original_filename })}
                style={{
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                  position: "relative",
                  width: "100%",
                }}
                title={`Click to view ${att.original_filename}`}
              >
                {att.attachment_type === "image" ? (
                  !hasFailed && displayUrl ? (
                    <img
                      src={displayUrl}
                      alt={att.original_filename}
                      onError={() => setFailedIds(prev => ({ ...prev, [att.id]: true }))}
                      style={{ width: "100%", height: 115, objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ height: 115, display: "grid", placeItems: "center", background: "#e8f2ef", color: "var(--teal)" }}>
                      <div style={{ textAlign: "center" }}>
                        <Icon name="camera" size={24} />
                        <span style={{ display: "block", fontSize: 10, fontWeight: 700, marginTop: 4 }}>Evidence Photo</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ height: 115, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--navy)", background: "#e8f2ef" }}>
                    <Icon name="camera" size={28} />
                    <span style={{ fontSize: 9, background: "var(--teal)", color: "white", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>▶ Play video</span>
                  </div>
                )}
              </button>

              <div style={{ padding: "6px 8px", background: "white", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{ fontSize: 10, fontWeight: 600, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "95px" }}
                  title={att.original_filename}
                >
                  {att.original_filename}
                </span>
                <span style={{ fontSize: 9, color: "var(--muted)" }}>
                  {(att.size_bytes / 1024 / 1024).toFixed(1)}M
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div className="modal-wrap" style={{ zIndex: 9999 }}>
          <div className="modal-backdrop" onClick={() => setLightbox(null)} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: "92vw", maxHeight: "90vh", background: "#111", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 2,
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              title="Close preview"
            >
              <Icon name="x" size={16} />
            </button>
            {lightbox.type === "image" ? (
              <img
                src={lightbox.url}
                alt={lightbox.name}
                style={{ maxWidth: "88vw", maxHeight: "82vh", display: "block", objectFit: "contain", margin: "0 auto" }}
              />
            ) : (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: "88vw", maxHeight: "82vh", display: "block" }}>
                <track kind="captions" />
              </video>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.75)", color: "white", fontSize: 12, padding: "9px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📷 {lightbox.name}</span>
              <a
                href={lightbox.url}
                target="_blank"
                rel="noreferrer"
                download={lightbox.name}
                style={{ color: "var(--teal)", textDecoration: "none", fontSize: 11, fontWeight: 700 }}
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
