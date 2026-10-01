import React, { useState } from 'react';
import { Copy, Check, Download, Share2, Film } from 'lucide-react';
import { copyText, downloadAll, downloadFile, nativeShare } from '../utils/shareKit';

/*
  شريط المشاركة: بيتحط تحت الشقة والمشروع.

  الفكرة: السيلز يبعت للعميل على الواتساب مباشرة — النص منسوخ،
  والصور والفيديو منزّلين على الموبايل. من غير ما يبعت لينك.
*/

interface Props {
  text: string;                 // النص الجاهز للصق
  images?: string[];
  videoUrl?: string;
  baseName: string;             // اسم الملفات المنزّلة (الكود مثلاً)
  title?: string;
}

export const ShareBar: React.FC<Props> = ({ text, images = [], videoUrl, baseName, title }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');

  const pics = images.filter(Boolean);
  const hasVideo = !!(videoUrl || '').trim();

  const doCopy = async () => {
    const ok = await copyText(text);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2500);
    if (!ok) window.prompt('انسخ النص من هنا:', text);
  };

  const doShare = async () => {
    const ok = await nativeShare(text, title);
    if (!ok) doCopy();            // الجهاز مش بيدعم المشاركة → بننسخ
  };

  const doImages = async () => {
    setBusy('pics');
    try {
      await downloadAll(pics, baseName, (d, t) => setBusy(`pics:${d}/${t}`));
    } finally {
      setBusy('');
    }
  };

  const doVideo = async () => {
    if (!videoUrl) return;
    setBusy('video');
    try {
      await downloadFile(videoUrl, `${baseName}-video.mp4`);
    } finally {
      setBusy('');
    }
  };

  const picsLabel = busy.startsWith('pics:')
    ? `بينزّل ${busy.split(':')[1]}`
    : busy === 'pics'
      ? 'بينزّل...'
      : `نزّل الصور (${pics.length})`;

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 space-y-2.5">
      <p className="text-[11px] text-[#6B665C] leading-relaxed">
        ابعته للعميل على الواتساب على طول — انسخ التفاصيل ونزّل الصور، من غير لينك.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={doCopy}
          className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
            copied ? 'bg-[#EEF5F0] border-[#BFE0CC] text-[#1E7A45]' : 'bg-[#141414] border-[#141414] text-white'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'اتنسخ ✓' : 'انسخ التفاصيل'}
        </button>

        <button
          onClick={doShare}
          className="py-2.5 rounded-xl bg-[#1FA85D] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Share2 size={14} /> شارك
        </button>

        {pics.length > 0 && (
          <button
            onClick={doImages}
            disabled={!!busy}
            className="py-2.5 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-[#141414] font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} /> {picsLabel}
          </button>
        )}

        {hasVideo && (
          <button
            onClick={doVideo}
            disabled={!!busy}
            className="py-2.5 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-[#141414] font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Film size={14} /> {busy === 'video' ? 'بينزّل...' : 'نزّل الفيديو'}
          </button>
        )}
      </div>

      {pics.length > 3 && (
        <p className="text-[10px] text-[#8C877D] leading-relaxed">
          الصور بتنزل واحدة ورا التانية. لو المتصفح سأل عن تحميل ملفات متعددة، وافق.
        </p>
      )}
    </div>
  );
};

export default ShareBar;
