import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  Loader2,
  Users
} from 'lucide-react';
import { SalesAgent } from '../types';
import { LionLogo } from './LionLogo';
import { signInStaff, getStaffRole, signOutToGuest } from '../services/firebaseService';

interface SalesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesAgents: SalesAgent[];
  onSelectAgent: (agentId: string) => void;
  onLoginSuccess: (agent: SalesAgent) => void;
  onOpenAdminLogin?: () => void;
}

export const SalesLoginModal: React.FC<SalesLoginModalProps> = ({
  isOpen,
  onClose,
  salesAgents,
  onSelectAgent,
  onLoginSuccess,
  onOpenAdminLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const targetEmail = email.trim().toLowerCase();
    const targetPassword = password.trim();

    if (!targetEmail || !targetPassword) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      setLoading(false);
      return;
    }

    const matchedAgent = salesAgents.find((a) => (a.email || '').toLowerCase().trim() === targetEmail);
    if (!matchedAgent) {
      setError('هذا الحساب غير مسجل في فريق المبيعات. يرجى مراجعة إدارة المنصة.');
      setLoading(false);
      return;
    }
    if (matchedAgent.isActive === false) {
      setError('هذا الحساب تم تعطيله مؤقتاً من قبل الإدارة.');
      setLoading(false);
      return;
    }

    try {
      const user = await signInStaff(targetEmail, targetPassword);
      const role = await getStaffRole(user.email);
      if (role !== 'sales' && role !== 'admin') {
        await signOutToGuest();
        setError('الحساب ده لسه ما اتفعّلش. كلّم الإدارة.');
        setLoading(false);
        return;
      }
      onSelectAgent(matchedAgent.id);
      onLoginSuccess(matchedAgent);
      setLoading(false);
      onClose();
    } catch (authErr: any) {
      const code = authErr?.code || '';
      if (code.includes('too-many-requests')) setError('محاولات كتير. استنى دقايق وجرّب تاني.');
      else setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/65 backdrop-blur-xs overflow-y-auto font-ibm" dir="rtl">
      <div 
        className="relative w-full max-w-md bg-white border border-[#ECE8DF] p-6 sm:p-8 rounded-3xl shadow-2xl my-auto text-right text-[#141414] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-[#6B665C] hover:text-[#141414] hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-5 pt-1 border-b border-[#ECE8DF]">
          <div className="mb-3">
            <LionLogo size={44} variant="stacked" textColor="text-[#141414]" subtextColor="text-[#6B665C]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#141414] font-readex">
              بوابة مستشاري المبيعات
            </h2>
            <p className="text-xs text-[#6B665C]">
              تسجيل الدخول لمتابعة عملائك وإدارة شقق المعاينة
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="my-4 p-3 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs text-[#6B665C] space-y-1">
          <div className="flex items-center gap-1.5 text-[#A07A26] font-bold">
            <Lock size={13} />
            <span>تسجيل دخول مخصص لفريق المبيعات</span>
          </div>
          <p className="text-[11px] text-[#6B665C] leading-relaxed">
            عند الدخول، تظهر لك أدوات السيلز والـ CRM مع عزل تام لبيانات العملاء.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleFormLogin} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 rounded-xl animate-in fade-in duration-150">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] block">
              البريد الإلكتروني أو اسم المستشار
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="advisor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3 px-3.5 pl-10 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs sm:text-sm text-[#141414] placeholder-[#A3A09A] focus:outline-none focus:border-[#A07A26] focus:bg-white transition-all text-left font-ibm"
                dir="ltr"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B665C]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] block">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 px-3.5 pl-10 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs sm:text-sm text-[#141414] placeholder-[#A3A09A] focus:outline-none focus:border-[#A07A26] focus:bg-white transition-all text-left font-mono"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B665C] hover:text-[#141414] cursor-pointer p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#A07A26] hover:bg-[#8A671F] text-white text-xs sm:text-sm font-bold font-readex rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs active:scale-98 cursor-pointer disabled:opacity-60"
          >
            <UserCheck size={16} />
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول والمتابعة'}</span>
          </button>
        </form>

        {/* Footer info: Switch to Admin Login */}
        <div className="mt-5 pt-4 border-t border-[#ECE8DF] flex items-center justify-between text-xs text-[#6B665C]">
          <span>أنت مالك الموقع (الأونر)؟</span>
          {onOpenAdminLogin && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminLogin();
              }}
              className="text-[#141414] hover:text-[#A07A26] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>دخول لوحة تحكم الإدارة</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

