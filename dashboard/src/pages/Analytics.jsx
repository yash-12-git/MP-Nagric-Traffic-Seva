import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
} from 'recharts';
import { api } from '../api/client';
import HotspotMap from '../components/HotspotMap';

function Metric({ label, value, accent }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}

export default function Analytics() {
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Total Cases" value={overview?.total_cases ?? '—'} accent="#0b3d91" />
        <Metric label="Challans Issued" value={overview?.challans_issued ?? '—'} accent="#2e7d32" />
        <Metric label="Total Fines" value={overview ? `₹${Number(overview.total_fines).toLocaleString('en-IN')}` : '—'} accent="#ff6b00" />
        <Metric label="Avg. Resolution" value={overview ? `${overview.avg_resolution_hours}h` : '—'} accent="#1565c0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Violations by Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={violations}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label_en" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0b3d91" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Cases per Day (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ff6b00" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Violation Hotspots</h3>
        <HotspotMap points={hotspots} height={380} />
      </div>
    </div>
  );
}
