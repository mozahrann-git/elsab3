import React, { useMemo } from 'react';
import { ClosedDeal, HadabaWostaNeighborhood } from '../types';
import { INITIAL_CLOSED_DEALS } from '../data/marketPriceData';
import { ArrowLeft, ArrowUpLeft, BadgeCheck, Timer } from 'lucide-react';

/*
  صفقات اتقفلت: لوحة إثبات مش قائمة.
  الفكرة إن الزائر يشوف أرقام صفقات حقيقية اتنفذت، مش كلام عن إننا شاطرين.
  مفيش صفقات مسجلة؟ القسم ميظهرش بدل ما يعرض أرقام وهمية.
*/

interface RecentlyClosedDealsSectionProps {
  deals?: ClosedDeal[];
  closedDeals?: ClosedDeal[];
  onSelectNeighborhood?: (neighborhood: HadabaWostaNeighborhood) => void;
  onOpenResaleSubmit?: () => void;
}

const f = (n: number) => Math.round(Number(n) || 0).toLocaleString('en-US');
const millions = (n: number) => {
  const v = Number(n) || 0;
  return v >= 1e6 ? `${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)} مليون` : f(v);
};

export const RecentlyClosedDealsSection: React.FC<RecentlyClosedDealsSectionProps> = ({
  deals,
  closedDeals,
  onSelectNeighborhood,
  onOpenResaleSubmit,
}) => {
  const list = closedDeals || deals || INITIAL_CLOSED_DEALS;

  const summary = useMemo(() => {
    const valid = (list || []).filter((d) => d && Number(d.price) > 0);
    if (!valid.length) return null;
    const withArea = valid.filter((d) => Number(d.area) > 0);
    const avgPpm = withArea.length
      ? withArea.reduce((x, d) => x + Number(d.price) / Number(d.area), 0) / withArea.length
      : 0;
    const withDays = valid.filter((d) => Number(d.daysToClose) > 0);
    const avgDays = withDays.length
      ? withDays.reduce((x, d) => x + Number(d.daysToClose), 0) / withDays.length
      : 0;
    const fastest = withDays.length ? Math.min(...withDays.map((d) => Number(d.daysToClose))) : 0;
    return { count: valid.length, avgPpm, avgDays, fastest };
  }, [list]);

  if (!list || list.length === 0 || !summary) return null;

  const stats: [string, string, string][] = [
    ['صفقة اتقفلت', String(summary.count), 'موثّقة عن طريقنا'],
    ['متوسط سعر المتر المتنفّذ', summary.avgPpm ? f(summary.avgPpm) : '—', 'ج.م / م²'],
    ['متوسط مدة الإقفال', summary.avgDays ? String(Math.round(summary.avgDays)) : '—', summary.fastest ? `أسرع واحدة ${summary.fastest} يوم` : 'يوم'],
  ];

  return (
    <section id="closed-deals-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" dir="rtl">
      <div className="space-y-5">

        {/* العنوان */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] border border-[#CBE5D5] px-2.5 py-1 rounded-lg">
              <BadgeCheck size={13} />
              أرقام فعلية
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-readex text-[#141414]">
              صفقات اتقفلت بالفعل
            </h2>
            <p className="text-sm text-[#6B665C] leading-6 max-w-xl">
              مش تقديرات ولا أسعار معروضة — دي شقق اتباعت فعلاً بالسعر ده. عشان تعرف السوق بيتنفّذ بكام، مش بيتطلب بكام.
            </p>
          </div>

          {onOpenResaleSubmit && (
            <button
              type="button"
              onClick={onOpenResaleSubmit}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-3 bg-[#141414] hover:bg-black text-white rounded-2xl text-xs font-bold font-readex transition-all self-start sm:self-auto"
            >
              <span>عايز تبيع شقتك؟</span>
              <ArrowLeft size={14} />
            </button>
          )}
        </div>

        {/* شريط الأرقام */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {stats.map(([label, value, hint], i) => (
            <div
              key={label}
              className={`rounded-2xl p-3.5 sm:p-5 ${
                i === 0
                  ? 'bg-[#141414] text-white'
                  : 'bg-white border border-[#ECE8DF]'
              }`}
            >
              <p className={`text-[10px] sm:text-[11px] leading-4 ${i === 0 ? 'text-[#A3A09A]' : 'text-[#6B665C]'}`}>{label}</p>
              <p className="text-2xl sm:text-4xl font-bold font-readex mt-1 leading-none">{value}</p>
              <p className={`text-[10px] sm:text-[11px] mt-1.5 ${i === 0 ? 'text-[#D9B864]' : 'text-[#8C877D]'}`}>{hint}</p>
            </div>
          ))}
        </div>

        {/* الصفقات */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((deal) => {
            const ppm = Number(deal.area) > 0 ? Number(deal.price) / Number(deal.area) : 0;
            const clickable = Boolean(onSelectNeighborhood);
            return (
              <button
                key={deal.id}
                type="button"
                disabled={!clickable}
                onClick={() => onSelectNeighborhood?.(deal.neighborhood)}
                className={`group text-right rounded-2xl bg-white border border-[#ECE8DF] p-4 sm:p-5 flex flex-col gap-3 transition ${
                  clickable ? 'hover:border-[#D9B864] hover:shadow-sm' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-[#141414] bg-[#F6F4EF] border border-[#ECE8DF] px-2.5 py-1 rounded-lg truncate">
                    {deal.neighborhood}
                  </span>
                  {Number(deal.daysToClose) > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#1E7A45] bg-[#EEF5F0] px-2 py-1 rounded-lg">
                      <Timer size={12} />
                      {deal.daysToClose} يوم
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-2xl font-bold font-readex text-[#141414] leading-none">
                    {millions(deal.price)}
                    <span className="text-xs font-normal text-[#6B665C]"> ج.م</span>
                  </p>
                  <p className="text-xs text-[#6B665C] mt-1.5">
                    {deal.area} م²
                    {ppm > 0 && <> · <span className="font-mono">{f(ppm)}</span> ج.م/م²</>}
                  </p>
                </div>

                {deal.notes && (
                  <p className="text-[11px] text-[#8C877D] leading-5 line-clamp-2">{deal.notes}</p>
                )}

                <div className="mt-auto pt-2.5 border-t border-[#F0ECE4] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8C877D] truncate">{deal.timeframeLabel}</span>
                  {clickable && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#A07A26]">
                      شقق الحي
                      <ArrowUpLeft size={13} className="opacity-0 group-hover:opacity-100 transition" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-[#8C877D] text-center">
          كل صفقة هنا اتنفذت عن طريق السبع في الهضبة الوسطى، والأرقام بتتحدّث أول بأول.
        </p>
      </div>
    </section>
  );
};
