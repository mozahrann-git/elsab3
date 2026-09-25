import React, { useState } from 'react';
import { NeighborhoodPriceMapData, HadabaWostaNeighborhood } from '../types';
import { INITIAL_PRICE_MAP_DATA } from '../data/marketPriceData';
import { formatPrice } from '../utils/helpers';
import { X, MapPin, Building, Check, ArrowLeft, Layers, ArrowUpRight } from 'lucide-react';

interface PriceHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceMapData?: NeighborhoodPriceMapData[];
  onSelectNeighborhoodFilter?: (neighborhood: HadabaWostaNeighborhood, finishing?: 'finished' | 'semi_finished' | 'all') => void;
}

export const PriceHeatmapModal: React.FC<PriceHeatmapModalProps> = ({
  isOpen,
  onClose,
  priceMapData = INITIAL_PRICE_MAP_DATA,
  onSelectNeighborhoodFilter,
}) => {
  const [finishingType, setFinishingType] = useState<'finished' | 'semi_finished'>('finished');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<HadabaWostaNeighborhood>('الحي الأول');

  if (!isOpen) return null;

  const currentDistrict = priceMapData.find(d => d.neighborhood === selectedNeighborhood) || priceMapData[0];

  const handleApplyFilter = (finishing: 'finished' | 'semi_finished' | 'all' = finishingType) => {
    if (onSelectNeighborhoodFilter) {
      onSelectNeighborhoodFilter(selectedNeighborhood, finishing);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center sm:p-4 font-ibm"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-white sm:rounded-3xl border border-[#ECE8DF] shadow-2xl overflow-hidden flex flex-col text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#ECE8DF] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#6B665C] hover:text-[#141414] hover:bg-[#ECE8DF] rounded-xl transition-all cursor-pointer sm:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold font-readex text-[#141414]">
                مؤشر أسعار الهضبة الوسطى
              </h2>
              <p className="text-[11px] text-[#6B665C]">
                متوسط سعر المتر التقديري المحدث لجميع الأحياء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Finishing Pill Switcher */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-[#ECE8DF] text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setFinishingType('finished')}
                className={`px-3 py-1.5 rounded-lg font-bold font-readex transition-all cursor-pointer ${
                  finishingType === 'finished'
                    ? 'bg-[#141414] text-white shadow-2xs'
                    : 'text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                متشطب
              </button>
              <button
                type="button"
                onClick={() => setFinishingType('semi_finished')}
                className={`px-3 py-1.5 rounded-lg font-bold font-readex transition-all cursor-pointer ${
                  finishingType === 'semi_finished'
                    ? 'bg-[#141414] text-white shadow-2xs'
                    : 'text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                نصف تشطيب
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#6B665C] hover:text-[#141414] hover:bg-[#ECE8DF] rounded-xl transition-all cursor-pointer hidden sm:flex"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          
          {/* 1. Interactive Districts Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#6B665C]">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#A07A26]" />
                <span>اختر الحي (9 أحياء):</span>
              </span>
              <span className="text-[11px] text-[#8C827A] font-normal">
                الأسعار معروضة لـ {finishingType === 'finished' ? 'المتشطب' : 'النصف تشطيب'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {priceMapData.slice(0, 8).map((district) => {
                const isSelected = district.neighborhood === selectedNeighborhood;
                const price = finishingType === 'finished' ? district.avgFinishedPrice : district.avgSemiFinishedPrice;

                return (
                  <button
                    key={district.neighborhood}
                    type="button"
                    onClick={() => setSelectedNeighborhood(district.neighborhood)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-right transition-all cursor-pointer active:scale-98 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#141414] border-[#141414] text-white shadow-md'
                        : 'bg-[#F9F8F5] hover:bg-[#F2EFE9] border-[#ECE8DF] text-[#141414]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-readex font-bold text-xs sm:text-sm">
                        {district.neighborhood}
                      </span>
                      {isSelected && (
                        <Check size={13} className="text-[#E9DFCA]" strokeWidth={3} />
                      )}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs sm:text-sm font-extrabold font-readex block ${isSelected ? 'text-[#FAF4E5]' : 'text-[#141414]'}`}>
                        {formatPrice(price)} ج.م
                      </span>
                      <span className={`text-[10px] block ${isSelected ? 'text-[#A8A29E]' : 'text-[#8C827A]'}`}>
                        لكل م²
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Taqseem El Mabahith Single Wide Button */}
            {priceMapData.find(d => d.neighborhood === 'تقسيم المباحث') && (() => {
              const district = priceMapData.find(d => d.neighborhood === 'تقسيم المباحث')!;
              const isSelected = district.neighborhood === selectedNeighborhood;
              const price = finishingType === 'finished' ? district.avgFinishedPrice : district.avgSemiFinishedPrice;

              return (
                <button
                  type="button"
                  onClick={() => setSelectedNeighborhood(district.neighborhood)}
                  className={`w-full p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between text-right transition-all cursor-pointer active:scale-98 ${
                    isSelected
                      ? 'bg-[#141414] border-[#141414] text-white shadow-md'
                      : 'bg-[#F9F8F5] hover:bg-[#F2EFE9] border-[#ECE8DF] text-[#141414]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelected && <Check size={13} className="text-[#E9DFCA]" strokeWidth={3} />}
                    <span className="font-readex font-bold text-xs sm:text-sm">
                      {district.neighborhood}
                    </span>
                    <span className={`text-[10px] hidden sm:inline ${isSelected ? 'text-[#D6D3D1]' : 'text-[#8C827A]'}`}>
                      (بجوار كارفور المعادي ووادي دجلة)
                    </span>
                  </div>
                  <div className="text-left">
                    <span className={`text-xs sm:text-sm font-extrabold font-readex block ${isSelected ? 'text-[#FAF4E5]' : 'text-[#141414]'}`}>
                      {formatPrice(price)} ج.م / م²
                    </span>
                  </div>
                </button>
              );
            })()}
          </div>

          {/* 2. Focused Neighborhood Details & Clickable Finishing Cards */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-[#E9DFCA] p-4 sm:p-5 space-y-3.5">
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#A07A26] block">
                  الحي المحدد
                </span>
                <h3 className="text-lg sm:text-xl font-bold font-readex text-[#141414]">
                  {currentDistrict.neighborhood}
                </h3>
              </div>

              <span className="px-3 py-1 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-xl text-xs font-bold font-readex">
                {currentDistrict.availableUnitsCount || 15} وحدة متاحة
              </span>
            </div>

            {/* Clickable Finishing Option Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Option 1: متشطب */}
              <button
                type="button"
                onClick={() => setFinishingType('finished')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer active:scale-98 ${
                  finishingType === 'finished'
                    ? 'bg-white border-[#A07A26] ring-2 ring-[#A07A26]/30 shadow-xs'
                    : 'bg-white/60 hover:bg-white border-[#ECE8DF]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#141414]">شقق متشطبة</span>
                  {finishingType === 'finished' && (
                    <span className="text-[9px] bg-[#FAF4E5] text-[#A07A26] px-1.5 py-0.5 rounded-md font-bold">
                      محدد ✓
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold font-readex text-[#A07A26]">
                  {formatPrice(currentDistrict.avgFinishedPrice)}
                  <span className="text-[10px] text-[#6B665C] font-normal mr-1">ج.م/م²</span>
                </p>
                <span className={`text-[10px] block mt-1 ${finishingType === 'finished' ? 'text-[#A07A26] font-bold' : 'text-[#8C827A]'}`}>
                  {finishingType === 'finished' ? '✓ تم التحديد' : 'انقر لاختيار المتشطب'}
                </span>
              </button>

              {/* Option 2: نصف تشطيب */}
              <button
                type="button"
                onClick={() => setFinishingType('semi_finished')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer active:scale-98 ${
                  finishingType === 'semi_finished'
                    ? 'bg-white border-[#A07A26] ring-2 ring-[#A07A26]/30 shadow-xs'
                    : 'bg-white/60 hover:bg-white border-[#ECE8DF]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#141414]">نصف تشطيب</span>
                  {finishingType === 'semi_finished' && (
                    <span className="text-[9px] bg-[#FAF4E5] text-[#A07A26] px-1.5 py-0.5 rounded-md font-bold">
                      محدد ✓
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold font-readex text-[#A07A26]">
                  {formatPrice(currentDistrict.avgSemiFinishedPrice)}
                  <span className="text-[10px] text-[#6B665C] font-normal mr-1">ج.م/م²</span>
                </p>
                <span className={`text-[10px] block mt-1 ${finishingType === 'semi_finished' ? 'text-[#A07A26] font-bold' : 'text-[#8C827A]'}`}>
                  {finishingType === 'semi_finished' ? '✓ تم التحديد' : 'انقر لاختيار نصف التشطيب'}
                </span>
              </button>

            </div>

            {/* Landmarks preview */}
            {currentDistrict.keyLandmarks && (
              <p className="text-xs text-[#6B665C] bg-white p-2.5 rounded-xl border border-[#ECE8DF] leading-relaxed">
                <strong className="text-[#141414]">أبرز المعالم: </strong>
                {currentDistrict.keyLandmarks}
              </p>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => handleApplyFilter(finishingType)}
              className="w-full py-3 bg-[#141414] hover:bg-black active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold font-readex flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mt-1"
            >
              <Building size={15} className="text-[#E9DFCA]" />
              <span>
                عرض شقق {currentDistrict.neighborhood} ({finishingType === 'finished' ? 'متشطب' : 'نصف تشطيب'})
              </span>
              <ArrowUpRight size={14} className="opacity-75" />
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};
