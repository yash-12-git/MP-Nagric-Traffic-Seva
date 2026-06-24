import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PlateDisplay from '../components/PlateDisplay';
import OwnerDetails from '../components/OwnerDetails';
import VideoPlayer from '../components/VideoPlayer';
import HotspotMap from '../components/HotspotMap';

const REJECT_REASONS = [
  'Evidence unclear / video too short',
  'No violation visible',
  'Plate not readable and officer cannot identify',
  'Duplicate report',
  'Other',
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [violationTypes, setViolationTypes] = useState([]);
  const [plate, setPlate] = useState('');
  const [vtId, setVtId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectOther, setRejectOther] = useState('');

  const load = () => {
    api.caseDetail(id).then((r) => {
      const d = r.data.data;
      setC(d);
      setPlate(d.plate_number || '');
      setVtId(String(d.violation_type_id));
      setNote(d.officer_note || '');
    }).catch(() => setC(false));
  };

  useEffect(() => { load(); api.violationTypes().then((r) => setViolationTypes(r.data.data)).catch(() => {}); /* eslint-disable-next-line */ }, [id]);

  if (c === false) return <div className="text-gray-500">Case not found. <Link to="/" className="text-gov-blue underline">Back to queue</Link></div>;
  if (!c) return <div className="text-gray-500">Loading…</div>;

  const resolved = c.status === 'CHALLAN_ISSUED' || c.status === 'REJECTED';
  const integrity = c.evidence_integrity || {};

  const approve = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.approve(id, { officer_note: note, confirmed_plate: plate, violation_type_id: Number(vtId) });
      setMsg({ type: 'ok', text: `Challan ${r.data.data.challan_number} issued (₹${r.data.data.fine_amount}). ${r.data.data.points_awarded} points awarded to reporter.` });
      load();
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to issue challan' });
    } finally { setBusy(false); }
  };

  const doReject = async () => {
    setBusy(true); setMsg(null);
    try {
      const reason = rejectReason === 'Other' ? (rejectOther || 'Other') : rejectReason;
      await api.reject(id, { rejection_reason: reason, officer_note: note });
      setShowReject(false);
      setMsg({ type: 'ok', text: 'Case rejected.' });
      load();
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Failed to reject case' });
    } finally { setBusy(false); }
  };

  return (
    <div>
      <Link to="/" className="text-sm text-gov-blue hover:underline">← Back to queue</Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
        {/* Left: evidence */}
        <div className="space-y-4">
          <VideoPlayer c={c} />
          <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${integrity.verified ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {integrity.verified ? '🔒 SHA-256 verified ✓' : '⚠️ Evidence hash mismatch'}
            <code className="text-[10px] text-gray-500 truncate">{integrity.storedHash}</code>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Location</h3>
            <p className="text-sm text-gray-600 mb-2">📍 {c.location_address || '—'}</p>
            {c.latitude != null && (
              <HotspotMap points={[{ id: c.id, latitude: c.latitude, longitude: c.longitude, status: c.status, case_number: c.case_number, violation_label: c.violation_label, location_address: c.location_address }]} height={220} zoom={14} />
            )}
          </div>
        </div>

        {/* Right: review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono font-semibold text-gray-800">{c.case_number}</div>
              <div className="text-xs text-gray-500">Reported by {c.reporter_name} · {c.reporter_phone}</div>
            </div>
            <StatusBadge status={c.status} />
          </div>

          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Detected Plate (OCR — editable)</label>
              <div className="flex items-center gap-3">
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  disabled={resolved}
                  className="font-mono font-bold tracking-wider border-2 border-gray-800 rounded px-3 py-1.5 text-lg disabled:bg-gray-100"
                />
                {c.plate_confidence != null && (
                  <span className="text-xs text-gray-500">OCR confidence {Math.round(c.plate_confidence * 100)}%</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Violation Type</label>
              <select value={vtId} onChange={(e) => setVtId(e.target.value)} disabled={resolved}
                className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100">
                {violationTypes.map((v) => <option key={v.id} value={v.id}>{v.label_en} (₹{v.fine_amount})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Officer Notes</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={resolved} rows={3}
                className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                placeholder="e.g. Clear signal jump visible at 00:03" />
            </div>

            {c.reporter_note && (
              <div className="text-sm bg-blue-50 rounded px-3 py-2">
                <span className="text-xs text-blue-500">Reporter note:</span> {c.reporter_note}
              </div>
            )}
          </div>

          <OwnerDetails c={c} />

          {msg && (
            <div className={`rounded px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {resolved ? (
            <div className="bg-gray-50 border rounded-lg p-4 text-sm">
              {c.status === 'CHALLAN_ISSUED' && c.challan ? (
                <div className="flex items-center justify-between">
                  <span>Challan <strong className="font-mono">{c.challan.challan_number}</strong> issued.</span>
                  <Link to={`/challan/${c.challan.challan_number}`} className="bg-gov-green text-white px-3 py-1.5 rounded text-sm">
                    View Challan
                  </Link>
                </div>
              ) : (
                <span className="text-red-700">Rejected: {c.rejection_reason}</span>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={approve} disabled={busy}
                className="flex-1 bg-gov-green text-white font-medium py-2.5 rounded-md hover:opacity-90 disabled:opacity-60">
                {busy ? 'Working…' : 'Issue Challan'}
              </button>
              <button onClick={() => setShowReject(true)} disabled={busy}
                className="flex-1 border-2 border-red-500 text-red-600 font-medium py-2.5 rounded-md hover:bg-red-50 disabled:opacity-60">
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Reject Case</h3>
            <label className="block text-xs text-gray-500 mb-1">Rejection reason (required)</label>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border rounded px-2 py-2 text-sm mb-3">
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {rejectReason === 'Other' && (
              <textarea value={rejectOther} onChange={(e) => setRejectOther(e.target.value)} rows={2}
                placeholder="Describe the reason" className="w-full border rounded px-2 py-1.5 text-sm mb-3" />
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={doReject} disabled={busy}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded disabled:opacity-60">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
