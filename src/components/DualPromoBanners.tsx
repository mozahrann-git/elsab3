import React from 'react';
import { Compass, Calculator, ArrowLeft, TrendingUp } from 'lucide-react';

interface DualPromoBannersProps {
  onOpenPriceMap: () => void;
  onOpenValuation: () => void;
}

export const DualPromoBanners: React.FC<DualPromoBannersProps> = ({
  onOpenPriceMap,
  onOpenValuation
}) => {
  const districtBadges = [
    {
      name: 'الأول',
      bgClass: 'bg-emerald-950/80 hover:bg-emerald-900/90',
      borderClass: 'border-emerald-500/50 hover:border-emerald-400',
      textClass: 'text-emerald-300',
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
    },
    {
      name: 'الثاني',
      bgClass: 'bg-amber-950/80 hover:bg-amber-900/90',
      borderClass: 'border-amber-500/50 hover:border-amber-400',
      textClass: 'text-amber-300',
      dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
    },
    {
      name: 'الثالث',
      bgClass: 'bg-blue-950/80 hover:bg-blue-900/90',
      borderClass: 'border-blue-500/50 hover:border-blue-400',
      textClass: 'text-blue-300',
      dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
    },
    {
      name: 'الرابع',
      bgClass: 'bg-rose-950/80 hover:bg-rose-900/90',
      borderClass: 'border-rose-500/50 hover:border-rose-400',
      textClass: 'text-rose-300',
      dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
    },
    {
      name: 'الخامس',
      bgClass: 'bg-teal-950/80 hover:bg-teal-900/90',
      borderClass: 'border-teal-500/50 hover:border-teal-400',
      textClass: 'text-teal-300',
      dotClass: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]'
    },
    {
      name: 'المباحث',
      bgClass: 'bg-purple-950/80 hover:bg-purple-900/90',
      borderClass: 'border-purple-500/50 hover:border-purple-400',
      textClass: 'text-purple-300',
      dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]'
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 font-ibm" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Dark Banner: Price Heatmap Promo */}
        <div 
          onClick={onOpenPriceMap}
          className="bg-[#141414] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer border border-stone-800 hover:border-[#D9B864]/50 transition-all duration-300 group shadow-md relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#D9B864]">
              <Compass size={14} className="text-[#D9B864]" />
              <span>خريطة أسعار الهضبة</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-readex text-white leading-tight">
              سعر المتر في كل حي، بلون.
            </h3>

            {/* Vibrant & Distinct Multi-Color Neighborhood Buttons Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 max-w-md">
              {districtBadges.map((district) => (
                <div
                  key={district.name}
                  className={`${district.bgClass} ${district.borderClass} ${district.textClass} border rounded-xl py-2 px-2.5 flex items-center justify-center gap-2 transition-all duration-200 shadow-xs hover:scale-105`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${district.dotClass}`} />
                  <span className="text-xs font-bold font-readex truncate">
                    {district.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#D9B864] group-hover:text-white transition-colors relative z-10">
            <span className="font-readex">افتح الخريطة ومؤشر الأسعار</span>
            <ArrowLeft size={16} className="group-hover:-translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* 2. Warm Tan / Light Gold Banner: Valuation Calculator Promo */}
        <div 
          onClick={onOpenValuation}
          className="bg-[#FAF4E5] border border-[#E9DFCA] hover:border-[#A07A26]/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-xs relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#A07A26]">
              <Calculator size={14} className="text-[#A07A26]" />
              <span>للملاك</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-readex text-[#141414] leading-tight">
              كام تستاهل شقتك؟ اعرف في 30 ثانية.
            </h3>
            <p className="text-xs sm:text-sm text-[#6B665C] leading-relaxed max-w-md">
              نطاق سعر من صفقات حقيقية في حيك، ببلاش ومن غير التزام.
            </p>
          </div>

          <div className="pt-6">
            <button
              type="button"
              className="px-6 py-3 bg-[#141414] group-hover:bg-black text-white rounded-xl text-xs font-bold font-readex transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>قيم شقتي</span>
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
