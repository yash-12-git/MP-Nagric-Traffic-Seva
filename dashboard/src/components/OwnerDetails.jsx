// VAHAN owner/vehicle details panel.
export default function OwnerDetails({ c }) {
  const Row = ({ label, value }) => (
    <div className="py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-sm text-gray-800">{value || '—'}</div>
    </div>
  );
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700">Vehicle Owner (VAHAN)</h3>
        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">MOCK DATA</span>
      </div>
      <Row label="Owner Name" value={c.vehicle_owner_name} />
      <Row label="Address" value={c.vehicle_owner_address} />
      <Row label="Vehicle Type" value={c.vehicle_type} />
      <Row label="Registration Date" value={c.vehicle_registration_date} />
    </div>
  );
}
