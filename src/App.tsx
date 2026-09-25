import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PartnerPortal } from './components/portal/PartnerPortal';
import { HADABA_WOSTA_NEIGHBORHOODS } from './data/properties';
import { DistrictGuideSection } from './components/districts/DistrictGuideSection';
import { DistrictPage } from './components/districts/DistrictPage';
import { SmartFilterDock } from './components/SmartFilterDock';
import { subscribeDistrictContent, computeDistrictStats, DistrictContent } from './services/districtService';
import { OwnerPortalPromo } from './components/OwnerPortalPromo';
import { CoordinatorPanel } from './components/portal/CoordinatorPanel';
import { CompanyOwnerPanel } from './components/portal/CompanyOwnerPanel';
import { MarketingPanel } from './components/portal/MarketingPanel';
import { FieldFeedbackPage } from './components/portal/FieldFeedbackPage';
import { SalesFeedbackInbox } from './components/portal/SalesFeedbackInbox';
import { OfferPublicPage } from './components/sales/OfferPublicPage';
import { getTrackedLink, logLinkHit } from './services/salesToolsService';
import { getStaffAccess, StaffAccess } from './services/firebaseService';
import { linkPropertyToOwner } from './services/portalService';
import { 
  Property, 
  FilterState, 
  OwnerSubmission,
  HadabaWostaNeighborhood,
  FinishingType,
  Lead,
  SalesAgent,
  BroadcastEmergencyAlert,
  ClientProfile,
  ClientNotification,
  FooterConfig,
  NeighborhoodPriceMapData,
  ClosedDeal,
  ViewingRequest,
  BrokerProfile
} from './types';
import { 
  ALL_HADABA_PROPERTIES,
  OFF_PLAN_PROPERTIES_DATA,
  HADABA_WOSTA_RESALE_DATA, 
  INITIAL_OWNER_SUBMISSIONS,
  DEFAULT_ADMIN_CREDENTIALS 
} from './data/properties';
import { USER_EXCEL_PROPERTIES } from './data/userProperties';
import { 
  INITIAL_SALES_AGENTS, 
  INITIAL_LEADS, 
  INITIAL_EMERGENCY_ALERTS 
} from './data/crmData';
import { DEFAULT_BROKERS } from './data/brokerData';
import { INITIAL_PRICE_MAP_DATA, INITIAL_CLOSED_DEALS } from './data/marketPriceData';
import { hydrateAllProperties, hydratePropertyMedia } from './utils/propertyMedia';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { HeroDoorSelector } from './components/HeroDoorSelector';
import { BudgetDiscoverySection } from './components/BudgetDiscoverySection';
import { DualPromoBanners } from './components/DualPromoBanners';
import { RecentlyClosedDealsSection } from './components/RecentlyClosedDealsSection';
import { InstantWhatsAppAlertBanner } from './components/InstantWhatsAppAlertBanner';
import { PriceHeatmapModal } from './components/PriceHeatmapModal';
import { PropertyValuationModal } from './components/PropertyValuationModal';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { ResaleSubmissionModal } from './components/ResaleSubmissionModal';
import { PropertyComparisonModal } from './components/PropertyComparisonModal';
import { FavoritesModal } from './components/FavoritesModal';
import { DistrictGuideModal } from './components/DistrictGuideModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { SalesCrmModal } from './components/SalesCrmModal';
import { SalesLoginModal } from './components/SalesLoginModal';
import { SalesAffiliateModal } from './components/SalesAffiliateModal';
import { ClientShowcaseView } from './components/ClientShowcaseView';
import { ClientAuthModal } from './components/ClientAuthModal';
import { ClientNotificationModal } from './components/ClientNotificationModal';
import { FollowUpNotificationsModal } from './components/FollowUpNotificationsModal';
import { BrokerPortalModal } from './components/BrokerPortalModal';
import { PartnerPortalsModal } from './components/PartnerPortalsModal';
import { NeighborhoodsGuideSection } from './components/NeighborhoodsGuideSection';
import { Footer } from './components/Footer';
import { LionLogo } from './components/LionLogo';
import { 
  ArrowUpDown, 
  ArrowLeftRight,
  ListFilter,
  Phone,
  ShieldCheck,
  Building2,
  Sparkles,
  Lock,
  Plus,
  ChevronDown,
  LayoutGrid,
  Rows,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import { generateCallLink, generateWhatsAppLink, formatPrice } from './utils/helpers';
import { ExcelImportModal } from './components/ExcelImportModal';
import {
  getInitialPropertiesCache,
  persistPropertiesCache,
  clearPropertiesCache,
  loadPersistentProperties,
  safeLocalStorageSet,
  safeLocalStorageGet,
  safeSessionStorageSet,
  getDeletedPropertyIds,
  recordDeletedPropertyId,
  removeDeletedPropertyId,
  clearDeletedPropertyIds
} from './utils/storageHelper';
import {
  testFirestoreConnection,
  subscribeToProperties,
  savePropertyToDb,
  deletePropertyFromDb,
  clearAllPropertiesFromDb,
  seedPropertiesToDb,
  subscribeToSalesAgents,
  saveSalesAgentToDb,
  seedSalesAgentsToDb,
  subscribeToCrmLeads,
  saveLeadToDb,
  updateLeadInDb,
  seedCrmLeadsToDb,
  subscribeToSiteConfig,
  saveSiteBannerToDb,
  saveSiteLogoToDb,
  saveSiteFooterConfigToDb,
  subscribeToOwnerSubmissions,
  saveOwnerSubmissionToDb,
  saveViewingRequestToDb,
  subscribeToBrokers,
  seedBrokersToDb,
  subscribeToStaffAuth,
  getStaffRole,
  signOutToGuest
} from './services/firebaseService';

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  branchAddress: 'فرع الهضبة الوسطى: الحي الثاني، بجوار مدرسة منارة المستقبل، المقطم',
  workingHours: 'مواعيد العمل: يومياً من 10:00 ص حتى 10:00 م',
  aboutText: 'المنصة المتخصصة الأولى في تسويق وإدارة شقق الريسيل بالهضبة الوسطى بالمقطم (متشطب ونصف تشطيب) لضمان أفضل سعر وأسرع إجراءات معاينة ونقل ملكية.',
  phone: '01021242871',
  whatsapp: '01021242871',
  copyrightText: 'السبع للعقارات (El Seba Real Estate). جميع الحقوق محفوظة.',
  tagline: 'بوابة ريسيل الهضبة الوسطى • قمة جبل المقطم',
};

const INITIAL_FILTER: FilterState = {
  search: '',
  neighborhood: '',
  category: 'resale',
  offPlanType: 'standalone_building',
  downPaymentPercentMax: 50,
  installmentYearsMax: 3,
  deliveryYearMax: 2027,
  downPayment: 'all',
  installmentYears: 'all',
  finishing: 'all',
  bedrooms: 'all',
  budgetRange: 'all',
  minPrice: 0,
  maxPrice: 8000000,
  minArea: 80,
  maxArea: 350,
  floor: 'all',
  hasGarageOnly: false,
  hasElevatorOnly: false,
  registeredOnly: false,
  sortBy: 'featured',
};

const DEFAULT_BANNER_PHOTO = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=85';

export default function App() {
  // 1. Properties State (synced with Firebase Firestore + IndexedDB / safe cache)
  const [properties, setProperties] = useState<Property[]>(() => {
    const deletedIds = getDeletedPropertyIds();
    const cached = getInitialPropertiesCache();
    if (cached && cached.length > 0) {
      const activeCached = cached.filter(p => !deletedIds.includes(p.id));
      if (activeCached.length > 0) return hydrateAllProperties(activeCached);
    }
    return hydrateAllProperties(ALL_HADABA_PROPERTIES.filter(p => !deletedIds.includes(p.id)));
  });

  // Database Connection & Quota State Indicator
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState<boolean>(false);

  // حساب الشخص الداخل (مالك/بروكر/مسؤولة ملاك/سيلز/أدمن) والبوابة المفتوحة
  const [staffAccess, setStaffAccess] = useState<StaffAccess | null>(null);
  const [activePortal, setActivePortal] = useState<null | 'owner' | 'broker' | 'coordinator' | 'company' | 'marketing' | 'sales_feedback'>(null);
  const [feedbackTripId] = useState<string | null>(() => { try { return new URLSearchParams(window.location.search).get('fb'); } catch { return null; } });
  // لينك العرض المخصوص واللينك المتتبّع
  const [offerId, setOfferId] = useState<string | null>(() => { try { return new URLSearchParams(window.location.search).get('offer'); } catch { return null; } });
  useEffect(() => {
    let t: string | null = null;
    try { t = new URLSearchParams(window.location.search).get('t'); } catch { /* */ }
    if (!t) return;
    logLinkHit(t).catch(() => {});
    getTrackedLink(t).then((l) => {
      if (!l) return;
      const url = l.target.startsWith('http') ? l.target : `${window.location.origin}${l.target}`;
      window.location.replace(url);
    }).catch(() => {});
  }, []);
  const [showFieldFeedback, setShowFieldFeedback] = useState<boolean>(!!feedbackTripId);
  const myPortalLabel = staffAccess?.role === 'owner' ? 'بوابة المالك'
    : staffAccess?.role === 'broker' ? 'بوابة البروكر'
    : staffAccess?.role === 'coordinator' ? 'الملاك والمعاينات'
    : staffAccess?.role === 'admin' ? 'الملاك والمعاينات'
    : staffAccess?.role === 'company_owner' ? 'لوحة الأونر'
    : staffAccess?.role === 'marketing' ? 'لوحة الماركتنج'
    : staffAccess?.role === 'sales' ? 'فيدباك المعاينات' : undefined;
  const openMyPortal = () => {
    const r = staffAccess?.role;
    setActivePortal(r === 'owner' ? 'owner' : r === 'broker' ? 'broker' : r === 'company_owner' ? 'company' : r === 'marketing' ? 'marketing' : r === 'sales' ? 'sales_feedback' : r === 'coordinator' || r === 'admin' ? 'coordinator' : null);
  };

  // بيتغير مع كل تسجيل دخول/خروج، عشان الاشتراكات تتعمل من جديد بصلاحيات الحساب الحالي
  const [authKey, setAuthKey] = useState<string>('init');

  // Firestore Real-Time Subscriptions & Cache Hydration on Mount
  useEffect(() => {
    // 0. Test Connection
    testFirestoreConnection().then(connected => {
      setIsDbConnected(connected);
      if (connected) {
        console.log('[Firebase] Connected to live Cloud Firestore database');
      }
    });

    // Hydrate from IndexedDB if initial synchronous state was empty or has newer data
    loadPersistentProperties().then((cached) => {
      const deletedIds = getDeletedPropertyIds();
      if (cached && cached.length > 0) {
        const activeCached = cached.filter(p => !deletedIds.includes(p.id));
        if (activeCached.length > 0) {
          const hydrated = hydrateAllProperties(activeCached, cached);
          setProperties(hydrated);
        }
      }
    });

    // 1. Subscribe to Properties (Firestore Live Synchronization with Image Preservation)
    const unsubProperties = subscribeToProperties((liveProps) => {
      const deletedIds = getDeletedPropertyIds();
      if (liveProps && liveProps.length > 0) {
        // liveProps is the live cloud source of truth, ensure all images/media are fully hydrated
        loadPersistentProperties().then(cached => {
          const activeLive = liveProps.filter(p => !deletedIds.includes(p.id));
          const fullyHydrated = hydrateAllProperties(activeLive, cached);
          setProperties(fullyHydrated);
          persistPropertiesCache(fullyHydrated);
        });
      } else {
        // Only if cloud database is completely empty on initial first startup
        loadPersistentProperties().then(cached => {
          const validCached = cached && cached.length > 0 ? cached.filter(p => !deletedIds.includes(p.id)) : null;
          const initialList = validCached || ALL_HADABA_PROPERTIES.filter(p => !deletedIds.includes(p.id));
          const fullyHydrated = hydrateAllProperties(initialList, cached);
          setProperties(fullyHydrated);
          persistPropertiesCache(fullyHydrated);
          if (fullyHydrated.length > 0) {
            seedPropertiesToDb(fullyHydrated).catch(err => console.warn('[Firebase] Initial seed:', err));
          }
        });
      }
    }, (_err, isQuota) => {
      if (isQuota) {
        setIsQuotaExceeded(true);
      }
      // Offline / Quota exceeded fallback to local storage
      loadPersistentProperties().then(cached => {
        const deletedIds = getDeletedPropertyIds();
        if (cached && cached.length > 0) {
          const activeCached = cached.filter(p => !deletedIds.includes(p.id));
          const list = activeCached.length > 0 ? activeCached : ALL_HADABA_PROPERTIES.filter(p => !deletedIds.includes(p.id));
          const hydrated = hydrateAllProperties(list, cached);
          setProperties(hydrated);
        } else {
          const hydrated = hydrateAllProperties(ALL_HADABA_PROPERTIES.filter(p => !deletedIds.includes(p.id)));
          setProperties(hydrated);
        }
      });
    });

    // 2. Subscribe to Sales Agents
    const unsubAgents = subscribeToSalesAgents((liveAgents) => {
      if (liveAgents && liveAgents.length > 0) {
        setSalesAgents(liveAgents);
        safeLocalStorageSet('lion_sales_agents', JSON.stringify(liveAgents));
      } else {
        seedSalesAgentsToDb(INITIAL_SALES_AGENTS);
      }
    }, (_err, isQuota) => {
      if (isQuota) setIsQuotaExceeded(true);
    });

    // 3. Subscribe to CRM Leads
    const unsubLeads = subscribeToCrmLeads((liveLeads) => {
      if (liveLeads && liveLeads.length > 0) {
        setCrmLeads(liveLeads);
        safeLocalStorageSet('lion_crm_leads', JSON.stringify(liveLeads));
      } else {
        seedCrmLeadsToDb(INITIAL_LEADS);
      }
    }, (_err, isQuota) => {
      if (isQuota) setIsQuotaExceeded(true);
    });

    // 4. Subscribe to Owner Submissions
    const unsubSubmissions = subscribeToOwnerSubmissions((liveSubs) => {
      if (liveSubs && liveSubs.length > 0) {
        setOwnerSubmissions(liveSubs);
        safeLocalStorageSet('lion_owner_submissions', JSON.stringify(liveSubs));
      }
    }, (_err, isQuota) => {
      if (isQuota) setIsQuotaExceeded(true);
    });

    // 5. Subscribe to Site Config (Banner, Logo & Footer)
    const unsubConfig = subscribeToSiteConfig((config) => {
      if (config.bannerUrl) {
        setBannerPhotoUrl(config.bannerUrl);
        safeLocalStorageSet('hadaba_custom_banner_url', config.bannerUrl);
      }
      if (config.logoUrl !== undefined) {
        setCustomLogoUrl(config.logoUrl);
        safeLocalStorageSet('hadaba_custom_logo_url', config.logoUrl);
        safeLocalStorageSet('elseba_custom_logo_url', config.logoUrl);
        window.dispatchEvent(new Event('lion_logo_updated'));
      }
      if (config.footerConfig) {
        setFooterConfig((prev) => ({ ...prev, ...config.footerConfig }));
        safeLocalStorageSet('hadaba_custom_footer_config', JSON.stringify(config.footerConfig));
      }
    }, (_err, isQuota) => {
      if (isQuota) setIsQuotaExceeded(true);
    });

    // 6. Subscribe to Brokers (Live sync with Firebase)
    const unsubBrokers = subscribeToBrokers((liveBrokers) => {
      if (liveBrokers && liveBrokers.length > 0) {
        setBrokersList(liveBrokers);
        safeLocalStorageSet('lion_brokers_list', JSON.stringify(liveBrokers));
      } else {
        seedBrokersToDb(DEFAULT_BROKERS).catch(err => console.warn('[Firebase] Initial brokers seed:', err));
      }
    }, (_err, isQuota) => {
      if (isQuota) setIsQuotaExceeded(true);
    });

    return () => {
      unsubProperties();
      unsubAgents();
      unsubLeads();
      unsubSubmissions();
      unsubConfig();
      unsubBrokers();
    };
    // بتتعمل من جديد لما الأدمن أو الموظف يدخل، لأن الاشتراك اللي اتعمل وهو زائر بيتقفل بخطأ صلاحيات
  }, [authKey]);

  // Save properties changes to IndexedDB and safe cache (never throws QuotaExceededError)
  useEffect(() => {
    persistPropertiesCache(properties);
  }, [properties]);

  // 2. Owner Submissions State (persisted in LocalStorage)
  const [ownerSubmissions, setOwnerSubmissions] = useState<OwnerSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('lion_owner_submissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_OWNER_SUBMISSIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('lion_owner_submissions', JSON.stringify(ownerSubmissions));
    } catch (e) {
      console.error(e);
    }
  }, [ownerSubmissions]);

  // 3. Admin Authentication State (Persistent until explicit logout)
  // الأدمن بيتحدد من Firebase بس (في useEffect تحت)، مش من ذاكرة المتصفح
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  const [adminCredentials, setAdminCredentials] = useState(() => {
    try {
      const saved = safeLocalStorageGet('lion_admin_credentials');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_ADMIN_CREDENTIALS;
  });

  // التحقق الحقيقي: الواجهة مبتصدقش localStorage، بتسأل Firebase Auth + staff_access
  useEffect(() => {
    const unsub = subscribeToStaffAuth(async (user) => {
      setAuthKey(user && !user.isAnonymous ? user.uid : 'guest');
      setStaffAccess(user && !user.isAnonymous ? await getStaffAccess(user.email) : null);
      if (!user || user.isAnonymous) {
        setIsAdminLoggedIn(false);
        setIsSalesLoggedIn(false);
        return;
      }
      const role = await getStaffRole(user.email);
      setIsAdminLoggedIn(role === 'admin');
      if (role !== 'admin' && role !== 'sales') setIsSalesLoggedIn(false);
    });
    return () => unsub();
  }, []);

  const handleAdminLogin = (status: boolean) => {
    setIsAdminLoggedIn(status);
    if (status) {
      safeLocalStorageSet('lion_admin_logged_in', 'true');
      safeSessionStorageSet('lion_admin_logged_in', 'true');
    } else {
      safeLocalStorageSet('lion_admin_logged_in', 'false');
      safeSessionStorageSet('lion_admin_logged_in', 'false');
      try {
        localStorage.removeItem('lion_admin_auth');
        sessionStorage.removeItem('lion_admin_auth');
      } catch {
        // ignore
      }
    }
  };

  const handleAdminLogout = () => {
    signOutToGuest().catch(() => {});
    setIsAdminLoggedIn(false);
    safeLocalStorageSet('lion_admin_logged_in', 'false');
    safeSessionStorageSet('lion_admin_logged_in', 'false');
    try {
      localStorage.removeItem('lion_admin_auth');
      sessionStorage.removeItem('lion_admin_auth');
    } catch {
      // ignore
    }
    setIsAdminDashboardOpen(false);
  };

  const handleUpdateAdminCredentials = (email: string, pass: string) => {
    const creds = { email, password: pass };
    setAdminCredentials(creds);
    safeLocalStorageSet('lion_admin_credentials', JSON.stringify(creds));
  };

  // Banner Photo State (persisted in LocalStorage)
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('hadaba_custom_banner_url') || DEFAULT_BANNER_PHOTO;
    } catch {
      return DEFAULT_BANNER_PHOTO;
    }
  });

  const handleUpdateBannerPhoto = (newUrl: string) => {
    setBannerPhotoUrl(newUrl);
    // Save to live cloud database
    saveSiteBannerToDb(newUrl).catch(err => { console.error('[Firebase] Failed to save banner:', err); alert('اللوجو/البانر ماتحفظش على السيرفر. اتأكد إنك داخل بحساب الأدمن وجرّب تاني.'); });
    try {
      localStorage.setItem('hadaba_custom_banner_url', newUrl);
    } catch {
      // Quota exceeded safe fallback (no crash)
      console.warn('[Storage] Local storage quota reached for custom banner, saved to cloud database');
    }
  };

  const handleResetBannerPhoto = () => {
    setBannerPhotoUrl(DEFAULT_BANNER_PHOTO);
    saveSiteBannerToDb(DEFAULT_BANNER_PHOTO).catch(err => console.error(err));
    try {
      localStorage.removeItem('hadaba_custom_banner_url');
    } catch {
      // ignore
    }
  };

  // Logo Photo State (persisted in LocalStorage & synchronized with Firebase Cloud)
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('hadaba_custom_logo_url') || localStorage.getItem('elseba_custom_logo_url') || '';
    } catch {
      return '';
    }
  });

  const handleUpdateLogoPhoto = (newUrl: string) => {
    setCustomLogoUrl(newUrl);
    saveSiteLogoToDb(newUrl).catch(err => { console.error('[Firebase] Failed to save logo:', err); alert('اللوجو/البانر ماتحفظش على السيرفر. اتأكد إنك داخل بحساب الأدمن وجرّب تاني.'); });
    safeLocalStorageSet('hadaba_custom_logo_url', newUrl);
    safeLocalStorageSet('elseba_custom_logo_url', newUrl);
    window.dispatchEvent(new Event('lion_logo_updated'));
  };

  const handleResetLogoPhoto = () => {
    setCustomLogoUrl('');
    saveSiteLogoToDb('').catch(err => console.error(err));
    try {
      localStorage.removeItem('hadaba_custom_logo_url');
      localStorage.removeItem('elseba_custom_logo_url');
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('lion_logo_updated'));
  };

  // Footer & Contact Info State (persisted in LocalStorage & synchronized with Firebase Cloud)
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(() => {
    try {
      const saved = localStorage.getItem('hadaba_custom_footer_config');
      if (saved) return { ...DEFAULT_FOOTER_CONFIG, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_FOOTER_CONFIG;
  });

  const handleUpdateFooterConfig = (newConfig: FooterConfig) => {
    const merged = { ...DEFAULT_FOOTER_CONFIG, ...newConfig };
    setFooterConfig(merged);
    saveSiteFooterConfigToDb(merged).catch((err) => console.error('[Firebase] Failed to save footer config:', err));
    safeLocalStorageSet('hadaba_custom_footer_config', JSON.stringify(merged));
  };

  const handleResetFooterConfig = () => {
    setFooterConfig(DEFAULT_FOOTER_CONFIG);
    saveSiteFooterConfigToDb(DEFAULT_FOOTER_CONFIG).catch((err) => console.error(err));
    safeLocalStorageSet('hadaba_custom_footer_config', JSON.stringify(DEFAULT_FOOTER_CONFIG));
  };

  // 4. Filters State
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  // دليل الأحياء
  const [districtContent, setDistrictContent] = useState<Record<string, DistrictContent>>({});
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);
  useEffect(() => subscribeDistrictContent(setDistrictContent), []);

  // 5. Modals State
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [detailModalInitialMedia, setDetailModalInitialMedia] = useState<'photos' | 'video'>('photos');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isResaleSubmitOpen, setIsResaleSubmitOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isDistrictGuideOpen, setIsDistrictGuideOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const handleDirectEditProperty = (prop: Property) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginOpen(true);
      return;
    }
    setEditingProperty(prop);
    setIsAdminDashboardOpen(true);
  };
  
  // CRM & Sales Gamification States
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isSalesLoginOpen, setIsSalesLoginOpen] = useState(false);
  const [salesToolkitProperty, setSalesToolkitProperty] = useState<Property | null>(null);

  // Sales Agent Authentication State
  const [isSalesLoggedIn, setIsSalesLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lion_sales_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  const [currentSalesAgentId, setCurrentSalesAgentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lion_current_sales_agent_id') || null;
    } catch {
      return null;
    }
  });

  // CRM Data Persistence State
  const [salesAgents, setSalesAgents] = useState<SalesAgent[]>(() => {
    try {
      const saved = localStorage.getItem('lion_sales_agents');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SALES_AGENTS;
  });

  useEffect(() => {
    safeLocalStorageSet('lion_sales_agents', JSON.stringify(salesAgents));
  }, [salesAgents]);

  const [crmLeads, setCrmLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('lion_crm_leads');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LEADS;
  });

  useEffect(() => {
    safeLocalStorageSet('lion_crm_leads', JSON.stringify(crmLeads));
  }, [crmLeads]);

  const [emergencyAlerts, setEmergencyAlerts] = useState<BroadcastEmergencyAlert[]>(() => {
    try {
      const saved = localStorage.getItem('lion_emergency_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_EMERGENCY_ALERTS;
  });

  useEffect(() => {
    safeLocalStorageSet('lion_emergency_alerts', JSON.stringify(emergencyAlerts));
  }, [emergencyAlerts]);

  // Floating Consultation Widget Inactivity Auto-Fade (Fades out when browsing/idle so it doesn't obstruct view)
  const [isFloatingActive, setIsFloatingActive] = useState<boolean>(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleUserActivity = () => {
      setIsFloatingActive(true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsFloatingActive(false);
      }, 2500); // Fades softly after 2.5s of no scroll/touch
    };

    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('touchmove', handleUserActivity, { passive: true });
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });

    handleUserActivity();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('touchmove', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, []);

  // Helper to extract showcase parameters from search queries or hash fragments
  const getUrlShowcaseParams = () => {
    try {
      if (typeof window === 'undefined') return { prop: null, agent: null };
      const searchParams = new URLSearchParams(window.location.search);
      let prop = searchParams.get('property') || searchParams.get('code') || searchParams.get('id') || searchParams.get('unit') || searchParams.get('prop');
      let ag = searchParams.get('agent');

      // Also check hash in case of hash router or hash-encoded queries
      if (!prop && window.location.hash) {
        const hash = window.location.hash;
        const qIdx = hash.indexOf('?');
        if (qIdx !== -1) {
          const hashParams = new URLSearchParams(hash.substring(qIdx));
          prop = hashParams.get('property') || hashParams.get('code') || hashParams.get('id') || hashParams.get('unit') || hashParams.get('prop');
          if (!ag) ag = hashParams.get('agent');
        } else if (hash.includes('=')) {
          const hashParams = new URLSearchParams(hash.replace(/^#\/?/, ''));
          prop = hashParams.get('property') || hashParams.get('code') || hashParams.get('id') || hashParams.get('unit');
          if (!ag) ag = hashParams.get('agent');
        }
      }

      if (prop) {
        prop = decodeURIComponent(prop).replace(/^#+/, '').trim();
      }
      return { prop: prop || null, agent: ag || null };
    } catch {
      return { prop: null, agent: null };
    }
  };

  // White-Label Showcase URL parsing for clients
  const [showcasePropertyCode, setShowcasePropertyCode] = useState<string | null>(() => getUrlShowcaseParams().prop);
  const [showcaseAgentId, setShowcaseAgentId] = useState<string | null>(() => getUrlShowcaseParams().agent);

  // Synchronize state with history / URL changes dynamically
  useEffect(() => {
    const handleUrlChange = () => {
      const { prop, agent } = getUrlShowcaseParams();
      setShowcasePropertyCode(prop);
      if (agent) setShowcaseAgentId(agent);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Client Authentication & Profile State (For visitors & buyers)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(() => {
    try {
      const saved = localStorage.getItem('hadaba_current_client_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isClientAuthOpen, setIsClientAuthOpen] = useState<boolean>(false);
  const [isClientNotificationsOpen, setIsClientNotificationsOpen] = useState<boolean>(false);
  const [isSalesNotificationsOpen, setIsSalesNotificationsOpen] = useState<boolean>(false);
  
  // 6. Mobile-First Broker Portal Modal State & Handlers
  const [isBrokerPortalOpen, setIsBrokerPortalOpen] = useState<boolean>(() => {
    try {
      return window.location.search.includes('broker') || window.location.search.includes('portal');
    } catch {
      return false;
    }
  });
  const [inspectingBrokerId, setInspectingBrokerId] = useState<string | null>(null);

  // 7. Partner & Landlord Portals Modal State
  const [isPartnerPortalsOpen, setIsPartnerPortalsOpen] = useState<boolean>(false);
  const [partnerPortalInitialTab, setPartnerPortalInitialTab] = useState<'landlord' | 'broker'>('landlord');

  // Callback when a broker completes an inspection with comments & outcome
  const handleViewingCompleted = (
    req: ViewingRequest, 
    outcomeFeedback: string, 
    viewingOutcome: string
  ) => {
    const recordedTime = 'اليوم ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setCrmLeads((prev) =>
      prev.map((l) => {
        const isMatch = (req.leadId && l.id === req.leadId) ||
          (l.interestedPropertyCode === req.propertyCode && (l.phone === req.clientPhone || l.name === req.clientName));

        if (!isMatch) return l;

        const updatedLead: Lead = {
          ...l,
          status: 'visit_done',
          fieldViewingComment: outcomeFeedback,
          fieldViewingOutcome: viewingOutcome,
          fieldViewingBrokerName: req.brokerName || 'البروكر المسؤول',
          fieldViewingRecordedAt: recordedTime,
          notes: [
            `[كومنت المعاينة الميدانية من البروكر ${req.brokerName || 'أحمد فؤاد'}]: ${outcomeFeedback}`,
            ...(l.notes || [])
          ]
        };

        updateLeadInDb(l.id, {
          status: 'visit_done',
          fieldViewingComment: outcomeFeedback,
          fieldViewingOutcome: viewingOutcome,
          fieldViewingBrokerName: req.brokerName || 'البروكر المسؤول',
          fieldViewingRecordedAt: recordedTime,
          notes: updatedLead.notes
        }).catch(() => {});

        return updatedLead;
      })
    );

    showToast('تم تسجيل التقرير الميداني بنجاح وظهور الكومنت للسيلز في الـ CRM والمالك في بوابته!');
  };

  const [brokersList, setBrokersList] = useState<BrokerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('lion_brokers_list');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_BROKERS;
  });

  const handleUpdateBrokersList = (newList: BrokerProfile[]) => {
    setBrokersList(newList);
    safeLocalStorageSet('lion_brokers_list', JSON.stringify(newList));
    seedBrokersToDb(newList).catch(err => console.warn('[Firebase] Updating brokers:', err));
  };

  const handleRequestViewing = (property: Property, preferredTime: string = 'النهارده أو بكرة بعد 5 مساءً') => {
    try {
      const assignedBrokerId = property.brokerId || 'broker_ahmed';
      const newReq: ViewingRequest = {
        id: `req_${Date.now()}`,
        propertyId: property.id,
        propertyCode: property.code,
        propertyTitle: property.title,
        propertyNeighborhood: property.neighborhood,
        propertyPrice: property.price,
        propertyArea: property.area,
        propertyImage: property.images?.[0],
        brokerId: assignedBrokerId,
        brokerName: 'أحمد فؤاد',
        leadId: `lead_crm_${Date.now()}`,
        clientPreferredTime: preferredTime,
        status: 'pending_broker',
        createdAt: 'دلوقتي',
        createdAtTimestamp: Date.now(),
        remindersSent: 0,
        nextReminderCountdownSeconds: 900,
        ownerName: property.ownerName || 'أ/ محمد خيري',
        ownerPhone: property.ownerPhone || '01001234567'
      };

      saveViewingRequestToDb(newReq).catch(() => {});
      console.log('[Broker Push Notification]: طلب معاينة جديد على', property.code, '— كلّم المالك وحدد معاد');
      showToast(`تم إرسال إشعار طلب المعاينة لشريك السبع المسؤول عن وحدة ${property.code}`);
    } catch (e) {
      console.error(e);
    }
  };
  
  // Market Price Map & Valuation Calculator Modals & Data
  const [isPriceMapOpen, setIsPriceMapOpen] = useState<boolean>(false);
  const [isValuationOpen, setIsValuationOpen] = useState<boolean>(false);

  const [priceMapData, setPriceMapData] = useState<NeighborhoodPriceMapData[]>(() => {
    try {
      const saved = localStorage.getItem('lion_price_map_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PRICE_MAP_DATA;
  });

  useEffect(() => {
    safeLocalStorageSet('lion_price_map_data', JSON.stringify(priceMapData));
  }, [priceMapData]);

  const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>(() => {
    try {
      const saved = localStorage.getItem('lion_closed_deals_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CLOSED_DEALS;
  });

  useEffect(() => {
    safeLocalStorageSet('lion_closed_deals_v2', JSON.stringify(closedDeals));
  }, [closedDeals]);

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hadaba_read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    safeLocalStorageSet('hadaba_read_notification_ids', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  const handleSaveClientProfile = (profile: ClientProfile) => {
    setClientProfile(profile);
    safeLocalStorageSet('hadaba_current_client_profile', JSON.stringify(profile));
    
    // Also save in registered clients list
    try {
      const raw = localStorage.getItem('hadaba_registered_clients');
      const list: ClientProfile[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter(c => c.id !== profile.id && c.phone !== profile.phone);
      updated.unshift(profile);
      safeLocalStorageSet('hadaba_registered_clients', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    showToast(`أهلاً بك يا ${profile.name}! تم ضبط تفضيلات الإشعارات بنجاح.`);
  };

  const handleLogoutClient = () => {
    setClientProfile(null);
    try {
      localStorage.removeItem('hadaba_current_client_profile');
    } catch (e) {
      console.error(e);
    }
    showToast('تم تسجيل الخروج');
  };

  // Smart matching notifications for registered clients
  const clientNotifications: ClientNotification[] = useMemo(() => {
    if (!clientProfile) return [];

    const list: ClientNotification[] = [];
    const prefNeighborhoods = clientProfile.preferredNeighborhoods || [];
    const maxBudget = clientProfile.budgetMax || 10000000;
    const prefFinishing = clientProfile.preferredFinishing || 'all';

    // Find properties that match client preferences
    const matched = properties.filter(p => {
      if (prefNeighborhoods.length > 0 && !prefNeighborhoods.includes(p.neighborhood)) {
        return false;
      }
      if (p.price && p.price > maxBudget * 1.1) { // 10% tolerance
        return false;
      }
      if (prefFinishing !== 'all' && p.finishing !== prefFinishing) {
        return false;
      }
      return true;
    });

    // Generate alerts
    matched.slice(0, 12).forEach((prop) => {
      const notifId = `notif_match_${prop.id}_${clientProfile.id}`;
      const isRead = readNotificationIds.includes(notifId);
      const isFeatured = prop.isFeatured;

      list.push({
        id: notifId,
        clientId: clientProfile.id,
        propertyCode: prop.code,
        propertyTitle: prop.title,
        propertyNeighborhood: prop.neighborhood,
        propertyPrice: prop.price,
        propertyImage: prop.images?.[0],
        type: isFeatured ? 'urgent_deal' : 'new_listing',
        title: isFeatured ? `صفقة مميزة بالهضبة الوسطى: كود #${prop.code}` : `شقة جديدة مطابقة لطلبك: كود #${prop.code}`,
        message: `شقة مساحة ${prop.area}م² في ${prop.neighborhood} بسعر ${prop.price.toLocaleString()} ج.م تناسب ميزانيتك (${formatPrice(maxBudget)})`,
        createdAt: prop.createdAt || 'اليوم',
        isRead
      });
    });

    return list;
  }, [clientProfile, properties, readNotificationIds]);

  const clientUnreadCount = useMemo(() => {
    return clientNotifications.filter(n => !n.isRead).length;
  }, [clientNotifications]);

  const handleMarkNotificationAsRead = (notifId: string) => {
    setReadNotificationIds(prev => prev.includes(notifId) ? prev : [...prev, notifId]);
  };

  const handleMarkAllNotificationsAsRead = () => {
    const allIds = clientNotifications.map(n => n.id);
    setReadNotificationIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const handleSelectPropertyByCode = (code: string) => {
    const prop = findPropertyByCode(code);
    if (prop) {
      setSelectedProperty(prop);
      setIsClientNotificationsOpen(false);
    } else {
      showToast(`لم يتم العثور على الشقة كود #${code}`);
    }
  };

  // Sales CRM Alerts and Follow-ups Count for Today
  const salesAlertsCount = useMemo(() => {
    return crmLeads.filter(l => 
      l.followUpScheduledAt && 
      l.followUpStatus !== 'completed' && 
      (l.followUpUrgency === 'urgent' || l.followUpUrgency === 'today' || l.followUpScheduledAt.includes('اليوم') || l.followUpScheduledAt.includes('الآن'))
    ).length;
  }, [crmLeads]);

  // Current active sales agent session
  const currentAgent = useMemo(() => {
    if (currentSalesAgentId) {
      const found = salesAgents.find(a => a.id === currentSalesAgentId);
      if (found) return found;
    }
    return salesAgents.find(a => a.isCurrentSession) || salesAgents[0];
  }, [salesAgents, currentSalesAgentId]);

  const handleSalesLoginSuccess = (agent: SalesAgent) => {
    setIsSalesLoggedIn(true);
    setCurrentSalesAgentId(agent.id);
    safeLocalStorageSet('lion_sales_logged_in', 'true');
    safeLocalStorageSet('lion_current_sales_agent_id', agent.id);
    setSalesAgents(prev => prev.map(a => ({
      ...a,
      isCurrentSession: a.id === agent.id
    })));
    setIsSalesLoginOpen(false);
    setIsCrmOpen(true);
  };

  const handleSalesLogout = () => {
    signOutToGuest().catch(() => {});
    setIsSalesLoggedIn(false);
    safeLocalStorageSet('lion_sales_logged_in', 'false');
  };

  const handleOpenSalesSessionFromAdmin = (agentId: string) => {
    const target = salesAgents.find(a => a.id === agentId);
    if (target) {
      handleSalesLoginSuccess(target);
    }
  };

  const handleUpdatePropertyPrice = (propertyId: string, newPrice: number) => {
    setProperties(prev => {
      const updatedList = prev.map(p => {
        if (p.id === propertyId) {
          const updated = {
            ...p,
            price: newPrice,
            pricePerMeter: Math.round(newPrice / (p.area || 1))
          };
          savePropertyToDb(updated).catch(err => console.error('[Firebase] Error updating price:', err));
          return updated;
        }
        return p;
      });
      persistPropertiesCache(updatedList);
      return updatedList;
    });
  };

  // --- Mobile Back Button Support (History API Integration) ---
  const anyModalOpen = Boolean(
    selectedProperty ||
    isAdminDashboardOpen ||
    isAdminLoginOpen ||
    isResaleSubmitOpen ||
    isComparisonOpen ||
    isFavoritesOpen ||
    isDistrictGuideOpen ||
    isExcelImportOpen ||
    isCrmOpen ||
    isSalesLoginOpen ||
    salesToolkitProperty ||
    isPriceMapOpen ||
    isValuationOpen ||
    isPartnerPortalsOpen ||
    isBrokerPortalOpen ||
    isClientAuthOpen ||
    isClientNotificationsOpen ||
    isSalesNotificationsOpen ||
    showcasePropertyCode
  );

  const prevModalOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (anyModalOpen && !prevModalOpenRef.current) {
      window.history.pushState({ modalOpen: true, t: Date.now() }, '');
    }
    prevModalOpenRef.current = anyModalOpen;
  }, [anyModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      // If user tapped physical/virtual Android Back button or browser back
      if (anyModalOpen) {
        if (showcasePropertyCode) {
          setShowcasePropertyCode(null);
        } else if (salesToolkitProperty) {
          setSalesToolkitProperty(null);
        } else if (selectedProperty) {
          setSelectedProperty(null);
        } else if (isAdminDashboardOpen) {
          setIsAdminDashboardOpen(false);
          setEditingProperty(null);
        } else if (isAdminLoginOpen) {
          setIsAdminLoginOpen(false);
        } else if (isResaleSubmitOpen) {
          setIsResaleSubmitOpen(false);
        } else if (isComparisonOpen) {
          setIsComparisonOpen(false);
        } else if (isFavoritesOpen) {
          setIsFavoritesOpen(false);
        } else if (isDistrictGuideOpen) {
          setIsDistrictGuideOpen(false);
        } else if (isExcelImportOpen) {
          setIsExcelImportOpen(false);
        } else if (isCrmOpen) {
          setIsCrmOpen(false);
        } else if (isSalesLoginOpen) {
          setIsSalesLoginOpen(false);
        } else if (isPriceMapOpen) {
          setIsPriceMapOpen(false);
        } else if (isValuationOpen) {
          setIsValuationOpen(false);
        } else if (isPartnerPortalsOpen) {
          setIsPartnerPortalsOpen(false);
        } else if (isBrokerPortalOpen) {
          setIsBrokerPortalOpen(false);
        } else if (isClientAuthOpen) {
          setIsClientAuthOpen(false);
        } else if (isClientNotificationsOpen) {
          setIsClientNotificationsOpen(false);
        } else if (isSalesNotificationsOpen) {
          setIsSalesNotificationsOpen(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    anyModalOpen,
    showcasePropertyCode,
    salesToolkitProperty,
    selectedProperty,
    isAdminDashboardOpen,
    isAdminLoginOpen,
    isResaleSubmitOpen,
    isComparisonOpen,
    isFavoritesOpen,
    isDistrictGuideOpen,
    isExcelImportOpen,
    isCrmOpen,
    isSalesLoginOpen,
    isPriceMapOpen,
    isValuationOpen,
    isPartnerPortalsOpen,
    isBrokerPortalOpen,
    isClientAuthOpen,
    isClientNotificationsOpen,
    isSalesNotificationsOpen
  ]);

  const handleUpdateLead = (updatedLead: Lead) => {
    setCrmLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    saveLeadToDb(updatedLead).catch(err => console.error('[Firebase] Error saving lead:', err));
  };

  const handleAddLead = (newLead: Lead) => {
    setCrmLeads((prev) => [newLead, ...prev]);
    saveLeadToDb(newLead).catch(err => console.error('[Firebase] Error adding lead:', err));
  };

  const handleUpdateAgent = (updatedAgent: SalesAgent) => {
    setSalesAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
    saveSalesAgentToDb(updatedAgent).catch(err => console.error('[Firebase] Error updating agent:', err));
  };

  const handleSendEmergencyAlert = (message: string, bonus: string) => {
    const newAlert: BroadcastEmergencyAlert = {
      id: `alert_${Date.now()}`,
      senderName: 'الإدارة العامة',
      message,
      bonusAmount: bonus,
      createdAt: 'الآن',
      isActive: true,
      priority: 'urgent'
    };
    setEmergencyAlerts((prev) => [newAlert, ...prev]);
  };

  const handleRecordAgentAction = (category: string, points: number) => {
    if (!currentAgent) return;
    handleUpdateAgent({
      ...currentAgent,
      xp: currentAgent.xp + points
    });
  };

  // Card Layout Mode: 'grid' (صورة علوية) or 'horizontal' (صورة جانبية)
  const [cardLayout, setCardLayout] = useState<'grid' | 'horizontal'>('grid');

  // 6. Favorites State (persisted)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lion_hadaba_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    safeLocalStorageSet('lion_hadaba_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // 7. Comparison State
  const [comparisonList, setComparisonList] = useState<Property[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }

  // تنبيهات حقيقية لمواعيد متابعة العملاء (كل 30 ثانية)
  useEffect(() => {
    if (!isSalesLoggedIn && !isAdminLoggedIn) return;
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* */ }
    const check = () => {
      const now = Date.now();
      let seen: Record<string, number> = {};
      try { seen = JSON.parse(localStorage.getItem('lion_followup_seen') || '{}'); } catch { /* */ }
      crmLeads.forEach((l: any) => {
        const at = l.nextActionAt as number | undefined;
        if (!at || at > now || now - at > 12 * 3600000) return;
        if (!isAdminLoggedIn && currentSalesAgentId && l.assignedAgentId !== currentSalesAgentId) return;
        if (seen[l.id] === at) return;
        seen[l.id] = at;
        const msg = `⏰ ميعاد متابعة ${l.name}: ${l.followUpNote || 'كلّمه دلوقتي'}`;
        showToast(msg);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification('السبع · متابعة عميل', { body: msg }); } catch { /* */ }
      });
      try { localStorage.setItem('lion_followup_seen', JSON.stringify(seen)); } catch { /* */ }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmLeads, isSalesLoggedIn, isAdminLoggedIn, currentSalesAgentId]);
;

  // Click tracking function (WhatsApp, Calls, Views, Favorites)
  const handleTrackClick = (propertyId: string, type: 'whatsapp' | 'call' | 'views' | 'favorites') => {
    setProperties((prev) =>
      prev.map((prop) => {
        if (prop.id !== propertyId) return prop;
        const clicks = { ...(prop.clicks || { whatsapp: 0, call: 0, views: 0, favorites: 0 }) };
        clicks[type] = (clicks[type] || 0) + 1;
        return { ...prop, clicks };
      })
    );
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const isFav = prev.includes(id);
      if (isFav) {
        showToast('تمت إزالة الشقة من المفضلة');
        return prev.filter((item) => item !== id);
      } else {
        showToast('تمت إضافة الشقة للمفضلة ❤️');
        return [...prev, id];
      }
    });
  };

  const toggleComparison = (property: Property) => {
    setComparisonList((prev) => {
      const exists = prev.find((p) => p.id === property.id);
      if (exists) {
        showToast('تمت إزالة الشقة من قائمة المقارنة');
        return prev.filter((p) => p.id !== property.id);
      }
      if (prev.length >= 3) {
        showToast('تم استبدال شقة في المقارنة — المقارنة تسع حتى 3 شقق');
        return [...prev.slice(1), property];
      }
      const count = prev.length + 1;
      showToast(`تمت إضافة الشقة للمقارنة (${count}/3) — انقر "عرض جدول المقارنة" بالأسفل`);
      return [...prev, property];
    });
  };

  // Admin Actions for Properties
  const handleAddProperty = (newProp: Property) => {
    removeDeletedPropertyId(newProp.id);
    setProperties((prev) => {
      const updated = [newProp, ...prev.filter(p => p.id !== newProp.id)];
      persistPropertiesCache(updated);
      return updated;
    });
    savePropertyToDb(newProp).catch(err => console.error('[Firebase] Error adding property:', err));
  };

  const handleUpdateProperty = (updatedProp: Property) => {
    removeDeletedPropertyId(updatedProp.id);
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === updatedProp.id ? updatedProp : p));
      persistPropertiesCache(updated);
      return updated;
    });
    savePropertyToDb(updatedProp).catch(err => console.error('[Firebase] Error updating property:', err));
  };

  const handleDeleteProperty = (id: string) => {
    recordDeletedPropertyId(id);
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persistPropertiesCache(updated);
      return updated;
    });
    setComparisonList((prev) => prev.filter((p) => p.id !== id));
    setFavoriteIds((prev) => prev.filter((item) => item !== id));
    if (selectedProperty?.id === id) setSelectedProperty(null);
    deletePropertyFromDb(id).catch(err => console.error('[Firebase] Error deleting property:', err));
  };

  const handleClearAllProperties = async () => {
    // 1. Immediately reset UI state and local cache
    setProperties([]);
    setComparisonList([]);
    setFavoriteIds([]);
    setSelectedProperty(null);
    clearPropertiesCache();
    // 2. Clear all docs from Cloud Firestore
    try {
      await clearAllPropertiesFromDb();
      console.log('[Firebase] Cleared all properties from Cloud Firestore successfully');
    } catch (err) {
      console.error('[Firebase] Error clearing all properties:', err);
    }
  };

  const handleRestoreDemoProperties = async () => {
    clearDeletedPropertyIds();
    try {
      await seedPropertiesToDb(ALL_HADABA_PROPERTIES);
      setProperties(ALL_HADABA_PROPERTIES);
      persistPropertiesCache(ALL_HADABA_PROPERTIES);
    } catch (err) {
      console.error('[Firebase] Error restoring demo properties:', err);
    }
  };

  // Excel Bulk Import Handler
  const handleImportProperties = (importedProps: Property[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      clearAllPropertiesFromDb()
        .then(() => seedPropertiesToDb(importedProps))
        .catch(err => console.error('[Firebase] Error replacing properties:', err));
      setProperties(importedProps);
      persistPropertiesCache(importedProps);
    } else {
      setProperties((prev) => {
        const existingMap: Record<string, Property> = {};
        prev.forEach((p) => {
          existingMap[p.code.toLowerCase().trim()] = p;
        });

        const freshList: Property[] = [];

        importedProps.forEach((imported) => {
          const key = imported.code.toLowerCase().trim();
          const existingItem = existingMap[key];
          if (existingItem) {
            existingMap[key] = { ...existingItem, ...imported };
          } else {
            freshList.push(imported);
          }
        });

        const combined = [...freshList, ...Object.values(existingMap)];
        seedPropertiesToDb(combined).catch(err => console.error(err));
        persistPropertiesCache(combined);
        return combined;
      });
    }
  };

  // Owner Submission Actions
  const handleAddSubmission = (submission: OwnerSubmission) => {
    setOwnerSubmissions((prev) => [submission, ...prev]);
    saveOwnerSubmissionToDb(submission).catch(err => console.error('[Firebase] Error saving submission:', err));
  };

  const handleUpdateSubmission = (updatedSubmission: OwnerSubmission) => {
    setOwnerSubmissions((prev) =>
      prev.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s))
    );
    saveOwnerSubmissionToDb(updatedSubmission).catch(err => console.error('[Firebase] Error updating submission:', err));
  };

  const handleDeleteSubmission = (submissionId: string) => {
    setOwnerSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
  };

  const handleApproveSubmission = (submissionIdOrSub: string | OwnerSubmission) => {
    let sub: OwnerSubmission | undefined;
    if (typeof submissionIdOrSub === 'string') {
      sub = ownerSubmissions.find((s) => s.id === submissionIdOrSub);
    } else {
      sub = submissionIdOrSub;
    }
    if (!sub) return;

    // Create a live property from submission using latest edited attributes
    const newProperty: Property = {
      id: `prop-${Date.now()}`,
      code: `SEBA-HW-${Math.floor(100 + Math.random() * 900)}`,
      title: `شقة ${sub.area}م² بالهضبة الوسطى (${sub.neighborhood}) - ${sub.finishing === 'finished' ? 'متشطبة سوبر لوكس' : 'نصف تشطيب'}`,
      neighborhood: sub.neighborhood,
      propertyType: sub.unitType || 'apartment',
      propertyTypeLabel: 'شقة سكنية',
      finishing: sub.finishing,
      finishingLabel: sub.finishing === 'finished' ? 'متشطبة بالكامل (سوبر لوكس)' : 'نصف تشطيب (محارة وحلوق)',
      price: sub.askingPrice,
      pricePerMeter: Math.round(sub.askingPrice / (sub.area || 1)),
      area: sub.area,
      bedrooms: sub.bedrooms,
      bathrooms: sub.bathrooms,
      floor: sub.floor,
      view: 'إطلالة مفتوحة على الشارع الرئيسي',
      deliveryDate: 'استلام فوري',
      paymentMethod: sub.paymentMethod || 'cash',
      images: sub.images || [],
      ownerEmail: sub.ownerEmail,
      brokerId: sub.brokerId,
      videoUrl: sub.videoUrl,
      features: [
        'معاينة فورية واستلام فوري',
        'حصة في الأرض ورخصة قانونية',
        'عداد كهرباء ومياه راكب',
        'موقع متميز بالهضبة الوسطى'
      ],
      description: sub.unitDescription || `شقة مميزة مساحة ${sub.area} متر مربع بالهضبة الوسطى ${sub.neighborhood}، ${sub.bedrooms} غرف نوم و${sub.bathrooms} حمام، ${sub.finishing === 'finished' ? 'تشطيب سوبر لوكس' : 'نصف تشطيب'}.`,
      location: sub.exactLocation || sub.neighborhood,
      note: sub.viewingSchedule ? `مواعيد المعاينة: ${sub.viewingSchedule}` : undefined,
      isFeatured: true,
      hasElevator: true,
      hasGarage: true,
      registeredContract: true,
      ownerName: (sub as any).realOwnerName || sub.ownerName,
      ownerPhone: (sub as any).realOwnerPhone || sub.phone,
      createdAt: new Date().toISOString().split('T')[0],
      clicks: { whatsapp: 0, call: 0, views: 0, favorites: 0 }
    };

    setProperties((prev) => {
      const updated = [newProperty, ...prev];
      persistPropertiesCache(updated);
      return updated;
    });
    savePropertyToDb(newProperty).catch(err => console.error(err));
    // ربط الوحدة بحساب المالك في البوابة
    if (sub.ownerEmail && !sub.brokerId) linkPropertyToOwner(sub.ownerEmail, newProperty.code).catch(err => console.error(err));

    const approvedSub = { ...sub, status: 'approved' as const };
    setOwnerSubmissions((prev) =>
      prev.map((s) => (s.id === sub!.id ? approvedSub : s))
    );
    saveOwnerSubmissionToDb(approvedSub).catch(err => console.error(err));
  };

  const handleRejectSubmission = (submissionId: string) => {
    setOwnerSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, status: 'rejected' } : s))
    );
  };

  // Filtered Properties Computation
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      if (!prop) return false;

      // 1. Listing Category (Resale vs Off-Plan)
      if (filter.category && filter.category !== 'all') {
        const propCat = prop.category || 'resale';
        if (propCat !== filter.category) return false;
      }

      // 2. Off-Plan Sub-Type (Standalone Building vs Compound)
      if (filter.offPlanType && filter.offPlanType !== 'all') {
        if (prop.category === 'off_plan' && prop.offPlanType !== filter.offPlanType) {
          return false;
        }
      }

      // 3. Text Search (Search in title, code, neighborhood, desc, project name, developer)
      if (filter.search?.trim()) {
        const q = filter.search.toLowerCase();
        const matchesTitle = prop.title?.toLowerCase().includes(q);
        const matchesCode = prop.code?.toLowerCase().includes(q);
        const matchesNeighborhood = prop.neighborhood?.toLowerCase().includes(q);
        const matchesDesc = prop.description?.toLowerCase().includes(q);
        const matchesProject = prop.projectName?.toLowerCase().includes(q);
        const matchesDev = prop.developerName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesNeighborhood && !matchesDesc && !matchesProject && !matchesDev) {
          return false;
        }
      }

      // 4. Neighborhood (applied to resale)
      if (filter.category !== 'off_plan' && filter.neighborhood && filter.neighborhood !== 'all' && prop.neighborhood !== filter.neighborhood) {
        return false;
      }

      // 5. Finishing (Finished vs Semi-finished)
      if (filter.finishing && filter.finishing !== 'all' && prop.finishing !== filter.finishing) {
        return false;
      }

      // 6. Bedrooms (2, 3, 4+)
      if (filter.bedrooms && filter.bedrooms !== 'all') {
        if (filter.bedrooms === '2' && prop.bedrooms !== 2) return false;
        if (filter.bedrooms === '3' && prop.bedrooms !== 3) return false;
        if (filter.bedrooms === '4+' && (prop.bedrooms || 0) < 4) return false;
      }

      // 7. Price & Budget Range Matching
      const effectiveMinPrice = prop.availableUnits && prop.availableUnits.length > 0
        ? Math.min(...prop.availableUnits.map(u => u.price))
        : (prop.price || 0);
      const effectiveMaxPrice = prop.availableUnits && prop.availableUnits.length > 0
        ? Math.max(...prop.availableUnits.map(u => u.price))
        : (prop.price || 0);

      if (filter.budgetRange && filter.budgetRange !== 'all') {
        switch (filter.budgetRange) {
          case 'under_2m':
            // اقل من 2,000,000
            if (effectiveMinPrice >= 2000000) return false;
            break;
          case '2.2m_2.4m':
            // 2,200,000 إلى 2,400,000
            if (effectiveMaxPrice < 2000000 || effectiveMinPrice > 2400000) return false;
            break;
          case '2.5m_2.7m':
            // 2,500,000 إلى 2,700,000
            if (effectiveMaxPrice < 2400000 || effectiveMinPrice > 2750000) return false;
            break;
          case '2.8m_3.2m':
            // 2,800,000 إلى 3,200,000
            if (effectiveMaxPrice < 2750000 || effectiveMinPrice > 3200000) return false;
            break;
          case '3.2m_3.8m':
            // 3,200,000 إلى 3,800,000
            if (effectiveMaxPrice < 3200000 || effectiveMinPrice > 3900000) return false;
            break;
          case '4m_plus':
            // 4,000,000 والمزيد
            if (effectiveMaxPrice < 3900000) return false;
            break;
        }
      } else {
        if (effectiveMinPrice && filter.maxPrice < 8000000 && effectiveMinPrice > filter.maxPrice) {
          return false;
        }
        if (effectiveMaxPrice && filter.minPrice > 0 && effectiveMaxPrice < filter.minPrice) {
          return false;
        }
      }

      // 8. Area Range
      if (prop.category === 'off_plan' && prop.availableUnits && prop.availableUnits.length > 0) {
        const hasMatchingUnitArea = prop.availableUnits.some(
          u => u.area >= filter.minArea && u.area <= filter.maxArea
        );
        if (!hasMatchingUnitArea) return false;
      } else if (prop.area && (prop.area > filter.maxArea || prop.area < filter.minArea)) {
        return false;
      }

      // 9. Floor
      if (filter.floor && filter.floor !== 'all' && !prop.floor?.includes(filter.floor)) {
        return false;
      }

      // 10. Facilities
      if (filter.hasGarageOnly && !prop.hasGarage) return false;
      if (filter.hasElevatorOnly && !prop.hasElevator) return false;
      if (filter.registeredOnly && !prop.registeredContract) return false;

      // 11. Off-Plan Specific Sliders & Filters
      if (filter.category === 'off_plan') {
        const propDp = prop.downPaymentPercentage ?? (prop.offPlanType === 'compound' ? 10 : 35);
        const propYears = prop.installmentYears ?? (prop.offPlanType === 'compound' ? 10 : 3);
        const propDeliveryYear = Number(prop.deliveryYear) || (prop.offPlanType === 'compound' ? 2028 : 2026);

        // Exact button downPayment selection (if specific button is active)
        if (filter.downPayment && filter.downPayment !== 'all') {
          if (propDp !== Number(filter.downPayment)) return false;
        } else if (filter.downPaymentPercentMax !== undefined) {
          if (propDp > filter.downPaymentPercentMax) return false;
        }

        // Exact button installmentYears selection (if specific button is active)
        if (filter.installmentYears && filter.installmentYears !== 'all') {
          if (propYears !== Number(filter.installmentYears)) return false;
        } else if (filter.installmentYearsMax !== undefined) {
          if (propYears > filter.installmentYearsMax) return false;
        }

        // Delivery year slider (Max Delivery Year)
        if (filter.deliveryYearMax !== undefined) {
          if (propDeliveryYear > filter.deliveryYearMax) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filter.sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (filter.sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (filter.sortBy === 'area_desc') return (b.area || 0) - (a.area || 0);
      if (filter.sortBy === 'most_viewed') {
        return ((b.clicks?.views || 0) + (b.clicks?.whatsapp || 0)) - ((a.clicks?.views || 0) + (a.clicks?.whatsapp || 0));
      }
      // default: featured first
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [properties, filter]);
  const districtStats = useMemo(() => computeDistrictStats(HADABA_WOSTA_NEIGHBORHOODS as unknown as string[], properties), [properties]);

  // Favorites list computation
  const favoriteProperties = useMemo(() => {
    return properties.filter((p) => favoriteIds.includes(p.id));
  }, [properties, favoriteIds]);

  // Initial visible cards count (3 cards, then Load More)
  const [visibleCount, setVisibleCount] = useState<number>(3);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(3);
  }, [filter]);

  const displayedProperties = useMemo(() => {
    return filteredProperties.slice(0, visibleCount);
  }, [filteredProperties, visibleCount]);

  // Robust finder by code, ID, or sanitized code across active properties
  const findPropertyByCode = (codeStr: string | null) => {
    if (!codeStr) return null;
    const cleanTarget = codeStr.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    return properties.find(p => {
      if (!p) return false;
      const cleanCode = p.code ? p.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
      const cleanId = p.id ? p.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
      return cleanCode === cleanTarget || 
             cleanId === cleanTarget ||
             (p.code && p.code.toLowerCase() === codeStr.toLowerCase()) || 
             p.id === codeStr ||
             (cleanTarget.length >= 2 && cleanCode.includes(cleanTarget)) ||
             (cleanTarget.length >= 2 && cleanId.includes(cleanTarget));
    }) || null;
  };

  // White-Label Showcase mode for direct client visits from Sales WhatsApp/Links
  const showcaseProperty = useMemo(() => {
    if (!showcasePropertyCode) return null;
    return findPropertyByCode(showcasePropertyCode);
  }, [properties, showcasePropertyCode]);

  const showcaseAgent = useMemo(() => {
    if (!showcaseAgentId) return currentAgent;
    return salesAgents.find(a => a.id === showcaseAgentId) || currentAgent;
  }, [salesAgents, showcaseAgentId, currentAgent]);

  if (showcaseProperty) {
    return (
      <ClientShowcaseView
        property={showcaseProperty}
        agent={showcaseAgent}
        onClose={() => {
          window.history.pushState({}, '', window.location.pathname);
          setShowcasePropertyCode(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-slate-900 flex flex-col selection:bg-amber-600 selection:text-white">
      
      {/* 1. Header & Navigation */}
      <Navbar
        selectedNeighborhood={filter.neighborhood}
        onNeighborhoodSelect={(n) => setFilter({ ...filter, neighborhood: n })}
        selectedFinishing={filter.finishing}
        onFinishingSelect={(f) => setFilter({ ...filter, finishing: f })}
        favoritesCount={favoriteIds.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        comparisonCount={comparisonList.length}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenResaleSubmit={() => setIsResaleSubmitOpen(true)}
        onOpenGuide={() => setIsDistrictGuideOpen(true)}
        onOpenPriceMap={() => setIsPriceMapOpen(true)}
        onOpenValuation={() => setIsValuationOpen(true)}
        myPortalLabel={myPortalLabel}
        onLogout={() => { setStaffAccess(null); setActivePortal(null); handleAdminLogout(); handleSalesLogout(); }}
        onOpenMyPortal={myPortalLabel ? openMyPortal : undefined}
        onOpenClosedDeals={() => {
          const el = document.getElementById('closed-deals-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectOffPlan={() => {
          setFilter({ ...filter, category: 'off_plan' });
        }}
        onSelectResale={() => {
          setFilter({ ...filter, category: 'resale' });
        }}
        onOpenAdmin={() => {
          if (isAdminLoggedIn) {
            setIsAdminDashboardOpen(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
        onOpenCrm={() => {
          // الأدمن وأونر الشركة بيدخلوا على طول ويشوفوا كل الفريق
          if (isAdminLoggedIn || isSalesLoggedIn || staffAccess?.role === 'company_owner') setIsCrmOpen(true);
          else setIsSalesLoginOpen(true);
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        pendingSubmissionsCount={ownerSubmissions.filter(s => s.status === 'pending').length}
        isSalesLoggedIn={isSalesLoggedIn}
        currentSalesAgentName={currentAgent?.name}
        onOpenSalesLogin={() => setIsSalesLoginOpen(true)}
        isDbConnected={isDbConnected}
        onLogoutAdmin={handleAdminLogout}
        onLogoutSales={handleSalesLogout}
        clientProfile={clientProfile}
        clientUnreadCount={clientUnreadCount}
        onOpenClientNotifications={() => setIsClientNotificationsOpen(true)}
        onOpenClientAuth={() => setIsClientAuthOpen(true)}
        onLogoutClient={handleLogoutClient}
        onOpenSalesNotifications={() => setIsSalesNotificationsOpen(true)}
        salesAlertsCount={salesAlertsCount}
        customLogoUrl={customLogoUrl}
      />

      {/* 2. Hero Section */}
      <div className="space-y-6">
        <HeroSection
          totalPropertiesCount={properties.length}
          filteredCount={filteredProperties.length}
          bannerPhotoUrl={bannerPhotoUrl}
          onSearchClick={() => {
            const el = document.getElementById('properties-grid');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 3-Doors Quick Selector (شراء / بيع / خريطة الأسعار) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <HeroDoorSelector
            onSelectBuy={() => {
              const el = document.getElementById('properties-grid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onSelectSell={() => setIsResaleSubmitOpen(true)}
            onSelectPriceMap={() => document.getElementById('districts-guide-section')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </div>
      </div>

      {/* Budget Discovery Section (ميزانيتك تجيب إيه في الهضبة؟) */}
      <BudgetDiscoverySection
        properties={properties}
        currentMaxPrice={filter.maxPrice}
        onSelectBudgetAndDistrict={(neighborhood, budget, finishing, category, bedrooms, downPayment) => {
          setFilter({
            ...filter,
            neighborhood,
            maxPrice: budget,
            category: category || 'all',
            finishing: finishing || 'all',
            bedrooms: (bedrooms as 'all' | '2' | '3' | '4+') || 'all',
            downPayment: downPayment ? String(downPayment) : 'all'
          });
          const el = document.getElementById('properties-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectBudgetRange={(min, max) => {
          setFilter({ ...filter, minPrice: min, maxPrice: max });
          const el = document.getElementById('properties-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectProperty={(prop) => {
          setSelectedProperty(prop);
        }}
      />

      {/* Dual Interactive Feature Promo Banners (خريطة الأسعار وحاسبة التقييم) */}
      <DualPromoBanners
        onOpenPriceMap={() => setIsPriceMapOpen(true)}
        onOpenValuation={() => setIsValuationOpen(true)}
      />

      {/* 3. Main Catalog Section */}
      <main id="properties-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 w-full space-y-6">
        
        {/* Firestore Quota Notice Banner (if active) */}
        {isQuotaExceeded && !isQuotaBannerDismissed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/60 text-amber-800 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-stone-900">
                  تنبيه سعة القراءة اليومية المجانية لـ Firestore (يعمل المعرض الآن بالذاكرة التخزينية الفائقة)
                </p>
                <p className="text-stone-600 leading-relaxed">
                  تم الوصول للحد المجاني اليومي لقراءات قاعدة البيانات. يتم إعادة التعيين تلقائياً غداً، أو يمكنك ترقية خطة المشروع للمتابعة الفورية.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <a
                href="https://console.firebase.google.com/project/enduring-sylph-040ks/firestore/databases/ai-studio-lionrealestate-92184113-996b-4f23-8983-d050baebe159/data?openUpgradeDialog=true"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#A07A26] hover:bg-[#8A671F] text-white rounded-lg font-bold text-[11px] transition-colors"
              >
                ترقية الحساب في Firebase
              </a>
              <button
                onClick={() => setIsQuotaBannerDismissed(true)}
                className="px-2.5 py-1.5 text-stone-600 hover:text-stone-900 font-medium text-[11px] hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Catalog Section Header from Screenshot 1 */}
        <div className="flex flex-row items-end justify-between gap-4 pt-4 pb-2 border-b border-[#ECE8DF]">
          <div className="text-right space-y-1">
            <span className="text-xs text-[#6B665C] block">
              اتضافت الأسبوع ده بعد المعاينة
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#141414] font-readex">
              أحدث الوحدات
            </h2>
          </div>

          <div className="text-left">
            <button
              onClick={() => setFilter(INITIAL_FILTER)}
              className="text-xs sm:text-sm font-semibold text-[#141414] hover:text-[#A07A26] pb-1 border-b-2 border-[#141414] transition-colors cursor-pointer"
            >
              كل الـ {filteredProperties.length} وحدة
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white border border-[#ECE8DF] p-8 rounded-3xl shadow-xs">
            <div className="w-14 h-14 border border-[#ECE8DF] text-[#A07A26] flex items-center justify-center mx-auto bg-[#F6F4EF] rounded-2xl">
              <Building2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#141414]">المعرض فارغ حالياً - بانتظار رفع شيت الإكسيل الجديد</h3>
              <p className="text-xs text-[#6B665C] max-w-md mx-auto leading-relaxed">
                تم مسح وتفريغ كافة الشقق من قاعدة البيانات بنجاح. يمكنك الدخول للوحة التحكم أو استخدام زر الاستيراد السريع لرفع ملف الـ Excel الجديد.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => setIsExcelImportOpen(true)}
                className="py-2.5 px-6 bg-[#A07A26] hover:bg-[#8A671F] text-white text-xs font-bold transition-all rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>استيراد شيت إكسيل الآن</span>
              </button>
              <button
                onClick={() => {
                  if (isAdminLoggedIn) {
                    setIsAdminDashboardOpen(true);
                  } else {
                    setIsAdminLoginOpen(true);
                  }
                }}
                className="py-2.5 px-5 bg-[#141414] hover:bg-black text-white text-xs font-bold transition-all rounded-xl shadow-xs cursor-pointer"
              >
                الدخول للوحة التحكم
              </button>
            </div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white border border-[#ECE8DF] p-8 rounded-3xl shadow-xs">
            <div className="w-12 h-12 border border-[#ECE8DF] text-[#A07A26] flex items-center justify-center mx-auto bg-[#F6F4EF] rounded-2xl">
              <ListFilter size={20} />
            </div>
            <h3 className="text-base font-bold text-[#141414]">لا توجد شقق مطابقة تماماً لمعايير البحث الحالية</h3>
            <p className="text-xs text-[#6B665C] max-w-md mx-auto leading-relaxed">
              يمكنك توسيع نطاق السعر أو اختيار "جميع الأحياء" و "جميع أنواع التشطيب" لعرض كافة الخيارات المتاحة.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setFilter(INITIAL_FILTER)}
                className="py-2.5 px-6 bg-[#A07A26] hover:bg-[#8A671F] text-white text-xs font-bold transition-all rounded-xl shadow-xs"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProperties.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  onSelect={(p) => {
                    setDetailModalInitialMedia('photos');
                    setSelectedProperty(p);
                  }}
                  onSelectVideo={(p) => {
                    setDetailModalInitialMedia('video');
                    setSelectedProperty(p);
                  }}
                  isFavorite={favoriteIds.includes(prop.id)}
                  onToggleFavorite={toggleFavorite}
                  isInComparison={comparisonList.some((c) => c.id === prop.id)}
                  onToggleComparison={toggleComparison}
                  onTrackClick={handleTrackClick}
                  layoutMode={cardLayout}
                  onEditProperty={isAdminLoggedIn ? handleDirectEditProperty : undefined}
                  onOpenSalesToolkit={(isAdminLoggedIn || isSalesLoggedIn) ? ((p) => setSalesToolkitProperty(p)) : undefined}
                />
              ))}
            </div>

            {/* Load More Button (3 cards initially, then Load More) */}
            {visibleCount < filteredProperties.length && (
              <div className="pt-4 pb-6 text-center flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 3)}
                  className="px-8 py-3.5 bg-[#141414] hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-3 active:scale-98 cursor-pointer"
                >
                  <span>المزيد من الشقق</span>
                  <ChevronDown size={15} className="text-[#D9B864]" />
                  <span className="text-[11px] font-mono text-[#D9B864]">
                    ({filteredProperties.length - visibleCount})
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recently Closed Deals Section (صفقات حقيقية اتقفلت) */}
        <OwnerPortalPromo onSubmit={() => setIsResaleSubmitOpen(true)} onLogin={() => setIsClientAuthOpen(true)} />
        <RecentlyClosedDealsSection
          closedDeals={closedDeals}
          onSelectNeighborhood={(n) => {
            setFilter({ ...filter, neighborhood: n });
            const el = document.getElementById('properties-grid');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenResaleSubmit={() => setIsResaleSubmitOpen(true)}
        />

        {/* WhatsApp Real-time Alert Banner (مش لاقي اللي عايزه؟) */}
        <InstantWhatsAppAlertBanner
          onSelectAlerts={() => setIsClientAuthOpen(true)}
        />

        {/* Dark "دليل الأحياء" Section */}
        <DistrictGuideSection stats={districtStats} content={districtContent} onOpen={(n) => setOpenDistrict(n)} />

      </main>

      {/* 4. Footer & "اعرض شقتك للبيع" Banner */}
      <Footer
        onSelectNeighborhood={(n) => {
          setFilter({ ...filter, neighborhood: n });
          const el = document.getElementById('properties-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenResaleSubmit={() => setIsResaleSubmitOpen(true)}
        onOpenAdminLogin={() => {
          if (isAdminLoggedIn) {
            setIsAdminDashboardOpen(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
        onOpenDistrictGuide={() => setIsDistrictGuideOpen(true)}
        customLogoUrl={customLogoUrl}
        footerConfig={footerConfig}
      />

      {/* Modals */}
      
      {/* 1. Property Details Modal (5 photos gallery & tracking) */}
      <PropertyDetailModal
        property={selectedProperty}
        initialMediaMode={detailModalInitialMedia}
        onClose={() => setSelectedProperty(null)}
        isFavorite={selectedProperty ? favoriteIds.includes(selectedProperty.id) : false}
        onToggleFavorite={toggleFavorite}
        isInComparison={selectedProperty ? comparisonList.some((c) => c.id === selectedProperty.id) : false}
        onToggleComparison={toggleComparison}
        onTrackClick={handleTrackClick}
        onEditProperty={isAdminLoggedIn ? handleDirectEditProperty : undefined}
        onOpenSalesToolkit={(isAdminLoggedIn || isSalesLoggedIn) ? ((p) => setSalesToolkitProperty(p)) : undefined}
        onRequestViewing={handleRequestViewing}
      />

      {/* 2. Resale Submission Modal (5 photos upload for owners) */}
      <ResaleSubmissionModal
        isOpen={isResaleSubmitOpen}
        onClose={() => setIsResaleSubmitOpen(false)}
        onSubmit={handleAddSubmission}
      />

      {/* 3. Comparison Modal */}
      <PropertyComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        properties={comparisonList}
        onRemove={(id) => setComparisonList((prev) => prev.filter((p) => p.id !== id))}
        onSelectProperty={(p) => setSelectedProperty(p)}
        onClearAll={() => setComparisonList([])}
      />

      {/* 4. Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favoriteProperties}
        onRemoveFavorite={toggleFavorite}
        onSelectProperty={(p) => setSelectedProperty(p)}
        onClearAll={() => setFavoriteIds([])}
      />

      {/* 5. District Guide Modal (Visual Photo Stories & Editable) */}
      <DistrictGuideModal
        isOpen={isDistrictGuideOpen}
        onClose={() => setIsDistrictGuideOpen(false)}
        properties={properties}
        onSelectDistrict={(district) => { setFilter({ ...filter, neighborhood: district }); setIsDistrictGuideOpen(false); setTimeout(() => document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth' }), 80); }}
        isAdmin={isAdminLoggedIn}
      />

      {/* 6. Admin Login Modal (Protected by Email & Password) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => {
          handleAdminLogin(true);
          setIsAdminLoginOpen(false);
          setIsAdminDashboardOpen(true);
        }}
        onSalesLoginSuccess={(agent) => {
          handleSalesLoginSuccess(agent);
          setIsAdminLoginOpen(false);
        }}
        salesAgents={salesAgents}
        adminCredentials={adminCredentials}
        onPortalLogin={(acc) => {
          setStaffAccess(acc);
          setIsAdminLoginOpen(false);
          setActivePortal(acc.role === 'owner' ? 'owner' : acc.role === 'broker' ? 'broker' : acc.role === 'company_owner' ? 'company' : acc.role === 'marketing' ? 'marketing' : 'coordinator');
        }}
      />

      {/* 7. Full Admin Dashboard (Add/Edit/Delete Properties with 5 photos, Review Owner Submissions, Track Clicks) */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        properties={properties}
        onAddProperty={handleAddProperty}
        onUpdateProperty={handleUpdateProperty}
        onDeleteProperty={handleDeleteProperty}
        onImportProperties={handleImportProperties}
        ownerSubmissions={ownerSubmissions}
        onApproveSubmission={handleApproveSubmission}
        onRejectSubmission={handleRejectSubmission}
        onUpdateSubmission={handleUpdateSubmission}
        onDeleteSubmission={handleDeleteSubmission}
        onLogout={handleAdminLogout}
        adminCredentials={adminCredentials}
        onUpdateCredentials={handleUpdateAdminCredentials}
        bannerPhotoUrl={bannerPhotoUrl}
        onUpdateBannerPhoto={handleUpdateBannerPhoto}
        onResetBannerPhoto={handleResetBannerPhoto}
        customLogoUrl={customLogoUrl}
        onUpdateLogo={handleUpdateLogoPhoto}
        onResetLogo={handleResetLogoPhoto}
        footerConfig={footerConfig}
        onUpdateFooterConfig={handleUpdateFooterConfig}
        onResetFooterConfig={handleResetFooterConfig}
        initialEditingProperty={editingProperty}
        onClearInitialEditingProperty={() => setEditingProperty(null)}
        salesAgents={salesAgents}
        onUpdateSalesAgents={(updatedAgents) => {
          setSalesAgents(updatedAgents);
          seedSalesAgentsToDb(updatedAgents).catch(err => console.error(err));
        }}
        onOpenSalesSession={handleOpenSalesSessionFromAdmin}
        onClearAllProperties={handleClearAllProperties}
        onRestoreDemoProperties={handleRestoreDemoProperties}
        priceMapData={priceMapData}
        onUpdatePriceMapData={(data) => setPriceMapData(data)}
        closedDeals={closedDeals}
        onUpdateClosedDeals={(deals) => setClosedDeals(deals)}
        onOpenBrokerPortal={() => {
          setInspectingBrokerId(null);
          setIsAdminDashboardOpen(false);
          setIsBrokerPortalOpen(true);
        }}
        brokersList={brokersList}
        onUpdateBrokersList={handleUpdateBrokersList}
        onInspectBroker={(brokerId) => {
          setInspectingBrokerId(brokerId);
          setIsAdminDashboardOpen(false);
          setIsBrokerPortalOpen(true);
        }}
      />

      {/* Excel Import Modal (Accessible globally) */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        currentProperties={properties}
        onImportSuccess={handleImportProperties}
        onClearAllProperties={handleClearAllProperties}
        onRestoreDemoProperties={handleRestoreDemoProperties}
        adminPassword={adminCredentials.password}
      />

      {/* 8. Gamified Sales CRM Modal */}
      <SalesCrmModal
        isOpen={isCrmOpen}
        onClose={() => setIsCrmOpen(false)}
        properties={properties}
        agents={salesAgents}
        leads={crmLeads}
        isAdmin={isAdminLoggedIn || staffAccess?.role === 'company_owner'}
        canEdit={isAdminLoggedIn || isSalesLoggedIn}
        onDeleteLead={(id) => setCrmLeads((prev) => prev.filter((l) => l.id !== id))}
        currentAgentId={currentSalesAgentId || undefined}
        onLogout={handleSalesLogout}
        onUpdateLead={handleUpdateLead}
        onAddLead={handleAddLead}
        onUpdateAgent={handleUpdateAgent}
        emergencyAlerts={emergencyAlerts}
        onSendEmergencyAlert={handleSendEmergencyAlert}
        onSelectProperty={(prop) => setSelectedProperty(prop)}
        onOpenAffiliateModal={(prop) => setSalesToolkitProperty(prop)}
      />

      {/* Sales Agent Email Login Modal */}
      <SalesLoginModal
        isOpen={isSalesLoginOpen}
        onClose={() => setIsSalesLoginOpen(false)}
        salesAgents={salesAgents}
        onSelectAgent={(agentId) => {
          const agent = salesAgents.find(a => a.id === agentId);
          if (agent) handleSalesLoginSuccess(agent);
        }}
        onLoginSuccess={handleSalesLoginSuccess}
        onOpenAdminLogin={() => {
          setIsSalesLoginOpen(false);
          setIsAdminLoginOpen(true);
        }}
      />

      {/* 10. Sales Affiliate & Sarah WhatsApp Coordination Modal */}
      {salesToolkitProperty && (
        <SalesAffiliateModal
          isOpen={!!salesToolkitProperty}
          onClose={() => setSalesToolkitProperty(null)}
          property={salesToolkitProperty}
          currentAgent={currentAgent}
          onRecordAction={handleRecordAgentAction}
          onAddLead={handleAddLead}
          customLogoUrl={customLogoUrl}
          bannerPhotoUrl={bannerPhotoUrl}
          onOpenAdmin={() => {
            if (isAdminLoggedIn) {
              setIsAdminDashboardOpen(true);
            } else {
              setIsAdminLoginOpen(true);
            }
          }}
          onOpenCrm={() => setIsCrmOpen(true)}
          onOpenSalesLogin={() => {
            setSalesToolkitProperty(null);
            setIsSalesLoginOpen(true);
          }}
        />
      )}

      {/* 11. Client Registration & Preferences Modal (Smart Unified Login) */}
      {activePortal === 'owner' && staffAccess && (
        <PartnerPortal mode="owner" access={staffAccess} properties={properties} logoUrl={customLogoUrl}
          onClose={() => setActivePortal(null)} onLogout={() => { signOutToGuest().catch(() => {}); setActivePortal(null); setStaffAccess(null); }}
          onAddUnit={() => { setActivePortal(null); setIsResaleSubmitOpen(true); }} />
      )}
      {activePortal === 'broker' && staffAccess && (
        <PartnerPortal mode="broker" access={staffAccess} properties={properties} logoUrl={customLogoUrl}
          onClose={() => setActivePortal(null)} onLogout={() => { signOutToGuest().catch(() => {}); setActivePortal(null); setStaffAccess(null); }}
          onAddUnit={() => { setActivePortal(null); setIsResaleSubmitOpen(true); }} />
      )}
      {activePortal === 'marketing' && staffAccess && (
        <MarketingPanel access={staffAccess} agents={salesAgents} logoUrl={customLogoUrl}
          onClose={() => setActivePortal(null)}
          onLogout={() => { signOutToGuest().catch(() => {}); setActivePortal(null); setStaffAccess(null); }} />
      )}
      {activePortal === 'company' && staffAccess && (
        <CompanyOwnerPanel access={staffAccess} properties={properties} leads={crmLeads} agents={salesAgents} submissions={ownerSubmissions} logoUrl={customLogoUrl}
          onClose={() => setActivePortal(null)}
          onLogout={() => { signOutToGuest().catch(() => {}); setActivePortal(null); setStaffAccess(null); }}
          onAddUnit={() => { setActivePortal(null); setIsResaleSubmitOpen(true); }}
          onOpenCrm={() => { setActivePortal(null); setIsCrmOpen(true); }} />
      )}
      {activePortal === 'coordinator' && staffAccess && (
        <CoordinatorPanel name={staffAccess.name || ''} isAdmin={staffAccess.role === 'admin'} properties={properties} submissions={ownerSubmissions} logoUrl={customLogoUrl}
          onApproveSubmission={(s) => handleApproveSubmission(s)} onRejectSubmission={handleRejectSubmission}
          onClose={() => setActivePortal(null)} onLogout={() => { signOutToGuest().catch(() => {}); setActivePortal(null); setStaffAccess(null); }} />
      )}
      {openDistrict && (
        <DistrictPage name={openDistrict} stats={districtStats} content={districtContent[openDistrict]} properties={properties} isAdmin={isAdminLoggedIn}
          onClose={() => setOpenDistrict(null)}
          onOpenDistrict={(n) => setOpenDistrict(n)}
          onOpenProperty={(p) => { setOpenDistrict(null); setSelectedProperty(p); }}
          onShowUnits={(n) => { setOpenDistrict(null); setFilter({ ...filter, category: 'all', neighborhood: n }); setTimeout(() => document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth' }), 80); }} />
      )}
      <SmartFilterDock filter={filter} setFilter={setFilter} properties={properties} neighborhoods={HADABA_WOSTA_NEIGHBORHOODS as unknown as string[]} resultCount={filteredProperties.length} />
      <SalesFeedbackInbox isOpen={activePortal === 'sales_feedback'} onClose={() => setActivePortal(null)} agentId={currentSalesAgentId} isAdmin={isAdminLoggedIn} />
      {offerId && <OfferPublicPage offerId={offerId} onClose={() => { setOfferId(null); try { window.history.replaceState({}, '', '/'); } catch { /* */ } }} />}
      {showFieldFeedback && feedbackTripId && <FieldFeedbackPage tripId={feedbackTripId} onClose={() => { setShowFieldFeedback(false); try { window.history.replaceState({}, '', '/'); } catch { /* */ } }} />}

      <ClientAuthModal
        isOpen={isClientAuthOpen}
        onClose={() => setIsClientAuthOpen(false)}
        currentClient={clientProfile}
        onSaveClient={handleSaveClientProfile}
        onLoginAdminSuccess={() => {
          handleAdminLogin(true);
          setIsClientAuthOpen(false);
          setIsAdminDashboardOpen(true);
        }}
        onLoginSalesSuccess={(agent) => {
          handleSalesLoginSuccess(agent);
          setIsClientAuthOpen(false);
        }}
        onPortalLogin={(acc) => {
          setStaffAccess(acc);
          setIsClientAuthOpen(false);
          setActivePortal(acc.role === 'owner' ? 'owner' : acc.role === 'broker' ? 'broker' : acc.role === 'company_owner' ? 'company' : acc.role === 'marketing' ? 'marketing' : 'coordinator');
        }}
        salesAgents={salesAgents}
        adminCredentials={adminCredentials}
      />

      {/* 12. Client Notification Center Modal */}
      <ClientNotificationModal
        isOpen={isClientNotificationsOpen}
        onClose={() => setIsClientNotificationsOpen(false)}
        notifications={clientNotifications}
        client={clientProfile}
        onSelectPropertyByCode={handleSelectPropertyByCode}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onOpenPreferences={() => {
          setIsClientNotificationsOpen(false);
          setIsClientAuthOpen(true);
        }}
      />

      {/* 13. Sales Follow-Ups & Notifications Modal */}
      <FollowUpNotificationsModal
        isOpen={isSalesNotificationsOpen}
        onClose={() => setIsSalesNotificationsOpen(false)}
        leads={crmLeads}
        agents={salesAgents}
        currentAgent={currentAgent}
        onUpdateLead={handleUpdateLead}
        onSelectLead={(lead) => {
          setIsSalesNotificationsOpen(false);
          setIsCrmOpen(true);
        }}
      />

      {/* 14. Neighborhood Price Heatmap & Market Index Modal */}
      <PriceHeatmapModal
        isOpen={isPriceMapOpen}
        onClose={() => setIsPriceMapOpen(false)}
        priceMapData={priceMapData}
        onSelectNeighborhoodFilter={(neighborhood, finishing) => {
          setFilter({ 
            ...filter, 
            category: 'resale', 
            neighborhood, 
            finishing: finishing || 'all' 
          });
          const el = document.getElementById('properties-grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 15. Property Valuation Calculator & Lead Gen Modal ("كام تستاهل شقتك؟") */}
      <PropertyValuationModal
        isOpen={isValuationOpen}
        onClose={() => setIsValuationOpen(false)}
        priceMapData={priceMapData}
        onRequestInspection={(data) => {
          showToast(`تم استلام طلب المعاينة لشقة ${data.area}م² بالحي ${data.neighborhood} بنجاح!`);
        }}
      />

      {/* 16. Mobile-First Broker Portal Modal (Matching Screenshots) */}
      <BrokerPortalModal
        isOpen={isBrokerPortalOpen}
        onClose={() => { setIsBrokerPortalOpen(false); setInspectingBrokerId(null); }}
        properties={properties}
        logoUrl={customLogoUrl}
        onAddUnit={() => { setIsBrokerPortalOpen(false); setIsResaleSubmitOpen(true); }}
        inspectBrokerId={inspectingBrokerId}
        onExitInspection={() => { setInspectingBrokerId(null); setIsBrokerPortalOpen(false); }}
      />

      {/* 17. Landlord & Partner Portals Modal (Pricing Index & Viewing Feedbacks) */}
      <PartnerPortalsModal
        isOpen={isPartnerPortalsOpen}
        onClose={() => setIsPartnerPortalsOpen(false)}
        properties={properties}
        logoUrl={customLogoUrl}
        onAddUnit={() => { setIsPartnerPortalsOpen(false); setIsResaleSubmitOpen(true); }}
      />

      {/* Floating Toast Notification for Immediate User Feedback */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/50 text-xs sm:text-sm font-bold flex items-center gap-2.5 backdrop-blur-md max-w-[90vw] text-center"
        >
          <ArrowLeftRight size={16} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Active Comparison Dock */}
      {comparisonList.length > 0 && (
        <aside 
          aria-label="قائمة مقارنة الشقق"
          className="fixed bottom-18 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 backdrop-blur-md text-white border border-amber-500/60 shadow-2xl rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-black text-[11px] sm:text-xs">
              {comparisonList.length}
            </span>
            <span className="text-xs font-bold text-stone-100 hidden sm:inline">
              شقق محددة للمقارنة
            </span>
          </div>

          <button
            onClick={() => setIsComparisonOpen(true)}
            className="px-3 sm:px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeftRight size={13} className="stroke-[2.5]" />
            <span>عرض جدول المقارنة</span>
          </button>

          <button
            onClick={() => setComparisonList([])}
            className="text-[11px] text-stone-400 hover:text-rose-400 px-1 py-1 transition-colors cursor-pointer"
            title="إلغاء المقارنة"
          >
            مسح
          </button>
        </aside>
      )}

      {/* Floating Quick Call Widget with Smart Inactivity Auto-Fade */}
      <aside
        aria-label="زر الاتصال السريع"
        onMouseEnter={() => setIsFloatingActive(true)}
        className={`fixed bottom-4 sm:bottom-6 left-3 sm:left-6 z-40 flex items-center gap-1.5 sm:gap-2 transition-all duration-500 ease-in-out ${
          isFloatingActive
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-25 hover:opacity-100 focus-within:opacity-100 scale-95 translate-y-1'
        }`}
      >
        {/* Direct Call Quick Action Button */}
        <a
          href={generateCallLink('01021242871')}
          className="w-10 h-10 sm:w-11 sm:h-11 bg-stone-900/90 hover:bg-stone-950 text-amber-400 hover:text-amber-300 rounded-full shadow-lg shadow-black/25 flex items-center justify-center transition-all active:scale-90 border border-stone-700/60 cursor-pointer"
          title="اتصال هاتفي مباشر: 01021242871"
        >
          <Phone size={17} className="stroke-[2.5]" />
        </a>
      </aside>

    </div>
  );
}
