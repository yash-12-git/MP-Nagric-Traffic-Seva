import { mediaUrl, thumbnailUrl } from '../api/client';

// Renders the evidence: a <video> for videos, an <img> for photos. Demo evidence
// generated without ffmpeg is an SVG "photo", which this handles too.
export default function VideoPlayer({ c }) {
  const isVideo = c.media_type === 'video';
  const src = c.media_path ? mediaUrl(c.media_path) : null;

  return (
    <div className="bg-ink rounded-xl overflow-hidden border border-line">
      {isVideo ? (
        <video src={src} controls poster={thumbnailUrl(c.id)} className="w-full max-h-[420px] bg-black">
          Your browser does not support video playback.
        </video>
      ) : (
        <img src={src || thumbnailUrl(c.id)} alt="evidence" className="w-full max-h-[420px] object-contain bg-black" />
      )}
    </div>
  );
}
