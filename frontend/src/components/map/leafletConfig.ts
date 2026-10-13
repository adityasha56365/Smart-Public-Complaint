import L from "leaflet";

// Leaflet default icon asset fix for Vite/bundlers
const iconDefaultProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
delete iconDefaultProto._getIconUrl;

// Fallback high-resolution SVG data-uri for default marker
const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#087f8c"/>
  <circle cx="12" cy="12" r="5" fill="#ffffff"/>
  <circle cx="12" cy="12" r="2.5" fill="#17324d"/>
</svg>`;

L.Icon.Default.mergeOptions({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(defaultSvg)}`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -34],
});

export const DEFAULT_MAP_CENTER: [number, number] = [12.9716, 77.5946]; // Default metro center (Bengaluru)
export const DEFAULT_MAP_ZOOM = 13;

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Status color mapping matching app tokens
export const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  submitted: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  under_review: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  assigned: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  in_progress: { bg: "#ccfbf1", border: "#087f8c", text: "#0f766e" },
  awaiting_info: { bg: "#f3e8ff", border: "#a855f7", text: "#6b21a8" },
  resolved: { bg: "#dcfce7", border: "#16a34a", text: "#166534" },
  reopened: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  rejected: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" },
  closed: { bg: "#f1f5f9", border: "#64748b", text: "#334155" },
};

/** Create custom HTML pin marker with dynamic color and status icon */
export function createComplaintPinIcon(status: string, categoryName?: string | null): L.DivIcon {
  const color = STATUS_COLORS[status] || { bg: "#ccfbf1", border: "#087f8c", text: "#0f766e" };
  const borderColor = color.border;
  
  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 5px rgba(0,0,0,0.28));
      transition: transform 0.15s ease;
    " class="complaint-marker-pin" title="${categoryName || status}">
      <svg viewBox="0 0 24 32" width="32" height="38" style="position: absolute; inset: 0;">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="${borderColor}"/>
        <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
      </svg>
      <div style="
        position: relative;
        z-index: 2;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background-color: ${borderColor};
        margin-top: -6px;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-leaflet-marker",
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -36],
  });
}

/** Create dynamic draggable picker pin */
export function createPickerPinIcon(): L.DivIcon {
  const html = `
    <div style="
      position: relative;
      width: 36px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      filter: drop-shadow(0 4px 8px rgba(8,127,140,0.45));
    ">
      <svg viewBox="0 0 24 32" width="36" height="44" style="position: absolute; inset: 0;">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="#087f8c"/>
        <circle cx="12" cy="11" r="7" fill="#ffffff"/>
        <circle cx="12" cy="11" r="3.5" fill="#17324d"/>
      </svg>
      <div style="
        position: absolute;
        bottom: -2px;
        width: 14px;
        height: 4px;
        border-radius: 50%;
        background: rgba(0,0,0,0.25);
        filter: blur(1px);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "picker-leaflet-marker",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -42],
  });
}
