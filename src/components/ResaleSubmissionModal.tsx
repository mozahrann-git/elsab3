import { auth, getStaffAccess, StaffAccess } from '../services/firebaseService';
import { registerPortalAccount, PORTAL_DOMAIN, cleanUsername } from '../services/portalService';
import React, { useEffect, useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Building, 
  MapPin, 
  Upload, 
  Phone, 
  User, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Navigation, 
  UserCheck, 
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { OwnerSubmission, HadabaWostaNeighborhood, FinishingType, PropertyType } from '../types';
import { generateWhatsAppLink, compressImage } from '../utils/helpers';

interface ResaleSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submission: OwnerSubmission) => void;
}

const DEFAULT_SUBMISSION_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
];

const INSPECTION_ROLES = [
  { id: 'owner', label: 'المالك نفسه' },
  { id: 'guard', label: 'حارس العقار (البواب)' },
  { id: 'partner', label: 'شريك / قريب المالك' },
  { id: 'broker', label: 'وسيط / سمسار' },
  { id: 'tenant', label: 'المستأجر الحالي' },
  { id: 'agent', label: 'وكيل مفوض' }
];

const VIEWING_QUICK_PRESETS = [
  'طوال أيام الأسبوع بعد الساعة 5 مساءً',
  'الجمعة والسبت من 2 ظهراً حتى 8 مساءً',
  'الشقة خالية ومفتاحها متاح للمعاينة فوراً مع البواب',
  'متاح أي وقت بالتنسيق الهاتفي المسبق بساعتين'
];

export const ResaleSubmissionModal: React.FC<ResaleSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [acctEmail, setAcctEmail] = useState('');   // اسم المستخدم (من غير الدومين)
  const [acctRole, setAcctRole] = useState<'owner' | 'broker'>('owner');
  const [acctPass, setAcctPass] = useState('');
  const [acctError, setAcctError] = useState('');
  const [portalAcct, setPortalAcct] = useState<StaffAccess | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const u = auth.currentUser;
    if (u && !u.isAnonymous) getStaffAccess(u.email).then((a) => setPortalAcct(a && (a.role === 'owner' || a.role === 'broker') ? a : null));
    else setPortalAcct(null);
  }, [isOpen]);

  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    whatsapp: '',
    neighborhood: HADABA_WOSTA_NEIGHBORHOODS[0] as HadabaWostaNeighborhood,
    unitType: 'apartment' as PropertyType,
    area: 140,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    finishing: 'finished' as FinishingType,
    askingPrice: 3200000,
    paymentMethod: 'cash' as 'cash' | 'cash_or_facilities',
    unitDescription: '',
    exactLocation: '',
    googleMapsUrl: '',
    viewingSchedule: 'طوال أيام الأسبوع بعد الساعة 5 مساءً',
    inspectionContactPhone: '',
    inspectionContactRole: 'المالك نفسه',
    images: [] as string[]
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<OwnerSubmission | null>(null);

  if (!isOpen) return null;

  const processFiles = async (files: FileList | File[]) => {
    // Allow files that have image mime type OR image file extensions (handles mobile browsers where f.type can be empty)
    const fileList = Array.from(files).filter(f => 
      !f.type || f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(f.name)
    );
    if (fileList.length === 0) return;

    setIsProcessingPhotos(true);
    try {
      const compressedList = await Promise.all(
        fileList.map(async (file) => {
          try {
            return await compressImage(file);
          } catch {
            return '';
          }
        })
      );

      const valid = compressedList.filter(Boolean);
      if (valid.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...valid]
        }));
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleClearImages = () => {
    setFormData(prev => ({
      ...prev,
      images: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcctError('');
    // حساب البوابة: لو داخل بالفعل كمالك/بروكر نستخدم حسابه، غير كده نعمله حساب جديد
    let ownerEmail = portalAcct?.email;
    let brokerId = portalAcct?.role === 'broker' ? portalAcct.brokerId : undefined;
    if (!ownerEmail) {
      if (!acctEmail.trim()) { setAcctError('اعمل حسابك عشان تتابع شقتك'); return; }
      if (acctPass.trim().length < 6) { setAcctError('الباسوورد لازم 6 حروف أو أكتر'); return; }
      try {
        const r = await registerPortalAccount(acctRole, acctEmail, acctPass, formData.ownerName, formData.phone);
        ownerEmail = r.email;
        brokerId = r.brokerId;
      } catch (err: any) {
        const code = String(err?.code || '');
        setAcctError(code.includes('email-already-in-use') ? 'اسم المستخدم ده محجوز. اختار اسم تاني، أو سجّل دخول لو ده حسابك.' : code.includes('admin-restricted') || code.includes('operation-not-allowed') ? 'التسجيل مقفول حالياً. كلّم الإدارة.' : (err?.message || 'مقدرناش نعمل الحساب. جرّب تاني.'));
        return;
      }
    }

    const finalImages = formData.images;

    const newSub: OwnerSubmission = {
      id: `sub-${Date.now()}`,
      ownerName: formData.ownerName,
      phone: formData.phone,
      ownerPhone: formData.phone,
      whatsapp: formData.whatsapp || formData.phone,
      neighborhood: formData.neighborhood,
      unitType: formData.unitType,
      area: Number(formData.area),
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      floor: formData.floor,
      finishing: formData.finishing,
      askingPrice: Number(formData.askingPrice),
      price: Number(formData.askingPrice),
      paymentMethod: formData.paymentMethod,
      unitDescription: formData.unitDescription,
      exactLocation: formData.exactLocation.trim() || undefined,
      googleMapsUrl: formData.googleMapsUrl.trim() || undefined,
      viewingSchedule: formData.viewingSchedule.trim() || undefined,
      inspectionContactPhone: formData.inspectionContactPhone.trim() || undefined,
      inspectionContactRole: formData.inspectionContactRole.trim() || undefined,
      images: finalImages,
      status: 'pending',
      ownerEmail,
      brokerId,
      submittedAtMs: Date.now(),
      submittedAt: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
    };

    onSubmit(newSub);
    setSubmittedData(newSub);
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setSubmittedData(null);
    onClose();
  };

  const whatsappVideoMessage = submittedData 
    ? `مرحباً شركة السبع للعقارات، أنا المالك (${submittedData.ownerName})، قمت بعرض شقتي في (${submittedData.neighborhood}) مساحة ${submittedData.area}م بسعر ${submittedData.askingPrice} ج.م، وأود إرسال فيديو الشقة وجولة المعاينة لكم هنا عبر الواتساب.`
    : `مرحباً شركة السبع للعقارات، أنا مالك شقة بالهضبة الوسطى وأود إرسال فيديو جولة المعاينة للشقة لكم عبر الواتساب.`;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/90 backdrop-blur-md overflow-hidden text-right font-sans flex flex-col" dir="rtl">
      <div className="w-full h-full bg-stone-100 flex flex-col overflow-hidden">
        
        {/* Full Screen Top Header Bar */}
        <header className="px-4 sm:px-8 py-3.5 sm:py-4 bg-white border-b border-stone-200/80 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-800 shrink-0 shadow-2xs">
              <Building size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-stone-900 tracking-tight">
                  نموذج عرض شقة للبيع بالهضبة الوسطى (للمُلاك)
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                  تسويق مباشر ومعاينات منظمة
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium line-clamp-1">
                شركة السبع للاستثمار العقاري — إدارة تسويق ريسيل الهضبة الوسطى
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAndClose}
              className="py-2 px-3 sm:px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <X size={17} />
              <span className="hidden sm:inline">إلغاء وإغلاق</span>
            </button>
          </div>
        </header>

        {submitted ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-xl border border-stone-200/80 my-auto animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/10">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  تم استلام بيانات شقتك ومواعيد المعاينة بنجاح!
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                  تم تسجيل وحدتك في لوحة تحكم إدارة شركة السبع، وسيتواصل معك مستشارنا العقاري فوراً لمراجعة المعاينات والتسويق للمشترين الجادين.
                </p>
              </div>

              {/* Direct WhatsApp Video Sending Box */}
              <div className="p-5 bg-emerald-50/80 rounded-3xl border border-emerald-200/80 text-right space-y-3 shadow-2xs">
                <div className="flex items-center gap-2.5 text-emerald-950 font-black text-sm">
                  <MessageCircle size={18} className="text-emerald-700 shrink-0" />
                  <span>هل لديك فيديو أو جولة مصورة للشقة؟</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  يمكنك إرسال فيديو المعاينة بجودة كاملة وسرعة مباشرة إلى محادثة الواتساب الخاصة بإدارة السبع للعقارات:
                </p>
                
                <a
                  href={generateWhatsAppLink('01021242871', undefined, undefined, whatsappVideoMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <MessageCircle size={18} />
                  <span>إرسال فيديو الشقة عبر الواتساب الآن</span>
                </a>
              </div>

              <div className="pt-2">
                <button
                  onClick={resetAndClose}
                  className="w-full sm:w-auto py-3 px-8 bg-stone-900 hover:bg-black text-white text-xs font-black rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  العودة لمعرض الشقق
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-12">
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Owner Contact Details */}
                <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-stone-900 font-black text-sm sm:text-base border-b border-stone-100 pb-3">
                    <User size={18} className="text-amber-600" />
                    <span>بيانات المالك للتواصل والتنسيق:</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">اسم المالك بالكامل *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: أ/ محمد زهران"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-medium border border-stone-200/70"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">رقم الهاتف والواتساب الأساسي *</label>
                      <input
                        type="tel"
                        required
                        placeholder="010XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono font-medium border border-stone-200/70"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Unit Specs & Financials */}
                <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-stone-900 font-black text-sm sm:text-base border-b border-stone-100 pb-3">
                    <Building size={18} className="text-amber-600" />
                    <span>مواصفات الشقة والسعر المطلوب:</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">الحي بالهضبة الوسطى *</label>
                      <select
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value as HadabaWostaNeighborhood })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-bold border border-stone-200/70 cursor-pointer"
                      >
                        {HADABA_WOSTA_NEIGHBORHOODS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">نوع التشطيب *</label>
                      <select
                        value={formData.finishing}
                        onChange={(e) => setFormData({ ...formData, finishing: e.target.value as FinishingType })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-bold border border-stone-200/70 cursor-pointer"
                      >
                        <option value="finished">متشطب بالكامل (سوبر لوكس)</option>
                        <option value="semi_finished">نصف تشطيب (محارة وحلوق وسباكة)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">عدد الغرف *</label>
                      <select
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-bold border border-stone-200/70 cursor-pointer"
                      >
                        <option value={2}>غرفتين نوم (2)</option>
                        <option value={3}>٣ غرف نوم (3)</option>
                        <option value={4}>٤ غرف نوم (4)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">المساحة (م²) *</label>
                      <input
                        type="number"
                        required
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-bold border border-stone-200/70"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">الدور *</label>
                      <input
                        type="text"
                        placeholder="مثال: الدور الثالث"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium border border-stone-200/70"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-700 mb-1.5 block font-bold">السعر المطلوب (ج.م) *</label>
                      <input
                        type="number"
                        step={50000}
                        required
                        value={formData.askingPrice}
                        onChange={(e) => setFormData({ ...formData, askingPrice: Number(e.target.value) })}
                        className="w-full py-3 px-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-black font-mono border border-stone-200/70"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. EXACT LOCATION & MAP DETAILS */}
                <div className="p-5 sm:p-6 bg-amber-500/10 rounded-3xl border border-amber-200/80 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2 text-stone-900 font-black text-sm sm:text-base">
                      <MapPin size={18} className="text-amber-700" />
                      <span>لوكيشن وموقع الوحدة بالتحديد (خاص للإدارة والمعاينات):</span>
                    </div>
                    <span className="text-[11px] text-amber-900 font-bold bg-amber-200/70 px-3 py-1 rounded-full">
                      سري ومحمي داخل الإدارة
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-stone-800 mb-1.5 block font-bold">
                        العنوان التفصيلي واسم الشارع وأقرب معلم مميز:
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: شارع مدرسة منارة المستقبل، عمارة رقم 15، أمام صيدلية العزبي"
                        value={formData.exactLocation}
                        onChange={(e) => setFormData({ ...formData, exactLocation: e.target.value })}
                        className="w-full py-3 px-4 bg-white rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-medium border border-amber-200/70"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-800 mb-1.5 block font-bold flex items-center gap-1.5">
                        <Navigation size={14} className="text-amber-700" />
                        <span>رابط اللوكيشن على خرائط جوجل (Google Maps URL - اختياري):</span>
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        placeholder="https://maps.google.com/?q=..."
                        value={formData.googleMapsUrl}
                        onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                        className="w-full py-3 px-4 bg-white rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono text-left border border-amber-200/70"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. VIEWING SCHEDULE & INSPECTION CONTACT */}
                <div className="p-5 sm:p-6 bg-emerald-500/10 rounded-3xl border border-emerald-200/80 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-stone-900 font-black text-sm sm:text-base border-b border-emerald-500/20 pb-3">
                    <Calendar size={18} className="text-emerald-700" />
                    <span>مواعيد المعاينة ومسؤول فتح الشقة:</span>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs text-stone-800 mb-1 block font-bold flex items-center gap-1.5">
                      <Clock size={14} className="text-emerald-700" />
                      <span>الأيام والمواعيد المناسبة لاستقبال معاينات المشترين:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: الجمعة والسبت من 2 إلى 8 مساءً، أو يومياً بعد 5م"
                      value={formData.viewingSchedule}
                      onChange={(e) => setFormData({ ...formData, viewingSchedule: e.target.value })}
                      className="w-full py-3 px-4 bg-white rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium border border-emerald-200/70"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {VIEWING_QUICK_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, viewingSchedule: preset })}
                          className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium cursor-pointer ${
                            formData.viewingSchedule === preset
                              ? 'bg-emerald-700 text-white shadow-xs font-bold'
                              : 'bg-white text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 border border-emerald-200/60'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inspection contact & role */}
                  <div className="pt-3 border-t border-emerald-900/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-stone-800 mb-1.5 block font-bold flex items-center gap-1.5">
                        <Phone size={14} className="text-emerald-700" />
                        <span>رقم اتصال إضافي للمعاينات (اختياري):</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="رقم البواب أو الشخص المسؤول عن المفتاح..."
                        value={formData.inspectionContactPhone}
                        onChange={(e) => setFormData({ ...formData, inspectionContactPhone: e.target.value })}
                        className="w-full py-3 px-4 bg-white rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono font-medium border border-emerald-200/70"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-800 mb-1.5 block font-bold flex items-center gap-1.5">
                        <UserCheck size={14} className="text-emerald-700" />
                        <span>صفة مسؤول المعاينة:</span>
                      </label>
                      <select
                        value={formData.inspectionContactRole}
                        onChange={(e) => setFormData({ ...formData, inspectionContactRole: e.target.value })}
                        className="w-full py-3 px-4 bg-white rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold border border-emerald-200/70 cursor-pointer"
                      >
                        {INSPECTION_ROLES.map((role) => (
                          <option key={role.id} value={role.label}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Photos Upload Section */}
                <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                          <ImageIcon size={18} className="text-amber-600" />
                          <span>صور الشقة</span>
                        </h3>
                        {formData.images.length > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                            {formData.images.length} صور مرفقة
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        ارفع صور الشقة مباشرة من جهازك (الريسبشن، الغرف، المطبخ، الحمام، الفيو)
                      </p>
                    </div>

                    {formData.images.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="py-2 px-3.5 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer font-bold transition-all active:scale-95 shadow-xs">
                          <Upload size={13} />
                          <span>إضافة صور أخرى</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileInputChange}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleClearImages}
                          className="py-2 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                        >
                          مسح الكل
                        </button>
                      </div>
                    )}
                  </div>

                  {formData.images.length === 0 ? (
                    /* Clean Drag & Drop Upload Zone */
                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center group ${
                        isDragging
                          ? 'border-amber-600 bg-amber-500/10 scale-[1.01]'
                          : 'border-stone-300 hover:border-amber-500/80 bg-stone-50/70 hover:bg-amber-50/30'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-2xs">
                        <Upload size={24} className="stroke-[2.2]" />
                      </div>
                      <p className="text-sm sm:text-base font-black text-stone-900 mb-1">
                        اضغط هنا لاختيار صور الشقة من جهازك أو اسحب الصور إلى هنا
                      </p>
                      <p className="text-xs text-stone-500 font-medium">
                        يمكنك تحديد صورة واحدة أو عدة صور معاً دفعة واحدة
                      </p>
                      {isProcessingPhotos && (
                        <div className="mt-3 text-xs font-bold text-amber-800 animate-pulse">
                          جارِ معالجة ورفع الصور...
                        </div>
                      )}
                    </label>
                  ) : (
                    /* Photo Gallery Preview without slots */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                        {formData.images.map((img, idx) => (
                          <div 
                            key={idx} 
                            className="group relative aspect-[4/3] bg-stone-200 rounded-2xl overflow-hidden shadow-2xs border border-stone-200/80"
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            {/* Overlay remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-2 left-2 w-7 h-7 rounded-xl bg-stone-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
                              title="حذف هذه الصورة"
                            >
                              <X size={14} />
                            </button>
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-stone-900/70 text-white text-[10px] font-mono font-medium">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}

                        {/* Extra add button card inside grid */}
                        <label 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className="aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-amber-50/40 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileInputChange}
                          />
                          <div className="w-9 h-9 rounded-xl bg-white text-stone-700 group-hover:text-amber-700 flex items-center justify-center mb-1.5 shadow-2xs transition-colors">
                            <Plus size={18} />
                          </div>
                          <span className="text-xs font-bold text-stone-700 group-hover:text-amber-800">
                            إضافة صور
                          </span>
                        </label>
                      </div>

                      {isProcessingPhotos && (
                        <div className="text-xs font-bold text-amber-800 animate-pulse text-center">
                          جارِ معالجة ورفع الصور...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. WHATSAPP VIDEO GUIDANCE (No Video File Upload on Web, Direct WhatsApp Instead) */}
                <div className="p-5 sm:p-6 bg-emerald-50 rounded-3xl border border-emerald-200 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5 text-emerald-950 font-black text-sm sm:text-base">
                    <MessageCircle size={20} className="text-emerald-700 shrink-0" />
                    <span>فيديو الشقة وجولة المعاينة:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                    لتوفير أسرع تجربة وأعلى دقة للفيديو بدون استهلاك باقة الإنترنت، <strong className="text-emerald-900 font-black">يتم إرسال الفيديو مباشرة لمستشارنا العقاري عبر الواتساب</strong> فور إتمام تسجيل البيانات هنا.
                  </p>
                </div>

                {/* 7. Description & Additional Notes */}
                <div className="p-5 sm:p-6 bg-white rounded-3xl border border-stone-200/80 space-y-3 shadow-xs">
                  <label className="text-xs sm:text-sm text-stone-900 block font-black">
                    ملاحظات ومميزات إضافية (المرافق، حصة الجراج، عدادات الغاز والكهرباء):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اذكر حالة عداد الغاز والكهرباء، حصة الجراج والأرض، الفيو، أو تفاصيل العقد والتنازل..."
                    value={formData.unitDescription}
                    onChange={(e) => setFormData({ ...formData, unitDescription: e.target.value })}
                    className="w-full p-4 bg-stone-50 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-medium leading-relaxed border border-stone-200/70"
                  />
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  {/* حساب بوابة الملاك */}
                {portalAcct ? (
                  <div className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E8D3A6] text-sm">الشقة هتتضاف لحسابك <b dir="ltr">{portalAcct.email}</b> وتتابعها من بوابتك.</div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E8D3A6] space-y-3">
                    <p className="font-bold text-sm text-[#141414]">اعمل حسابك عشان تتابع شقتك</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([['owner', 'أنا المالك'], ['broker', 'أنا بروكر']] as const).map(([k, t]) => (
                        <button key={k} type="button" onClick={() => setAcctRole(k)} className={`py-2.5 rounded-xl text-sm font-bold border ${acctRole === k ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF] text-[#6B665C]'}`}>{t}</button>
                      ))}
                    </div>
                    <div className="flex items-stretch rounded-xl overflow-hidden border border-[#ECE8DF] bg-white" dir="ltr">
                      <input value={acctEmail} onChange={(e) => setAcctEmail(cleanUsername(e.target.value))} placeholder="username" autoCapitalize="none" autoCorrect="off" className="flex-1 min-w-0 p-3 text-sm outline-none" />
                      <span className="px-3 flex items-center bg-[#F6F4EF] text-sm text-[#6B665C] font-mono">@{PORTAL_DOMAIN[acctRole]}</span>
                    </div>
                    <input type="password" value={acctPass} onChange={(e) => setAcctPass(e.target.value)} placeholder="باسوورد (6 حروف أو أكتر)" dir="ltr" className="w-full p-3 rounded-xl bg-white border border-[#ECE8DF] text-sm" />
                    <p className="text-[11px] text-[#6B665C]">هتدخل بـ <b dir="ltr">{(acctEmail || 'username')}@{PORTAL_DOMAIN[acctRole]}</b> والباسوورد ده، من زرار الدخول فوق.</p>
                    {acctError && <p className="text-xs text-rose-700">{acctError}</p>}
                  </div>
                )}
                <button
                    type="submit"
                    className="w-full py-4 px-6 bg-stone-900 hover:bg-black text-white text-sm sm:text-base font-black rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-stone-950/20 active:scale-98 cursor-pointer"
                  >
                    <Send size={18} />
                    <span>إرسال بيانات الشقة ومواعيد المعاينة للإدارة</span>
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
