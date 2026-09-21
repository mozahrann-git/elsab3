import React from 'react';
import { FilterState } from '../types';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { 
  Search,
  MapPin,
  BedDouble,
  Building,
  Home,
  Percent,
  Calendar,
  Wallet,
  Maximize2,
  PaintBucket,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';

interface FilterSectionProps {
  filter: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset?: () => void;
  totalResults?: number;
  cardLayout?: 'grid' | 'horizontal';
  onCardLayoutChange?: (layout: 'grid' | 'horizontal') => void;
  onOpenExcelImport?: () => void;
  className?: string;
}

export const BUDGET_OPTIONS = [
  { id: 'all', label: 'كل الميزانيات والأسعار' },
  { id: 'under_2m', label: 'أقل من 2,000,000 ج.م' },
  { id: '2.2m_2.4m', label: '2.2 إلى 2.4 مليون ج.م' },
  { id: '2.5m_2.7m', label: '2.5 إلى 2.7 مليون ج.م' },
  { id: '2.8m_3.2m', label: '2.8 إلى 3.2 مليون ج.م' },
  { id: '3.2m_3.8m', label: '3.2 إلى 3.8 مليون ج.م' },
  { id: '4m_plus', label: '4,000,000 ج.م والمزيد' },
] as const;

export const BEDROOM_OPTIONS = [
  { id: 'all', label: 'كل الغرف' },
  { id: '2', label: 'غرفتين نوم (2)' },
  { id: '3', label: '3 غرف نوم (3)' },
  { id: '4+', label: '4 غرف فأكثر (4+)' },
] as const;

export const FINISHING_OPTIONS = [
  { id: 'all', label: 'كافة أنواع التشطيب' },
  { id: 'finished', label: 'سوبر لوكس (جاهز للسكن)' },
  { id: 'semi_finished', label: 'نصف تشطيب (محارة وحلوق)' },
] as const;

export const AREA_OPTIONS = [
  { min: 80, label: 'أي مساحة (من 80 م²)' },
  { min: 100, label: '100 م² فأكثر' },
  { min: 120, label: '120 م² فأكثر' },
  { min: 140, label: '140 م² فأكثر' },
  { min: 160, label: '160 م² فأكثر' },
  { min: 180, label: '180 م² فأكثر' },
  { min: 200, label: '200 م² فأكثر' },
  { min: 220, label: '220 م² فأكثر' },
] as const;

export const STANDALONE_DP_OPTIONS = [
  { id: 'all', label: 'كل نسب المقدم (35% و 50%)', max: 50 },
  { id: '35', label: 'مقدم 35%', max: 35 },
  { id: '50', label: 'مقدم 50%', max: 50 },
] as const;

export const STANDALONE_INSTALLMENT_OPTIONS = [
  { id: 'all', label: 'كل مدد التقسيط (حتى 3 سنوات)', max: 3 },
  { id: '2', label: 'تقسيط حتى سنتين (2)', max: 2 },
  { id: '3', label: 'تقسيط حتى 3 سنوات', max: 3 },
] as const;

export const COMPOUND_DP_OPTIONS = [
  { id: 'all', label: 'كل نسب المقدم (10% - 20%)', max: 20 },
  { id: '10', label: 'مقدم 10%', max: 10 },
  { id: '15', label: 'مقدم 15%', max: 15 },
  { id: '20', label: 'مقدم 20%', max: 20 },
] as const;

export const COMPOUND_INSTALLMENT_OPTIONS = [
  { id: 'all', label: 'كل مدد التقسيط (حتى 10 سنوات)', max: 10 },
  { id: '5', label: 'تقسيط حتى 5 سنوات', max: 5 },
  { id: '7', label: 'تقسيط حتى 7 سنوات', max: 7 },
  { id: '8', label: 'تقسيط حتى 8 سنوات', max: 8 },
  { id: '10', label: 'تقسيط حتى 10 سنوات', max: 10 },
] as const;

export const FilterSection: React.FC<FilterSectionProps> = ({
  filter,
  onFilterChange,
  onReset,
  totalResults,
  className = ''
}) => {
  const activeCategory = filter.category === 'off_plan' ? 'off_plan' : 'resale';
  const isOffPlan = activeCategory === 'off_plan';
  const activeOffPlanType = filter.offPlanType === 'compound' ? 'compound' : 'standalone_building';
  const isCompound = activeOffPlanType === 'compound';

  const dpMax = filter.downPaymentPercentMax ?? (isCompound ? 20 : 50);
  const instMax = filter.installmentYearsMax ?? (isCompound ? 10 : 3);
  const delMax = filter.deliveryYearMax ?? (isCompound ? 2030 : 2027);

  const activeBudget = filter.budgetRange || 'all';

  const hasAnyActiveFilter = isOffPlan
    ? Boolean(filter.search?.trim()) ||
      (isCompound
        ? (dpMax < 20 || instMax < 10 || delMax < 2030 || (Boolean(filter.downPayment) && filter.downPayment !== 'all') || (Boolean(filter.installmentYears) && filter.installmentYears !== 'all'))
        : (dpMax < 50 || instMax < 3 || delMax < 2027 || (Boolean(filter.downPayment) && filter.downPayment !== 'all') || (Boolean(filter.installmentYears) && filter.installmentYears !== 'all'))
      ) || (activeBudget !== 'all') || (filter.minArea && filter.minArea > 80)
    : Boolean(filter.search?.trim()) ||
      Boolean(filter.neighborhood && filter.neighborhood !== 'all') ||
      (Boolean(filter.finishing) && filter.finishing !== 'all') ||
      (Boolean(filter.bedrooms) && filter.bedrooms !== 'all') ||
      (activeBudget !== 'all') ||
      (filter.minArea && filter.minArea > 80);

  return (
    <div className={`w-full bg-white rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-all text-right border border-[#ECE8DF] font-ibm ${className}`} dir="rtl">
      
      {/* 1. Top Control Bar: Category Switcher, Search Input & Total Results */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 border-b border-[#ECE8DF]">
        
        {/* Category Selector (Pills) */}
        <div className="flex items-center gap-1.5 bg-[#F6F4EF] p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => onFilterChange({ 
              ...filter, 
              category: 'resale', 
              downPayment: 'all', 
              installmentYears: 'all', 
              offPlanType: 'standalone_building' 
            })}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-readex flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === 'resale'
                ? 'bg-[#141414] text-white shadow-xs'
                : 'text-[#6B665C] hover:text-[#141414] hover:bg-[#ECE8DF]/60'
            }`}
          >
            <Home size={14} className={activeCategory === 'resale' ? "text-[#E9DFCA]" : "text-[#8C827A]"} />
            <span>شقق ريسيل (استلام فوري)</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ 
              ...filter, 
              category: 'off_plan', 
              offPlanType: activeOffPlanType,
              downPaymentPercentMax: isCompound ? 20 : 50,
              installmentYearsMax: isCompound ? 10 : 3,
              deliveryYearMax: isCompound ? 2030 : 2027,
              downPayment: 'all',
              installmentYears: 'all',
              neighborhood: '' 
            })}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-readex flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === 'off_plan'
                ? 'bg-[#141414] text-white shadow-xs'
                : 'text-[#6B665C] hover:text-[#141414] hover:bg-[#ECE8DF]/60'
            }`}
          >
            <Building size={14} className={activeCategory === 'off_plan' ? "text-[#A07A26]" : "text-[#8C827A]"} />
            <span>تحت الإنشاء (Off-plan)</span>
          </button>
        </div>

        {/* Integrated Quick Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
          <input
            type="text"
            placeholder={
              isOffPlan
                ? (isCompound ? "ابحث باسم الكمبوند أو المساحة..." : "ابحث برقم القطعة أو الحي...")
                : "ابحث بكود الشقة، اسم الشارع، أو الحي..."
            }
            value={filter.search || ''}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="w-full py-2.5 pr-10 pl-8 bg-[#F6F4EF] hover:bg-white focus:bg-white border border-[#ECE8DF] focus:border-[#A07A26] rounded-2xl text-xs text-[#141414] placeholder-[#8C827A] outline-none transition-all font-medium focus:ring-2 focus:ring-[#A07A26]/20"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, search: '' })}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#141414] text-sm font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#ECE8DF] cursor-pointer"
            >
              &times;
            </button>
          )}
        </div>

        {/* Results Counter & Reset Action */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          {totalResults !== undefined && (
            <span className="text-xs font-bold text-[#A07A26] bg-[#FAF4E5] border border-[#E9DFCA] px-3.5 py-2 rounded-xl font-readex flex items-center gap-1.5">
              <strong className="text-[#141414] font-readex text-sm">{totalResults}</strong>
              وحدة متاحة
            </span>
          )}

          {hasAnyActiveFilter && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold font-readex flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200/80 active:scale-95"
            >
              <RotateCcw size={12} />
              <span>إلغاء التصفية</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. Dropdown Filters Bar */}
      {!isOffPlan ? (
        /* ==================== RESALE DROPDOWNS WITH ARROWS ==================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          
          {/* 1. الحي */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#A07A26]" />
              <span>الحي بالهضبة:</span>
            </label>
            <div className="relative">
              <select
                value={filter.neighborhood || ''}
                onChange={(e) => onFilterChange({ ...filter, neighborhood: e.target.value })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  filter.neighborhood && filter.neighborhood !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                <option value="">كافة أحياء الهضبة الوسطى</option>
                {HADABA_WOSTA_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 2. الميزانية والسعر */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Wallet size={13} className="text-[#A07A26]" />
              <span>الميزانية والسعر:</span>
            </label>
            <div className="relative">
              <select
                value={activeBudget}
                onChange={(e) => onFilterChange({ ...filter, budgetRange: e.target.value })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  activeBudget !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 3. عدد الغرف */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <BedDouble size={13} className="text-[#A07A26]" />
              <span>عدد الغرف:</span>
            </label>
            <div className="relative">
              <select
                value={filter.bedrooms || 'all'}
                onChange={(e) => onFilterChange({ ...filter, bedrooms: e.target.value as any })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  filter.bedrooms && filter.bedrooms !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {BEDROOM_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 4. المساحة المطلوبة */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Maximize2 size={13} className="text-[#A07A26]" />
              <span>أقل مساحة مطلوبة:</span>
            </label>
            <div className="relative">
              <select
                value={filter.minArea || 80}
                onChange={(e) => onFilterChange({ ...filter, minArea: Number(e.target.value) })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  (filter.minArea || 80) > 80
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {AREA_OPTIONS.map((a) => (
                  <option key={a.min} value={a.min}>{a.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 5. نوع التشطيب */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <PaintBucket size={13} className="text-[#A07A26]" />
              <span>نوع التشطيب:</span>
            </label>
            <div className="relative">
              <select
                value={filter.finishing || 'all'}
                onChange={(e) => onFilterChange({ ...filter, finishing: e.target.value as any })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  filter.finishing && filter.finishing !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {FINISHING_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

        </div>
      ) : (
        /* ==================== OFF-PLAN DROPDOWNS WITH ARROWS ==================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          
          {/* 1. نوع المشروع (عمارات منفصلة أو كمبوندات) */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Building size={13} className="text-[#A07A26]" />
              <span>نوع المشروع:</span>
            </label>
            <div className="relative">
              <select
                value={activeOffPlanType}
                onChange={(e) => {
                  const isComp = e.target.value === 'compound';
                  onFilterChange({ 
                    ...filter, 
                    offPlanType: e.target.value as any,
                    downPaymentPercentMax: isComp ? 20 : 50, 
                    installmentYearsMax: isComp ? 10 : 3, 
                    deliveryYearMax: isComp ? 2030 : 2027,
                    downPayment: 'all',
                    installmentYears: 'all',
                    minArea: 80,
                  });
                }}
                className="w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border border-[#ECE8DF] bg-[#F6F4EF] text-[#141414] hover:bg-white transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25"
              >
                <option value="standalone_building">قطع وعمارات منفصلة</option>
                <option value="compound">الكمبوندات السكنية</option>
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 2. المقدم */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Percent size={13} className="text-[#A07A26]" />
              <span>نسبة المقدم:</span>
            </label>
            <div className="relative">
              <select
                value={filter.downPayment || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  const item = (isCompound ? COMPOUND_DP_OPTIONS : STANDALONE_DP_OPTIONS).find(o => o.id === val);
                  onFilterChange({ 
                    ...filter, 
                    downPayment: val, 
                    downPaymentPercentMax: item?.max ?? (isCompound ? 20 : 50) 
                  });
                }}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  filter.downPayment && filter.downPayment !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {(isCompound ? COMPOUND_DP_OPTIONS : STANDALONE_DP_OPTIONS).map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 3. مدة التقسيط */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#A07A26]" />
              <span>مدة وسنوات التقسيط:</span>
            </label>
            <div className="relative">
              <select
                value={filter.installmentYears || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  const item = (isCompound ? COMPOUND_INSTALLMENT_OPTIONS : STANDALONE_INSTALLMENT_OPTIONS).find(o => o.id === val);
                  onFilterChange({ 
                    ...filter, 
                    installmentYears: val, 
                    installmentYearsMax: item?.max ?? (isCompound ? 10 : 3) 
                  });
                }}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  filter.installmentYears && filter.installmentYears !== 'all'
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {(isCompound ? COMPOUND_INSTALLMENT_OPTIONS : STANDALONE_INSTALLMENT_OPTIONS).map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

          {/* 4. المساحة */}
          <div className="relative">
            <label className="text-xs font-bold text-[#6B665C] mb-1.5 flex items-center gap-1.5">
              <Maximize2 size={13} className="text-[#A07A26]" />
              <span>المساحة المطلوبة:</span>
            </label>
            <div className="relative">
              <select
                value={filter.minArea || 80}
                onChange={(e) => onFilterChange({ ...filter, minArea: Number(e.target.value) })}
                className={`w-full py-2.5 pr-3.5 pl-8 rounded-2xl text-xs font-bold border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A07A26]/25 ${
                  (filter.minArea || 80) > 80
                    ? 'bg-[#FAF4E5] border-[#E9DFCA] text-[#A07A26] font-extrabold ring-1 ring-[#A07A26]/30'
                    : 'bg-[#F6F4EF] border-[#ECE8DF] text-[#141414] hover:bg-white'
                }`}
              >
                {AREA_OPTIONS.map((a) => (
                  <option key={a.min} value={a.min}>{a.label}</option>
                ))}
              </select>
              <ChevronDown 
                size={15} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] pointer-events-none stroke-[2.2]" 
              />
            </div>
          </div>

        </div>
      )}

      {/* 3. Active Filter Badges */}
      {hasAnyActiveFilter && (
        <div className="flex items-center gap-2 flex-wrap pt-2 text-xs border-t border-[#ECE8DF]">
          <span className="text-[#8C827A] font-bold flex items-center gap-1 font-readex">
            <SlidersHorizontal size={12} />
            <span>الفلاتر النشطة:</span>
          </span>

          {filter.neighborhood && filter.neighborhood !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>الحي: {filter.neighborhood}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, neighborhood: '' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {activeBudget !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>{BUDGET_OPTIONS.find(b => b.id === activeBudget)?.label}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, budgetRange: 'all' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {filter.finishing && filter.finishing !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>{FINISHING_OPTIONS.find(f => f.id === filter.finishing)?.label}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, finishing: 'all' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {filter.bedrooms && filter.bedrooms !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>{filter.bedrooms} غرف نوم</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, bedrooms: 'all' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {filter.minArea > 80 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>مساحة: {filter.minArea}م² فأكثر</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, minArea: 80 })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {isOffPlan && filter.downPayment && filter.downPayment !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>مقدم: {filter.downPayment}%</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, downPayment: 'all' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}

          {isOffPlan && filter.installmentYears && filter.installmentYears !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold">
              <span>تقسيط: {filter.installmentYears} سنوات</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, installmentYears: 'all' })}
                className="hover:text-rose-600 cursor-pointer font-black text-sm"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}

    </div>
  );
};
