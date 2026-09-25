import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Send, Sparkles, Link2, Video, Settings2, Trash2 } from 'lucide-react';
import { Property, SalesAgent } from '../../types';
import {
  SalesForms, DEFAULT_FORMS, subscribeSalesForms, saveSalesForms, AdField, DiscoveryQuestion,
  ContentSlot, subscribeSlots, claimSlot, updateSlot, deleteSlot, weekKey,
  TrackedLink, subscribeLinks, createTrackedLink, linkUrl, adTagOf,
} from '../../services/salesToolsService';
import { WhenPicker, WhenValue, formatWhen } from '../common/WhenPicker';

/*
  تبويب المحتوى: شقة الأسبوع بالدور + أفكار من بيانات الشقة + سكربت + طلب تصوير،
  ومساعد كتابة الإعلان بخانات موجّهة + لينك متتبّع لكل إعلان.
*/
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const Card: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'dark'; className?: string }> = ({ children, tone, className = '' }) => (
  <section className={`rounded-2xl border p-4 flex flex-col gap-3 ${tone === 'gold' ? 'bg-[#FBF8F1] border-[#E8D3A6]' : tone === 'dark' ? 'bg-[#141414] text-white border-transparent' : 'bg-white border-[#ECE8DF]'} ${className}`}>{children}</section>
);

export const ContentTab: React.FC<{
  properties: Property[];
  agents: SalesAgent[];
  currentAgent?: SalesAgent;
  isAdmin: boolean;
}> = ({ properties, agents, currentAgent, isAdmin }) => {
  const [forms, setForms] = useState<SalesForms>(DEFAULT_FORMS);
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [tab, setTab] = useState<'video' | 'ad'>('video');
  const [editForms, setEditForms] = useState(false);
  useEffect(() => subscribeSalesForms(setForms), []);
  useEffect(() => subscribeSlots(setSlots), []);
  useEffect(() => subscribeLinks(currentAgent?.id || null, isAdmin, setLinks), [currentAgent?.id, isAdmin]);

  const wk = weekKey();
  const myId = currentAgent?.id || '';
  const mine = slots.filter((s) => s.weekKey === wk && s.agentId === myId);
  const takenCodes = slots.filter((s) => s.weekKey === wk).map((s) => s.code);
  const quota = forms.videosPerWeek;

  // الدور: مين اختار من زمان
  const lastPick: Record<string, number> = {};
  slots.forEach((s) => { lastPick[s.agentId] = Math.max(lastPick[s.agentId] || 0, s.createdAt); });
  const turnOrder = [...agents].filter((a) => a.isActive !== false).sort((a, b) => (lastPick[a.id] || 0) - (lastPick[b.id] || 0));
  const myTurn = turnOrder[0]?.id === myId;

  const exposure = (p: Property) => (p.clicks?.views || 0) + slots.filter((s) => s.code === p.code).length * 50;
  const available = useMemo(() => properties
    .filter((p) => p.category !== 'off_plan' && !(p as any).viewingsPaused && (p as any).allowPublish !== false && !takenCodes.includes(p.code))
    .sort((a, b) => exposure(a) - exposure(b)).slice(0, 12), [properties, takenCodes, slots]);

  const districtAvg = (p: Property) => {
    const peers = properties.filter((x) => x.neighborhood === p.neighborhood && x.area > 0);
    return peers.length ? peers.reduce((s, x) => s + x.price / x.area, 0) / peers.length : 0;
  };
  const ideasFor = (p: Property) => {
    const avg = districtAvg(p), ppm = p.area ? p.price / p.area : 0;
    const diff = avg ? Math.round(((ppm - avg) / avg) * 100) : 0;
    return [
      diff < 0 ? `سعرها أقل من متوسط ${p.neighborhood} بـ ${Math.abs(diff)}% — رقم بيوقف السكرول` : `${fmt(ppm)} للمتر في ${p.neighborhood} — اشرح ليه`,
      (p.features || [])[0] ? `ابدأ من: ${(p.features || [])[0]}` : 'الميزة اللي شوفتها بعينك ومش في الصور',
      'العيب اللي لازم يعرفه قبل ما ينزل يعاين — بيبني ثقة',
    ];
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setTab('video')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'video' ? 'bg-[#141414] text-white' : 'bg-white border border-[#ECE8DF]'}`}>فيديو الأسبوع</button>
        <button onClick={() => setTab('ad')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'ad' ? 'bg-[#141414] text-white' : 'bg-white border border-[#ECE8DF]'}`}>مساعد الإعلان</button>
        {isAdmin && <button onClick={() => setEditForms(!editForms)} className="mr-auto px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold flex items-center gap-1.5"><Settings2 size={14} />تعديل الخانات والأسئلة</button>}
      </div>

      {isAdmin && editForms && <FormsEditor forms={forms} onClose={() => setEditForms(false)} />}

      {tab === 'video' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone={myTurn ? 'gold' : undefined}>
            <div className="flex justify-between items-center">
              <p className="font-bold">الدور دلوقتي</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#141414] text-white">{turnOrder[0]?.name || '—'}</span>
            </div>
            <p className="text-sm text-[#6B665C]">فيديوهاتك الأسبوع ده: <b className={mine.length >= quota ? 'text-[#1E7A45]' : 'text-[#C2412D]'}>{mine.length} / {quota}</b></p>
            {mine.length < quota && (
              <>
                <p className="text-sm font-bold">اختار شقتك (الأقل ظهوراً الأول)</p>
                <div className="flex flex-wrap gap-2">
                  {available.map((p) => (
                    <button key={p.id} onClick={() => claimSlot({ weekKey: wk, agentId: myId, agentName: currentAgent?.name || '', propertyId: p.id, code: p.code, title: `${p.neighborhood} · ${p.area}م²` })}
                      className="px-3 py-2 rounded-xl bg-white border border-[#E4DFD4] text-xs font-semibold">
                      {p.code} · {p.neighborhood}
                    </button>
                  ))}
                  {!available.length && <span className="text-xs text-[#8C877D]">كل الشقق اتحجزت الأسبوع ده</span>}
                </div>
              </>
            )}
          </Card>

          {mine.map((s) => {
            const p = properties.find((x) => x.id === s.propertyId);
            return <SlotCard key={s.id} slot={s} ideas={p ? ideasFor(p) : []} agentName={currentAgent?.name || ''} agentId={myId} />;
          })}

          {isAdmin && (
            <Card className="lg:col-span-2">
              <p className="font-bold">التزام الفريق الأسبوع ده</p>
              {agents.filter((a) => a.isActive !== false).map((a) => {
                const n = slots.filter((s) => s.weekKey === wk && s.agentId === a.id).length;
                return (
                  <div key={a.id} className="flex justify-between items-center border-t border-[#F0ECE4] pt-2 text-sm">
                    <span className="font-bold">{a.name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${n >= quota ? 'bg-[#EEF5F0] text-[#1E7A45]' : n ? 'bg-[#EFE6D2] text-[#6E5418]' : 'bg-[#FBEDEA] text-[#C2412D]'}`}>{n} / {quota}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      ) : (
        <AdComposer forms={forms} properties={properties} agentId={myId} agentName={currentAgent?.name || ''} links={links} />
      )}
    </div>
  );
};

// ---------- كارت شقة الأسبوع: أفكار + سكربت + طلب تصوير + النتيجة ----------
const SlotCard: React.FC<{ slot: ContentSlot; ideas: string[]; agentName: string; agentId: string }> = ({ slot, ideas, agentName, agentId }) => {
  const [hook, setHook] = useState(slot.script?.hook || '');
  const [points, setPoints] = useState(slot.script?.points || '');
  const [question, setQuestion] = useState(slot.script?.question || '');
  const [when, setWhen] = useState<WhenValue | null>(null);
  const [busy, setBusy] = useState(false);
  const st = slot.shoot?.status;

  const saveScript = async () => { setBusy(true); try { await updateSlot(slot.id, { script: { hook, points, question } }); } finally { setBusy(false); } };
  const requestShoot = async () => {
    if (!when) return;
    setBusy(true);
    try {
      await updateSlot(slot.id, { script: { hook, points, question }, shoot: { dates: [when.label, ...(slot.shoot?.dates || [])].slice(0, 3), status: 'requested' } });
    } finally { setBusy(false); }
  };
  const publish = async () => {
    setBusy(true);
    try {
      const id = await createTrackedLink({ agentId, agentName, kind: 'video', code: slot.code, target: `/?property=${slot.code}`, title: `فيديو ${slot.code}` });
      await updateSlot(slot.id, { publishedAt: Date.now(), linkId: id });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="flex justify-between items-center">
        <p className="font-bold">{slot.code} · {slot.title}</p>
        <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[#F6F4EF]">{st === 'delivered' ? 'المونتاج جاهز' : st === 'shot' ? 'اتصوّر' : st === 'confirmed' ? `تصوير ${slot.shoot?.at || ''}` : st === 'requested' ? 'طلب تصوير مستني' : 'جديد'}</span>
      </div>
      {ideas.length > 0 && !slot.publishedAt && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-[#A07A26] flex items-center gap-1.5"><Sparkles size={13} />أفكار من بيانات الشقة</p>
          {ideas.map((t, i) => (
            <button key={i} onClick={() => setHook(t)} className="w-full text-right text-[13px] bg-[#F6F4EF] rounded-xl p-2.5 hover:bg-[#EFEBE3]">{t}</button>
          ))}
        </div>
      )}
      <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={2} placeholder="أول جملة (توقف السكرول)" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
      <textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={2} placeholder="3 نقط تتكلم فيهم" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
      <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="السؤال الختامي" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />

      {slot.shoot?.finalUrl && (
        <a href={slot.shoot.finalUrl} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-[#EEF5F0] text-[#1E7A45] text-center text-sm font-bold">نزّل الفيديو المونتاج</a>
      )}

      {!slot.publishedAt ? (
        <>
          {st !== 'requested' && st !== 'confirmed' && <WhenPicker value={when} onChange={setWhen} quick={false} label="ميعاد التصوير اللي يناسبك" />}
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={saveScript} className="py-3 rounded-xl bg-[#F6F4EF] text-sm font-bold">احفظ السكربت</button>
            {st === 'delivered' || st === 'shot' ? (
              <button disabled={busy} onClick={publish} className="py-3 rounded-xl bg-[#A07A26] text-white text-sm font-bold">نشرته · هات لينكي</button>
            ) : (
              <button disabled={busy || !when} onClick={requestShoot} className="py-3 rounded-xl bg-[#141414] text-white text-sm font-bold flex items-center justify-center gap-1.5"><Send size={14} />اطلب تصوير</button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-mono bg-[#F6F4EF] rounded-lg p-2.5 break-all" dir="ltr">{slot.linkId ? linkUrl(slot.linkId) : ''}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['مشاهدات', slot.stats?.views || 0], ['فتحات اللينك', slot.stats?.linkHits || 0], ['ليدز', slot.stats?.leads || 0]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-[#F6F4EF] py-2">
                <p className="font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{v as number}</p>
                <p className="text-[10px] text-[#6B665C]">{l as string}</p>
              </div>
            ))}
          </div>
          <input type="number" placeholder="سجّل المشاهدات بعد 48 ساعة" onBlur={(e) => e.target.value && updateSlot(slot.id, { stats: { ...(slot.stats || {}), views: Number(e.target.value) } })}
            className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-2.5 text-sm" />
        </div>
      )}
    </Card>
  );
};

// ---------- مساعد الإعلان ----------
const AdComposer: React.FC<{ forms: SalesForms; properties: Property[]; agentId: string; agentName: string; links: TrackedLink[] }> = ({ forms, properties, agentId, agentName, links }) => {
  const [code, setCode] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [sig, setSig] = useState<string>(() => { try { return localStorage.getItem('lion_ad_signature') || ''; } catch { return ''; } });
  const [out, setOut] = useState<{ text: string; url: string } | null>(null);
  const p = properties.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());

  const priceLine = useMemo(() => {
    if (!p) return '';
    const peers = properties.filter((x) => x.neighborhood === p.neighborhood && x.area > 0);
    const avg = peers.length ? peers.reduce((s, x) => s + x.price / x.area, 0) / peers.length : 0;
    const ppm = p.area ? p.price / p.area : 0;
    const d = avg ? Math.round(((ppm - avg) / avg) * 100) : 0;
    return `${fmt(p.price)} ج.م · ${fmt(ppm)} للمتر${avg ? ` · ${d <= 0 ? 'أقل من' : 'أعلى من'} متوسط الحي بـ ${Math.abs(d)}%` : ''}`;
  }, [p, properties]);

  const missing = forms.adFields.filter((f) => f.required && (vals[f.id] || '').trim().split(/\s+/).filter(Boolean).length < 4);

  const compose = async () => {
    if (!p) return;
    const id = await createTrackedLink({ agentId, agentName, kind: 'ad', code: p.code, target: `/?property=${p.code}`, title: `إعلان ${p.code}` });
    const url = linkUrl(id);
    const body = forms.adFields.map((f) => (f.id === 'price' ? (vals[f.id] || priceLine) : vals[f.id])).filter((x) => (x || '').trim()).join('\n\n');
    setOut({ text: `${body}\n\n${sig}\n${url}\nكود الوحدة: ${p.code} · ${adTagOf(agentName, p.code)}`, url });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <p className="font-bold">اكتب إعلانك</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="كود الشقة" dir="ltr" list="adcodes" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm font-mono" />
        <datalist id="adcodes">{properties.map((x) => <option key={x.id} value={x.code} />)}</datalist>
        {p && <p className="text-xs text-[#1E7A45]">✓ {p.title}</p>}
        {forms.adFields.map((f) => (
          <label key={f.id} className="space-y-1.5 block">
            <span className="text-[13px] font-bold flex items-center gap-2">{f.label}{f.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBEDEA] text-[#C2412D]">إجباري</span>}</span>
            <textarea rows={2} value={vals[f.id] ?? (f.id === 'price' ? priceLine : '')} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })}
              placeholder={f.example} className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
            <span className="text-[11px] text-[#8C877D]">{f.hint}</span>
          </label>
        ))}
        <label className="space-y-1.5 block">
          <span className="text-[13px] font-bold">توقيعك</span>
          <input value={sig} onChange={(e) => { setSig(e.target.value); try { localStorage.setItem('lion_ad_signature', e.target.value); } catch { /* */ } }}
            placeholder="سارة حنفي · استشاري الهضبة الوسطى · 01xxxxxxxxx" className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
        </label>
        <button disabled={!p || missing.length > 0} onClick={compose} className="py-3.5 rounded-xl bg-[#141414] text-white font-bold disabled:opacity-40">شوف الإعلان النهائي</button>
        {missing.length > 0 && <p className="text-[11px] text-[#C2412D]">اكتب 4 كلمات على الأقل في: {missing.map((f) => f.label).join('، ')}</p>}
      </Card>

      <div className="space-y-4">
        {out && (
          <Card tone="gold">
            <p className="font-bold">الإعلان جاهز</p>
            <pre className="whitespace-pre-wrap text-[13px] leading-7 font-[inherit]">{out.text}</pre>
            <button onClick={() => navigator.clipboard?.writeText(out.text)} className="py-3 rounded-xl bg-[#141414] text-white font-bold flex items-center justify-center gap-2"><Copy size={16} />انسخ الإعلان</button>
          </Card>
        )}
        <Card>
          <p className="font-bold flex items-center gap-2"><Link2 size={16} className="text-[#A07A26]" />لينكاتك المتتبّعة</p>
          {links.slice(0, 8).map((l) => (
            <div key={l.id} className="flex justify-between items-center border-t border-[#F0ECE4] pt-2 text-sm gap-2">
              <span className="truncate">{l.title || l.code}</span>
              <span className="flex gap-2 text-[11px] shrink-0">
                <span className="px-2 py-1 rounded-lg bg-[#F6F4EF]">{l.hits} فتحة</span>
                <span className="px-2 py-1 rounded-lg bg-[#EEF5F0] text-[#1E7A45]">{l.waClicks} واتساب</span>
                <button onClick={() => navigator.clipboard?.writeText(linkUrl(l.id))} className="px-2 py-1 rounded-lg bg-[#141414] text-white">نسخ</button>
              </span>
            </div>
          ))}
          {!links.length && <p className="text-xs text-[#8C877D]">هتظهر هنا أول ما تعمل إعلان</p>}
        </Card>
      </div>
    </div>
  );
};

// ---------- تعديل الأسئلة والخانات (للأدمن) ----------
const FormsEditor: React.FC<{ forms: SalesForms; onClose: () => void }> = ({ forms, onClose }) => {
  const [d, setD] = useState(forms);
  const [busy, setBusy] = useState(false);
  const inp = 'w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-2.5 text-sm';
  const save = async () => { setBusy(true); try { await saveSalesForms(d); onClose(); } finally { setBusy(false); } };
  return (
    <Card tone="gold">
      <p className="font-bold">تعديل أسئلة الاكتشاف وخانات الإعلان</p>
      <div className="grid gap-2 sm:grid-cols-4">
        {[['أقل عدد إجابات', 'minAnswers'], ['عدد شقق العرض', 'offerUnits'], ['صلاحية العرض (ساعة)', 'offerHours'], ['فيديوهات أسبوعياً', 'videosPerWeek']].map(([l, k]) => (
          <label key={k} className="text-xs font-bold space-y-1">{l}
            <input type="number" value={(d as any)[k]} onChange={(e) => setD({ ...d, [k]: Number(e.target.value) } as SalesForms)} className={inp} />
          </label>
        ))}
      </div>

      <p className="font-bold text-sm pt-2">أسئلة مكالمة الاكتشاف</p>
      {d.discovery.map((q, i) => (
        <div key={q.id} className="grid gap-2 sm:grid-cols-12 items-center border-b border-[#E8D3A6] pb-2">
          <input value={q.label} onChange={(e) => setD({ ...d, discovery: d.discovery.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={`${inp} sm:col-span-4`} />
          <input value={(q.options || []).join('، ')} placeholder="الاختيارات مفصولة بفاصلة" onChange={(e) => setD({ ...d, discovery: d.discovery.map((x, j) => (j === i ? { ...x, options: e.target.value.split('،').map((s) => s.trim()).filter(Boolean) } : x)) })} className={`${inp} sm:col-span-5`} />
          <label className="sm:col-span-2 text-xs flex items-center gap-1.5"><input type="checkbox" checked={!!q.required} onChange={(e) => setD({ ...d, discovery: d.discovery.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)) })} />إجباري</label>
          <button onClick={() => setD({ ...d, discovery: d.discovery.filter((_, j) => j !== i) })} className="sm:col-span-1 text-[#C2412D]"><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => setD({ ...d, discovery: [...d.discovery, { id: `q${Date.now()}`, label: '', type: 'chips', options: [] } as DiscoveryQuestion] })} className="self-start text-xs font-bold text-[#A07A26] flex items-center gap-1"><Plus size={13} />سؤال جديد</button>

      <p className="font-bold text-sm pt-2">خانات الإعلان</p>
      {d.adFields.map((f, i) => (
        <div key={f.id} className="grid gap-2 sm:grid-cols-12 items-center border-b border-[#E8D3A6] pb-2">
          <input value={f.label} onChange={(e) => setD({ ...d, adFields: d.adFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={`${inp} sm:col-span-4`} />
          <input value={f.hint} placeholder="التلميح" onChange={(e) => setD({ ...d, adFields: d.adFields.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)) })} className={`${inp} sm:col-span-3`} />
          <input value={f.example} placeholder="مثال" onChange={(e) => setD({ ...d, adFields: d.adFields.map((x, j) => (j === i ? { ...x, example: e.target.value } : x)) })} className={`${inp} sm:col-span-3`} />
          <label className="sm:col-span-1 text-xs flex items-center gap-1"><input type="checkbox" checked={!!f.required} onChange={(e) => setD({ ...d, adFields: d.adFields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)) })} />إجباري</label>
          <button onClick={() => setD({ ...d, adFields: d.adFields.filter((_, j) => j !== i) })} className="sm:col-span-1 text-[#C2412D]"><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => setD({ ...d, adFields: [...d.adFields, { id: `f${Date.now()}`, label: '', hint: '', example: '' } as AdField] })} className="self-start text-xs font-bold text-[#A07A26] flex items-center gap-1"><Plus size={13} />خانة جديدة</button>

      <div className="flex gap-2 pt-2">
        <button disabled={busy} onClick={save} className="flex-1 py-3 rounded-xl bg-[#141414] text-white font-bold">حفظ</button>
        <button onClick={onClose} className="px-5 py-3 rounded-xl bg-white border border-[#E4DFD4] font-bold">إلغاء</button>
      </div>
    </Card>
  );
};
