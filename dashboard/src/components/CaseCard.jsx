import { Link } from 'react-router-dom';
import StatusBadge, { STATUS_BORDER } from './StatusBadge';
import PlateDisplay from './PlateDisplay';
import { useLang } from '../i18n.jsx';
import { thumbnailUrl } from '../api/client';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function CaseCard({ c }) {
  const { t } = useLang();
  return (
    <Link
      to={`/cases/${c.id}`}
      className="flex gap-3.5 bg-white rounded-xl border border-line p-3.5 items-center hover:shadow-md transition"
      style={{ borderLeft: `3px solid ${STATUS_BORDER[c.status] || '#9A6512'}` }}
    >
      <img
        src={thumbnailUrl(c.id)}
        alt="evidence"
        className="w-[92px] h-[62px] object-cover rounded-md bg-gradient-to-br from-[#3a4046] to-[#23272b] flex-shrink-0"
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="font-semibold text-[13.5px] text-ink">{c.case_number}</span>
          <StatusBadge status={c.status} />
        </div>
        <div className="flex items-center gap-2.5 mb-1">
          <PlateDisplay plate={c.plate_number} confidence={c.plate_confidence} small />
          <span className="text-[12.5px] text-body font-medium">{c.violation_label}</span>
        </div>
        <div className="text-[11px] text-muted2 truncate">
          📍 {c.location_address || `${c.latitude?.toFixed?.(3)}, ${c.longitude?.toFixed?.(3)}`}
          {c.reporter_name ? ` · ${c.reporter_name} ${t('reported_by')}` : ''}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[11px] text-muted2">{timeAgo(c.submitted_at)}</div>
        <div className="text-[12px] text-navy font-semibold mt-2">{t('review_arrow')}</div>
      </div>
    </Link>
  );
}
