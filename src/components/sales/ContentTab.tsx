import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Link2, Settings2, Trash2, Check, Upload, Video, X } from 'lucide-react';
import { Property, SalesAgent } from '../../types';
import {
  SalesForms, DEFAULT_FORMS, subscribeSalesForms, saveSalesForms,
  ContentSlot, subscribeSlots, claimSlot, updateSlot, deleteSlot, weekKey,
  TrackedLink, subscribeLinks, createTrackedLink, linkUrl,
} from '../../services/salesToolsService';
import {
  DailySettings, DEFAULT_DAILY_SETTINGS, subscribeDailySettings, workDay, workWeek,
  AdPost, subscribeMyAds, subscribeAdsOfDay, distribute, advertisableResale, advertisableProjects,
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
        <div className="space-y-4">
          {currentAgent && (
            <AdsPanel agentId={myId} agentName={currentAgent.name} agentPhone={currentAgent.phone} day={adDay} week={adWeek}
              settings={settings} properties={properties} projects={projects} myAds={myAds} />
          )}
          {isAdmin && <AdsSplit agents={agents} settings={settings} properties={properties} projects={projects} week={adWeek} dayAds={dayAds} />}
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

/* الإدارة: الشقق اتوزعت على مين الأسبوع ده، وكل واحد نشر كام النهارده.
   التوزيع أوتوماتيك: كل شقة ريسيل منشورة ومش مباعة بتروح لسيلز واحد من
   اللي داخلين المهام اليومية (بالدور حسب الكود)، وكل أسبوع بيلف خطوة. */
const AdsSplit: React.FC<{ agents: SalesAgent[]; settings: DailySettings; properties: Property[]; projects: Project[]; week: string; dayAds: AdPost[] }> = ({ agents, settings, properties, projects, week, dayAds }) => {
  const resale = useMemo(() => distribute(advertisableResale(properties), settings.agentIds, week), [properties, settings.agentIds, week]);
  const proj = useMemo(() => distribute(advertisableProjects(projects), settings.agentIds, week), [projects, settings.agentIds, week]);
  const team = settings.agentIds.map((id) => agents.find((a) => a.id === id)).filter((a): a is SalesAgent => !!a);
  const T = settings.targets;
  const [open, setOpen] = useState('');
  return (
    <div className="rounded-[28px] bg-white border border-[#E7DFCF] p-4 sm:p-5 space-y-3">
      <div>
        <p className="font-readex font-semibold text-[19px]">التوزيع الأسبوع ده</p>
        <p className="text-[12.5px] text-[#6F695D] mt-0.5 leading-relaxed">
          أوتوماتيك على اللي داخلين المهام اليومية: كل شقة ريسيل منشورة ومش مباعة بتروح لسيلز واحد بس، وكل أسبوع التوزيع بيلف.
          مين داخل بتحدده من «يومي» ← الإعدادات.
        </p>
      </div>
      {!team.length && <p className="text-[13px] text-[#6F695D] bg-[#F5F0E6] rounded-2xl p-4">مفيش حد داخل المهام اليومية لسه.</p>}
      {team.map((a) => {
        const r = resale.get(a.id) || [], p = proj.get(a.id) || [];
        const mine = dayAds.filter((x) => x.agentId === a.id && x.status !== 'rejected');
        const rr = mine.filter((x) => x.kind === 'resale').length, pp = mine.filter((x) => x.kind === 'offplan').length;
        const ok = rr >= T.adsResale && pp >= T.adsOffPlan;
        return (
          <div key={a.id} className="rounded-[20px] bg-[#F5F0E6] p-3">
            <button onClick={() => setOpen(open === a.id ? '' : a.id)} className="w-full flex items-center justify-between gap-2 text-right">
              <span className="min-w-0">
                <span className="block font-semibold text-[14.5px] truncate">{a.name}</span>
                <span className="block text-[11.5px] text-[#6F695D]">معاه {r.length} ريسيل · {p.length} مشروع</span>
              </span>
              <span className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full ${ok ? 'bg-[#22483A] text-white' : 'bg-white text-[#17150F]'}`}>
                النهارده {rr}/{T.adsResale} · {pp}/{T.adsOffPlan}
              </span>
            </button>
            {open === a.id && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...r.map((x) => x.code), ...p.map((x) => x.code)].map((c) => (
                  <span key={c} className={`font-mono text-[11px] px-2 py-1 rounded-lg ${mine.some((m) => m.code === c) ? 'bg-[#22483A] text-white' : 'bg-white'}`}>{c}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
