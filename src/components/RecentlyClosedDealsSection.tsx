import React from 'react';
import { ClosedDeal, HadabaWostaNeighborhood } from '../types';
import { INITIAL_CLOSED_DEALS } from '../data/marketPriceData';
import { formatPrice } from '../utils/helpers';
import { CheckCircle2, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';

interface RecentlyClosedDealsSectionProps {
  deals?: ClosedDeal[];
  closedDeals?: ClosedDeal[];
  onSelectNeighborhood?: (neighborhood: HadabaWostaNeighborhood) => void;
  onOpenResaleSubmit?: () => void;
}

export const RecentlyClosedDealsSection: React.FC<RecentlyClosedDealsSectionProps> = ({
  deals,
  closedDeals,
  onSelectNeighborhood,
  onOpenResaleSubmit
}) => {
  const activeList = closedDeals || deals || INITIAL_CLOSED_DEALS;

  return (
    <section id="closed-deals-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 font-ibm" dir="rtl">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-right">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#A07A26] block">
              اتباعت مؤخراً
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-readex text-[#141414]">
              صفقات حقيقية اتقفلت
            </h2>
            <p className="text-xs sm:text-sm text-[#6B665C]">
              شقق تم توثيق ونقل ملكيتها بنجاح عبر منصتنا في الهضبة الوسطى.
            </p>
          </div>

          {onOpenResaleSubmit && (
            <button
              type="button"
              onClick={onOpenResaleSubmit}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FAF4E5] hover:bg-[#F2E8D0] border border-[#E9DFCA] text-[#A07A26] rounded-xl text-xs font-bold font-readex transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>عايز تبيع شقتك بنفس السرعة؟</span>
              <ArrowLeft size={14} />
            </button>
          )}
        </div>

        {/* Table / List View */}
        <div className="bg-white rounded-3xl border border-[#ECE8DF] overflow-hidden shadow-2xs">
          <div className="divide-y divide-[#ECE8DF]">
            {activeList.map((deal) => (
              <div 
                key={deal.id}
                onClick={() => onSelectNeighborhood?.(deal.neighborhood)}
                className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF4E5]/40 transition-colors ${
                  onSelectNeighborhood ? 'cursor-pointer' : ''
                }`}
              >
                {/* Right: District & Specs */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold font-readex text-[#141414]">
                      {deal.neighborhood}
                    </h4>
                    <p className="text-xs text-[#6B665C] mt-0.5">
                      مساحة {deal.area} م² {deal.notes ? `· ${deal.notes}` : ''}
                    </p>
                  </div>
                </div>

                {/* Center: Price & Duration */}
                <div className="flex items-center gap-6 sm:gap-10 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] text-[#6B665C] block">سعر الإغلاق</span>
                    <span className="font-bold font-readex text-[#141414]">
                      {formatPrice(deal.price)} ج.م
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#6B665C] block">مدة التسويق</span>
                    <span className="font-bold text-[#4A463F] flex items-center gap-1">
                      <Clock size={12} className="text-[#A07A26]" />
                      <span>في {deal.daysToClose} يوم</span>
                    </span>
                  </div>
                </div>

                {/* Left: Timeframe Badge */}
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-xl text-xs font-bold font-readex">
                    <CheckCircle2 size={13} />
                    <span>{deal.timeframeLabel}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
