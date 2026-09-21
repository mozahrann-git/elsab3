import React, { useState, useMemo } from 'react';
import { Property, HadabaWostaNeighborhood } from '../types';
import { formatPrice } from '../utils/helpers';
import { Sparkles, ArrowLeft, Building2, ChevronLeft, ChevronDown, ChevronUp, Eye, EyeOff, Home, Clock, Layers, Percent } from 'lucide-react';

interface BudgetDiscoverySectionProps {
  properties?: Property[];
  currentMaxPrice?: number;
  onSelectBudgetAndDistrict?: (
    neighborhood: HadabaWostaNeighborhood,
    budget: number,
    finishing?: 'finished' | 'semi_finished',
    category?: 'resale' | 'off_plan',
    bedrooms?: string,
    downPayment?: number
  ) => void;
  onSelectBudgetRange?: (min: number, max: number) => void;
  onSelectProperty?: (property: Property) => void;
}

interface DistrictMatchResult {
  district: HadabaWostaNeighborhood;
  matches: Property[];
  count: number;
  minArea: number;
  maxArea: number;
  bestPick: Property;
}

interface OffPlanPlotMatch {
  property: Property;
  plotNumber: string;
  projectName: string;
  neighborhood: HadabaWostaNeighborhood;
  downPaymentPercent: number;
  installmentYears: number;
  matchingUnits: Array<{
    id: string;
    area: number;
    floor: string;
    bedrooms: number;
    bathrooms: number;
    price: number;
    downPaymentAmount: number;
    monthlyInstallment?: number;
    finishing?: string;
    view?: string;
  }>;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
}

export const BudgetDiscoverySection: React.FC<BudgetDiscoverySectionProps> = ({
  properties = [],
  currentMaxPrice,
  onSelectBudgetAndDistrict,
  onSelectProperty
}) => {
  const [category, setCategory] = useState<'resale' | 'off_plan'>('resale');
  const [budget, setBudget] = useState<number>(currentMaxPrice || 3500000);
  const [finishing, setFinishing] = useState<'finished' | 'semi_finished'>('finished');
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(35);
  const [bedrooms, setBedrooms] = useState<string>('all');
  
  // Hidden by default, shown upon clicking the action button
  const [isResultsVisible, setIsResultsVisible] = useState<boolean>(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudget(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const val = Number(rawVal);
    if (!isNaN(val)) {
      setBudget(val);
    }
  };

  // Group and compute real matches per district
  const districtResults = useMemo<DistrictMatchResult[]>(() => {
    if (!properties || properties.length === 0) return [];

    // Filter real matching properties
    const matchingProps = properties.filter((p) => {
      // 1. Category check
      if (category === 'resale') {
        if (p.category === 'off_plan') return false;
        if (p.finishing !== finishing) return false;
      } else if (category === 'off_plan') {
        if (p.category !== 'off_plan') return false;
        const dp = p.downPaymentPercentage ?? (p.offPlanType === 'compound' ? 10 : 35);
        if (downPaymentPercent === 35 && dp > 35) return false;
        if (downPaymentPercent === 50 && dp > 50) return false;
      }

      // 2. Bedrooms check (applied to both resale & off-plan)
      if (bedrooms !== 'all') {
        if (category === 'off_plan' && p.availableUnits && p.availableUnits.length > 0) {
          const hasBed = p.availableUnits.some(u => 
            bedrooms === '4+' ? (u.bedrooms || 0) >= 4 : u.bedrooms === Number(bedrooms)
          );
          if (!hasBed && (bedrooms === '4+' ? (p.bedrooms || 0) < 4 : p.bedrooms !== Number(bedrooms))) {
            return false;
          }
        } else {
          if (bedrooms === '2' && p.bedrooms !== 2) return false;
          if (bedrooms === '3' && p.bedrooms !== 3) return false;
          if (bedrooms === '4+' && (p.bedrooms || 0) < 4) return false;
        }
      }

      // 3. Price check
      const effectivePrice = (p.availableUnits && p.availableUnits.length > 0)
        ? Math.min(...p.availableUnits.map(u => u.price))
        : (p.price || 0);

      if (effectivePrice > budget) return false;

      return !!p.neighborhood;
    });

    // Group by neighborhood and compute precise unit-level statistics
    const districtMap = new Map<HadabaWostaNeighborhood, {
      matchingProperties: Property[];
      matchingUnitsCount: number;
      areas: number[];
      bestUnit: { area: number; price: number; title?: string };
    }>();

    matchingProps.forEach((prop) => {
      const current = districtMap.get(prop.neighborhood) || {
        matchingProperties: [],
        matchingUnitsCount: 0,
        areas: [],
        bestUnit: { area: 0, price: 0 }
      };

      current.matchingProperties.push(prop);

      if (category === 'off_plan' && prop.availableUnits && prop.availableUnits.length > 0) {
        // Filter exact matching sub-units
        const validUnits = prop.availableUnits.filter(u => {
          const matchBed = bedrooms === 'all' 
            ? true 
            : bedrooms === '4+' 
              ? (u.bedrooms || 0) >= 4 
              : u.bedrooms === Number(bedrooms);
          const matchPrice = u.price <= budget;
          return matchBed && matchPrice;
        });

        if (validUnits.length > 0) {
          validUnits.forEach(u => {
            current.matchingUnitsCount += 1;
            if (u.area) current.areas.push(u.area);
            if (u.area > current.bestUnit.area) {
              current.bestUnit = { area: u.area, price: u.price, title: prop.title };
            }
          });
        } else {
          current.matchingUnitsCount += 1;
          if (prop.area) current.areas.push(prop.area);
          if (prop.area > current.bestUnit.area) {
            current.bestUnit = { area: prop.area, price: prop.price, title: prop.title };
          }
        }
      } else {
        current.matchingUnitsCount += 1;
        if (prop.area) current.areas.push(prop.area);
        if (prop.area > current.bestUnit.area) {
          current.bestUnit = { area: prop.area, price: prop.price, title: prop.title };
        }
      }

      districtMap.set(prop.neighborhood, current);
    });

    const results: DistrictMatchResult[] = [];

    districtMap.forEach((data, district) => {
      if (data.matchingProperties.length === 0 || data.matchingUnitsCount === 0) return;

      const minArea = data.areas.length > 0 ? Math.min(...data.areas) : 0;
      const maxArea = data.areas.length > 0 ? Math.max(...data.areas) : 0;

      // Find the best property representation
      const sorted = [...data.matchingProperties].sort((a, b) => (b.area || 0) - (a.area || 0));
      const bestPick = sorted[0];

      // Attach actual calculated best unit details to the representation
      const adjustedBestPick: Property = {
        ...bestPick,
        area: data.bestUnit.area || bestPick.area,
        price: data.bestUnit.price || bestPick.price,
      };

      results.push({
        district,
        matches: data.matchingProperties,
        count: data.matchingUnitsCount,
        minArea,
        maxArea,
        bestPick: adjustedBestPick
      });
    });

    // Sort district cards by count, highest first
    return results.sort((a, b) => b.count - a.count);
  }, [properties, budget, category, finishing, downPaymentPercent, bedrooms]);

  // For off-plan: Compute exact matching plots and their repeated floor units (الأدوار المتكررة)
  const offPlanPlotResults = useMemo<OffPlanPlotMatch[]>(() => {
    if (category !== 'off_plan' || !properties || properties.length === 0) return [];

    const matches: OffPlanPlotMatch[] = [];

    properties.forEach((p) => {
      if (p.category !== 'off_plan') return;
      const dp = p.downPaymentPercentage ?? (p.offPlanType === 'compound' ? 10 : 35);
      if (downPaymentPercent === 35 && dp > 35) return;
      if (downPaymentPercent === 50 && dp > 50) return;

      // Filter available units inside this plot/building
      const units = p.availableUnits || [];
      const matchingUnits = units.filter((u) => {
        const matchBed = bedrooms === 'all'
          ? true
          : bedrooms === '4+'
            ? (u.bedrooms || 0) >= 4
            : u.bedrooms === Number(bedrooms);
        const matchPrice = u.price <= budget;
        return matchBed && matchPrice;
      });

      // If units exist in availableUnits and at least one matches budget
      if (matchingUnits.length > 0) {
        const unitPrices = matchingUnits.map(u => u.price);
        const unitAreas = matchingUnits.map(u => u.area);

        matches.push({
          property: p,
          plotNumber: p.plotNumber || p.code || p.title,
          projectName: p.projectName || p.buildingName || p.title,
          neighborhood: p.neighborhood,
          downPaymentPercent: dp,
          installmentYears: p.installmentYears ?? 3,
          matchingUnits: matchingUnits.map(u => ({
            id: u.id,
            area: u.area,
            floor: u.floor || 'دور متكرر',
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            price: u.price,
            downPaymentAmount: u.downPaymentAmount || Math.round(u.price * (dp / 100)),
            monthlyInstallment: u.monthlyInstallment || Math.round((u.price * (1 - dp / 100)) / ((p.installmentYears || 3) * 12)),
            finishing: u.finishing || p.finishingLabel || 'نصف تشطيب',
            view: u.view || p.view
          })),
          minPrice: Math.min(...unitPrices),
          maxPrice: Math.max(...unitPrices),
          minArea: Math.min(...unitAreas),
          maxArea: Math.max(...unitAreas)
        });
      } else if (!p.availableUnits || p.availableUnits.length === 0) {
        // Standalone plot without sub-units array but matches price and bedroom
        const matchBed = bedrooms === 'all'
          ? true
          : bedrooms === '4+'
            ? (p.bedrooms || 0) >= 4
            : p.bedrooms === Number(bedrooms);
        if (p.price <= budget && matchBed) {
          matches.push({
            property: p,
            plotNumber: p.plotNumber || p.code || p.title,
            projectName: p.projectName || p.buildingName || p.title,
            neighborhood: p.neighborhood,
            downPaymentPercent: dp,
            installmentYears: p.installmentYears ?? 3,
            matchingUnits: [{
              id: p.id,
              area: p.area,
              floor: p.floor || 'دور متكرر',
              bedrooms: p.bedrooms || 3,
              bathrooms: p.bathrooms || 2,
              price: p.price,
              downPaymentAmount: Math.round(p.price * (dp / 100)),
              monthlyInstallment: Math.round((p.price * (1 - dp / 100)) / ((p.installmentYears || 3) * 12)),
              finishing: p.finishingLabel || 'نصف تشطيب',
              view: p.view
            }],
            minPrice: p.price,
            maxPrice: p.price,
            minArea: p.area,
            maxArea: p.area
          });
        }
      }
    });

    // Sort by number of matching units, then minPrice
    return matches.sort((a, b) => b.matchingUnits.length - a.matchingUnits.length);
  }, [properties, budget, category, downPaymentPercent, bedrooms]);

  // Total matching units
  const totalMatchingUnits = useMemo(() => {
    if (category === 'off_plan') {
      return offPlanPlotResults.reduce((sum, item) => sum + item.matchingUnits.length, 0);
    }
    return districtResults.reduce((sum, item) => sum + item.count, 0);
  }, [category, offPlanPlotResults, districtResults]);

  const handleDistrictClick = (district: HadabaWostaNeighborhood) => {
    if (onSelectBudgetAndDistrict) {
      onSelectBudgetAndDistrict(
        district,
        budget,
        category === 'resale' ? finishing : undefined,
        category,
        bedrooms,
        category === 'off_plan' ? downPaymentPercent : undefined
      );
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 font-ibm" dir="rtl">
      <div className="bg-white rounded-3xl border border-[#ECE8DF] p-6 sm:p-8 lg:p-10 shadow-xs transition-all">
        
        {/* Header & Controls Row */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isResultsVisible ? 'pb-8 border-b border-[#ECE8DF]/80' : ''}`}>
          
          {/* Right text */}
          <div className="lg:col-span-5 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-full text-xs font-bold font-readex">
              <Sparkles size={13} />
              <span>ميزانيتك تجيب إيه؟</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#141414] font-readex tracking-tight">
              اكتب ميزانيتك، نوريك الشقق الحقيقية فوراً
            </h2>
            <p className="text-xs sm:text-sm text-[#6B665C] leading-relaxed">
              اختر نوع العرض (ريسيل أو تحت الإنشاء)، حدد المواصفات والميزانية، ثم اضغط على زر عرض الشقق لتصفح كافة الوحدات المطابقة.
            </p>
          </div>

          {/* Left: Interactive Filters, Budget Slider & Toggle Button */}
          <div className="lg:col-span-7 space-y-3.5 bg-[#F6F4EF] p-5 sm:p-6 rounded-2xl border border-[#ECE8DF]">
            
            {/* 1. Category Switcher (ريسيل / تحت الإنشاء) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#4A463F] flex items-center gap-1">
                <Layers size={13} className="text-[#A07A26]" />
                <span>نوع العرض:</span>
              </label>
              
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ECE8DF] text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCategory('resale')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    category === 'resale' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  شقق ريسيل (استلام فوري)
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('off_plan')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    category === 'off_plan' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  تحت الإنشاء (تقسيط)
                </button>
              </div>
            </div>

            {/* 2. Conditional Sub-Filter: Finishing (for Resale) OR Down Payment Slider (for Off-Plan) */}
            {category === 'resale' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                <label className="text-xs font-bold text-[#4A463F] flex items-center gap-1">
                  <Home size={13} className="text-[#A07A26]" />
                  <span>حالة التشطيب:</span>
                </label>
                
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ECE8DF] text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFinishing('finished')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                      finishing === 'finished' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                    }`}
                  >
                    متشطب
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinishing('semi_finished')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                      finishing === 'semi_finished' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                    }`}
                  >
                    نصف تشطيب
                  </button>
                </div>
              </div>
            ) : (
              /* Down Payment Slider & Toggle for Off-Plan (35% أو 50%) */
              <div className="space-y-2 bg-white/80 p-3 rounded-xl border border-[#ECE8DF]">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#4A463F] flex items-center gap-1">
                    <Percent size={13} className="text-[#A07A26]" />
                    <span>نسبة المقدم المطلوبة:</span>
                  </label>
                  
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-[#ECE8DF] text-xs">
                    <button
                      type="button"
                      onClick={() => setDownPaymentPercent(35)}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        downPaymentPercent === 35 ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                      }`}
                    >
                      35% مقدم
                    </button>
                    <button
                      type="button"
                      onClick={() => setDownPaymentPercent(50)}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        downPaymentPercent === 50 ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                      }`}
                    >
                      50% مقدم
                    </button>
                  </div>
                </div>

                {/* Slider for Down Payment */}
                <div className="pt-1 px-1">
                  <input
                    type="range"
                    min={35}
                    max={50}
                    step={15}
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(Number(e.target.value) as 35 | 50)}
                    className="w-full accent-[#A07A26] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#6B665C] font-bold mt-0.5">
                    <span className={downPaymentPercent === 35 ? 'text-[#A07A26] font-bold' : ''}>35% مقدم (أقساط 2-3 سنوات)</span>
                    <span className={downPaymentPercent === 50 ? 'text-[#A07A26] font-bold' : ''}>50% مقدم (تسهيلات خاصة)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Bedrooms Filter (عدد الغرف - في الاثنين) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <label className="text-xs font-bold text-[#4A463F] flex items-center gap-1">
                <Clock size={13} className="text-[#A07A26]" />
                <span>عدد الغرف:</span>
              </label>
              
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#ECE8DF] text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBedrooms('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    bedrooms === 'all' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setBedrooms('2')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    bedrooms === '2' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  2 غرف
                </button>
                <button
                  type="button"
                  onClick={() => setBedrooms('3')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    bedrooms === '3' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  3 غرف
                </button>
                <button
                  type="button"
                  onClick={() => setBedrooms('4+')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    bedrooms === '4+' ? 'bg-[#141414] text-white shadow-2xs' : 'text-[#6B665C] hover:text-[#141414]'
                  }`}
                >
                  4+ غرف
                </button>
              </div>
            </div>

            {/* 4. Budget Input & Slider */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#4A463F] mb-1.5">
                <span>أقصى ميزانية للشراء:</span>
              </div>
              <input
                type="text"
                value={`${formatPrice(budget)} ج.م`}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#ECE8DF] text-xl sm:text-2xl font-bold font-readex text-[#141414] px-4 py-2.5 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[#A07A26]/30 shadow-2xs"
              />
            </div>

            {/* Slider */}
            <div className="pt-0.5">
              <input
                type="range"
                min={1500000}
                max={9000000}
                step={100000}
                value={budget}
                onChange={handleSliderChange}
                className="w-full accent-[#A07A26] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#6B665C] font-mono mt-1">
                <span>1.5M ج.م</span>
                <span>5M ج.م</span>
                <span>9M+ ج.م</span>
              </div>
            </div>

            {/* TOGGLE BUTTON FOR BUDGET CHOICES */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsResultsVisible(prev => !prev)}
                className={`w-full py-3 px-4 rounded-xl font-bold font-readex text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm active:scale-98 ${
                  isResultsVisible
                    ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-300'
                    : 'bg-[#A07A26] hover:bg-[#8A671F] text-white hover:shadow-md'
                }`}
              >
                {isResultsVisible ? (
                  <>
                    <EyeOff size={16} className="shrink-0" />
                    <span>{category === 'off_plan' ? 'إخفاء القطع والمساحات المتاحة' : 'إخفاء الشقق والأحياء المطابقة'}</span>
                    <ChevronUp size={16} className="shrink-0" />
                  </>
                ) : (
                  <>
                    <Eye size={16} className="shrink-0" />
                    <span>
                      {category === 'off_plan'
                        ? `عرض القطع والمساحات المتاحة (${totalMatchingUnits} مساحة بالأدوار المتكررة في ${offPlanPlotResults.length} قطعة)`
                        : `عرض الشقق المطابقة (${totalMatchingUnits} شقة متاحة)`}
                    </span>
                    <ChevronDown size={16} className="shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section - Hidden by Default, Shown when isResultsVisible is true */}
        {isResultsVisible && (
          <div className="pt-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#ECE8DF]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A07A26]" />
                <h3 className="text-sm sm:text-base font-bold text-[#141414] font-readex">
                  {category === 'off_plan'
                    ? `القطع والعمارات المتاحة تحت الإنشاء (مقدم ${downPaymentPercent}%) لميزانية ${formatPrice(budget)} ج.م ${bedrooms !== 'all' ? `· ${bedrooms === '4+' ? '4+ غرف' : `${bedrooms} غرف`}` : ''}`
                    : `الشقق والأحياء المتاحة (ريسيل استلام فوري) لميزانية ${formatPrice(budget)} ج.م (${finishing === 'finished' ? 'متشطب' : 'نصف تشطيب'}) ${bedrooms !== 'all' ? `· ${bedrooms === '4+' ? '4+ غرف' : `${bedrooms} غرف`}` : ''}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResultsVisible(false)}
                className="text-xs text-[#6B665C] hover:text-[#141414] flex items-center gap-1 font-bold cursor-pointer"
              >
                <span>إخفاء</span>
                <ChevronUp size={14} />
              </button>
            </div>

            {/* OFF-PLAN VIEW: Shows actual Plots and their Repeated Floor Units fitting the budget */}
            {category === 'off_plan' ? (
              offPlanPlotResults.length === 0 ? (
                <div className="text-center py-10 bg-[#F6F4EF] rounded-2xl border border-[#ECE8DF] p-6 space-y-2">
                  <Building2 className="w-8 h-8 text-[#A07A26] mx-auto opacity-70" />
                  <p className="text-sm font-bold text-[#141414]">لا توجد قطع أو عمارات تحت الإنشاء مطابقة للمعايير بميزانية {formatPrice(budget)} ج.م</p>
                  <p className="text-xs text-[#6B665C]">جرب رفع الميزانية بالمؤشر أو تغيير نسبة المقدم (35% أو 50%) لعرض القطع المتاحة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {offPlanPlotResults.map((plot) => (
                    <div
                      key={plot.property.id}
                      className="bg-[#F6F4EF] hover:bg-[#FAF4E5] border border-[#ECE8DF] hover:border-[#E9DFCA] p-5 rounded-2xl transition-all duration-200 group flex flex-col justify-between shadow-2xs"
                    >
                      <div className="space-y-3">
                        {/* Plot Header & District */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-xs font-bold text-[#A07A26] bg-[#FAF4E5] border border-[#E9DFCA] px-2.5 py-1 rounded-lg mb-1 font-readex">
                              {plot.plotNumber}
                            </span>
                            <h4 className="text-base font-bold text-[#141414] font-readex line-clamp-1">
                              {plot.projectName}
                            </h4>
                            <p className="text-xs text-[#6B665C] font-medium">
                              {plot.neighborhood} · الهضبة الوسطى
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-stone-700 bg-white border border-[#ECE8DF] px-2 py-1 rounded-lg shrink-0">
                            مقدم {plot.downPaymentPercent}% · قسط {plot.installmentYears} سنوات
                          </span>
                        </div>

                        {/* Repeated Floor Available Units Fitting Budget */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-xs font-bold text-[#4A463F] flex items-center justify-between">
                            <span>المساحات المتاحة بالأدوار المتكررة:</span>
                            <span className="text-[#A07A26] font-bold">{plot.matchingUnits.length} مساحات</span>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {plot.matchingUnits.map((u) => (
                              <div
                                key={u.id}
                                onClick={() => {
                                  if (onSelectProperty) onSelectProperty(plot.property);
                                }}
                                className="p-2.5 bg-white rounded-xl border border-[#ECE8DF] hover:border-[#A07A26] hover:bg-amber-50/40 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group/unit"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#141414] font-readex">
                                      {u.area} م²
                                    </span>
                                    <span className="text-[10px] text-[#6B665C] bg-[#F6F4EF] px-1.5 py-0.5 rounded">
                                      {u.floor}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#6B665C] mt-0.5">
                                    مقدم: <strong className="text-[#141414] font-semibold">{formatPrice(u.downPaymentAmount)} ج.م</strong>
                                    {u.monthlyInstallment ? ` · قسط: ${formatPrice(u.monthlyInstallment)} ج.م/ش` : ''}
                                  </div>
                                </div>
                                <div className="text-left shrink-0">
                                  <span className="text-xs font-bold text-[#A07A26] font-readex block">
                                    {formatPrice(u.price)} ج.م
                                  </span>
                                  <span className="text-[10px] text-[#6B665C] group-hover/unit:text-[#A07A26] flex items-center justify-end gap-0.5">
                                    <span>معاينة</span>
                                    <ChevronLeft size={10} />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Button: View Full Plot Details */}
                      <div className="mt-4 pt-3 border-t border-[#ECE8DF] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectProperty) onSelectProperty(plot.property);
                          }}
                          className="flex-1 py-1.5 px-3 bg-[#141414] hover:bg-stone-800 text-white rounded-xl text-xs font-bold font-readex transition-all cursor-pointer text-center"
                        >
                          تفاصيل القطعة والترخيص
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDistrictClick(plot.neighborhood)}
                          className="py-1.5 px-3 bg-white hover:bg-stone-100 border border-[#ECE8DF] text-[#141414] rounded-xl text-xs font-bold font-readex transition-all cursor-pointer flex items-center gap-1"
                          title="تصفية بالكتالوج"
                        >
                          <span>عرض الحي</span>
                          <ArrowLeft size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* RESALE VIEW: Shows District Cards */
              districtResults.length === 0 ? (
                <div className="text-center py-10 bg-[#F6F4EF] rounded-2xl border border-[#ECE8DF] p-6 space-y-2">
                  <Building2 className="w-8 h-8 text-[#A07A26] mx-auto opacity-70" />
                  <p className="text-sm font-bold text-[#141414]">لا توجد شقق مطابقة للمعايير المحددة بميزانية {formatPrice(budget)} ج.م</p>
                  <p className="text-xs text-[#6B665C]">جرب رفع الميزانية بالمؤشر أو تغيير خيارات الغرف ونوع العرض لعرض الخيارات المتاحة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {districtResults.map((res) => {
                    const isSingleArea = res.minArea === res.maxArea || res.matches.length === 1;
                    const areaRangeText = isSingleArea
                      ? `${res.maxArea} م²`
                      : `من ${res.minArea} لـ ${res.maxArea} م²`;

                    return (
                      <div
                        key={res.district}
                        className="bg-[#F6F4EF] hover:bg-[#FAF4E5] border border-[#ECE8DF] hover:border-[#E9DFCA] p-5 rounded-2xl transition-all duration-200 group flex flex-col justify-between shadow-2xs"
                      >
                        <div>
                          {/* District and Count */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-bold text-[#141414] font-readex">
                              {res.district}
                            </span>
                            <span className="text-xs font-semibold text-[#A07A26] bg-[#FAF4E5] border border-[#E9DFCA] px-2 py-0.5 rounded-lg">
                              {res.count} وحدة متاحة
                            </span>
                          </div>

                          {/* Area Range from Real Units */}
                          <div className="text-xl sm:text-2xl font-bold font-readex text-[#141414] my-2">
                            {areaRangeText}
                          </div>

                          {/* Best Pick Line (Clickable) */}
                          {res.bestPick && (
                            <div
                              onClick={() => {
                                if (onSelectProperty) onSelectProperty(res.bestPick);
                              }}
                              className="mt-3 p-2.5 bg-white rounded-xl border border-[#ECE8DF] group-hover:border-[#E9DFCA] transition-colors cursor-pointer hover:bg-amber-50/50"
                              title="انقر لفتح تفاصيل الشقة"
                            >
                              <div className="flex items-center justify-between text-[11px] font-medium text-[#6B665C] mb-0.5">
                                <span className="font-bold text-[#141414]">أكبر شقة:</span>
                                <span className="text-[#A07A26] font-bold flex items-center gap-0.5">
                                  <span>معاينة</span>
                                  <ChevronLeft size={12} />
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#141414] font-readex">
                                {res.bestPick.area} م² بـ {formatPrice(res.bestPick.price)} ج.م
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Button: Show them */}
                        <button
                          type="button"
                          onClick={() => handleDistrictClick(res.district)}
                          className="mt-4 pt-3 border-t border-[#ECE8DF] group-hover:border-[#E9DFCA] text-xs font-bold text-[#A07A26] flex items-center justify-between w-full cursor-pointer hover:text-[#8A671F]"
                        >
                          <span>شوفهم ({res.count})</span>
                          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

      </div>
    </section>
  );
};

