import React, { useMemo } from 'react';
import { ArrowUpLeft } from 'lucide-react';
import { DistrictStats, DistrictContent } from '../../services/districtService';

/*
  دليل الأحياء في الرئيسية: "سلّم الأسعار"
  كل حي صف بطول سعر متره قصاد أغلى حي، وعدد الشقق المتاحة، وبيبدأ من كام.
  الدوس على أي حي بيفتح صفحته.
*/
const f = (n: number) => Math.round(n).toLocaleString('en-US');
const m = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)} مليون` : f(n));

export const DistrictGuideSection: React.FC<{
  stats: DistrictStats[];
  content: Record<string, DistrictContent>;
  onOpen: (name: string) => void;
}> = ({ stats, content, onOpen }) => {
  const rows = useMemo(() => stats.filter((s) => !content[s.name]?.hidden && s.count > 0).sort((a, b) => b.avgPpm - a.avgPpm), [stats, content]);
  const top = rows[0]?.avgPpm || 1;
  const all = stats.filter((s) => s.count > 0);
  const total = all.reduce((x, s) => x + s.count, 0);
  const plateau = total ? all.reduce((x, s) => x + s.avgPpm * s.count, 0) / total : 0;
  const cheapest = [...rows].sort((a, b) => a.avgPpm - b.avgPpm)[0];

  if (!rows.length) return null;

  return (
    <section id="districts-guide-section" className="w-full my-12" dir="rtl">
      <div className="bg-[#141414] text-white rounded-[28px] overflow-hidden">
        <div className="p-6 sm:p-10 lg:p-12 grid gap-8 lg:grid-cols-12">
          {/* العنوان والملخص */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
            <span className="text-xs font-bold tracking-wide text-[#D9B864]">دليل أحياء الهضبة الوسطى</span>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight font-readex">كل حي بسعره،<br />قبل ما تنزل تعاين.</h2>
            <p className="text-sm text-[#A3A09A] leading-7">الأرقام دي محسوبة لحظياً من الشقق المعروضة عندنا دلوقتي، مش تقديرات. دوس على أي حي تشوف تفاصيله وشققه.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] text-[#A3A09A]">متوسط متر الهضبة</p>
                <p className="text-2xl font-bold font-readex">{f(plateau)}</p>
                <p className="text-[11px] text-[#A3A09A]">ج.م / م²</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] text-[#A3A09A]">شقق متاحة</p>
                <p className="text-2xl font-bold font-readex">{total}</p>
                <p className="text-[11px] text-[#A3A09A]">في {all.length} أحياء</p>
              </div>
            </div>
            {cheapest && (
              <button onClick={() => onOpen(cheapest.name)} className="w-full text-right rounded-2xl bg-[#A07A26]/15 border border-[#A07A26]/40 p-4 hover:bg-[#A07A26]/25 transition">
                <p className="text-[11px] text-[#D9B864]">أقل سعر متر دلوقتي</p>
                <p className="font-bold">{cheapest.name} · {f(cheapest.avgPpm)} ج.م/م²</p>
              </button>
            )}
          </div>

          {/* سلّم الأسعار */}
          <div className="lg:col-span-8 space-y-2.5">
            <div className="hidden sm:grid grid-cols-12 text-[11px] text-[#7C7870] px-4 pb-1">
              <span className="col-span-4">الحي</span><span className="col-span-5">متوسط سعر المتر</span><span className="col-span-3 text-left">تبدأ من</span>
            </div>
            {rows.map((s, i) => {
              const c = content[s.name];
              const vs = plateau ? ((s.avgPpm - plateau) / plateau) * 100 : 0;
              return (
                <button key={s.name} onClick={() => onOpen(s.name)}
                  className="group w-full text-right rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-[#D9B864]/50 transition p-4 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-white/10 text-xs font-bold flex items-center justify-center font-readex">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-[15px] truncate">{s.name}</p>
                      <p className="text-[11px] text-[#A3A09A] truncate">{c?.tagline || `${s.count} شقة متاحة`}</p>
                    </div>
                  </div>
                  <div className="col-span-9 sm:col-span-5 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold font-readex">{f(s.avgPpm)} <span className="text-[10px] font-normal text-[#A3A09A]">ج.م/م²</span></span>
                      <span className={`text-[11px] font-bold ${vs <= 0 ? 'text-[#7ED3A0]' : 'text-[#F0A48F]'}`}>{vs <= 0 ? '▼' : '▲'} {Math.abs(vs).toFixed(0)}% عن المتوسط</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#D9B864] to-[#A07A26] transition-all duration-700" style={{ width: `${Math.max(8, (s.avgPpm / top) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                    <div className="text-left">
                      <p className="text-sm font-bold">{m(s.minPrice)}</p>
                      <p className="text-[10px] text-[#A3A09A]">{s.count} شقة</p>
                    </div>
                    <ArrowUpLeft size={16} className="text-[#D9B864] opacity-0 group-hover:opacity-100 transition hidden sm:block" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
