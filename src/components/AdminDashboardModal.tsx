import React, { useState, useMemo } from 'react';
import { 
  Property, 
  OwnerSubmission, 
  HadabaWostaNeighborhood, 
  FinishingType, 
  PropertyType,
  SalesAgent,
  FooterConfig,
  NeighborhoodPriceMapData,
  ClosedDeal,
  BrokerProfile
} from '../types';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { INITIAL_SALES_AGENTS, INITIAL_BADGES, INITIAL_DAILY_QUESTS } from '../data/crmData';
import { INITIAL_PRICE_MAP_DATA, INITIAL_CLOSED_DEALS } from '../data/marketPriceData';
import { DEFAULT_BROKERS } from '../data/brokerData';
import { 
  X, 
  PlusCircle, 
  Building, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  Phone, 
  MessageCircle, 
  Eye, 
  Heart, 
  BarChart3, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  RefreshCw, 
  Layers, 
  Clock, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  TrendingUp,
  Search,
  Check,
  Smartphone,
  SlidersHorizontal,
  FolderDown,
  FileSpreadsheet,
  Download,
  Rocket,
  Users,
  UserPlus,
  Key,
  Mail,
  EyeOff,
  Copy,
  Flame,
  Award,
  Video as VideoIcon,
  Play,
  Film,
  Plus,
  FileText,
  Star,
  VolumeX,
  Volume2,
  MapPin,
  Calendar,
  Navigation,
  UserCheck,
  DollarSign,
  Compass
} from 'lucide-react';
import { formatPrice, formatNumber, generateWhatsAppLink, generateCallLink, compressImage } from '../utils/helpers';
import { uploadFile, uploadDataUrl } from '../services/mediaStorage';
import { AccountsManagerModal } from './AccountsManagerModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { LionLogo } from './LionLogo';
import { ExcelImportModal } from './ExcelImportModal';
import { downloadExcelTemplate, exportPropertiesToExcel } from '../utils/excelHelper';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { safeLocalStorageSet } from '../utils/storageHelper';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onAddProperty: (newProp: Property) => void;
  onUpdateProperty: (updatedProp: Property) => void;
  onDeleteProperty: (id: string) => void;
  onImportProperties?: (importedProps: Property[], mode: 'append' | 'replace') => void;
  ownerSubmissions: OwnerSubmission[];
  onApproveSubmission: (submissionIdOrSub: any) => void;
  onRejectSubmission: (id: string) => void;
  onUpdateSubmission?: (submission: OwnerSubmission) => void;
  onDeleteSubmission?: (id: string) => void;
  onLogout: () => void;
  adminCredentials?: { email: string; password: string };
  onUpdateCredentials?: (email: string, pass: string) => void;
  bannerPhotoUrl?: string;
  onUpdateBannerPhoto?: (url: string) => void;
  onResetBannerPhoto?: () => void;
  customLogoUrl?: string;
  onUpdateLogo?: (url: string) => void;
  onResetLogo?: () => void;
  footerConfig?: FooterConfig;
  onUpdateFooterConfig?: (config: FooterConfig) => void;
  onResetFooterConfig?: () => void;
  initialEditingProperty?: Property | null;
  onClearInitialEditingProperty?: () => void;
  salesAgents?: SalesAgent[];
  onUpdateSalesAgents?: (agents: SalesAgent[]) => void;
  onOpenSalesSession?: (agentId: string) => void;
  onClearAllProperties?: () => void;
  onRestoreDemoProperties?: () => void;
  priceMapData?: NeighborhoodPriceMapData[];
  onUpdatePriceMapData?: (data: NeighborhoodPriceMapData[]) => void;
  closedDeals?: ClosedDeal[];
  onUpdateClosedDeals?: (deals: ClosedDeal[]) => void;
  onOpenBrokerPortal?: () => void;
  brokersList?: BrokerProfile[];
  onUpdateBrokersList?: (brokers: BrokerProfile[]) => void;
  onInspectBroker?: (brokerId: string) => void;
}

const DEFAULT_ARCH_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
];

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  properties,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onImportProperties,
  ownerSubmissions,
  onApproveSubmission,
  onRejectSubmission,
  onLogout,
  adminCredentials,
  onUpdateCredentials,
  bannerPhotoUrl,
  onUpdateBannerPhoto,
  onResetBannerPhoto,
  customLogoUrl,
  onUpdateLogo,
  onResetLogo,
  footerConfig,
  onUpdateFooterConfig,
  onResetFooterConfig,
  initialEditingProperty,
  onClearInitialEditingProperty,
  salesAgents: externalSalesAgents,
  onUpdateSalesAgents,
  onOpenSalesSession,
  onClearAllProperties,
  onRestoreDemoProperties,
  priceMapData: externalPriceMapData,
  onUpdatePriceMapData,
  closedDeals: externalClosedDeals,
  onUpdateClosedDeals,
  onOpenBrokerPortal,
  brokersList: externalBrokersList,
  onUpdateBrokersList,
  onInspectBroker,
}) => {
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'manage' | 'add' | 'submissions' | 'sales_team' | 'brokers' | 'market_pricing' | 'analytics' | 'settings'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>('all');
  const [filterFinishing, setFilterFinishing] = useState<string>('all');
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [isClearingInProgress, setIsClearingInProgress] = useState(false);

  // Sales Agents State
  const [salesAgentsList, setSalesAgentsList] = useState<SalesAgent[]>(() => {
    if (externalSalesAgents && externalSalesAgents.length > 0) return externalSalesAgents;
    try {
      const saved = localStorage.getItem('lion_sales_agents');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SALES_AGENTS;
  });

  // Price Map & Closed Deals State
  const [priceMapList, setPriceMapList] = useState<NeighborhoodPriceMapData[]>(() => {
    if (externalPriceMapData && externalPriceMapData.length > 0) return externalPriceMapData;
    try {
      const saved = localStorage.getItem('lion_price_map_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PRICE_MAP_DATA;
  });

  const [closedDealsList, setClosedDealsList] = useState<ClosedDeal[]>(() => {
    if (externalClosedDeals && externalClosedDeals.length > 0) return externalClosedDeals;
    try {
      const saved = localStorage.getItem('lion_closed_deals');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CLOSED_DEALS;
  });

  // Closed deal modal state
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [dealForm, setDealForm] = useState<Partial<ClosedDeal>>({
    neighborhood: 'الحي الأول',
    area: 150,
    price: 3500000,
    daysToClose: 20,
    timeframeLabel: 'اتباعت الأسبوع ده',
    notes: ''
  });

  React.useEffect(() => {
    if (externalPriceMapData && externalPriceMapData.length > 0) {
      setPriceMapList(externalPriceMapData);
    }
  }, [externalPriceMapData]);

  React.useEffect(() => {
    if (externalClosedDeals && externalClosedDeals.length > 0) {
      setClosedDealsList(externalClosedDeals);
    }
  }, [externalClosedDeals]);

  const syncPriceMap = (updated: NeighborhoodPriceMapData[]) => {
    setPriceMapList(updated);
    if (onUpdatePriceMapData) onUpdatePriceMapData(updated);
    safeLocalStorageSet('lion_price_map_data', JSON.stringify(updated));
  };

  const syncClosedDeals = (updated: ClosedDeal[]) => {
    setClosedDealsList(updated);
    if (onUpdateClosedDeals) onUpdateClosedDeals(updated);
    safeLocalStorageSet('lion_closed_deals', JSON.stringify(updated));
  };

  const handleUpdatePriceRow = (neighborhood: HadabaWostaNeighborhood, field: 'avgFinishedPrice' | 'avgSemiFinishedPrice', val: number) => {
    const updated = priceMapList.map(item => {
      if (item.neighborhood === neighborhood) {
        return { ...item, [field]: val };
      }
      return item;
    });
    syncPriceMap(updated);
  };

  const handleSaveNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const newDeal: ClosedDeal = {
      id: `deal-${Date.now()}`,
      neighborhood: (dealForm.neighborhood as HadabaWostaNeighborhood) || 'الحي الأول',
      area: Number(dealForm.area) || 150,
      price: Number(dealForm.price) || 3000000,
      daysToClose: Number(dealForm.daysToClose) || 15,
      timeframeLabel: dealForm.timeframeLabel || 'اتباعت حديثاً',
      notes: dealForm.notes || '',
      closedDate: new Date().toISOString().split('T')[0]
    };
    syncClosedDeals([newDeal, ...closedDealsList]);
    setIsNewDealModalOpen(false);
    showToast('تمت إضافة الصفقة المغلقة بنجاح');
  };

  const handleDeleteClosedDeal = (dealId: string) => {
    const updated = closedDealsList.filter(d => d.id !== dealId);
    syncClosedDeals(updated);
    showToast('تم حذف الصفقة');
  };

  React.useEffect(() => {
    if (externalSalesAgents && externalSalesAgents.length > 0) {
      setSalesAgentsList(externalSalesAgents);
    }
  }, [externalSalesAgents]);

  const syncAgents = (updated: SalesAgent[]) => {
    setSalesAgentsList(updated);
    if (onUpdateSalesAgents) {
      onUpdateSalesAgents(updated);
    }
    safeLocalStorageSet('lion_sales_agents', JSON.stringify(updated));
  };

  // State for Sales Agent Modal / Form
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    role: 'sales_agent' as 'sales_agent' | 'team_leader' | 'sales_manager',
    commissionRate: 25,
    isActive: true
  });

  // Brokers & Partner Offices State
  const [brokersState, setBrokersState] = useState<BrokerProfile[]>(() => {
    if (externalBrokersList && externalBrokersList.length > 0) return externalBrokersList;
    try {
      const saved = localStorage.getItem('lion_brokers_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BROKERS;
  });

  React.useEffect(() => {
    if (externalBrokersList && externalBrokersList.length > 0) {
      setBrokersState(externalBrokersList);
    }
  }, [externalBrokersList]);

  const syncBrokers = (updated: BrokerProfile[]) => {
    setBrokersState(updated);
    if (onUpdateBrokersList) {
      onUpdateBrokersList(updated);
    }
    safeLocalStorageSet('lion_brokers_list', JSON.stringify(updated));
  };

  // State for Broker Add/Edit Modal
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null);
  const [brokerFormData, setBrokerFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    companyName: string;
    commissionRate: number;
    notes: string;
    assignedPropertyIds: string[];
    isActive: boolean;
  }>({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    commissionRate: 50,
    notes: '',
    assignedPropertyIds: [],
    isActive: true
  });

  // Property Assignment Checklist Modal State
  const [assigningBroker, setAssigningBroker] = useState<BrokerProfile | null>(null);

  const handleOpenAddBroker = () => {
    setEditingBrokerId(null);
    setBrokerFormData({
      name: '',
      email: '',
      password: 'broker' + Math.floor(100 + Math.random() * 900),
      phone: '',
      companyName: '',
      commissionRate: 50,
      notes: '',
      assignedPropertyIds: [],
      isActive: true
    });
    setIsBrokerModalOpen(true);
  };

  const handleOpenEditBroker = (broker: BrokerProfile) => {
    setEditingBrokerId(broker.id);
    setBrokerFormData({
      name: broker.name,
      email: broker.email,
      password: broker.password || 'broker123',
      phone: broker.phone,
      companyName: broker.companyName || '',
      commissionRate: broker.commissionRate || 50,
      notes: broker.notes || '',
      assignedPropertyIds: broker.assignedPropertyIds || [],
      isActive: broker.isActive !== false
    });
    setIsBrokerModalOpen(true);
  };

  const handleSaveBroker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerFormData.name.trim() || !brokerFormData.email.trim()) return;

    if (editingBrokerId) {
      const updated = brokersState.map(b => {
        if (b.id === editingBrokerId) {
          return {
            ...b,
            name: brokerFormData.name.trim(),
            email: brokerFormData.email.trim().toLowerCase(),
            password: brokerFormData.password.trim(),
            phone: brokerFormData.phone.trim(),
            companyName: brokerFormData.companyName.trim(),
            commissionRate: Number(brokerFormData.commissionRate) || 50,
            notes: brokerFormData.notes.trim(),
            assignedPropertyIds: brokerFormData.assignedPropertyIds,
            assignedUnitsCount: brokerFormData.assignedPropertyIds.length,
            isActive: brokerFormData.isActive
          };
        }
        return b;
      });
      syncBrokers(updated);
      showToast('تم تحديث بيانات البروكر بنجاح');
    } else {
      const newBroker: BrokerProfile = {
        id: `broker_${Date.now()}`,
        name: brokerFormData.name.trim(),
        email: brokerFormData.email.trim().toLowerCase(),
        password: brokerFormData.password.trim() || 'broker123',
        phone: brokerFormData.phone.trim() || '01000000000',
        companyName: brokerFormData.companyName.trim() || 'وسيط معتمد بالهضبة',
        commissionRate: Number(brokerFormData.commissionRate) || 50,
        notes: brokerFormData.notes.trim(),
        assignedPropertyIds: brokerFormData.assignedPropertyIds,
        assignedUnitsCount: brokerFormData.assignedPropertyIds.length,
        isActive: brokerFormData.isActive,
        createdAt: new Date().toISOString().split('T')[0],
        viewingsThisMonth: 0,
        averageResponseMinutes: 8,
        lateResponsesCount: 0
      };
      syncBrokers([...brokersState, newBroker]);
      showToast('تمت إضافة البروكر الجديد بنجاح');
    }

    setIsBrokerModalOpen(false);
  };

  const handleToggleBrokerActive = (brokerId: string) => {
    const updated = brokersState.map(b => {
      if (b.id === brokerId) {
        const nextActive = b.isActive === false ? true : false;
        return { ...b, isActive: nextActive };
      }
      return b;
    });
    syncBrokers(updated);
    showToast('تم تحديث حالة تفعيل البروكر');
  };

  const handleDeleteBroker = (brokerId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا البروكر نهائياً من المنظومة؟')) {
      const updated = brokersState.filter(b => b.id !== brokerId);
      syncBrokers(updated);
      showToast('تم حذف البروكر بنجاح');
    }
  };

  const handleToggleAssignProperty = (propCodeOrId: string) => {
    if (!assigningBroker) return;
    const currentList = assigningBroker.assignedPropertyIds || [];
    const exists = currentList.includes(propCodeOrId);
    const updatedList = exists 
      ? currentList.filter(id => id !== propCodeOrId)
      : [...currentList, propCodeOrId];
    
    const updatedBroker = {
      ...assigningBroker,
      assignedPropertyIds: updatedList,
      assignedUnitsCount: updatedList.length
    };
    setAssigningBroker(updatedBroker);

    const updatedAll = brokersState.map(b => b.id === assigningBroker.id ? updatedBroker : b);
    syncBrokers(updatedAll);
  };

  // New / Edit Apartment Form State (flexible images count + video URL)
  const [formData, setFormData] = useState({
    title: '',
    neighborhood: HADABA_WOSTA_NEIGHBORHOODS[0] as HadabaWostaNeighborhood,
    propertyType: 'apartment' as PropertyType,
    finishing: 'finished' as FinishingType,
    price: 3200000,
    area: 140,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    view: 'واجهة بحري صريحة شارع عريض',
    featuresText: 'واجهة فاخرة حجر هاشمي\nمدخل رخام ومصعد إيطالي\nعدادات كهرباء وغاز رسمية\nحصة مسجلة بالأرض',
    description: '',
    ownerName: '',
    ownerPhone: '',
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    isFeatured: false,
    videoUrl: '',
    videoMuted: true,
    images: [...DEFAULT_ARCH_PHOTOS.slice(0, 3)] as string[] // Flexible count, starts with 3 default photos
  });

  const [notification, setNotification] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialEditingProperty) {
      handleStartEdit(initialEditingProperty);
      if (onClearInitialEditingProperty) {
        onClearInitialEditingProperty();
      }
    }
  }, [initialEditingProperty]);

  // Settings State
  const [newEmail, setNewEmail] = useState(adminCredentials?.email || 'admin@elsaba.com');
  const [newPassword, setNewPassword] = useState('');
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [showManualUrlInputs, setShowManualUrlInputs] = useState(false);

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1600, 900, 0.75);
      if (compressed && onUpdateBannerPhoto) {
        onUpdateBannerPhoto(compressed);
        showToast('تم ضغط ورفع وتحديث صورة البانر بنجاح ومزامنتها سحابياً');
      }
    } catch {
      showToast('حدث خطأ أثناء معالجة الصورة، يرجى تجربة صورة أخرى');
    }
  };

  const handleSaveBannerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerUrlInput.trim()) return;
    if (onUpdateBannerPhoto) {
      onUpdateBannerPhoto(bannerUrlInput.trim());
      showToast('تم تحديث صورة البانر بنجاح ومزامنتها سحابياً');
      setBannerUrlInput('');
    }
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 400, 0.9);
      if (compressed && onUpdateLogo) {
        onUpdateLogo(compressed);
        showToast('تم ضغط ورفع الشعار بنجاح ومزامنته سحابياً لجميع الأجهزة والناشرين');
      }
    } catch {
      showToast('حدث خطأ أثناء معالجة صورة الشعار');
    }
  };

  const handleSaveLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoUrlInput.trim()) return;
    if (onUpdateLogo) {
      onUpdateLogo(logoUrlInput.trim());
      showToast('تم حفظ رابط الشعار بنجاح ومزامنته سحابياً لجميع الأجهزة');
      setLogoUrlInput('');
    }
  };

  // Footer & Contact Info Form State
  const [footerForm, setFooterForm] = useState<FooterConfig>(() => ({
    branchAddress: footerConfig?.branchAddress || 'فرع الهضبة الوسطى: الحي الثاني، بجوار مدرسة منارة المستقبل، المقطم',
    workingHours: footerConfig?.workingHours || 'مواعيد العمل: يومياً من 10:00 ص حتى 10:00 م',
    aboutText: footerConfig?.aboutText || 'المنصة المتخصصة الأولى في تسويق وإدارة شقق الريسيل بالهضبة الوسطى بالمقطم (متشطب ونصف تشطيب) لضمان أفضل سعر وأسرع إجراءات معاينة ونقل ملكية.',
    phone: footerConfig?.phone || '01021242871',
    whatsapp: footerConfig?.whatsapp || '01021242871',
    copyrightText: footerConfig?.copyrightText || 'السبع للعقارات (El Seba Real Estate). جميع الحقوق محفوظة.',
    tagline: footerConfig?.tagline || 'بوابة ريسيل الهضبة الوسطى • قمة جبل المقطم',
  }));

  React.useEffect(() => {
    if (footerConfig) {
      setFooterForm((prev) => ({
        ...prev,
        ...footerConfig,
      }));
    }
  }, [footerConfig]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Image Handlers (Dynamic Count: 1, 2, 3, 5, etc.)
  const handleImageUpload = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(`جاري رفع الصورة (${slotIndex + 1})...`);
      const compressed = await compressImage(file);
      // الرفع على Firebase Storage، وFirestore بيخزن الرابط بس
      const url = await uploadDataUrl(compressed || '', 'properties', formData.id || 'new');
      if (url) {
        setFormData((prev) => {
          const newImages = [...prev.images];
          newImages[slotIndex] = url;
          return { ...prev, images: newImages };
        });
        showToast(`تم رفع الصورة (${slotIndex + 1}) بنجاح`);
      }
    } catch (err) {
      console.error(err);
      showToast('فشل رفع الصورة. اتأكد من الاتصال وجرّب تاني');
    }
  };

  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileList = Array.from(files) as File[];
      showToast(`جاري رفع ${fileList.length} صورة...`);
      const compressedList = await Promise.all(fileList.map((f) => compressImage(f)));
      const results = await Promise.all(
        compressedList.map((c) => (c ? uploadDataUrl(c, 'properties', formData.id || 'new') : Promise.resolve('')))
      );
      const valid = results.filter(Boolean) as string[];
      if (valid.length > 0) {
        setFormData((prev) => {
          // If previous images are just placeholders or empty, replace them; otherwise append
          const hasCustom = prev.images.some(img => !DEFAULT_ARCH_PHOTOS.includes(img) && img.trim());
          const nextImages = hasCustom ? [...prev.images, ...valid] : valid;
          return { ...prev, images: nextImages };
        });
        showToast(`تم رفع ${valid.length} صور للشقة بنجاح`);
      }
    } catch {
      showToast('حدث خطأ أثناء معالجة الصور');
    }
  };

  const handleAddPhotoSlot = () => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const handleRemovePhotoSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleImageUrlChange = (slotIndex: number, url: string) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      newImages[slotIndex] = url;
      return { ...prev, images: newImages };
    });
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const selected = prev.images[index];
      const rest = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: [selected, ...rest] };
    });
    showToast('تم تعيين هذه الصورة كغلاف رئيسي للشقة');
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('تنبيه: حجم الفيديو أكبر من 20MB. للأداء الأفضل وتوفير المساحة يُنصح بلصق رابط YouTube أو Google Drive');
    }

    showToast('جاري رفع الفيديو على السحابة...');
    uploadFile(file, 'videos', formData.id || 'new')
      .then((url) => {
        setFormData((prev) => ({ ...prev, videoUrl: url, videoMuted: true }));
        showToast('تم رفع الفيديو بنجاح');
      })
      .catch((err) => {
        console.error(err);
        showToast('فشل رفع الفيديو. جرّب رابط يوتيوب بدل الملف');
      });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      neighborhood: HADABA_WOSTA_NEIGHBORHOODS[0],
      propertyType: 'apartment',
      finishing: 'finished',
      price: 3200000,
      area: 140,
      bedrooms: 3,
      bathrooms: 2,
      floor: 'الدور الثالث',
      view: 'واجهة بحري صريحة شارع عريض',
      featuresText: 'واجهة فاخرة حجر هاشمي\nمدخل رخام ومصعد إيطالي\nعدادات كهرباء وغاز رسمية\nحصة مسجلة بالأرض',
      description: '',
      ownerName: '',
      ownerPhone: '',
      hasElevator: true,
      hasGarage: true,
      registeredContract: true,
      isFeatured: false,
      videoUrl: '',
      videoMuted: true,
      images: [...DEFAULT_ARCH_PHOTOS.slice(0, 3)]
    });
    setEditingPropertyId(null);
  };

  const handleStartEdit = (prop: Property) => {
    setEditingPropertyId(prop.id);
    setFormData({
      title: prop.title,
      neighborhood: prop.neighborhood,
      propertyType: prop.propertyType,
      finishing: prop.finishing,
      price: prop.price,
      area: prop.area,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      floor: prop.floor,
      view: prop.view,
      featuresText: prop.features.join('\n'),
      description: prop.description,
      ownerName: prop.ownerName || '',
      ownerPhone: prop.ownerPhone || '',
      hasElevator: prop.hasElevator ?? true,
      hasGarage: prop.hasGarage ?? true,
      registeredContract: prop.registeredContract ?? true,
      isFeatured: prop.isFeatured ?? false,
      videoUrl: prop.videoUrl || '',
      videoMuted: prop.videoMuted ?? true,
      images: prop.images && prop.images.length > 0 ? [...prop.images] : []
    });
    setActiveTab('add');
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('يرجى كتابة عنوان الشقة ومواصفاتها');
      return;
    }

    const cleanedImages = formData.images
      .map((img) => img.trim())
      .filter((img) => img.length > 0);

    const cleanedVideo = formData.videoUrl.trim() || undefined;

    if (cleanedImages.length === 0 && !cleanedVideo) {
      showToast('يرجى إضافة صورة واحدة أو فيديو للشقة على الأقل');
      return;
    }

    const featuresList = formData.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const pricePerMeter = Math.round(formData.price / (formData.area || 1));

    if (editingPropertyId) {
      const existing = properties.find(p => p.id === editingPropertyId);
      const updated: Property = {
        ...existing,
        id: editingPropertyId,
        code: existing?.code || `SEBA-APT-${Math.floor(100 + Math.random() * 900)}`,
        title: formData.title,
        neighborhood: formData.neighborhood,
        propertyType: formData.propertyType,
        finishing: formData.finishing,
        finishingLabel: formData.finishing === 'finished' ? 'متشطب بالكامل' : 'نصف تشطيب (محارة وحلوق)',
        price: Number(formData.price),
        pricePerMeter,
        area: Number(formData.area),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        floor: formData.floor,
        view: formData.view,
        features: featuresList,
        description: formData.description.trim() || existing?.description || '',
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        hasElevator: formData.hasElevator,
        hasGarage: formData.hasGarage,
        registeredContract: formData.registeredContract,
        isFeatured: formData.isFeatured,
        videoUrl: cleanedVideo,
        videoMuted: formData.videoMuted,
        images: cleanedImages,
        clicks: existing?.clicks || { views: 120, whatsapp: 12, call: 6 }
      };
      onUpdateProperty(updated);
      showToast('تم تحديث بيانات الشقة بنجاح');
    } else {
      const newCode = `SEBA-APT-${Math.floor(100 + Math.random() * 900)}`;
      const newProp: Property = {
        id: `prop-${Date.now()}`,
        code: newCode,
        title: formData.title,
        neighborhood: formData.neighborhood,
        propertyType: formData.propertyType,
        propertyTypeLabel: formData.propertyType === 'apartment' ? 'شقة سكنية' : formData.propertyType === 'duplex' ? 'دوبلكس' : formData.propertyType === 'penthouse' ? 'بنتهاوس ورُوف' : 'أرضي بحديقة',
        finishing: formData.finishing,
        finishingLabel: formData.finishing === 'finished' ? 'متشطب بالكامل' : 'نصف تشطيب (محارة وحلوق)',
        price: Number(formData.price),
        pricePerMeter,
        area: Number(formData.area),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        floor: formData.floor,
        view: formData.view,
        deliveryDate: 'استلام فوري',
        paymentMethod: 'cash_or_facilities',
        createdAt: new Date().toISOString().split('T')[0],
        features: featuresList,
        description: formData.description.trim() || `${formData.title} - مساحة ${formData.area}م² بالهضبة الوسطى (${formData.neighborhood})، ${formData.bedrooms} غرف و${formData.bathrooms} حمام.`,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        hasElevator: formData.hasElevator,
        hasGarage: formData.hasGarage,
        registeredContract: formData.registeredContract,
        isFeatured: formData.isFeatured,
        videoUrl: cleanedVideo,
        videoMuted: formData.videoMuted,
        images: cleanedImages,
        clicks: { views: 0, whatsapp: 0, call: 0, favorites: 0 }
      };
      onAddProperty(newProp);
      showToast('تمت إضافة الشقة الجديدة إلى المعرض بنجاح');
    }

    resetForm();
    setActiveTab('manage');
  };

  const handleUpdateCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCredentials) {
      onUpdateCredentials(newEmail, newPassword || (adminCredentials?.password || ''));
      showToast('تم تحديث بيانات دخول الإدارة بنجاح');
    }
  };

  // Filtered Properties for Management Table
  const filteredManagementProps = useMemo(() => {
    return properties.filter(p => {
      const matchSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchNeigh = filterNeighborhood === 'all' || p.neighborhood === filterNeighborhood;
      const matchFinish = filterFinishing === 'all' || p.finishing === filterFinishing;

      return matchSearch && matchNeigh && matchFinish;
    });
  }, [properties, searchQuery, filterNeighborhood, filterFinishing]);

  const pendingSubmissions = useMemo(() => {
    return ownerSubmissions.filter(s => s.status === 'pending');
  }, [ownerSubmissions]);

  // Analytics Metrics
  const analyticsTotals = useMemo(() => {
    let totalViews = 0;
    let totalWhatsapp = 0;
    let totalCalls = 0;
    let totalValue = 0;

    properties.forEach(p => {
      totalViews += p.clicks?.views || 0;
      totalWhatsapp += p.clicks?.whatsapp || 0;
      totalCalls += p.clicks?.call || 0;
      totalValue += p.price || 0;
    });

    return { totalViews, totalWhatsapp, totalCalls, totalValue };
  }, [properties]);

  // Top Viewed Properties
  const topProperties = useMemo(() => {
    return [...properties]
      .sort((a, b) => ((b.clicks?.views || 0) + (b.clicks?.whatsapp || 0) * 3) - ((a.clicks?.views || 0) + (a.clicks?.whatsapp || 0) * 3))
      .slice(0, 6);
  }, [properties]);

  // Sales Agent Handlers
  const handleOpenAddAgent = () => {
    setEditingAgentId(null);
    setAgentFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      role: 'sales_agent',
      commissionRate: 25,
      isActive: true
    });
    setIsAgentModalOpen(true);
  };

  const handleOpenEditAgent = (agent: SalesAgent) => {
    setEditingAgentId(agent.id);
    setAgentFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      whatsapp: agent.whatsapp,
      role: agent.role,
      commissionRate: agent.commissionRate,
      isActive: agent.isActive
    });
    setIsAgentModalOpen(true);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentFormData.name.trim() || !agentFormData.email.trim()) {
      showToast('يرجى ملء الاسم والبريد الإلكتروني');
      return;
    }

    if (editingAgentId) {
      const updated = salesAgentsList.map(a => {
        if (a.id === editingAgentId) {
          return {
            ...a,
            name: agentFormData.name,
            email: agentFormData.email,
            phone: agentFormData.phone,
            whatsapp: agentFormData.whatsapp,
            role: agentFormData.role,
            commissionRate: agentFormData.commissionRate,
            isActive: agentFormData.isActive
          };
        }
        return a;
      });
      syncAgents(updated);
      showToast('تم تحديث بيانات مسؤول المبيعات بنجاح');
    } else {
      const newAgent: SalesAgent = {
        id: `agent-${Date.now()}`,
        name: agentFormData.name,
        email: agentFormData.email,
        phone: agentFormData.phone,
        whatsapp: agentFormData.whatsapp,
        role: agentFormData.role,
        commissionRate: agentFormData.commissionRate,
        isActive: agentFormData.isActive,
        xp: 150,
        level: 1,
        currentStreak: 1,
        dealsClosedCount: 0,
        totalCommissionEarned: 0,
        visitsCompletedCount: 0,
        listingsAddedCount: 0,
        badges: [INITIAL_BADGES[0]],
        activeQuests: INITIAL_DAILY_QUESTS
      };
      syncAgents([...salesAgentsList, newAgent]);
      showToast('تم إنشاء حساب مسؤول المبيعات الجديد بنجاح');
    }

    setIsAgentModalOpen(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    const updated = salesAgentsList.filter(a => a.id !== agentId);
    syncAgents(updated);
    showToast('تم حذف الحساب بنجاح');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-md text-right text-[#141414] flex flex-col h-screen w-screen overflow-hidden font-ibm antialiased" dir="rtl">
      <div 
        className="relative w-full h-full bg-[#F6F4EF] text-right text-[#141414] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================ */}
        {/* DESKTOP & TABLET SIDEBAR (Hidden on mobile)                       */}
        {/* ================================================================ */}
        <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-white border-l border-[#ECE8DF] shrink-0 h-full z-20 shadow-sm">
          {/* Top Brand Info */}
          <div className="p-5 border-b border-[#ECE8DF]/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#141414] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={22} className="text-[#D9B864]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black font-readex text-[#141414] truncate">
                    لوحة الإدارة المستقلة
                  </h2>
                  <span className="px-2 py-0.5 bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] text-[10px] font-bold rounded-lg shrink-0">
                    Pro OS
                  </span>
                </div>
                <p className="text-[11px] text-[#6B665C] truncate mt-0.5">
                  التحكم المركزي في المعرض والنظام
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Nav Items */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 no-scrollbar">
            <div className="px-3 py-1.5 text-[10px] font-bold text-[#A07A26] tracking-wider">
              إدارة المعرض والوحدات
            </div>

            <button
              onClick={() => setActiveTab('manage')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building size={16} className={activeTab === 'manage' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>إدارة الشقق</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${
                activeTab === 'manage' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {properties.length}
              </span>
            </button>

            <button
              onClick={() => {
                if (activeTab !== 'add') resetForm();
                setActiveTab('add');
              }}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-[#A07A26] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle size={16} className={activeTab === 'add' ? 'text-white' : 'text-[#A07A26]'} />
                <span>{editingPropertyId ? 'تعديل الشقة الحالية' : 'إضافة شقة جديدة'}</span>
              </div>
              {editingPropertyId && (
                <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">
                  تعديل نشط
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers size={16} className={activeTab === 'submissions' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>عروض الملاك</span>
              </div>
              {pendingSubmissions.length > 0 ? (
                <span className="px-2 py-0.5 text-[10px] rounded-full font-mono font-bold bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] animate-pulse">
                  {pendingSubmissions.length} جديد
                </span>
              ) : (
                <span className="text-[10px] font-mono text-stone-400">{ownerSubmissions.length}</span>
              )}
            </button>

            <div className="pt-3 px-3 py-1.5 text-[10px] font-bold text-[#A07A26] tracking-wider">
              الفريق والأسعار والتحليلات
            </div>

            <button
              onClick={() => setActiveTab('sales_team')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'sales_team'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} className={activeTab === 'sales_team' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>فريق المبيعات</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${
                activeTab === 'sales_team' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {salesAgentsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('brokers')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'brokers'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase size={16} className={activeTab === 'brokers' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>إدارة ومراقبة البروكرز</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${
                activeTab === 'brokers' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {brokersState.length}
              </span>
            </button>

            {onOpenBrokerPortal && (
              <button
                onClick={onOpenBrokerPortal}
                className="w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/80 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-emerald-700" />
                  <span>بوابة البروكر والمعاينات</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                  بوابة الشركاء
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('market_pricing')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'market_pricing'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass size={16} className={activeTab === 'market_pricing' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>خريطة الأسعار والصفقات</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${
                activeTab === 'market_pricing' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {closedDealsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 size={16} className={activeTab === 'analytics' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>التحليلات والمؤشرات</span>
              </div>
            </button>

            <div className="pt-3 px-3 py-1.5 text-[10px] font-bold text-[#A07A26] tracking-wider">
              إعدادات المنصة
            </div>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#141414] text-white shadow-sm'
                  : 'text-[#4A463F] hover:bg-[#FAF4E5]/80 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock size={16} className={activeTab === 'settings' ? 'text-[#D9B864]' : 'text-stone-400'} />
                <span>الإعدادات والشعار</span>
              </div>
            </button>
          </div>

          {/* Bottom Actions in Sidebar */}
          <div className="p-3.5 border-t border-[#ECE8DF] space-y-2 bg-[#F6F4EF]/40">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="w-full py-2.5 px-3 bg-[#FAF4E5] border border-[#E9DFCA] hover:bg-[#F3EAD5] text-[#A07A26] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={15} />
              <span>استيراد وتصدير إكسيل</span>
            </button>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onLogout}
                className="flex-1 py-2 bg-white border border-[#ECE8DF] hover:bg-stone-100 text-[#141414] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                <span>تسجيل خروج</span>
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="الرجوع للمعرض"
              >
                الموقع
              </button>
            </div>
          </div>
        </aside>

        {/* ================================================================ */}
        {/* MAIN CONTENT AREA                                                */}
        {/* ================================================================ */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          
          {/* Top Bar for Mobile & Quick Controls */}
          <header className="px-4 sm:px-6 py-3 bg-white border-b border-[#ECE8DF] flex items-center justify-between shrink-0 shadow-2xs z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="md:hidden w-9 h-9 bg-[#141414] text-[#D9B864] rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-black font-readex text-[#141414] truncate">
                  {activeTab === 'manage' && 'إدارة الشقق والوحدات'}
                  {activeTab === 'add' && (editingPropertyId ? 'تعديل بيانات الشقة' : 'إضافة شقة جديدة')}
                  {activeTab === 'submissions' && 'عروض وطلبات الملاك'}
                  {activeTab === 'sales_team' && 'فريق المبيعات والمستشارين'}
                  {activeTab === 'market_pricing' && 'خريطة الأسعار ومؤشرات السوق'}
                  {activeTab === 'analytics' && 'تحليلات الأداء والتفاعل'}
                  {activeTab === 'settings' && 'إعدادات المنصة واللوجو والفوتر'}
                </h1>
                <p className="text-[10px] sm:text-xs text-[#6B665C] truncate hidden sm:block">
                  إدارة شاملة لبيانات العقارات · المبيعات · التقارير · التخصيص
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="hidden sm:flex md:hidden px-3 py-1.5 rounded-xl font-bold items-center gap-1.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] text-xs"
              >
                <FileSpreadsheet size={13} />
                <span>إكسيل</span>
              </button>

              <button
                onClick={() => setIsAccountsOpen(true)}
                className="px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] text-xs"
                title="الإيميلات والباسووردات لكل الفريق والملاك والبروكرز"
              >
                <span>الحسابات</span>
              </button>
              <button
                onClick={() => setIsChangePassOpen(true)}
                className="hidden sm:flex px-3 py-1.5 rounded-xl font-bold items-center gap-1.5 bg-[#F6F4EF] border border-[#ECE8DF] text-[#141414] text-xs"
              >
                <span>باسووردي</span>
              </button>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#141414] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="الرجوع للمعرض العام"
              >
                <span>معاينة الموقع</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </header>

          {/* MOBILE TABS SCROLLER (Hidden on Tablet/Desktop) */}
          <div className="md:hidden bg-white border-b border-[#ECE8DF] px-3 py-2 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <Building size={13} />
              <span>الشقق ({properties.length})</span>
            </button>

            <button
              onClick={() => {
                if (activeTab !== 'add') resetForm();
                setActiveTab('add');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-[#A07A26] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <PlusCircle size={13} />
              <span>{editingPropertyId ? 'تعديل' : 'إضافة'}</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <Layers size={13} />
              <span>الملاك</span>
              {pendingSubmissions.length > 0 && (
                <span className="px-1.5 py-0.2 bg-[#FAF4E5] text-[#A07A26] rounded-full text-[9px] font-bold">
                  {pendingSubmissions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('sales_team')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'sales_team'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <Users size={13} />
              <span>السيلز</span>
            </button>

            <button
              onClick={() => setActiveTab('market_pricing')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'market_pricing'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <Compass size={13} />
              <span>الأسعار</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <BarChart3 size={13} />
              <span>الإحصائيات</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#F6F4EF] text-[#6B665C]'
              }`}
            >
              <Lock size={13} />
              <span>الإعدادات</span>
            </button>
          </div>

          {/* NOTIFICATION TOAST */}
          {notification && (
            <div className="bg-[#141414] text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-xs border-b border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#D9B864]" />
                <span>{notification}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-stone-400 hover:text-white cursor-pointer">
                <X size={13} />
              </button>
            </div>
          )}

        {/* TAB BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#F6F4EF]">

          {/* ================================================================ */}
          {/* TAB 1: MANAGE PROPERTIES                                         */}
          {/* ================================================================ */}
          {activeTab === 'manage' && (
            <div className="space-y-5">
              
              {/* Search & Filter Bar - Smooth rounded bar */}
              <div className="bg-white p-4 rounded-3xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="relative flex-1">
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالكود، الحي، العنوان، أو اسم المالك..."
                    className="w-full bg-stone-50/80 rounded-2xl py-2.5 pr-11 pl-4 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filterNeighborhood}
                    onChange={(e) => setFilterNeighborhood(e.target.value)}
                    className="bg-stone-50/80 rounded-2xl py-2.5 px-3.5 text-xs text-stone-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all">كل الأحياء</option>
                    {HADABA_WOSTA_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <select
                    value={filterFinishing}
                    onChange={(e) => setFilterFinishing(e.target.value)}
                    className="bg-stone-50/80 rounded-2xl py-2.5 px-3.5 text-xs text-stone-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all">كل التشطيبات</option>
                    <option value="finished">متشطب</option>
                    <option value="semi_finished">نصف تشطيب</option>
                  </select>

                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('add');
                    }}
                    className="bg-stone-900 hover:bg-black text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>إضافة شقة</span>
                  </button>
                </div>
              </div>

              {/* Properties Grid */}
              {filteredManagementProps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl p-8 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-3xl flex items-center justify-center mx-auto">
                    <Building size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-stone-900">
                      {properties.length === 0 ? 'المعرض فارغ حالياً وجاهز لاستيراد الشيت الجديد' : 'لا توجد شقق مطابقة للبحث'}
                    </p>
                    <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                      {properties.length === 0
                        ? 'تم مسح وتفريغ كافة الشقق من قاعدة البيانات بنجاح. يمكنك الآن الضغط على زر "استيراد إكسيل" أعلاه لرفع الشيت الجديد وربطه بالمعرض مباشرة.'
                        : 'جرب تغيير معايير البحث أو اختيار حي آخر'}
                    </p>
                  </div>
                  {properties.length === 0 && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsExcelModalOpen(true)}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>استيراد شيت إكسيل الآن</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredManagementProps.map((prop) => {
                    return (
                      <div
                        key={prop.id}
                        className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                      >
                        <div className="flex gap-4">
                          <img
                            src={prop.images?.[0] || DEFAULT_ARCH_PHOTOS[0]}
                            alt={prop.title}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-mono font-black bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-full">
                                {prop.code}
                              </span>
                              <span className="text-xs text-stone-400 font-medium">
                                {prop.neighborhood}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-black text-stone-900 truncate" title={prop.title}>
                              {prop.title}
                            </h3>

                            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                              <span className="text-stone-900 font-black">{formatPrice(prop.price)} ج.م</span>
                              <span className="text-stone-300 font-normal">&bull;</span>
                              <span className="text-stone-500 font-normal text-xs">{prop.area} م²</span>
                              <span className="text-stone-300 font-normal">&bull;</span>
                              <span className="text-stone-500 font-normal text-xs">{prop.bedrooms} غرف</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-stone-400 pt-0.5">
                              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                <MessageCircle size={12} /> {prop.clicks?.whatsapp || 0}
                              </span>
                              <span className="flex items-center gap-1 text-sky-700 font-bold">
                                <Phone size={12} /> {prop.clicks?.call || 0}
                              </span>
                              <span className="flex items-center gap-1 text-stone-400">
                                <Eye size={12} /> {prop.clicks?.views || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between gap-2">
                          <div className="text-xs text-stone-400 truncate">
                            {prop.ownerPhone ? `مالك: ${prop.ownerName || 'بدون اسم'} (${prop.ownerPhone})` : 'إدارة مباشرة'}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartEdit(prop)}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="تعديل الشقة"
                            >
                              <Edit3 size={13} />
                              <span>تعديل</span>
                            </button>

                            <button
                              onClick={() => {
                                onDeleteProperty(prop.id);
                                showToast(`تم حذف الشقة (${prop.code}) بنجاح`);
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="حذف الشقة"
                            >
                              <Trash2 size={13} />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: ADD / EDIT PROPERTY (5 PHOTOS UPLOAD)                      */}
          {/* ================================================================ */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveProperty} className="space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                    {editingPropertyId ? 'تعديل بيانات الشقة ونشر التحديثات' : 'إضافة شقة ريسيل جديدة بالهضبة الوسطى'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    يرجى إدخال مواصفات الشقة، إضافة صورها، ورابط جولة الفيديو إن توفر
                  </p>
                </div>
                {editingPropertyId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
                  >
                    إلغاء التعديل والبدء من جديد
                  </button>
                )}
              </div>

              {/* Video Tour Section */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Film size={18} className="text-rose-600" />
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">فيديو الشقة أو جولة المعاينة (اختياري)</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        يدعم رفع ملف فيديو صامت مباشرة من جهازك (.mp4 / .mov) أو روابط YouTube و Drive
                      </p>
                    </div>
                  </div>
                  {formData.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, videoUrl: '', videoMuted: true })}
                      className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>إزالة الفيديو</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0">
                      <Upload size={14} />
                      <span>رفع فيديو صامت من جهازك</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>

                    <span className="text-[11px] text-stone-400 font-bold text-center sm:text-right">أو</span>

                    <input
                      type="url"
                      dir="ltr"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="الصق رابط YouTube أو Google Drive أو رابط mp4 مباشر..."
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {/* 50 Videos Pro Tip Box */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
                    <Sparkles size={15} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">ملاحظة تقنية لـ 50 فيديو لجميع الشقق:</strong> النظام يدعم إضافة فيديوهات لكل شقة بلا حد. الحل القياسي والمجاني 100% عالمياً هو رفع الفيديو على <strong>قناة YouTube كفيديو (غير مدرج Unlisted)</strong> ووضع رابطه هنا؛ يضمن ذلك تشغيلاً سريعاً فائق الجودة على هواتف العملاء دون استهلاك ذاكرة السيرفر.
                    </div>
                  </div>

                  {formData.videoUrl.trim() && (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                            <Play size={12} className="text-rose-600" />
                            <span>معاينة الفيديو المضاف:</span>
                          </span>
                          {formData.videoMuted && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <VolumeX size={10} />
                              <span>صامت بدون صوت</span>
                            </span>
                          )}
                        </div>
                        <a
                          href={formData.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1"
                        >
                          <span>فتح الرابط</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="max-w-xl mx-auto rounded-lg overflow-hidden border border-stone-300">
                        <PropertyVideoPlayer 
                          videoUrl={formData.videoUrl} 
                          title={formData.title || 'معاينة الفيديو'} 
                          videoMuted={formData.videoMuted}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Photos Upload Section */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-amber-700" />
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">
                        معرض صور الشقة ({formData.images.length} صور مرفوعة)
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        رفع فوري ومباشر من جهازك — يتم ضغط الصور تلقائياً لأعلى وضوح وسرعة
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualUrlInputs(!showManualUrlInputs)}
                      className="px-2.5 py-1.5 text-stone-500 hover:text-stone-800 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {showManualUrlInputs ? 'إخفاء خانات الروابط' : 'إدخال روابط صور يدوياً'}
                    </button>
                    <label className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                      <Upload size={13} />
                      <span>إضافة صور أخرى</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBatchImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Big Direct Drag & Drop Upload Zone */}
                <div className="relative border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl p-6 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBatchImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    title="اضغط لاختيار الصور مباشرة من جهازك"
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Upload size={22} />
                    </div>
                    <p className="text-sm font-extrabold text-stone-900 mb-1">
                      اضغط هنا لرفع صور الشقة مباشرة من جهازك (ابلود فوري)
                    </p>
                    <p className="text-xs text-stone-600">
                      يمكنك تحديد صور متعددة دفعة واحدة أو سحب وإفلات الصور هنا — لا حد لعدد الصور
                    </p>
                  </div>
                </div>

                {/* Uploaded Images Gallery Cards */}
                {formData.images.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-stone-700">
                      الصور الحالية المرفوعة ({formData.images.length} صورة):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, images: [] }));
                        showToast('تم مسح جميع الصور — يمكنك حفظ الشقة بالفيديو فقط أو رفع صور جديدة');
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>مسح جميع الصور ({formData.images.length})</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-1">
                  {formData.images.map((imgUrl, index) => (
                    <div key={index} className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 space-y-2 text-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-stone-700">
                            صورة {index + 1}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <Star size={10} className="fill-amber-500 text-amber-500" />
                              الغلاف
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoSlot(index)}
                          className="text-stone-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                          title="حذف هذه الصورة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="relative aspect-4/3 bg-stone-200 rounded-lg overflow-hidden border border-stone-200 group">
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={`صورة ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                            <ImageIcon size={20} className="mb-1 text-stone-300" />
                            <span className="text-[10px]">لا توجد صورة</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[11px] font-bold">
                          <Upload size={16} className="mb-1" />
                          <span>تغيير الصورة</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1">
                        {index !== 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(index)}
                            className="text-[10px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 py-0.5 px-1.5 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer"
                          >
                            <Star size={10} />
                            <span>تعيين كغلاف</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium">الغلاف الأساسي</span>
                        )}

                        <label className="text-[10px] text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer">
                          <Upload size={10} />
                          <span>استبدال</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {showManualUrlInputs && (
                        <input
                          type="url"
                          value={imgUrl}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          placeholder="رابط URL مباشر..."
                          className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 font-mono"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Specs */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h4 className="text-sm font-extrabold text-stone-900">المعلومات الأساسية والموقع</h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-stone-800 font-bold mb-1">عنوان الإعلان ومواصفاته التسويقية:</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مثال: شقة ١٤٠ م² الترا سوبر لوكس الحي الثاني فيو حديقة"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-stone-800 font-bold mb-1">الحي بالهضبة الوسطى:</label>
                      <select
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value as HadabaWostaNeighborhood })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                      >
                        {HADABA_WOSTA_NEIGHBORHOODS.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">حالة التشطيب:</label>
                      <select
                        value={formData.finishing}
                        onChange={(e) => setFormData({ ...formData, finishing: e.target.value as FinishingType })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                      >
                        <option value="finished">متشطب بالكامل (جاهزة للسكن)</option>
                        <option value="semi_finished">نصف تشطيب (محارة وحلوق)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">الدور والارتفاع:</label>
                      <input
                        type="text"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                        placeholder="الدور الثالث / رابع"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-stone-800 font-bold mb-1">السعر الإجمالي (ج.م):</label>
                      <input
                        type="number"
                        required
                        step="50000"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">المساحة الإجمالية (م²):</label>
                      <input
                        type="number"
                        required
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">عدد الغرف:</label>
                      <input
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">عدد الحمامات:</label>
                      <input
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-stone-800 font-bold mb-1">اسم المالك (خاص بالإدارة):</label>
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="المستشار شريف سامي"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">هاتف المالك (مشفر عن العامة):</label>
                      <input
                        type="text"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        placeholder="010XXXXXXXX"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-800 font-bold mb-1">المميزات ونقاط القوة (سطر لكل ميزة):</label>
                    <textarea
                      rows={3}
                      value={formData.featuresText}
                      onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                      placeholder="واجهة فاخرة حجر هاشمي&#10;مدخل رخام ومصعد إيطالي&#10;عدادات كهرباء وغاز رسمية"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {/* Unit Detailed Description - Fully Editable */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-stone-800 font-bold flex items-center gap-1.5 text-xs">
                        <FileText size={15} className="text-amber-700" />
                        <span>تفاصيل ومواصفات الوحدة (الوصف التفصيلي للشقة):</span>
                      </label>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 font-semibold">
                        قابلة للتعديل وتظهر في صفحة تفاصيل الشقة
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="اكتب هنا كافة تفاصيل ومواصفات الوحدة والشقة بالكامل (مثل: الموقع والفيو، التقسيم الداخلي، حالة العقار والأسانسير، العدادات، نسبة حصة الأرض، شروط الدفع، موعد الاستلام)..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-xs focus:outline-none focus:border-stone-900 leading-relaxed placeholder:text-stone-400"
                    />
                  </div>

                  <div className="flex items-center gap-4 flex-wrap pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasElevator}
                        onChange={(e) => setFormData({ ...formData, hasElevator: e.target.checked })}
                        className="w-4 h-4 rounded text-stone-900"
                      />
                      <span className="text-stone-800 font-bold">مصعد شغال</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasGarage}
                        onChange={(e) => setFormData({ ...formData, hasGarage: e.target.checked })}
                        className="w-4 h-4 rounded text-stone-900"
                      />
                      <span className="text-stone-800 font-bold">مكان جراج مخصص</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.registeredContract}
                        onChange={(e) => setFormData({ ...formData, registeredContract: e.target.checked })}
                        className="w-4 h-4 rounded text-stone-900"
                      />
                      <span className="text-stone-800 font-bold">عقد وحصة بالأرض</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600"
                      />
                      <span className="text-amber-800 font-bold">تثبيت كشقة مميزة في أول المعرض (VIP)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  {editingPropertyId ? 'حفظ وتحديث بيانات الشقة' : 'نشر الشقة في المعرض فوراً'}
                </button>

                {editingPropertyId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('هل أنت متأكد من حذف هذه الشقة نهائياً من قاعدة البيانات السحابية؟')) {
                        onDeleteProperty(editingPropertyId);
                        showToast('تم حذف الشقة نهائياً بنجاح');
                        resetForm();
                        setActiveTab('manage');
                      }
                    }}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 size={14} />
                    <span>حذف الوحدة نهائياً</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 3: OWNER SUBMISSIONS (RESALE REQUESTS)                       */}
          {/* ================================================================ */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                    طلبات الملاك لعرض شققهم (Resale Requests)
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    مراجعة بيانات الوحدات المرسلة من الملاك والموافقة عليها لتظهر في المعرض العام
                  </p>
                </div>
                <span className="px-3 py-1 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-800">
                  {ownerSubmissions.length} طلبات إجمالية
                </span>
              </div>

              {ownerSubmissions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 space-y-2 shadow-2xs">
                  <Layers size={32} className="mx-auto text-stone-400" />
                  <p className="text-sm font-bold text-stone-800">لا توجد طلبات جديدة من الملاك حالياً</p>
                  <p className="text-xs text-stone-500">تظهر هنا الشقق فور قيام الملاك بإرسالها من زر «اعرض شقتك للبيع»</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ownerSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-stone-100 text-stone-800 font-mono font-bold rounded-md border border-stone-200">
                            {sub.neighborhood}
                          </span>
                          <span className="text-stone-900 font-bold">
                            المالك: {sub.ownerName}
                          </span>
                          <span className="text-stone-500 font-mono" dir="ltr">
                            {sub.ownerPhone}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                            sub.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : sub.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {sub.status === 'approved' ? 'تمت الموافقة ونشرها' : sub.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                          <span className="text-stone-500 block text-[11px]">المساحة:</span>
                          <strong className="text-stone-900">{sub.area} م²</strong>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                          <span className="text-stone-500 block text-[11px]">السعر المطلوب:</span>
                          <strong className="text-stone-900 font-mono">{formatPrice(sub.price)} ج.م</strong>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                          <span className="text-stone-500 block text-[11px]">التشطيب:</span>
                          <strong className="text-stone-900">{sub.finishing === 'finished' ? 'متشطب' : 'نصف تشطيب'}</strong>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                          <span className="text-stone-500 block text-[11px]">الدور:</span>
                          <strong className="text-stone-900">{sub.floor || 'غير محدد'}</strong>
                        </div>
                      </div>

                      {/* Exact Location & Google Maps Link */}
                      {(sub.exactLocation || sub.googleMapsUrl) && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                              <MapPin size={14} className="text-amber-700 shrink-0" />
                              <span>لوكيشن الوحدة بالتحديد:</span>
                            </div>
                            {sub.googleMapsUrl && (
                              <a
                                href={sub.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Navigation size={12} />
                                <span>فتح خرائط جوجل</span>
                              </a>
                            )}
                          </div>
                          {sub.exactLocation && (
                            <p className="text-stone-800 font-medium leading-relaxed pr-5">
                              {sub.exactLocation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Viewing Schedule & Inspection Contact */}
                      {(sub.viewingSchedule || sub.inspectionContactPhone) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {sub.viewingSchedule && (
                            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                              <span className="text-emerald-900 font-bold flex items-center gap-1.5 text-[11px]">
                                <Calendar size={13} className="text-emerald-700" />
                                <span>مواعيد المعاينة المتاحة:</span>
                              </span>
                              <p className="text-stone-800 font-medium">
                                {sub.viewingSchedule}
                              </p>
                            </div>
                          )}

                          {sub.inspectionContactPhone && (
                            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-900 font-bold flex items-center gap-1.5 text-[11px]">
                                  <UserCheck size={13} className="text-emerald-700" />
                                  <span>مسؤول فتح الشقة ({sub.inspectionContactRole || 'معاينة'}):</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-stone-900" dir="ltr">
                                  {sub.inspectionContactPhone}
                                </span>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={generateCallLink(sub.inspectionContactPhone)}
                                    className="p-1.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors"
                                    title="اتصال بمسؤول المعاينة"
                                  >
                                    <Phone size={12} />
                                  </a>
                                  <a
                                    href={generateWhatsAppLink(sub.inspectionContactPhone, `مرحباً، بخصوص تنسيق موعد معاينة شقة الهضبة الوسطى (${sub.neighborhood})...`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                    title="واتساب مسؤول المعاينة"
                                  >
                                    <MessageCircle size={12} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {sub.unitDescription && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                          وصف وملاحظات الشقة: {sub.unitDescription}
                        </p>
                      )}

                      {sub.notes && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                          ملاحظات إضافية: {sub.notes}
                        </p>
                      )}

                      {/* Video Tour Badge & Link */}
                      {sub.videoUrl && (
                        <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                          <div className="flex items-center gap-2">
                            <Film size={15} className="text-rose-600 shrink-0" />
                            <span className="font-bold">فيديو معاينة مرفق مع الشقة:</span>
                          </div>
                          <a
                            href={sub.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <span>مشاهدة الفيديو</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      {/* Images Preview */}
                      {sub.images && sub.images.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-stone-600 block">
                            صور الشقة المرفقة ({sub.images.length} صور):
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {sub.images.map((img, idx) => (
                              <div key={idx} className="w-16 h-12 rounded-lg overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-end gap-2">
                        {sub.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                onApproveSubmission(sub);
                                showToast(`تمت الموافقة ونقل شقة المالك ${sub.ownerName} للمعرض`);
                              }}
                              className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 size={14} />
                              <span>موافقة ونشر بالمعرض</span>
                            </button>

                            <button
                              onClick={() => {
                                onRejectSubmission(sub.id);
                                showToast('تم رفض الطلب');
                              }}
                              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 transition-all cursor-pointer"
                            >
                              رفض الطلب
                            </button>
                          </>
                        )}

                        <a
                          href={generateWhatsAppLink(sub.ownerPhone, `مرحباً أستاذ ${sub.ownerName}، بخصوص شقتك المعروضة بالهضبة الوسطى (${sub.neighborhood})...`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                        >
                          <MessageCircle size={14} />
                          <span>تواصل واتساب</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: SALES TEAM MANAGEMENT                                     */}
          {/* ================================================================ */}
          {activeTab === 'sales_team' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900">
                    إدارة فريق السيلز ومستشاري المبيعات ({salesAgentsList.length})
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5 font-medium">
                    التحكم في حسابات السيلز، التارجت، العمولات، ونظام الـ Gamification & Quests
                  </p>
                </div>

                <button
                  onClick={handleOpenAddAgent}
                  className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus size={15} />
                  <span>إضافة مستشار مبيعات جديد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {salesAgentsList.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={agent.avatar}
                            alt={agent.name}
                            className="w-12 h-12 rounded-2xl object-cover"
                          />
                          <div>
                            <h4 className="text-sm font-black text-stone-900">{agent.name}</h4>
                            <span className="text-[11px] text-stone-400 font-mono">{agent.email}</span>
                          </div>
                        </div>

                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${
                          agent.role === 'sales_manager'
                            ? 'bg-amber-50 text-amber-900'
                            : agent.role === 'team_leader'
                            ? 'bg-purple-50 text-purple-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {agent.role === 'sales_manager' ? 'مدير مبيعات' : agent.role === 'team_leader' ? 'تيم ليدر' : 'مستشار عقاري'}
                        </span>
                      </div>

                      {/* Unified Soft Stats Row - No Box Grids */}
                      <div className="p-3.5 bg-stone-50/90 rounded-2xl flex items-center justify-around text-xs">
                        <div className="text-center">
                          <span className="text-stone-400 text-[11px] block font-medium">تارجت الصفقات</span>
                          <strong className="text-stone-900 font-black text-sm">{agent.currentMonthClosedDeals} / {agent.currentMonthTargetDeals}</strong>
                        </div>
                        <div className="w-px h-6 bg-stone-200/60" />
                        <div className="text-center">
                          <span className="text-stone-400 text-[11px] block font-medium">نسبة العمولة</span>
                          <strong className="text-emerald-700 font-mono font-black text-sm">{agent.commissionRate}%</strong>
                        </div>
                      </div>

                      {/* Verified Auth Account Info */}
                      <div className="p-3.5 bg-stone-50 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="font-bold text-[11px] text-stone-700">حساب الدخول الموثق:</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck size={11} />
                            <span>Firebase Auth</span>
                          </span>
                        </div>
                        <p className="text-stone-900 font-mono font-bold truncate">
                          {agent.email}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1">
                          <span>هاتف: <span className="font-mono text-stone-700">{agent.phone || 'غير مسجل'}</span></span>
                          {agent.whatsapp && (
                            <span>واتساب: <span className="font-mono text-stone-700">{agent.whatsapp}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditAgent(agent)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit3 size={13} />
                        <span>تعديل البيانات</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="p-2 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="حذف الحساب"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB: BROKERS & PARTNER OFFICES OVERSIGHT (إدارة ورقابة البروكرز)  */}
          {/* ================================================================ */}
          {activeTab === 'brokers' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header & Quick Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE8DF]">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                    <Briefcase size={18} className="text-[#A07A26]" />
                    <span>إدارة ورقابة شبكة الوسطاء والمكاتب الشريكة ({brokersState.length})</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5 font-medium">
                    مراقبة حصرية ومحكمة: كل بروكر يطلع على شققه فقط ببريد وكلمة سر خاصة به، مع صلاحية تفقد منصته والتحكم في حساباته
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddBroker}
                    className="px-4 py-2.5 bg-[#A07A26] hover:bg-[#8A671F] text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>إضافة وسيط / مكتب جديد</span>
                  </button>
                </div>
              </div>

              {/* Statistics Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE8DF] space-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">إجمالي الوسطاء والمكاتب</span>
                  <div className="text-2xl font-black font-mono text-stone-900">
                    {brokersState.length}
                  </div>
                  <p className="text-[11px] text-stone-500">شركاء معتمدون بالهضبة</p>
                </div>

                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE8DF] space-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">الشقق الموزعة على البروكرز</span>
                  <div className="text-2xl font-black font-mono text-[#A07A26]">
                    {brokersState.reduce((sum, b) => sum + (b.assignedPropertyIds?.length || 0), 0)} شقة
                  </div>
                  <p className="text-[11px] text-stone-500">محافظ خاصة ومعزولة</p>
                </div>

                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE8DF] space-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">الوسطاء النشطون حالياً</span>
                  <div className="text-2xl font-black font-mono text-emerald-700">
                    {brokersState.filter(b => b.isActive !== false).length}
                  </div>
                  <p className="text-[11px] text-emerald-600">جاهزون للمعاينة الفورية</p>
                </div>

                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE8DF] space-y-1 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">متوسط سرعة التنسيق</span>
                  <div className="text-2xl font-black font-mono text-blue-700">
                    8 دقائق
                  </div>
                  <p className="text-[11px] text-blue-600">التزام بمعايير السبع</p>
                </div>
              </div>

              {/* Brokers List */}
              <div className="space-y-4">
                {brokersState.map((broker) => {
                  const assignedCount = broker.assignedPropertyIds?.length || 0;
                  const isSuspended = broker.isActive === false;

                  return (
                    <div
                      key={broker.id}
                      className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${
                        isSuspended ? 'border-rose-300 bg-rose-50/20' : 'border-[#ECE8DF] hover:border-[#D9B864]/60'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Broker Core Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FAF4E5] to-[#EFE7D2] border border-[#E9DFCA] flex items-center justify-center text-[#A07A26] font-black text-base shrink-0">
                            {broker.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-black text-stone-900">{broker.name}</h4>
                              <span className="text-xs text-stone-500 font-bold">({broker.companyName || 'وسيط مستقل'})</span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                isSuspended ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isSuspended ? 'حساب موقوف بقرار إداري' : 'وسيط نشط ومعتمد'}
                              </span>
                            </div>

                            {/* Credentials bar (Email & Password for Admin oversight) */}
                            <div className="flex items-center gap-3 text-xs text-stone-600 mt-2 flex-wrap">
                              <div className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/80">
                                <Mail size={12} className="text-stone-400" />
                                <span className="font-mono font-bold text-stone-900">{broker.email}</span>
                              </div>

                              <div className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/80">
                                <Key size={12} className="text-amber-600" />
                                <span className="text-stone-400">كلمة السر:</span>
                                <span className="font-mono font-bold text-stone-900">{broker.password || 'broker123'}</span>
                              </div>

                              <div className="flex items-center gap-1 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/80">
                                <Phone size={12} className="text-emerald-600" />
                                <span className="font-mono">{broker.phone}</span>
                              </div>

                              <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-900 font-bold">
                                <span>نسبة العمولة:</span>
                                <span className="font-mono">{broker.commissionRate || 50}%</span>
                              </div>
                            </div>

                            {/* Assigned Properties Preview */}
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-stone-500 font-bold">الشقق المسندة له ({assignedCount}):</span>
                              {assignedCount === 0 ? (
                                <span className="text-xs text-stone-400 italic">لم يتم إسناد شقق بعد</span>
                              ) : (
                                broker.assignedPropertyIds?.slice(0, 6).map(code => (
                                  <span key={code} className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                                    {code}
                                  </span>
                                ))
                              )}
                              {assignedCount > 6 && (
                                <span className="text-[10px] text-stone-500 font-bold">
                                  +{assignedCount - 6} شقق أخرى
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          
                          {/* CRITICAL FEATURE: INSPECT PLATFORM AS THIS BROKER */}
                          {onInspectBroker && (
                            <button
                              onClick={() => onInspectBroker(broker.id)}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="معاينة شاشة ومنصة هذا البروكر كما يراها هو تماماً"
                            >
                              <Eye size={14} />
                              <span>معاينة منصته (Inspect View)</span>
                            </button>
                          )}

                          {/* ASSIGN PROPERTIES MODAL BUTTON */}
                          <button
                            onClick={() => setAssigningBroker(broker)}
                            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-stone-200"
                          >
                            <Building size={13} />
                            <span>توزيع الشقق المسندة</span>
                          </button>

                          {/* TOGGLE ACTIVE / SUSPEND */}
                          <button
                            onClick={() => handleToggleBrokerActive(broker.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSuspended 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                          >
                            {isSuspended ? 'تفعيل الحساب' : 'تجميد الحساب'}
                          </button>

                          {/* EDIT BROKER */}
                          <button
                            onClick={() => handleOpenEditBroker(broker)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                            title="تعديل بيانات البروكر"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* DELETE BROKER */}
                          <button
                            onClick={() => handleDeleteBroker(broker.id)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="حذف البروكر"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: REAL ANALYTICS & METRICS                                  */}
          {/* ================================================================ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900">
                    مؤشرات التفاعل والتحليلات الحية
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5 font-medium">
                    تتبع دقيق لمرات المشاهدة، نقرات الواتساب، والاتصال المباشر على مدار الساعة
                  </p>
                </div>
              </div>

              {/* Top Overview Cards - Smoozy & Clean */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">إجمالي المشاهدات</span>
                  <div className="text-2xl font-black font-mono text-stone-900">
                    {formatNumber(analyticsTotals.totalViews)}
                  </div>
                  <p className="text-[11px] text-stone-400">زيارات صفحات الشقق</p>
                </div>

                <div className="bg-white rounded-3xl p-5 space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">نقرات الواتساب</span>
                  <div className="text-2xl font-black font-mono text-emerald-700">
                    {formatNumber(analyticsTotals.totalWhatsapp)}
                  </div>
                  <p className="text-[11px] text-stone-400">طلبات معاينة مباشرة</p>
                </div>

                <div className="bg-white rounded-3xl p-5 space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">نقرات الاتصال الهاتفي</span>
                  <div className="text-2xl font-black font-mono text-sky-700">
                    {formatNumber(analyticsTotals.totalCalls)}
                  </div>
                  <p className="text-[11px] text-stone-400">مكالمات صوتية للسيلز</p>
                </div>

                <div className="bg-white rounded-3xl p-5 space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <span className="text-stone-400 text-xs font-medium">إجمالي قيمة المحفظة</span>
                  <div className="text-xl font-black font-mono text-stone-900 truncate">
                    {formatPrice(analyticsTotals.totalValue)} ج.م
                  </div>
                  <p className="text-[11px] text-stone-400">قيمة الشقق المتاحة</p>
                </div>
              </div>

              {/* Top Performing Units */}
              <div className="bg-white rounded-3xl p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <h4 className="text-sm font-black text-stone-900">الشقق الأكثر طلباً وتفاعلاً بالهضبة الوسطى</h4>
                
                <div className="space-y-2.5">
                  {topProperties.map((prop, idx) => (
                    <div
                      key={prop.id}
                      className="p-4 bg-stone-50/80 rounded-2xl flex items-center justify-between gap-3 text-xs hover:bg-stone-100/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-stone-200 text-stone-800 font-bold font-mono flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <strong className="text-stone-900 font-bold block">{prop.title}</strong>
                          <span className="text-[11px] text-stone-400 font-medium">{prop.code} &bull; {prop.neighborhood}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-emerald-700 font-mono font-bold flex items-center gap-1">
                          <MessageCircle size={14} /> {prop.clicks?.whatsapp || 0}
                        </span>
                        <span className="text-stone-500 font-mono flex items-center gap-1">
                          <Eye size={14} /> {prop.clicks?.views || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB: MARKET PRICING & CLOSED DEALS (خريطة الأسعار والصفقات)       */}
          {/* ================================================================ */}
          {activeTab === 'market_pricing' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              
              {/* 1. Neighborhood Price Map Table (خريطة أسعار المتر) */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#ECE8DF] shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE8DF]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] flex items-center justify-center">
                      <Compass size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-readex text-[#141414]">
                        مؤشر أسعار المتر لكل حي (خريطة الأسعار وحاسبة التقييم)
                      </h3>
                      <p className="text-xs text-[#6B665C]">
                        عدل متوسط سعر المتر (متشطب ونصف تشطيب) ليتم حسابه تلقائياً في حاسبة "كام تستاهل شقتك؟" وخريطة الأسعار.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#ECE8DF] text-[#6B665C] font-bold bg-[#F6F4EF]/50">
                        <th className="p-3 font-readex">الحي</th>
                        <th className="p-3">متوسط سعر المتر (متشطب)</th>
                        <th className="p-3">متوسط سعر المتر (نصف تشطيب)</th>
                        <th className="p-3">درجة النشاط (Heat Score)</th>
                        <th className="p-3">أبرز المعالم والخدمات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE8DF]">
                      {priceMapList.map((district) => (
                        <tr key={district.neighborhood} className="hover:bg-[#FAF4E5]/30 transition-colors">
                          <td className="p-3 font-bold font-readex text-[#141414]">
                            {district.neighborhood}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step={100}
                                value={district.avgFinishedPrice}
                                onChange={(e) => handleUpdatePriceRow(district.neighborhood, 'avgFinishedPrice', Number(e.target.value))}
                                className="w-28 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-2.5 py-1.5 font-bold font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#A07A26]"
                              />
                              <span className="text-[11px] text-[#6B665C]">ج.م/م²</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step={100}
                                value={district.avgSemiFinishedPrice}
                                onChange={(e) => handleUpdatePriceRow(district.neighborhood, 'avgSemiFinishedPrice', Number(e.target.value))}
                                className="w-28 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-2.5 py-1.5 font-bold font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#A07A26]"
                              />
                              <span className="text-[11px] text-[#6B665C]">ج.م/م²</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA]">
                              {district.heatScore}/10
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-[#6B665C] max-w-xs truncate">
                            {district.keyLandmarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Recently Closed Deals Management (صفقات حقيقية اتقفلت) */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#ECE8DF] shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE8DF]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-readex text-[#141414]">
                        إدارة الصفقات المغلقة (اتباعت مؤخراً)
                      </h3>
                      <p className="text-xs text-[#6B665C]">
                        تظهر هذه الصفقات في قسم "صفقات حقيقية اتقفلت" لتعزيز ثقة المشترين والملاك.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsNewDealModalOpen(true)}
                    className="px-4 py-2 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>إضافة صفقة بيع جديدة</span>
                  </button>
                </div>

                {/* Closed Deals Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {closedDealsList.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-4 rounded-2xl border border-[#ECE8DF] bg-[#F6F4EF]/40 flex items-center justify-between gap-3 hover:border-stone-400 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-readex text-sm text-[#141414]">
                            {deal.neighborhood}
                          </span>
                          <span className="text-xs text-[#6B665C]">
                            ({deal.area} م²)
                          </span>
                          <span className="text-[10px] bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] font-bold px-2 py-0.5 rounded-md">
                            {deal.timeframeLabel}
                          </span>
                        </div>

                        <div className="text-xs text-[#4A463F] flex items-center gap-3 pt-0.5">
                          <span className="font-bold font-mono text-[#141414]">{formatPrice(deal.price)} ج.م</span>
                          <span>• في {deal.daysToClose} يوم</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteClosedDeal(deal.id)}
                        className="p-2 text-[#6B665C] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف الصفقة"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* New Closed Deal Popup Modal */}
          {isNewDealModalOpen && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-right space-y-5 shadow-2xl border border-[#ECE8DF] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE8DF]">
                  <h3 className="text-base font-bold font-readex text-[#141414]">
                    إضافة صفقة بيع تمت بنجاح
                  </h3>
                  <button onClick={() => setIsNewDealModalOpen(false)} className="text-stone-400 hover:text-[#141414]">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveNewDeal} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#4A463F] font-bold mb-1">الحي:</label>
                    <select
                      value={dealForm.neighborhood}
                      onChange={(e) => setDealForm({ ...dealForm, neighborhood: e.target.value as any })}
                      className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-[#141414] font-bold focus:outline-none"
                    >
                      {HADABA_WOSTA_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4A463F] font-bold mb-1">المساحة (م²):</label>
                      <input
                        type="number"
                        required
                        value={dealForm.area}
                        onChange={(e) => setDealForm({ ...dealForm, area: Number(e.target.value) })}
                        className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-[#141414] font-bold font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#4A463F] font-bold mb-1">سعر البيع الإجمالي (ج.م):</label>
                      <input
                        type="number"
                        step={50000}
                        required
                        value={dealForm.price}
                        onChange={(e) => setDealForm({ ...dealForm, price: Number(e.target.value) })}
                        className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-[#141414] font-bold font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4A463F] font-bold mb-1">مدة الإغلاق (أيام):</label>
                      <input
                        type="number"
                        value={dealForm.daysToClose}
                        onChange={(e) => setDealForm({ ...dealForm, daysToClose: Number(e.target.value) })}
                        className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-[#141414] font-bold font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#4A463F] font-bold mb-1">وسم التوقيت:</label>
                      <input
                        type="text"
                        value={dealForm.timeframeLabel}
                        onChange={(e) => setDealForm({ ...dealForm, timeframeLabel: e.target.value })}
                        placeholder="اتباعت الأسبوع ده"
                        className="w-full bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl px-3.5 py-2.5 text-[#141414] font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#141414] hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer"
                    >
                      حفظ الصفقة المغلقة
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewDealModalOpen(false)}
                      className="px-4 py-3 bg-[#F6F4EF] text-[#6B665C] font-bold rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: SETTINGS & BANNER                                         */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Admin Credentials */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Key size={16} />
                  </div>
                  <h4 className="text-sm font-black text-stone-900">بيانات تسجيل دخول الأدمن</h4>
                </div>

                <form onSubmit={handleUpdateCredentialsSubmit} className="space-y-3.5 text-xs max-w-lg pt-1">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1.5">البريد الإلكتروني للأدمن:</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-stone-50/80 rounded-2xl px-4 py-2.5 text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1.5">كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية):</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-stone-50/80 rounded-2xl px-4 py-2.5 text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-sm transition-all cursor-pointer"
                  >
                    تحديث بيانات الأدمن
                  </button>
                </form>
              </div>

              {/* Banner Image Customizer */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ImageIcon size={16} />
                  </div>
                  <h4 className="text-sm font-black text-stone-900">رفع وتغيير صورة البانر</h4>
                </div>

                {/* Current Banner Preview */}
                {bannerPhotoUrl && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-stone-500 block">الصورة الحالية للبانر:</span>
                    <div className="h-44 w-full rounded-2xl overflow-hidden bg-stone-950 relative shadow-xs">
                      <img
                        src={bannerPhotoUrl}
                        alt="صورة البانر الحالية"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* File Upload from Device */}
                  <label className="bg-stone-50/80 hover:bg-amber-50/40 rounded-3xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                      <Upload size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 block">رفع صورة من جهازك</span>
                      <span className="text-[11px] text-stone-400">اختر صورة (JPG, PNG, WEBP)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Direct Image URL */}
                  <form onSubmit={handleSaveBannerUrl} className="bg-stone-50/80 rounded-3xl p-5 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">أو إدخال رابط الصورة مباشرة:</label>
                      <input
                        type="url"
                        value={bannerUrlInput}
                        onChange={(e) => setBannerUrlInput(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-white rounded-2xl px-4 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!bannerUrlInput.trim()}
                      className="w-full py-2.5 bg-stone-900 hover:bg-black disabled:bg-stone-300 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      تطبيق رابط الصورة
                    </button>
                  </form>
                </div>
              </div>

              {/* Official Brand Logo Customizer */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900">شعار المنصة واللوجو الرسمي (Brand Logo)</h4>
                      <p className="text-[11px] text-stone-400">يتم حفظ اللوجو سحابياً في Firebase ليعمل فوراً على الموبايل، الديسكتوب، وبعد النشر</p>
                    </div>
                  </div>

                  {customLogoUrl && onResetLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetLogo();
                        showToast('تمت استعادة الشعار الافتراضي');
                      }}
                      className="text-[11px] text-stone-500 hover:text-rose-600 font-bold underline transition-colors cursor-pointer"
                    >
                      استعادة الشعار الأصلي
                    </button>
                  )}
                </div>

                {/* Current Logo Preview */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <LionLogo size={48} customLogoUrl={customLogoUrl} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 block">
                        {customLogoUrl ? 'شعار مخصص محفوظ سحابياً' : 'شعار أيقونة الأسد الافتراضية'}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {customLogoUrl ? 'يظهر هذا الشعار لجميع الزوار والمستخدمين في الهيدر والفوتر' : 'يمكنك رفع شعار شركتك الآن بصيغة PNG أو JPG أو إدخال رابط مباشر'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* File Upload from Device */}
                  <label className="bg-stone-50/80 hover:bg-amber-50/40 rounded-3xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center border border-stone-200/60 hover:border-amber-400">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                      <Upload size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 block">رفع صورة الشعار من جهازك</span>
                      <span className="text-[11px] text-stone-400">اختر صورة شفافة أو بخلفية (PNG, JPG)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Direct Image URL */}
                  <form onSubmit={handleSaveLogoUrl} className="bg-stone-50/80 rounded-3xl p-5 flex flex-col justify-between gap-3 border border-stone-200/60">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">أو إدخال رابط صورة اللوجو مباشرة:</label>
                      <input
                        type="url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-white rounded-2xl px-4 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!logoUrlInput.trim()}
                      className="w-full py-2.5 bg-stone-900 hover:bg-black disabled:bg-stone-300 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      حفظ وتطبيق رابط اللوجو
                    </button>
                  </form>
                </div>
              </div>

              {/* CARD 3: FOOTER & CONTACT INFO SETTINGS */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900">إعدادات الفوتر والعناوين ومعلومات التواصل (Footer End)</h3>
                      <p className="text-xs text-stone-500">تحكم كامل في نصوص أسفل الموقع، عنوان الفرع، مواعيد العمل، وأرقام التواصل الرسمية</p>
                    </div>
                  </div>

                  {onResetFooterConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetFooterConfig();
                        showToast('تمت استعادة نصوص الفوتر الافتراضية');
                      }}
                      className="text-[11px] text-stone-500 hover:text-rose-600 font-bold underline transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      استعادة الافتراضي
                    </button>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (onUpdateFooterConfig) {
                      onUpdateFooterConfig(footerForm);
                      showToast('تم حفظ وتحديث نصوص الفوتر والعناوين سحابياً بنجاح');
                    }
                  }}
                  className="space-y-4"
                >
                  {/* 1. Branch Address */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                      <MapPin size={14} className="text-amber-700" />
                      <span>عنوان المقر / الفرع (المعروض في أسفل الموقع):</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={footerForm.branchAddress || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, branchAddress: e.target.value })}
                      placeholder="مثال: فرع الهضبة الوسطى: الحي الثاني، بجوار مدرسة منارة المستقبل، المقطم"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  {/* 2. Working Hours & Tagline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-700" />
                        <span>مواعيد العمل الرسمية:</span>
                      </label>
                      <input
                        type="text"
                        value={footerForm.workingHours || ''}
                        onChange={(e) => setFooterForm({ ...footerForm, workingHours: e.target.value })}
                        placeholder="مثال: مواعيد العمل: يومياً من 10:00 ص حتى 10:00 م"
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-700" />
                        <span>الشعار التعريفي / التاج لاين (Tagline):</span>
                      </label>
                      <input
                        type="text"
                        value={footerForm.tagline || ''}
                        onChange={(e) => setFooterForm({ ...footerForm, tagline: e.target.value })}
                        placeholder="مثال: بوابة ريسيل الهضبة الوسطى • قمة جبل المقطم"
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  {/* 3. About Text in Footer */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5">
                      النبذة التعريفية للمنصة في الفوتر:
                    </label>
                    <textarea
                      rows={2}
                      value={footerForm.aboutText || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, aboutText: e.target.value })}
                      placeholder="المنصة المتخصصة الأولى في تسويق وإدارة شقق الريسيل بالهضبة الوسطى..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    />
                  </div>

                  {/* 4. Phone & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                        <Phone size={14} className="text-amber-700" />
                        <span>رقم الهاتف المباشر للاتصال:</span>
                      </label>
                      <input
                        type="text"
                        value={footerForm.phone || ''}
                        onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })}
                        placeholder="01021242871"
                        dir="ltr"
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                        <MessageCircle size={14} className="text-emerald-600" />
                        <span>رقم الواتساب الرسمي:</span>
                      </label>
                      <input
                        type="text"
                        value={footerForm.whatsapp || ''}
                        onChange={(e) => setFooterForm({ ...footerForm, whatsapp: e.target.value })}
                        placeholder="01021242871"
                        dir="ltr"
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-right"
                      />
                    </div>
                  </div>

                  {/* 5. Copyright Text */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1.5">
                      نص حقوق الملكية والنشر (Copyright):
                    </label>
                    <input
                      type="text"
                      value={footerForm.copyrightText || ''}
                      onChange={(e) => setFooterForm({ ...footerForm, copyrightText: e.target.value })}
                      placeholder="مثال: السبع للعقارات (El Seba Real Estate). جميع الحقوق محفوظة."
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-stone-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 size={16} className="text-amber-400" />
                      <span>حفظ وتطبيق تعديلات الفوتر ومعلومات التواصل سحابياً</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

        {/* MODAL: ADD/EDIT SALES AGENT */}
        {isAgentModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white border border-stone-200 p-5 sm:p-6 rounded-3xl w-full max-w-md space-y-4 text-right shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-amber-700" />
                  <h4 className="text-sm font-extrabold text-stone-900">
                    {editingAgentId ? 'تعديل حساب مسؤول المبيعات' : 'إضافة مسؤول مبيعات جديد'}
                  </h4>
                </div>
                <button onClick={() => setIsAgentModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAgent} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-800 font-bold mb-1">الاسم بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={agentFormData.name}
                    onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                    placeholder="مثال: م. أحمد السبع"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-stone-800 font-bold mb-1">البريد الإلكتروني المهني:</label>
                    <input
                      type="email"
                      required
                      value={agentFormData.email}
                      onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
                      placeholder="ahmed@lion-estates.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      * يتم تسجيل الدخول عبر حساب Firebase Authentication الآمن مباشرة بدون تخزين كلمات مرور غير مشفرة.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-800 font-bold mb-1">رقم الهاتف:</label>
                    <input
                      type="text"
                      value={agentFormData.phone}
                      onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
                      placeholder="010XXXXXXXX"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-800 font-bold mb-1">رقم الواتساب:</label>
                    <input
                      type="text"
                      value={agentFormData.whatsapp}
                      onChange={(e) => setAgentFormData({ ...agentFormData, whatsapp: e.target.value })}
                      placeholder="2010XXXXXXXX"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-800 font-bold mb-1">الدور الوظيفي:</label>
                    <select
                      value={agentFormData.role}
                      onChange={(e) => setAgentFormData({ ...agentFormData, role: e.target.value as any })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-900"
                    >
                      <option value="sales_agent">مستشار عقاري (Sales Agent)</option>
                      <option value="team_leader">قائد فريق (Team Leader)</option>
                      <option value="sales_manager">مدير مبيعات (Sales Manager)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-800 font-bold mb-1">نسبة العمولة (%):</label>
                    <input
                      type="number"
                      value={agentFormData.commissionRate}
                      onChange={(e) => setAgentFormData({ ...agentFormData, commissionRate: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    {editingAgentId ? 'حفظ التعديلات' : 'إنشاء الحساب فوراً'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAgentModalOpen(false)}
                    className="px-4 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT BROKER */}
        {isBrokerModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white border border-stone-200 p-5 sm:p-6 rounded-3xl w-full max-w-md space-y-4 text-right shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Briefcase size={18} className="text-[#A07A26]" />
                  <h4 className="text-sm font-extrabold text-stone-900">
                    {editingBrokerId ? 'تعديل بيانات الوسيط / المكتب الشريك' : 'إضافة وسيط أو مكتب شريك جديد'}
                  </h4>
                </div>
                <button onClick={() => setIsBrokerModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveBroker} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-800 font-bold mb-1">اسم البروكر أو مسؤول المكتب:</label>
                  <input
                    type="text"
                    required
                    value={brokerFormData.name}
                    onChange={(e) => setBrokerFormData({ ...brokerFormData, name: e.target.value })}
                    placeholder="مثال: أ/ أحمد فؤاد"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div>
                  <label className="block text-stone-800 font-bold mb-1">اسم الشركة أو المكتب العقاري:</label>
                  <input
                    type="text"
                    value={brokerFormData.companyName}
                    onChange={(e) => setBrokerFormData({ ...brokerFormData, companyName: e.target.value })}
                    placeholder="مثال: شركة النخبة للتسويق العقاري أو وسيط مستقل"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-800 font-bold mb-1">البريد الإلكتروني الخاص به:</label>
                    <input
                      type="email"
                      required
                      value={brokerFormData.email}
                      onChange={(e) => setBrokerFormData({ ...brokerFormData, email: e.target.value })}
                      placeholder="ahmed@broker.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-[#A07A26]"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-800 font-bold mb-1">كلمة المرور الخاصة به:</label>
                    <input
                      type="text"
                      required
                      value={brokerFormData.password}
                      onChange={(e) => setBrokerFormData({ ...brokerFormData, password: e.target.value })}
                      placeholder="broker123"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-[#A07A26]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-800 font-bold mb-1">رقم الهاتف والواتساب:</label>
                    <input
                      type="text"
                      required
                      value={brokerFormData.phone}
                      onChange={(e) => setBrokerFormData({ ...brokerFormData, phone: e.target.value })}
                      placeholder="010XXXXXXXX"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-[#A07A26]"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-800 font-bold mb-1">نسبة عمولته من إجمالي السبع (%):</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={brokerFormData.commissionRate}
                      onChange={(e) => setBrokerFormData({ ...brokerFormData, commissionRate: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-[#A07A26]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-800 font-bold mb-1">ملاحظات إدارية خاصة:</label>
                  <textarea
                    rows={2}
                    value={brokerFormData.notes}
                    onChange={(e) => setBrokerFormData({ ...brokerFormData, notes: e.target.value })}
                    placeholder="شريك استراتيجي في الدبلوماسيين والنرجس..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-stone-900 resize-none focus:outline-none focus:border-[#A07A26]"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                  <input
                    type="checkbox"
                    id="brokerIsActive"
                    checked={brokerFormData.isActive}
                    onChange={(e) => setBrokerFormData({ ...brokerFormData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#A07A26] focus:ring-[#A07A26]"
                  />
                  <label htmlFor="brokerIsActive" className="text-xs text-stone-800 font-bold cursor-pointer">
                    حساب نشط ومفعل (يمكنه تسجيل الدخول واستلام المعاينات فوراً)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#A07A26] hover:bg-[#8A671F] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {editingBrokerId ? 'حفظ تعديلات البروكر' : 'اعتماد وإنشاء حساب البروكر'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBrokerModalOpen(false)}
                    className="px-4 py-2.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ASSIGN PROPERTIES CHECKLIST TO BROKER */}
        {assigningBroker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-stone-950/60 backdrop-blur-xs">
            <div className="bg-white border border-stone-200 p-5 sm:p-6 rounded-3xl w-full max-w-2xl space-y-4 text-right shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
              
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Building size={18} className="text-[#A07A26]" />
                    <h4 className="text-sm sm:text-base font-extrabold text-stone-900">
                      توزيع الشقق المسندة للوسيط: {assigningBroker.name}
                    </h4>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    حدد الشقق التي يحق لهذا البروكر فقط الاطلاع عليها، إدارة مواعيدها، وتحصيل أرباحها
                  </p>
                </div>
                <button onClick={() => setAssigningBroker(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Counter & Bulk Actions */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200/80 shrink-0 text-xs">
                <div className="font-bold text-stone-800">
                  تم تحديد <span className="text-[#A07A26] font-mono text-sm font-black">{assigningBroker.assignedPropertyIds?.length || 0}</span> من أصل <span className="font-mono">{properties.length}</span> شقة متاحة
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allCodes = properties.map(p => p.code || p.id);
                      const updatedBroker = {
                        ...assigningBroker,
                        assignedPropertyIds: allCodes,
                        assignedUnitsCount: allCodes.length
                      };
                      setAssigningBroker(updatedBroker);
                      syncBrokers(brokersState.map(b => b.id === assigningBroker.id ? updatedBroker : b));
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-bold text-[11px] cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedBroker = {
                        ...assigningBroker,
                        assignedPropertyIds: [],
                        assignedUnitsCount: 0
                      };
                      setAssigningBroker(updatedBroker);
                      syncBrokers(brokersState.map(b => b.id === assigningBroker.id ? updatedBroker : b));
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-bold text-[11px] cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Scrollable list of properties */}
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {properties.map((prop) => {
                  const propIdentifier = prop.code || prop.id;
                  const isChecked = assigningBroker.assignedPropertyIds?.includes(propIdentifier);

                  return (
                    <div
                      key={prop.id}
                      onClick={() => handleToggleAssignProperty(propIdentifier)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked 
                          ? 'bg-[#FAF6ED] border-[#D9B864] shadow-2xs' 
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded text-[#A07A26] focus:ring-[#A07A26] pointer-events-none"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                              {prop.code}
                            </span>
                            <span className="text-xs font-bold text-stone-900">{prop.title}</span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                            <span>{prop.neighborhood}</span>
                            <span>•</span>
                            <span>{prop.area} م²</span>
                            <span>•</span>
                            <span className="font-mono font-bold text-[#A07A26]">{prop.price.toLocaleString()} ج.م</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        isChecked ? 'bg-[#A07A26] text-white' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {isChecked ? 'مسندة له' : 'غير مسندة'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAssigningBroker(null);
                    showToast('تم حفظ توزيع الشقق بنجاح');
                  }}
                  className="px-6 py-2.5 bg-[#A07A26] hover:bg-[#8A671F] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  تم واعتماد التوزيع
                </button>
              </div>

            </div>
          </div>
        )}

        {/* EXCEL IMPORT & DATABASE MODAL */}
        <ExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          currentProperties={properties}
          onImport={(imported, mode) => {
            if (onImportProperties) {
              onImportProperties(imported, mode);
            }
            showToast(`تم استيراد ${imported.length} شقة بنجاح`);
          }}
          onClearAllProperties={onClearAllProperties}
          onRestoreDemoProperties={onRestoreDemoProperties}
          adminPassword={adminCredentials?.password || ''}
        />

        {/* IN-APP CONFIRMATION MODAL FOR CLEARING ALL PROPERTIES */}
        {isConfirmClearModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-stone-900">تأكيد مسح كافة الشقق</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  هل أنت متأكد من مسح وتفريغ جميع الشقق ({properties.length} شقة) نهائياً من المعرض وقاعدة البيانات؟
                  <br />
                  <span className="text-rose-600 font-bold">هذا الإجراء سيفرغ المعرض تماماً لتتمكن من رفع شيت الإكسيل الجديد.</span>
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={isClearingInProgress}
                  onClick={async () => {
                    setIsClearingInProgress(true);
                    try {
                      if (onClearAllProperties) {
                        await onClearAllProperties();
                      }
                      showToast('تم مسح وتفريغ جميع الشقق بنجاح من المعرض وقاعدة البيانات');
                      setIsConfirmClearModalOpen(false);
                    } catch (err) {
                      console.error(err);
                      showToast('حدث خطأ أثناء المسح');
                    } finally {
                      setIsClearingInProgress(false);
                    }
                  }}
                  className="w-full sm:flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  <span>{isClearingInProgress ? 'جارٍ المسح...' : 'نعم، امسح كل الشقق الآن'}</span>
                </button>
                <button
                  type="button"
                  disabled={isClearingInProgress}
                  onClick={() => setIsConfirmClearModalOpen(false)}
                  className="w-full sm:w-auto py-3 px-6 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
      <AccountsManagerModal isOpen={isAccountsOpen} onClose={() => setIsAccountsOpen(false)} showToast={showToast} />
      <ChangePasswordModal isOpen={isChangePassOpen} onClose={() => setIsChangePassOpen(false)} />
    </div>
  );
};
