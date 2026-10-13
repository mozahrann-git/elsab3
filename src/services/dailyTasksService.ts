/* ============================================================
   المهام اليومية — الحساب
   ============================================================
   كل عدّاد هنا بيتحسب من بيانات موجودة فعلاً في النظام:

   • المكالمات  ← lead.activity (كل تسجيل مكالمة بيتكتب فيه
                   بوقته ومين عمله — موجود من زمان)
   • الريكويستات ← viewing_requests.requestingAgentId
   • المعاينات   ← viewing_requests.status = completed
   • الإعلانات والفيديو ← work_proofs (سكرين شوت إجباري)

   مفيش عدّاد بيتحرك بزرار "تم" من غير دليل.               */

import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot,
  serverTimestamp, setDoc, deleteDoc, orderBy, limit as qLimit,
} from 'firebase/firestore';
import { db, ensureAuth } from './firebaseService';
import type {
  Lead, ViewingRequest, WorkProof, SalesTargets, AgentUnitAssignment, Property,
} from '../types';
import { DEFAULT_SALES_TARGETS } from '../types';

/* ---------- اليوم بتوقيت القاهرة ----------
   لو عدّينا بتوقيت المتصفح، المندوب اللي جهازه على توقيت تاني
   هيبان إنه شغال في يوم غير اليوم. التوقيت واحد للكل.      */
export function cairoDay(ts: number | Date = Date.now()): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** بداية الأسبوع: السبت (أسبوع الشغل عندنا ٦ أيام من السبت للخميس) */
export function weekDays(today = new Date()): string[] {
  const d = new Date(today);
  const dow = d.getDay();              // 0=الأحد .. 6=السبت
  const back = (dow + 1) % 7;          // رجوع لأقرب سبت
  const sat = new Date(d); sat.setDate(d.getDate() - back);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(sat); x.setDate(sat.getDate() + i);
    out.push(cairoDay(x));
  }
  return out;
}

export function monthDays(today = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < 30; i++) {
    const x = new Date(today); x.setDate(today.getDate() - i);
    out.push(cairoDay(x));
  }
  return out;
}

/* ---------- المكالمات ----------
   lead.activity فيه سطر لكل تسجيل مكالمة، بوقته ومين عمله.
   بنعدّ السطور اللي في اليوم ده للمندوب ده — مش الليدز،
   السطور. يعني لو كلّم نفس العميل مرتين، بتتحسب مرتين،
   بشرط إنه سجّل الاتنين.                                   */

export type CallBucket = 'fresh' | 'follow' | 'old_campaign';

export interface CallCounts {
  total: number;
  fresh: number;
  follow: number;
  old_campaign: number;
}

function bucketOf(lead: Lead): CallBucket {
  if (lead.leadKind === 'fresh') return 'fresh';
  if (lead.leadKind === 'old_campaign') return 'old_campaign';
  return 'follow';
}

/** بيعدّ تسجيلات المكالمات لمندوب في مجموعة أيام */
export function countCalls(leads: Lead[], agentId: string, days: string[]): CallCounts {
  const want = new Set(days);
  const out: CallCounts = { total: 0, fresh: 0, follow: 0, old_campaign: 0 };
  leads.forEach((l) => {
    if (l.assignedAgentId !== agentId) return;
    const b = bucketOf(l);
    (l.activity || []).forEach((a) => {
      if (!a || typeof a.at !== 'number') return;
      if (!want.has(cairoDay(a.at))) return;
      out.total += 1;
      out[b] += 1;
    });
  });
  return out;
}

/* ---------- الريكويستات والمعاينات ---------- */

export interface RequestCounts {
  total: number;
  potential: number;
  normal: number;
}

export function countRequests(
  requests: ViewingRequest[], agentId: string, days: string[],
): RequestCounts {
  const want = new Set(days);
  const out: RequestCounts = { total: 0, potential: 0, normal: 0 };
  requests.forEach((r) => {
    if (r.requestingAgentId !== agentId) return;
    const at = r.createdAtTimestamp || Date.parse(r.createdAt || '') || 0;
    if (!at || !want.has(cairoDay(at))) return;
    out.total += 1;
    /* الطلب القديم اللي اتعمل قبل ما نضيف النوع بيتحسب normal،
       مش بنخمّن إنه potential عشان الرقم ما يتضخّمش */
    if (r.requestKind === 'potential') out.potential += 1;
    else out.normal += 1;
  });
  return out;
}

/** المعاينات اللي تمت فعلاً — الحالة اتحولت لـ completed */
export function countVisits(
  requests: ViewingRequest[], agentId: string, days: string[],
): number {
  const want = new Set(days);
  let n = 0;
  requests.forEach((r) => {
    if (r.requestingAgentId !== agentId) return;
    if (r.status !== 'completed') return;
    const at = r.completedAtTimestamp || 0;
    if (!at || !want.has(cairoDay(at))) return;
    n += 1;
  });
  return n;
}

/* ---------- الإثباتات (إعلانات وفيديو) ---------- */

export interface ProofCounts {
  adResale: number;
  adOffplan: number;
  video: number;
}

export function countProofs(
  proofs: WorkProof[], agentId: string, days: string[],
): ProofCounts {
  const want = new Set(days);
  const out: ProofCounts = { adResale: 0, adOffplan: 0, video: 0 };
  proofs.forEach((p) => {
    if (p.agentId !== agentId) return;
    if (!want.has(p.day)) return;
    if (p.kind === 'ad_resale') out.adResale += 1;
    else if (p.kind === 'ad_offplan') out.adOffplan += 1;
    else if (p.kind === 'video') out.video += 1;
  });
  return out;
}

/** الشقق اللي المندوب أعلن عنها فعلاً في الدورة — دي "التوقيع" */
export function signedUnitIds(proofs: WorkProof[], agentId: string, since: number): Set<string> {
  const s = new Set<string>();
  proofs.forEach((p) => {
    if (p.agentId !== agentId) return;
    if (p.kind !== 'ad_resale' && p.kind !== 'ad_offplan') return;
    if (p.at < since) return;
    if (p.propertyId) s.add(p.propertyId);
  });
  return s;
}

/* ---------- اللوحة الكاملة لمندوب واحد ---------- */

export interface TaskRow {
  key: string;
  label: string;
  done: number;
  target: number;
  auto: boolean;               // النظام حسبها لوحده؟
  period?: 'day' | 'week';     // 'week' = الهدف أسبوعي بطبيعته
  hint?: string;
}

export interface AgentScorecard {
  agentId: string;
  rows: TaskRow[];
}

/* شاشة واحدة بس — مفيش تبويب أسبوعي ولا شهري.
   المندوب بيشوف شغل النهارده وبس. المعاينة والفيديو
   طبيعتهم أسبوعية (٥ و٢ في الأسبوع)، فبيتعرضوا بتقدّمهم
   في الأسبوع ومكتوب عليهم كده صراحة — مش مقسّمين على ٦
   عشان يطلعوا كسر مالهوش معنى. */
export function buildScorecard(args: {
  agentId: string;
  leads: Lead[];
  requests: ViewingRequest[];
  proofs: WorkProof[];
  targets?: SalesTargets;
  now?: Date;
}): AgentScorecard {
  const t = args.targets || DEFAULT_SALES_TARGETS;
  const now = args.now || new Date();
  const today = [cairoDay(now)];
  const week = weekDays(now);

  const c = countCalls(args.leads, args.agentId, today);
  const r = countRequests(args.requests, args.agentId, today);
  const p = countProofs(args.proofs, args.agentId, today);
  const pw = countProofs(args.proofs, args.agentId, week);
  const vw = countVisits(args.requests, args.agentId, week);

  return {
    agentId: args.agentId,
    rows: [
      { key: 'calls', label: 'مكالمات', done: c.total, target: t.callsDaily, auto: true,
        hint: `فريش ${c.fresh} · متابعة ${c.follow} · كامبين قديمة ${c.old_campaign}` },
      { key: 'requests', label: 'ريكويستات', done: r.total, target: t.requestsDaily, auto: true,
        hint: `مهتم جداً ${r.potential}/${t.requestsPotential} · عادي ${r.normal}/${t.requestsNormal}` },
      { key: 'ads_resale', label: 'إعلانات ريسيل', done: p.adResale, target: t.adsResaleDaily, auto: false,
        hint: 'محتاج سكرين شوت' },
      { key: 'ads_offplan', label: 'إعلانات تحت الإنشاء', done: p.adOffplan, target: t.adsOffplanDaily, auto: false,
        hint: 'محتاج سكرين شوت' },
      { key: 'visits', label: 'معاينات تمت', done: vw, target: t.visitsWeekly, auto: true,
        period: 'week', hint: 'الهدف ده للأسبوع كله' },
      { key: 'videos', label: 'فيديو من الموقع', done: pw.video, target: t.videosWeekly, auto: false,
        period: 'week', hint: 'الهدف ده للأسبوع كله' },
    ],
  };
}

/* ---------- التخزين ---------- */

const PROOFS = 'work_proofs';
const ASSIGN = 'agent_units';
const SETTINGS = 'settings';

export async function saveWorkProof(p: Omit<WorkProof, 'id' | 'at' | 'day'>): Promise<string> {
  await ensureAuth();
  const at = Date.now();
  const id = `${p.agentId}_${at}_${Math.random().toString(36).slice(2, 7)}`;
  const rec: WorkProof = { ...p, id, at, day: cairoDay(at) };
  await setDoc(doc(db, PROOFS, id), { ...rec, createdAt: serverTimestamp() });
  return id;
}

export async function deleteWorkProof(id: string): Promise<void> {
  await ensureAuth();
  await deleteDoc(doc(db, PROOFS, id));
}

/** بنجيب إثباتات آخر ٤٠ يوم بس — الشهري مش محتاج أكتر، والقراءات غالية */
export function subscribeWorkProofs(cb: (l: WorkProof[]) => void): () => void {
  const since = Date.now() - 40 * 86400000;
  return onSnapshot(
    query(collection(db, PROOFS), where('at', '>=', since), orderBy('at', 'desc'), qLimit(3000)),
    (snap) => {
      const l: WorkProof[] = [];
      snap.forEach((d) => l.push(d.data() as WorkProof));
      cb(l);
    },
    () => cb([]),
  );
}

export async function saveAssignment(a: AgentUnitAssignment): Promise<void> {
  await ensureAuth();
  await setDoc(doc(db, ASSIGN, a.agentId), a, { merge: true });
}

export async function fetchAssignments(): Promise<AgentUnitAssignment[]> {
  await ensureAuth();
  const snap = await getDocs(collection(db, ASSIGN));
  const l: AgentUnitAssignment[] = [];
  snap.forEach((d) => l.push(d.data() as AgentUnitAssignment));
  return l;
}

export async function saveTargets(t: SalesTargets): Promise<void> {
  await ensureAuth();
  await setDoc(doc(db, SETTINGS, 'sales_targets'), t, { merge: true });
}

export function subscribeTargets(cb: (t: SalesTargets) => void): () => void {
  return onSnapshot(
    doc(db, SETTINGS, 'sales_targets'),
    (snap) => cb(snap.exists() ? { ...DEFAULT_SALES_TARGETS, ...(snap.data() as SalesTargets) } : DEFAULT_SALES_TARGETS),
    () => cb(DEFAULT_SALES_TARGETS),
  );
}

/* ---------- توزيع الشقق ----------
   ٧٠ شقة لكل مندوب × ٦ = ٤٢٠ خانة على ٣٣٢ شقة، يعني الشقق
   بتتكرر بالتبعية. التكرار ده مقصود — الشقق المميزة بتوصل
   لأكتر من مندوب. العميل هو اللي مبيتكررش، الشقة عادي.

   والتوزيع بيتجنّب إنه يدّي المندوب نفس شققه بتاعة الدورة
   اللي فاتت، عشان كل شقة تاخد عين جديدة.                  */

/* ---------- فحص الصلاحيات ----------
   "Missing or insufficient permissions" مبتقولش فشل فين.
   الفحص ده بيجرّب كل مجموعة لوحدها ويقول مين بالظبط المرفوض،
   ومعاه هوية الجلسة — عشان نعرف المشكلة في القواعد ولا في
   الحساب، من غير تخمين. */

export interface PermCheck {
  label: string;
  ok: boolean;
  error?: string;
}

export interface PermReport {
  email: string;
  provider: string;
  anonymous: boolean;
  staffDocFound: boolean;
  role: string;
  checks: PermCheck[];
}

export async function diagnosePermissions(): Promise<PermReport> {
  const user = await ensureAuth();
  const email = (user?.email || '').toLowerCase();
  let provider = 'غير معروف';
  try {
    const t: any = await (user as any)?.getIdTokenResult?.();
    provider = t?.signInProvider || 'غير معروف';
  } catch { /* */ }

  let staffDocFound = false;
  let role = '';
  try {
    const snap = await getDoc(doc(db, 'staff_access', email));
    staffDocFound = snap.exists();
    role = String((snap.data() as any)?.role || '');
  } catch (e: any) {
    role = `ما قدرناش نقرا: ${e?.code || e?.message || ''}`;
  }

  const checks: PermCheck[] = [];
  const run = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); checks.push({ label, ok: true }); }
    catch (e: any) { checks.push({ label, ok: false, error: e?.code || e?.message || 'خطأ' }); }
  };

  await run('قراءة الإثباتات (work_proofs)', () => getDocs(query(collection(db, 'work_proofs'), qLimit(1))));
  await run('قراءة التوزيع (agent_units)', () => getDocs(query(collection(db, 'agent_units'), qLimit(1))));
  await run('قراءة الأهداف (settings)', () => getDoc(doc(db, 'settings', 'sales_targets')));
  await run('كتابة الأهداف (settings)', () => setDoc(doc(db, 'settings', '_perm_check'), { at: Date.now() }, { merge: true }));
  await run('كتابة التوزيع (agent_units)', () => setDoc(doc(db, 'agent_units', '_perm_check'), { at: Date.now() }, { merge: true }));

  return {
    email: email || '(مفيش إيميل)',
    provider,
    anonymous: !!user?.isAnonymous,
    staffDocFound,
    role,
    checks,
  };
}

/* ---------- التفاصيل ورا كل رقم ----------
   الإدارة لازم تقدر تدوس على أي عدّاد وتشوف الشغل اللي
   وراه بالاسم والوقت. رقم من غير تفاصيل مش ممكن تتأكد منه. */

export interface DetailRow {
  id: string;
  title: string;
  sub?: string;
  at: number;
  imageUrl?: string;
  linkUrl?: string;
}

export function callDetails(leads: Lead[], agentId: string, days: string[]): DetailRow[] {
  const want = new Set(days);
  const out: DetailRow[] = [];
  leads.forEach((l) => {
    if (l.assignedAgentId !== agentId) return;
    const kind = l.leadKind === 'fresh' ? 'فريش'
      : l.leadKind === 'old_campaign' ? 'كامبين قديمة' : 'متابعة';
    (l.activity || []).forEach((a, i) => {
      if (!a || typeof a.at !== 'number' || !want.has(cairoDay(a.at))) return;
      out.push({
        id: `${l.id}_${i}`,
        title: l.name || l.phone || 'عميل',
        sub: `${kind} · ${a.outcome || ''}${a.comment ? ' — ' + a.comment : ''}`,
        at: a.at,
      });
    });
  });
  return out.sort((a, b) => b.at - a.at);
}

export function requestDetails(
  requests: ViewingRequest[], agentId: string, days: string[], onlyCompleted = false,
): DetailRow[] {
  const want = new Set(days);
  const out: DetailRow[] = [];
  requests.forEach((r) => {
    if (r.requestingAgentId !== agentId) return;
    const at = onlyCompleted
      ? (r.completedAtTimestamp || 0)
      : (r.createdAtTimestamp || Date.parse(r.createdAt || '') || 0);
    if (!at || !want.has(cairoDay(at))) return;
    if (onlyCompleted && r.status !== 'completed') return;
    out.push({
      id: r.id,
      title: `${r.propertyCode} · ${r.clientName || 'عميل'}`,
      sub: `${r.requestKind === 'potential' ? 'مهتم جداً' : 'عادي'} · ${r.propertyNeighborhood || ''}`
        + `${r.clientPhone ? ' · ' + r.clientPhone : ''}`,
      at,
      imageUrl: r.propertyImage,
    });
  });
  return out.sort((a, b) => b.at - a.at);
}

export function proofDetails(
  proofs: WorkProof[], agentId: string, days: string[], kinds: WorkProof['kind'][],
): DetailRow[] {
  const want = new Set(days);
  const label: Record<string, string> = {
    ad_resale: 'إعلان ريسيل', ad_offplan: 'إعلان تحت الإنشاء',
    video: 'فيديو', bonus_listing: 'وحدة جديدة',
  };
  return proofs
    .filter((p) => p.agentId === agentId && want.has(p.day) && kinds.includes(p.kind))
    .map((p) => ({
      id: p.id,
      title: p.propertyCode ? `${p.propertyCode} · ${label[p.kind]}` : label[p.kind],
      sub: new Date(p.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      at: p.at,
      imageUrl: p.proofUrl,
      linkUrl: p.proofUrl,
    }))
    .sort((a, b) => b.at - a.at);
}

/** التفاصيل ورا عدّاد معيّن — نفس المفاتيح اللي في buildScorecard */
export function detailsFor(args: {
  key: string;
  agentId: string;
  leads: Lead[];
  requests: ViewingRequest[];
  proofs: WorkProof[];
  now?: Date;
}): DetailRow[] {
  const now = args.now || new Date();
  const today = [cairoDay(now)];
  const week = weekDays(now);
  switch (args.key) {
    case 'calls': return callDetails(args.leads, args.agentId, today);
    case 'requests': return requestDetails(args.requests, args.agentId, today);
    case 'visits': return requestDetails(args.requests, args.agentId, week, true);
    case 'ads_resale': return proofDetails(args.proofs, args.agentId, today, ['ad_resale']);
    case 'ads_offplan': return proofDetails(args.proofs, args.agentId, today, ['ad_offplan']);
    case 'videos': return proofDetails(args.proofs, args.agentId, week, ['video']);
    default: return [];
  }
}

/* ---------- النقط (XP) ----------
   النقط محسوبة من الشغل الحقيقي، مش مخزّنة ومش بتتزوّد بزرار.
   يعني مفيش مصدرين للحقيقة، ومفيش حد يقدر يزوّدها بالضغط.
   بتتحسب على آخر ٤٠ يوم — نفس المدة اللي بنجيب فيها الإثباتات. */

export interface XpBreakdown {
  total: number;
  calls: number;
  requests: number;
  ads: number;
  videos: number;
  visits: number;
  bonus: number;
}

export function computeXp(args: {
  agentId: string;
  leads: Lead[];
  requests: ViewingRequest[];
  proofs: WorkProof[];
  targets?: SalesTargets;
  days?: string[];
  now?: Date;
}): XpBreakdown {
  const t = args.targets || DEFAULT_SALES_TARGETS;
  const days = args.days || monthDays(args.now || new Date());
  const c = countCalls(args.leads, args.agentId, days);
  const r = countRequests(args.requests, args.agentId, days);
  const p = countProofs(args.proofs, args.agentId, days);
  const v = countVisits(args.requests, args.agentId, days);
  const want = new Set(days);
  let bonusListings = 0;
  args.proofs.forEach((x) => {
    if (x.agentId !== args.agentId) return;
    if (x.kind !== 'bonus_listing') return;
    if (!want.has(x.day)) return;
    bonusListings += 1;
  });

  const calls = c.total * t.xpCall;
  const requests = r.total * t.xpRequest;
  const ads = (p.adResale + p.adOffplan) * t.xpAd;
  const videos = p.video * t.xpVideo;
  const visits = v * t.xpVisit;
  const bonus = bonusListings * t.xpBonusListing;
  return {
    total: calls + requests + ads + videos + visits + bonus,
    calls, requests, ads, videos, visits, bonus,
  };
}

/* ---------- الشقق الضعيفة ----------
   الشقة اللي تفاعلها أقل من المتوسط هي اللي محتاجة دفع.
   الشقة اللي ماشية لوحدها مش محتاجة ٣ مناديب يشتغلوا عليها.
   التفاعل = مشاهدات + (واتساب واتصال × ٣)، لأن اللي بيضغط
   واتساب أقرب للشراء بكتير من اللي بيتفرج.                */

export function interestScore(p: Property): number {
  const c = p.clicks || ({} as any);
  return (c.views || 0) + ((c.whatsapp || 0) + (c.call || 0)) * 3;
}

export interface UnitSplit {
  weak: Property[];        // أقل من المتوسط — دي الأولوية وبتتكرر
  strong: Property[];      // فوق المتوسط — مندوب واحد يكفيها
  average: number;
}

export function splitByPerformance(properties: Property[]): UnitSplit {
  if (!properties.length) return { weak: [], strong: [], average: 0 };
  const scores = properties.map(interestScore);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const weak: Property[] = [];
  const strong: Property[] = [];
  properties.forEach((p, i) => { (scores[i] < average ? weak : strong).push(p); });
  /* الأضعف الأول جوه الضعاف — دي اللي محدش شافها خالص */
  weak.sort((a, b) => interestScore(a) - interestScore(b));
  strong.sort((a, b) => interestScore(a) - interestScore(b));
  return { weak, strong, average };
}

/* ---------- توزيع الشقق ----------
   مش تقسيم عشوائي للأكواد. الترتيب:

   ١) الشقق الضعيفة (أقل من المتوسط) بتتوزّع الأول، وبتتكرر
      بين أكتر من مندوب لحد ما الخانات تخلص — دي الشقق اللي
      محتاجة شغل، ودي اللي بتظهر في مساعد الإعلان والفيديو.
   ٢) الشقق القوية بتتوزّع بعدهم، مندوب واحد لكل واحدة.
   ٣) مفيش مندوب بياخد نفس شققه بتاعة الدورة اللي فاتت.      */

export interface DistributionResult {
  map: Record<string, string[]>;
  priority: Set<string>;     // الشقق الضعيفة — الأولوية
  average: number;
}

export function distributeUnits(args: {
  properties: Property[];
  agentIds: string[];
  perAgent: number;
  previous?: Record<string, string[]>;
}): DistributionResult {
  const { properties, agentIds, perAgent } = args;
  const prev = args.previous || {};
  const map: Record<string, string[]> = {};
  agentIds.forEach((a) => { map[a] = []; });
  const { weak, strong, average } = splitByPerformance(properties);
  const priority = new Set(weak.map((p) => p.id));
  if (!agentIds.length || !properties.length) return { map, priority, average };

  const used = new Map<string, number>();
  properties.forEach((p) => used.set(p.id, 0));

  /* الضعيفة الأول وبتتكرر، وبعدها القوية مرة واحدة لكل شقة */
  const take = (pool: Property[], maxCopies: number) => {
    for (const agentId of agentIds) {
      if (map[agentId].length >= perAgent) continue;
      const had = new Set(prev[agentId] || []);
      const mine = new Set(map[agentId]);
      let best: Property | null = null;
      let bestScore = Infinity;
      for (const p of pool) {
        const u = used.get(p.id) || 0;
        if (u >= maxCopies) continue;
        if (mine.has(p.id)) continue;
        const score = u * 10 + (had.has(p.id) ? 5 : 0);
        if (score < bestScore) { bestScore = score; best = p; if (score === 0) break; }
      }
      if (best) {
        map[agentId].push(best.id);
        used.set(best.id, (used.get(best.id) || 0) + 1);
      }
    }
  };

  /* بنلف لحد ما كل مندوب ياخد نصيبه. الضعيفة بتاخد نسخ
     أكتر، والقوية نسخة واحدة بس. */
  const maxWeakCopies = Math.max(1, Math.ceil((agentIds.length * perAgent) / Math.max(1, weak.length)));
  for (let pass = 0; pass < perAgent; pass++) {
    const before = agentIds.reduce((n, a) => n + map[a].length, 0);
    take(weak, maxWeakCopies);
    if (agentIds.every((a) => map[a].length >= perAgent)) break;
    take(strong, 1);
    const after = agentIds.reduce((n, a) => n + map[a].length, 0);
    if (after === before) break;   // خلصت الشقق
  }

  return { map, priority, average };
}
