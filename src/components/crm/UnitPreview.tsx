import React, { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Download } from 'lucide-react';
import { Property } from '../../types';
import { formatPrice, getVideoEmbedInfo } from '../../utils/helpers';
import { realImages } from '../../utils/propertyMedia';

/*
  معاينة الشقة من المطابقة: كل الصور والفيديو، وكل التفاصيل، ومقارنة
  سعر المتر بباقي شقق نفس الحي — عشان أي حد جديد في الفريق يعرف
  الشقة دي لقطة ولا غالية من غير ما يسأل.
*/

const t = (v: unknown) => String(v ?? '').trim();

export const UnitPreview: React.FC<{ property: Property; properties: Property[]; onClose: () => void; onAd?: () => void }> = ({ property: p, properties, onClose, onAd }) => {
  const imgs = realImages(p).length ? realImages(p) : (p.images || []).filter(Boolean);
  const video = getVideoEmbedInfo(p.videoUrl, p.videoMuted);
  const slides: { kind: 'img' | 'video'; src: string }[] = [
    ...(video ? [{ kind: 'video' as const, src: p.videoUrl as string }] : []),
    ...imgs.map((src) => ({ kind: 'img' as const, src })),
  ];
  const [i, setI] = useState(0);
  const cur = slides[i];
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  const ppm = p.pricePerMeter || (p.area ? Math.round(p.price / p.area) : 0);
  /* مقارنة سعر المتر بشقق نفس الحي (ريسيل، ليها سعر ومساحة) */
  const cmp = useMemo(() => {
    const same = properties.filter((x) => x.id !== p.id && x.neighborhood === p.neighborhood && x.price > 0 && x.area > 0 && x.category !== 'off_plan');
    if (same.length < 3 || !ppm) return null;
    const vals = same.map((x) => x.price / x.area).sort((a, b) => a - b);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const diff = Math.round(((ppm - avg) / avg) * 100);
    const cheaper = vals.filter((v) => v > ppm).length;
    return { n: same.length, avg: Math.round(avg), diff, cheaper };
  }, [properties, p, ppm]);

  const verdict = !cmp ? null
    : cmp.diff <= -8 ? { txt: 'لقطة — أرخص من متوسط الحي', cls: 'bg-[#E7F4EC] text-[#1E7A45] border-[#BFE3CC]' }
    : cmp.diff >= 8 ? { txt: 'أغلى من متوسط الحي — محتاجة مبرر (تشطيب/فيو/دور)', cls: 'bg-[#FBEDEA] text-[#9A2E1F] border-[#E9B8AE]' }
    : { txt: 'سعرها في متوسط الحي', cls: 'bg-[#FBF8F1] text-[#6E5418] border-[#E8D3A6]' };

  const floorTxt = t(p.floor) + (p.totalFloors ? ` من ${p.totalFloors}` : '');
  const rows: [string, string][] = ([
    ['السعر', p.price ? `${formatPrice(p.price)}` : ''],
    ['سعر المتر', ppm ? `${formatPrice(ppm)}` : ''],
    ['المساحة', p.area ? `${p.area} م²` : ''],
    ['الغرف', p.bedrooms ? `${p.bedrooms}` : ''],
    ['الحمامات', p.bathrooms ? `${p.bathrooms}` : ''],
    ['الدور', floorTxt],
    ['التشطيب', t(p.finishingLabel)],
    ['الفيو', t(p.view)],
    ['الاستلام', t(p.deliveryDate)],
    ['الدفع', p.paymentMethod === 'cash_or_facilities' ? 'كاش أو تسهيلات' : p.paymentMethod === 'cash' ? 'كاش' : ''],
    ['النوع', t(p.propertyTypeLabel)],
    ['الحي', t(p.neighborhood)],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{p.title}</p>
            <p className="text-[11px] text-[#8C877D] font-mono">#{p.code}</p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-[#F6F4EF] shrink-0"><X size={18} /></button>
        </div>

        {/* المعرض */}
        {slides.length > 0 ? (
          <div className="bg-[#141414]">
            <div className="relative aspect-[4/3] sm:aspect-video">
              {cur.kind === 'img' ? (
                <img src={cur.src} alt="" className="w-full h-full object-contain" />
              ) : video?.type === 'direct' ? (
                <video src={video.src} controls playsInline className="w-full h-full object-contain" />
              ) : video?.embedUrl ? (
                <iframe src={video.embedUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen title="فيديو الشقة" />
              ) : (
                <a href={cur.src} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center text-white font-bold gap-2"><Play /> افتح الفيديو</a>
              )}
              {slides.length > 1 && (
                <>
                  <button onClick={() => go(-1)} aria-label="اللي قبلها" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85"><ChevronRight size={18} /></button>
                  <button onClick={() => go(1)} aria-label="اللي بعدها" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85"><ChevronLeft size={18} /></button>
                </>
              )}
              <span className="absolute bottom-2 left-2 text-[11px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-lg">{i + 1} / {slides.length}</span>
              {cur.kind === 'img' && (
                <a href={cur.src} download target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 text-[11px] font-bold bg-white/90 px-2 py-1 rounded-lg flex items-center gap-1"><Download size={12} /> نزّل</a>
              )}
            </div>
            {slides.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto p-2">
                {slides.map((s, k) => (
                  <button key={k} onClick={() => setI(k)} className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 ${k === i ? 'border-[#D9B864]' : 'border-transparent opacity-70'}`}>
                    {s.kind === 'img' ? <img src={s.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <span className="w-full h-full flex items-center justify-center bg-[#2a2a2a] text-white"><Play size={16} /></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="m-4 text-xs bg-[#F6F4EF] rounded-xl p-3 text-[#8C877D]">مفيش صور مرفوعة للشقة دي.</p>
        )}

        <div className="p-4 space-y-3">
          {/* الحكم على السعر */}
          {cmp && verdict && (
            <div className={`rounded-2xl border p-3 ${verdict.cls}`}>
              <p className="font-bold text-sm">{verdict.txt}</p>
              <p className="text-xs mt-0.5">
                متر الشقة دي {formatPrice(ppm)} · متوسط {t(p.neighborhood)} {formatPrice(cmp.avg)}{" "}
                ({cmp.diff > 0 ? `+${cmp.diff}` : cmp.diff}%) · أرخص من {cmp.cheaper} شقة من {cmp.n} في نفس الحي
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rows.map(([k, v]) => (
              <div key={k} className="bg-[#F6F4EF] rounded-xl px-3 py-2">
                <p className="text-[10px] text-[#8C877D]">{k}</p>
                <p className="text-sm font-bold text-[#141414]">{v}</p>
              </div>
            ))}
          </div>

          {p.licensedException && (
            <p className="text-xs font-bold text-[#1E7A45]">✓ مرخّصة</p>
          )}

          {(p.features || []).filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-bold mb-1.5">المميزات</p>
              <div className="flex flex-wrap gap-1.5">
                {p.features.filter(Boolean).map((f, k) => <span key={k} className="text-xs bg-[#FBF8F1] border border-[#E8D3A6] text-[#6E5418] px-2 py-1 rounded-lg">{f}</span>)}
              </div>
            </div>
          )}

          {t(p.description) && (
            <div>
              <p className="text-xs font-bold mb-1">الوصف</p>
              <p className="text-sm text-[#3d3a35] whitespace-pre-line leading-relaxed">{t(p.description)}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {onAd && <button onClick={onAd} className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm">إعلان</button>}
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#141414] text-white font-bold text-sm">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitPreview;
