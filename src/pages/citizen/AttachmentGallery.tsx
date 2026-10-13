import { useState } from "react";
import Icon from "../../components/common/Icon";
import type { AttachmentOut } from "../../types";

export default function AttachmentGallery({ attachments }: { attachments: AttachmentOut[] }) {
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);

  if (attachments.length === 0) {
    return (
      <div className="evidence-placeholder">
        <div>
          <Icon name="camera" size={38} />
          <span>No evidence attached</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 16 }}>
        {attachments.map(att => (
          <button
            key={att.id}
            type="button"
            onClick={() => setLightbox({ url: att.url || "", type: att.attachment_type, name: att.original_filename })}
            style={{ border: 0, padding: 0, borderRadius: 8, overflow: "hidden", cursor: "pointer", position: "relative", background: "#e9efe9" }}
            title={att.original_filename}
          >
            {att.attachment_type === "image" ? (
              att.url ? (
                <img src={att.url} alt={att.original_filename} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              ) : (
                <div className="evidence-placeholder" style={{ height: 110 }}>
                  <div><Icon name="camera" size={22} /><span>Image</span></div>
                </div>
              )
            ) : (
              <div style={{ height: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--navy)" }}>
                <Icon name="camera" size={28} />
                <span style={{ fontSize: 9, fontWeight: 700, padding: "0 6px", textAlign: "center", wordBreak: "break-all" }}>{att.original_filename}</span>
                <span style={{ fontSize: 8, background: "var(--teal)", color: "white", borderRadius: 4, padding: "2px 6px" }}>▶ Play video</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="modal-wrap" style={{ zIndex: 200 }}>
          <div className="modal-backdrop" onClick={() => setLightbox(null)} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: "90vw", maxHeight: "90vh", background: "#000", borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => setLightbox(null)}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(0,0,0,.6)", border: 0, color: "white", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}
            >
              ✕
            </button>
            {lightbox.type === "image" ? (
              <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "88vw", maxHeight: "85vh", display: "block", objectFit: "contain" }} />
            ) : (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: "88vw", maxHeight: "85vh", display: "block" }}>
                <track kind="captions" />
              </video>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.55)", color: "white", fontSize: 11, padding: "7px 14px" }}>
              {lightbox.name}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
