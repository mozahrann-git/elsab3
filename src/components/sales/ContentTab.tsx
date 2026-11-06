import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Link2, Settings2, Trash2, Check, Upload, Video, X } from 'lucide-react';
import { UnitThumb } from '../crm/UnitThumb';
import { Property, SalesAgent } from '../../types';
import {
  SalesForms, DEFAULT_FORMS, subscribeSalesForms, saveSalesForms,
  ContentSlot, subscribeSlots, claimSlot, updateSlot, deleteSlot, weekKey,
  TrackedLink, subscribeLinks, createTrackedLink, linkUrl,
} from '../../services/salesToolsService';
import {
  DailySettings, DEFAULT_DAILY_SETTINGS, subscribeDailySettings, workDay, workWeek,
  AdPost, subscribeMyAds, subscribeAdsOfDay, distribute, distributeFor, assignKey, saveAdAssign, starReasons, STAR_LABEL, duplicatesOf, advertisableResale, advertisableProjects,
} from '../../services/dailyTasks';
import { Project, subscribeProjects } from '../../services/projectService';
import { AdsPanel } from './DailyTab';
import { uploadFile } from '../../services/mediaStorage';
import { realImages } from '../../utils/propertyMedia';

/*
  تبويب المحتوى:
  - فيديو الأسبوع: الأدمن بيحدد الشقق، كل سيلز بياخد فيديوهين منها في الأسبوع،
    السكربت بيطلع جاهز من بيانات الشقة، وهو بيصوّر بموبايله ويرفع. ٣ خطوات بس.
  - إعلانات النهارده: الشقق المتوزعة على السيلز الأسبوع ده (كانت جوه «يومي»)،
    كل شقة نصها وصورها جاهزين — بدل «مساعد الإعلان» اللي كان بيكتب من الصفر.
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
  const [tab, setTab] = useState<'video' | 'ads'>('ads');
  const [poolOpen, setPoolOpen] = useState(false);
  const [settings, setSettings] = useState<DailySettings>(DEFAULT_DAILY_SETTINGS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [myAds, setMyAds] = useState<AdPost[]>([]);
  const [dayAds, setDayAds] = useState<AdPost[]>([]);
  useEffect(() => subscribeSalesForms(setForms), []);
  useEffect(() => subscribeDailySettings(setSettings), []);
  useEffect(() => subscribeProjects(setProjects), []);
  const adDay = workDay(Date.now(), settings.closeHour);
  const adWeek = workWeek(adDay);
  useEffect(() => (currentAgent?.id ? subscribeMyAds(currentAgent.id, adDay, setMyAds) : undefined), [currentAgent?.id, adDay]);
  useEffect(() => (isAdmin ? subscribeAdsOfDay(adDay, setDayAds) : undefined), [isAdmin, adDay]);
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
      <div className="flex items-center gap-2">
        <div className="flex p-1 rounded-[16px] bg-white border border-[#E7DFCF]">
          {([['ads', 'إعلانات النهارده'], ['video', 'فيديو الأسبوع']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`h-10 px-4 rounded-[12px] text-[13px] font-bold transition ${tab === k ? 'bg-[#17150F] text-[#F5F0E6]' : 'text-[#6F695D]'}`}>{l}</button>
          ))}
        </div>
        {isAdmin && tab === 'video' && <button onClick={() => setPoolOpen(true)} className="mr-auto h-10 px-3 rounded-[14px] bg-[#A07A26] text-white text-xs font-bold flex items-center gap-1.5"><Video size={14} />شقق الفيديو ({pool.length})</button>}
      </div>

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
                            <UnitThumb p={p} className="aspect-[4/3]" />
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
        <div className="space-y-4">
          {currentAgent && (
            <AdsPanel agentId={myId} agentName={currentAgent.name} agentPhone={currentAgent.phone} day={adDay} week={adWeek}
              settings={settings} properties={properties} projects={projects} myAds={myAds} />
          )}
          {isAdmin && <AdsSplit agents={agents} settings={settings} properties={properties} projects={projects} week={adWeek} day={adDay} dayAds={dayAds} />}
          {currentAgent && links.length > 0 && (
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
            </Card>
          )}
        </div>
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

/* الإدارة: مين معاه أنهي شقق للإعلان — بتلات طرق:
   يدوي (شقق بالكود) · بالحي (أحياء لكل سيلز) · بالتساوي الذكي (نفس العدد والمميز متقسّم بالعدل).
   الطريقة بتمشي للأسبوع ده أو الشهر ده، وبعدها بيرجع أوتوماتيك. نفس الأعداد اليومية. */
const AdsSplit: React.FC<{ agents: SalesAgent[]; settings: DailySettings; properties: Property[]; projects: Project[]; week: string; day: string; dayAds: AdPost[] }> = ({ agents, settings, properties, projects, day, dayAds }) => {
  const allResale = useMemo(() => advertisableResale(properties), [properties]);
  const allProj = useMemo(() => advertisableProjects(projects), [projects]);
  const stars = useMemo(() => starReasons(allResale), [allResale]);
  const isStar = (c: string) => stars.has(c);
  const resale = useMemo(() => distributeFor(allResale, settings, day, isStar), [allResale, settings, day, stars]);
  const proj = useMemo(() => distributeFor(allProj, settings, day), [allProj, settings, day]);
  const dups = useMemo(() => duplicatesOf(resale as any, proj as any), [resale, proj]);
  const team = settings.agentIds.map((id) => agents.find((a) => a.id === id)).filter((a): a is SalesAgent => !!a);
  const T = settings.targets;
  const cur = settings.adAssign;
  const [period, setPeriod] = useState<'week' | 'month'>(cur?.period || 'week');
  const key = assignKey(period, day);
  const live = cur && cur.key === key ? cur : undefined;
  const mode = live?.mode || 'manual';
  const liveMap: Record<string, string[]> = live?.map || {};
  const liveHoods: Record<string, string[]> = live?.hoods || {};
  const [open, setOpen] = useState('');
  const [pick, setPick] = useState<{ id: string; codes: Set<string>; q: string } | null>(null);
  const [hoodPick, setHoodPick] = useState<{ id: string; hoods: Set<string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const nameOf = (id?: string) => agents.find((a) => a.id === id)?.name || '';
  const save = async (patch: Partial<NonNullable<DailySettings['adAssign']>>) => {
    setBusy(true); setMsg('');
    try {
      await saveAdAssign({ period, key, mode, map: liveMap, hoods: liveHoods, ...patch });
      setMsg('اتحفظ ✓');
    } catch { setMsg('الحفظ ماوصلش — جرّب تاني'); }
    finally { setBusy(false); }
  };
  const holderOf = (code: string) => [...resale, ...proj].filter(([, l]) => l.some((x) => x.code === code)).map(([id]) => id);
  /* الحي ← كام شقة، ومع مين */
  const hoodList = useMemo(() => {
    const m = new Map<string, number>();
    [...allResale, ...allProj].forEach((x: any) => { const h = String(x.neighborhood || '').trim(); if (h) m.set(h, (m.get(h) || 0) + 1); });
    return [...m].sort((x, y) => y[1] - x[1]);
  }, [allResale, allProj]);
  const hoodOwners = (h: string, except: string) => Object.entries(liveHoods).filter(([id, hs]) => id !== except && hs.includes(h)).map(([id]) => nameOf(id));
  /* حل المكرر: الشقة تفضل مع واحد بس */
  const keepWith = async (code: string, keeper: string) => {
    if (mode === 'manual') {
      const m: Record<string, string[]> = {};
      Object.entries(liveMap).forEach(([id, cs]) => { m[id] = id === keeper ? cs : cs.filter((c) => c !== code); });
      await save({ map: m });
    } else if (mode === 'hood') {
      const h = String(([...allResale, ...allProj] as any[]).find((x) => x.code === code)?.neighborhood || '');
      const hs: Record<string, string[]> = {};
      Object.entries(liveHoods).forEach(([id, list]) => { hs[id] = id === keeper ? list : list.filter((x) => x !== h); });
      await save({ hoods: hs });
    }
  };
  const starAll = [...stars.keys()];
  const starFree = starAll.filter((c) => !holderOf(c).length);

  return (
    <div className="rounded-[28px] bg-white border border-[#E7DFCF] p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-readex font-semibold text-[19px]">توزيع شقق الإعلانات</p>
          <p className="text-[12.5px] text-[#6F695D] mt-0.5 leading-relaxed">كل سيلز مايظهرلوش غير شققه. المطلوب كل يوم {T.adsResale} ريسيل و{T.adsOffPlan} تحت الإنشاء.</p>
        </div>
        <div className="flex p-1 rounded-[14px] bg-[#F5F0E6] border border-[#E7DFCF]">
          {([['week', 'الأسبوع ده'], ['month', 'الشهر ده']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`h-9 px-3 rounded-[10px] text-[12px] font-bold ${period === k ? 'bg-[#17150F] text-[#F5F0E6]' : 'text-[#6F695D]'}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* طريقة التقسيم */}
      <div className="grid grid-cols-3 gap-1.5">
        {([['manual', 'يدوي', 'تختار شقق كل واحد'], ['hood', 'بالحي', 'كل سيلز ياخد أحياء'], ['smart', 'بالتساوي الذكي', 'نفس العدد والمميز بالعدل']] as const).map(([k, t, d]) => (
          <button key={k} disabled={busy} onClick={() => save({ mode: k })}
            className={`rounded-[16px] p-2.5 text-right border ${mode === k ? 'bg-[#17150F] text-white border-[#17150F]' : 'bg-[#F5F0E6] border-[#E7DFCF]'}`}>
            <span className="block text-[13px] font-bold">{t}</span>
            <span className={`block text-[10.5px] ${mode === k ? 'text-white/70' : 'text-[#6F695D]'}`}>{d}</span>
          </button>
        ))}
      </div>
      {cur && cur.key !== key && <p className="text-[11.5px] text-[#7A5E12] bg-[#FFF4D9] rounded-2xl px-3 py-2">التوزيع المتحفظ كان لفترة تانية ({cur.key}) — دلوقتي شغال أوتوماتيك لحد ما تختار.</p>}
      {msg && <p className="text-[12px] font-bold text-[#22483A]">{msg}</p>}

      {/* المميز */}
      {starAll.length > 0 && (
        <div className="rounded-[18px] bg-[#FBF5E6] border border-[#EBDDB8] px-3.5 py-2.5 space-y-1">
          <p className="text-[13px] font-bold">⭐ عندك {starAll.length} شقة مميزة: {starAll.length - starFree.length} متوزعين{starFree.length ? ` و${starFree.length} مع محدش` : ''}</p>
          <div className="flex flex-wrap gap-1.5">
            {starAll.map((c) => (
              <span key={c} title={stars.get(c)!.map((w) => STAR_LABEL[w]).join(' · ')}
                className={`text-[11px] px-2 py-1 rounded-lg ${holderOf(c).length ? 'bg-white' : 'bg-[#D3262B] text-white'}`}>
                <b className="font-mono">{c}</b> · {stars.get(c)!.map((w) => STAR_LABEL[w]).join('، ')}{holderOf(c).length ? ` · ${holderOf(c).map(nameOf).join('، ')}` : ' · مع محدش'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* المكرر */}
      {dups.size > 0 && (
        <div className="rounded-[18px] bg-[#FBECEA] border border-[#EBC1BC] px-3.5 py-2.5 space-y-2">
          <p className="text-[13px] font-bold text-[#9E2A1B]">⚠️ {dups.size} شقة مع أكتر من سيلز — اختار تفضل مع مين</p>
          {[...dups].slice(0, 30).map(([code, ids]) => (
            <div key={code} className="flex items-center gap-1.5 flex-wrap text-[12px]">
              <b className="font-mono">{code}</b><span className="text-[#6F695D]">مع</span>
              {ids.map((id) => (
                <button key={id} disabled={busy} onClick={() => keepWith(code, id)} className="h-7 px-2.5 rounded-full bg-white border border-[#EBC1BC] font-bold">خليها مع {nameOf(id)}</button>
              ))}
            </div>
          ))}
        </div>
      )}

      {!team.length && <p className="text-[13px] text-[#6F695D] bg-[#F5F0E6] rounded-2xl p-4">مفيش حد داخل المهام اليومية لسه.</p>}
      {team.map((a) => {
        const r = resale.get(a.id) || [], p = proj.get(a.id) || [];
        const nStar = r.filter((x) => isStar(x.code)).length;
        const own = mode === 'manual' ? !!liveMap[a.id]?.length : mode === 'hood' ? !!liveHoods[a.id]?.length : true;
        const mine = dayAds.filter((x) => x.agentId === a.id && x.status !== 'rejected');
        const rr = mine.filter((x) => x.kind === 'resale').length, pp = mine.filter((x) => x.kind === 'offplan').length;
        const ok = rr >= T.adsResale && pp >= T.adsOffPlan;
        return (
          <div key={a.id} className="rounded-[20px] bg-[#F5F0E6] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setOpen(open === a.id ? '' : a.id)} className="min-w-0 text-right">
                <span className="block font-semibold text-[14.5px] truncate">{a.name} <span className={`text-[10.5px] px-2 py-0.5 rounded-full ${own && live ? 'bg-[#17150F] text-white' : 'bg-white text-[#6F695D]'}`}>{!live ? 'أوتوماتيك' : mode === 'smart' ? 'بالتساوي' : own ? (mode === 'hood' ? 'بالحي' : 'يدوي') : 'أوتوماتيك من الباقي'}</span></span>
                <span className="block text-[11.5px] text-[#6F695D]">معاه {r.length} ريسيل{nStar ? ` (⭐${nStar})` : ''} · {p.length} مشروع · النهارده {rr}/{T.adsResale} · {pp}/{T.adsOffPlan}{ok ? ' ✓' : ''}</span>
                {mode === 'hood' && liveHoods[a.id]?.length ? <span className="block text-[11px] text-[#8E6C1F] truncate">{liveHoods[a.id].join('، ')}</span> : null}
              </button>
              {mode === 'manual' && (
                <button onClick={() => setPick({ id: a.id, codes: new Set(liveMap[a.id] || [...r, ...p].map((x) => x.code)), q: '' })}
                  className="shrink-0 h-9 px-3 rounded-[12px] bg-[#17150F] text-[#F5F0E6] text-[12px] font-bold">اختار شققه</button>
              )}
              {mode === 'hood' && (
                <button onClick={() => setHoodPick({ id: a.id, hoods: new Set(liveHoods[a.id] || []) })}
                  className="shrink-0 h-9 px-3 rounded-[12px] bg-[#17150F] text-[#F5F0E6] text-[12px] font-bold">اختار أحياءه</button>
              )}
            </div>
            {open === a.id && (
              <div className="flex flex-wrap gap-1.5">
                {[...r.map((x) => x.code), ...p.map((x) => x.code)].map((c) => (
                  <span key={c} className={`font-mono text-[11px] px-2 py-1 rounded-lg ${mine.some((m) => m.code === c) ? 'bg-[#22483A] text-white' : dups.has(c) ? 'bg-[#FBECEA] text-[#9E2A1B]' : 'bg-white'}`}>{isStar(c) ? '⭐' : ''}{c}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {pick && (() => {
        const q = pick.q.trim().toLowerCase();
        const row = (code: string, sub: string, k: string) => {
          if (q && !code.toLowerCase().includes(q) && !sub.toLowerCase().includes(q)) return null;
          const on = pick.codes.has(code);
          const other = Object.entries(liveMap).find(([id, cs]) => id !== pick.id && cs.includes(code))?.[0];
          const st = stars.get(code);
          return (
            <button key={k} onClick={() => { const n = new Set(pick.codes); on ? n.delete(code) : n.add(code); setPick({ ...pick, codes: n }); }}
              className={`text-right rounded-[14px] border px-3 py-2 ${on ? 'bg-[#17150F] text-white border-[#17150F]' : 'bg-white border-[#E7DFCF]'}`}>
              <span className="block font-mono font-bold text-[13px]">{on ? '✓ ' : ''}{st ? '⭐' : ''}{code}</span>
              <span className={`block text-[10.5px] truncate ${on ? 'text-white/70' : 'text-[#6F695D]'}`}>{sub}{st ? ` · ${st.map((w) => STAR_LABEL[w]).join('، ')}` : ''}{other ? ` · مع ${nameOf(other)}` : ''}</span>
            </button>
          );
        };
        const nR = allResale.filter((x) => pick.codes.has(x.code)).length, nP = allProj.filter((x) => pick.codes.has(x.code)).length;
        const sortedResale = [...allResale].sort((x, y) => Number(isStar(y.code)) - Number(isStar(x.code)));
        return (
          <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center" dir="rtl" onClick={() => setPick(null)}>
            <div className="bg-[#F5F0E6] w-full sm:max-w-2xl max-h-[90dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 space-y-2 border-b border-[#E7DFCF]">
                <p className="font-readex font-semibold text-[17px]">شقق {nameOf(pick.id)} · {period === 'week' ? 'الأسبوع ده' : 'الشهر ده'}</p>
                <p className="text-[12px] text-[#6F695D]">مختار {nR} ريسيل · {nP} تحت الإنشاء — المميز ⭐ فوق</p>
                <input value={pick.q} onChange={(e) => setPick({ ...pick, q: e.target.value })} placeholder="دوّر بالكود أو الحي…" className="w-full h-11 px-4 rounded-[14px] bg-white border border-[#E7DFCF] text-sm" />
              </div>
              <div className="overflow-y-auto p-3 space-y-3">
                <p className="text-[12px] font-bold">ريسيل</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{sortedResale.map((x) => row(x.code, `${x.neighborhood || ''} · ${x.area || ''}م²`, x.id))}</div>
                <p className="text-[12px] font-bold">تحت الإنشاء</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{allProj.map((x) => row(x.code, `${x.name || ''}`, x.id))}</div>
              </div>
              <div className="p-3 border-t border-[#E7DFCF] grid grid-cols-[1fr_auto] gap-2">
                <button disabled={busy || !pick.codes.size} onClick={async () => { await save({ map: { ...liveMap, [pick.id]: [...pick.codes] } }); setPick(null); }}
                  className="h-12 rounded-[16px] bg-[#17150F] text-[#F5F0E6] font-bold disabled:opacity-40">احفظ ({pick.codes.size} شقة)</button>
                <button disabled={busy} onClick={async () => { const m = { ...liveMap }; delete m[pick.id]; await save({ map: m }); setPick(null); }}
                  className="h-12 px-4 rounded-[16px] bg-white border border-[#E7DFCF] text-[12.5px] font-bold">رجّعه أوتوماتيك</button>
              </div>
            </div>
          </div>
        );
      })()}

      {hoodPick && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center" dir="rtl" onClick={() => setHoodPick(null)}>
          <div className="bg-[#F5F0E6] w-full sm:max-w-lg max-h-[90dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[#E7DFCF]">
              <p className="font-readex font-semibold text-[17px]">أحياء {nameOf(hoodPick.id)} · {period === 'week' ? 'الأسبوع ده' : 'الشهر ده'}</p>
              <p className="text-[12px] text-[#6F695D]">كل الشقق في الأحياء دي ليه — وأي شقة جديدة تنزل فيها بتروحله</p>
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 gap-1.5">
              {hoodList.map(([h, n]) => {
                const on = hoodPick.hoods.has(h);
                const others = hoodOwners(h, hoodPick.id);
                return (
                  <button key={h} onClick={() => { const s2 = new Set(hoodPick.hoods); on ? s2.delete(h) : s2.add(h); setHoodPick({ ...hoodPick, hoods: s2 }); }}
                    className={`text-right rounded-[14px] border px-3 py-2 ${on ? 'bg-[#17150F] text-white border-[#17150F]' : 'bg-white border-[#E7DFCF]'}`}>
                    <span className="block font-bold text-[13px]">{on ? '✓ ' : ''}{h}</span>
                    <span className={`block text-[10.5px] ${on ? 'text-white/70' : 'text-[#6F695D]'}`}>{n} شقة{others.length ? ` · مع ${others.join('، ')}` : ''}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-[#E7DFCF] grid grid-cols-[1fr_auto] gap-2">
              <button disabled={busy || !hoodPick.hoods.size} onClick={async () => { await save({ hoods: { ...liveHoods, [hoodPick.id]: [...hoodPick.hoods] } }); setHoodPick(null); }}
                className="h-12 rounded-[16px] bg-[#17150F] text-[#F5F0E6] font-bold disabled:opacity-40">احفظ ({hoodPick.hoods.size} حي)</button>
              <button disabled={busy} onClick={async () => { const m = { ...liveHoods }; delete m[hoodPick.id]; await save({ hoods: m }); setHoodPick(null); }}
                className="h-12 px-4 rounded-[16px] bg-white border border-[#E7DFCF] text-[12.5px] font-bold">رجّعه أوتوماتيك</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
