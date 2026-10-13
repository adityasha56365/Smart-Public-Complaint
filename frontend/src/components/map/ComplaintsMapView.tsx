import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  createComplaintPinIcon,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  STATUS_COLORS,
} from "./leafletConfig";
import { complaintService } from "../../services/services";
import type { Complaint, ComplaintStatus } from "../../types";

interface ComplaintsMapViewProps {
  initialComplaints?: Complaint[];
  onSelectComplaint?: (complaintId: number) => void;
  height?: string | number;
  showFilters?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

// Controller to auto-fit bounds around all active complaint markers
function MapBoundsFitter({
  markers,
}: {
  markers: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;
    try {
      if (markers.length === 1) {
        map.flyTo([markers[0].lat, markers[0].lng], 15, { duration: 0.8 });
      } else {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    } catch {
      // Ignore fitBounds errors during unmount/init
    }
  }, [markers, map]);

  return null;
}

export default function ComplaintsMapView({
  initialComplaints,
  onSelectComplaint,
  height = "520px",
  showFilters = true,
  title,
  subtitle,
  className = "",
}: ComplaintsMapViewProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints || []);
  const [loading, setLoading] = useState<boolean>(!initialComplaints);
  const [error, setError] = useState<string>("");
  const [tileError, setTileError] = useState<boolean>(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch complaints from FastAPI if not supplied
  useEffect(() => {
    if (initialComplaints) {
      setComplaints(initialComplaints);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    complaintService
      .list({ page: 1, page_size: 150 })
      .then((res) => {
        if (isMounted) {
          setComplaints(res.items);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const detail = err.response?.data?.detail;
          const msg =
            typeof detail === "string"
              ? detail
              : Array.isArray(detail)
              ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
              : "Could not load complaints from server. Please check your network connection.";
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialComplaints]);

  // Filter complaints having valid coordinates
  const mappedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (c.location_lat == null || c.location_lng == null) return false;
      const lat = Number(c.location_lat);
      const lng = Number(c.location_lng);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
  }, [complaints]);

  // Derived categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      if (c.category_name) set.add(c.category_name);
    });
    return Array.from(set);
  }, [complaints]);

  // Filtered complaints for markers
  const filteredComplaints = useMemo(() => {
    return mappedComplaints.filter((c) => {
      if (categoryFilter && c.category_name !== categoryFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(query);
        const matchesRef = c.reference_number.toLowerCase().includes(query);
        const matchesAddress = (c.location_address || "").toLowerCase().includes(query);
        const matchesLandmark = (c.location_landmark || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesRef && !matchesAddress && !matchesLandmark) {
          return false;
        }
      }
      return true;
    });
  }, [mappedComplaints, categoryFilter, statusFilter, searchQuery]);

  // Calculate coordinates array for bounding box
  const markerPoints = useMemo(() => {
    return filteredComplaints.map((c) => ({
      lat: Number(c.location_lat),
      lng: Number(c.location_lng),
    }));
  }, [filteredComplaints]);

  // Map center: center of markers or default
  const defaultCenter = useMemo<[number, number]>(() => {
    if (markerPoints.length > 0) {
      return [markerPoints[0].lat, markerPoints[0].lng];
    }
    return DEFAULT_MAP_CENTER;
  }, [markerPoints]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header and Filter Controls */}
      {showFilters && (
        <div className="space-y-2">
          {(title || subtitle) && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                {title && <h2 className="text-base font-bold text-slate-800">{title}</h2>}
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
              </div>
              <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                <span className="font-bold text-teal-700">{filteredComplaints.length}</span> complaints on map
                {complaints.length > mappedComplaints.length && (
                  <span className="text-slate-400 text-[11px] ml-1">
                    ({complaints.length - mappedComplaints.length} without coordinates)
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                placeholder="Search reference, title or street..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {(categoryFilter || statusFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("");
                  setStatusFilter("");
                  setSearchQuery("");
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              complaintService
                .list({ page: 1, page_size: 150 })
                .then((r) => setComplaints(r.items))
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
            className="font-semibold underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Map Container */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-7 w-7 text-teal-700" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-semibold text-slate-700">Loading map & live complaints...</span>
          </div>
        )}

        {tileError && (
          <div className="absolute top-2 left-2 z-20 p-2 text-xs rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            Map tiles could not be fetched.
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", zIndex: 1 }}
        >
          <TileLayer
            url={OSM_TILE_URL}
            attribution={OSM_ATTRIBUTION}
            eventHandlers={{
              tileerror: () => setTileError(true),
            }}
          />

          <MapBoundsFitter markers={markerPoints} />

          {/* Render real complaint markers */}
          {filteredComplaints.map((c) => {
            const lat = Number(c.location_lat);
            const lng = Number(c.location_lng);
            const icon = createComplaintPinIcon(c.status, c.category_name);
            const statusConfig = STATUS_COLORS[c.status] || {
              bg: "#ccfbf1",
              border: "#087f8c",
              text: "#0f766e",
            };

            return (
              <Marker key={c.id} position={[lat, lng]} icon={icon}>
                <Popup className="complaint-leaflet-popup">
                  <div className="p-1 max-w-[260px] text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="font-mono font-bold text-slate-900 text-[11px]">
                        {c.reference_number}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                          border: `1px solid ${statusConfig.border}`,
                        }}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug">{c.title}</h4>
                      {c.category_name && (
                        <span className="inline-block text-[11px] font-medium text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded mt-1">
                          {c.category_name}
                        </span>
                      )}
                    </div>

                    {(c.location_address || c.location_landmark) && (
                      <div className="text-[11px] text-slate-600 flex items-start gap-1">
                        <span className="text-slate-400">📍</span>
                        <span className="truncate">
                          {c.location_address || c.location_landmark}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                      <span>
                        Priority: <strong className="capitalize">{c.priority}</strong>
                      </span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>

                    {onSelectComplaint && (
                      <button
                        type="button"
                        onClick={() => onSelectComplaint(c.id)}
                        className="w-full mt-1 py-1 px-2 text-[11px] font-semibold text-center rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        View Full Complaint →
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-lg border border-slate-200 shadow-md text-[11px] flex flex-wrap items-center gap-3 pointer-events-auto">
          <span className="font-semibold text-slate-700">Status:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Submitted</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
            <span>In Progress</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Assigned</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
            <span>Resolved</span>
          </span>
        </div>

        {/* Empty state overlay when no complaints matched */}
        {!loading && filteredComplaints.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-xs px-4 py-2 rounded-lg border border-slate-200 shadow-md text-xs text-slate-700">
            {mappedComplaints.length === 0
              ? "No complaints with GPS coordinates found yet. New complaints will appear here."
              : "No complaints match current filters."}
          </div>
        )}
      </div>
    </div>
  );
}
