import { useEffect, useState } from 'react';
import { api } from '../api/client';
import CaseCard from '../components/CaseCard';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'CHALLAN_ISSUED', label: 'Challan Issued' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function CaseQueue() {
  const [cases, setCases] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);
  const [filters, setFilters] = useState({ status: '', violation_type_id: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.violationTypes().then((r) => setViolationTypes(r.data.data)).catch(() => {});
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

  return (
    <div className="flex gap-6">
      <aside className="w-60 flex-shrink-0">
        <div className="bg-white rounded-lg border p-4 sticky top-4">
          <h3 className="font-semibold text-gray-700 mb-3">Filters</h3>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm mb-3"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <label className="block text-xs text-gray-500 mb-1">Violation Type</label>
          <select
            value={filters.violation_type_id}
            onChange={(e) => setFilters((f) => ({ ...f, violation_type_id: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm mb-3"
          >
            <option value="">All Types</option>
            {violationTypes.map((v) => <option key={v.id} value={v.id}>{v.label_en}</option>)}
          </select>

          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm mb-3" />

          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm mb-3" />

          <button
            onClick={() => setFilters({ status: '', violation_type_id: '', from: '', to: '' })}
            className="w-full text-sm text-gov-blue hover:underline"
          >
            Clear filters
          </button>
        </div>
      </aside>

      <section className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Case Queue</h2>
          <span className="text-sm text-gray-500">{total} case{total === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <div className="text-gray-500 py-10 text-center">Loading cases…</div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed py-12 text-center text-gray-500">
            No cases match these filters.
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => <CaseCard key={c.id} c={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}
