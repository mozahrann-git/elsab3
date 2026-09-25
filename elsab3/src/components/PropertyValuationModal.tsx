import React, { useState } from 'react';
import { HadabaWostaNeighborhood, NeighborhoodPriceMapData } from '../types';
import { INITIAL_PRICE_MAP_DATA, calculatePropertyValuation } from '../data/marketPriceData';
import { formatPrice, generateWhatsAppLink } from '../utils/helpers';
import { LionLogo } from './LionLogo';
import { X, Check, Calculator, PhoneCall, Sparkles, Send, ShieldAlert } from 'lucide-react';

interface PropertyValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceMapData?: NeighborhoodPriceMapData[];
  onRequestInspection?: (data: {
    neighborhood: HadabaWostaNeighborhood;
    area: number;
    phone: string;
    estimatedRange: string;
  }) => void;
}

export const PropertyValuationModal: React.FC<PropertyValuationModalProps> = ({
  isOpen,
  onClose,
  priceMapData = INITIAL_PRICE_MAP_DATA,
  onRequestInspection
}) => {
  const [neighborhood, setNeighborhood] = useState<HadabaWostaNeighborhood>('الحي الأول');
  const [area, setArea] = useState<number>(150);
  const [floorType, setFloorType] = useState<'ground_garden' | 'floor_1_4' | 'floor_5_7' | 'floor_5_7'>('floor_1_4');
  const [finishing, setFinishing] = useState<'super_lux' | 'semi_finished'>('super_lux');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['elevator']);
  const [phone, setPhone] = useState<string>('');
  const [hasCalculated, setHasCalculated] = useState<boolean>(true);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const valuation = calculatePropertyValuation({
    neighborhood,
    area,
    floorType,
    finishing,
    features: selectedFeatures
  }, priceMapData);

  const toggleFeature = (featureKey: string) => {
    if (selectedFeatures.includes(featureKey)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== featureKey));
    } else {
      setSelectedFeatures([...selectedFeatures, featureKey]);
    }
  };

  const handleRequestInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    if (onRequestInspection) {
      onRequestInspection({
        neighborhood,
        area,
        phone,
        estimatedRange: `${formatPrice(valuation.minPrice)} - ${formatPrice(valuation.maxPrice)} ج.م`
      });
    }

    const msg = `مرحباً، قمت بطلب تقييم ومعاينة مجانية لشقتي في ${neighborhood} بمساحة ${area}م². النطاق التقديري: ${formatPrice(valuation.minPrice)} إلى ${formatPrice(valuation.maxPrice)} ج.م. رقم التواصل: ${phone}`;
    const url = generateWhatsAppLink('01021242871', undefined, undefined, msg);
    window.open(url, '_blank');

    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 font-ibm" dir="rtl">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-3xl border border-[#ECE8DF] shadow-2xl overflow-hidden my-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with Step Counter */}
        <header className="px-6 sm:px-8 py-4 border-b border-[#ECE8DF] flex items-center justify-between bg-[#F6F4EF]/40">
          <div className="flex items-center gap-3">
            <LionLogo size={32} />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-[#A07A26] bg-[#FAF4E5] border border-[#E9DFCA] px-3 py-1 rounded-full">
              خطوة 2 من 3
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#6B665C] hover:text-[#141414] hover:bg-[#ECE8DF] rounded-xl transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Progress Bar Line */}
        <div className="w-full bg-[#ECE8DF] h-1">
          <div className="bg-[#A07A26] h-1 w-2/3 transition-all duration-300" />
        </div>

        {/* Main Content Grid */}
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Right Column: Calculator Input Form */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-readex text-[#141414]">
                كام تستاهل شقتك؟
              </h2>
              <p className="text-xs sm:text-sm text-[#6B665C] mt-1">
                احسب القيمة السوقية العادلة لشقتك في الهضبة الوسطى بناءً على صفقات حقيقية اتنفذت.
              </p>
            </div>

            {/* Neighborhood & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4A463F]">الحي</label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value as HadabaWostaNeighborhood)}
                  className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#A07A26]/30"
                >
                  <option value="الحي الأول">الحي الأول</option>
                  <option value="الحي الثاني">الحي الثاني</option>
                  <option value="الحي الثالث">الحي الثالث</option>
                  <option value="الحي الرابع">الحي الرابع</option>
                  <option value="الحي الخامس">الحي الخامس</option>
                  <option value="الحي السادس">الحي السادس</option>
                  <option value="الحي السابع">الحي السابع</option>
                  <option value="الحي الثامن">الحي الثامن</option>
                  <option value="تقسيم المباحث">تقسيم المباحث</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4A463F]">المساحة (م²)</label>
                <input
                  type="number"
                  min={50}
                  max={600}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#A07A26]/30"
                />
              </div>
            </div>

            {/* Floor selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4A463F]">الدور</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'ground_garden', label: 'أرضي بجاردن' },
                  { key: 'floor_1_4', label: '1 - 4 (متكرر)' },
                  { key: 'floor_5_7', label: '5 - 7 (مخالف)' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFloorType(item.key as any)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      floorType === item.key
                        ? 'bg-[#141414] text-white border-[#141414] shadow-2xs'
                        : 'bg-[#F6F4EF] text-[#4A463F] border-[#ECE8DF] hover:border-[#141414]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {floorType === 'floor_5_7' && (
                <p className="text-[11px] text-[#9A2E1F] font-semibold">الأدوار 5 - 7 مخالفة للترخيص، فبتتحسب أقل بـ 3,000 ج.م للمتر.</p>
              )}
            </div>

            {/* Finishing selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4A463F]">التشطيب</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFinishing('super_lux')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    finishing === 'super_lux'
                      ? 'bg-[#141414] text-white border-[#141414] shadow-2xs'
                      : 'bg-[#F6F4EF] text-[#4A463F] border-[#ECE8DF] hover:border-[#141414]'
                  }`}
                >
                  سوبر لوكس
                </button>
                <button
                  type="button"
                  onClick={() => setFinishing('semi_finished')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    finishing === 'semi_finished'
                      ? 'bg-[#141414] text-white border-[#141414] shadow-2xs'
                      : 'bg-[#F6F4EF] text-[#4A463F] border-[#ECE8DF] hover:border-[#141414]'
                  }`}
                >
                  نصف تشطيب
                </button>
              </div>
            </div>

            {/* Features multi-select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4A463F]">مميزات إضافية</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'elevator', label: 'أسانسير' },
                  { key: 'garage', label: 'جراج' },
                  { key: 'registered_contract', label: 'عقد مسجل' },
                  { key: 'facade', label: 'واجهة' }
                ].map((feat) => {
                  const isChecked = selectedFeatures.includes(feat.key);
                  return (
                    <button
                      key={feat.key}
                      type="button"
                      onClick={() => toggleFeature(feat.key)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-[#FAF4E5] border-[#A07A26] text-[#A07A26]'
                          : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#6B665C]'
                      }`}
                    >
                      {isChecked && <Check size={13} />}
                      <span>{feat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHasCalculated(true)}
              className="w-full py-3.5 bg-[#A07A26] hover:bg-[#8B681E] text-white rounded-xl font-bold font-readex text-sm shadow-xs transition-all cursor-pointer"
            >
              احسب السعر
            </button>
          </div>

          {/* Left Column: Result Dark Box */}
          <div className="lg:col-span-5 bg-[#141414] text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-stone-800">
            <div>
              <span className="text-xs text-[#D9B864] font-bold block mb-2">
                السعر المتوقع لشقتك
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-readex text-white leading-tight">
                {formatPrice(valuation.minPrice)} - {formatPrice(valuation.maxPrice)}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                ج.م · بناءً على {valuation.similarCount} وحدة مشابهة في {neighborhood}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-800 pt-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold font-readex text-stone-200">
                  عايز الرقم الدقيق؟
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  فريقنا يعاين الوحدة على أرض الواقع ويقولك السعر الدقيق خلال 24 ساعة.
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleRequestInspectionSubmit} className="space-y-3">
                  <input
                    type="tel"
                    placeholder="رقم الواتساب (مثال: 01012345678)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-stone-900 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D9B864]/50"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#D9B864] hover:bg-[#C8A44E] text-[#141414] font-bold font-readex rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PhoneCall size={14} />
                    <span>اطلب معاينة ببلاش</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-[#FAF4E5]/10 border border-[#D9B864]/30 rounded-xl text-xs text-[#D9B864] flex items-center gap-2">
                  <Check size={16} />
                  <span>تم استلام طلب المعاينة وسيتواصل معك فريق السيلز فوراً!</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-stone-500 leading-normal pt-2 border-t border-stone-900">
              السعر تقديري من واقع بيانات الوحدات المعروضة والمباعة لدينا، وليس تقييماً رسمياً معتمداً.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
