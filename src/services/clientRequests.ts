/* ============================================================
   طلبات العملاء — التسجيل والمطابقة
   ============================================================
   الفكرة: العميل اللي طلبه مش موجود دلوقتي مبيتسابش يمشي.
   طلبه بيتسجّل، وأول ما شقة قريبة تتضاف السيلز بتاعه بيعرف.

   المطابقة بتتحسب في المتصفح من الشقق والطلبات اللي الصفحة
   جايباهم أصلاً — مفيش كتابة ولا وظيفة على السيرفر ممكن
   تفشل في صمت وتسيبك فاكر إن النظام شغال وهو واقف.        */

import type { ClientRequest, Lead, Property, RequestKind } from '../types';
import { normHood } from './unitMatch';

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
  /* شروطه الصريحة الأول — دي بتشيل خالص مش بتقلّل النقط */
  if (blockedBy(r, p)) return null;

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
  const strict = (r.rejectionReasons || []).some(
    (x) => x === 'strict_budget' || x === 'الميزانية نهائي',
  );
  const tol = strict ? 0 : PRICE_TOLERANCE;
  if (max > 0) {
    if (price > max * (1 + tol)) return null;
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

/* شروط بتفلتر فعلاً.
   قبل كده كانت قايمة أسباب بتتخزّن وخلاص — السيلز بيدوس
   ومفيش حاجة بتحصل. دلوقتي كل واحدة فيهم بتشيل شقق من
   النتيجة بناءً على الداتا.

   الأسباب اللي مش موجودة في الداتا (الفيو، شكل الواجهة،
   توزيع المساحة) اتشالت من القايمة — مكانها الملاحظة،
   مش زرار بيوهم إنه بيعمل حاجة. */

export type FilterRule = 'needs_elevator' | 'finished_only' | 'ready_now' | 'strict_budget';

export const REQUEST_FILTERS: { id: FilterRule; label: string; note: string }[] = [
  { id: 'needs_elevator', label: 'لازم مصعد أو دور واطي', note: 'بيشيل الأدوار العالية اللي من غير مصعد' },
  { id: 'finished_only', label: 'متشطبة بس', note: 'بيشيل نص التشطيب والطوب' },
  { id: 'ready_now', label: 'استلام فوري', note: 'بيشيل اللي تحت الإنشاء' },
  { id: 'strict_budget', label: 'الميزانية نهائي', note: 'مش هيعرض أي حاجة فوق ميزانيته' },
];

/* توافق مع الطلبات القديمة */
export const REJECTION_REASONS = REQUEST_FILTERS.map((f) => f.label);

const FLOOR_NUM = (v: unknown): number => {
  const t = String(v || '');
  const words: Record<string, number> = {
    'الأرضي': 0, 'الارضي': 0, 'الأول': 1, 'الاول': 1, 'الثاني': 2, 'التاني': 2,
    'الثالث': 3, 'التالت': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6,
    'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10,
  };
  for (const k of Object.keys(words)) if (t.includes(k)) return words[k];
  const n = Number(t.replace(/\D/g, ''));
  return Number.isFinite(n) ? n : -1;
};

/** بترجّع سبب الاستبعاد لو الشقة مش مطابقة لشروطه، وإلا null */
export function blockedBy(r: ClientRequest, p: Property): string | null {
  const rules = (r.rejectionReasons || []) as string[];
  const has = (id: FilterRule) => {
    const f = REQUEST_FILTERS.find((x) => x.id === id)!;
    return rules.includes(f.label) || rules.includes(id);
  };

  if (has('needs_elevator')) {
    const fl = FLOOR_NUM(p.floor);
    const lift = (p as any).hasElevator ?? (p as any).elevator;
    if (fl >= 3 && lift === false) return 'دور عالي من غير مصعد';
    if (fl >= 5 && lift === undefined) return 'دور عالي والمصعد مش مأكّد';
  }
  if (has('finished_only')) {
    const fin = String(p.finishing || '');
    if (fin && !fin.includes('متشطب') && !fin.includes('سوبر') && !fin.includes('لوكس')) {
      return 'مش متشطبة';
    }
  }
  if (has('ready_now')) {
    if ((p as any).category === 'off_plan') return 'تحت الإنشاء';
  }
  return null;
}

/* ---------- التخزين ----------
   الطلب متخزّن على ملف العميل نفسه (lead.clientRequest).
   كان مجموعة لوحدها، فكان محتاج قاعدة أمان جديدة وكان
   بيترفض بـ permission-denied لحد ما القواعد تتنشر.
   الملف بيتكتب عادي من كل الأجهزة، فالمشكلة دي راحت
   من أصلها.                                            */

/** بتطلّع الطلبات المفتوحة من ملفات العملاء */
export function requestsFromLeads(leads: Lead[]): ClientRequest[] {
  const out: ClientRequest[] = [];
  leads.forEach((l) => {
    const r = (l as any).clientRequest as ClientRequest | undefined;
    if (r && r.status === 'open') out.push({ ...r, leadId: l.id, leadName: l.name, leadPhone: l.phone });
  });
  return out;
}

/** بيرجّع نسخة من الملف وفيها الطلب — الحفظ بيتم من onUpdateLead.

    الباج اللي كان هنا: الطلب كان بيتكتب في lead.clientRequest
    بس، والمطابقة بتقرا من lead.discovery والميزانية. فالطلب
    يتسجّل ومايتنفّذش — المطابقة مش شايفاه خالص.

    دلوقتي الطلب بيكتب في نفس الحقول اللي المطابقة بتقرا منها
    بالظبط، فأول ما يتحفظ المطابقة بتشتغل عليه. */
export function leadWithRequest(lead: Lead, r: ClientRequest): Lead {
  const prevD = ((lead as any).discovery || {}) as Record<string, unknown>;
  const isInst = r.kind === 'installment';

  /* التقسيط: الميزانية = المقدم + القسط × عدد الشهور.
     من غيرها المطابقة بتفتكر إن ميزانيته صفر. */
  const instMax = isInst && r.years && r.monthly
    ? Math.round((r.downPayment || 0) + r.monthly * r.years * 12)
    : 0;

  const discovery = {
    ...prevD,
    payment: isInst ? 'تقسيط' : 'كاش',
    districts: r.neighborhoods || [],
    rooms: r.bedrooms ? String(r.bedrooms) : prevD.rooms,
    finishing: r.finishing || prevD.finishing,
    downCash: isInst ? (r.downPayment || 0) : prevD.downCash,
    monthly: isInst ? (r.monthly || 0) : prevD.monthly,
    years: isInst ? (r.years || prevD.years) : prevD.years,
    /* عمارات ولا كمبوند — فلتر المشاريع كان بيتجاهلها */
    projectKind: isInst ? (r.offPlanKind === 'compound' ? 'compound' : 'building') : undefined,
    deliveryWithin: isInst ? r.deliveryWithin : undefined,
    answeredAt: Date.now(),
    by: r.agentName,
  };

  return {
    ...lead,
    clientRequest: r,
    discovery,
    budgetMin: isInst ? 0 : (r.budgetMin ?? lead.budgetMin),
    budgetMax: isInst ? (instMax || lead.budgetMax) : (r.budgetMax ?? lead.budgetMax),
    preferredBedrooms: r.bedrooms || lead.preferredBedrooms,
    preferredNeighborhood: r.neighborhoods?.[0] || lead.preferredNeighborhood,
  } as Lead;
}

export function leadWithSeen(lead: Lead, propertyIds: string[]): Lead {
  const r = (lead as any).clientRequest as ClientRequest | undefined;
  if (!r) return lead;
  const seen = Array.from(new Set([...(r.seenPropertyIds || []), ...propertyIds]));
  return { ...lead, clientRequest: { ...r, seenPropertyIds: seen } } as Lead;
}

export function leadWithClosedRequest(lead: Lead): Lead {
  const r = (lead as any).clientRequest as ClientRequest | undefined;
  if (!r) return lead;
  return { ...lead, clientRequest: { ...r, status: 'closed', closedAt: Date.now() } } as Lead;
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
