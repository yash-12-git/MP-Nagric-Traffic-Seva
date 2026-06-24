import { Link } from 'react-router-dom';
import StatusBadge, { STATUS_BORDER } from './StatusBadge';
import PlateDisplay from './PlateDisplay';
import { thumbnailUrl } from '../api/client';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CaseCard({ c }) {
  return (
    <Link
      to={`/cases/${c.id}`}
      className="flex gap-4 bg-white rounded-lg shadow-sm hover:shadow-md transition p-3 border-l-4"
      style={{ borderColor: STATUS_BORDER[c.status] || '#9e9e9e' }}
    >
      <img
        src={thumbnailUrl(c.id)}
        alt="evidence"
        className="w-28 h-20 object-cover rounded bg-gray-100 flex-shrink-0"
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-gray-800">{c.case_number}</span>
          <StatusBadge status={c.status} />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <PlateDisplay plate={c.plate_number} confidence={c.plate_confidence} small />
          <span className="text-sm text-gray-600">{c.violation_label}</span>
        </div>
        <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
          <span className="truncate">📍 {c.location_address || `${c.latitude?.toFixed?.(3)}, ${c.longitude?.toFixed?.(3)}`}</span>
          <span className="flex-shrink-0">{timeAgo(c.submitted_at)}</span>
        </div>
      </div>
    </Link>
  );
}
