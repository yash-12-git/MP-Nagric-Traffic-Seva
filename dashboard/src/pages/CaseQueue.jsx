import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useLang } from '../i18n.jsx';
import CaseCard from '../components/CaseCard';

export default function CaseQueue() {
  const { t, statusLabel } = useLang();
  const [cases, setCases] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [filters, setFilters] = useState({ status: '', violation_type_id: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ PENDING: 0, UNDER_REVIEW: 0, CHALLAN_ISSUED: 0, REJECTED: 0 });

  const STATUSES = [
    { value: 'PENDING', label: t('pending') },
    { value: 'UNDER_REVIEW', label: t('under_review') },
    { value: 'CHALLAN_ISSUED', label: statusLabel('CHALLAN_ISSUED') },
    { value: 'REJECTED', label: t('rejected_label') },
  ];

  useEffect(() => {
    api.violationTypes().then((r) => setViolationTypes(r.data.data)).catch(() => {});
    // Unfiltered fetch for the stats strip.
    api.cases({ limit: 500 })
      .then((r) => {
        const counts = { PENDING: 0, UNDER_REVIEW: 0, CHALLAN_ISSUED: 0, REJECTED: 0 };
        (r.data.data.cases || []).forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        setStats(counts);
      })
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.cases(params)
      .then((r) => { setCases(r.data.data.cases); setTotal(r.data.data.total); })
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const toggleStatus = (value) => {
    setFilters((f) => ({ ...f, status: f.status === value ? '' : value }));
  };

  const STAT_CARDS = [
    { key: 'PENDING', label: t('pending'), value: stats.PENDING, border: '#9A6512' },
    { key: 'UNDER_REVIEW', label: t('under_review'), value: stats.UNDER_REVIEW, border: '#1C3A57' },
    { key: 'CHALLAN_ISSUED', label: t('challans_issued'), value: stats.CHALLAN_ISSUED, border: '#2E6B4F' },
    { key: 'REJECTED', label: t('rejected_label'), value: stats.REJECTED, border: '#C2554A' },
  ];

  return (
    <div className="space-y-5">
      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {STAT_CARDS.map((s) => (
          <div key={s.key} className="bg-white border border-line rounded-xl px-4 py-3" style={{ borderLeft: `3px solid ${s.border}` }}>
            <div className="text-[11px] text-muted2 font-medium">{s.label}</div>
            <div className="font-serif text-[26px] font-bold text-ink leading-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        <aside className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-line p-4 sticky top-4">
            <h3 className="font-semibold text-ink mb-3 text-sm">{t('filters')}</h3>

            <label className="block text-[10.5px] text-muted2 mb-1.5">{t('status')}</label>
            <div className="flex flex-col gap-1.5 mb-4">
              {STATUSES.map((s) => {
                const checked = filters.status === s.value;
                return (
                  <button key={s.value} onClick={() => toggleStatus(s.value)}
                    className="flex items-center gap-2 text-sm text-body text-left">
                    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center ${checked ? 'bg-navy border-navy' : 'border-line-input'}`}>
                      {checked && <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>

            <label className="block text-[10.5px] text-muted2 mb-1.5">{t('violation_type')}</label>
            <select
              value={filters.violation_type_id}
              onChange={(e) => setFilters((f) => ({ ...f, violation_type_id: e.target.value }))}
              className="w-full bg-white border border-line-input rounded-md px-2 py-1.5 text-sm mb-4"
            >
              <option value="">{t('all_types')}</option>
              {violationTypes.map((v) => <option key={v.id} value={v.id}>{v.label_en}</option>)}
            </select>

            <label className="block text-[10.5px] text-muted2 mb-1.5">{t('from')}</label>
            <input type="date" value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full bg-white border border-line-input rounded-md px-2 py-1.5 text-sm mb-3" />

            <label className="block text-[10.5px] text-muted2 mb-1.5">{t('to')}</label>
            <input type="date" value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full bg-white border border-line-input rounded-md px-2 py-1.5 text-sm mb-4" />

            <button
              onClick={() => setFilters({ status: '', violation_type_id: '', from: '', to: '' })}
              className="text-sm text-navy font-semibold hover:underline"
            >
              {t('clear_filters')}
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[17px] font-semibold text-ink">{t('cases_for_review')}</h2>
            <span className="text-sm text-muted2">{total} {t('cases_count')} · {t('newest_first')}</span>
          </div>
          {loading ? (
            <div className="text-muted2 py-10 text-center">{t('loading_cases')}</div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-line py-12 text-center text-muted2">
              {t('no_cases')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {cases.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
