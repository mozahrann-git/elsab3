import React from 'react';

interface HeroSectionProps {
  totalPropertiesCount?: number;
  filteredCount?: number;
  bannerPhotoUrl?: string;
  onSearchClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalPropertiesCount = 152,
  bannerPhotoUrl,
}) => {
  const heroImage = bannerPhotoUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

  return (
    <section className="relative w-full pt-8 pb-4 sm:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-ibm" dir="rtl">
      {/* 2-Column Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Right Column: Text & Stats */}
        <div className="lg:col-span-7 space-y-6 text-right">
          
          {/* Top Gold Subtitle */}
          <p className="text-xs sm:text-sm font-semibold text-[#A07A26] font-readex">
            تسويق واستثمار عقاري فاخر — المقطم والهضبة الوسطى وكافة الأحياء
          </p>

          {/* Main Large Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] font-bold text-[#141414] leading-[1.25] tracking-tight font-readex">
            شقتك في المقطم،
            <br />
            بسعرها الحقيقي
            <br />
            ومن غير مفاجآت.
          </h1>

          {/* Description Paragraph */}
          <p className="text-sm sm:text-base text-[#4A463F] leading-relaxed max-w-xl">
            كل وحدة عندنا اتعاينت على الطبيعة، والصور والسعر مطابقين للواقع. ندلك على الحي المناسب لميزانيتك ونتابع معاك لحد العقد.
          </p>

          {/* Stats Row */}
          <div className="pt-2 flex items-center gap-8 sm:gap-12">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#141414] font-readex">
                {totalPropertiesCount > 0 ? totalPropertiesCount : 152}
              </p>
              <p className="text-xs sm:text-sm text-[#6B665C] mt-0.5">
                وحدة متاحة الآن
              </p>
            </div>

            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#141414] font-readex">
                9
              </p>
              <p className="text-xs sm:text-sm text-[#6B665C] mt-0.5">
                أحياء نغطيها
              </p>
            </div>

            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#141414] font-readex">
                +15
              </p>
              <p className="text-xs sm:text-sm text-[#6B665C] mt-0.5">
                سنة خبرة بالمقطم
              </p>
            </div>
          </div>
        </div>

        {/* Left Column: Cover Image */}
        <div className="lg:col-span-5 relative">
          <div className="relative w-full h-72 sm:h-96 lg:h-[380px] rounded-3xl overflow-hidden border border-[#ECE8DF] bg-stone-200 shadow-xs">
            <img 
              src={heroImage} 
              alt="السبع للعقارات"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Tag at bottom right (in RTL) */}
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-[#141414] text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#ECE8DF] shadow-2xs font-readex">
              السبع للعقارات
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

