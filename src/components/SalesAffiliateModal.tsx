import React, { useState, useMemo, useEffect } from 'react';
import { Property, SalesAgent, Lead, ViewingRequest, ViewingFeedback } from '../types';
import { 
  X, 
  Copy, 
  MessageCircle, 
  ExternalLink, 
  Sparkles, 
  Smartphone,
  Eye,
  Send,
  Calendar,
  Flame,
  Zap,
  FileText,
  Phone,
  Clock,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Building2,
  Layers,
  Award,
  ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import { formatPrice, generateWhatsAppLink } from '../utils/helpers';
import { 
  DAILY_AD_THEMES, 
  generateSarahInspectionMessage,
  getPropertyWebsiteUrl 
} from '../utils/salesAdGenerator';
import { LionLogo } from './LionLogo';
import { saveViewingRequestToDb, subscribeToViewingFeedbacks } from '../services/firebaseService';

interface SalesAffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  currentAgent: SalesAgent;
  onRecordAction?: (questCategory: string, points: number) => void;
  onOpenSalesLogin?: () => void;
  onAddLead?: (newLead: Lead) => void;
  customLogoUrl?: string;
  bannerPhotoUrl?: string;
  onOpenAdmin?: () => void;
  onOpenCrm?: () => void;
}

type MainTabType = 'texts' | 'showcase' | 'whatsapp_link' | 'sarah_coordination' | 'daily_ad';
type TextSubTabType = 'facebook_post' | 'short_story' | 'client_pitch' | 'urgent_deal';

export const SalesAffiliateModal: React.FC<SalesAffiliateModalProps> = ({
  isOpen,
  onClose,
  property,
  currentAgent,
  onRecordAction,
  onAddLead,
  customLogoUrl,
  bannerPhotoUrl,
  onOpenAdmin,
  onOpenCrm
}) => {
  // Current day index (0 = Sunday ... 6 = Saturday)
  const todayIndex = useMemo(() => new Date().getDay(), []);
  
  // Tabs & selections
  const [activeTab, setActiveTab] = useState<MainTabType>('texts');
  const [activeTextSubTab, setActiveTextSubTab] = useState<TextSubTabType>('facebook_post');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);
  const [customSource, setCustomSource] = useState('جروبات المهتمين بالعقارات الفاخرة');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sarah Hanafy Inspection Booking States
  const [sarahPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('lion_sarah_hanafy_phone') || '01021242871';
    } catch {
      return '01021242871';
    }
  });
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [proposedTime, setProposedTime] = useState('اليوم الساعة 6:00 مساءً');
  const [clientNotes, setClientNotes] = useState('العميل مهتم وجاهز للمعاينة على الطبيعة');

  // مزامنة تقارير وكومنتات المعاينات الميدانية السابقة لهذه الشقة
  const [propertyFeedbacks, setPropertyFeedbacks] = useState<ViewingFeedback[]>([]);

  useEffect(() => {
    if (!property?.code) return;
    try {
      const raw = localStorage.getItem('lion_viewing_feedbacks');
      if (raw) {
        const list: ViewingFeedback[] = JSON.parse(raw);
        const filtered = list.filter(f => f.propertyCode === property.code);
        setPropertyFeedbacks(filtered);
      }
    } catch {}

    const unsub = subscribeToViewingFeedbacks((allFeedbacks) => {
      if (allFeedbacks && allFeedbacks.length > 0) {
        const filtered = allFeedbacks.filter(f => f.propertyCode === property.code);
        setPropertyFeedbacks(filtered);
      }
    });

    return () => unsub();
  }, [property?.code]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const copyToClipboard = (text: string, typeKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    showToast('تم نسخ النص بنجاح للحافظة!');
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);

    if (onRecordAction) {
      onRecordAction('facebook_post', 50);
    }
  };

  // Agent phone
  const cleanAgentPhone = (currentAgent?.phone || '01021242871').replace(/\D/g, '');

  // Dynamic Client Showcase Link
  const fullShowcaseUrl = getPropertyWebsiteUrl(property, currentAgent);

  // Location display helper
  const locationLabel = property.neighborhood || 'موقع استراتيجي راقي';
  const plotInfo = property.plotNumber ? ` - قطعة ${property.plotNumber}` : '';
  const finishingLabel = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهزة' : 'نصف تشطيب');
  const isOffPlan = property.category === 'off_plan';
  const floorText = property.floor ? `الدور ${property.floor}` : 'دور متكرر مميز';
  const elevatorText = property.hasElevator ? '• أسانسير شغال ومصان' : '';

  // WhatsApp Tracked Link
  const trackedWhatsAppMessage = `مرحباً أ/ ${currentAgent.name}، أنا مهتم بالشقة كود [${property.code}] في ${locationLabel} (المصدر: ${customSource})`;
  const shortWhatsAppLink = `wa.me/2${cleanAgentPhone}?text=${encodeURIComponent(`Ref#${property.code}-${customSource.slice(0, 12)}`)}`;
  const fullWhatsAppUrl = `https://wa.me/2${cleanAgentPhone}?text=${encodeURIComponent(trackedWhatsAppMessage)}`;

  // Formatted Ad Text for the Subtabs (Persuasive & Dynamic)
  const getFormattedAdText = (variant: TextSubTabType) => {
    switch (variant) {
      case 'facebook_post':
        return `🏢 **وحدة سكنية ممتازة للبيع بموقع راقي وتسهيلات مميزة** 🏢
كود الوحدة للبحث: [${property.code}]

لو تبحث عن شقة تجمع بين المساحة الممتازة، التقسيم الهندسي المريح، والموقع الهادئ القريب من كافة المحاور والخدمات:

📍 **الموقع الحيوي:** ${locationLabel}${plotInfo} - (${property.view || 'واجهة بحري وفيو مفتوح'})
📐 **المساحة الصافية:** ${property.area} م² صافي بتوزيع مثالي
🚪 **التقسيم الداخلي:** ${property.bedrooms} غرف نوم واسعة + ${property.bathrooms} حمام + ريسبشن رحب + مطبخ
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **نوع التشطيب:** ${finishingLabel}
🚗 **المرافق والخدمات:** ${property.hasGarage ? 'يوجد مكان جراج مخصص' : 'شارع واسع ومريح'} + حصة مسجلة في الأرض وعدادات رسمية

💰 **السعر المطلوب:** ${formatPrice(property.price)}
🔑 **الاستلام:** ${isOffPlan ? 'وفقاً لجدول الاستلام المعتمد' : 'استلام فوري على المفتاح'}

🎯 **أبرز المميزات:**
1. موقع استراتيجي خطوات من المحاور الرئيسية والخدمات الحيوية.
2. تهوية بحري ممتازة وإضاءة طبيعية لكافة الغرف.
3. سعر متر تنافسي يوفر أعلى عائد استثماري وقيمة مالية.

📲 **لتحديد موعد معاينة على الطبيعة ومراجعة الأوراق:**
المستشار العقاري: ${currentAgent.name}
📞 **اتصال هاتف أو واتساب:** ${currentAgent.phone}
🌐 **ألبوم الصور الكامل ومواصفات الشقة على الرابط الرسمي:**
${fullShowcaseUrl}

#السبع_للعقارات #عقارات_مصر #شقق_للبيع #استثمار_عقاري #استلام_فوري`;

      case 'short_story':
        return `🔥 **لقطة اليوم العقارية | كود #${property.code}** 🔥
🏡 شقة ${property.area}م² بموقع استثنائي في ${locationLabel}
✨ ${property.bedrooms} غرف نوم واسعة + ${property.bathrooms} حمام + ريسبشن رحب
🏢 ${floorText} ${elevatorText}
💎 تشطيب: ${finishingLabel}
💰 السعر المطلوب: ${formatPrice(property.price)} ${isOffPlan ? '(تسهيلات سداد)' : '(كاش للجادين)'}
🔑 الاستلام: ${isOffPlan ? 'وفق جدول المشروع' : 'استلام فوري على المفتاح'}

📲 **للتواصل والمعاينة الفورية:**
المستشار العقاري: ${currentAgent.name} 📞 ${currentAgent.phone}
🔗 **ألبوم الصور والمعاينة الرقمية الكاملة:**
${fullShowcaseUrl}`;

      case 'client_pitch':
        return `مساء الخير يا فندم،
معاك ${currentAgent.name} مستشارك العقاري من شركة السبع للعقارات.

بخصوص طلب حضرتك للبحث عن شقة مميزة بمواصفات ممتازة وموقع راقي، متاح حالياً وحدة استثنائية ومطابقة تماماً لطلبك:
🏷️ **كود الوحدة:** #${property.code}
📍 **الموقع:** ${locationLabel}${plotInfo}
📐 **المساحة:** ${property.area} م² (${property.bedrooms} غرف نوم + ${property.bathrooms} حمام + ريسبشن رحب)
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **التشطيب:** ${finishingLabel}
💰 **السعر:** ${formatPrice(property.price)}

تقدر تطلع على كافة الصور والتفاصيل الهندسية من خلال هذا الرابط المباشر:
${fullShowcaseUrl}

لو حابب ننسق موعد لمعاينتها على الطبيعة، أنا متاح لخدمتك في أي وقت يناسبك!`;

      case 'urgent_deal':
        return `🚨 **فرصة عاجلة وسعر استثنائي لسرعة البيع** 🚨
كود الوحدة: \`#${property.code}\`
📍 **الموقع:** ${locationLabel}${plotInfo}
📐 **المساحة:** ${property.area} م² (${property.bedrooms} غرف + ${property.bathrooms} حمام)
🏢 **الدور:** ${floorText} ${elevatorText}
💎 **التشطيب:** ${finishingLabel}
💰 **السعر المطلوب:** ${formatPrice(property.price)} (أفضل سعر متاح للجادين)
🔑 **الاستلام:** فوري وجاهزة للسكن والتعاقد اللحظي

الوحدة جاهزة للمعاينة الفورية ومناسبة لمن لديه كاش جاهز للتعاقد السريع!
📲 **للتواصل المباشر وتنسيق المعاينة:**
${currentAgent.name} 📞 ${currentAgent.phone}
🔗 **رابط ألبوم الصور والبيانات الكاملة:**
${fullShowcaseUrl}`;
    }
  };

  const currentActiveAdText = getFormattedAdText(activeTextSubTab);

  // 7 Days List for daily theme
  const daysList = [
    { index: 6, name: 'السبت', subtitle: 'انطلاقة الأسبوع' },
    { index: 0, name: 'الأحد', subtitle: 'صفقة الأحد الكبرى' },
    { index: 1, name: 'الاثنين', subtitle: 'سكن عائلي راقي' },
    { index: 2, name: 'الثلاثاء', subtitle: 'استثمار رابح' },
    { index: 3, name: 'الأربعاء', subtitle: 'جاهزة للسكن اللحظي' },
    { index: 4, name: 'الخميس', subtitle: 'معاينات الويك إند' },
    { index: 5, name: 'الجمعة', subtitle: 'عرض الجمعة المباركة' },
  ];

  const currentTheme = DAILY_AD_THEMES.find((t) => t.dayIndex === selectedDayIndex) || DAILY_AD_THEMES[0];
  const currentDailyAdText = currentTheme.generateText(property, currentAgent, customSource);

  // Send WhatsApp to Sarah Hanafy
  const handleSendToSarahWhatsApp = () => {
    if (!clientName || !clientPhone) {
      showToast('يرجى إدخال اسم العميل ورقم هاتفه أولاً');
      return;
    }

    const message = generateSarahInspectionMessage(
      property,
      currentAgent,
      proposedTime,
      clientNotes,
      clientName,
      clientPhone
    );

    const cleanPhone = sarahPhone.replace(/\D/g, '');
    const url = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    if (onAddLead) {
      const newLeadId = `lead_${Date.now()}`;
      const newLead: Lead = {
        id: newLeadId,
        name: clientName,
        phone: clientPhone,
        whatsapp: clientPhone.replace(/\D/g, ''),
        source: 'direct',
        budgetMin: property.price * 0.9,
        budgetMax: property.price * 1.1,
        preferredNeighborhood: property.neighborhood,
        interestedPropertyCode: property.code,
        assignedAgentId: currentAgent.id,
        assignedAgentName: currentAgent.name,
        coordinatorName: 'سارة حنفي',
        status: 'visit_requested',
        visitScheduledAt: proposedTime,
        visitLocation: property.neighborhood,
        notes: [`تم طلب المعاينة وتنسيقها مع سارة حنفي للوحدة ${property.code}: ${clientNotes}`],
        lastContactDate: 'الآن',
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddLead(newLead);

      // إنشاء طلب المعاينة الميدانية في غرفة عمليات البروكر
      const newViewingReq: ViewingRequest = {
        id: `req_${Date.now()}`,
        propertyId: property.id,
        propertyCode: property.code,
        propertyTitle: property.title,
        propertyNeighborhood: property.neighborhood,
        propertyPrice: property.price,
        propertyArea: property.area,
        propertyImage: property.images?.[0] || unitCoverImage,
        brokerId: property.brokerId || 'broker_ahmed',
        brokerName: 'أحمد فؤاد',
        leadId: newLeadId,
        requestingAgentId: currentAgent.id,
        requestingAgentName: currentAgent.name,
        coordinatorName: 'سارة حنفي',
        clientName: clientName,
        clientPhone: clientPhone,
        clientNotes: clientNotes,
        clientPreferredTime: proposedTime,
        status: 'pending_broker',
        createdAt: 'دلوقتي',
        createdAtTimestamp: Date.now(),
        remindersSent: 0,
        nextReminderCountdownSeconds: 900,
        ownerName: property.ownerName,
        ownerPhone: property.ownerPhone
      };

      saveViewingRequestToDb(newViewingReq).catch(() => {});
      try {
        const rawReqs = localStorage.getItem('lion_viewing_requests');
        const reqList: ViewingRequest[] = rawReqs ? JSON.parse(rawReqs) : [];
        reqList.unshift(newViewingReq);
        localStorage.setItem('lion_viewing_requests', JSON.stringify(reqList));
      } catch {}
    }

    if (onRecordAction) {
      onRecordAction('inspection_booking', 100);
    }

    showToast('تم فتح واتساب لتنسيق المعاينة مع سارة حنفي وتسجيل الليد في CRM!');
  };

  const unitCoverImage = property.images && property.images.length > 0
    ? property.images[0]
    : bannerPhotoUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';

  return (
    <div 
      className="fixed inset-0 z-60 bg-[#F6F4EF] text-[#141414] flex flex-col h-full w-full overflow-hidden font-ibm select-none"
      dir="rtl"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-70 bg-[#141414] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#A07A26]/50 flex items-center gap-2 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4"
        >
          <CheckCircle2 size={18} className="text-[#0E7A5A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP RESPONSIVE LUXURY HEADER */}
      {/* ========================================================= */}
      <header className="px-3 sm:px-6 md:px-8 py-3 bg-white border-b border-[#ECE8DF] shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Right Side: Logo & Agent Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] flex items-center justify-center transition-all cursor-pointer border border-[#ECE8DF] active:scale-95 shrink-0"
            title="رجوع / إغلاق"
          >
            <X size={18} />
          </button>

          <LionLogo 
            size={34} 
            customLogoUrl={customLogoUrl}
            subtitle="تسويق واستثمار عقاري فاخر"
            className="hidden xs:flex"
          />

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-readex font-black text-xs sm:text-base md:text-lg text-[#141414] tracking-tight truncate">
                أدوات السيلز والشير الذكي
              </h1>
              <span className="px-2 py-0.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-[10px] sm:text-[11px] font-bold rounded-full flex items-center gap-1">
                <Sparkles size={11} />
                <span>جناح المبيعات</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#6B665C] truncate">
              المستشار: <span className="font-bold text-[#141414]">{currentAgent.name}</span> ({currentAgent.phone})
            </p>
          </div>
        </div>

        {/* Center / Left Side: Unit Info & Admin Shortcuts */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap justify-end">
          
          {/* Unit Badge */}
          <div className="hidden md:flex items-center gap-2 bg-[#FAF9F5] border border-[#ECE8DF] px-3 py-1 rounded-2xl shrink-0">
            <span className="font-mono font-bold text-xs text-[#0E7A5A] bg-[#E6F7ED] px-2 py-0.5 rounded-lg border border-[#B3E8C8]">
              #{property.code}
            </span>
            <div className="text-xs text-[#141414] truncate max-w-[140px]">
              <span className="font-bold">{property.neighborhood}</span>
            </div>
            <span className="font-bold text-[#0E7A5A] text-xs font-ibm mr-1">
              {formatPrice(property.price)}
            </span>
          </div>

          {/* Admin Dashboard Shortcut Button */}
          {onOpenAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-amber-400 font-readex font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-amber-500/40 active:scale-95"
              title="فتح لوحة الإدارة المركزية"
            >
              <LayoutDashboard size={13} className="text-amber-400" />
              <span className="hidden sm:inline">لوحة الإدارة</span>
              <span className="sm:hidden">الأدمن</span>
            </button>
          )}

          {/* CRM Shortcut Button */}
          {onOpenCrm && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCrm();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#ECE8DF] border border-[#ECE8DF] text-[#141414] font-readex font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="فتح نظام إدارة العملاء CRM"
            >
              <Building2 size={13} className="text-[#0E7A5A]" />
              <span className="hidden sm:inline">إدارة العملاء CRM</span>
              <span className="sm:hidden">CRM</span>
            </button>
          )}

          {/* Action Button: Live Preview Link */}
          <a
            href={fullShowcaseUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#FAF4E5] hover:bg-[#F2E6C8] border border-[#E9DFCA] text-[#A07A26] font-readex font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">معاينة صفحة العميل</span>
            <span className="sm:hidden">معاينة</span>
          </a>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN NAVIGATION TABS (Mobile Friendly Scrolling Pill Bar) */}
      {/* ========================================================= */}
      <nav 
        aria-label="تبويبات أدوات السيلز"
        className="px-3 sm:px-6 md:px-8 py-2.5 bg-white border-b border-[#ECE8DF] flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full shrink-0"
      >
        {/* Tab 1: نصوص الإعلانات */}
        <button
          type="button"
          onClick={() => setActiveTab('texts')}
          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'texts'
              ? 'bg-[#141414] text-white shadow-xs font-black'
              : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF] hover:text-[#141414]'
          }`}
        >
          <Flame size={14} className={activeTab === 'texts' ? 'text-[#D9B864]' : 'text-stone-400'} />
          <span>نصوص الإعلانات والسوشيال</span>
        </button>

        {/* Tab 2: صفحة العميل (Showcase VIP) */}
        <button
          type="button"
          onClick={() => setActiveTab('showcase')}
          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'showcase'
              ? 'bg-[#141414] text-white shadow-xs font-black'
              : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF] hover:text-[#141414]'
          }`}
        >
          <Smartphone size={14} className={activeTab === 'showcase' ? 'text-[#D9B864]' : 'text-stone-400'} />
          <span>صفحة المعاينة (Showcase VIP)</span>
        </button>

        {/* Tab 3: رابط الواتساب الذكي */}
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp_link')}
          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'whatsapp_link'
              ? 'bg-[#141414] text-white shadow-xs font-black'
              : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF] hover:text-[#141414]'
          }`}
        >
          <MessageCircle size={14} className={activeTab === 'whatsapp_link' ? 'text-[#D9B864]' : 'text-stone-400'} />
          <span>رابط واتساب ذكي</span>
        </button>

        {/* Tab 4: تنسيق موعد مع سارة حنفي (هام) */}
        <button
          type="button"
          onClick={() => setActiveTab('sarah_coordination')}
          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'sarah_coordination'
              ? 'bg-[#141414] text-white shadow-xs font-black'
              : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF] hover:text-[#141414]'
          }`}
        >
          <Calendar size={14} className={activeTab === 'sarah_coordination' ? 'text-[#D9B864]' : 'text-[#A07A26]'} />
          <span>تنسيق موعد مع سارة حنفي</span>
          <span className="px-1.5 py-0.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-[9px] font-black rounded-md">
            هام
          </span>
        </button>

        {/* Tab 5: صيغ الأسبوع */}
        <button
          type="button"
          onClick={() => setActiveTab('daily_ad')}
          className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'daily_ad'
              ? 'bg-[#141414] text-white shadow-xs font-black'
              : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF] hover:text-[#141414]'
          }`}
        >
          <Clock size={14} className={activeTab === 'daily_ad' ? 'text-[#D9B864]' : 'text-stone-400'} />
          <span>صيغ الأسبوع المتجددة</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* 3. MAIN CONTENT CONTAINER (Comfortable Full Page Layout) */}
      {/* ========================================================= */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* ========================================================= */}
        {/* VIEW 1: نصوص الإعلانات (Ad Texts & Scripts) */}
        {/* ========================================================= */}
        {activeTab === 'texts' && (
          <section aria-label="نصوص الإعلانات" className="space-y-4 sm:space-y-5 animate-in fade-in">
            {/* Sub-Tabs Row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'facebook_post', label: 'إعلان فيسبوك والجروبات', icon: FileText },
                { id: 'short_story', label: 'ستوري سوشيال سريع', icon: Flame },
                { id: 'client_pitch', label: 'رسالة عميل VIP مباشرة', icon: MessageCircle },
                { id: 'urgent_deal', label: 'فرصة وسعر استثنائي', icon: Zap }
              ].map((sub) => {
                const IconComp = sub.icon;
                const isSelected = activeTextSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveTextSubTab(sub.id as TextSubTabType)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#A07A26] text-white shadow-2xs font-bold'
                        : 'bg-white text-[#6B665C] border border-[#ECE8DF] hover:bg-[#FAF9F5] hover:text-[#141414]'
                    }`}
                  >
                    <IconComp size={13} className={isSelected ? 'text-white' : 'text-stone-400'} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Luxury White Card */}
            <div className="bg-white border border-[#ECE8DF] rounded-3xl p-4 sm:p-7 shadow-xs space-y-5">
              
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DF] pb-4">
                <div className="space-y-0.5">
                  <h3 className="font-readex font-bold text-sm sm:text-lg text-[#141414] flex items-center gap-2">
                    <FileText size={17} className="text-[#A07A26]" />
                    <span>نص إعلاني تسويقي مع رابط المعاينة المباشر</span>
                  </h3>
                  <p className="text-xs text-[#6B665C]">
                    صيغة تسويقية مقنعة وجاهزة للنشر الفوري متضمنة بيانات الاتصال والرابط الرقمي
                  </p>
                </div>

                {/* Primary Gold Copy Button */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentActiveAdText, activeTextSubTab)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shrink-0"
                >
                  <Copy size={15} />
                  <span>
                    {copiedType === activeTextSubTab ? 'تم نسخ النص بنجاح ✓' : 'نسخ الإعلان كاملاً'}
                  </span>
                </button>
              </div>

              {/* Formatted Clean Text Box Display */}
              <div className="bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl p-4 sm:p-5 font-ibm text-xs sm:text-sm text-[#141414] leading-relaxed whitespace-pre-line overflow-y-auto max-h-[380px] select-text shadow-2xs">
                {currentActiveAdText}
              </div>

              {/* Quick Share Buttons Grid (WhatsApp, Facebook, Telegram) */}
              <div className="pt-2 border-t border-[#ECE8DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#6B665C]">مشاركة فورية بنقرة واحدة:</span>
                
                <div className="grid grid-cols-3 sm:flex items-center gap-2">
                  <a
                    href={generateWhatsAppLink(undefined, undefined, undefined, currentActiveAdText)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onRecordAction && onRecordAction('whatsapp_share', 50)}
                    className="py-2.5 px-3 sm:px-4 bg-[#1E7E48] hover:bg-[#18683B] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs text-center"
                  >
                    <MessageCircle size={14} />
                    <span>واتساب</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullShowcaseUrl)}&quote=${encodeURIComponent(currentActiveAdText)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onRecordAction && onRecordAction('facebook_post', 50)}
                    className="py-2.5 px-3 sm:px-4 bg-[#1877F2] hover:bg-[#1265D2] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs text-center"
                  >
                    <Share2 size={14} />
                    <span>فيسبوك</span>
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(fullShowcaseUrl)}&text=${encodeURIComponent(currentActiveAdText)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onRecordAction && onRecordAction('telegram_share', 50)}
                    className="py-2.5 px-3 sm:px-4 bg-[#229ED9] hover:bg-[#1E8CC0] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs text-center"
                  >
                    <Send size={14} />
                    <span>تليجرام</span>
                  </a>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: صفحة العميل (Showcase VIP) */}
        {/* ========================================================= */}
        {activeTab === 'showcase' && (
          <section aria-label="صفحة العميل الرقمية" className="space-y-5 animate-in fade-in max-w-3xl mx-auto">
            <div className="bg-white border border-[#ECE8DF] rounded-3xl p-4 sm:p-8 space-y-6 shadow-xs">
              
              {/* Header Texts */}
              <div className="flex items-start justify-between gap-3 border-b border-[#ECE8DF] pb-4">
                <div className="space-y-1">
                  <h3 className="font-readex font-bold text-sm sm:text-xl text-[#141414] flex items-center gap-2">
                    <Smartphone size={19} className="text-[#A07A26]" />
                    <span>صفحة المعاينة الرقمية للعميل (Showcase VIP)</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B665C] leading-relaxed">
                    صفحة مستقلة ومخصصة تعرض صور الوحدة والموقع بدقة عالية بدون بيانات المالك وتثبت رقمك أنت للتواصل المباشر.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-xs font-bold rounded-xl shrink-0">
                  VIP Showcase
                </span>
              </div>

              {/* Visual Card Preview */}
              <div className="border border-[#ECE8DF] rounded-2xl overflow-hidden bg-[#FAF9F5] p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#ECE8DF]">
                  <img 
                    src={unitCoverImage} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#0E7A5A] bg-[#E6F7ED] px-2.5 py-0.5 rounded-lg border border-[#B3E8C8]">
                      #{property.code}
                    </span>
                    <span className="text-xs font-bold text-[#141414]">{locationLabel}</span>
                    <span className="text-xs text-[#0E7A5A] font-bold font-ibm mr-auto">{formatPrice(property.price)}</span>
                  </div>
                  <h4 className="font-readex font-bold text-sm text-[#141414] line-clamp-1">
                    {property.title}
                  </h4>
                  <p className="text-xs text-[#6B665C]">
                    المستشار المباشر للعميل: <strong className="text-[#141414]">{currentAgent.name}</strong> ({currentAgent.phone})
                  </p>
                </div>
              </div>

              {/* URL Box & Copy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6B665C] block">
                  رابط المعاينة المخصص لعميلك:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-[#FAF9F5] border border-[#ECE8DF] px-3.5 py-2.5 rounded-2xl font-mono text-xs text-[#A07A26] truncate dir-ltr">
                    {fullShowcaseUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(fullShowcaseUrl, 'showcase_vip')}
                    className="px-5 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <Copy size={15} />
                    <span>{copiedType === 'showcase_vip' ? 'تم النسخ ✓' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onRecordAction) onRecordAction('facebook_post', 10);
                    try {
                      window.open(fullShowcaseUrl, '_blank');
                    } catch {
                      // Fallback navigation
                      window.location.href = fullShowcaseUrl;
                    }
                  }}
                  className="py-3 px-4 bg-[#FAF9F5] hover:bg-[#ECE8DF] text-[#141414] font-readex font-bold text-xs sm:text-sm rounded-2xl border border-[#ECE8DF] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 text-center"
                >
                  <Eye size={15} />
                  <span>معاينة الصفحة كما يراها العميل</span>
                </button>

                <a
                  href={generateWhatsAppLink(
                    undefined,
                    undefined,
                    undefined,
                    `مرحباً، اتفضل رابط التفاصيل الكاملة وألبوم الصور لشقة ${property.area}م² في ${locationLabel}:\n${fullShowcaseUrl}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onRecordAction && onRecordAction('whatsapp_share', 50)}
                  className="py-3 px-4 bg-[#0E7A5A] hover:bg-[#0B6349] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 text-center"
                >
                  <Send size={15} />
                  <span>إرسال فوري لعميلك على واتساب</span>
                </a>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: رابط الواتساب الذكي */}
        {/* ========================================================= */}
        {activeTab === 'whatsapp_link' && (
          <section aria-label="رابط واتساب الذكي" className="space-y-5 animate-in fade-in max-w-3xl mx-auto">
            <div className="bg-white border border-[#ECE8DF] rounded-3xl p-4 sm:p-8 space-y-5 shadow-xs">
              
              <div className="border-b border-[#ECE8DF] pb-4">
                <h3 className="font-readex font-bold text-sm sm:text-lg text-[#141414] flex items-center gap-2">
                  <MessageCircle size={18} className="text-[#0E7A5A]" />
                  <span>رابط واتساب ذكي ومتتبّع لمصادر العملاء</span>
                </h3>
                <p className="text-xs text-[#6B665C] mt-0.5">
                  عندما يضغط العميل على الرابط، تفتح المحادثة معك مباشرة برسالة تحتوي كود الوحدة ومصدر إعلانك
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#141414] block mb-1.5">
                  مصدر الإعلان أو اسم القناة:
                </label>
                <input
                  type="text"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-xs sm:text-sm text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  placeholder="جروبات المهتمين بالعقارات"
                />
              </div>

              {/* Quick Source Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#6B665C] ml-1">اختر القناة:</span>
                {['فيسبوك', 'إنستجرام', 'OLX', 'تيك توك', 'جروبات واتساب', 'تليجرام', 'عميل مباشر'].map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setCustomSource(src)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      customSource === src
                        ? 'bg-[#141414] text-white'
                        : 'bg-[#FAF9F5] text-[#6B665C] border border-[#ECE8DF] hover:bg-[#ECE8DF]'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>

              {/* Link Box */}
              <div className="bg-[#FAF9F5] border border-[#ECE8DF] p-3.5 rounded-2xl font-mono text-xs text-[#141414] truncate dir-ltr text-center">
                {shortWhatsAppLink}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(fullWhatsAppUrl, 'wa_link')}
                  className="py-3 px-4 bg-[#0E7A5A] hover:bg-[#0B6349] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <Copy size={15} />
                  <span>{copiedType === 'wa_link' ? 'تم نسخ الرابط ✓' : 'نسخ رابط الواتساب'}</span>
                </button>

                <a
                  href={fullWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-[#FAF9F5] hover:bg-[#ECE8DF] text-[#141414] font-readex font-bold text-xs sm:text-sm rounded-2xl border border-[#ECE8DF] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 text-center"
                >
                  <ExternalLink size={15} />
                  <span>تجربة الرابط الآن</span>
                </a>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: تنسيق موعد مع سارة حنفي (هام) */}
        {/* ========================================================= */}
        {activeTab === 'sarah_coordination' && (
          <section aria-label="تنسيق موعد مع سارة حنفي" className="space-y-5 animate-in fade-in max-w-3xl mx-auto">
            <div className="bg-white border border-[#ECE8DF] rounded-3xl p-4 sm:p-8 space-y-5 shadow-xs">
              
              <div className="border-b border-[#ECE8DF] pb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-readex font-bold text-sm sm:text-lg text-[#141414]">
                      تنسيق المعاينة وتثبيت الموعد مع مسؤولة المعاينات
                    </h3>
                    <span className="px-2 py-0.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-[10px] font-black rounded-full">
                      هام
                    </span>
                  </div>
                  <p className="text-xs text-[#6B665C]">
                    إرسال بيانات العميل والموعد المقترح لمسؤولة المعاينات (سارة حنفي) مع حفظ العميل في الـ CRM تلقائياً.
                  </p>
                </div>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FAF4E5] border border-[#E9DFCA] flex items-center justify-center text-[#A07A26] shrink-0">
                  <Calendar size={18} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1">
                <div>
                  <label className="text-[#141414] font-bold block mb-1.5">اسم العميل:</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: د. طارق المنشاوي"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div>
                  <label className="text-[#141414] font-bold block mb-1.5">رقم هاتف العميل:</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-[#141414] focus:outline-none focus:border-[#A07A26] dir-ltr text-right"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[#141414] font-bold block mb-1.5">الموعد المقترح للمعاينة:</label>
                  <input
                    type="text"
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    placeholder="اليوم الساعة 6:00 مساءً"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[#141414] font-bold block mb-1.5">ملاحظات وطلبات خاصة:</label>
                  <textarea
                    rows={2}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="ملاحظات حول طريقة السداد، المعاينة، تفاصيل أخرى..."
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendToSarahWhatsApp}
                className="w-full py-3.5 px-4 bg-[#0E7A5A] hover:bg-[#0B6349] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <MessageCircle size={17} />
                <span>إرسال لسارة حنفي وتسجيل الليد في مسار المتابعة</span>
              </button>

              {/* Field viewing reports & broker comments on this property */}
              {propertyFeedbacks.length > 0 && (
                <div className="mt-5 pt-5 border-t border-[#ECE8DF] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-readex font-bold text-xs sm:text-sm text-[#141414] flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>تقارير وكومنتات المعاينات الميدانية السابقة للشقة ({propertyFeedbacks.length}):</span>
                    </h4>
                    <span className="text-[10px] font-bold text-[#A07A26] bg-[#FAF4E5] px-2 py-0.5 rounded-md border border-[#E9DFCA]">
                      مسجلة من البروكر
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {propertyFeedbacks.map((fb) => (
                      <div key={fb.id} className="p-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-2xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] text-[#6B665C]">
                          <span className="font-bold text-[#141414]">البروكر: {fb.brokerName || fb.agentName}</span>
                          <span className="font-mono">{fb.date}</span>
                          {fb.outcome && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              {fb.outcome === 'interested' ? 'العميل مهتم وجاد' : fb.outcome === 'made_offer' ? 'قدّم عرض سعر' : fb.outcome === 'not_suitable' ? 'غير مناسبة' : fb.outcome}
                            </span>
                          )}
                        </div>
                        <p className="text-[#141414] font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-[#ECE8DF]/80">
                          « {fb.summary} »
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: صيغ الأسبوع وإعلان اليوم */}
        {/* ========================================================= */}
        {activeTab === 'daily_ad' && (
          <section aria-label="صيغ الأسبوع" className="space-y-5 animate-in fade-in max-w-4xl mx-auto">
            <div className="bg-white border border-[#ECE8DF] rounded-3xl p-4 sm:p-8 space-y-5 shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DF] pb-4">
                <div>
                  <h3 className="font-readex font-bold text-sm sm:text-lg text-[#141414]">
                    صيغ الإعلانات المخصصة لأيام الأسبوع
                  </h3>
                  <p className="text-xs text-[#6B665C]">
                    زوايا تسويقية مختلفة لكل يوم من أيام الأسبوع لتجديد التفاعل مع العملاء
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-bold text-xs rounded-xl self-start sm:self-auto">
                  اليوم تلقائي: {daysList.find(d => d.index === todayIndex)?.name}
                </span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {daysList.map((day) => {
                  const isSelected = selectedDayIndex === day.index;
                  return (
                    <button
                      key={day.index}
                      type="button"
                      onClick={() => setSelectedDayIndex(day.index)}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#141414] text-white border-[#141414] shadow-xs'
                          : 'bg-[#FAF9F5] border-[#ECE8DF] hover:border-[#A07A26] text-[#141414]'
                      }`}
                    >
                      <h4 className="font-readex font-bold text-xs sm:text-sm">
                        {day.name}
                      </h4>
                      <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-stone-300' : 'text-[#6B665C]'}`}>
                        {day.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Preview & Copy */}
              <div className="bg-[#FAF9F5] border border-[#ECE8DF] p-4 sm:p-5 rounded-2xl text-xs sm:text-sm text-[#141414] leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto font-ibm shadow-2xs select-text">
                {currentDailyAdText}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(currentDailyAdText, 'daily_ad')}
                className="w-full py-3.5 px-4 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Copy size={15} />
                <span>{copiedType === 'daily_ad' ? 'تم نسخ الإعلان بنجاح ✓' : 'نسخ إعلان اليوم'}</span>
              </button>

            </div>
          </section>
        )}

      </main>

      {/* ========================================================= */}
      {/* 4. RESPONSIVE FOOTER STATUS BAR */}
      {/* ========================================================= */}
      <footer className="px-3 sm:px-6 md:px-8 py-2.5 bg-white border-t border-[#ECE8DF] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 text-[#6B665C]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0E7A5A] animate-pulse shrink-0" />
          <span className="truncate">شركة السبع للعقارات · منصة أدوات المبيعات والتسويق العقاري الفاخر</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] font-bold transition-colors cursor-pointer text-xs active:scale-95 border border-[#ECE8DF] mr-auto sm:mr-0"
        >
          إغلاق النافذة
        </button>
      </footer>
    </div>
  );
};
