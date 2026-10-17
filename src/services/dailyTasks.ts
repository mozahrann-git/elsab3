/*
  المهام اليومية للسيلز.

  القاعدة: مفيش مهمة بتتحسب بكلمة "خلصت". كل رقم هنا جاي من شغل
  حقيقي جوه السيستم:
    المكالمات   ← نتيجة متسجّلة على رقم من الأرقام المتوزعة
    الطلبات     ← طلب متسجّل من المطابقة (مهم / محيّر)
    الإعلانات   ← سكرين شوت مرفوع على شقة متوزعة عليه، والإدارة بتراجعه
    المتابعات   ← أكشن متسجّل على العميل النهارده
    المعاينات   ← عميل وصل «تمت المعاينة» الأسبوع ده
    الفيديو     ← فيديو اتنشر من تبويب المحتوى الأسبوع ده

  اليوم بيتقفل الساعة ٧ بالليل بتوقيت القاهرة، والجمعة إجازة.
  أي شغل بعد ٧ أو يوم الجمعة بيتحسب على يوم الشغل اللي بعده.
*/
import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where, limit,
  getDocs, writeBatch, increment, getCountFromServer,
} from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { Lead, Property, ClientRequest, ViewingRequest } from '../types';
import { Project } from './projectService';
import { ContentSlot } from './salesToolsService';

/* ============================================================
   الإعدادات — الإدارة بتغيّرها من غير كود
   ============================================================ */
export interface DailyTargets {
  calls: number;
  requests: number;
  requestsImportant: number;   // للتنبيه بس — مش شرط
  ads: number;
  adsResale: number;
  adsOffPlan: number;
  viewingsWeek: number;
  videosWeek: number;
}
export interface DailySettings {
  agentIds: string[];          // مين داخل المهام (الإدارة بتختار)
  targets: DailyTargets;
  closeHour: number;           // اليوم بيتقفل الساعة كام (بتوقيت القاهرة)
}
export const DEFAULT_TARGETS: DailyTargets = {
  calls: 50, requests: 10, requestsImportant: 7,
  ads: 7, adsResale: 5, adsOffPlan: 2,
  viewingsWeek: 5, videosWeek: 2,
};
export const DEFAULT_DAILY_SETTINGS: DailySettings = { agentIds: [], targets: DEFAULT_TARGETS, closeHour: 19 };

export function subscribeDailySettings(cb: (s: DailySettings) => void, onErr?: (m: string) => void) {
  return onSnapshot(doc(db, 'settings', 'daily_tasks'), (snap) => {
    const d = (snap.data() || {}) as Partial<DailySettings>;
    cb({
      agentIds: Array.isArray(d.agentIds) ? d.agentIds : [],
      targets: { ...DEFAULT_TARGETS, ...(d.targets || {}) },
      closeHour: typeof d.closeHour === 'number' ? d.closeHour : 19,
    });
  }, (e) => { cb(DEFAULT_DAILY_SETTINGS); onErr?.(errText(e)); });
}
export async function saveDailySettings(s: Partial<DailySettings>) {
  await setDoc(doc(db, 'settings', 'daily_tasks'), cleanFirestoreData(s), { merge: true });
}

/* ============================================================
   يوم الشغل
   ============================================================ */
const pad = (n: number) => String(n).padStart(2, '0');

/** التاريخ والساعة واليوم بتوقيت القاهرة — مش بتوقيت الجهاز */
function cairoParts(t: number) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p: Record<string, string> = {};
  f.formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, wd: p.weekday };
}
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}
const weekdayOf = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();   // 0 الأحد … 5 الجمعة 6 السبت
};

/** يوم الشغل اللي اللحظة دي بتتحسب عليه */
export function workDay(t = Date.now(), closeHour = 19): string {
  const c = cairoParts(t);
  let day = `${c.y}-${pad(c.m)}-${pad(c.d)}`;
  if (c.h >= closeHour) day = addDays(day, 1);
  if (weekdayOf(day) === 5) day = addDays(day, 1);   // الجمعة → السبت
  return day;
}
/** السبت اللي الأسبوع بيبدأ بيه */
export function workWeek(day: string): string {
  return addDays(day, -((weekdayOf(day) + 1) % 7));
}
export const inWeek = (day: string, week: string) => workWeek(day) === week;
export function prevWorkDay(day: string): string {
  let d = addDays(day, -1);
  if (weekdayOf(d) === 5) d = addDays(d, -1);
  return d;
}
export function nextWorkDay(day: string): string {
  let d = addDays(day, 1);
  if (weekdayOf(d) === 5) d = addDays(d, 1);
  return d;
}
const DAY_NAMES = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
export const dayLabel = (day: string) => `${DAY_NAMES[weekdayOf(day)]} ${day.slice(8)}/${day.slice(5, 7)}`;
/** الساعة دلوقتي بتوقيت القاهرة */
export const cairoHour = (t = Date.now()) => cairoParts(t).h;

/* ============================================================
   توزيع الشقق على السيلز — من غير تكرار، وبيلف كل أسبوع
   ============================================================
   مفيش حاجة بتتخزن: كل جهاز بيحسب نفس التوزيع من نفس الداتا.
   الأكواد مترتبة، والسيلز مترتبين، وكل أسبوع التوزيع بيتزحلق
   خطوة — فالشقة بتروح لحد تاني الأسبوع اللي بعده. */
const weekIndex = (week: string) => Math.floor(Date.parse(`${week}T00:00:00Z`) / (7 * 86400000));

export function distribute<T extends { code: string }>(items: T[], agentIds: string[], week: string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  const ids = [...agentIds].sort();
  ids.forEach((id) => out.set(id, []));
  if (!ids.length) return out;
  const sorted = [...items].filter((x) => x.code).sort((a, b) => a.code.localeCompare(b.code));
  const shift = weekIndex(week) % ids.length;
  sorted.forEach((it, i) => out.get(ids[(i + shift) % ids.length])!.push(it));
  return out;
}

/** الشقق اللي تنفع تتعلن: ريسيل منشورة ومش واقفة ومش مباعة */
export const advertisableResale = (props: Property[]) => props.filter((p: any) =>
  p.code && p.category !== 'off_plan' && !p.viewingsPaused && p.allowPublish !== false
  && p.status !== 'sold' && !p.isSold && !String(p.id || '').startsWith('_'));
export const advertisableProjects = (projects: Project[]) => projects.filter((p) => p.code && !p.hidden);

/* ============================================================
   أرقام المكالمات
   ============================================================ */
export type CallOutcome = 'interested' | 'not_interested' | 'no_answer' | 'wrong';
export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  interested: 'رد ومهتم', not_interested: 'رد مش مهتم', no_answer: 'مردش', wrong: 'رقم غلط',
};
/* مردش ٣ مرات = بيطلع من القايمة */
export const MAX_NO_ANSWER = 3;

export interface CallNumber {
  id: string;                  // الرقم نفسه (١١ رقم) — فمفيش رقم يتكرر
  phone: string;
  name?: string;
  note?: string;               // من الشيت
  batch: string;               // اسم الدفعة
  assignedTo: string;
  assignedName: string;
  status: 'pending' | CallOutcome;
  attempts: number;
  lastAt?: number;
  lastDay?: string;
  lastBy?: string;
  lastNote?: string;
  leadId?: string;
  createdAt: number;
}

/** أرقامي اللي لسه محتاجة مكالمة: الجديدة، واللي مردش (أقل من ٣ مرات).
    استعلامين بمساواة بس — من غير index مركّب، ومن غير ما نقرا
    كل أرقامه (مئات القراءات كل فتحة). */
export function subscribeMyNumbers(agentId: string, cb: (l: CallNumber[]) => void, onErr?: (m: string) => void) {
  if (!agentId) { cb([]); return () => {}; }
  let fresh: CallNumber[] = [], retry: CallNumber[] = [];
  const emit = () => cb([
    ...fresh.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
    ...retry.sort((a, b) => (a.lastAt || 0) - (b.lastAt || 0)),
  ]);
  const listen = (status: string, set: (l: CallNumber[]) => void) => onSnapshot(
    query(collection(db, 'call_list'), where('assignedTo', '==', agentId), where('status', '==', status), limit(80)),
    (snap) => { const l: CallNumber[] = []; snap.forEach((d) => l.push(d.data() as CallNumber)); set(l); emit(); },
    (e) => { set([]); emit(); onErr?.(errText(e)); },
  );
  const u1 = listen('pending', (l) => { fresh = l; });
  const u2 = listen('no_answer', (l) => { retry = l; });
  return () => { u1(); u2(); };
}

/** مكالمات يوم معيّن لسيلز معيّن — للإدارة */
export async function numbersCalledOn(agentId: string, day: string): Promise<CallNumber[]> {
  const snap = await getDocs(query(collection(db, 'call_list'), where('lastBy', '==', agentId), where('lastDay', '==', day)));
  const l: CallNumber[] = []; snap.forEach((d) => l.push(d.data() as CallNumber));
  return l.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
}

export async function remainingNumbers(agentId: string): Promise<number> {
  const c = await getCountFromServer(query(collection(db, 'call_list'), where('assignedTo', '==', agentId), where('status', '==', 'pending')));
  return c.data().count;
}

/** تسجيل نتيجة مكالمة + عدّاد اليوم */
export async function logCall(n: CallNumber, outcome: CallOutcome, agentId: string, agentName: string, note = '', leadId?: string, closeHour = 19) {
  const day = workDay(Date.now(), closeHour);
  const attempts = (n.attempts || 0) + 1;
  // مردش كتير → بيطلع من القايمة كـ"مردش" نهائي
  const status: CallNumber['status'] = outcome === 'no_answer' && attempts >= MAX_NO_ANSWER ? 'wrong' : outcome;
  const batch = writeBatch(db);
  batch.update(doc(db, 'call_list', n.id), cleanFirestoreData({
    status, attempts, lastAt: Date.now(), lastDay: day, lastBy: agentId,
    lastNote: note || undefined, leadId: leadId || n.leadId,
  }) as any);
  batch.set(doc(db, 'sales_daily', `${agentId}_${day}`), {
    agentId, agentName, day, updatedAt: Date.now(),
    calls: increment(1), [outcome]: increment(1),
  }, { merge: true });
  await batch.commit();
}

/** رفع أرقام وتوزيعها بالدور على اللي الإدارة اختارتهم */
export async function uploadNumbers(
  rows: { phone: string; name?: string; note?: string }[],
  agents: { id: string; name: string }[],
  batchName: string,
  knownPhones: Set<string>,
): Promise<{ added: number; dupes: number; clients: number }> {
  if (!agents.length) throw new Error('اختار السيلز اللي هيتوزع عليهم');
  // الأرقام الموجودة قبل كده — عشان رقم مايتوزعش مرتين
  const existing = new Set<string>();
  const snap = await getDocs(collection(db, 'call_list'));
  snap.forEach((d) => existing.add(d.id));

  let dupes = 0, clients = 0;
  const fresh: typeof rows = [];
  const seen = new Set<string>();
  rows.forEach((r) => {
    const id = r.phone.replace(/\D/g, '');
    if (seen.has(id) || existing.has(id)) { dupes++; return; }
    seen.add(id);
    if (knownPhones.has(id.slice(-10))) { clients++; return; }
    fresh.push(r);
  });

  // بالدور، فالقسمة بتطلع متساوية
  const now = Date.now();
  for (let i = 0; i < fresh.length; i += 400) {
    const b = writeBatch(db);
    fresh.slice(i, i + 400).forEach((r, j) => {
      const a = agents[(i + j) % agents.length];
      const id = r.phone.replace(/\D/g, '');
      b.set(doc(db, 'call_list', id), cleanFirestoreData({
        id, phone: r.phone, name: r.name || undefined, note: r.note || undefined,
        batch: batchName || 'دفعة', assignedTo: a.id, assignedName: a.name,
        status: 'pending', attempts: 0, createdAt: now,
      }));
    });
    await b.commit();
  }
  return { added: fresh.length, dupes, clients };
}

/* ============================================================
   عدّاد اليوم لكل سيلز (المكالمات + الإجازة)
   ============================================================ */
export interface SalesDay {
  agentId: string; agentName?: string; day: string;
  calls?: number; interested?: number; not_interested?: number; no_answer?: number; wrong?: number;
  off?: boolean; offBy?: string;
}
export function subscribeSalesDays(day: string, cb: (l: SalesDay[]) => void, onErr?: (m: string) => void) {
  return onSnapshot(query(collection(db, 'sales_daily'), where('day', '==', day)), (snap) => {
    const l: SalesDay[] = []; snap.forEach((d) => l.push(d.data() as SalesDay)); cb(l);
  }, (e) => { cb([]); onErr?.(errText(e)); });
}
export function subscribeMyDay(agentId: string, day: string, cb: (d: SalesDay | null) => void, onErr?: (m: string) => void) {
  if (!agentId) { cb(null); return () => {}; }
  return onSnapshot(doc(db, 'sales_daily', `${agentId}_${day}`), (snap) => cb(snap.exists() ? (snap.data() as SalesDay) : null),
    (e) => { cb(null); onErr?.(errText(e)); });
}
export async function setDayOff(agentId: string, agentName: string, day: string, off: boolean, by: string) {
  await setDoc(doc(db, 'sales_daily', `${agentId}_${day}`), { agentId, agentName, day, off, offBy: by, updatedAt: Date.now() }, { merge: true });
}

/* ============================================================
   الإعلانات — سكرين شوت والإدارة بتراجع
   ============================================================ */
export type AdKind = 'resale' | 'offplan';
export interface AdPost {
  id: string;
  agentId: string; agentName: string;
  day: string;
  code: string; kind: AdKind; title: string;
  shotUrl: string;
  postUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string; reviewedAt?: number;
  at: number;
}
export async function submitAd(a: Omit<AdPost, 'id' | 'status' | 'at'>) {
  const id = `${a.agentId}_${a.day}_${a.code}`;
  await setDoc(doc(db, 'ad_posts', id), cleanFirestoreData({ ...a, id, status: 'pending', at: Date.now() }));
  return id;
}
export function subscribeMyAds(agentId: string, day: string, cb: (l: AdPost[]) => void, onErr?: (m: string) => void) {
  if (!agentId) { cb([]); return () => {}; }
  return onSnapshot(query(collection(db, 'ad_posts'), where('agentId', '==', agentId), where('day', '==', day)), (snap) => {
    const l: AdPost[] = []; snap.forEach((d) => l.push(d.data() as AdPost)); cb(l.sort((a, b) => b.at - a.at));
  }, (e) => { cb([]); onErr?.(errText(e)); });
}
export function subscribeAdsOfDay(day: string, cb: (l: AdPost[]) => void, onErr?: (m: string) => void) {
  return onSnapshot(query(collection(db, 'ad_posts'), where('day', '==', day)), (snap) => {
    const l: AdPost[] = []; snap.forEach((d) => l.push(d.data() as AdPost)); cb(l.sort((a, b) => b.at - a.at));
  }, (e) => { cb([]); onErr?.(errText(e)); });
}
export function subscribePendingAds(cb: (l: AdPost[]) => void, onErr?: (m: string) => void) {
  return onSnapshot(query(collection(db, 'ad_posts'), where('status', '==', 'pending'), limit(100)), (snap) => {
    const l: AdPost[] = []; snap.forEach((d) => l.push(d.data() as AdPost)); cb(l.sort((a, b) => a.at - b.at));
  }, (e) => { cb([]); onErr?.(errText(e)); });
}
export async function reviewAd(id: string, ok: boolean, by: string, reason = '') {
  await updateDoc(doc(db, 'ad_posts', id), cleanFirestoreData({
    status: ok ? 'approved' : 'rejected', reason: ok ? undefined : reason, reviewedBy: by, reviewedAt: Date.now(),
  }) as any);
}

/* ============================================================
   حساب التقدّم — دوال صافية، بتتجرّب لوحدها
   ============================================================ */
export interface Progress {
  calls: { done: number; interested: number; answered: number; noAnswer: number; wrong: number };
  requests: { done: number; important: number; undecided: number; unclassified: number; leads: { id: string; name: string; priority?: string }[] };
  ads: { done: number; resale: number; offplan: number; pending: number; rejected: number };
  followUps: { done: number; left: number };
  viewingsWeek: number;
  videosWeek: number;
  off: boolean;
}

const reqOf = (l: Lead) => (l as any).clientRequest as (ClientRequest & { priority?: string; firstAt?: number }) | undefined;

export function computeProgress(args: {
  agentId: string; agentName: string; day: string; closeHour: number;
  leads: Lead[]; salesDay: SalesDay | null; ads: AdPost[];
  viewings?: ViewingRequest[]; slots?: ContentSlot[]; slotWeekKey?: string;
  now?: number;
}): Progress {
  const { agentId, agentName, day, closeHour, leads, salesDay, ads } = args;
  const now = args.now ?? Date.now();
  const mine = leads.filter((l) => l.assignedAgentId === agentId || (!l.assignedAgentId && l.assignedAgentName === agentName));
  const wd = (t?: number) => (typeof t === 'number' && t > 0 ? workDay(t, closeHour) : '');
  const week = workWeek(day);

  // المكالمات
  const sd = salesDay || ({} as SalesDay);
  const interested = sd.interested || 0, notInt = sd.not_interested || 0;
  const calls = { done: sd.calls || 0, interested, answered: interested + notInt, noAnswer: sd.no_answer || 0, wrong: sd.wrong || 0 };

  // الطلبات: أول تسجيل للطلب بس — التعديل مابيتحسبش تاني
  const reqLeads = mine.filter((l) => { const r = reqOf(l); return r && wd(r.firstAt || r.createdAt) === day; });
  const requests = {
    done: reqLeads.length,
    important: reqLeads.filter((l) => reqOf(l)!.priority === 'important').length,
    undecided: reqLeads.filter((l) => reqOf(l)!.priority === 'undecided').length,
    unclassified: reqLeads.filter((l) => !reqOf(l)!.priority).length,
    leads: reqLeads.map((l) => ({ id: l.id, name: l.name, priority: reqOf(l)!.priority })),
  };

  // الإعلانات: المرفوض مابيتحسبش
  const live = ads.filter((a) => a.agentId === agentId && a.day === day && a.status !== 'rejected');
  const adsP = {
    done: live.length,
    resale: live.filter((a) => a.kind === 'resale').length,
    offplan: live.filter((a) => a.kind === 'offplan').length,
    pending: live.filter((a) => a.status === 'pending').length,
    rejected: ads.filter((a) => a.agentId === agentId && a.day === day && a.status === 'rejected').length,
  };

  // المتابعات: اللي اتعمل عليه أكشن النهارده، واللي لسه ميعاده جه ومحدش لمسه
  const touched = new Set(mine.filter((l) => (l.activity || []).some((a) => wd(a.at) === day)).map((l) => l.id));
  const isToday = day === workDay(now, closeHour);
  const left = isToday
    ? mine.filter((l) => !touched.has(l.id) && l.status !== 'closed' && l.status !== 'lost'
        && l.followUpStatus !== 'completed' && typeof l.nextActionAt === 'number' && l.nextActionAt > 0
        && wd(l.nextActionAt) <= day).length
    : 0;
  const followUps = { done: touched.size, left };

  // المعاينات: عميل وصل «تمت المعاينة» الأسبوع ده (من الكارت أو من طلب المعاينة)
  const viewed = new Set<string>();
  mine.forEach((l) => {
    if ((l.activity || []).some((a) => /تمت المعاينة/.test(a.outcome || '') && inWeek(wd(a.at), week))) viewed.add(l.id);
  });
  (args.viewings || []).forEach((v) => {
    if (v.requestingAgentId !== agentId || v.status !== 'completed') return;
    const t = v.completedAtTimestamp || v.scheduledAtTimestamp;
    if (t && inWeek(wd(t), week)) viewed.add(v.leadId || v.id);
  });

  // الفيديو: اتنشر من تبويب المحتوى الأسبوع ده
  const videosWeek = (args.slots || []).filter((s) => s.agentId === agentId && s.publishedAt
    && (args.slotWeekKey ? s.weekKey === args.slotWeekKey : inWeek(wd(s.publishedAt), week))).length;

  return { calls, requests, ads: adsP, followUps, viewingsWeek: viewed.size, videosWeek, off: !!sd.off };
}

/** نسبة الإنجاز الكلية لليوم (المهام اليومية بس) */
export function dayScore(p: Progress, t: DailyTargets): number {
  const part = (d: number, target: number) => (target > 0 ? Math.min(1, d / target) : 1);
  const fu = p.followUps.done + p.followUps.left;
  /* المتابعات بتدخل بس لو فيه متابعات النهارده — وإلا اللي ماعملش
     حاجة كان بياخد ٢٥٪ ببلاش */
  const parts = [part(p.calls.done, t.calls), part(p.requests.done, t.requests), part(p.ads.done, t.ads)];
  if (fu) parts.push(p.followUps.done / fu);
  return Math.round((parts.reduce((s, x) => s + x, 0) / parts.length) * 100);
}

export function errText(e: any): string {
  const c = String(e?.code || '');
  if (c.includes('permission')) return 'السيستم رفض العملية (صلاحيات) — لازم firebase deploy للقواعد الجديدة';
  if (c.includes('failed-precondition')) return 'Firestore محتاج index للاستعلام ده';
  if (c.includes('unavailable')) return 'مفيش اتصال بالسيرفر دلوقتي';
  return e?.message || 'حصلت مشكلة';
}
