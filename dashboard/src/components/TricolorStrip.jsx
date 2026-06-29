// Thin saffron / paper / green accent strip used across headers and documents.
export default function TricolorStrip({ className = '', height = 3 }) {
  return (
    <div className={`flex ${className}`} style={{ height }}>
      <div className="flex-1" style={{ background: '#D97A2B' }} />
      <div className="flex-1" style={{ background: '#F4EEE3' }} />
      <div className="flex-1" style={{ background: '#2E7D52' }} />
    </div>
  );
}
