import React from 'react';
import { Property } from '../types';
import { 
  X, 
  Trash2, 
  MapPin, 
  MessageCircle, 
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Layers,
  Building2,
  Tag
} from 'lucide-react';
import { formatPrice, formatNumber, generateWhatsAppLink } from '../utils/helpers';
import { LionLogo } from './LionLogo';

interface PropertyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onRemove: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onClearAll: () => void;
}

export const PropertyComparisonModal: React.FC<PropertyComparisonModalProps> = ({
  isOpen,
  onClose,
  properties,
  onRemove,
  onSelectProperty,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/98 backdrop-blur-3xl flex flex-col h-full w-full overflow-hidden text-right text-stone-100 select-none"
      onClick={onClose}
    >
      {/* Full-Screen Container */}
      <div 
        className="w-full h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft, Line-Free Floating Top Header */}
        <header className="w-full px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-stone-900/90 shadow-md flex items-center justify-center shrink-0">
              <LionLogo size={28} withText={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                  مقارنة شقق الهضبة الوسطى
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black">
                  {properties.length} من 3
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                مقارنة دقيقة وسلسة للمواصفات، الأسعار، وأنظمة السداد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {properties.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3.5 py-2 rounded-2xl bg-stone-900/80 hover:bg-rose-950/40 text-stone-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">مسح المقارنة</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
              title="إغلاق المقارنة"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Smoozy Main Content Deck */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-2 pb-10">
          {properties.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-xl">
                <Sparkles size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  قائمة المقارنة فارغة حالياً
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  انقر على زر "مقارنة" الموجود على أي شقة في المعرض لإضافتها هنا ومقارنتها بسلاسة.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                العودة لمعرض الشقق
              </button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto w-full">
              {/* Smooth Grid / Mobile Snap Carousel */}
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
                {properties.map((property) => {
                  const defaultDp = property.offPlanType === 'compound' ? 10 : 35;
                  const dpPercent = property.downPaymentPercentage || defaultDp;
                  const defaultYears = property.offPlanType === 'compound' ? 10 : 3;
                  const years = property.installmentYears || defaultYears;
                  const isOffPlan = property.category === 'off_plan';

                  return (
                    <article
                      key={property.id}
                      className="min-w-[85vw] sm:min-w-0 flex-1 snap-center bg-stone-900/60 hover:bg-stone-900/80 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between space-y-5 transition-all group"
                    >
                      {/* Top Media & Identification */}
                      <div className="space-y-4">
                        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-stone-950 shadow-md">
                          <img
                            src={property.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'}
                            alt={property.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />

                          {/* Soft Pill Neighborhood Badge */}
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-950/85 backdrop-blur-md text-amber-400 text-xs font-bold shadow-sm">
                            <MapPin size={12} className="shrink-0" />
                            <span>{property.neighborhood}</span>
                          </div>

                          {/* Discreet Remove Button */}
                          <button
                            type="button"
                            onClick={() => onRemove(property.id)}
                            className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-stone-950/80 hover:bg-rose-600 text-stone-300 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
                            title="إزالة هذه الشقة من المقارنة"
                            aria-label="إزالة"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        {/* Title & Code */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                            <span>#{property.code}</span>
                            {property.plotNumber && (
                              <span className="flex items-center gap-1 text-amber-300 font-bold">
                                <Tag size={11} />
                                <span>قطعة {property.plotNumber}</span>
                              </span>
                            )}
                          </div>
                          <h2 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2">
                            {property.title}
                          </h2>
                        </div>

                        {/* Soft Bubble: Price */}
                        <div className="bg-stone-800/50 rounded-2xl p-4 space-y-1">
                          <span className="text-[11px] text-stone-400 font-medium block">
                            {isOffPlan ? 'السعر يبدأ من / الإجمالي:' : 'السعر المطلوب:'}
                          </span>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight">
                              {formatPrice(property.price)}
                            </span>
                            {property.pricePerMeter && (
                              <span className="text-xs text-stone-300 font-mono">
                                {formatNumber(property.pricePerMeter)} ج/م²
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Soft Bubble: Specs */}
                        <div className="bg-stone-800/40 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 block font-medium">المساحة</span>
                            <span className="text-sm font-black text-white font-mono">{property.area} م²</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 block font-medium">الغرف</span>
                            <span className="text-sm font-black text-white font-mono">{property.bedrooms} نوم</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-400 block font-medium">الحمامات</span>
                            <span className="text-sm font-black text-white font-mono">{property.bathrooms} حمام</span>
                          </div>
                        </div>

                        {/* Soft Bubble: System & Finishing */}
                        <div className="bg-stone-800/40 rounded-2xl p-4 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">نوع الوحدة:</span>
                            <span className="font-bold text-white">
                              {property.category === 'off_plan'
                                ? (property.offPlanType === 'standalone_building' ? 'عمارة منفصلة (إنشاء)' : 'كمبوند متكامل')
                                : 'شقة سكنية (ريسيل)'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">حالة التشطيب:</span>
                            <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              property.finishing === 'finished'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-stone-700/60 text-stone-200'
                            }`}>
                              {property.finishing === 'finished' ? 'سوبر لوكس' : 'نصف تشطيب'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-stone-400 font-medium">نظام الدفع:</span>
                            <span className="font-bold text-amber-300">
                              {isOffPlan ? `مقدم ${dpPercent}% وقسط ${years} سنين` : 'كاش / استلام فوري'}
                            </span>
                          </div>

                          {property.floor && (
                            <div className="flex items-center justify-between">
                              <span className="text-stone-400 font-medium">الدور:</span>
                              <span className="font-bold text-white">{property.floor}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Smooth Actions */}
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProperty(property);
                          }}
                          className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <span>عرض كامل المواصفات</span>
                          <ArrowLeft size={16} />
                        </button>

                        <a
                          href={generateWhatsAppLink('01021242871', property.code, property.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <MessageCircle size={16} />
                          <span>استفسار واتساب مباشر</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

