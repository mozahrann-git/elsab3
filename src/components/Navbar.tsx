import React, { useState, useEffect } from 'react';
import { ChangePasswordModal } from './ChangePasswordModal';
import { subscribeToStaffAuth, signOutToGuest } from '../services/firebaseService';
import { LionLogo } from './LionLogo';
import { 
  Heart, 
  ArrowLeftRight, 
  Menu, 
  X,
  Bell,
  Shield,
  Flame,
  ChevronDown,
  User,
  Compass,
  BookOpen,
  Calculator,
  Award,
  PlusCircle,
  Users,
  Building2,
  Layers,
  ChevronLeft, UserRound, KeyRound, LogOut} from 'lucide-react';
import { generateWhatsAppLink } from '../utils/helpers';
import { ClientProfile } from '../types';

interface NavbarProps {
  selectedNeighborhood?: string;
  onNeighborhoodSelect?: (neighborhood: string) => void;
  selectedFinishing?: 'all' | 'finished' | 'semi_finished';
  onFinishingSelect?: (finishing: 'all' | 'finished' | 'semi_finished') => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  comparisonCount: number;
  onOpenComparison: () => void;
  onOpenResaleSubmit: () => void;
  onOpenGuide: () => void;
  onOpenPriceMap?: () => void;
  onOpenValuation?: () => void;
  onOpenPartnerPortals?: () => void;
  onOpenBrokerPortal?: () => void;
  onOpenLandlordPortal?: () => void;
  onOpenMyPortal?: () => void;
  onLogout?: () => void;
  myPortalLabel?: string;
  onOpenClosedDeals?: () => void;
  onOpenAdmin: () => void;
  onOpenCrm: () => void;
  isAdminLoggedIn: boolean;
  pendingSubmissionsCount?: number;
  isSalesLoggedIn?: boolean;
  currentSalesAgentName?: string;
  onOpenSalesLogin?: () => void;
  isDbConnected?: boolean;
  onLogoutAdmin?: () => void;
  onLogoutSales?: () => void;
  clientProfile?: ClientProfile | null;
  clientUnreadCount?: number;
  onOpenClientNotifications?: () => void;
  onOpenClientAuth?: () => void;
  onLogoutClient?: () => void;
  onOpenSalesNotifications?: () => void;
  salesAlertsCount?: number;
  customLogoUrl?: string;
  onSelectOffPlan?: () => void;
  onSelectResale?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  favoritesCount,
  onOpenFavorites,
  comparisonCount,
  onOpenComparison,
  onOpenResaleSubmit,
  onOpenGuide,
  onOpenPriceMap,
  onOpenValuation,
  onOpenPartnerPortals,
  onOpenBrokerPortal,
  onOpenLandlordPortal,
  onOpenMyPortal,
  onLogout,
  myPortalLabel,
  onOpenClosedDeals,
  onOpenAdmin,
  onOpenCrm,
  isAdminLoggedIn,
  isSalesLoggedIn,
  currentSalesAgentName,
  onOpenSalesLogin,
  clientProfile,
  clientUnreadCount = 0,
  onOpenClientNotifications,
  onOpenClientAuth,
  onOpenSalesNotifications,
  salesAlertsCount = 0,
  customLogoUrl,
  onSelectOffPlan,
  onSelectResale,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [staffSignedIn, setStaffSignedIn] = useState(false);
  useEffect(() => subscribeToStaffAuth((u) => setStaffSignedIn(!!u && !u.isAnonymous)), []);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // وقف سكرول الصفحة اللي ورا القائمة طول ما هي مفتوحة
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAvailableUnitsClick = () => {
    if (onSelectResale) onSelectResale();
    scrollToSection('properties-grid');
  };

  const handleUnderConstructionClick = () => {
    if (onSelectOffPlan) onSelectOffPlan();
    scrollToSection('properties-grid');
  };

  const handleDistrictGuideClick = () => {
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      scrollToSection('districts-guide-section');
    }
  };

  const handleWhatsAppClick = () => {
    const url = generateWhatsAppLink('01021242871', undefined, undefined, 'مرحباً، أود الاستفسار عن شقق المقطم بالهضبة الوسطى');
    window.open(url, '_blank');
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-200 border-b border-[#ECE8DF] ${
      scrolled 
        ? 'bg-[#F6F4EF]/95 backdrop-blur-md shadow-xs py-3' 
        : 'bg-[#F6F4EF] py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Right: Brand Logo + Text */}
        <div 
          onClick={handleAvailableUnitsClick}
          className="cursor-pointer select-none shrink-0"
        >
          <LionLogo 
            size={38} 
            customLogoUrl={customLogoUrl} 
            textColor="text-[#141414]"
            subtextColor="text-[#6B665C]"
          />
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-xs xl:text-sm font-medium text-[#4A463F]">
          <button
            onClick={handleAvailableUnitsClick}
            className="hover:text-[#141414] transition-colors py-1 cursor-pointer"
          >
            الشقق المتاحة
          </button>

          <button
            onClick={handleUnderConstructionClick}
            className="hover:text-[#141414] transition-colors py-1 cursor-pointer"
          >
            تحت الإنشاء
          </button>

          {onOpenPriceMap && (
            <button
              onClick={onOpenPriceMap}
              className="hover:text-[#141414] text-[#A07A26] font-bold transition-colors py-1 cursor-pointer flex items-center gap-1"
            >
              <Compass size={14} />
              <span>مؤشر الأسعار</span>
            </button>
          )}

          <button
            onClick={handleDistrictGuideClick}
            className="hover:text-[#141414] transition-colors py-1 cursor-pointer"
          >
            دليل الأحياء
          </button>

          {onOpenValuation && (
            <button
              onClick={onOpenValuation}
              className="hover:text-[#141414] transition-colors py-1 cursor-pointer"
            >
              تقييم شقتك
            </button>
          )}

          <button
            onClick={onOpenResaleSubmit}
            className="hover:text-[#141414] transition-colors py-1 cursor-pointer"
          >
            اعرض شقتك
          </button>
        </nav>

        {/* Left: Actions (Login, Cart/Favs, & Dark WhatsApp Button) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0 max-w-[62%] sm:max-w-none overflow-x-auto no-scrollbar [&>*]:shrink-0" style={{ scrollbarWidth: 'none' }}>
          
          {/* Comparison and Favorites small indicators if active */}
          {comparisonCount > 0 && (
            <button
              onClick={onOpenComparison}
              className="p-2 bg-white text-[#141414] border border-[#ECE8DF] rounded-xl hover:border-stone-400 transition-all cursor-pointer relative"
              title="مقارنة الشقق"
            >
              <ArrowLeftRight size={15} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#A07A26] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {comparisonCount}
              </span>
            </button>
          )}

          {favoritesCount > 0 && (
            <button
              onClick={onOpenFavorites}
              className="p-2 bg-white text-[#141414] border border-[#ECE8DF] rounded-xl hover:border-stone-400 transition-all cursor-pointer relative"
              title="المفضلة"
            >
              <Heart size={15} className="fill-rose-500 text-rose-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {favoritesCount}
              </span>
            </button>
          )}

          {/* Notifications if logged in */}
          {clientProfile && onOpenClientNotifications && (
            <button
              onClick={onOpenClientNotifications}
              className="p-2 bg-white text-[#141414] border border-[#ECE8DF] rounded-xl hover:border-stone-400 transition-all cursor-pointer relative"
              title="الإشعارات"
            >
              <Bell size={15} />
              {clientUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#A07A26] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {clientUnreadCount}
                </span>
              )}
            </button>
          )}

          {isSalesLoggedIn && onOpenSalesNotifications && (
            <button
              onClick={onOpenSalesNotifications}
              className="p-2 bg-white text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-50 transition-all cursor-pointer relative"
              title="تنبيهات المبيعات"
            >
              <Bell size={15} className="text-emerald-700" />
              {salesAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {salesAlertsCount}
                </span>
              )}
            </button>
          )}

          {/* حساب واحد للكل: أدمن، سيلز، مالك، بروكر، عميل */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-label="حسابي"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${staffSignedIn ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#ECE8DF] hover:border-stone-400'}`}
            >
              <UserRound size={15} className={staffSignedIn ? 'text-[#D9B864]' : 'text-[#A07A26]'} />
              <span className="hidden sm:inline">{staffSignedIn ? (myPortalLabel ? 'حسابي' : 'حسابي') : 'تسجيل الدخول'}</span>
              <ChevronDown size={12} />
            </button>

            {userDropdownOpen && (
              <>
                <button aria-label="إغلاق" className="fixed inset-0 z-40 cursor-default" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-64 max-w-[86vw] bg-white rounded-2xl shadow-xl border border-[#ECE8DF] p-2 z-50 text-right">
                  {staffSignedIn ? (
                    <>
                      {myPortalLabel && onOpenMyPortal && (
                        <button onClick={() => { setUserDropdownOpen(false); onOpenMyPortal(); }}
                          className="w-full text-right px-3 py-2.5 text-xs font-bold hover:bg-[#F6F4EF] rounded-xl flex items-center justify-between">
                          <span>{myPortalLabel}</span><Building2 size={14} className="text-[#A07A26]" />
                        </button>
                      )}
                      {isAdminLoggedIn && (
                        <button onClick={() => { setUserDropdownOpen(false); onOpenAdmin(); }}
                          className="w-full text-right px-3 py-2.5 text-xs font-bold hover:bg-[#F6F4EF] rounded-xl flex items-center justify-between">
                          <span>لوحة الإدارة المركزية</span><Shield size={14} className="text-[#A07A26]" />
                        </button>
                      )}
                      {(isAdminLoggedIn || isSalesLoggedIn) && (
                        <button onClick={() => { setUserDropdownOpen(false); onOpenCrm(); }}
                          className="w-full text-right px-3 py-2.5 text-xs font-bold hover:bg-[#F6F4EF] rounded-xl flex items-center justify-between">
                          <span>غرفة العمليات والـ CRM</span><Flame size={14} className="text-[#A07A26]" />
                        </button>
                      )}
                      <button onClick={() => { setUserDropdownOpen(false); setChangePassOpen(true); }}
                        className="w-full text-right px-3 py-2.5 text-xs font-bold hover:bg-[#F6F4EF] rounded-xl flex items-center justify-between">
                        <span>تغيير كلمة المرور</span><KeyRound size={14} className="text-[#A07A26]" />
                      </button>
                      <button onClick={() => { setUserDropdownOpen(false); signOutToGuest().catch(() => {}); onLogout?.(); }}
                        className="w-full text-right px-3 py-2.5 text-xs font-bold text-[#C2412D] hover:bg-[#FBEDEA] rounded-xl flex items-center justify-between border-t border-[#F0ECE4] mt-1 pt-3">
                        <span>تسجيل الخروج</span><LogOut size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setUserDropdownOpen(false); onOpenClientAuth(); }}
                        className="w-full text-right px-3 py-2.5 text-xs font-bold hover:bg-[#F6F4EF] rounded-xl flex items-center justify-between">
                        <span>تسجيل الدخول / إنشاء حساب</span><UserRound size={14} className="text-[#A07A26]" />
                      </button>
                      <p className="px-3 py-2 text-[11px] text-[#8C877D] leading-5">للملاك والبروكرز وفريق السبع · ادخل بإيميلك وكلمة المرور</p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* واتساب للزوار بس */}
          {!staffSignedIn && (
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
          >
            <span>واتساب</span>
          </button>
          )}

          {/* Mobile & Side Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-[#141414] hover:bg-stone-200/60 bg-white border border-[#ECE8DF] rounded-xl transition-colors cursor-pointer"
            aria-label="القائمة الجانبية"
            title="فتح القائمة الرئيسية"
          >
            <Menu size={20} />
          </button>

        </div>
      </div>

      {/* ========================================================= */}
      {/* RICH SIDEBAR DRAWER (القائمة الجانبية الشاملة لجميع الصفحات) */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop (من غير blur عشان الموبايل ميتقلش) */}
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content: السكرول جوه القائمة بس، والصفحة اللي وراها واقفة */}
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-[#FAF8F5] shadow-2xl z-50 flex flex-col justify-between overflow-y-auto overscroll-contain border-l border-[#ECE8DF] animate-in slide-in-from-right duration-250"
            style={{ height: '100dvh', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            
            {/* Drawer Top Header */}
            <div>
              <div className="p-4 sm:p-5 border-b border-[#ECE8DF] bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LionLogo size={32} customLogoUrl={customLogoUrl} />
                  <div>
                    <h2 className="font-readex font-bold text-sm text-[#141414]">السبع للعقارات</h2>
                    <p className="text-[11px] text-[#6B665C]">ريسيل واستثمار الهضبة الوسطى</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#6B665C] hover:text-[#141414] hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Sections */}
              <div className="p-4 space-y-5">
                
                {/* 1. أقسام العقارات والمعروض */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8C827A] px-2 uppercase tracking-wider block">
                    استكشاف الشقق والمعروض
                  </span>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleAvailableUnitsClick();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 size={16} className="text-[#A07A26]" />
                      <span>شقق ريسيل (استلام فوري)</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8C827A]" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleUnderConstructionClick();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers size={16} className="text-[#A07A26]" />
                      <span>مشاريع تحت الإنشاء (تقسيط)</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8C827A]" />
                  </button>

                  {onOpenPriceMap && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenPriceMap();
                      }}
                      className="w-full p-2.5 rounded-xl bg-[#FAF4E5] hover:bg-[#F3EAD5] border border-[#E9DFCA] text-right flex items-center justify-between text-xs font-bold text-[#A07A26] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={16} className="text-[#A07A26]" />
                        <span>مؤشر وخريطة أسعار الأحياء</span>
                      </div>
                      <ChevronLeft size={14} className="text-[#A07A26]" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleDistrictGuideClick();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={16} className="text-[#A07A26]" />
                      <span>دليل أحياء الهضبة الـ 9 الشامل</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8C827A]" />
                  </button>

                  {onOpenValuation && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenValuation();
                      }}
                      className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calculator size={16} className="text-[#A07A26]" />
                        <span>كام تستاهل شقتك؟ (حاسبة التقييم)</span>
                      </div>
                      <ChevronLeft size={14} className="text-[#8C827A]" />
                    </button>
                  )}

                  {onOpenClosedDeals && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenClosedDeals();
                      }}
                      className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Award size={16} className="text-[#A07A26]" />
                        <span>صفقات حقيقية اتقفلت حديثاً</span>
                      </div>
                      <ChevronLeft size={14} className="text-[#8C827A]" />
                    </button>
                  )}
                </div>

                {/* 2. خدمات الملاك والوسطاء */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8C827A] px-2 uppercase tracking-wider block">
                    خدمات الملاك والشركاء
                  </span>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenResaleSubmit();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlusCircle size={16} className="text-[#A07A26]" />
                      <span>اعرض شقتك للبيع (إضافة عقار)</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8C827A]" />
                  </button>

                  {(onOpenLandlordPortal || onOpenPartnerPortals) && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onOpenLandlordPortal) onOpenLandlordPortal();
                        else if (onOpenPartnerPortals) onOpenPartnerPortals();
                      }}
                      className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 size={16} className="text-[#A07A26]" />
                        <span>بوابة ملاك الوحدات (متابعة الشقق والمعاينات)</span>
                      </div>
                      <ChevronLeft size={14} className="text-[#8C827A]" />
                    </button>
                  )}

                  {(onOpenBrokerPortal || onOpenPartnerPortals) && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onOpenBrokerPortal) onOpenBrokerPortal();
                        else if (onOpenPartnerPortals) onOpenPartnerPortals();
                      }}
                      className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users size={16} className="text-[#A07A26]" />
                        <span>بوابة البروكر والشركاء (غرفة العمليات)</span>
                      </div>
                      <ChevronLeft size={14} className="text-[#8C827A]" />
                    </button>
                  )}
                </div>

                {/* 3. أدوات وتفضيلات الحساب */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8C827A] px-2 uppercase tracking-wider block">
                    أدوات العميل
                  </span>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenFavorites();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart size={16} className="text-rose-500" />
                      <span>المفضلة</span>
                    </div>
                    <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-mono font-bold">
                      {favoritesCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenComparison();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeftRight size={16} className="text-[#A07A26]" />
                      <span>مقارنة الشقق</span>
                    </div>
                    <span className="text-xs bg-[#FAF4E5] text-[#A07A26] px-2 py-0.5 rounded-full font-mono font-bold">
                      {comparisonCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenClientAuth) onOpenClientAuth();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F3EFE6] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold text-[#141414] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User size={16} className="text-[#A07A26]" />
                      <span>{clientProfile ? `الملف الشخصي (${clientProfile.name})` : 'تسجيل الدخول / إنشاء حساب'}</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8C827A]" />
                  </button>
                </div>

                {/* 4. فريق العمل والإدارة */}
                <div className="space-y-1.5 pt-2 border-t border-[#ECE8DF]">
                  <span className="text-[10px] font-bold text-[#8C827A] px-2 uppercase tracking-wider block">
                    غرفة المبيعات والإدارة
                  </span>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCrm();
                    }}
                    className="w-full p-3 rounded-2xl bg-[#141414] hover:bg-black text-white text-right flex items-center justify-between text-xs font-bold font-readex transition-all cursor-pointer shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame size={16} className="text-[#E9DFCA]" />
                      <span>غرفة العمليات و CRM المبيعات</span>
                    </div>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-lg text-[#FAF4E5]">
                      {isSalesLoggedIn ? currentSalesAgentName : 'دخول'}
                    </span>
                  </button>

                  {onOpenMyPortal && myPortalLabel && (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onOpenMyPortal(); }}
                      className="w-full p-3 mb-2 rounded-xl bg-[#A07A26] text-white text-right flex items-center justify-between text-sm font-bold"
                    >
                      <span>{myPortalLabel}</span>
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  {staffSignedIn && (
                    <button
                      onClick={() => { setMobileMenuOpen(false); setChangePassOpen(true); }}
                      className="w-full p-2.5 mb-2 rounded-xl bg-white text-[#141414] border border-[#ECE8DF] text-right flex items-center justify-between text-xs font-bold"
                    >
                      <span>تغيير كلمة المرور</span>
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  {isAdminLoggedIn ? (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full p-2.5 rounded-xl bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield size={16} />
                        <span>لوحة الإدارة المركزية</span>
                      </div>
                      <ChevronLeft size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full p-2 rounded-xl text-[#8C827A] hover:text-[#141414] text-right text-[11px] font-medium transition-colors"
                    >
                      دخول المسؤولين (Admin Panel)
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Footer inside Drawer */}
            <div className="p-4 border-t border-[#ECE8DF] bg-white text-center text-xs text-[#6B665C] space-y-2">
              <button
                onClick={handleWhatsAppClick}
                className="w-full py-2.5 bg-[#A07A26] hover:bg-[#8A671F] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>تواصل مع استشاري الهضبة</span>
              </button>
              <p className="text-[10px] text-[#8C827A]">
                © {new Date().getFullYear()} السبع للعقارات · الهضبة الوسطى بالمقطم
              </p>
            </div>

          </div>
        </div>
      )}
      <ChangePasswordModal isOpen={changePassOpen} onClose={() => setChangePassOpen(false)} />
    </header>
  );
};
