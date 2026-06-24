import { useParams, Link } from 'react-router-dom';
import { challanPdfUrl } from '../api/client';

export default function ChallanView() {
  const { num } = useParams();
  const url = challanPdfUrl(num);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link to="/" className="text-sm text-gov-blue hover:underline">← Back to queue</Link>
        <div className="flex gap-3">
          <a href={url} download className="bg-gov-blue text-white px-4 py-2 rounded text-sm">Download</a>
          <a href={url} target="_blank" rel="noreferrer" className="border border-gov-blue text-gov-blue px-4 py-2 rounded text-sm">
            Open / Print
          </a>
        </div>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden" style={{ height: '80vh' }}>
        <iframe title={`Challan ${num}`} src={url} className="w-full h-full" />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Challan <span className="font-mono">{num}</span>. DEMO document — rendered via Puppeteer (or HTML fallback if Chromium is unavailable).
      </p>
    </div>
  );
}
