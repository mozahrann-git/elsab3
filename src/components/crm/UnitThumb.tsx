import React, { useState } from 'react';
import { Play, Image as ImageIcon } from 'lucide-react';
import { thumbUrl } from '../../services/mediaStorage';
import { realImages, videoPosterUrl } from '../../utils/propertyMedia';

/*
  صورة الشقة الصغيرة في الكروت.
  - لو ليها صور: أول صورة حقيقية.
  - لو مفيش صور بس فيه فيديو: لقطة من الفيديو نفسه.
  - لو فيه فيديو (في الحالتين): علامة ▶ صغيرة عشان السيلز يعرف إن جوه فيديو.
  - لو مفيش ولا ده ولا ده: خلفية هادية — مش صورة فيلا ثابتة من النت توهم إنها الشقة.
*/
const poster = (v?: string, w = 400) => {
  const p = videoPosterUrl(v);
  /* Cloudinary: لقطة من الثانية الأولى بدل أول فريم (غالباً أسود) وبحجم الكارت */
  return p.includes('/video/upload/') ? p.replace('/video/upload/', `/video/upload/so_1,w_${w},c_fill,q_auto/`) : p;
};

export const UnitThumb: React.FC<{
  p: { images?: string[]; videoUrl?: string } | undefined;
  w?: number; className?: string; badge?: 'sm' | 'md';
}> = ({ p, w = 400, className = '', badge = 'md' }) => {
  const [bad, setBad] = useState(false);
  const img = p ? realImages(p as any)[0] : '';
  const vid = String(p?.videoUrl || '').trim();
  const src = img ? thumbUrl(img, w) : poster(vid, w);
  const sz = badge === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <div className={`${/\babsolute\b/.test(className) ? '' : 'relative '}overflow-hidden bg-[#EFE8DA] ${className}`}>
      {src && !bad
        ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className="w-full h-full object-cover" />
        : <span className="w-full h-full flex items-center justify-center text-[#C9BFA9]">{vid ? <Play size={20} /> : <ImageIcon size={20} />}</span>}
      {vid && (
        <span className={`absolute bottom-1.5 left-1.5 ${sz} rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center`} aria-label="فيه فيديو">
          <Play size={badge === 'sm' ? 11 : 14} fill="currentColor" className="-mr-px" />
        </span>
      )}
    </div>
  );
};

export default UnitThumb;
