import { useLang } from '../i18n.jsx';

const STATUS_CONFIG = {
  PENDING: { color: '#9A6512', bg: '#FBEBD2' },
  UNDER_REVIEW: { color: '#1C3A57', bg: '#DCE7F2' },
  CHALLAN_ISSUED: { color: '#2E6B4F', bg: '#D8E9DF' },
  REJECTED: { color: '#C2554A', bg: '#F6E2DF' },
};

export const STATUS_BORDER = {
  PENDING: '#9A6512',
  UNDER_REVIEW: '#1C3A57',
  CHALLAN_ISSUED: '#2E6B4F',
  REJECTED: '#C2554A',
};

export default function StatusBadge({ status }) {
  const { statusLabel } = useLang();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {statusLabel(status)}
    </span>
  );
}
