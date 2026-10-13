import ComplaintsMapView from "../../components/map/ComplaintsMapView";

export default function MapPage({ openDetail }: { openDetail?: (id: number) => void }) {
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">COMMUNITY VIEW</span>
          <h2>Issues near you</h2>
          <p>See public reports in your neighbourhood with real-time OpenStreetMap markers.</p>
        </div>
      </div>
      <ComplaintsMapView
        height={560}
        onSelectComplaint={openDetail}
        title="Public Civic Issues Map"
        subtitle="Explore active reports, roads, sanitation, and streetlights in your area"
      />
    </div>
  );
}
