import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Link2, Settings2, Trash2, Check, Upload, Video, X } from 'lucide-react';
import { Property, SalesAgent } from '../../types';
import {
  SalesForms, DEFAULT_FORMS, subscribeSalesForms, saveSalesForms, AdField, DiscoveryQuestion,
  ContentSlot, subscribeSlots, claimSlot, updateSlot, deleteSlot, weekKey,
  TrackedLink, subscribeLinks, createTrackedLink, linkUrl, adTagOf,
} from '../../services/salesToolsService';
import { uploadFile } from '../../services/mediaStorage';
import { realImages } from '../../utils/propertyMedia';

/*
  تبويب المحتوى:
  - فيديو الأسبوع: الأدمن بيحدد الشقق، كل سيلز بياخد فيديوهين منها في الأسبوع،
    السكربت بيطلع جاهز من بيانات الشقة، وهو بيصوّر بموبايله ويرفع. ٣ خطوات بس.
  - مساعد الإعلان زي ما هو.
*/
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const Card: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'dark'; className?: string }> = ({ children, tone, className = '' }) => (
  <section className={`rounded-2xl border p-4 flex flex-col gap-3 ${tone === 'gold' ? 'bg-[#FBF8F1] border-[#E8D3A6]' : tone === 'dark' ? 'bg-[#141414] text-white border-transparent' : 'bg-white border-[#ECE8DF]'} ${className}`}>{children}</section>
);
const imgOf = (p?: Property) => (p ? (realImages(p)[0] || p.images?.[0] || '') : '');

/* السكربت الجاهز من بيانات الشقة — الأرقام الحقيقية بس */
function scriptFor(p: Property, properties: Property[]) {
  const peers = properties.filter((x) => x.id !== p.id && x.neighborhood === p.neighborhood && x.area > 0 && x.price > 0 && x.category !== 'off_plan');
  const ppm = p.area ? p.price / p.area : 0;
  const avg = peers.length >= 3 ? peers.reduce((s, x) => s + x.price / x.area, 0) / peers.length : 0;
  const diff = avg && ppm ? Math.round(((ppm - avg) / avg) * 100) : 0;
  const feat = (p.features || []).filter(Boolean);
  const hook = diff <= -5
    ? `شقة في ${p.neighborhood} متر بـ ${fmt(ppm)} — أقل من متوسط الحي بـ ${Math.abs(diff)}٪`
    : feat[0]
      ? `${p.area} متر في ${p.neighborhood}… و${feat[0]}`
      : `${p.area} متر في ${p.neighborhood} بـ ${fmt(p.price)} جنيه — تعالى أوريك`;
  const points = [
    `${p.area} م² · ${p.bedrooms} غرف${p.bathrooms ? ` · ${p.bathrooms} حمام` : ''}${p.floor ? ` · ${p.floor}` : ''}`,
    [p.finishingLabel, p.view].filter(Boolean).join(' · ') || 'التشطيب والفيو — صوّرهم كويس',
    feat.slice(1, 3).join(' · ') || 'أحلى حاجة شفتها بعينك في الشقة',
  ];
  const question = 'لو عايز تعاينها ابعتلي «معاينة» وأنا أظبطلك ميعاد';
  return { hook, points, question };
}

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
  const [poolOpen, setPoolOpen] = useState(false);
  useEffect(() => subscribeSalesForms(setForms), []);
  useEffect(() => subscribeSlots(setSlots), []);
  useEffect(() => subscribeLinks(currentAgent?.id || null, isAdmin, setLinks), [currentAgent?.id, isAdmin]);

  const wk = weekKey();
  const myId = currentAgent?.id || '';
  const weekSlots = slots.filter((s) => s.weekKey === wk);
  const mine = weekSlots.filter((s) => s.agentId === myId);
  const quota = forms.videosPerWeek || 2;
  const pool = forms.videoPool || [];
  const byCode = (c: string) => properties.find((p) => p.code === c);
  const takenBy = (code: string) => weekSlots.find((s) => s.code === code);
  const choices = pool.map(byCode).filter((p): p is Property => !!p);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setTab('video')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'video' ? 'bg-[#141414] text-white' : 'bg-white border border-[#ECE8DF]'}`}>فيديو الأسبوع</button>
        <button onClick={() => setTab('ad')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'ad' ? 'bg-[#141414] text-white' : 'bg-white border border-[#ECE8DF]'}`}>مساعد الإعلان</button>
        {isAdmin && tab === 'video' && <button onClick={() => setPoolOpen(true)} className="mr-auto px-3 py-2 rounded-xl bg-[#A07A26] text-white text-xs font-bold flex items-center gap-1.5"><Video size={14} />اختار شقق الفيديو ({pool.length})</button>}
        {isAdmin && tab === 'ad' && <button onClick={() => setEditForms(!editForms)} className="mr-auto px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold flex items-center gap-1.5"><Settings2 size={14} />تعديل الخانات</button>}
      </div>

      {isAdmin && editForms && tab === 'ad' && <FormsEditor forms={forms} onClose={() => setEditForms(false)} />}
      {poolOpen && <PoolPicker properties={properties} pool={pool} quota={quota} onClose={() => setPoolOpen(false)} />}

      {tab === 'video' ? (
        <div className="space-y-4">
          {/* السيلز: فيديوهاته */}
          {currentAgent && (
            <>
              <Card tone={mine.length >= quota ? undefined : 'gold'}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">فيديوهاتك الأسبوع ده</p>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${mine.filter((s) => s.videoUrl).length >= quota ? 'bg-[#EEF5F0] text-[#1E7A45]' : 'bg-[#FBEDEA] text-[#C2412D]'}`}>
                    {mine.filter((s) => s.videoUrl).length} / {quota} اترفعوا
                  </span>
                </div>
                <p className="text-xs text-[#6B665C]">١) اختار شقة ← ٢) صوّرها بموبايلك بالسكربت ← ٣) ارفع الفيديو وخد لينكك</p>
              </Card>

              {mine.map((s) => (
                <VideoCard key={s.id} slot={s} property={byCode(s.code)} properties={properties} agentId={myId} agentName={currentAgent.name} />
              ))}

              {mine.length < quota && (
                <Card>
                  <p className="font-bold">١) اختار شقة ({quota - mine.length} باقي)</p>
                  {!choices.length ? (
                    <p className="text-xs text-[#8C877D] bg-[#F6F4EF] rounded-xl p-3">الإدارة لسه ماحددتش شقق الفيديو.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {choices.map((p) => {
                        const t = takenBy(p.code);
                        return (
                          <button key={p.id} disabled={!!t}
                            onClick={() => claimSlot({ weekKey: wk, agentId: myId, agentName: currentAgent.name, propertyId: p.id, code: p.code, title: `${p.neighborhood} · ${p.area}م²` })}
                            className="text-right rounded-xl border border-[#ECE8DF] overflow-hidden bg-white disabled:opacity-40 hover:border-[#A07A26]">
                            <div className="aspect-[4/3] bg-[#F6F4EF]">{imgOf(p) && <img src={imgOf(p)} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                            <div className="p-2 space-y-0.5">
                              <p className="text-xs font-bold font-mono">{p.code}</p>
                              <p className="text-[11px] text-[#6B665C]">{p.neighborhood} · {p.area}م² · {p.bedrooms} غرف</p>
                              <p className="text-[11px] font-bold">{fmt(p.price)} ج</p>
                              {t && <p className="text-[10px] font-bold text-[#C2412D]">خدها {t.agentName}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* الأدمن: التزام الفريق */}
          {isAdmin && (
            <Card>
              <p className="font-bold">الفريق الأسبوع ده</p>
              {agents.filter((a) => a.isActive !== false).map((a) => {
                const ss = weekSlots.filter((s) => s.agentId === a.id);
                const up = ss.filter((s) => s.videoUrl).length;
                return (
                  <div key={a.id} className="border-t border-[#F0ECE4] pt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold">{a.name}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${up >= quota ? 'bg-[#EEF5F0] text-[#1E7A45]' : up ? 'bg-[#EFE6D2] text-[#6E5418]' : 'bg-[#FBEDEA] text-[#C2412D]'}`}>{up} / {quota}</span>
                    </div>
                    {ss.map((s) => {
                      const l = links.find((x) => x.id === s.linkId);
                      return (
                        <div key={s.id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold">{s.code}</span>
                          {s.videoUrl
                            ? <a href={s.videoUrl} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded-lg bg-[#141414] text-white font-bold">▶ الفيديو</a>
                            : <span className="px-2 py-0.5 rounded-lg bg-[#F6F4EF] text-[#8C877D]">لسه ماترفعش</span>}
                          {l && <span className="text-[#6B665C]">{l.hits} فتحة · {l.waClicks} واتساب</span>}
                          <button onClick={() => { if (window.confirm(`تشيل ${s.code} من ${a.name}؟`)) deleteSlot(s.id); }} className="text-[#C2412D]" aria-label="شيل"><Trash2 size={12} /></button>
                        </div>
                      );
                    })}
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

// ---------- الأدمن بيختار شقق الفيديو ----------
const PoolPicker: React.FC<{ properties: Property[]; pool: string[]; quota: number; onClose: () => void }> = ({ properties, pool, quota, onClose }) => {
  const [sel, setSel] = useState<string[]>(pool);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const list = properties
    .filter((p) => p.code && p.category !== 'off_plan')
    .filter((p) => !q.trim() || `${p.code} ${p.neighborhood} ${p.title}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(sel.includes(b.code)) - Number(sel.includes(a.code)) || (a.clicks?.views || 0) - (b.clicks?.views || 0));
  const toggle = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const save = async () => {
    setBusy(true);
    try { await saveSalesForms({ videoPool: sel }); onClose(); }
    catch (e: any) { alert(`ماتحفظش — ${String(e?.code || '').includes('permission') ? 'الصلاحيات رافضة' : 'جرّب تاني'}`); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-sm">شقق الفيديو — اختار {sel.length}</p>
            <p className="text-[11px] text-[#8C877D]">السيلز هيختار منها بس، كل واحد {quota} في الأسبوع. الأقل مشاهدة فوق.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
        </div>
        <div className="p-3 border-b border-[#ECE8DF]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالكود أو الحي" className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-2.5 text-sm" />
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {list.map((p) => {
            const on = sel.includes(p.code);
            return (
              <button key={p.id} onClick={() => toggle(p.code)} className={`relative text-right rounded-xl border-2 overflow-hidden ${on ? 'border-[#A07A26]' : 'border-[#ECE8DF]'}`}>
                <div className="aspect-[4/3] bg-[#F6F4EF]">{imgOf(p) && <img src={imgOf(p)} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                {on && <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#A07A26] text-white flex items-center justify-center"><Check size={14} /></span>}
                <div className="p-2">
                  <p className="text-xs font-bold font-mono">{p.code}</p>
                  <p className="text-[11px] text-[#6B665C]">{p.neighborhood} · {p.area}م² · {fmt(p.price)}</p>
                  <p className="text-[10px] text-[#8C877D]">{p.clicks?.views || 0} مشاهدة</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-[#ECE8DF] flex gap-2">
          <button disabled={busy} onClick={save} className="flex-1 py-3 rounded-xl bg-[#141414] text-white font-bold disabled:opacity-50">احفظ ({sel.length} شقة)</button>
          {sel.length > 0 && <button onClick={() => setSel([])} className="px-4 py-3 rounded-xl bg-[#F6F4EF] font-bold text-sm">شيل الكل</button>}
        </div>
      </div>
    </div>
  );
};

// ---------- كارت الفيديو: سكربت جاهز + رفع + لينك ----------
const VideoCard: React.FC<{ slot: ContentSlot; property?: Property; properties: Property[]; agentId: string; agentName: string }> = ({ slot, property: p, properties, agentId, agentName }) => {
  const auto = useMemo(() => (p ? scriptFor(p, properties) : null), [p, properties]);
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const done = !!slot.videoUrl;
  const script = auto ? `${auto.hook}\n\n• ${auto.points.join('\n• ')}\n\n${auto.question}` : '';

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy('بيرفع... 0٪');
    try {
      const url = await uploadFile(file, 'sales_videos', `${slot.weekKey}_${agentId}_${slot.code}`, (pc) => setBusy(`بيرفع... ${pc}٪`));
      let linkId = slot.linkId;
      if (!linkId) linkId = await createTrackedLink({ agentId, agentName, kind: 'video', code: slot.code, target: `/?property=${slot.code}`, title: `فيديو ${slot.code}` });
      await updateSlot(slot.id, { videoUrl: url, linkId, publishedAt: Date.now() });
    } catch (e: any) {
      alert(e?.message || 'الرفع مانجحش — جرّب تاني');
    } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <Card tone={done ? undefined : 'gold'}>
      <div className="flex gap-3">
        {imgOf(p) && <img src={imgOf(p)} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold font-mono">{slot.code}</p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${done ? 'bg-[#EEF5F0] text-[#1E7A45]' : 'bg-white text-[#6E5418]'}`}>{done ? '✓ اترفع' : 'مستني تصوير'}</span>
          </div>
          {p && <p className="text-xs text-[#6B665C]">{p.neighborhood} · {p.area}م² · {p.bedrooms} غرف · {fmt(p.price)} ج</p>}
          {!done && <button onClick={() => { if (window.confirm('تسيب الشقة دي وتختار غيرها؟')) deleteSlot(slot.id).catch(() => alert('ماتشالتش — كلّم الإدارة')); }} className="text-[11px] text-[#C2412D] underline mt-1">غيّر الشقة</button>}
        </div>
      </div>

      {!done && auto && (
        <div className="bg-white rounded-xl border border-[#E8D3A6] p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#A07A26]">٢) السكربت — قوله وإنت بتصوّر</p>
            <button onClick={() => navigator.clipboard?.writeText(script)} className="text-[11px] font-bold flex items-center gap-1"><Copy size={12} />انسخ</button>
          </div>
          <p className="text-sm font-bold">🎬 {auto.hook}</p>
          {auto.points.map((t, i) => <p key={i} className="text-[13px]">• {t}</p>)}
          <p className="text-[13px] text-[#6B665C]">❓ {auto.question}</p>
        </div>
      )}

      {done ? (
        <div className="space-y-2">
          <a href={slot.videoUrl} target="_blank" rel="noreferrer" className="block text-center py-2 rounded-xl bg-[#F6F4EF] text-sm font-bold">▶ شوف الفيديو</a>
          {slot.linkId && (
            <div className="flex gap-2">
              <p className="flex-1 text-xs font-mono bg-[#F6F4EF] rounded-lg p-2.5 break-all" dir="ltr">{linkUrl(slot.linkId)}</p>
              <button onClick={() => navigator.clipboard?.writeText(linkUrl(slot.linkId!))} className="px-3 rounded-lg bg-[#141414] text-white text-xs font-bold flex items-center gap-1"><Link2 size={12} />انسخ لينكك</button>
            </div>
          )}
          <p className="text-[11px] text-[#8C877D]">انشر الفيديو وحط اللينك ده معاه — كل اللي يفتح منه بيتحسب ليك.</p>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button disabled={!!busy} onClick={() => fileRef.current?.click()} className="py-3.5 rounded-xl bg-[#141414] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            <Upload size={16} />{busy || '٣) ارفع الفيديو'}
          </button>
        </>
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
      <p className="font-bold">تعديل خانات الإعلان</p>
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
