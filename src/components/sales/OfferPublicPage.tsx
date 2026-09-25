import React, { useEffect, useState } from 'react';
import { Offer, OfferUnit, getOffer, logOfferOpen } from '../../services/salesToolsService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { Property } from '../../types';
import { ArrowRight } from 'lucide-react';

/* صفحة العرض اللي العميل بيشوفها: شقق العرض بس، بصوت السيلز واسمه */
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const OfferPublicPage: React.FC<{ offerId: string; onClose: () => void }> = ({ offerId, onClose }) => {
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [open, setOpen] = useState<{ unit: OfferUnit; p?: Property } | null>(null);
  useEffect(() => {
    getOffer(offerId).then((o) => { setOffer(o); if (o) logOfferOpen(offerId); }).catch(() => setOffer(null));
  }, [offerId]);

  const expired = offer && offer.expiresAt < Date.now();
  const hoursLeft = offer ? Math.max(0, Math.round((offer.expiresAt - Date.now()) / 3600000)) : 0;
  const wa = offer ? `https://wa.me/${(offer.agentPhone || '201021242871').replace(/\D/g, '').replace(/^0/, '20')}?text=${encodeURIComponent(`بخصوص العرض اللي بعتهولي: `)}` : '#';

  return (
    <div className="fixed inset-0 z-[90] bg-[#F6F4EF] overflow-y-auto" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', Tahoma, sans-serif" }}>
      {offer === undefined && <p className="text-center py-20">جاري التحميل...</p>}
      {offer === null && (
        <div className="max-w-lg mx-auto p-6 text-center space-y-4 py-20">
          <p className="text-lg font-bold">اللينك ده مش شغال أو انتهت صلاحيته.</p>
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-[#141414] text-white font-bold">افتح الموقع</button>
        </div>
      )}
      {offer && (
        <>
          <header className="bg-[#141414] text-white px-5 py-6">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#A07A26] flex items-center justify-center text-xl font-bold">{(offer.agentName || 'س').charAt(0)}</div>
                <div>
                  <p className="font-bold text-lg" style={{ fontFamily: "'Readex Pro', sans-serif" }}>عرض مخصوص من {offer.agentName}</p>
                  <p className="text-xs text-[#D9B864]">السبع للعقارات · {expired ? 'انتهت صلاحية العرض' : `صالح ${hoursLeft} ساعة`}</p>
                </div>
              </div>
              {offer.voiceUrl && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <audio controls src={offer.voiceUrl} className="w-full" />
                </div>
              )}
              <p className="leading-8 text-[#E7E2D8]">{offer.intro || `أهلاً أستاذ ${offer.leadName}، دول أحسن ${offer.units.length} حاجات عندي دلوقتي بعد كلامنا.`}</p>
            </div>
          </header>

          <main className="max-w-lg mx-auto p-4 space-y-4 pb-28">
            {offer.units.map((u, i) => (
              <article key={u.propertyId} className="bg-white border border-[#ECE8DF] rounded-2xl overflow-hidden"
                onClick={() => logOfferOpen(offerId, u.code)}>
                {u.image ? <img src={u.image} alt="" className="w-full h-44 object-cover" />
                  : <div className="w-full h-44" style={{ background: 'repeating-linear-gradient(135deg,#E7E2D8 0 12px,#EFEBE3 12px 24px)' }} />}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold">{i + 1}. {u.title}</span>
                    <span className="font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{fmt(u.price)} ج.م</span>
                  </div>
                  {u.note && <p className="leading-7 text-[13.5px] bg-[#FBF8F1] border-r-4 border-[#A07A26] rounded-lg p-3">« {u.note} »</p>}
                  <button onClick={async () => {
                    logOfferOpen(offerId, u.code);
                    setOpen({ unit: u });
                    try { const snap = await getDoc(doc(db, 'properties', u.propertyId)); if (snap.exists()) setOpen({ unit: u, p: snap.data() as Property }); } catch { /* */ }
                  }} className="text-sm font-bold text-[#A07A26]">شوف التفاصيل والصور ←</button>
                </div>
              </article>
            ))}

            <div className="rounded-2xl bg-[#141414] text-white p-5 text-center space-y-3">
              <p className="leading-8">{offer.question || 'قولّي رأيك وأنا أرتبلك المعاينة'}</p>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="block w-full py-3.5 rounded-xl bg-[#1FA85D] font-bold">رد على {offer.agentName} واتساب</a>
            </div>
          </main>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-[95] bg-[#F6F4EF] overflow-y-auto" dir="rtl">
          <header className="sticky top-0 bg-[#141414] text-white px-4 py-3 flex items-center gap-3">
            <button onClick={() => setOpen(null)} className="flex items-center gap-1.5 text-sm font-bold">
              <ArrowRight size={18} />رجوع للعرض
            </button>
            <span className="mr-auto font-mono text-xs bg-white/10 px-2 py-1 rounded-md">{open.unit.code}</span>
          </header>
          <div className="max-w-lg mx-auto p-4 space-y-4 pb-16">
            <div className="flex gap-2 overflow-x-auto">
              {(open.p?.images || (open.unit.image ? [open.unit.image] : [])).map((img, i) => (
                <img key={i} src={img} alt="" className="h-56 rounded-2xl object-cover shrink-0" />
              ))}
              {!(open.p?.images || []).length && !open.unit.image && (
                <div className="w-full h-48 rounded-2xl" style={{ background: 'repeating-linear-gradient(135deg,#E7E2D8 0 12px,#EFEBE3 12px 24px)' }} />
              )}
            </div>
            {open.p?.videoUrl && <video src={open.p.videoUrl} controls playsInline className="w-full rounded-2xl" />}
            <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
              <p className="font-bold text-lg">{open.p?.title || open.unit.title}</p>
              <p className="font-bold text-xl" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{fmt(open.unit.price)} ج.م</p>
              {open.p && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[['المساحة', `${open.p.area} م²`], ['الغرف', `${open.p.bedrooms} غرف`], ['الحمامات', `${open.p.bathrooms || '—'}`], ['الدور', open.p.floor || '—']].map(([l, v]) => (
                    <div key={l as string} className="rounded-xl bg-[#F6F4EF] p-3">
                      <p className="text-[11px] text-[#6B665C]">{l as string}</p>
                      <p className="font-bold text-sm">{v as string}</p>
                    </div>
                  ))}
                </div>
              )}
              {open.unit.note && <p className="leading-7 text-[13.5px] bg-[#FBF8F1] border-r-4 border-[#A07A26] rounded-lg p-3">« {open.unit.note} »</p>}
              {open.p?.description && <p className="leading-7 text-sm text-[#4A463F]">{open.p.description}</p>}
            </div>
            <button onClick={() => setOpen(null)} className="w-full py-3.5 rounded-2xl bg-[#141414] text-white font-bold flex items-center justify-center gap-2">
              <ArrowRight size={18} />رجوع لباقي العرض
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
