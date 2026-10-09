import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Images } from 'lucide-react';
import { Property } from '../../types';
import { findSimilarUnits, matchLabel, MatchInput, UnitMatch } from '../../services/unitMatch';
import { imageHashes } from '../../services/imageFingerprint';

/*
  تحذير قبل النشر: الشقة دي شبه شقة موجودة عندنا.

  بيشتغل على مرحلتين عشان الشاشة متستناش:
   ١. المواصفات على طول (الحي، المساحة، السعر، الغرف، الدور) — من غير نت
   ٢. الصور بعدها بشوية لما بصمتها تتحسب — والنتيجة بتتحدّث لوحدها

  لو الصور رفضت تتحمّل، بنكمّل بالمواصفات وبس. التحذير مبيقفش على الصور.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Props {
  sub: MatchInput;
  properties: Property[];
  /** صور الطلب — بتتحسب بصمتها في الخلفية */
  images?: string[];
}

export const SimilarUnitsWarning: React.FC<Props> = ({ sub, properties, images }) => {
  const [hashes, setHashes] = useState<string[] | null>(null);
  const [hashing, setHashing] = useState(false);

  const imgs = useMemo(() => (images || sub.images || []).filter(Boolean), [images, sub.images]);

  useEffect(() => {
    let alive = true;
    if (!imgs.length) { setHashes([]); return; }
    setHashing(true);
    imageHashes(imgs, 3)
      .then((h) => { if (alive) { setHashes(h); setHashing(false); } })
      .catch(() => { if (alive) { setHashes([]); setHashing(false); } });
    return () => { alive = false; };
  }, [imgs.join('|')]);

  const matches: UnitMatch[] = useMemo(
    () => findSimilarUnits({ ...sub, images: imgs, imageHashes: hashes || [] }, properties),
    [sub, properties, imgs, hashes],
  );

  if (!matches.length) {
    return (
      <div className="rounded-2xl bg-[#EEF5F0] border border-[#BFE0CC] px-3 py-2.5">
        <p className="text-xs font-bold text-[#1E7A45]">
          قارنّاها بكل الشقق عندنا — مفيش شبيه. تتنشر عادي.
          {hashing && ' (لسه بنقارن الصور...)'}
        </p>
      </div>
    );
  }

  const top = matches[0];
  const strong = top.score >= 70;

  return (
    <div className={`rounded-2xl border overflow-hidden ${strong ? 'bg-[#FBEDEA] border-[#E8B5AC]' : 'bg-[#FBF8F1] border-[#E8D3A6]'}`}>
      <div className="px-3 py-2.5 flex items-start gap-2">
        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${strong ? 'text-[#9A2E1F]' : 'text-[#6E5418]'}`} />
        <div className="min-w-0">
          <p className={`text-xs font-black ${strong ? 'text-[#9A2E1F]' : 'text-[#6E5418]'}`}>
            {matches.length === 1 ? 'في شقة شبهها عندنا' : `في ${matches.length} شقق شبهها عندنا`}
          </p>
          <p className="text-[11px] text-[#6B665C] leading-5">
            راجعها قبل النشر — لو نفس الشقة، ماتنشرهاش تاني.
            {hashing && ' · لسه بنقارن الصور'}
          </p>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {matches.map((m) => {
          const lab = matchLabel(m.score);
          return (
            <div key={m.property.id} className="rounded-xl bg-white border border-[#ECE8DF] p-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-[#141414]">{m.property.code}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  lab.tone === 'red' ? 'bg-[#FBEDEA] text-[#9A2E1F]' : 'bg-[#FBF8F1] text-[#6E5418]'
                }`}>
                  {m.score}% · {lab.text}
                </span>
              </div>

              <p className="text-[11px] text-[#6B665C] mt-1">
                {m.property.neighborhood} · {m.property.area} م² · {f(m.property.price)} ج.م · {m.property.bedrooms} غرف · {m.property.floor}
              </p>

              <p className="text-[10px] text-[#8C877D] mt-1 leading-5">{m.reasons.join(' · ')}</p>

              {m.sameImage && (
                <p className="text-[10px] font-black text-[#9A2E1F] mt-1 flex items-center gap-1">
                  <Images size={11} /> نفس ملف الصورة — دي مش صدفة
                </p>
              )}

              {/* الصور جنب بعض عشان العين تحكم */}
              {(imgs.length > 0 || (m.property.images || []).length > 0) && (
                <div className="flex gap-3 mt-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-[#8C877D] mb-1">الطلب الجديد</p>
                    <div className="flex gap-1 overflow-x-auto">
                      {imgs.slice(0, 3).map((u) => <img key={u} src={u} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0" />)}
                      {!imgs.length && <span className="text-[10px] text-[#C2412D]">مفيش صور</span>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-[#8C877D] mb-1">{m.property.code}</p>
                    <div className="flex gap-1 overflow-x-auto">
                      {(m.property.images || []).slice(0, 3).map((u) => <img key={u} src={u} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0" />)}
                      {!(m.property.images || []).length && <span className="text-[10px] text-[#8C877D]">مفيش صور</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimilarUnitsWarning;
