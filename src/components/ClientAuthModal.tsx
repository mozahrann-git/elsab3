import React, { useState } from 'react';
import { ClientProfile, SalesAgent } from '../types';
import { 
  X, 
  User, 
  Phone, 
  Bell, 
  CheckCircle2, 
  Sparkles, 
  LogIn, 
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Sliders,
  Check
} from 'lucide-react';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { formatPrice } from '../utils/helpers';
import { safeLocalStorageSet, safeSessionStorageSet } from '../utils/storageHelper';
import { signInStaff, getStaffRole, signOutToGuest, getStaffAccess, StaffAccess } from '../services/firebaseService';

interface ClientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: ClientProfile | null;
  onSaveClient: (client: ClientProfile) => void;
  onLoginAdminSuccess?: () => void;
  onLoginSalesSuccess?: (agent: SalesAgent) => void;
  onPortalLogin?: (access: StaffAccess) => void;
  salesAgents?: SalesAgent[];
  adminCredentials?: {
    email: string;
    password?: string;
  };
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
  isOpen,
  onClose,
  currentClient,
  onSaveClient,
  onLoginAdminSuccess,
  onLoginSalesSuccess,
  onPortalLogin,
  salesAgents = [],
  adminCredentials
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(
    currentClient ? 'register' : 'login'
  );
  
  // Registration Form State
  const [name, setName] = useState(currentClient?.name || '');
  const [phone, setPhone] = useState(currentClient?.phone || '');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    currentClient?.preferredNeighborhoods || ['الحي الأول', 'الحي الثاني']
  );
  const [finishing, setFinishing] = useState<'all' | 'finished' | 'semi_finished'>(
    currentClient?.preferredFinishing || 'all'
  );
  const [budgetMax, setBudgetMax] = useState<number>(currentClient?.budgetMax || 3500000);
  const [enableNewAlerts, setEnableNewAlerts] = useState<boolean>(
    currentClient ? currentClient.enableNewListingAlerts : true
  );
  const [enablePriceDrops, setEnablePriceDrops] = useState<boolean>(
    currentClient ? currentClient.enablePriceDropAlerts : true
  );

  // Smart Unified Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleNeighborhood = (n: string) => {
    if (selectedNeighborhoods.includes(n)) {
      if (selectedNeighborhoods.length > 1) {
        setSelectedNeighborhoods(selectedNeighborhoods.filter(item => item !== n));
      }
    } else {
      setSelectedNeighborhoods([...selectedNeighborhoods, n]);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكريم');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح للتواصل وتلقي الإشعارات');
      return;
    }

    const newProfile: ClientProfile = {
      id: currentClient?.id || `client_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: phone.trim(),
      preferredNeighborhoods: selectedNeighborhoods,
      preferredFinishing: finishing,
      budgetMax: budgetMax,
      enableNewListingAlerts: enableNewAlerts,
      enablePriceDropAlerts: enablePriceDrops,
      registeredAt: currentClient?.registeredAt || new Date().toISOString()
    };

    onSaveClient(newProfile);
    setSuccessMsg('تم حفظ حسابك وتفعيل مركز الإشعارات بنجاح!');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleSmartLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!identifier) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
      return;
    }

    // 1+2. الأدمن والموظفين: دخول حقيقي من Firebase بالإيميل، والدور من staff_access
    if (identifier.includes('@')) {
      // أي إيميل مع باسوورد بيتجرب كحساب (أدمن/سيلز/مالك/بروكر)
      const isKnownStaffEmail = !!pass ||
        identifier.startsWith('admin') ||
        salesAgents.some((a) => (a.email || '').toLowerCase().trim() === identifier);
      if (!pass) {
        if (isKnownStaffEmail) {
          setErrorMsg('يرجى إدخال كلمة المرور');
          return;
        }
      } else {
        try {
          const user = await signInStaff(identifier, pass);
          const acc = await getStaffAccess(user.email);
          if (acc && (acc.role === 'owner' || acc.role === 'broker' || acc.role === 'coordinator')) {
            setSuccessMsg('أهلاً بيك! جاري فتح بوابتك...');
            setTimeout(() => { onPortalLogin?.(acc); onClose(); }, 400);
            return;
          }
          const role = await getStaffRole(user.email);
          if (role === 'admin') {
            try { localStorage.removeItem('hadaba_current_client'); } catch { /* ignore */ }
            setSuccessMsg('تم التحقق من حساب الإدارة بنجاح! جاري فتح لوحة التحكم...');
            setTimeout(() => {
              if (onLoginAdminSuccess) onLoginAdminSuccess();
              onClose();
            }, 500);
            return;
          }
          const matchedAgent = salesAgents.find((a) => (a.email || '').toLowerCase().trim() === identifier);
          if (role === 'sales' && matchedAgent && matchedAgent.isActive !== false) {
            setSuccessMsg(`أهلاً بك يا ${matchedAgent.name}! جاري الدخول لنظام المبيعات...`);
            setTimeout(() => {
              if (onLoginSalesSuccess) onLoginSalesSuccess(matchedAgent);
              onClose();
            }, 800);
            return;
          }
          await signOutToGuest();
          setErrorMsg('الحساب ده مش مسجّل ضمن فريق السبع. كلّم الإدارة.');
          return;
        } catch {
          if (isKnownStaffEmail) {
            setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            return;
          }
          // مش موظف: يكمّل كعميل عادي
        }
      }
    }

    // 3. Fallback: Client Login (Phone or identifier)
    try {
      const savedProfilesStr = localStorage.getItem('hadaba_registered_clients');
      const savedProfiles: ClientProfile[] = savedProfilesStr ? JSON.parse(savedProfilesStr) : [];
      const found = savedProfiles.find(c => 
        (c.phone && (c.phone.includes(identifier) || identifier.includes(c.phone))) ||
        (c.name && c.name.toLowerCase().includes(identifier))
      );
      
      if (found) {
        onSaveClient(found);
        setSuccessMsg(`أهلاً بك مجدداً يا ${found.name}! تم تسجيل دخولك بنجاح`);
        setTimeout(() => onClose(), 800);
        return;
      }
    } catch {
      // fallback
    }

    // If not found in registered clients, create instant client profile
    const instantProfile: ClientProfile = {
      id: `client_${Date.now()}`,
      name: identifier.includes('@') ? identifier.split('@')[0] : 'عميل مميز',
      phone: identifier,
      whatsapp: identifier,
      preferredNeighborhoods: ['الحي الأول', 'الحي الثاني', 'الحي الثالث', 'الحي الرابع'],
      preferredFinishing: 'all',
      budgetMax: 4500000,
      enableNewListingAlerts: true,
      enablePriceDropAlerts: true,
      registeredAt: new Date().toISOString()
    };
    onSaveClient(instantProfile);
    setSuccessMsg('تم تسجيل دخولك بنجاح!');
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-hidden font-ibm animate-in fade-in duration-150" dir="rtl">
      
      {/* Modal Card Container */}
      <div 
        className="relative w-full max-w-lg bg-[#F6F4EF] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right border border-[#ECE8DF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 bg-white border-b border-[#ECE8DF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-readex font-bold text-base text-[#141414]">
                {currentClient ? 'حساب العميل وتفضيلات البحث' : 'تسجيل الدخول وحساب المستخدم'}
              </h3>
              <p className="text-xs text-[#6B665C]">
                إشعارات الشقق الفورية ومتابعة الأسعار بالهضبة الوسطى
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-800 hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 bg-white border-b border-[#ECE8DF] flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'login' 
                ? 'text-[#141414] border-b-2 border-[#141414]' 
                : 'text-[#6B665C] hover:text-[#141414]'
            }`}
          >
            تسجيل الدخول السريع
          </button>

          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'register' 
                ? 'text-[#A07A26] border-b-2 border-[#A07A26]' 
                : 'text-[#6B665C] hover:text-[#141414]'
            }`}
          >
            {currentClient ? 'تفضيلاتي واشتراكاتي' : 'إنشاء حساب وتفعيل التنبيهات'}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Smart Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleSmartLogin} className="space-y-3.5">
              <div className="p-3.5 bg-white border border-[#ECE8DF] text-[#4A463F] rounded-2xl text-xs space-y-1">
                <p className="font-readex font-bold text-[#141414]">تسجيل الدخول للمنصة:</p>
                <p className="text-[11px] text-[#6B665C] leading-relaxed">
                  أدخل بريدك الإلكتروني أو رقم هاتفك لتسجيل الدخول الفوري واسترجاع حسابك وتفضيلاتك.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141414]">البريد الإلكتروني أو رقم الهاتف</label>
                <div className="relative">
                  <User size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="010XXXXXXXX أو name@example.com"
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#141414]">كلمة المرور</label>
                  <span className="text-[10px] text-[#8C877D]">مطلوبة للإدارة وفريق العمل فقط</span>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-10 py-2.5 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C877D] hover:text-[#141414] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#141414] hover:bg-black text-white font-readex font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn size={15} className="text-[#D9B864]" />
                <span>تسجيل الدخول</span>
              </button>
            </form>
          )}

          {/* TAB 2: Registration & Preferences */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141414]">الاسم الكريم</label>
                <div className="relative">
                  <User size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#141414]">رقم الهاتف / الواتساب (لتلقي التنبيهات)</label>
                <div className="relative">
                  <Phone size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full pr-10 pl-4 py-2.5 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  />
                </div>
              </div>

              {/* Neighborhoods Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#141414]">الأحياء المفضلة لتلقي إشعاراتها</label>
                  <span className="text-[11px] text-[#A07A26] font-bold">محدد ({selectedNeighborhoods.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {HADABA_WOSTA_NEIGHBORHOODS.map((n) => {
                    const isSelected = selectedNeighborhoods.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleNeighborhood(n)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#141414] text-white border-[#141414] shadow-2xs'
                            : 'bg-white text-[#6B665C] border-[#ECE8DF] hover:border-[#A07A26]'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Finishing Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#141414]">نوع التشطيب المستهدف</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFinishing('all')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      finishing === 'all'
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-[#6B665C] border-[#ECE8DF]'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinishing('finished')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      finishing === 'finished'
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-[#6B665C] border-[#ECE8DF]'
                    }`}
                  >
                    متشطب بالكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinishing('semi_finished')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      finishing === 'semi_finished'
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-[#6B665C] border-[#ECE8DF]'
                    }`}
                  >
                    نصف تشطيب
                  </button>
                </div>
              </div>

              {/* Budget Slider */}
              <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#ECE8DF]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141414]">الحد الأقصى للميزانية</span>
                  <span className="text-xs font-bold text-[#A07A26]">
                    {formatPrice(budgetMax)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1500000}
                  max={8000000}
                  step={100000}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full accent-[#A07A26]"
                />
              </div>

              {/* Notification Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#ECE8DF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableNewAlerts}
                    onChange={(e) => setEnableNewAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-[#A07A26] accent-[#A07A26]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#141414] block">إشعارات الشقق الجديدة</span>
                    <span className="text-[#6B665C] text-[11px]">تنبيهي فور إضافة أي شقة جديدة في أحيائي المفضلة</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-[#ECE8DF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePriceDrops}
                    onChange={(e) => setEnablePriceDrops(e.target.checked)}
                    className="w-4 h-4 rounded text-[#A07A26] accent-[#A07A26]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#141414] block">إشعارات عروض الأسعار</span>
                    <span className="text-[#6B665C] text-[11px]">تنبيهي عند نزول سعر شقة أو توفر صفقة ريسيل لقطة</span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>{currentClient ? 'حفظ التفضيلات وتحديث الإشعارات' : 'تأكيد الحساب وتفعيل التنبيهات'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
