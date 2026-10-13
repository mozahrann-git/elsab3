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
  collection, doc, getDocs, query, where, onSnapshot,
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
    if (p.kind === 'video') return;
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
  hint?: string;
}

export interface AgentScorecard {
  agentId: string;
  daily: TaskRow[];
  weekly: TaskRow[];
  monthly: TaskRow[];
}

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
  const month = monthDays(now);

  const wd = t.workDaysPerWeek;
  const wm = t.weeksPerMonth;
  const adsDaily = t.adsResaleDaily + t.adsOffplanDaily;

  const cD = countCalls(args.leads, args.agentId, today);
  const cW = countCalls(args.leads, args.agentId, week);
  const cM = countCalls(args.leads, args.agentId, month);

  const rD = countRequests(args.requests, args.agentId, today);
  const rW = countRequests(args.requests, args.agentId, week);
  const rM = countRequests(args.requests, args.agentId, month);

  const pD = countProofs(args.proofs, args.agentId, today);
  const pW = countProofs(args.proofs, args.agentId, week);
  const pM = countProofs(args.proofs, args.agentId, month);

  const vW = countVisits(args.requests, args.agentId, week);
  const vM = countVisits(args.requests, args.agentId, month);

  return {
    agentId: args.agentId,
    daily: [
      { key: 'calls', label: 'مكالمات', done: cD.total, target: t.callsDaily, auto: true,
        hint: `فريش ${cD.fresh} · متابعة ${cD.follow} · كامبين قديمة ${cD.old_campaign}` },
      { key: 'requests', label: 'ريكويستات', done: rD.total, target: t.requestsDaily, auto: true,
        hint: `مهتم جداً ${rD.potential}/${t.requestsPotential} · عادي ${rD.normal}/${t.requestsNormal}` },
      { key: 'ads_resale', label: 'إعلانات ريسيل', done: pD.adResale, target: t.adsResaleDaily, auto: false,
        hint: 'محتاج سكرين شوت' },
      { key: 'ads_offplan', label: 'إعلانات تحت الإنشاء', done: pD.adOffplan, target: t.adsOffplanDaily, auto: false,
        hint: 'محتاج سكرين شوت' },
    ],
    weekly: [
      { key: 'calls', label: 'مكالمات', done: cW.total, target: t.callsDaily * wd, auto: true },
      { key: 'requests', label: 'ريكويستات', done: rW.total, target: t.requestsDaily * wd, auto: true },
      { key: 'visits', label: 'معاينات تمت', done: vW, target: t.visitsWeekly, auto: true },
      { key: 'videos', label: 'فيديو من الموقع', done: pW.video, target: t.videosWeekly, auto: false },
      { key: 'ads', label: 'إعلانات', done: pW.adResale + pW.adOffplan, target: adsDaily * wd, auto: false },
    ],
    monthly: [
      { key: 'calls', label: 'مكالمات', done: cM.total, target: t.callsDaily * wd * wm, auto: true },
      { key: 'requests', label: 'ريكويستات', done: rM.total, target: t.requestsDaily * wd * wm, auto: true },
      { key: 'visits', label: 'معاينات تمت', done: vM, target: t.visitsWeekly * wm, auto: true },
      { key: 'videos', label: 'فيديو من الموقع', done: pM.video, target: t.videosWeekly * wm, auto: false },
      { key: 'ads', label: 'إعلانات', done: pM.adResale + pM.adOffplan, target: adsDaily * wd * wm, auto: false },
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

export function distributeUnits(args: {
  properties: Property[];
  agentIds: string[];
  perAgent: number;
  previous?: Record<string, string[]>;
}): Record<string, string[]> {
  const { properties, agentIds, perAgent } = args;
  const prev = args.previous || {};
  const out: Record<string, string[]> = {};
  agentIds.forEach((a) => { out[a] = []; });
  if (!agentIds.length || !properties.length) return out;

  /* الشقق الأقل حركة الأول — اللي محدش بص عليها تاخد أولوية */
  const pool = [...properties].sort(
    (a, b) => ((a.clicks?.views || 0) - (b.clicks?.views || 0)),
  );

  /* عدد المرات اللي الشقة اتوزّعت فيها، عشان التكرار يبقى
     متساوي بدل ما شقة تروح لخمسة وشقة لواحد */
  const used = new Map<string, number>();
  pool.forEach((p) => used.set(p.id, 0));

  for (let round = 0; round < perAgent; round++) {
    agentIds.forEach((agentId) => {
      const had = new Set(prev[agentId] || []);
      const mine = new Set(out[agentId]);
      let best: Property | null = null;
      let bestScore = Infinity;
      for (const p of pool) {
        if (mine.has(p.id)) continue;
        const u = used.get(p.id) || 0;
        /* الأقل توزيعاً الأول، ومعاها عقوبة لو كانت معاه الدورة اللي فاتت */
        const score = u * 10 + (had.has(p.id) ? 5 : 0);
        if (score < bestScore) { bestScore = score; best = p; if (score === 0) break; }
      }
      if (best) {
        out[agentId].push(best.id);
        used.set(best.id, (used.get(best.id) || 0) + 1);
      }
    });
  }
  return out;
}
