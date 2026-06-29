// Renders a number plate in Indian-plate style (blue IND block + white field),
// with an optional OCR confidence chip.
export default function PlateDisplay({ plate, confidence, small }) {
  if (!plate) {
    return (
      <span className={`inline-block ${small ? 'text-xs' : 'text-sm'} text-amber-fg bg-amber-bg border border-amber-border rounded px-2 py-0.5`}>
        No plate · manual entry
      </span>
    );
  }
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const confColor = pct == null ? '' : pct >= 85 ? 'text-green' : pct >= 65 ? 'text-saffron' : 'text-brick';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-stretch border-[1.5px] border-[#1a1a1a] rounded overflow-hidden font-bold">
        <span className={`bg-[#1B4DA0] text-white flex items-center ${small ? 'text-[7px] px-1' : 'text-[9px] px-1.5'}`}>IND</span>
        <span className={`bg-white text-[#111] tracking-wider ${small ? 'text-[11px] px-1.5 py-0.5' : 'text-base px-2.5 py-1'}`}>{plate}</span>
      </span>
      {pct != null && <span className={`text-[10px] font-semibold ${confColor}`}>OCR {pct}%</span>}
    </span>
  );
}
