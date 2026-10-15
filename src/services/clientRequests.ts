/* ============================================================
   طلبات العملاء — التسجيل والمطابقة
   ============================================================
   الفكرة: العميل اللي طلبه مش موجود دلوقتي مبيتسابش يمشي.
   طلبه بيتسجّل، وأول ما شقة قريبة تتضاف السيلز بتاعه بيعرف.

   المطابقة بتتحسب في المتصفح من الشقق والطلبات اللي الصفحة
   جايباهم أصلاً — مفيش كتابة ولا وظيفة على السيرفر ممكن
   تفشل في صمت وتسيبك فاكر إن النظام شغال وهو واقف.        */

import {
  collection, doc, onSnapshot, query, where, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, ensureAuth } from './firebaseService';
import type { ClientRequest, Lead, Property, RequestKind } from '../types';
import { normHood } from './unitMatch';

const COL = 'client_requests';

/* ---------- الأرقام التقريبية من الداتا الحقيقية ----------
   لما السيلز يفتح خانة التقسيط، مش منطقي نسيبه يخمّن المقدم
   والقسط. بنحسبهم من الشقق تحت الإنشاء الموجودة فعلاً. */

export interface InstallmentHint {
  downPercent: number;      // نسبة المقدم المعتادة
  years: number;            // سنين التقسيط المعتادة
  sample: number;           // عدد الشقق اللي الأرقام دي اتحسبت منها
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** بتطلّع نسبة المقدم وسنين التقسيط المعتادة من الشقق الموجودة */
export function installmentHint(properties: Property[]): InstallmentHint {
  const pcts: number[] = [];
  const yrs: number[] = [];
  properties.forEach((p) => {
    const d = Number((p as any).downPaymentPercentage);
    const y = Number((p as any).installmentYears);
    if (d > 0 && d <= 100) pcts.push(d);
    if (y > 0 && y <= 15) yrs.push(y);
  });
  return {
    downPercent: pcts.length ? median(pcts) : 20,
    years: yrs.length ? median(yrs) : 5,
    sample: Math.max(pcts.length, yrs.length),
  };
}

/** المقدم والقسط المتوقّعين لسعر معيّن، بأرقام الداتا الحقيقية */
export function estimatePlan(price: number, hint: InstallmentHint) {
  const down = Math.round((price * hint.downPercent) / 100);
  const rest = Math.max(0, price - down);
  const months = Math.max(1, hint.years * 12);
  return { down, monthly: Math.round(rest / months), years: hint.years, percent: hint.downPercent };
}

/** الميزانية اللي العميل يقدر عليها، من المقدم والقسط اللي قالهم */
export function affordableFromPlan(down: number, monthly: number, hint: InstallmentHint): number {
  const months = Math.max(1, hint.years * 12);
  return Math.round((Number(down) || 0) + (Number(monthly) || 0) * months);
}

/* ---------- خيارات التقسيط من الداتا الحقيقية ----------
   الخيارات مش مكتوبة بإيدنا. بتتقرا من شقق التقسيط الموجودة:
   العمارات ليها نسب مقدم وسنين، والكمبوندات ليها غيرها.
   والمقدم مينفعش يقل عن أقل نسبة موجودة فعلاً — مفيش حاجة
   بالرقم ده عشان نعرضها عليه.                              */

export type OffPlanKind = 'standalone_building' | 'compound';

export interface PlanOptions {
  years: number[];            // سنين التقسيط المتاحة
  downPercents: number[];     // نسب المقدم المتاحة
  minDownPercent: number;     // أقل نسبة موجودة — ممنوع أقل منها
  deliveries: string[];       // سنين الاستلام
  minPrice: number;
  maxPrice: number;
  count: number;              // الشقق اللي الأرقام دي منها
}

const EMPTY_PLAN: PlanOptions = {
  years: [], downPercents: [], minDownPercent: 0,
  deliveries: [], minPrice: 0, maxPrice: 0, count: 0,
};

export function offPlanOptions(properties: Property[], kind: OffPlanKind): PlanOptions {
  const hit = properties.filter((p) => (p as any).offPlanType === kind);
  if (!hit.length) return EMPTY_PLAN;
  const uniqSort = (a: number[]) => Array.from(new Set(a.filter((x) => x > 0))).sort((x, y) => x - y);
  const years = uniqSort(hit.map((p) => Number((p as any).installmentYears)));
  const downPercents = uniqSort(hit.map((p) => Number((p as any).downPaymentPercentage)));
  const deliveries = Array.from(new Set(
    hit.map((p) => String((p as any).deliveryYear || '').trim()).filter(Boolean),
  )).sort();
  const prices = hit.map((p) => Number(p.price) || 0).filter((x) => x > 0);
  return {
    years,
    downPercents,
    minDownPercent: downPercents.length ? downPercents[0] : 0,
    deliveries,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    count: hit.length,
  };
}

/** أقل مقدم بالجنيه موجود فعلاً للنوع ده — المندوب ممنوع ينزل تحته */
export function minDownAmount(opts: PlanOptions): number {
  if (!opts.minPrice || !opts.minDownPercent) return 0;
  return Math.round((opts.minPrice * opts.minDownPercent) / 100);
}

/* ---------- المطابقة ----------
   الشقة بتتحسب مطابقة لو: الحي من اللي طلبهم (أو مطلبش حي)،
   والمساحة والغرف في المدى، والسعر في الميزانية.
   السعر بياخد سماح ١٠٪ فوق — العميل اللي ميزانيته ٣ مليون
   بيشوف شقة بـ٣.٢ ويتفاوض، مش بنخبّيها عنه.              */

export interface RequestMatch {
  property: Property;
  score: number;         // ٠ – ١٠٠
  reasons: string[];
}

const PRICE_TOLERANCE = 0.10;

export function requestBudget(r: ClientRequest, hint: InstallmentHint): { min: number; max: number } {
  if (r.kind === 'installment') {
    const max = affordableFromPlan(r.downPayment || 0, r.monthly || 0, hint);
    return { min: 0, max };
  }
  return { min: Number(r.budgetMin) || 0, max: Number(r.budgetMax) || 0 };
}

export function matchRequest(
  r: ClientRequest, p: Property, hint: InstallmentHint,
): RequestMatch | null {
  const reasons: string[] = [];
  let score = 0;

  /* الحي: لو طلب أحياء معيّنة ومش منهم، مش مطابقة خالص */
  const wanted = (r.neighborhoods || []).filter(Boolean).map(normHood);
  if (wanted.length) {
    if (!wanted.includes(normHood(p.neighborhood))) return null;
    score += 30;
    reasons.push('في الحي اللي طلبه');
  } else {
    score += 10;
  }

  /* السعر */
  const { min, max } = requestBudget(r, hint);
  const price = Number(p.price) || 0;
  if (max > 0) {
    if (price > max * (1 + PRICE_TOLERANCE)) return null;
    if (price < min * 0.7) return null;
    score += price <= max ? 35 : 25;
    reasons.push(price <= max ? 'في الميزانية' : `أعلى من ميزانيته بـ${Math.round(((price / max) - 1) * 100)}٪`);
  }

  /* المساحة */
  const area = Number(p.area) || 0;
  if (r.areaMin && area && area < r.areaMin * 0.9) return null;
  if (r.areaMax && area && area > r.areaMax * 1.15) return null;
  if (r.areaMin || r.areaMax) { score += 20; reasons.push('المساحة مناسبة'); }

  /* الغرف */
  if (r.bedrooms) {
    const b = Number(p.bedrooms) || 0;
    if (b && b < r.bedrooms) return null;
    score += 10;
    reasons.push(`${b} غرف`);
  }

  /* التشطيب — ما بيمنعش، بيزوّد بس */
  if (r.finishing && p.finishing && String(p.finishing) === String(r.finishing)) {
    score += 5;
    reasons.push('نفس التشطيب');
  }

  return { property: p, score: Math.min(100, score), reasons };
}

export interface RequestWithMatches {
  request: ClientRequest;
  matches: RequestMatch[];     // الجديدة اللي السيلز لسه مشافهاش
}

/** كل الطلبات المفتوحة ومعاها الشقق الجديدة اللي تناسبها */
export function matchAllRequests(
  requests: ClientRequest[], properties: Property[], agentId?: string,
): RequestWithMatches[] {
  const hint = installmentHint(properties);
  const out: RequestWithMatches[] = [];
  requests.forEach((r) => {
    if (r.status !== 'open') return;
    if (agentId && r.agentId !== agentId) return;
    const seen = new Set(r.seenPropertyIds || []);
    const matches: RequestMatch[] = [];
    properties.forEach((p) => {
      if (seen.has(p.id)) return;
      /* الشقة اللي اتضافت قبل الطلب مش "جديدة" بالنسبة له */
      const added = Date.parse(String((p as any).createdAt || '')) || 0;
      if (added && added < r.createdAt) return;
      const m = matchRequest(r, p, hint);
      if (m && m.score >= 60) matches.push(m);
    });
    matches.sort((a, b) => b.score - a.score);
    out.push({ request: r, matches });
  });
  /* اللي عنده شقق جديدة الأول */
  out.sort((a, b) => b.matches.length - a.matches.length || b.request.createdAt - a.request.createdAt);
  return out;
}

/** هل فيه شقة موجودة دلوقتي تناسب الطلب؟ بنستخدمها قبل ما
    نسجّل طلب — لو موجودة، مفيش داعي نسجّل، نعرضها على طول */
export function existingMatches(
  draft: Omit<ClientRequest, 'id' | 'createdAt' | 'status'>, properties: Property[],
): RequestMatch[] {
  const hint = installmentHint(properties);
  const fake = { ...draft, id: '_', createdAt: 0, status: 'open' as const };
  const out: RequestMatch[] = [];
  properties.forEach((p) => {
    const m = matchRequest(fake as ClientRequest, p, hint);
    if (m && m.score >= 60) out.push(m);
  });
  return out.sort((a, b) => b.score - a.score);
}

/* ---------- عميل كاش ولا تقسيط ----------
   الإجابة موجودة في مكالمة الاكتشاف من زمان، بس مكانتش
   بتبان على الكارت — فالسيلز بيفتح الملف عشان يعرف.      */

export type PayType = 'cash' | 'installment' | 'both' | null;

export function paymentOf(lead: Lead): PayType {
  const v = String((lead.discovery as any)?.payment || '').trim();
  if (!v) return null;
  if (v.includes('الاتنين')) return 'both';
  if (v.includes('تقسيط')) return 'installment';
  if (v.includes('كاش')) return 'cash';
  return null;
}

export const PAY_LABEL: Record<Exclude<PayType, null>, string> = {
  cash: 'كاش', installment: 'تقسيط', both: 'كاش/تقسيط',
};

/* ---------- العميل اللي المعروض مش عاجبه ----------
   مؤشر عملي: العميل قاعد في مرحلة "إرسال صور وتفاصيل"،
   والسيلز سجّل عليه أكتر من كومنت، ومع ذلك مش متحرّك.

   ده معناه إن الشقق اللي اتبعتتله مش مناسبة — حتى لو نفس
   الميزانية ونفس الحي. السبب غالباً حاجة مش في الأرقام:
   جودة التشطيب، الدور، المصعد، الفيو، الواجهة.

   النظام مش هيخمّن السبب، بس هيقول للسيلز: "ده محتاج
   طلب مسجّل" ويسأله السبب بإيده.                        */

export interface StuckLead {
  lead: Lead;
  comments: number;        // كام كومنت اتسجّل عليه في المرحلة دي
  daysStuck: number;       // قاعد فيها من كام يوم
}

const STUCK_STAGE = 'sent_details';

export function findStuckLeads(
  leads: Lead[], requests: ClientRequest[],
  opts?: { agentId?: string; minComments?: number; minDays?: number },
): StuckLead[] {
  const minC = opts?.minComments ?? 2;
  const minD = opts?.minDays ?? 0;
  /* اللي ليه طلب مفتوح خلاص مش محتاج تنبيه تاني */
  const hasOpen = new Set(requests.filter((r) => r.status === 'open').map((r) => r.leadId));
  const out: StuckLead[] = [];

  leads.forEach((l) => {
    if (l.status !== STUCK_STAGE) return;
    if (hasOpen.has(l.id)) return;
    if (opts?.agentId && l.assignedAgentId !== opts.agentId) return;

    const acts = (l.activity || []).filter((a) => a && typeof a.at === 'number');
    /* بنعدّ اللي حصل بعد آخر **نقل** للمرحلة دي.
       الباج اللي كان هنا: كنت بدوّر على أي سطر فيه "إرسال صور"،
       والسطور العادية بتقول "في: إرسال صور..." — فكان بياخد
       آخر كومنت كأنه لحظة الدخول، ويطلع العدد ١ دايماً. */
    const entry = acts.find((a) => {
      const o = String(a.outcome || '');
      return o.startsWith('نقل إلى') && o.includes('إرسال صور');
    });
    const enteredAt = entry?.at ?? (acts.length ? acts[acts.length - 1].at : 0);
    const since = acts.filter((a) => a.at >= enteredAt);
    /* الكومنت الحقيقي بس — التسجيل السريع للمكالمة مش كومنت */
    const comments = since.filter((a) => String(a.comment || '').trim().length > 0).length;
    if (comments < minC) return;

    const days = enteredAt ? Math.floor((Date.now() - enteredAt) / 86400000) : 0;
    if (days < minD) return;

    out.push({ lead: l, comments, daysStuck: days });
  });

  return out.sort((a, b) => b.comments - a.comments || b.daysStuck - a.daysStuck);
}

/* أسباب الرفض الشائعة — السيلز بيختار، مش بيكتب من دماغه،
   عشان نقدر نعدّهم بعدين ونعرف إيه اللي بيضيّع الصفقات */
export const REJECTION_REASONS = [
  'التشطيب مش على المستوى',
  'الدور عالي ومفيش مصعد',
  'الفيو مش عاجبه',
  'الواجهة أو العمارة قديمة',
  'المساحة مش موزّعة كويس',
  'عايز استلام أسرع',
  'السعر مش قابل للتفاوض',
] as const;

/* ---------- التخزين ---------- */

export async function saveClientRequest(r: ClientRequest): Promise<void> {
  await ensureAuth();
  await setDoc(doc(db, COL, r.id), { ...r, updatedAt: serverTimestamp() }, { merge: true });
}

export async function markRequestSeen(r: ClientRequest, propertyIds: string[]): Promise<void> {
  await ensureAuth();
  const seen = Array.from(new Set([...(r.seenPropertyIds || []), ...propertyIds]));
  await setDoc(doc(db, COL, r.id), { seenPropertyIds: seen }, { merge: true });
}

export async function closeClientRequest(r: ClientRequest): Promise<void> {
  await ensureAuth();
  await setDoc(doc(db, COL, r.id), { status: 'closed', closedAt: Date.now() }, { merge: true });
}

export function subscribeClientRequests(cb: (l: ClientRequest[]) => void): () => void {
  return onSnapshot(
    query(collection(db, COL), where('status', '==', 'open')),
    (snap) => {
      const l: ClientRequest[] = [];
      snap.forEach((d) => l.push(d.data() as ClientRequest));
      cb(l);
    },
    () => cb([]),
  );
}

/** بيبني طلب من ملف العميل وإجابات الاكتشاف */
export function requestFromLead(
  lead: Lead, agentName: string, kind: RequestKind,
  extra?: { downPayment?: number; monthly?: number; note?: string },
): ClientRequest {
  const d = (lead.discovery || {}) as any;
  const districts: string[] = Array.isArray(d.districts) ? d.districts : [];
  const rooms = Number(String(d.rooms || '').replace(/\D/g, '')) || lead.preferredBedrooms || 0;
  return {
    id: `req_${lead.id}_${Date.now()}`,
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    agentId: lead.assignedAgentId,
    agentName,
    kind,
    neighborhoods: districts.length ? districts : (lead.preferredNeighborhood ? [lead.preferredNeighborhood] : []),
    areaMin: Number(d.areaMin) || undefined,
    areaMax: Number(d.areaMax) || undefined,
    bedrooms: rooms || undefined,
    finishing: d.finishing || lead.preferredFinishing || undefined,
    budgetMin: kind === 'cash' ? (lead.budgetMin || undefined) : undefined,
    budgetMax: kind === 'cash' ? (lead.budgetMax || undefined) : undefined,
    downPayment: kind === 'installment' ? extra?.downPayment : undefined,
    monthly: kind === 'installment' ? extra?.monthly : undefined,
    note: extra?.note,
    status: 'open',
    createdAt: Date.now(),
    seenPropertyIds: [],
  };
}
