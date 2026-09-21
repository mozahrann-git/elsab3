import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { HadabaWostaNeighborhood } from '../types';

interface ExploreDistrictsSectionProps {
  onOpenDistrictGuide?: (districtName?: string) => void;
  onSelectDistrict?: (district: HadabaWostaNeighborhood) => void;
}

export const ExploreDistrictsSection: React.FC<ExploreDistrictsSectionProps> = ({
  onOpenDistrictGuide,
  onSelectDistrict
}) => {
  const districts: { name: HadabaWostaNeighborhood; subtitle: string; image: string; badge: string }[] = [
    {
      name: 'الحي الأول',
      subtitle: 'مدارس تجريبية وخاصة · محاور دائرية · بوابات المعادي',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
      badge: 'الأكثر طلباً'
    },
    {
      name: 'الحي الثاني',
      subtitle: 'كلية الصيدلة MTI · مدارس ريتاج والبارون · خدمات متكاملة',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
      badge: 'أعلى حيوية'
    },
    {
      name: 'الحي الثالث',
      subtitle: 'كمبوند فلورينتا · إيزي سبورتس · أرقى عمارات سكنية',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      badge: 'كمبوندات راقية'
    },
    {
      name: 'تقسيم المباحث',
      subtitle: 'بجوار كارفور المعادي · نادي وادي دجلة · محور الكفراوي',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
      badge: 'قرب المعادي'
    }
  ];

  const handleDistrictClick = (districtName: HadabaWostaNeighborhood) => {
    if (onSelectDistrict) {
      onSelectDistrict(districtName);
    } else if (onOpenDistrictGuide) {
      onOpenDistrictGuide(districtName);
    }
  };

  return (
    <section id="districts-guide-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 font-ibm" dir="rtl">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#A07A26] block">
              دليل الأحياء
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-readex text-[#141414]">
              اعرف الحي قبل ما تعاين
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenDistrictGuide?.()}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#A07A26] hover:text-[#141414] transition-colors cursor-pointer"
          >
            <span>عرض كل الـ 9 أحياء</span>
            <ArrowLeft size={14} />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {districts.map((item) => (
            <div
              key={item.name}
              onClick={() => handleDistrictClick(item.name)}
              className="bg-white rounded-3xl border border-[#ECE8DF] hover:border-[#E9DFCA] overflow-hidden group cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-md flex flex-col"
            >
              {/* Image with subtle gradient placeholder */}
              <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  {item.badge}
                </div>
              </div>

              {/* Text Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-lg font-bold font-readex text-[#141414] group-hover:text-[#A07A26] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#6B665C] mt-1.5 leading-relaxed">
                    [{item.subtitle}]
                  </p>
                </div>

                <div className="pt-2 border-t border-[#ECE8DF] flex items-center justify-between text-xs font-bold text-[#A07A26]">
                  <span>شقق الحي ومميزاته</span>
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
