import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Icon, { IconName } from "../common/Icon";
import Spinner from "../common/Spinner";
import {
  PublicOffice,
  officeService,
  getEstimatedDriveTime,
  getEstimatedWalkTime,
  haversineDistance,
} from "../../services/officeService";
import { OSM_TILE_URL, OSM_ATTRIBUTION } from "../map/leafletConfig";

// Category configurations with theme colors and badges
const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: IconName; color: string; bg: string; badge: string; emoji: string }
> = {
  all: { label: "All Services", icon: "shield", color: "#087f8c", bg: "#f0fdfa", badge: "#0f766e", emoji: "🏛️" },
  police: { label: "Police Stations", icon: "shield", color: "#1e40af", bg: "#eff6ff", badge: "#1d4ed8", emoji: "🚨" },
  municipal: { label: "Municipal Offices", icon: "building", color: "#0f766e", bg: "#f0fdf4", badge: "#047857", emoji: "🏛️" },
  fire: { label: "Fire Stations", icon: "flame", color: "#c2410c", bg: "#fff7ed", badge: "#ea580c", emoji: "🚒" },
  hospital: { label: "Hospitals & Care", icon: "hospital", color: "#be123c", bg: "#fff1f2", badge: "#e11d48", emoji: "🏥" },
  ambulance: { label: "Ambulance Hubs", icon: "alert", color: "#b45309", bg: "#fefce8", badge: "#d97706", emoji: "🚑" },
  government: { label: "Govt / Seva Kendras", icon: "file", color: "#6d28d9", bg: "#f5f3ff", badge: "#7c3aed", emoji: "📑" },
};

// Preset cities for quick testing and zero-effort switching
const CITY_PRESETS = [
  { name: "Live GPS", lat: 0, lng: 0, isGps: true },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, isGps: false },
  { name: "New Delhi", lat: 28.6139, lng: 77.2090, isGps: false },
  { name: "Mumbai", lat: 18.9220, lng: 72.8347, isGps: false },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639, isGps: false },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867, isGps: false },
];

function createOfficePinIcon(category: string, isSelected: boolean): L.DivIcon {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
  const pinColor = cfg.color;
  const size = isSelected ? 42 : 34;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size + 8}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
      transform: ${isSelected ? "scale(1.15)" : "scale(1)"};
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <svg viewBox="0 0 24 32" width="${size}" height="${size + 8}" style="position: absolute; inset: 0;">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.63-5.37-12-12-12z" fill="${pinColor}"/>
        <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
      </svg>
      <div style="
        position: relative;
        z-index: 2;
        font-size: ${isSelected ? "14px" : "12px"};
        margin-top: -6px;
        line-height: 1;
        user-select: none;
      ">${cfg.emoji}</div>
      ${isSelected ? `<div style="position: absolute; top: -6px; right: -6px; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; border: 2px solid white;"></div>` : ""}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-office-pin",
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 6)],
  });
}

function createUserLocationPinIcon(): L.DivIcon {
  const html = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(14, 165, 233, 0.28);
        animation: pulseRadar 2s infinite ease-out;
      "></div>
      <div style="
        position: relative;
        z-index: 2;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #0284c7;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
      <style>
        @keyframes pulseRadar {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-user-radar-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export default function NearestPublicOffices() {
  // State: Coordinates (defaults to central location while GPS resolves)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  });
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>("Detecting your location...");

  // Data & filters
  const initialCached = officeService.getCachedOffices(userLocation.lat, userLocation.lng, "all");
  const [offices, setOffices] = useState<PublicOffice[]>(() => initialCached || []);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOffice, setSelectedOffice] = useState<PublicOffice | null>(null);

  // Map DOM reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // 1. Initial Geolocation Detection
  const detectLocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsLoading(false);
      setLocationName("Bengaluru Metro Area");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGpsActive(true);
        setGpsLoading(false);

        // Reverse geocoding with fast 2s timeout so slow nominatim network never delays UI
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`, {
            headers: { "Accept-Language": "en" },
            signal: controller.signal,
          })
            .then((r) => r.json())
            .then((data) => {
              clearTimeout(timer);
              const suburb =
                data.address?.suburb ||
                data.address?.neighbourhood ||
                data.address?.city_district ||
                data.address?.city ||
                data.address?.town ||
                "Your Area";
              const state = data.address?.state || "";
              setLocationName(state ? `${suburb}, ${state}` : suburb);
            })
            .catch(() => {
              setLocationName(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
            });
        } catch {
          setLocationName(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsActive(false);
        setLocationName("Bengaluru Metro Area");
      },
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 120000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  // 2. Fetch nearest offices whenever location or category changes
  useEffect(() => {
    let isCancelled = false;
    const hit = officeService.getCachedOffices(userLocation.lat, userLocation.lng, selectedCategory);
    if (!hit && offices.length === 0) setLoading(true);

    officeService
      .getNearestOffices(userLocation.lat, userLocation.lng, selectedCategory, 40)
      .then((data) => {
        if (!isCancelled) {
          // Re-calculate live distance to guarantee 100% accuracy from current user coordinates
          const updated = data.map((item) => ({
            ...item,
            distance_km: haversineDistance(userLocation.lat, userLocation.lng, item.lat, item.lng),
            directions_url: `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${item.lat},${item.lng}`,
          }));
          updated.sort((a, b) => a.distance_km - b.distance_km);
          setOffices(updated);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [userLocation, selectedCategory]);

  // 3. Filter offices by search term
  const filteredOffices = useMemo(() => {
    if (!searchQuery.trim()) return offices;
    const q = searchQuery.toLowerCase().trim();
    return offices.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q) ||
        o.category_label.toLowerCase().includes(q) ||
        o.services.some((s) => s.toLowerCase().includes(q))
    );
  }, [offices, searchQuery]);

  // 4. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 5. Update Map Markers & Route when offices or selected office change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Add User Live Location Pin
    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: createUserLocationPinIcon(),
      zIndexOffset: 1000,
    });
    userMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
        <strong style="color: #0284c7; display: flex; align-items: center; gap: 4px;">
          📍 Your Current Location
        </strong>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${locationName}</div>
      </div>
    `);
    markersGroup.addLayer(userMarker);

    // Add Office Markers
    filteredOffices.forEach((office) => {
      const isSelected = selectedOffice?.id === office.id;
      const marker = L.marker([office.lat, office.lng], {
        icon: createOfficePinIcon(office.category, isSelected),
        zIndexOffset: isSelected ? 500 : 100,
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 200px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${CATEGORY_CONFIG[office.category]?.bg || "#eff6ff"}; color: ${CATEGORY_CONFIG[office.category]?.color || "#1e40af"};">
              ${office.category_label}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #087f8c;">
              ${office.distance_km} km away
            </span>
          </div>
          <h4 style="margin: 4px 0 2px; font-size: 13px; font-weight: 700; color: #0f172a;">${office.name}</h4>
          <p style="margin: 0 0 6px; color: #64748b; font-size: 11px;">${office.address}</p>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            ${office.phone ? `<a href="tel:${office.phone}" style="flex: 1; text-align: center; background: #f1f5f9; color: #0f172a; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 600;">📞 Call</a>` : ""}
            <a href="${office.directions_url}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #087f8c; color: #ffffff; text-decoration: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 600;">
              🧭 Directions
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => {
        setSelectedOffice(office);
      });

      markersGroup.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Draw Route Line to selected office
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (selectedOffice) {
      const routeLine = L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [selectedOffice.lat, selectedOffice.lng],
        ],
        {
          color: CATEGORY_CONFIG[selectedOffice.category]?.color || "#087f8c",
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 8",
        }
      ).addTo(map);

      routeLayerRef.current = routeLine;

      // Fit map bounds to view both user and the target office
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [selectedOffice.lat, selectedOffice.lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredOffices, selectedOffice, userLocation, locationName]);

  const handleSelectOffice = (office: PublicOffice) => {
    setSelectedOffice(office);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([office.lat, office.lng], 14, { animate: true });
    }
  };

  const handleCitySelect = (city: typeof CITY_PRESETS[0]) => {
    if (city.isGps) {
      detectLocation();
    } else {
      setUserLocation({ lat: city.lat, lng: city.lng });
      setGpsActive(false);
      setLocationName(`${city.name} Metro Area`);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([city.lat, city.lng], 13);
      }
    }
    setSelectedOffice(null);
  };

  return (
    <div className="nearest-offices-feature" style={{ marginTop: 24, marginBottom: 28 }}>
      {/* Header with Title and Location Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--teal)",
                textTransform: "uppercase",
              }}
            >
              NEARBY CIVIC INFRASTRUCTURE
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                backgroundColor: gpsActive ? "#ecfdf5" : "#f1f5f9",
                color: gpsActive ? "#047857" : "#475569",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: gpsActive ? "#10b981" : "#94a3b8",
                }}
              />
              {gpsActive ? "Live GPS Active" : "Area Selected"}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 2px", color: "var(--text)" }}>
            Nearest Essential Public Offices
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Find, call, and get turn-by-turn directions to police stations, municipal offices, fire stations, hospitals & ambulances near you.
          </p>
        </div>

        {/* Location selector and Locate Me button */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 500,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <Icon name="pin" size={16} />
            <span style={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {locationName}
            </span>
          </div>

          <button
            onClick={detectLocation}
            disabled={gpsLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#087f8c",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            title="Update using your browser GPS"
          >
            {gpsLoading ? (
              <span style={{ display: "inline-block", width: 14, height: 14 }}>
                <Spinner />
              </span>
            ) : (
              <Icon name="navigation" size={15} />
            )}
            <span>{gpsLoading ? "Locating..." : "Locate Me"}</span>
          </button>

          {/* Quick city presets */}
          <select
            onChange={(e) => {
              const preset = CITY_PRESETS.find((p) => p.name === e.target.value);
              if (preset) handleCitySelect(preset);
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              fontSize: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontWeight: 500,
              cursor: "pointer",
            }}
            defaultValue="Bengaluru"
          >
            {CITY_PRESETS.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 11px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? `1.5px solid ${cfg.color}` : "1px solid var(--border)",
                  backgroundColor: isSelected ? cfg.bg : "var(--surface)",
                  color: isSelected ? cfg.color : "var(--text)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? `0 2px 6px ${cfg.color}22` : "none",
                }}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Filter */}
        <div style={{ position: "relative", minWidth: 220 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
            <Icon name="search" size={15} />
          </div>
          <input
            type="text"
            placeholder="Search office or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 32px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
              background: "var(--surface)",
              color: "var(--text)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Main Grid: Interactive Map + Office Cards List */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Interactive Map Container */}
        <div
          style={{
            position: "relative",
            minHeight: 450,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            background: "var(--surface)",
          }}
        >
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 450 }} />

          {/* Floating Map Legend & Selected Office Route Banner */}
          {selectedOffice && (
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                right: 14,
                zIndex: 1000,
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(8px)",
                borderRadius: 10,
                padding: "12px 14px",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    {selectedOffice.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: CATEGORY_CONFIG[selectedOffice.category]?.color || "#087f8c",
                      backgroundColor: CATEGORY_CONFIG[selectedOffice.category]?.bg || "#eff6ff",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {selectedOffice.distance_km} km
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  🚗 {getEstimatedDriveTime(selectedOffice.distance_km)} · 🚶 {getEstimatedWalkTime(selectedOffice.distance_km)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {selectedOffice.phone && (
                  <a
                    href={`tel:${selectedOffice.phone}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: "#f1f5f9",
                      color: "#0f172a",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="phone" size={13} /> Call
                  </a>
                )}
                <a
                  href={selectedOffice.directions_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: "#087f8c",
                    color: "#ffffff",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="navigation" size={13} />
                  Start Navigation
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Office Cards List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: 520,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {loading && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Spinner />
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
                Locating nearest public offices & recalculating distances...
              </p>
            </div>
          )}

          {!loading && filteredOffices.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                backgroundColor: "var(--surface)",
                borderRadius: 12,
                border: "1px dashed var(--border)",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>No offices found</h4>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                Try selecting "All Services" or increasing your search radius.
              </p>
            </div>
          )}

          {!loading &&
            filteredOffices.map((office) => {
              const cfg = CATEGORY_CONFIG[office.category] || CATEGORY_CONFIG.all;
              const isSelected = selectedOffice?.id === office.id;

              return (
                <div
                  key={office.id}
                  onClick={() => handleSelectOffice(office)}
                  style={{
                    backgroundColor: "var(--surface)",
                    borderRadius: 12,
                    border: isSelected ? `2px solid ${cfg.color}` : "1px solid var(--border)",
                    padding: 14,
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? `0 6px 16px ${cfg.color}18`
                      : "0 2px 6px rgba(0,0,0,0.03)",
                    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                  }}
                >
                  {/* Top Bar: Category, Timing status, Distance */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 7px",
                          borderRadius: 4,
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                        }}
                      >
                        {cfg.emoji} {office.category_label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor:
                            office.timing_status.includes("24/7") || office.timing_status.includes("Open")
                              ? "#ecfdf5"
                              : "#fef2f2",
                          color:
                            office.timing_status.includes("24/7") || office.timing_status.includes("Open")
                              ? "#047857"
                              : "#b91c1c",
                        }}
                      >
                        ● {office.timing_status}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: 13, color: "var(--teal)", fontWeight: 800 }}>
                        {office.distance_km} km
                      </strong>
                    </div>
                  </div>

                  {/* Office Name & Address */}
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                      lineHeight: 1.35,
                    }}
                  >
                    {office.name}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ marginTop: 2, flexShrink: 0 }}>
                      <Icon name="pin" size={13} />
                    </span>
                    <span>
                      {office.address}
                      {office.landmark && (
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>
                          {" "}
                          ({office.landmark})
                        </span>
                      )}
                    </span>
                  </p>

                  {/* Services tags */}
                  {office.services && office.services.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      {office.services.slice(0, 3).map((svc, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: "var(--bg)",
                            color: "var(--muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact Buttons & Navigation Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      borderTop: "1px solid var(--border)",
                      paddingTop: 10,
                      marginTop: 6,
                    }}
                  >
                    {/* Phone / Emergency links */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {office.phone && (
                        <a
                          href={`tel:${office.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 9px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: "#f8fafc",
                            color: "#0f172a",
                            border: "1px solid var(--border)",
                            textDecoration: "none",
                            transition: "background 0.15s",
                          }}
                          title={`Call: ${office.phone}`}
                        >
                          <Icon name="phone" size={12} />
                          <span>{office.phone.replace("+91 ", "")}</span>
                        </a>
                      )}
                      {office.emergency_number && (
                        <a
                          href={`tel:${office.emergency_number}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "5px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #fca5a5",
                            textDecoration: "none",
                          }}
                          title={`Direct Emergency Helpline: ${office.emergency_number}`}
                        >
                          🚨 {office.emergency_number}
                        </a>
                      )}
                    </div>

                    {/* Directions link */}
                    <a
                      href={office.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 11px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: "#087f8c",
                        color: "#ffffff",
                        textDecoration: "none",
                        transition: "opacity 0.15s",
                      }}
                    >
                      <Icon name="navigation" size={12} />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
