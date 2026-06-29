import { useLang } from '../i18n.jsx';

// VAHAN owner/vehicle details panel.
export default function OwnerDetails({ c }) {
  const { t } = useLang();
  const Cell = ({ label, value }) => (
    <div>
      <div className="text-[10px] text-muted2">{label}</div>
      <div className="text-[13px] text-ink font-semibold">{value || '—'}</div>
    </div>
  );
  return (
    <div className="bg-white rounded-xl border border-line p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-semibold text-ink">{t('vehicle_owner')}</h3>
        <span className="text-[9.5px] font-semibold text-navy bg-navy-soft/30 px-2 py-0.5 rounded-full">{t('vahan_verified')}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Cell label={t('owner_name')} value={c.vehicle_owner_name} />
        <Cell label={t('vehicle')} value={c.vehicle_type} />
        <Cell label={t('rto')} value={c.vehicle_owner_address} />
        <Cell label={t('reg_date')} value={c.vehicle_registration_date} />
      </div>
    </div>
  );
}
