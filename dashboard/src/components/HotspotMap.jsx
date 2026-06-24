import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const STATUS_COLOR = {
  PENDING: '#9e9e9e',
  UNDER_REVIEW: '#1565C0',
  CHALLAN_ISSUED: '#2E7D32',
  REJECTED: '#C62828',
};

// Leaflet + OpenStreetMap (no API key). `points` have latitude/longitude/status.
export default function HotspotMap({ points = [], height = 320, center = [23.2599, 77.4126], zoom = 11 }) {
  const valid = points.filter((p) => p.latitude != null && p.longitude != null);
  const focus = valid.length ? [valid[0].latitude, valid[0].longitude] : center;
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border">
      <MapContainer center={focus} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={8}
            pathOptions={{ color: STATUS_COLOR[p.status] || '#555', fillColor: STATUS_COLOR[p.status] || '#555', fillOpacity: 0.7 }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{p.case_number}</strong>
                <br />
                {p.violation_label}
                <br />
                {p.location_address}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
