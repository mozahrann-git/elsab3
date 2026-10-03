import { Lead, Property } from '../types';
import { floorStatusOf } from './floorRules';

/*
  طلب العميل — مصدر واحد.

  المشكلة اللي بيحلّها: كان فيه محركين مطابقة شغالين بقواعد مختلفة.
  المطابقة الذكية كانت بتقرأ preferredNeighborhood (حي واحد) وبس،
  والعرض المخصوص كان بيقرأ discovery.districts (كل الأحياء) بمحرك تاني.
  فنفس العميل كان بيدّي نتيجتين مختلفتين في شاشتين، والسيلز مش فاهم مين الصح.

  دلوقتي: readBrief بيقرأ الطلب من أي ليد (سواء اتعمله اكتشاف أو لأ)،
  وmatchProperties هي المحرك الوحيد. أي شاشة بتطابق بتندهها.
*/

export interface ClientBrief {
  districts: string[];                                  // كل الأحياء اللي قالها، مش أول واحد بس
  budgetMin: number;
  budgetMax: number;                                    // 0 = مفتوح
  bedrooms: number;                                     // 0 = أي عدد
  finishing: 'finished' | 'semi_finished' | 'all';
  downCash: number;                                     // المقدم اللي معاه — 0 = مش معروف
  monthly: number;                                      // القسط الشهري اللي يقدر عليه — 0 = مش معروف
  /* يقبل دور مخالف؟ 'no' معناه نشيل المخالف من نتايجه خالص */
  violationOk: 'yes' | 'no' | 'depends' | 'unknown';
  payment?: string;                                     // كاش / تقسيط
  years: number;                                        // سنين التقسيط المتفق عليها
  purpose?: string;                                     // ساكن / مستثمر
  urgency?: string;                                     // دلوقتي / خلال شهر / بيدوّر
  askedAt?: number;                                     // وقت مكالمة الاكتشاف
}

/* البايع في الريسيل نادراً بيقسّط أكتر من ٤ سنين. لو العميل اتفق على مدة
   تانية بنكتبها في المكالمة وهي اللي بتغلب. */
export const DEFAULT_INSTALMENT_YEARS = 4;

/** نوع الدفع: كاش ولا تقسيط ولا الاتنين */
export type PayMode = 'cash' | 'instalment' | 'both';

/** بيقرأ نوع الدفع من إجابة المكالمة */
export function payModeOf(b: ClientBrief): PayMode {
  if (b.payment === 'تقسيط') return 'instalment';
  if (b.payment === 'كاش') return 'cash';
  if (b.payment === 'الاتنين') return 'both';
  /* مقال حاجة — لو كاتب مقدم وقسط يبقى بيفكّر تقسيط */
  return b.downCash || b.monthly ? 'both' : 'cash';
}

/**
 * أقصى سعر وحدة يقدر عليها في المشاريع = المقدم + (القسط × ١٢ × السنين).
 *
 * ده للمشاريع بس — العمارات تحت الإنشاء والكمبوندات، لأن المطوّر هو اللي
 * بيقسّط. الريسيل مالهوش علاقة بالرقم ده خالص.
 */
export function instalmentCeiling(b: ClientBrief): number {
  if (!b.downCash && !b.monthly) return 0;
  return Math.round(b.downCash + b.monthly * 12 * (b.years || DEFAULT_INSTALMENT_YEARS));
}

/**
 * هل نوريه شقق ريسيل أصلاً؟
 *
 * الريسيل كاش. المالك بيستلم فلوسه كلها عند العقد — مش بيقسّط. فالعميل
 * اللي بيدوّر على مقدم وقسط، شقق الريسيل بالنسباله مش موجودة، وعرضها عليه
 * بيضيّع وقته ووقت السيلز وبيخلّي المعاينة تفشل.
 *
 * اللي ليه = المشاريع: العمارات تحت الإنشاء والكمبوندات.
 */
export function resaleFits(mode: PayMode): boolean {
  return mode !== 'instalment';
}

/** هل نوريه مشاريع (تقسيط)؟ */
export function projectsFit(mode: PayMode): boolean {
  return mode !== 'cash';
}

/**
 * سقف الريسيل — الميزانية وبس، مهما كان المقدم والقسط.
 * بنفصلها في دالة عشان مفيش حد يخلط بينها وبين حسبة التقسيط تاني.
 */
export function resaleCeiling(b: ClientBrief): number {
  return b.budgetMax || 0;
}

const S = (v: any) => (typeof v === 'string' ? v.trim() : '');

/** بيحوّل إجابة التشطيب من كلام المكالمة لقيمة النظام */
function finishingOf(lead: Lead, d: any): ClientBrief['finishing'] {
  const raw = S(d?.finishing);
  if (raw === 'متشطبة') return 'finished';
  if (raw === 'نص تشطيب') return 'semi_finished';
  if (raw === 'الاتنين') return 'all';
  return lead.preferredFinishing || 'all';
}

/** بيقرأ طلب العميل من الليد. بيشتغل مع أو من غير مكالمة اكتشاف. */
export function readBrief(lead: Lead): ClientBrief {
  const d = (lead as any).discovery || {};

  // الأحياء: اللي اتقالوا في المكالمة الأول (ممكن أكتر من واحد)، وإلا الحي اللي اتكتب وقت الإضافة
  const fromCall: string[] = Array.isArray(d.districts) ? d.districts.filter(Boolean) : [];
  const districts = fromCall.length
    ? fromCall
    : (S(lead.preferredNeighborhood) ? [S(lead.preferredNeighborhood)] : []);

  const roomsRaw = d.rooms ?? lead.preferredBedrooms;
  const bedrooms = Number(String(roomsRaw ?? '').replace('+', '')) || 0;

  return {
    districts,
    budgetMin: Number(lead.budgetMin) || 0,
    budgetMax: Number(lead.budgetMax) || 0,
    bedrooms,
    finishing: finishingOf(lead, d),
    violationOk: d.violationOk === 'يقبل' ? 'yes' : d.violationOk === 'مايقبلش' ? 'no' : d.violationOk === 'حسب السعر' ? 'depends' : 'unknown',
    downCash: Number(String(d.downCash ?? '').replace(/[^\d.]/g, '')) || 0,
    monthly: Number(String(d.monthly ?? '').replace(/[^\d.]/g, '')) || 0,
    payment: S(d.payment) || undefined,
    years: Number(String(d.years ?? '').replace(/[^\d.]/g, '')) || DEFAULT_INSTALMENT_YEARS,
    purpose: S(d.purpose) || undefined,
    urgency: S(d.urgency) || undefined,
    askedAt: typeof d.answeredAt === 'number' ? d.answeredAt : undefined,
  };
}

// ---------------- اللي ناقص في الطلب ----------------

export interface BriefGap { id: string; label: string }

/** إيه اللي لسه مش معروف عن العميل. لو رجعت فاضية يبقى الطلب كامل. */
export function briefGaps(lead: Lead): BriefGap[] {
  const b = readBrief(lead);
  const gaps: BriefGap[] = [];
  if (!b.districts.length) gaps.push({ id: 'districts', label: 'الحي' });
  if (!b.budgetMax) gaps.push({ id: 'budget', label: 'الميزانية' });
  if (!b.bedrooms) gaps.push({ id: 'rooms', label: 'عدد الغرف' });
  if (!b.purpose) gaps.push({ id: 'purpose', label: 'ساكن ولا مستثمر' });
  if (!b.urgency) gaps.push({ id: 'urgency', label: 'محتاجها إمتى' });
  return gaps;
}

/** هل اتعملت مكالمة اكتشاف فعلاً؟ */
export function hasDiscovery(lead: Lead): boolean {
  return !!(lead as any).discovery?.answeredAt;
}

/** الطلب كامل بما يكفي إن المطابقة تبقى معبّرة */
export function briefIsComplete(lead: Lead): boolean {
  return briefGaps(lead).length === 0;
}

// ---------------- المحرك ----------------

export interface MatchOptions {
  /** سماحية السعر: 0 = بالظبط، 0.05 = ±٥٪ */
  tolerance?: number;
  /** لو false بيطلّع شقق برّه الأحياء اللي طلبها كمان (مرتبة بعدها) */
  strictDistrict?: boolean;
  /** يغلب على اللي اتقال في المكالمة — السيلز بيجرّب كاش وتقسيط من الشاشة */
  payMode?: PayMode;
}

export interface MatchResult {
  property: Property;
  score: number;                 // الأقل أحسن
  inDistrict: boolean;
  reasons: string[];             // ليه مناسبة
  misses: string[];              // فين مش مظبوطة
}

const inList = (hood: string | undefined, districts: string[]) =>
  districts.length === 0 || districts.some((d) => d === hood);

/** المحرك الوحيد. كل شاشة بتطابق بتندهه — فمستحيل الأرقام تختلف. */
export function matchDetailed(
  lead: Lead,
  properties: Property[],
  opts: MatchOptions = {},
): MatchResult[] {
  const b = readBrief(lead);
  const tol = opts.tolerance || 0;
  const strict = opts.strictDistrict !== false;

  /* الريسيل كاش. اللي بيدوّر تقسيط مش بنوريه ريسيل خالص — المشاريع هي بتاعته. */
  const mode = opts.payMode || payModeOf(b);
  if (!resaleFits(mode)) return [];

  const ceilMax = resaleCeiling(b);
  const minB = b.budgetMin ? b.budgetMin * (1 - tol) : 0;
  const maxB = ceilMax ? ceilMax * (1 + tol) : Infinity;
  const target = ceilMax ? ((b.budgetMin || ceilMax) + ceilMax) / 2 : 0;

  const out: MatchResult[] = [];

  properties.forEach((p) => {
    if ((p as any).viewingsPaused) return;

    const hit = inList(p.neighborhood, b.districts);
    if (strict && !hit) return;

    const price = Number(p.price) || 0;
    if (price < minB || price > maxB) return;

    if (b.bedrooms && (Number(p.bedrooms) || 0) < b.bedrooms) return;

    if (b.finishing !== 'all' && p.finishing && p.finishing !== b.finishing) return;

    /* قال مايقبلش مخالف — منوريهوش شقة هيرفضها في المعاينة.
       اللي دوره مش معروف بيفضل ظاهر، مش من حقنا نستبعده بالشك. */
    const fstat = floorStatusOf(p);
    if (b.violationOk === 'no' && fstat === 'violation') return;

    const reasons: string[] = [];
    const misses: string[] = [];
    if (hit && b.districts.length) reasons.push(p.neighborhood || '');
    else if (b.districts.length) misses.push('برّه الأحياء اللي طلبها');
    if (ceilMax && price <= ceilMax) reasons.push('جوه الميزانية');
    else if (ceilMax) misses.push('أعلى من ميزانيته');
    if (b.bedrooms && (Number(p.bedrooms) || 0) > b.bedrooms) reasons.push('غرف أكتر');
    if (fstat === 'violation') misses.push('الدور مخالف');
    else if (fstat === 'unknown') misses.push('الدور محتاج تأكيد');

    const score =
      (hit ? 0 : 1) * 1e9 +
      Math.abs(price - target) +
      Math.abs((Number(p.bedrooms) || 0) - b.bedrooms) * 1e5;

    out.push({ property: p, score, inDistrict: hit, reasons: reasons.filter(Boolean), misses });
  });

  /* نفس الكود مرتين = الشقة اتسجّلت مرتين في الداتا. السيلز مايبعتش
     لعميل نفس الكود ٤ مرات في عرض واحد. */
  const seen = new Set<string>();
  return out
    .sort((x, y) => x.score - y.score)
    .filter((r) => {
      const key = (r.property.code || r.property.id || '').trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** نفس المحرك، بيرجّع الشقق بس */
export function matchProperties(lead: Lead, properties: Property[], opts: MatchOptions = {}): Property[] {
  return matchDetailed(lead, properties, opts).map((r) => r.property);
}

/** سطر بيلخّص الطلب — بيظهر فوق المطابقة وفوق العرض بنفس الكلام */
export function briefLine(lead: Lead): string {
  const b = readBrief(lead);
  const money = (n: number) => `${(n / 1e6).toFixed(1)}م`;
  const parts: string[] = [];
  parts.push(b.districts.length ? b.districts.join('، ') : 'أي حي');
  parts.push(b.bedrooms ? `${b.bedrooms}+ غرف` : 'أي عدد غرف');
  if (b.budgetMax) parts.push(b.budgetMin ? `${money(b.budgetMin)}–${money(b.budgetMax)}` : `لحد ${money(b.budgetMax)}`);
  /* التقسيط بيوصّف المشاريع — مش الريسيل */
  const mode = payModeOf(b);
  if (mode !== 'cash' && (b.downCash || b.monthly)) {
    parts.push(`تقسيط (مشاريع): مقدم ${money(b.downCash)} + ${Math.round(b.monthly / 1000)} ألف/شهر`);
  }
  if (b.violationOk === 'no') parts.push('مايقبلش مخالف');
  else if (b.violationOk === 'yes') parts.push('يقبل مخالف');
  if (b.purpose) parts.push(b.purpose);
  if (b.urgency) parts.push(b.urgency);
  return parts.join(' · ');
}

// ---------------- المشاريع تحت الإنشاء ----------------

/**
 * بيحوّل طلب العميل لفلتر مشاريع.
 * الأرقام اللي اتقالت في مكالمة الاكتشاف (المقدم والقسط) هي اللي بتحكم،
 * فالسيلز مش بيقعد يكتبها من تاني في كل شاشة.
 */
export function briefToProjectFilter(lead: Lead) {
  const b = readBrief(lead);
  return {
    kind: 'all' as const,
    neighborhood: b.districts.length === 1 ? b.districts[0] : 'all',
    maxDownPercent: 'all' as const,
    delivery: 'all' as const,
    maxPrice: b.budgetMax ? b.budgetMax : ('all' as const),
    maxMonthly: b.monthly ? b.monthly : ('all' as const),
    maxDownAmount: b.downCash ? b.downCash : ('all' as const),
  };
}
