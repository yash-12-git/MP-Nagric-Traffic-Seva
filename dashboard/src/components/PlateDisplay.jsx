// Renders a number plate in an Indian-plate style, with an optional OCR
// confidence chip.
export default function PlateDisplay({ plate, confidence, small }) {
  if (!plate) {
    return (
      <span className={`inline-block ${small ? 'text-xs' : 'text-sm'} text-amber-700 bg-amber-50 border border-amber-300 rounded px-2 py-0.5`}>
        No plate · manual entry
      </span>
    );
  }
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const confColor = pct == null ? '' : pct >= 85 ? 'text-green-700' : pct >= 65 ? 'text-amber-600' : 'text-red-600';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`font-mono font-bold tracking-wider bg-white border-2 border-gray-800 rounded ${
          small ? 'text-sm px-1.5 py-0.5' : 'text-xl px-3 py-1'
        }`}
      >
        {plate}
      </span>
      {pct != null && <span className={`text-xs font-medium ${confColor}`}>{pct}%</span>}
    </span>
  );
}
