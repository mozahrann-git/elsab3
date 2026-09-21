import React, { useEffect, useState } from 'react';
import { X, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';
import { auth, signInStaff, getStaffAccess, signOutToGuest, StaffAccess } from '../services/firebaseService';

/*
  بوابة دخول الملاك والبروكرز بالإيميل.
  الأدمن بيعمل لكل واحد:
   1) حساب في Firebase Authentication (إيميل + باسوورد)
   2) مستند في staff_access/{email}:
      - بروكر: role = "broker" ، brokerId = ID ملفه
      - مالك:  role = "owner"  ، propertyCodes = "SEBA-RSL-701, SEBA-RSL-702"
  الأدمن نفسه بيدخل أي بوابة للمراجعة.
*/

interface Props {
  isOpen: boolean;
  role: 'broker' | 'owner';
  onClose: () => void;
  children: (access: StaffAccess, logout: () => void) => React.ReactNode;
}

const TITLES = {
  broker: { title: 'بوابة البروكر والشركاء', hint: 'ادخل بالإيميل اللي الإدارة عملتهولك' },
  owner: { title: 'بوابة ملاك الوحدات', hint: 'ادخل بالإيميل اللي الإدارة عملتهولك عشان تتابع وحداتك' },
};

export const PortalAuthGate: React.FC<Props> = ({ isOpen, role, onClose, children }) => {
  const [access, setAccess] = useState<StaffAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const allowed = (a: StaffAccess | null) => !!a && (a.role === role || a.role === 'admin');

  // لو داخل بالفعل (بعد refresh مثلاً)، نتأكد من صلاحيته من غير ما يكتب تاني
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      setChecking(true);
      await auth.authStateReady();
      const u = auth.currentUser;
      if (u && !u.isAnonymous) {
        const a = await getStaffAccess(u.email);
        if (alive) setAccess(allowed(a) ? a : null);
      } else if (alive) {
        setAccess(null);
      }
      if (alive) setChecking(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, role]);

  if (!isOpen) return null;

  const logout = () => {
    signOutToGuest().catch(() => {});
    setAccess(null);
    onClose();
  };

  if (access) return <>{children(access, logout)}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return setError('اكتب الإيميل وكلمة المرور.');
    setBusy(true);
    try {
      const user = await signInStaff(email, password);
      const a = await getStaffAccess(user.email);
      if (!allowed(a)) {
        await signOutToGuest();
        setError(role === 'owner' ? 'الإيميل ده مش مربوط بأي وحدة. كلّم إدارة السبع.' : 'الإيميل ده مش مسجّل كبروكر. كلّم إدارة السبع.');
      } else if (a!.role === 'owner' && (!a!.propertyCodes || a!.propertyCodes.length === 0)) {
        await signOutToGuest();
        setError('حسابك موجود بس لسه مفيش وحدات مربوطة بيه. كلّم الإدارة.');
      } else {
        setAccess(a);
      }
    } catch (err: any) {
      const code = err?.code || '';
      setError(code.includes('too-many-requests') ? 'محاولات كتير. استنى شوية وجرّب تاني.' : 'الإيميل أو كلمة المرور غير صحيحة.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-md bg-white border border-[#ECE8DF] p-6 sm:p-8 rounded-3xl shadow-2xl text-right text-[#141414]">
        <button onClick={onClose} aria-label="إغلاق" className="absolute top-5 left-5 p-2 text-[#6B665C] hover:bg-[#F6F4EF] rounded-xl">
          <X size={18} />
        </button>
        <div className="pb-5 mb-5 border-b border-[#ECE8DF]">
          <h2 className="text-lg font-bold font-readex">{TITLES[role].title}</h2>
          <p className="text-xs text-[#6B665C] mt-1">{TITLES[role].hint}</p>
        </div>

        {checking ? (
          <p className="text-sm text-[#6B665C] text-center py-6">جاري التحقق...</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 rounded-xl" role="alert">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />{error}
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">البريد الإلكتروني</span>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" autoComplete="username"
                  className="w-full py-3 px-3.5 pl-10 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm text-left focus:outline-none focus:border-[#A07A26]" placeholder="name@example.com" />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B665C]" />
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">كلمة المرور</span>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="current-password"
                  className="w-full py-3 px-3.5 pl-10 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm text-left focus:outline-none focus:border-[#A07A26]" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'إخفاء' : 'إظهار'} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B665C]">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C9C4BA] pointer-events-none" />
              </div>
            </label>
            <button type="submit" disabled={busy} className="w-full py-3.5 bg-[#141414] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <LogIn size={16} />{busy ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/** شريط صغير فوق البوابة: مين داخل + خروج */
export const PortalSessionBar: React.FC<{ access: StaffAccess; onLogout: () => void }> = ({ access, onLogout }) => (
  <div className="fixed top-0 inset-x-0 z-[70] flex items-center justify-between gap-3 px-4 py-2 bg-[#141414] text-white text-xs" dir="rtl">
    <span>
      داخل كـ <b>{access.name || access.email}</b>
      {access.role === 'admin' && <span className="mr-2 px-2 py-0.5 rounded bg-[#C9A04A] text-[#141414] font-bold">أدمن · مراجعة</span>}
    </span>
    <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
      <LogOut size={13} />خروج
    </button>
  </div>
);
