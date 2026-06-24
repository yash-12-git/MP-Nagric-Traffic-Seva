const STATUS_CONFIG = {
  PENDING: { label: 'Pending Review', color: '#888888', bg: '#F5F5F5' },
  UNDER_REVIEW: { label: 'Under Review', color: '#1565C0', bg: '#E3F2FD' },
  CHALLAN_ISSUED: { label: 'Challan Issued', color: '#2E7D32', bg: '#E8F5E9' },
  REJECTED: { label: 'Rejected', color: '#C62828', bg: '#FFEBEE' },
};

export const STATUS_BORDER = {
  PENDING: '#9e9e9e',
  UNDER_REVIEW: '#1565C0',
  CHALLAN_ISSUED: '#2E7D32',
  REJECTED: '#C62828',
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
