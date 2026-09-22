import { createPortal } from 'react-dom';
import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Eye, EyeOff, Save, UserX, KeyRound, Search } from 'lucide-react';
import { subscribeToAccounts, saveAccount, disableAccount, AccountRecord, AccountRole } from '../services/firebaseService';

/*
  إدارة كل الحسابات من مكان واحد: سيلز، بروكر، مالك، أدمن.
  الأدمن بيحدد الإيميل والباسوورد، وصاحب الحساب يقدر يغيّر باسووردُه بعدين،
  والباسوورد الجديد بيظهر هنا للأدمن.
*/

const ROLES: { key: AccountRole; label: string; color: string }[] = [
  { key: 'sales', label: 'سيلز', color: '#1E7A45' },
  { key: 'owner', label: 'مالك', color: '#A07A26' },
  { key: 'broker', label: 'بروكر', color: '#1F4E9C' },
  { key: 'coordinator' as AccountRole, label: 'مسؤولة الملاك', color: '#7A3E9C' },
  { key: 'admin', label: 'أدمن', color: '#141414' },
  { key: 'disabled', label: 'موقوف', color: '#B8352A' },
];
const roleOf = (r: string) => ROLES.find((x) => x.key === r) || ROLES[4];

const EMPTY: AccountRecord = { email: '', role: 'sales', name: '', password: '', brokerId: '', propertyCodes: '', phone: '' };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (m: string) => void;
}

export const AccountsManagerModal: React.FC<Props> = ({ isOpen, onClose, showToast }) => {
  const [list, setList] = useState<AccountRecord[]>([]);
  const [filter, setFilter] = useState<AccountRole | 'all'>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AccountRecord | null>(null);
  const [original, setOriginal] = useState<AccountRecord | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    return subscribeToAccounts(setList, () => setError('مش قادر أقرا الحسابات. اتأكد إنك داخل كأدمن.'));
  }, [isOpen]);

  const shown = useMemo(
    () => list.filter((a) => (filter === 'all' || a.role === filter) && (!q || `${a.email} ${a.name || ''}`.toLowerCase().includes(q.toLowerCase()))),
    [list, filter, q]
  );

  if (!isOpen) return null;

  const openNew = (role: AccountRole = 'sales') => { setEditing({ ...EMPTY, role }); setOriginal(null); setError(''); };
  const openEdit = (a: AccountRecord) => {
    const codes = Array.isArray(a.propertyCodes) ? a.propertyCodes.join(', ') : a.propertyCodes || '';
    setEditing({ ...a, propertyCodes: codes });
    setOriginal(a);
    setError('');
  };

  const submit = async () => {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await saveAccount(editing, original?.password);
      showToast?.(original ? 'اتحفظ الحساب' : 'اتعمل الحساب');
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const f = (k: keyof AccountRecord, v: string) => setEditing((e) => (e ? { ...e, [k]: v } : e));
  const input = 'w-full py-2.5 px-3 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm focus:outline-none focus:border-[#A07A26]';

  return createPortal(
    <div className="fixed inset-0 z-[65] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-3xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden text-[#141414]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#ECE8DF]">
          <div>
            <h2 className="font-bold text-lg">إدارة الحسابات</h2>
            <p className="text-xs text-[#6B665C]">الإيميل والباسوورد لكل سيلز ومالك وبروكر</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openNew()} className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] text-white rounded-xl text-sm font-bold"><Plus size={16} />حساب جديد</button>
            <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-[#F6F4EF]"><X size={18} /></button>
          </div>
        </header>

        <div className="px-5 py-3 flex flex-wrap gap-2 items-center border-b border-[#ECE8DF]">
          {[{ key: 'all', label: `الكل (${list.length})` }, ...ROLES.map((r) => ({ key: r.key, label: `${r.label} (${list.filter((a) => a.role === r.key).length})` }))].map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key as any)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === t.key ? 'bg-[#141414] text-white border-[#141414]' : 'border-[#ECE8DF] text-[#6B665C]'}`}>{t.label}</button>
          ))}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C877D]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الإيميل" className={`${input} pr-8 py-2`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
          {error && !editing && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
          {shown.map((a) => {
            const r = roleOf(a.role);
            const codes = Array.isArray(a.propertyCodes) ? a.propertyCodes.join('، ') : a.propertyCodes;
            return (
              <div key={a.email} className="border border-[#ECE8DF] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: r.color }}>{r.label}</span>
                    <span className="font-bold truncate">{a.name || '—'}</span>
                  </div>
                  <p className="text-xs font-mono text-[#4A463F] truncate" dir="ltr" style={{ textAlign: 'right' }}>{a.email}</p>
                  <p className="text-xs flex items-center gap-2">
                    <KeyRound size={12} className="text-[#8C877D]" />
                    <span className="font-mono" dir="ltr">{a.password ? (showPass[a.email] ? a.password : '••••••••') : 'مش محفوظ'}</span>
                    {a.password && (
                      <button onClick={() => setShowPass((s) => ({ ...s, [a.email]: !s[a.email] }))} aria-label="إظهار الباسوورد" className="text-[#8C877D]">
                        {showPass[a.email] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </p>
                  {a.role === 'owner' && <p className="text-[11px] text-[#6B665C]">الوحدات: {codes || '—'}</p>}
                  {a.role === 'broker' && <p className="text-[11px] text-[#6B665C]">رقم البروكر: {a.brokerId || '—'}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(a)} className="px-3 py-2 rounded-xl bg-[#F6F4EF] text-sm font-bold">تعديل</button>
                  {a.role !== 'disabled' && a.role !== 'admin' && (
                    <button onClick={() => disableAccount(a.email).then(() => showToast?.('اتوقف الحساب'))} aria-label="إيقاف" className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50"><UserX size={16} /></button>
                  )}
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <p className="text-center text-sm text-[#8C877D] py-10">مفيش حسابات هنا لسه</p>}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">{original ? 'تعديل الحساب' : 'حساب جديد'}</h3>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            <div className="grid grid-cols-3 gap-1.5">
              {ROLES.filter((r) => r.key !== 'disabled').map((r) => (
                <button key={r.key} onClick={() => f('role', r.key)} className={`py-2 rounded-xl text-xs font-bold border ${editing.role === r.key ? 'text-white' : 'text-[#6B665C] border-[#ECE8DF]'}`} style={editing.role === r.key ? { background: r.color, borderColor: r.color } : {}}>{r.label}</button>
              ))}
            </div>
            <label className="block text-xs font-bold space-y-1">الاسم<input className={input} value={editing.name || ''} onChange={(e) => f('name', e.target.value)} /></label>
            <label className="block text-xs font-bold space-y-1">الإيميل<input className={input} dir="ltr" type="email" disabled={!!original} value={editing.email} onChange={(e) => f('email', e.target.value)} placeholder="name@elsaba.com" /></label>
            <label className="block text-xs font-bold space-y-1">الباسوورد (6 حروف أو أكتر)<input className={`${input} font-mono`} dir="ltr" value={editing.password || ''} onChange={(e) => f('password', e.target.value)} /></label>
            <label className="block text-xs font-bold space-y-1">الموبايل<input className={input} dir="ltr" value={editing.phone || ''} onChange={(e) => f('phone', e.target.value)} /></label>
            {editing.role === 'owner' && (
              <label className="block text-xs font-bold space-y-1">أكواد وحداته (افصل بفاصلة)<input className={`${input} font-mono`} dir="ltr" value={(editing.propertyCodes as string) || ''} onChange={(e) => f('propertyCodes', e.target.value)} placeholder="H1128, H1622" /></label>
            )}
            {editing.role === 'broker' && (
              <label className="block text-xs font-bold space-y-1">رقم البروكر (brokerId)<input className={`${input} font-mono`} dir="ltr" value={editing.brokerId || ''} onChange={(e) => f('brokerId', e.target.value)} placeholder="broker_ahmed" /></label>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={submit} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#141414] text-white rounded-xl font-bold disabled:opacity-60"><Save size={16} />{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
              <button onClick={() => setEditing(null)} className="px-4 py-3 rounded-xl bg-[#F6F4EF] font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  , document.body);
};
