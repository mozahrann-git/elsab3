import React from 'react';

interface NeighborhoodsGuideProps {
  onSelectDistrict: (districtName: string) => void;
  onOpenFullGuide?: () => void;
}

const DISTRICT_AVERAGES = [
  { name: 'الحي الأول', avgPrice: '[متوسط]' },
  { name: 'الحي الثاني', avgPrice: '[متوسط]' },
  { name: 'الحي الثالث', avgPrice: '[متوسط]' },
  { name: 'الحي الرابع', avgPrice: '[متوسط]' },
  { name: 'الحي الخامس', avgPrice: '[متوسط]' },
  { name: 'تقسيم المباحث', avgPrice: '[متوسط]' },
];

export const NeighborhoodsGuideSection: React.FC<NeighborhoodsGuideProps> = ({
  onSelectDistrict,
  onOpenFullGuide,
}) => {
  return (
    <section id="districts-guide-section" className="w-full my-12">
      <div className="bg-[#141414] rounded-3xl p-8 sm:p-12 text-right">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Right Column: Title & Subtitle */}
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold text-[#D9B864] block">
              دليل الأحياء
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-readex leading-tight">
              متوسط سعر المتر في كل حي، قبل ما تنزل تعاين.
            </h2>

            <p className="text-sm text-[#A3A09A] leading-relaxed">
              نصف تشطيب ومتشطب، والمحاور الرئيسية لكل حي.
            </p>

            {onOpenFullGuide && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenFullGuide}
                  className="text-xs text-[#D9B864] hover:underline font-bold"
                >
                  عرض الدليل التفصيلي للأحياء والمحاور &larr;
                </button>
              </div>
            )}
          </div>

          {/* Left Column: 2-Column Grid of District Average Cards */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-3">
              {DISTRICT_AVERAGES.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onSelectDistrict(d.name)}
                  className="bg-[#1D1C19] hover:bg-[#262521] border border-white/10 hover:border-[#D9B864]/40 rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer text-right group"
                >
                  <span className="text-sm font-bold text-white group-hover:text-[#D9B864] transition-colors">
                    {d.name}
                  </span>
                  <span className="text-xs text-[#A3A09A] font-mono">
                    {d.avgPrice}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
