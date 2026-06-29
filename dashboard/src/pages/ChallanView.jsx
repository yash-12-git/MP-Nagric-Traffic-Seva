import { useParams, Link } from 'react-router-dom';
import { challanPdfUrl } from '../api/client';
import { useLang } from '../i18n.jsx';

export default function ChallanView() {
  const { num } = useParams();
  const { t } = useLang();
  const url = challanPdfUrl(num);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link to="/" className="text-sm text-navy hover:underline">← {t('back_to_queue')}</Link>
        <div className="flex gap-3">
          <a href={url} download className="bg-navy text-white px-4 py-2 rounded-md text-sm">{t('download')}</a>
          <a href={url} target="_blank" rel="noreferrer" className="border border-navy text-navy px-4 py-2 rounded-md text-sm hover:bg-navy/5">
            {t('open_print')}
          </a>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ height: '80vh' }}>
        <iframe title={`Challan ${num}`} src={url} className="w-full h-full" />
      </div>
      <p className="text-xs text-muted2 mt-2">
        {t('challan_issued_label')} <span className="font-semibold">{num}</span> · DEMO document — rendered via Puppeteer (or HTML fallback if Chromium is unavailable).
      </p>
    </div>
  );
}
