import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { changeMyPassword } from '../services/firebaseService';

/* أي حد داخل بحسابه (سيلز، مالك، بروكر، أدمن) يقدر يغيّر باسووردُه */
export const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: 'الباسوورد الجديد مش متطابق' });
    setBusy(true);
    try {
      await changeMyPassword(current, next);
      setMsg({ ok: true, text: 'اتغيّر الباسوورد بنجاح' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || 'حصل خطأ' });
    } finally {
      setBusy(false);
    }
  };
  const input = 'w-full py-3 px-3.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm font-mono focus:outline-none focus:border-[#A07A26]';

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <form onSubmit={submit} className="relative bg-white w-full max-w-sm rounded-3xl p-6 space-y-3 text-[#141414]">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute top-4 left-4 p-2 rounded-xl hover:bg-[#F6F4EF]"><X size={18} /></button>
        <h2 className="font-bold text-lg flex items-center gap-2"><KeyRound size={18} />تغيير الباسوورد</h2>
        {msg && <p className={`text-sm rounded-xl p-3 border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{msg.text}</p>}
        <label className="block text-xs font-bold space-y-1">الباسوورد الحالي<input type="password" className={input} dir="ltr" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></label>
        <label className="block text-xs font-bold space-y-1">الباسوورد الجديد<input type="password" className={input} dir="ltr" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
        <label className="block text-xs font-bold space-y-1">تأكيد الباسوورد الجديد<input type="password" className={input} dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
        <button disabled={busy} className="w-full py-3 bg-[#141414] text-white rounded-xl font-bold disabled:opacity-60">{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
      </form>
    </div>
  , document.body);
};
