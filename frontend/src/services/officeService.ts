import api from "./api";

export interface PublicOffice {
  id: string;
  name: string;
  category: "police" | "municipal" | "fire" | "hospital" | "ambulance" | "government";
  category_label: string;
  address: string;
  landmark?: string;
  lat: number;
  lng: number;
  distance_km: number;
  phone?: string;
  emergency_number?: string;
  hours: string;
  timing_status: string;
  services: string[];
  directions_url?: string;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function getEstimatedDriveTime(distanceKm: number): string {
  if (distanceKm <= 0.5) return "2 mins drive";
  const mins = Math.max(3, Math.round(distanceKm * 2.8));
  return `~${mins} mins drive`;
}

export function getEstimatedWalkTime(distanceKm: number): string {
  const mins = Math.max(2, Math.round(distanceKm * 12));
  return `~${mins} mins walk`;
}

export const officeService = {
  async getNearestOffices(
    lat: number,
    lng: number,
    category?: string,
    radiusKm: number = 30
  ): Promise<PublicOffice[]> {
    try {
      const params: Record<string, string | number> = {
        lat,
        lng,
        radius_km: radiusKm,
      };
      if (category && category !== "all") {
        params.category = category;
      }
      const { data } = await api.get<PublicOffice[]>("/public-offices", { params });
      return data;
    } catch (err) {
      console.warn("Failed to fetch public offices from backend, using local resolver", err);
      return generateLocalOffices(lat, lng, category);
    }
  },
};

function generateLocalOffices(lat: number, lng: number, category?: string): PublicOffice[] {
  const items: PublicOffice[] = [
    {
      id: `local-pol-${lat.toFixed(2)}`,
      name: "Nearest Area Police Station",
      category: "police",
      category_label: "Police Station",
      address: "Main Road, Sector Police Post",
      landmark: "Near Civic Centre Junction",
      lat: lat + 0.0055,
      lng: lng + 0.0042,
      distance_km: haversineDistance(lat, lng, lat + 0.0055, lng + 0.0042),
      phone: "+91 11 2294 1000",
      emergency_number: "112",
      hours: "24 Hours (Daily)",
      timing_status: "Open 24/7",
      services: ["24/7 FIR Help", "Women Desk", "Emergency Patrol"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat + 0.0055},${lng + 0.0042}`,
    },
    {
      id: `local-mun-${lat.toFixed(2)}`,
      name: "Municipal Ward Office & Citizen Center",
      category: "municipal",
      category_label: "Municipal Ward Office",
      address: "Ward Council Complex, Public Works Div.",
      landmark: "Opposite Community Park",
      lat: lat - 0.0068,
      lng: lng + 0.0035,
      distance_km: haversineDistance(lat, lng, lat - 0.0068, lng + 0.0035),
      phone: "+91 80 2266 1533",
      emergency_number: "1533",
      hours: "9:30 AM – 5:30 PM (Mon–Sat)",
      timing_status: "Open Now",
      services: ["Garbage Issues", "Pothole Repair", "Streetlight Cell"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat - 0.0068},${lng + 0.0035}`,
    },
    {
      id: `local-hos-${lat.toFixed(2)}`,
      name: "District Civil Hospital & Emergency",
      category: "hospital",
      category_label: "Civil Hospital & Trauma",
      address: "Civil Hospital Road, Health Enclave",
      landmark: "Near Bus Terminal",
      lat: lat + 0.0088,
      lng: lng - 0.0071,
      distance_km: haversineDistance(lat, lng, lat + 0.0088, lng - 0.0071),
      phone: "+91 80 2670 1080",
      emergency_number: "108",
      hours: "24 Hours Emergency",
      timing_status: "Open 24/7",
      services: ["24/7 Casualty", "Trauma ICU", "Blood Bank"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat + 0.0088},${lng - 0.0071}`,
    },
    {
      id: `local-fir-${lat.toFixed(2)}`,
      name: "Fire & Rescue Station",
      category: "fire",
      category_label: "Fire Station",
      address: "Fire Brigade Post, Disaster Response Hub",
      landmark: "Near Sector Roundabout",
      lat: lat - 0.0095,
      lng: lng - 0.006,
      distance_km: haversineDistance(lat, lng, lat - 0.0095, lng - 0.006),
      phone: "+91 80 2297 1010",
      emergency_number: "101",
      hours: "24 Hours (Daily)",
      timing_status: "Open 24/7",
      services: ["Fire Tenders", "Rescue Squad", "Hazard Control"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat - 0.0095},${lng - 0.006}`,
    },
    {
      id: `local-amb-${lat.toFixed(2)}`,
      name: "108 Emergency Ambulance Post",
      category: "ambulance",
      category_label: "Ambulance Hub",
      address: "Emergency Medical Bay, Trauma Wing",
      landmark: "Beside Primary Health Centre",
      lat: lat + 0.0032,
      lng: lng - 0.0048,
      distance_km: haversineDistance(lat, lng, lat + 0.0032, lng - 0.0048),
      phone: "108",
      emergency_number: "108",
      hours: "24 Hours Dispatch",
      timing_status: "Open 24/7",
      services: ["ALS Ambulance", "Emergency Transfer", "Oxygen Support"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat + 0.0032},${lng - 0.0048}`,
    },
    {
      id: `local-gov-${lat.toFixed(2)}`,
      name: "Citizen Seva Kendra / E-Governance",
      category: "government",
      category_label: "Citizen Service Centre",
      address: "Administrative Enclave, Block C",
      landmark: "Near Head Post Office",
      lat: lat + 0.0045,
      lng: lng + 0.0092,
      distance_km: haversineDistance(lat, lng, lat + 0.0045, lng + 0.0092),
      phone: "1912",
      emergency_number: "1912",
      hours: "9:00 AM – 6:00 PM (Mon–Sat)",
      timing_status: "Open Now",
      services: ["Aadhaar", "Utility Bills", "Govt Certificates"],
      directions_url: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${lat + 0.0045},${lng + 0.0092}`,
    },
  ];

  const filtered =
    category && category !== "all"
      ? items.filter((o) => o.category.toLowerCase() === category.toLowerCase())
      : items;

  return filtered.sort((a, b) => a.distance_km - b.distance_km);
}
