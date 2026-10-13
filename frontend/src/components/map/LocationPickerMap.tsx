import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import {
  createPickerPinIcon,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "./leafletConfig";
import type { Coordinates } from "../../types";

interface LocationPickerMapProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
  className?: string;
}

// Controller component to update map view when position changes
function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

// Map event handler for click-to-pick
function MapClickHandler({
  onPick,
}: {
  onPick: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  initialAddress,
  onLocationSelect,
  className = "",
}: LocationPickerMapProps) {
  const hasInitial = initialLat != null && initialLng != null;
  const [position, setPosition] = useState<Coordinates | null>(
    hasInitial ? { lat: initialLat!, lng: initialLng! } : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    hasInitial ? [initialLat!, initialLng!] : DEFAULT_MAP_CENTER
  );
  const [mapZoom, setMapZoom] = useState<number>(hasInitial ? 16 : DEFAULT_MAP_ZOOM);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string>("");
  const [tileError, setTileError] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [reverseAddress, setReverseAddress] = useState<string>(initialAddress || "");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  const markerIcon = useMemo(() => createPickerPinIcon(), []);
  const markerRef = useRef<L.Marker | null>(null);

  // Reverse geocode lat/lng using OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || "";
        if (display) {
          // Truncate to a concise address representation
          const parts = display.split(",").slice(0, 4).join(",").trim();
          setReverseAddress(parts);
          return parts;
        }
      }
    } catch {
      // Fallback silently if offline or Nominatim throttled
    } finally {
      setIsReverseGeocoding(false);
    }
    return undefined;
  }, []);

  // Handle setting new coordinates from click or drag
  const handleCoordsChange = useCallback(
    async (coords: Coordinates, triggerReverse = true) => {
      setPosition(coords);
      setGeoError("");

      let resolvedAddress: string | undefined = undefined;
      if (triggerReverse) {
        resolvedAddress = await reverseGeocode(coords.lat, coords.lng);
      }

      onLocationSelect({
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
        address: resolvedAddress,
      });
    },
    [reverseGeocode, onLocationSelect]
  );

  // Drag end handler on marker
  const handleMarkerDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      handleCoordsChange({ lat: latlng.lat, lng: latlng.lng }, true);
    }
  }, [handleCoordsChange]);

  // "Use My Current Location" via HTML5 Geolocation API
  const handleGetCurrentLocation = useCallback(() => {
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const newCoords: Coordinates = { lat: latitude, lng: longitude };
        setMapCenter([latitude, longitude]);
        setMapZoom(17);
        await handleCoordsChange(newCoords, true);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location permission was denied. Please allow access or click the map directly.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Location unavailable. Please select your position on the map.");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out. Please click your location on the map.");
            break;
          default:
            setGeoError("Could not retrieve location. Please click on the map.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [handleCoordsChange]);

  // Search location on OpenStreetMap Nominatim
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: { "Accept-Language": "en" },
        }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          const coords = { lat, lng };
          setMapCenter([lat, lng]);
          setMapZoom(16);
          setReverseAddress(results[0].display_name);
          handleCoordsChange(coords, false);
        } else {
          setGeoError("No location found for this search. Try dragging the pin on the map.");
        }
      }
    } catch {
      setGeoError("Search service unavailable. Please click your location directly on the map.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search & Geolocation Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchLocation} className="flex-1 min-w-[220px] flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search area, street, or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 placeholder:text-slate-400"
            />
            {isSearching && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-teal-600 font-medium">
                Searching...
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </form>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
        >
          {isLocating ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-teal-700" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              <span>Use My Current Location</span>
            </>
          )}
        </button>
      </div>

      {/* Geolocation / Tile error alerts */}
      {geoError && (
        <div className="p-2.5 text-xs rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-start gap-2">
          <span className="text-amber-600 font-bold">!</span>
          <span>{geoError}</span>
        </div>
      )}

      {tileError && (
        <div className="p-2 text-xs rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
          Map tiles could not be loaded. You can still click to set coordinates manually.
        </div>
      )}

      {/* Leaflet Map Frame */}
      <div className="relative w-full h-[280px] rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
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

          <MapViewUpdater center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onPick={(c) => handleCoordsChange(c, true)} />

          {position && (
            <Marker
              position={[position.lat, position.lng]}
              icon={markerIcon}
              draggable={true}
              ref={markerRef}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            />
          )}
        </MapContainer>

        {/* Map interaction overlay tip */}
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700 shadow-xs border border-slate-200 flex items-center gap-1.5 pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>Click anywhere or drag marker to set exact spot</span>
        </div>
      </div>

      {/* Selected Coordinates & Address Feedback Card */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Selected Coordinates:</span>
            {position ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-teal-800 bg-teal-100 font-semibold">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </span>
            ) : (
              <span className="text-amber-700 italic">No point picked yet (click on map)</span>
            )}
          </div>
          {reverseAddress && (
            <p className="text-slate-600 truncate max-w-[450px]">
              <span className="font-medium text-slate-500">Address estimate: </span>
              {reverseAddress}
            </p>
          )}
          {isReverseGeocoding && (
            <span className="text-[10px] text-teal-600 animate-pulse">Resolving street address...</span>
          )}
        </div>

        {position && (
          <button
            type="button"
            onClick={() => {
              setPosition(null);
              setReverseAddress("");
              onLocationSelect({ lat: 0, lng: 0, address: "" });
            }}
            className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
          >
            Clear pin
          </button>
        )}
      </div>
    </div>
  );
}
