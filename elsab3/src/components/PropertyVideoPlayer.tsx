import React, { useState } from 'react';
import { Play, ExternalLink, Video, VolumeX, Volume2 } from 'lucide-react';
import { getVideoEmbedInfo } from '../utils/helpers';

interface PropertyVideoPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  videoMuted?: boolean;
}

export const PropertyVideoPlayer: React.FC<PropertyVideoPlayerProps> = ({
  videoUrl,
  title = 'فيديو معاينة الشقة',
  className = 'w-full aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-lg',
  autoPlay = false,
  videoMuted = false
}) => {
  const [isMuted, setIsMuted] = useState(videoMuted);
  const embedInfo = getVideoEmbedInfo(videoUrl, isMuted);

  if (!embedInfo) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-stone-900 text-stone-300 text-center ${className}`}>
        <Video size={36} className="text-stone-500 mb-2" />
        <p className="text-xs font-bold">لا يوجد رابط فيديو صالح لهذه الوحدة</p>
      </div>
    );
  }

  // 1. Direct video file (mp4, webm, blob, etc.)
  if (embedInfo.type === 'direct' && embedInfo.src) {
    return (
      <div className={`relative bg-black flex items-center justify-center group ${className}`}>
        <video
          src={embedInfo.src}
          controls
          muted={isMuted}
          autoPlay={autoPlay}
          playsInline
          className="w-full h-full object-contain"
        >
          متصفحك لا يدعم تشغيل هذا الفيديو مباشرة.
        </video>

        {/* Audio Status Overlay / Toggle */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
          {videoMuted ? (
            <span className="bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <VolumeX size={12} className="text-rose-400" />
              <span>فيديو صامت (بدون صوت)</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? (
                <>
                  <VolumeX size={13} className="text-amber-400" />
                  <span className="hidden sm:inline">صامت</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-emerald-400" />
                  <span className="hidden sm:inline">الصوت مفعل</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. YouTube, Google Drive, or Vimeo Embed
  if (embedInfo.embedUrl && (embedInfo.type === 'youtube' || embedInfo.type === 'drive' || embedInfo.type === 'vimeo')) {
    return (
      <div className={`relative bg-black group ${className}`}>
        <iframe
          src={embedInfo.embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        {videoMuted && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <VolumeX size={12} className="text-rose-400" />
              <span>فيديو صامت</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  // 3. Fallback / external link tour
  return (
    <div className={`relative bg-gradient-to-br from-stone-900 via-black to-stone-950 flex flex-col items-center justify-center p-6 text-center text-white ${className}`}>
      <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center mb-3 shadow-lg">
        <Play size={28} className="text-rose-500 fill-rose-500 ml-1" />
      </div>
      <h4 className="text-sm sm:text-base font-bold text-white mb-1">{title}</h4>
      <p className="text-xs text-stone-400 max-w-sm mb-4">
        فيديو أو جولة تفاعلية مسجلة لهذه الوحدة. يمكنك فتح الرابط للمشاهدة فوراً.
      </p>
      <a
        href={embedInfo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
      >
        <ExternalLink size={15} />
        <span>فتح ومشاهدة الفيديو في نافذة جديدة</span>
      </a>
    </div>
  );
};
