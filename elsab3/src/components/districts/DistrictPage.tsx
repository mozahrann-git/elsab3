import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Save, Plus, Trash2, Eye, EyeOff, ArrowLeft, MapPin, GraduationCap, ThumbsUp, AlertTriangle, Users } from 'lucide-react';
import { Property } from '../../types';
import { DistrictStats, DistrictContent, saveDistrictContent } from '../../services/districtService';
import { uploadFile } from '../../services/mediaStorage';

/*
  صفحة الحي: أرقام حقيقية من الشقق + محتوى الأدمن بيكتبه ويعدّله ويمسحه.
  الأقسام الفاضية مبتظهرش للزوار، وبتظهر للأدمن بزرار "ضيف".
*/
const f = (n: number) => Math.round(n).toLocaleString('en-US');
const m = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')} مليون` : f(n));

interface Props {
  name: string;
  stats: DistrictStats[];
  content?: DistrictContent;
  properties: Property[];
  isAdmin: boolean;
  onClose: () => void;
  onShowUnits: (name: string) => void;
  onOpenProperty: (p: Property) => void;
  onOpenDistrict: (name: string) => void;
}

type ListKey = 'bestFor' | 'roads' | 'services' | 'pros' | 'watchOut';
const LISTS: { k: ListKey; t: string; icon: React.ReactNode; tone: string }[] = [
  { k: 'roads', t: 'المحاور والشوارع', icon: <MapPin size={18} />, tone: '#1F4E9C' },
  { k: 'services', t: 'مدارس وخدمات قريبة', icon: <GraduationCap size={18} />, tone: '#7A3E9C' },
  { k: 'pros', t: 'ليه الناس بتختاره', icon: <ThumbsUp size={18} />, tone: '#1E7A45' },
  { k: 'watchOut', t: 'خلي بالك من', icon: <AlertTriangle size={18} />, tone: '#C2412D' },
];

export const DistrictPage: React.FC<Props> = ({ name, stats, content, properties, isAdmin, onClose, onShowUnits, onOpenProperty, onOpenDistrict }) => {
  const s = stats.find((x) => x.name === name);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<DistrictContent>(content || { name });
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(content || { name }); setEdit(false); }, [name, content]);
  useEffect(() => { const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p; }; }, []);

  const c = edit ? draft : content || { name };
  const units = useMemo(() => properties.filter((p) => p.neighborhood === name && p.category !== 'off_plan').sort((a, b) => a.price - b.price), [properties, name]);
  const ladder = useMemo(() => stats.filter((x) => x.count > 0).sort((a, b) => b.avgPpm - a.avgPpm), [stats]);
  const top = ladder[0]?.avgPpm || 1;
  const rank = ladder.findIndex((x) => x.name === name) + 1;
  const total = stats.reduce((x, y) => x + y.count, 0);
  const plateau = total ? stats.reduce((x, y) => x + y.avgPpm * y.count, 0) / total : 0;
  const vs = s && plateau ? ((s.avgPpm - plateau) / plateau) * 100 : 0;
  const cover = c.coverImage || s?.cover;

  const setList = (k: ListKey, v: string[]) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => { setBusy(true); try { await saveDistrictContent(draft); setEdit(false); } finally { setBusy(false); } };

  // دالة عادية (مش component) عشان الكتابة في الخانات متفقدش التركيز
  const renderList = ({ k, t, icon, tone }: { k: ListKey; t: string; icon: React.ReactNode; tone: string }) => {
    const items = (c[k] || []) as string[];
    if (!edit && !items.length) return isAdmin ? <button key={k} onClick={() => setEdit(true)} className="rounded-2xl border-2 border-dashed border-[#DCD6CA] p-5 text-sm font-semibold text-[#8C877D] flex items-center justify-center gap-2"><Plus size={16} />ضيف {t}</button> : null;
    return (
      <div key={k} className="rounded-2xl bg-white border border-[#ECE8DF] p-5 space-y-3">
        <p className="font-bold flex items-center gap-2" style={{ color: tone }}>{icon}<span className="text-[#141414]">{t}</span></p>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-7">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone }} />
              {edit ? (
                <>
                  <input value={it} onChange={(e) => { const n = [...items]; n[i] = e.target.value; setList(k, n); }} className="flex-1 rounded-lg bg-[#F6F4EF] border border-[#E4DFD4] px-2 py-1 text-sm" />
                  <button onClick={() => setList(k, items.filter((_, j) => j !== i))} aria-label="مسح" className="text-[#C2412D] p-1"><Trash2 size={14} /></button>
                </>
              ) : <span>{it}</span>}
            </li>
          ))}
        </ul>
        {edit && <button onClick={() => setList(k, [...items, ''])} className="text-sm font-bold text-[#A07A26] flex items-center gap-1"><Plus size={14} />سطر جديد</button>}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[#F6F4EF] overflow-y-auto overflow-x-hidden overscroll-contain w-full max-w-full" dir="rtl">
      {/* الهيرو */}
      <header className="relative bg-[#141414] text-white">
        {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-[#141414]/30" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-5 pb-10 sm:pb-14">
          <div className="flex justify-between items-center mb-10 sm:mb-16">
            <button onClick={onClose} className="flex items-center gap-2 text-sm text-[#CFCBC2] hover:text-white"><X size={18} />الدليل</button>
            {isAdmin && (edit
              ? <div className="flex gap-2">
                  <button onClick={() => setDraft({ ...draft, hidden: !draft.hidden })} className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold flex items-center gap-1.5">{draft.hidden ? <EyeOff size={14} /> : <Eye size={14} />}{draft.hidden ? 'مخفي من الدليل' : 'ظاهر'}</button>
                  <button onClick={() => { setDraft(content || { name }); setEdit(false); }} className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold">إلغاء</button>
                  <button onClick={save} disabled={busy} className="px-4 py-2 rounded-xl bg-[#A07A26] text-xs font-bold flex items-center gap-1.5"><Save size={14} />{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
              : <button onClick={() => setEdit(true)} className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold flex items-center gap-1.5"><Pencil size={14} />تعديل الحي</button>)}
          </div>
          <p className="text-sm font-bold text-[#D9B864] mb-2">الهضبة الوسطى · {rank ? `رقم ${rank} في سعر المتر` : ''}</p>
          <h1 className="text-4xl sm:text-6xl font-bold font-readex mb-3">{name}</h1>
          {edit
            ? <input value={draft.tagline || ''} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="جملة واحدة بتلخص الحي" className="w-full max-w-2xl rounded-xl bg-white/10 border border-white/20 p-3 text-lg" />
            : c.tagline && <p className="text-lg sm:text-xl text-[#E7E2D8] max-w-2xl leading-8">{c.tagline}</p>}
          {edit && (
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-bold bg-white/10 rounded-xl px-3 py-2 cursor-pointer">
              صورة الغلاف
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { setDraft({ ...draft, coverImage: await uploadFile(file, 'districts', name) }); } finally { setBusy(false); } }} />
            </label>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 pb-28 space-y-6 relative overflow-x-hidden">
        {/* الأرقام */}
        {s && s.count > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['متوسط سعر المتر', f(s.avgPpm), 'ج.م / م²', vs <= 0 ? `أقل من متوسط الهضبة بـ ${Math.abs(vs).toFixed(0)}%` : `أعلى من متوسط الهضبة بـ ${vs.toFixed(0)}%`],
              ['شقق متاحة دلوقتي', String(s.count), 'شقة', `${s.finishedCount} متشطبة · ${s.semiCount} نص تشطيب`],
              ['متشطب', s.avgPpmFinished ? f(s.avgPpmFinished) : '—', 'ج.م / م²', 'متوسط المتر'],
              ['نص تشطيب', s.avgPpmSemi ? f(s.avgPpmSemi) : '—', 'ج.م / م²', 'متوسط المتر'],
            ].map(([t, v, u, h], i) => (
              <div key={i} className={`rounded-2xl p-5 shadow-sm ${i === 0 ? 'bg-[#A07A26] text-white' : 'bg-white border border-[#ECE8DF]'}`}>
                <p className={`text-xs ${i === 0 ? 'text-white/80' : 'text-[#6B665C]'}`}>{t}</p>
                <p className="text-3xl font-bold font-readex mt-1">{v}</p>
                <p className={`text-[11px] ${i === 0 ? 'text-white/80' : 'text-[#8C877D]'}`}>{u}</p>
                <p className={`text-xs mt-2 font-semibold ${i === 0 ? 'text-white' : 'text-[#6B665C]'}`}>{h}</p>
              </div>
            ))}
          </div>
        ) : <div className="rounded-2xl bg-white border border-[#ECE8DF] p-6 text-center text-[#6B665C]">مفيش شقق معروضة في الحي ده دلوقتي</div>}

        {/* CTA */}
        {s && s.count > 0 && (
          <button onClick={() => onShowUnits(name)} className="w-full rounded-2xl bg-[#141414] text-white p-5 flex items-center justify-between">
            <span className="text-right"><span className="block font-bold text-lg">شوف الـ {s.count} شقة في {name}</span><span className="text-sm text-[#A3A09A]">من {m(s.minPrice)} لحد {m(s.maxPrice)} ج.م</span></span>
            <ArrowLeft size={22} className="text-[#D9B864]" />
          </button>
        )}

        <div className="grid gap-6 lg:grid-cols-3 min-w-0">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* عن الحي */}
            {(edit || c.about) ? (
              <div className="rounded-2xl bg-white border border-[#ECE8DF] p-6 space-y-3">
                <p className="font-bold text-lg">عن {name}</p>
                {edit ? <textarea rows={5} value={draft.about || ''} onChange={(e) => setDraft({ ...draft, about: e.target.value })} placeholder="اكتب عن الحي: طبيعته، ساكنيه، مميزاته..." className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm leading-7" />
                  : <p className="leading-8 text-[#3A3731] whitespace-pre-line">{c.about}</p>}
              </div>
            ) : isAdmin && <button onClick={() => setEdit(true)} className="w-full rounded-2xl border-2 border-dashed border-[#DCD6CA] p-5 text-sm font-semibold text-[#8C877D] flex items-center justify-center gap-2"><Plus size={16} />ضيف وصف للحي</button>}

            {/* مناسب لـ */}
            {(edit || (c.bestFor || []).length > 0) && (
              <div className="rounded-2xl bg-white border border-[#ECE8DF] p-6 space-y-3">
                <p className="font-bold flex items-center gap-2"><Users size={18} className="text-[#A07A26]" />مناسب لـ</p>
                <div className="flex flex-wrap gap-2">
                  {(c.bestFor || []).map((b, i) => edit
                    ? <span key={i} className="flex items-center gap-1 rounded-full bg-[#FBF8F1] border border-[#E8D3A6] pr-3 pl-1 py-1"><input value={b} onChange={(e) => { const n = [...(draft.bestFor || [])]; n[i] = e.target.value; setList('bestFor', n); }} className="bg-transparent text-sm w-32 outline-none" /><button onClick={() => setList('bestFor', (draft.bestFor || []).filter((_, j) => j !== i))} className="p-1 text-[#C2412D]"><X size={12} /></button></span>
                    : <span key={i} className="rounded-full bg-[#FBF8F1] border border-[#E8D3A6] px-4 py-2 text-sm font-semibold">{b}</span>)}
                  {edit && <button onClick={() => setList('bestFor', [...(draft.bestFor || []), ''])} className="rounded-full border-2 border-dashed border-[#DCD6CA] px-4 py-1.5 text-sm text-[#8C877D]">+ ضيف</button>}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">{LISTS.map((l) => renderList(l))}</div>

            {/* شقق من الحي */}
            {units.length > 0 && (
              <div className="space-y-3">
                <p className="font-bold text-lg">شقق في {name}</p>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x max-w-full">
                  {units.slice(0, 10).map((p) => (
                    <button key={p.id} onClick={() => onOpenProperty(p)} className="snap-start shrink-0 w-56 text-right rounded-2xl bg-white border border-[#ECE8DF] overflow-hidden">
                      {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-32 object-cover" /> : <div className="w-full h-32" style={{ background: 'repeating-linear-gradient(135deg,#E7E2D8 0 10px,#EFEBE3 10px 20px)' }} />}
                      <div className="p-3 space-y-1">
                        <span className="text-[10px] font-mono bg-[#141414] text-white px-1.5 py-0.5 rounded">{p.code}</span>
                        <p className="font-bold">{f(p.price)} ج.م</p>
                        <p className="text-xs text-[#6B665C]">{p.area} م² · {p.bedrooms} غرف · {p.finishing === 'finished' ? 'متشطبة' : 'نص تشطيب'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* الجنب: مكان الحي بين الأحياء */}
          <aside className="space-y-4 lg:sticky lg:top-6 self-start min-w-0 w-full">
            <div className="rounded-2xl bg-white border border-[#ECE8DF] p-4 sm:p-5 space-y-3 w-full max-w-full overflow-hidden">
              <p className="font-bold">مكانه بين الأحياء</p>
              {ladder.map((x) => (
                <button key={x.name} onClick={() => x.name !== name && onOpenDistrict(x.name)} className={`w-full max-w-full text-right space-y-1 overflow-hidden ${x.name === name ? '' : 'opacity-70 hover:opacity-100'}`}>
                  <div className="flex justify-between items-baseline gap-2 text-xs"><span className={`truncate ${x.name === name ? 'font-bold' : ''}`}>{x.name}</span><span className="font-mono shrink-0 text-[11px]">{f(x.avgPpm)} <span className="text-[9px] text-[#8C877D]">ج.م/م²</span></span></div>
                  <div className="h-2 w-full rounded-full bg-[#F0ECE4] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(x.avgPpm / top) * 100}%`, background: x.name === name ? '#A07A26' : '#C9C4BA' }} /></div>
                </button>
              ))}
            </div>
            {s && s.count > 0 && (
              <div className="rounded-2xl bg-white border border-[#ECE8DF] p-5 space-y-3">
                <p className="font-bold">المعروض بالغرف</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {['1', '2', '3', '4+'].map((k) => (
                    <button key={k} onClick={() => onShowUnits(name)} className="rounded-xl bg-[#F6F4EF] py-3">
                      <p className="text-xl font-bold font-readex">{s.rooms[k] || 0}</p>
                      <p className="text-[10px] text-[#6B665C]">{k === '1' ? 'أوضة' : k === '2' ? 'أوضتين' : k === '4+' ? '4+ غرف' : '3 غرف'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>,
    document.body
  );
};
