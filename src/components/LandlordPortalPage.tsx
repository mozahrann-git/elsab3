import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  X, 
  Check, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Sparkles, 
  Star, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Property, HadabaWostaNeighborhood } from '../types';
import { formatPrice, generateWhatsAppLink, compressImage } from '../utils/helpers';

interface LandlordPortalPageProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onUpdatePropertyPrice?: (propertyId: string, newPrice: number) => void;
  onTogglePropertyStatus?: (propertyId: string, isPaused: boolean) => void;
  onAddNewProperty?: (newProp: Property) => void;
  onOpenSubmitUnit?: () => void;
  onOpenValuation?: () => void;
}

type TabType = 'home' | 'showings' | 'edit';

export const LandlordPortalPage: React.FC<LandlordPortalPageProps> = ({
  isOpen,
  onClose,
  properties,
  onUpdatePropertyPrice,
  onTogglePropertyStatus,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // Selected property for landlord
  const [selectedPropertyCode, setSelectedPropertyCode] = useState<string>('H1705');
  
  // Price and Listing Edit State
  const [priceInput, setPriceInput] = useState<string>('3,200,000');
  const [selectedDays, setSelectedDays] = useState<string[]>(['سبت', 'أحد', 'ثلاثاء', 'خميس', 'جمعة']);
  const [timeSlot, setTimeSlot] = useState<string>('بعد 5:00 مساءً');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isListingPaused, setIsListingPaused] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  
  // Next showing confirmation state
  const [showingConfirmed, setShowingConfirmed] = useState<boolean>(false);
  const [rescheduleRequested, setRescheduleRequested] = useState<boolean>(false);

  // Property info
  const currentProperty = useMemo(() => {
    return properties.find(p => p.code === selectedPropertyCode || p.id === selectedPropertyCode) || {
      id: 'prop-sample-h1705',
      code: 'H1705',
      title: 'شقة 140م² بالحي الأول الهضبة الوسطى',
      area: 140,
      price: 3200000,
      neighborhood: 'الحي الأول' as HadabaWostaNeighborhood,
      bedrooms: 3,
      bathrooms: 2,
      finishing: 'finished',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'],
      ownerName: 'أحمد محمود'
    };
  }, [properties, selectedPropertyCode]);

  const daysOfWeek = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (!rawVal) {
      setPriceInput('');
      return;
    }
    const num = Number(rawVal);
    setPriceInput(num.toLocaleString('en-US'));
  };

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(priceInput.replace(/,/g, ''));
    if (onUpdatePropertyPrice && currentProperty?.id && numPrice > 0) {
      onUpdatePropertyPrice(currentProperty.id, numPrice);
    }
    setSaveSuccessMsg('تم إرسال التعديلات بنجاح! سيتم مراجعتها وتطبيقها فوراً.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleTogglePause = () => {
    const nextState = !isListingPaused;
    setIsListingPaused(nextState);
    if (onTogglePropertyStatus && currentProperty?.id) {
      onTogglePropertyStatus(currentProperty.id, nextState);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      try {
        const compressedList = await Promise.all(files.map(f => compressImage(f)));
        const valid = compressedList.filter(Boolean) as string[];
        if (valid.length > 0) {
          setUploadedPhotos(prev => [...prev, ...valid]);
        }
      } catch (err) {
        console.error('Error compressing uploaded photos:', err);
      }
    }
  };

  const handleSaraWhatsApp = (customText?: string) => {
    const message = customText || `مرحباً سارة، بخصوص شقتي المعروضة كود (${currentProperty.code || 'H1705'}) في ${currentProperty.neighborhood}.. حابب أستفسر عن تفاصيل المعاينات.`;
    const link = generateWhatsAppLink('+201099887766', message);
    window.open(link, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F6F4EF] overflow-y-auto min-h-screen text-[#141414] antialiased selection:bg-amber-200">
      
      {/* 1. Header Bar (Dark & Refined) */}
      <header className="sticky top-0 z-50 bg-[#121212] text-white border-b border-stone-800 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Right: Emblem & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-500/30 flex items-center justify-center text-[#E5B842] font-black shadow-xs">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white font-readex tracking-tight">
                بوابة الملاك
              </h1>
              <p className="text-[11px] font-medium text-[#E5B842]">
                أهلاً أستاذ [اسم المالك]
              </p>
            </div>
          </div>

          {/* Left: Tab Switchers / Pills & Close */}
          <div className="flex items-center gap-2">
            
            {/* 3 Nav Pills */}
            <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-full border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                معروضة
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('showings')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'showings'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                4 معاينات
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                الإعدادات
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="رجوع للموقع"
            >
              <X size={20} />
            </button>
          </div>

        </div>
      </header>

      {/* 2. Main Body Content (Strictly matching the 3 mockup designs) */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 py-6 space-y-4 font-sans pb-16">
        
        {/* ========================================================================= */}
        {/* TAB 1: الرئيسية (HOME VIEW) */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Top Property Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
              
              {/* Pattern / Banner Header */}
              <div className="h-32 sm:h-36 bg-[#EBE7DF] relative flex items-center justify-center overflow-hidden">
                {/* Diagonal stripes pattern */}
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #DFDACF 0, #DFDACF 10px, transparent 10px, transparent 20px)'
                  }}
                />
                
                {/* Top-Right: Status Pill */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-xs text-emerald-800 text-xs font-bold rounded-full shadow-2xs border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>معروضة</span>
                  </span>
                </div>

                {/* Top-Left: Code Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 bg-[#141414] text-white text-xs font-bold rounded-lg tracking-wider">
                    {currentProperty.code || 'H1705'}
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 sm:p-5 space-y-1 text-right">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 font-readex">
                  شقتك · {currentProperty.area || 140} م² · {currentProperty.neighborhood || 'الحي الأول'}
                </h2>
                
                <div className="flex items-baseline justify-between pt-1">
                  <p className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                    {formatPrice(currentProperty.price || 3200000)} ج.م
                  </p>
                  <span className="text-xs text-stone-400 font-medium">
                    معروضة من 18 يوم
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Stats Cards in a Row */}
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* Card 1: مشاهدات */}
              <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">مشاهدات</p>
                <p className="text-xl sm:text-2xl font-black text-stone-900">412</p>
                <p className="text-[11px] font-bold text-stone-400">+64 الأسبوع ده</p>
              </div>

              {/* Card 2: طلبوا تفاصيل */}
              <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">طلبوا تفاصيل</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600">23</p>
                <p className="text-[11px] font-bold text-stone-400">واتساب ومكالمات</p>
              </div>

              {/* Card 3: معاينات */}
              <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">معاينات</p>
                <p className="text-xl sm:text-2xl font-black text-stone-900">4</p>
                <p className="text-[11px] font-bold text-stone-400">2 الأسبوع ده</p>
              </div>
            </div>

            {/* Next Showing Card (المعاينة الجاية) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                  المعاينة الجاية
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#15803D] text-white text-[11px] font-bold rounded-full">
                  <span>مؤكدة</span>
                  <Check size={12} />
                </span>
              </div>

              <div className="space-y-1 pt-0.5">
                <p className="text-lg sm:text-xl font-black text-stone-900 font-readex">
                  بكرة · الأحد 6:00 مساءً
                </p>
                <p className="text-xs text-stone-500 font-medium">
                  أكدتها سارة حنفي · مسؤولة الملاك
                </p>
              </div>

              {/* Actions */}
              {showingConfirmed ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>تم تأكيد حضورك للمعاينة بنجاح، سارة حنفي في انتظارك غداً 6:00 مساءً.</span>
                </div>
              ) : rescheduleRequested ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-2 text-amber-900 text-xs font-bold">
                  <span>تم إرسال طلب تغيير الموعد لسارة حنفي لتنسيق موعد بديل.</span>
                  <button
                    onClick={() => handleSaraWhatsApp('حابب أغير موعد معاينة الأحد 6:00 مساء')}
                    className="text-[#15803D] underline font-black shrink-0"
                  >
                    تواصل واتساب
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowingConfirmed(true)}
                    className="w-full py-3 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-2xs"
                  >
                    تمام، موجود
                  </button>
                  <button
                    type="button"
                    onClick={() => setRescheduleRequested(true)}
                    className="w-full py-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-2xs"
                  >
                    محتاج أغير
                  </button>
                </div>
              )}
            </div>

            {/* Client Feedback Card (رأي آخر عميل عاين) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                  رأي آخر عميل عاين
                </h3>
                <span className="text-xs text-stone-400 font-medium">
                  من 3 أيام
                </span>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 text-amber-400">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} className="text-stone-300" />
              </div>

              {/* Quote */}
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                &quot;الشقة نظيفة والتشطيب ممتاز، بس السعر أعلى شوية من ميزانيته، ومهتم لو في مرونة.&quot;
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-xs font-bold">
                  السعر
                </span>
                <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-full text-xs font-bold">
                  الموقع
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold">
                  التشطيب
                </span>
              </div>

              {/* Footer text */}
              <p className="text-[11px] text-stone-400 pt-1">
                كتبه مستشار المبيعات بعد المعاينة
              </p>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: المعاينات (SHOWINGS VIEW) */}
        {/* ========================================================================= */}
        {activeTab === 'showings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Top Dark Alert Card */}
            <div className="bg-[#1C1917] text-white p-4 rounded-2xl shadow-2xs space-y-1">
              <p className="text-xs font-bold text-stone-400">السبع للعقارات · دلوقتي</p>
              <p className="text-xs sm:text-sm font-semibold text-stone-100 leading-relaxed">
                ✓ اتأكدت معاينة على شقتك بكرة 6:00 مساء مع سارة حنفي
              </p>
            </div>

            {/* Section Title */}
            <h2 className="text-sm sm:text-base font-bold text-stone-900 font-readex pt-1">
              سجل المعاينات
            </h2>

            {/* List of Showings */}
            <div className="space-y-3">
              
              {/* Item 1: الأحد 6:00 م */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    مؤكدة
                  </span>
                  <p className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                    الأحد 6:00 م
                  </p>
                </div>
                <p className="text-xs text-stone-500 font-medium text-left">
                  عميل كاش · فتح الشقة: انت
                </p>
              </div>

              {/* Item 2: الخميس 5:30 م */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-full">
                    <span>تمت</span>
                    <span className="text-amber-500">★4</span>
                  </span>
                  <p className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                    الخميس 5:30 م
                  </p>
                </div>
                <p className="text-xs text-stone-600 font-medium text-left">
                  &quot;مهتم لو في مرونة في السعر&quot;
                </p>
              </div>

              {/* Item 3: الثلاثاء 7:00 م */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-full">
                    <span>تمت</span>
                    <span className="text-amber-500">★3</span>
                  </span>
                  <p className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                    الثلاثاء 7:00 م
                  </p>
                </div>
                <p className="text-xs text-stone-600 font-medium text-left">
                  &quot;عايز دور أعلى&quot;
                </p>
              </div>

              {/* Item 4: السبت 6:00 م */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
                    اتلغت
                  </span>
                  <p className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                    السبت 6:00 م
                  </p>
                </div>
                <p className="text-xs text-stone-400 font-medium text-left">
                  العميل اعتذر
                </p>
              </div>

            </div>

            {/* Summary of Feedback Card (ملخص الآراء) */}
            <div className="bg-[#FDFCF7] rounded-2xl border border-[#E9DFCA] p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                ملخص الآراء
              </h3>

              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                3 من 4 عملاء قالوا إن السعر أعلى من ميزانيتهم. سعر المتر عندك 22,857 ومتوسط الحي 24,500 — يعني سعرك كويس، فالأغلب إن المساحة أكبر من اللي بيدوروا عليه.
              </p>

              <button
                type="button"
                onClick={() => handleSaraWhatsApp('حابب نناقش ملخص آراء المعاينات وتسعير شقتي')}
                className="w-full py-3.5 bg-[#141414] hover:bg-stone-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-2xs"
              >
                كلّم سارة نتناقش
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: عدّل عرضك (EDIT LISTING VIEW) */}
        {/* ========================================================================= */}
        {activeTab === 'edit' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Main Edit Form Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-readex">
                عدّل عرضك
              </h2>

              <form onSubmit={handleSaveEdits} className="space-y-4">
                
                {/* 1. السعر المطلوب */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 block">
                    السعر المطلوب
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={priceInput}
                      onChange={handlePriceChange}
                      className="w-full p-3 bg-[#F6F4EF] border border-stone-200 rounded-xl font-bold text-stone-900 text-base sm:text-lg text-center focus:outline-none focus:border-amber-500"
                      placeholder="3,200,000"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium text-right">
                    أي تعديل في السعر بيتراجع من الإدارة قبل ما يظهر
                  </p>
                </div>

                {/* 2. مواعيد المعاينة المتاحة */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-stone-600 block">
                    مواعيد المعاينة المتاحة
                  </label>
                  
                  {/* Days pills grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {daysOfWeek.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#141414] text-white shadow-2xs'
                              : 'bg-[#F6F4EF] text-stone-600 hover:bg-stone-200/70'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Time input */}
                  <input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-3 bg-[#F6F4EF] border border-stone-200 rounded-xl font-bold text-stone-800 text-xs sm:text-sm text-center focus:outline-none focus:border-amber-500"
                    placeholder="بعد 5:00 مساءً"
                  />
                </div>

                {/* 3. صور جديدة */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-stone-600 block">
                    صور جديدة
                  </label>
                  
                  <label className="border-2 border-dashed border-stone-200 bg-[#F6F4EF] rounded-xl p-4 text-center block cursor-pointer hover:border-amber-400 hover:bg-[#FAF9F5] transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-xs sm:text-sm font-bold text-stone-700">
                      + ارفع صور من موبايلك
                    </span>
                  </label>

                  {/* Uploaded photos thumbnail preview */}
                  {uploadedPhotos.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-2">
                      {uploadedPhotos.map((url, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-stone-300 shrink-0">
                          <img src={url} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Success Message */}
                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center">
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Save Changes Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#A07A26] hover:bg-[#8B691F] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-2xs"
                >
                  حفظ التعديلات
                </button>
              </form>
            </div>

            {/* Stop Listing Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
              <p className="text-xs sm:text-sm font-medium text-stone-800">
                الشقة اتباعت أو مش عايز تعرضها؟
              </p>
              
              <button
                type="button"
                onClick={handleTogglePause}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  isListingPaused 
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                {isListingPaused ? 'إعادة العرض' : 'إيقاف العرض'}
              </button>
            </div>

            {/* Sara Hanafy Account Manager Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#141414] text-[#E5B842] font-black text-sm flex items-center justify-center shadow-2xs">
                  س
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-stone-900">
                    سارة حنفي
                  </p>
                  <p className="text-[11px] text-stone-400 font-medium">
                    مسؤولة الملاك · بترد خلال ساعة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaraWhatsApp()}
                className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <span>واتساب</span>
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
