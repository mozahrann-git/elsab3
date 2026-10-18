import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone, MessageCircle, PhoneCall, ClipboardList, Megaphone, CalendarCheck, Eye, Video,
  X, Upload, Copy, Check, Loader2, AlertTriangle, ChevronLeft, ChevronRight, ImageIcon, Download,
} from 'lucide-react';
import { Lead, Property, SalesAgent, ViewingRequest } from '../../types';
import {
  DailySettings, DEFAULT_DAILY_SETTINGS, subscribeDailySettings, workDay, workWeek, dayLabel, cairoHour,
  distribute, advertisableResale, advertisableProjects, CallNumber, CallOutcome, OUTCOME_LABEL, MAX_NO_ANSWER,
  subscribeMyNumbers, logCall, SalesDay, subscribeMyDay, AdPost, AdKind, subscribeMyAds, submitAd,
  computeProgress, dayScore, errText,
} from '../../services/dailyTasks';
import { Project, subscribeProjects } from '../../services/projectService';
import { ContentSlot, subscribeSlots, weekKey } from '../../services/salesToolsService';
import { uploadFile, thumbUrl } from '../../services/mediaStorage';
import { downloadFile, downloadAll } from '../../utils/shareKit';
import { AD_VARIANTS, adText as adTextFor, dailyAdText } from '../../utils/adTexts';
import { generateCallLink, waLink } from '../../utils/helpers';

/*
  شاشة «يومي» للسيلز: كل مهمة بشريط تقدّم، والشغل نفسه بيتعمل من هنا
  (المكالمات والإعلانات) أو بزرار بيوديه على مكانه (الطلبات والمتابعات).
*/

const n = (x: number) => Math.round(x || 0).toLocaleString('en-US');

export const Bar: React.FC<{ done: number; target: number; tone?: 'ok' | 'warn' | 'bad' }> = ({ done, target, tone }) => {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 100;
  const t = tone || (pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'bad');
  const c = t === 'ok' ? '#1E7A45' : t === 'warn' ? '#A07A26' : '#C2412D';
  return (
    <div className="h-2 rounded-full bg-[#ECE8DF] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
    </div>
  );
};

const TaskCard: React.FC<{
  icon: React.ReactNode; title: string; done: number; target: number; sub?: React.ReactNode;
  action?: string; onAction?: () => void; note?: string; neutral?: boolean;
}> = ({ icon, title, done, target, sub, action, onAction, note, neutral }) => {
  /* المهمة اللي خلصت بتقلب أخضر غامق — تعرف اللي فاضل من غير ما تقرا */
  const full = !neutral && target > 0 && done >= target;
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  return (
    <div className="rounded-[22px] p-3.5 flex flex-col gap-2 border min-w-0"
      style={full ? { background: '#22483A', color: '#fff', borderColor: '#22483A' } : { background: '#FFFDF8', color: '#17150F', borderColor: '#E7DFCF' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[14px] flex items-center gap-1.5 min-w-0">{icon}<span className="truncate">{title}</span></p>
        {full && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15">✓ خلصت</span>}
      </div>
      <p className="font-readex leading-none">
        <span className="text-[30px] font-semibold">{n(done)}</span>
        {!neutral && <span className="text-[15px] font-medium" style={{ opacity: 0.6 }}> / {n(target)}</span>}
      </p>
      {!neutral && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: full ? 'rgba(255,255,255,.2)' : '#EFE7D6' }} role="img" aria-label={`${pct}٪`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, done ? 4 : 0)}%`, background: full ? '#fff' : pct >= 50 ? '#A9842F' : '#D3262B' }} />
        </div>
      )}
      {sub && <div className="text-[12px] font-semibold leading-relaxed" style={{ opacity: full ? 0.85 : 1, color: full ? '#fff' : '#6F695D' }}>{sub}</div>}
      {note && <p className="text-[12px] font-bold rounded-xl px-3 py-1.5" style={full ? { background: 'rgba(255,255,255,.12)' } : { background: '#F8F0DD', color: '#7A5C14' }}>{note}</p>}
      {action && onAction && (
        <button onClick={onAction} className="mt-auto h-11 rounded-[14px] text-[12.5px] font-bold leading-tight px-2"
          style={full ? { background: '#fff', color: '#22483A' } : { background: '#17150F', color: '#F5F0E6' }}>{action}</button>
      )}
    </div>
  );
};

interface Props {
  properties: Property[];
  leads: Lead[];
  currentAgent?: SalesAgent;
  viewingRequests?: ViewingRequest[];
  onAddLead: (l: Lead) => void;
  onGo: (tab: 'matching' | 'followups' | 'content') => void;
}

export const DailyTab: React.FC<Props> = ({ properties, leads, currentAgent, viewingRequests, onAddLead, onGo }) => {
  const [settings, setSettings] = useState<DailySettings>(DEFAULT_DAILY_SETTINGS);
  const [err, setErr] = useState('');
  useEffect(() => subscribeDailySettings(setSettings, setErr), []);

  /* الوقت بيتحدّث كل دقيقة — عشان الساعة ٧ اليوم يتقفل لوحده */
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const day = workDay(now, settings.closeHour);
  const week = workWeek(day);
  const T = settings.targets;
  const agentId = currentAgent?.id || '';
  const agentName = currentAgent?.name || '';
  const inTasks = !!agentId && settings.agentIds.includes(agentId);

  const [myDay, setMyDay] = useState<SalesDay | null>(null);
  const [myAds, setMyAds] = useState<AdPost[]>([]);
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => subscribeMyDay(agentId, day, setMyDay, setErr), [agentId, day]);
  useEffect(() => subscribeMyAds(agentId, day, setMyAds, setErr), [agentId, day]);
  useEffect(() => subscribeSlots(setSlots), []);
  useEffect(() => subscribeProjects(setProjects), []);

  const p = useMemo(() => computeProgress({
    agentId, agentName, day, closeHour: settings.closeHour, leads, salesDay: myDay, ads: myAds,
    viewings: viewingRequests, slots, slotWeekKey: weekKey(), now,
  }), [agentId, agentName, day, settings.closeHour, leads, myDay, myAds, viewingRequests, slots, now]);
  const score = dayScore(p, T);

  const [section, setSection] = useState<'calls' | 'ads' | null>(null);
  const callsRef = useRef<HTMLDivElement>(null);
  const adsRef = useRef<HTMLDivElement>(null);
  const open = (s: 'calls' | 'ads') => {
    setSection(s);
    setTimeout(() => (s === 'calls' ? callsRef : adsRef).current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (!currentAgent) {
    return <p className="bg-white border border-[#ECE8DF] rounded-2xl p-5 text-sm font-bold text-[#6B665C]">الشاشة دي للسيلز. الإدارة بتشوف لوحة الفريق.</p>;
  }
  if (!inTasks) {
    return (
      <p className="bg-white border border-[#ECE8DF] rounded-2xl p-5 text-sm font-bold text-[#6B665C]">
        إنت مش داخل المهام اليومية لسه — الإدارة هي اللي بتختار مين داخل.
      </p>
    );
  }

  const hour = cairoHour(now);
  const realToday = day === workDay(now, 24);   // لو بعد ٧ أو الجمعة، بنشتغل على يوم الشغل الجاي
  const behind = realToday && hour >= 14 && score < 50 && !p.off;

  return (
    <div className="space-y-4" dir="rtl">
      {err && (
        <p className="text-xs font-bold text-[#9E2A1B] bg-[#FBEDEA] border border-[#E9B8AE] rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </p>
      )}

      <div className="bg-[#141414] text-white rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-readex font-bold text-base">مهام {dayLabel(day)}</p>
            <p className="text-[11px] text-[#CFCBC2]">
              {realToday
                ? `اليوم بيتقفل الساعة ${settings.closeHour > 12 ? settings.closeHour - 12 : settings.closeHour} بالليل`
                : 'اليوم اتقفل — اللي بتعمله دلوقتي بيتحسب على يوم الشغل الجاي'}
            </p>
          </div>
          <p className="font-mono font-black text-3xl text-[#D9B864]">{score}%</p>
        </div>
        <Bar done={score} target={100} />
      </div>

      {p.off && (
        <p className="text-xs font-bold text-[#1F5C8B] bg-[#EAF1F8] rounded-xl p-3">النهارده إجازة ليك من الإدارة — مفيش مهام بتتحسب.</p>
      )}
      {behind && (
        <p className="text-xs font-bold text-[#9E2A1B] bg-[#FBEDEA] border border-[#E9B8AE] rounded-xl p-3">
          الساعة عدّت ٢ واللي خلص أقل من النص — فاضل لحد الساعة ٧.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <TaskCard icon={<PhoneCall size={15} className="text-[#A07A26]" />} title="المكالمات" done={p.calls.done} target={T.calls}
          sub={<>رد {n(p.calls.answered)} · مهتم <b className="text-[#1E7A45]">{n(p.calls.interested)}</b> · مردش {n(p.calls.noAnswer)} · غلط {n(p.calls.wrong)}</>}
          action="ابدأ المكالمات" onAction={() => open('calls')} />

        <TaskCard icon={<ClipboardList size={15} className="text-[#A07A26]" />} title="الطلبات" done={p.requests.done} target={T.requests}
          sub={<>مهم <b className="text-[#1E7A45]">{n(p.requests.important)}</b> · محيّر <b className="text-[#A07A26]">{n(p.requests.undecided)}</b>{p.requests.unclassified ? ` · من غير تصنيف ${p.requests.unclassified}` : ''}</>}
          note={p.requests.done > 0 && p.requests.important < Math.round(T.requestsImportant * p.requests.done / Math.max(1, T.requests)) ? `المطلوب حوالي ${T.requestsImportant} مهم من ${T.requests}` : undefined}
          action="سجّل طلب من المطابقة" onAction={() => onGo('matching')} />

        <TaskCard icon={<Megaphone size={15} className="text-[#A07A26]" />} title="الإعلانات" done={p.ads.done} target={T.ads}
          sub={<>ريسيل {n(p.ads.resale)}/{T.adsResale} · تحت الإنشاء {n(p.ads.offplan)}/{T.adsOffPlan}{p.ads.pending ? ` · مستني مراجعة ${p.ads.pending}` : ''}{p.ads.rejected ? ` · مرفوض ${p.ads.rejected}` : ''}</>}
          action="شقق الإعلانات" onAction={() => open('ads')} />

        <TaskCard icon={<CalendarCheck size={15} className="text-[#A07A26]" />} title="متابعات النهارده" done={p.followUps.done} target={p.followUps.done + p.followUps.left}
          sub={p.followUps.left ? <span className="text-[#C2412D]">فاضل {n(p.followUps.left)} عميل ميعاده جه ومتعملش عليه حاجة</span> : 'مفيش عميل ميعاده جه ومستني'}
          action="افتح المتابعات" onAction={() => onGo('followups')} />

        <TaskCard icon={<Eye size={15} className="text-[#A07A26]" />} title="معاينات الأسبوع" done={p.viewingsWeek} target={T.viewingsWeek}
          sub="بتتحسب لما العميل يوصل «تمت المعاينة»" />

        <TaskCard icon={<Video size={15} className="text-[#A07A26]" />} title="فيديوهات الأسبوع" done={p.videosWeek} target={T.videosWeek}
          sub="بيتحسب لما الفيديو يتنشر من تبويب المحتوى"
          action="المحتوى" onAction={() => onGo('content')} />
      </div>

      <div ref={callsRef}>
        {section === 'calls' && (
          <CallsPanel agentId={agentId} agentName={agentName} closeHour={settings.closeHour} onAddLead={onAddLead} onClose={() => setSection(null)} />
        )}
      </div>
      <div ref={adsRef}>
        {section === 'ads' && (
          <AdsPanel
            agentId={agentId} agentName={agentName} agentPhone={currentAgent?.phone} day={day} week={week} settings={settings}
            properties={properties} projects={projects} myAds={myAds} onClose={() => setSection(null)}
          />
        )}
      </div>
    </div>
  );
};

/* ============================================================
   المكالمات
   ============================================================ */
const CallsPanel: React.FC<{
  agentId: string; agentName: string; closeHour: number;
  onAddLead: (l: Lead) => void; onClose: () => void;
}> = ({ agentId, agentName, closeHour, onAddLead, onClose }) => {
  const [list, setList] = useState<CallNumber[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const [hot, setHot] = useState<CallNumber | null>(null);
  useEffect(() => subscribeMyNumbers(agentId, (l) => { setList(l); setLoaded(true); }, setErr), [agentId]);

  /* اللي مردش النهارده مايظهرش تاني غير بكره — عشان مايتعدّش مكالمتين في دقيقة */
  const today = workDay(Date.now(), closeHour);
  const shown = list.filter((x) => !(x.status === 'no_answer' && x.lastDay === today)).slice(0, 10);
  const fresh = list.filter((x) => x.status === 'pending').length;

  const mark = async (x: CallNumber, o: CallOutcome) => {
    if (o === 'interested') { setHot(x); return; }
    setBusyId(x.id); setErr('');
    try { await logCall(x, o, agentId, agentName, '', undefined, closeHour); }
    catch (e) { setErr(errText(e)); }
    finally { setBusyId(''); }
  };

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">أرقامك <span className="text-[#8C877D] font-medium">· فاضل {n(fresh)} رقم جديد</span></p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
      </div>
      {err && <p className="text-xs font-bold text-[#9E2A1B] bg-[#FBEDEA] rounded-xl p-2.5">{err}</p>}
      {!loaded && <p className="text-xs text-[#8C877D] flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> بيحمّل…</p>}
      {loaded && !shown.length && (
        <p className="text-xs font-bold text-[#6B665C] bg-[#F6F4EF] rounded-xl p-3">
          مفيش أرقام عندك دلوقتي — الإدارة بترفع الأرقام وبتتوزع لوحدها.
        </p>
      )}
      {shown.map((x) => (
        <div key={x.id} className="border border-[#ECE8DF] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{x.name || 'من غير اسم'}</p>
              <p className="font-mono text-xs text-[#6B665C]" dir="ltr">{x.phone}</p>
              {x.status === 'no_answer' && <p className="text-[10px] font-bold text-[#A07A26]">مردش {x.attempts} مرة (بعد {MAX_NO_ANSWER} بيطلع)</p>}
              {x.note && <p className="text-[10px] text-[#8C877D]">{x.note}</p>}
            </div>
            <div className="flex gap-1.5">
              <a href={generateCallLink(x.phone)} className="px-3 py-1.5 rounded-xl bg-[#141414] text-white text-xs font-bold flex items-center gap-1"><Phone size={13} />اتصل</a>
              <a href={waLink(x.phone, '')} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-[#1E7A45] text-white text-xs font-bold flex items-center gap-1"><MessageCircle size={13} />واتساب</a>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((o) => (
              <button key={o} disabled={busyId === x.id} onClick={() => mark(x, o)}
                className={`py-2 rounded-lg text-[11px] font-bold border disabled:opacity-50 ${
                  o === 'interested' ? 'bg-[#EEF5F0] text-[#1E7A45] border-[#B3E8C8]'
                  : o === 'wrong' ? 'bg-[#FBEDEA] text-[#C2412D] border-[#E9B8AE]'
                  : 'bg-[#F6F4EF] text-[#141414] border-[#ECE8DF]'}`}>
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {hot && (
        <InterestedForm
          num={hot} agentId={agentId} agentName={agentName} closeHour={closeHour}
          onAddLead={onAddLead} onClose={() => setHot(null)}
        />
      )}
    </div>
  );
};

/* المهتم بيتحوّل عميل في «جديد» — ولازم يتكتب هو عايز إيه */
const InterestedForm: React.FC<{
  num: CallNumber; agentId: string; agentName: string; closeHour: number;
  onAddLead: (l: Lead) => void; onClose: () => void;
}> = ({ num, agentId, agentName, closeHour, onAddLead, onClose }) => {
  const [name, setName] = useState(num.name || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('اكتب اسمه'); return; }
    if (note.trim().length < 3) { setErr('اكتب هو عايز إيه'); return; }
    setBusy(true); setErr('');
    const leadId = `lead_${Date.now()}`;
    try {
      /* الرقم الأول — لو اتسجّل والعميل ماتعملش، نقدر نعيد.
         العكس كان هيعمل عميل مكرر لو الرقم رفض. */
      await logCall(num, 'interested', agentId, agentName, note.trim(), leadId, closeHour);
      const lead: Lead = {
        id: leadId,
        name: name.trim(),
        phone: num.phone,
        status: 'new',
        source: 'cold_call',
        notes: [`مكالمة من الأرقام (${num.batch}): ${note.trim()}`],
        assignedAgentId: agentId,
        assignedAgentName: agentName,
        addedByName: agentName,
        addedById: agentId,
        leadKind: 'old_campaign',
        createdAt: new Date().toISOString(),
        lastContactDate: 'الآن',
        followUpStatus: 'pending',
        followUpScheduledAt: 'بعد ساعتين',
        followUpNote: note.trim(),
        followUpUrgency: 'urgent',
        nextActionAt: Date.now() + 2 * 3600000,
        activity: [{ at: Date.now(), by: agentName, outcome: 'مكالمة: رد ومهتم', comment: note.trim() }],
      } as Lead;
      onAddLead(lead);
      onClose();
    } catch (e) { setErr(errText(e)); setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold">رد ومهتم · <span className="font-mono text-sm" dir="ltr">{num.phone}</span></p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمه"
          className="w-full px-3 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="عايز إيه؟ (حي، ميزانية، كاش ولا تقسيط…)"
          className="w-full px-3 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm" />
        {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
        <button disabled={busy} onClick={save} className="w-full py-3 rounded-xl bg-[#1E7A45] text-white font-bold text-sm disabled:opacity-50">
          {busy ? 'بيسجّل…' : 'سجّله عميل في «جديد»'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

/* ============================================================
   الإعلانات
   ============================================================ */
export type AdUnit = { code: string; kind: AdKind; title: string; image?: string; prop?: Property; project?: Project };

const AdsPanel: React.FC<{
  agentId: string; agentName: string; agentPhone?: string; day: string; week: string; settings: DailySettings;
  properties: Property[]; projects: Project[]; myAds: AdPost[]; onClose: () => void;
}> = ({ agentId, agentName, agentPhone, day, week, settings, properties, projects, myAds, onClose }) => {
  const [kind, setKind] = useState<AdKind>('resale');
  const [openUnit, setOpenUnit] = useState<AdUnit | null>(null);

  const mineResale = useMemo(
    () => distribute(advertisableResale(properties), settings.agentIds, week).get(agentId) || [],
    [properties, settings.agentIds, week, agentId],
  );
  const mineProjects = useMemo(
    () => distribute(advertisableProjects(projects), settings.agentIds, week).get(agentId) || [],
    [projects, settings.agentIds, week, agentId],
  );
  const units: AdUnit[] = kind === 'resale'
    ? mineResale.map((p) => ({ code: p.code, kind: 'resale' as const, title: `${p.neighborhood} · ${p.area}م² · ${p.bedrooms} غرف`, image: p.images?.[0], prop: p }))
    : mineProjects.map((p) => ({ code: p.code, kind: 'offplan' as const, title: `${p.kind === 'compound' ? 'كمبوند' : 'عمارة'} ${p.name} · ${p.neighborhood}`, image: p.images?.[0], project: p }));

  const adOf = (code: string) => myAds.find((a) => a.code === code);
  const T = settings.targets;
  const doneKind = myAds.filter((a) => a.kind === kind && a.status !== 'rejected').length;

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">شقق الإعلانات بتاعتك الأسبوع ده</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
      </div>
      <p className="text-[11px] text-[#6B665C] font-bold">
        الشقق دي متوزعة عليك إنت بس — محدش تاني من الفريق معاه نفسها الأسبوع ده. دوس على الكود، انسخ الإعلان، انشره، وارفع سكرين شوت.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {([['resale', `ريسيل (${myAds.filter((a) => a.kind === 'resale' && a.status !== 'rejected').length}/${T.adsResale})`], ['offplan', `تحت الإنشاء (${myAds.filter((a) => a.kind === 'offplan' && a.status !== 'rejected').length}/${T.adsOffPlan})`]] as [AdKind, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`py-2.5 rounded-xl text-xs font-bold ${kind === k ? 'bg-[#141414] text-white' : 'bg-[#F6F4EF] border border-[#ECE8DF]'}`}>{l}</button>
        ))}
      </div>

      {!units.length && (
        <p className="text-xs font-bold text-[#6B665C] bg-[#F6F4EF] rounded-xl p-3">
          {kind === 'resale' ? 'مفيش شقق ريسيل متاحة للإعلان دلوقتي.' : 'مفيش مشاريع تحت الإنشاء متضافة في قسم المشاريع.'}
        </p>
      )}
      {kind === 'offplan' && units.length > 0 && units.length < T.adsOffPlan * 6 && (
        <p className="text-[11px] text-[#8C877D]">المشاريع قليلة، فممكن تعلن عن نفس المشروع في أكتر من يوم.</p>
      )}
      {doneKind >= (kind === 'resale' ? T.adsResale : T.adsOffPlan) && (
        <p className="text-[11px] font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-lg px-2 py-1.5">خلّصت المطلوب من النوع ده النهارده ✓</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {units.map((u) => {
          const a = adOf(u.code);
          const st = a?.status;
          return (
            <button key={u.code} onClick={() => setOpenUnit(u)}
              className={`text-right rounded-xl border overflow-hidden ${st === 'approved' ? 'border-[#1E7A45]' : st === 'pending' ? 'border-[#A07A26]' : st === 'rejected' ? 'border-[#C2412D]' : 'border-[#ECE8DF]'}`}>
              <div className="h-20 bg-[#F6F4EF] flex items-center justify-center">
                {u.image ? <img src={thumbUrl(u.image, 300)} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon size={20} className="text-[#C9C3B6]" />}
              </div>
              <div className="p-2">
                <p className="font-mono font-black text-xs">{u.code}</p>
                <p className="text-[10px] text-[#6B665C] truncate">{u.title}</p>
                {st && (
                  <p className={`text-[10px] font-bold mt-0.5 ${st === 'approved' ? 'text-[#1E7A45]' : st === 'pending' ? 'text-[#A07A26]' : 'text-[#C2412D]'}`}>
                    {st === 'approved' ? 'اتقبل ✓' : st === 'pending' ? 'مستني مراجعة' : 'مرفوض — افتحه'}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openUnit && (
        <UnitAdPopup unit={openUnit} existing={adOf(openUnit.code)} agentId={agentId} agentName={agentName} agentPhone={agentPhone} day={day} onClose={() => setOpenUnit(null)} />
      )}
    </div>
  );
};

/* نص المشروع (تحت الإنشاء) — نصوص الشقق من adTexts */
function projectAdText(pr: Project): string {
  const plan = (pr.plans || [])[0];
  return [
    `🏗️ ${pr.kind === 'compound' ? 'كمبوند' : 'عمارة'} ${pr.name} · ${pr.neighborhood}`,
    pr.headline || '',
    pr.startingPrice ? `يبدأ من ${Number(pr.startingPrice).toLocaleString('en-US')} ج.م` : '',
    plan ? `مقدم ${plan.downPaymentPercent ? `${plan.downPaymentPercent}%` : ''}${plan.years ? ` وتقسيط على ${plan.years} سنين` : ''}` : '',
    pr.deliveryDate ? `الاستلام: ${pr.deliveryDate}` : '',
    `\nكود: ${pr.code}`,
  ].filter(Boolean).join('\n');
}

type Media = { url: string; kind: 'image' | 'video' };
const isDirectVideo = (u: string) => /cloudinary|\.mp4|\.mov|\.webm/i.test(u) && !/youtu/i.test(u);

/*
  بوب أب الشقة: الصور والفيديو (كل واحد بزرار تحميل)، ونصوص الإعلانات
  (نفس صيغ أدوات المستشار + إعلان اليوم المتجدد)، ورفع سكرين شوت.
  mode="share" = من غير رفع سكرين شوت (من المطابقة مثلاً).
*/
export const UnitAdPopup: React.FC<{
  unit: AdUnit; existing?: AdPost; agentId: string; agentName: string; agentPhone?: string; day?: string;
  mode?: 'task' | 'share'; onClose: () => void;
}> = ({ unit, existing, agentId, agentName, agentPhone, day = '', mode = 'task', onClose }) => {
  const media: Media[] = useMemo(() => {
    const imgs = (unit.prop?.images || unit.project?.images || []).filter(Boolean).map((url) => ({ url, kind: 'image' as const }));
    const v = String(unit.prop?.videoUrl || (unit.project as any)?.videoUrl || '').trim();
    return v ? [{ url: v, kind: 'video' as const }, ...imgs] : imgs;
  }, [unit]);
  const [i, setI] = useState(0);
  const cur = media[i];
  const [dl, setDl] = useState('');
  const agent = { id: agentId, name: agentName, phone: agentPhone || '' };

  const texts = useMemo(() => {
    if (unit.prop) {
      const d = dailyAdText(unit.prop, agent);
      return [{ id: 'daily', label: d.label, text: d.text, tip: d.tip }, ...AD_VARIANTS.map((v) => ({ id: v.id, label: v.label, text: adTextFor(unit.prop!, agent, v.id), tip: '' }))];
    }
    return [{ id: 'project', label: 'إعلان المشروع', text: projectAdText(unit.project!), tip: '' }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, agentId, agentName, agentPhone]);
  const [ti, setTi] = useState(0);
  const text = texts[ti]?.text || '';

  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [postUrl, setPostUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const locked = existing && existing.status !== 'rejected';

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setErr('النسخ ماشتغلش — علّم على النص وانسخه بإيدك'); }
  };
  const download = async (m: Media, idx: number) => {
    if (m.kind === 'video' && !isDirectVideo(m.url)) { window.open(m.url, '_blank'); return; }
    setDl(String(idx));
    try { await downloadFile(m.url, `${unit.code}-${m.kind === 'video' ? 'video.mp4' : `${idx}.jpg`}`); }
    catch { window.open(m.url, '_blank'); }
    finally { setDl(''); }
  };
  const downloadPics = async () => {
    setDl('all');
    try { await downloadAll(media.filter((m) => m.kind === 'image').map((m) => m.url), unit.code, (d, t) => setDl(`all:${d}/${t}`)); }
    finally { setDl(''); }
  };

  const send = async () => {
    if (!file) { setErr('ارفع سكرين شوت الإعلان'); return; }
    setBusy(true); setErr('');
    try {
      const url = await uploadFile(file, 'ad_proofs', `${agentId}_${day}_${unit.code}`, setPct);
      await submitAd({ agentId, agentName, day, code: unit.code, kind: unit.kind, title: unit.title, shotUrl: url, postUrl: postUrl.trim() || undefined });
      onClose();
    } catch (e) { setErr(errText(e)); setBusy(false); }
  };

  const d: any = unit.prop || {};
  const imgCount = media.filter((m) => m.kind === 'image').length;
  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between">
          <p className="font-bold text-sm"><span className="font-mono">{unit.code}</span> · {unit.title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
        </div>

        <div className="relative bg-[#141414] aspect-[4/3]">
          {cur ? (
            cur.kind === 'video' ? (
              isDirectVideo(cur.url)
                ? <video src={cur.url} controls playsInline className="w-full h-full object-contain" />
                : <div className="w-full h-full flex items-center justify-center"><a href={cur.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white text-sm font-bold">افتح الفيديو</a></div>
            ) : <img src={thumbUrl(cur.url, 900)} alt="" className="w-full h-full object-contain" />
          ) : <div className="w-full h-full flex items-center justify-center text-[#8C877D] text-xs">مفيش صور</div>}
          {cur && (
            <button onClick={() => download(cur, i + 1)} disabled={!!dl}
              className="absolute top-2 left-2 px-3 py-1.5 rounded-full bg-white/90 text-xs font-bold flex items-center gap-1 disabled:opacity-60">
              <Download size={13} />{dl === String(i + 1) ? 'بينزّل…' : cur.kind === 'video' ? 'نزّل الفيديو' : 'نزّل الصورة'}
            </button>
          )}
          {media.length > 1 && (
            <>
              <button onClick={() => setI((i + 1) % media.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80"><ChevronRight size={18} /></button>
              <button onClick={() => setI((i - 1 + media.length) % media.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80"><ChevronLeft size={18} /></button>
              <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">{i + 1}/{media.length}</span>
            </>
          )}
        </div>
        {media.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto p-2">
            {media.map((m, k) => (
              <button key={k} onClick={() => setI(k)} className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 bg-[#141414] ${k === i ? 'border-[#A07A26]' : 'border-transparent'}`}>
                {m.kind === 'video' ? <span className="w-full h-full flex items-center justify-center text-white"><Video size={18} /></span>
                  : <img src={thumbUrl(m.url, 120)} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </button>
            ))}
          </div>
        )}
        {imgCount > 1 && (
          <div className="px-4">
            <button onClick={downloadPics} disabled={!!dl} className="w-full py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Download size={13} />{dl.startsWith('all') ? `بينزّل ${dl.split(':')[1] || ''}` : `نزّل كل الصور (${imgCount})`}
            </button>
          </div>
        )}

        <div className="p-4 space-y-3">
          {unit.prop && (
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {[['السعر', `${Number(d.price || 0).toLocaleString('en-US')}`], ['المساحة', `${d.area}م²`], ['الغرف', d.bedrooms], ['الحمامات', d.bathrooms || '—'], ['الدور', d.floor || '—'], ['التشطيب', d.finishingLabel || '—']].map(([l, v]) => (
                <div key={l as string} className="bg-[#F6F4EF] rounded-lg py-1.5"><p className="text-[#8C877D]">{l}</p><p className="font-bold">{v as any}</p></div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {texts.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {texts.map((t, k) => (
                  <button key={t.id} onClick={() => { setTi(k); setCopied(false); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${k === ti ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>{t.label}</button>
                ))}
              </div>
            )}
            {texts[ti]?.tip && <p className="text-[11px] text-[#A07A26] font-bold">{texts[ti].tip}</p>}
            <div className="bg-[#F6F4EF] rounded-xl p-3">
              <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed max-h-64 overflow-y-auto">{text}</pre>
              <button onClick={copy} className="mt-2 w-full py-2 rounded-lg bg-white border border-[#ECE8DF] text-xs font-bold flex items-center justify-center gap-1.5">
                {copied ? <><Check size={13} className="text-[#1E7A45]" />اتنسخ</> : <><Copy size={13} />انسخ النص</>}
              </button>
            </div>
          </div>

          {mode === 'task' && existing && (
            <div className={`rounded-xl p-3 text-xs font-bold ${existing.status === 'approved' ? 'bg-[#EEF5F0] text-[#1E7A45]' : existing.status === 'pending' ? 'bg-[#FBF1E4] text-[#A07A26]' : 'bg-[#FBEDEA] text-[#C2412D]'}`}>
              {existing.status === 'approved' ? 'الإعلان ده اتقبل ✓' : existing.status === 'pending' ? 'رفعت السكرين شوت — مستني مراجعة الإدارة' : `اترفض: ${existing.reason || 'من غير سبب'} — ارفع سكرين شوت تاني`}
            </div>
          )}

          {mode === 'task' && !locked && (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setErr(''); }} />
              <button onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl border-2 border-dashed border-[#D9CFB8] text-xs font-bold flex items-center justify-center gap-1.5">
                <Upload size={14} />{file ? file.name : 'ارفع سكرين شوت الإعلان بعد ما نشرته'}
              </button>
              <input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="لينك البوست (اختياري)" dir="ltr"
                className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs" />
              <button disabled={busy || !file} onClick={send} className="w-full py-3 rounded-xl bg-[#A07A26] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={15} className="animate-spin" />بيرفع {pct ? `${Math.round(pct)}%` : ''}</> : 'نشرته — ابعت للمراجعة'}
              </button>
            </div>
          )}
          {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DailyTab;
