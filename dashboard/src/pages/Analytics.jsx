import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell,
} from 'recharts';
import { api } from '../api/client';
import { useLang } from '../i18n.jsx';
import HotspotMap from '../components/HotspotMap';

const BAR_COLORS = ['#D97A2B', '#1C3A57', '#1C3A57', '#1C3A57', '#2E6B4F', '#2E6B4F', '#2E6B4F'];
const DOT_COLORS = ['#C2554A', '#D97A2B', '#1C3A57', '#9A6512', '#2E6B4F'];

function StatCard({ label, value, sub, border }) {
  return (
    <div className="flex-1 bg-white border border-line rounded-xl px-4 py-4" style={{ borderLeft: `3px solid ${border}` }}>
      <div className="text-[11px] text-muted2 font-medium uppercase tracking-wide">{label}</div>
      <div className="font-serif text-[30px] font-bold text-ink leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted2 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const { t } = useLang();
  const [overview, setOverview] = useState(null);
  const [violations, setViolations] = useState([]);
  const [timeseries, setTimeseries] = useState([]);
  const [hotspots, setHotspots] = useState([]);

  useEffect(() => {
    api.overview().then((r) => setOverview(r.data.data)).catch(() => {});
    api.violations().then((r) => setViolations(r.data.data)).catch(() => {});
    api.timeseries().then((r) => setTimeseries(r.data.data)).catch(() => {});
    api.hotspots().then((r) => setHotspots(r.data.data)).catch(() => {});
  }, []);

  // Derive a "top locations" ranking from hotspot points grouped by address.
  const topLocations = Object.values(
    hotspots.reduce((acc, p) => {
      const key = p.location_address || `${p.latitude?.toFixed?.(2)}, ${p.longitude?.toFixed?.(2)}`;
      if (!acc[key]) acc[key] = { name: key, count: 0, labels: new Set() };
      acc[key].count += 1;
      if (p.violation_label) acc[key].labels.add(p.violation_label);
      return acc;
    }, {})
  ).map((x) => ({ ...x, labels: [...x.labels].slice(0, 2).join(' · ') }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <h2 className="font-serif text-[22px] font-semibold text-ink">{t('analytics')}</h2>
        <span className="text-[13px] text-muted2 font-medium">{t('analytics_sub')}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-3.5">
        <StatCard label={t('total_cases')} value={overview?.total_cases ?? '—'} border="#1C3A57" />
        <StatCard label={t('challans_issued')} value={overview?.challans_issued ?? '—'} border="#2E6B4F" />
        <StatCard label={t('total_fines')} value={overview ? `₹${Number(overview.total_fines).toLocaleString('en-IN')}` : '—'} border="#D97A2B" />
        <StatCard label={t('avg_resolution')} value={overview ? `${overview.avg_resolution_hours}h` : '—'} border="#9A6512" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-line p-5">
          <h3 className="font-serif text-base font-semibold text-ink mb-4">{t('violations_by_type')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={violations}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE7D8" />
              <XAxis dataKey="label_en" tick={{ fontSize: 10, fill: '#6F6757' }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8a8170' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2D8C6', fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {violations.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-line p-5">
          <h3 className="font-serif text-base font-semibold text-ink mb-4">{t('cases_per_day')} <span className="text-[11px] text-muted2 font-sans font-normal">· {t('last_30_days')}</span></h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE7D8" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8a8170' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8a8170' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2D8C6', fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#D97A2B" strokeWidth={2.5} dot={{ r: 3, fill: '#D97A2B' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-line p-5">
        <h3 className="font-serif text-base font-semibold text-ink mb-3.5">{t('hotspots')}</h3>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <HotspotMap points={hotspots} height={300} />
          </div>
          <div className="lg:w-80 flex-shrink-0">
            <div className="text-[11px] text-muted2 font-semibold uppercase tracking-wide mb-2.5">{t('top_locations')}</div>
            {topLocations.length === 0 ? (
              <div className="text-sm text-muted2">—</div>
            ) : topLocations.map((loc, i) => (
              <div key={loc.name} className="flex items-center gap-3 py-2.5 border-b border-line-soft last:border-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink truncate">{loc.name}</div>
                  {loc.labels && <div className="text-[11px] text-muted2 truncate">{loc.labels}</div>}
                </div>
                <span className="font-serif text-[17px] font-bold" style={{ color: DOT_COLORS[i % DOT_COLORS.length] }}>{loc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
