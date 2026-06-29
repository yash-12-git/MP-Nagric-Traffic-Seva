import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLang } from '../i18n.jsx';
import StatusBadge from '../components/StatusBadge';
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
  const { t } = useLang();
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

  if (c === false) return <div className="text-muted2">{t('case_not_found')} <Link to="/" className="text-navy underline">{t('back_to_queue')}</Link></div>;
  if (!c) return <div className="text-muted2">Loading…</div>;

  const resolved = c.status === 'CHALLAN_ISSUED' || c.status === 'REJECTED';
  const integrity = c.evidence_integrity || {};
  const pct = c.plate_confidence != null ? Math.round(c.plate_confidence * 100) : null;

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
      <div className="flex items-center justify-between mb-3">
        <Link to="/" className="text-sm text-navy hover:underline flex items-center gap-1">← {t('back_to_queue')}</Link>
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-[13px] text-ink">{c.case_number}</span>
          <StatusBadge status={c.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: evidence */}
        <div className="space-y-3">
          <VideoPlayer c={c} />
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2.5 border ${integrity.verified ? 'bg-amber-card/40 text-green border-green/30' : 'bg-brick/10 text-brick border-brick/30'}`}
            style={integrity.verified ? { background: '#EAF2EC', borderColor: '#BBD8C5' } : undefined}>
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[12.5px]">{integrity.verified ? t('evidence_verified') : t('evidence_mismatch')}</div>
              <code className="text-[10px] text-muted2 truncate block">{integrity.storedHash} {integrity.verified ? `· ${t('not_tampered')}` : ''}</code>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-line p-4">
            <h3 className="text-[12px] font-semibold text-ink mb-2">{t('location')}</h3>
            <p className="text-sm text-body mb-2">📍 {c.location_address || '—'}</p>
            {c.latitude != null && (
              <HotspotMap points={[{ id: c.id, latitude: c.latitude, longitude: c.longitude, status: c.status, case_number: c.case_number, violation_label: c.violation_label, location_address: c.location_address }]} height={150} zoom={14} />
            )}
          </div>
        </div>

        {/* Right: review */}
        <div className="space-y-3.5">
          <div className="bg-white rounded-xl border border-line p-4 space-y-4">
            <div>
              <label className="block text-[11px] text-muted2 mb-1.5">{t('detected_plate')} <span className="text-faint">· {t('ocr_editable')}</span></label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-stretch border-2 border-ink rounded overflow-hidden font-bold">
                  <span className="bg-[#1B4DA0] text-white text-[10px] flex items-center px-1.5">IND</span>
                  <input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    disabled={resolved}
                    className="font-bold tracking-wider text-lg px-3 py-1.5 w-40 outline-none disabled:bg-gray-100"
                  />
                </span>
                {pct != null && <span className="text-[11px] text-green font-semibold">{t('confidence')} {pct}%</span>}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-muted2 mb-1.5">{t('violation_type')}</label>
              <select value={vtId} onChange={(e) => setVtId(e.target.value)} disabled={resolved}
                className="w-full bg-white border border-line-input rounded-md px-2 py-2 text-sm disabled:bg-gray-100">
                {violationTypes.map((v) => <option key={v.id} value={v.id}>{v.label_en} (₹{v.fine_amount})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-muted2 mb-1.5">{t('officer_note')}</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={resolved} rows={3}
                className="w-full bg-white border border-line-input rounded-md px-2 py-1.5 text-sm disabled:bg-gray-100"
                placeholder={t('note_placeholder')} />
            </div>

            {c.reporter_note && (
              <div className="text-sm bg-navy-soft/15 rounded-md px-3 py-2">
                <span className="text-[11px] text-navy">{t('reporter_note')}:</span> {c.reporter_note}
              </div>
            )}
          </div>

          <OwnerDetails c={c} />

          {msg && (
            <div className={`rounded-md px-3 py-2 text-sm ${msg.type === 'ok' ? 'bg-[#EAF2EC] text-green' : 'bg-brick/10 text-brick'}`}>
              {msg.text}
            </div>
          )}

          {resolved ? (
            <div className="bg-paper-light border border-line rounded-xl p-4 text-sm">
              {c.status === 'CHALLAN_ISSUED' && c.challan ? (
                <div className="flex items-center justify-between">
                  <span>{t('challan_issued_label')} <strong>{c.challan.challan_number}</strong> {t('issued')}.</span>
                  <Link to={`/challan/${c.challan.challan_number}`} className="bg-green text-white px-3 py-1.5 rounded-md text-sm">
                    {t('view_challan')}
                  </Link>
                </div>
              ) : (
                <span className="text-brick">{t('rejected_label')}: {c.rejection_reason}</span>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={approve} disabled={busy}
                className="flex-1 bg-green text-white font-serif font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60">
                {busy ? t('working') : t('issue_challan')}
              </button>
              <button onClick={() => setShowReject(true)} disabled={busy}
                className="flex-1 border-[1.5px] border-brick text-brick font-semibold py-3 rounded-xl hover:bg-brick/5 disabled:opacity-60">
                {t('reject')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-serif font-semibold text-ink mb-3">{t('reject_case')}</h3>
            <label className="block text-[11px] text-muted2 mb-1.5">{t('reject_reason')}</label>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-white border border-line-input rounded-md px-2 py-2 text-sm mb-3">
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {rejectReason === 'Other' && (
              <textarea value={rejectOther} onChange={(e) => setRejectOther(e.target.value)} rows={2}
                placeholder="Describe the reason" className="w-full bg-white border border-line-input rounded-md px-2 py-1.5 text-sm mb-3" />
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm text-muted">{t('cancel')}</button>
              <button onClick={doReject} disabled={busy}
                className="px-4 py-2 text-sm bg-brick text-white rounded-md disabled:opacity-60">{t('confirm_reject')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
