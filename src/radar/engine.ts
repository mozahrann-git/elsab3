// Manateq Radar — محرّك الحكم.
// كل دالة هنا نقية: نفس المدخلات تعطي نفس الحكم، وكل رقم في المخرج له طريقة حساب منشورة.
import type { Alternative, Extracted, Lang, Market, RadarEvent, Zone } from './types';

export const DAY = 86_400_000;

// ───────────────────────── تنسيق ─────────────────────────

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtMoney(n: number, lang: Lang): string {
  const m = n / 1_000_000;
  if (Math.abs(m) >= 1) {
    const s = Number.isInteger(m) ? fmt(m) : fmt(m, 2).replace(/\.?0+$/, '');
    return lang === 'ar' ? `${s} مليون` : `${s}M EGP`;
  }
  return lang === 'ar' ? `${fmt(n)} ج.م` : `EGP ${fmt(n)}`;
}

export function pct(n: number, digits = 1): string {
  return `${fmt(n, digits)}%`;
}

export function stampDate(iso: string): string {
  const d = new Date(iso);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${mon} ${d.getFullYear()}`;
}

// ───────────────────────── التكلفة الحقيقية ─────────────────────────

export interface CostLine {
  key: 'maintenance' | 'deposit' | 'garage' | 'club';
  label: { ar: string; en: string };
  pct: number | null;
  amount: number;
}

export interface TrueCost {
  declared: number;
  lines: CostLine[];
  total: number;
  declaredPpm: number;
  truePpm: number;
  gapPct: number;
}

const LINE_LABELS: Record<CostLine['key'], { ar: string; en: string }> = {
  maintenance: { ar: 'وديعة الصيانة', en: 'Maintenance deposit' },
  deposit: { ar: 'تأمين ومصاريف تعاقد', en: 'Contract deposit' },
  garage: { ar: 'الجراج', en: 'Garage' },
  club: { ar: 'النادي والخدمات', en: 'Club & services' },
};

/** (الإجمالي + الصيانة + الوديعة + الجراج + النادي) ÷ المساحة — مرتّبة بثقلها. */
export function trueCost(f: Extracted): TrueCost | null {
  if (!f.price || !f.area) return null;
  const lines: CostLine[] = [];
  if (f.maintenancePct) {
    lines.push({ key: 'maintenance', label: LINE_LABELS.maintenance, pct: f.maintenancePct, amount: Math.round((f.price * f.maintenancePct) / 100) });
  }
  if (f.deposit) lines.push({ key: 'deposit', label: LINE_LABELS.deposit, pct: (f.deposit / f.price) * 100, amount: f.deposit });
  if (f.garage) lines.push({ key: 'garage', label: LINE_LABELS.garage, pct: (f.garage / f.price) * 100, amount: f.garage });
  if (f.club) lines.push({ key: 'club', label: LINE_LABELS.club, pct: (f.club / f.price) * 100, amount: f.club });
  lines.sort((a, b) => b.amount - a.amount);
  const total = f.price + lines.reduce((s, l) => s + l.amount, 0);
  return {
    declared: f.price,
    lines,
    total,
    declaredPpm: f.price / f.area,
    truePpm: total / f.area,
    gapPct: ((total - f.price) / f.price) * 100,
  };
}

// ───────────────────────── خطة السداد ─────────────────────────

export interface PaymentPlan {
  down: number;
  installment: number;
  count: number;
  periodMonths: number;
  months: number;
  /** القيمة الحالية لكل المدفوعات مخصومةً بعائد البديل الآمن. */
  npv: number;
  /** الخصم الضمني الذي يساويه التقسيط. */
  impliedDiscountPct: number;
  quasiCash: boolean;
}

const PERIOD: Record<NonNullable<Extracted['frequency']>, number> = { monthly: 1, quarterly: 3, annual: 12 };

export function paymentPlan(f: Extracted, annualRatePct: number): PaymentPlan | null {
  if (!f.price) return null;
  const downPct = f.downPct ?? (f.months ? 0 : 100);
  const down = (f.price * downPct) / 100;
  const months = f.months ?? 0;
  const periodMonths = PERIOD[f.frequency ?? 'monthly'];
  const count = months > 0 ? Math.max(1, Math.round(months / periodMonths)) : 0;
  const remaining = f.price - down;
  const installment = count > 0 ? f.installment ?? remaining / count : 0;
  const r = Math.pow(1 + annualRatePct / 100, periodMonths / 12) - 1;
  let pv = down;
  for (let k = 1; k <= count; k++) pv += installment / Math.pow(1 + r, k);
  return {
    down,
    installment,
    count,
    periodMonths,
    months,
    npv: pv,
    impliedDiscountPct: (1 - pv / f.price) * 100,
    quasiCash: downPct >= 50 && months <= 36,
  };
}

// ───────────────────────── المحاور الستة والحكم ─────────────────────────

export type Grade = 'opportunity' | 'fair' | 'inflated';

export interface Axes {
  truePpm: number;
  /** انحراف سعر المتر المعلن عن متوسط المنطقة (سالب = أقل). */
  marketDevPct: number;
  plan: PaymentPlan | null;
  yieldPct: number;
  liquidityMonths: number;
  /** عدد مرات الطرح + هل تغيّر السعر — هل البائع تحت ضغط؟ */
  pressure: { reposts: number; priceCuts: number; daysListed: number; underPressure: boolean };
}

export interface Verdict {
  grade: Grade;
  /** 0 = متضخّم جداً … 100 = فرصة واضحة. موضع المؤشر على المسار. */
  position: number;
  score: number;
  axes: Axes;
  cost: TrueCost;
  warnings: Warning[];
}

export interface Warning {
  key: 'quasi_cash' | 'cash_discount' | 'missing_fields' | 'expired';
  text: { ar: string; en: string };
}

export const GRADE_WORD: Record<Grade, { ar: string; en: string }> = {
  opportunity: { ar: 'فرصة', en: 'Opportunity' },
  fair: { ar: 'عادي', en: 'Fair' },
  inflated: { ar: 'متضخّم', en: 'Inflated' },
};

/** سياسة الحكم منشورة: أقل من المتوسط بـ5٪ فأكثر = فرصة، أعلى بـ8٪ فأكثر = متضخّم. */
export const THRESHOLDS = { opportunity: 5, inflated: -8 };

export function offerPressure(target: RadarEvent, all: RadarEvent[], now: number) {
  const key = unitKey(target.fields);
  const same = all
    .filter((e) => unitKey(e.fields) === key && e.fields.price)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  let priceCuts = 0;
  for (let i = 1; i < same.length; i++) if ((same[i].fields.price ?? 0) < (same[i - 1].fields.price ?? 0)) priceCuts++;
  const first = same[0] ? Date.parse(same[0].receivedAt) : now;
  const daysListed = Math.max(0, Math.round((now - first) / DAY));
  const reposts = Math.max(0, same.length - 1);
  return { reposts, priceCuts, daysListed, underPressure: priceCuts > 0 || reposts >= 3 || daysListed >= 45 };
}

export function unitKey(f: Extracted): string {
  return [f.developer ?? '', f.project ?? '', f.zoneId ?? '', f.area ?? '', f.unitType ?? ''].join('|').toLowerCase();
}

export function verdict(event: RadarEvent, zone: Zone, market: Market, all: RadarEvent[], now = Date.now()): Verdict | null {
  const f = event.fields;
  const cost = trueCost(f);
  if (!cost) return null;
  const bank = market.alternatives.find((a) => a.id === 'bank');
  const plan = paymentPlan(f, bank?.rate ?? 20);
  const marketDevPct = ((cost.declaredPpm - zone.avgPpm) / zone.avgPpm) * 100;
  const yieldPct = ((zone.rentPpmMonthly * (f.area ?? 0) * 12) / cost.total) * 100;
  const pressure = offerPressure(event, all, now);

  // الدرجة على الرقم لا على المطوّر: الانحراف عن السوق هو الأساس، والضغط يمنح المشتري هامشاً.
  let score = -marketDevPct;
  if (pressure.underPressure) score += 2;
  if (plan && plan.impliedDiscountPct > 15) score += 1;

  const grade: Grade = score >= THRESHOLDS.opportunity ? 'opportunity' : score <= THRESHOLDS.inflated ? 'inflated' : 'fair';
  const position = Math.max(3, Math.min(97, 50 + score * 3.2));

  const warnings: Warning[] = [];
  if (plan?.quasiCash) {
    warnings.push({
      key: 'quasi_cash',
      text: {
        ar: `المقدّم ${fmt(f.downPct ?? 0)}% والتقسيط ${fmt(plan.months / 12, plan.months % 12 ? 1 : 0)} سنوات فقط: هذه صفقة شبه نقدية، لا تقسيطاً.`,
        en: `${fmt(f.downPct ?? 0)}% down over only ${fmt(plan.months / 12, plan.months % 12 ? 1 : 0)} years: this is a near-cash deal, not an installment plan.`,
      },
    });
  }
  if (f.cashDiscountPct) {
    const orig = f.originalPrice ?? f.price! / (1 - f.cashDiscountPct / 100);
    warnings.push({
      key: 'cash_discount',
      text: {
        ar: `هذا السعر بعد خصم نقدي ${fmt(f.cashDiscountPct)}%، والسعر الأصلي ${fmtMoney(orig, 'ar')}.`,
        en: `This price is after a ${fmt(f.cashDiscountPct)}% cash discount; the original is ${fmtMoney(orig, 'en')}.`,
      },
    });
  }
  const missing = (['downPct', 'months', 'delivery'] as const).filter((k) => f[k] === undefined);
  if (missing.length) {
    warnings.push({
      key: 'missing_fields',
      text: {
        ar: `الرسالة لم تذكر: ${missing.map((k) => FIELD_NAMES[k].ar).join('، ')} — اطلبها قبل أي قرار.`,
        en: `The message omits: ${missing.map((k) => FIELD_NAMES[k].en).join(', ')} — ask before deciding.`,
      },
    });
  }
  if (event.expiresAt && Date.parse(event.expiresAt) < now) {
    warnings.push({ key: 'expired', text: { ar: 'هذا العرض انتهت صلاحيته.', en: 'This offer has expired.' } });
  }

  return {
    grade,
    position,
    score,
    cost,
    warnings,
    axes: { truePpm: cost.truePpm, marketDevPct, plan, yieldPct, liquidityMonths: zone.liquidityMonths, pressure },
  };
}

export const FIELD_NAMES: Record<keyof Extracted, { ar: string; en: string }> = {
  project: { ar: 'المشروع', en: 'Project' },
  developer: { ar: 'المطوّر', en: 'Developer' },
  zoneId: { ar: 'المنطقة', en: 'Zone' },
  district: { ar: 'الحي', en: 'District' },
  unitType: { ar: 'نوع الوحدة', en: 'Unit type' },
  rooms: { ar: 'الغرف', en: 'Bedrooms' },
  area: { ar: 'المساحة', en: 'Area' },
  garden: { ar: 'الحديقة', en: 'Garden' },
  price: { ar: 'السعر الإجمالي', en: 'Total price' },
  downPct: { ar: 'المقدّم', en: 'Down payment' },
  installment: { ar: 'القسط', en: 'Installment' },
  months: { ar: 'مدة التقسيط', en: 'Plan length' },
  frequency: { ar: 'دورية القسط', en: 'Frequency' },
  maintenancePct: { ar: 'الصيانة', en: 'Maintenance' },
  deposit: { ar: 'الوديعة', en: 'Deposit' },
  garage: { ar: 'الجراج', en: 'Garage' },
  club: { ar: 'النادي', en: 'Club' },
  delivery: { ar: 'موعد التسليم', en: 'Delivery' },
  cashDiscountPct: { ar: 'الخصم النقدي', en: 'Cash discount' },
  originalPrice: { ar: 'السعر قبل الخصم', en: 'Original price' },
  commissionPct: { ar: 'العمولة', en: 'Commission' },
  incentive: { ar: 'الحافز', en: 'Incentive' },
  sender: { ar: 'المرسِل', en: 'Sender' },
};

/** سطر السبب: بالأرقام، على الرقم لا على المطوّر. */
export function reasonLine(v: Verdict, zone: Zone, f: Extracted, lang: Lang): string {
  const dev = Math.abs(v.axes.marketDevPct);
  const where = f.district ? (lang === 'ar' ? f.district : f.district) : zone.name[lang];
  const ppm = fmt(Math.round(v.cost.declaredPpm));
  const dir = v.axes.marketDevPct < 0;
  const delivery = f.delivery === 'immediate' ? (lang === 'ar' ? '، والاستلام فوري' : ', ready to move') : '';
  if (lang === 'ar') {
    if (dev < 1) return `سعر المتر ${ppm} — على متوسط ${where} تقريباً${delivery}.`;
    return `سعر المتر ${ppm} — ${dir ? 'أقل' : 'أعلى'} من متوسط ${where} بـ${fmt(dev, 0)}%${delivery}.`;
  }
  if (dev < 1) return `${ppm} EGP/m² — roughly the ${where} average${delivery}.`;
  return `${ppm} EGP/m² — ${fmt(dev, 0)}% ${dir ? 'below' : 'above'} the ${where} average${delivery}.`;
}

// ───────────────────────── المقارنة بالبدائل ─────────────────────────

export function alternativesLine(v: Verdict, market: Market, lang: Lang): string {
  const y = v.axes.yieldPct;
  const bank = market.alternatives.find((a) => a.id === 'bank') as Alternative;
  const infl = market.inflation.rate;
  const bankHigher = bank.rate > y;
  if (lang === 'ar') {
    return `العقار هنا يعطي ${pct(y)} سنوياً إيجارياً. شهادة البنك تعطي ${bankHigher ? 'أعلى' : 'أقل'} من ذلك نقداً (${pct(bank.rate)})، ${
      bank.rate < infl ? 'لكنها لا تحافظ على القيمة أمام التضخّم' : 'لكن العائد النقدي يُعاد تسعيره مع كل دورة فائدة'
    }، والعقار يفعل. الفارق الحقيقي ليس في النسبة بل في ما يبقى بعد ثلاث سنوات.`;
  }
  return `This unit yields ${pct(y)} a year in rent. A bank certificate pays ${bankHigher ? 'more' : 'less'} in cash (${pct(bank.rate)}), ${
    bank.rate < infl ? 'but it does not hold value against inflation' : 'but cash yield reprices every rate cycle'
  } — property does. The real difference is not the rate but what is left after three years.`;
}

// ───────────────────────── الترجمة الثلاثية ─────────────────────────

export function threeAngles(event: RadarEvent, v: Verdict, zone: Zone, developerName: string, lang: Lang): Record<'investor' | 'broker' | 'client', string[]> {
  const f = event.fields;
  const p = v.axes.plan;
  const ar = lang === 'ar';
  const word = GRADE_WORD[v.grade][lang];
  const where = f.district ? `${zone.name[lang]} · ${f.district}` : zone.name[lang];
  const daysOut = Math.max(0, v.axes.pressure.daysListed);
  const years = p && p.months ? fmt(p.months / 12, p.months % 12 ? 1 : 0) : null;
  const remaining = p && p.months ? (f.price ?? 0) - p.down : 0;
  const investor = [
    reasonLine(v, zone, f, lang).replace(/\.$/, ''),
    ar ? `التكلفة الحقيقية ${fmt(Math.round(v.cost.total))} بعد الإضافات` : `True cost ${fmt(Math.round(v.cost.total))} after add-ons`,
    f.delivery === 'immediate'
      ? ar ? 'استلام فوري يعني تدفّقاً إيجارياً من الشهر التالي' : 'Ready to move: rental income from next month'
      : f.delivery
        ? ar ? `التسليم ${f.delivery}` : `Delivery ${f.delivery}`
        : ar ? 'موعد التسليم غير مذكور' : 'Delivery not stated',
    ar ? `العائد التقديري ${pct(v.axes.yieldPct)}` : `Estimated yield ${pct(v.axes.yieldPct)}`,
    ar ? `حكم مناطق: ${word}` : `Manateq verdict: ${word}`,
  ];
  const broker = [
    p ? (ar ? `مقدّم ${fmtMoney(p.down, 'ar')}${p.count ? ` · ${fmt(p.count)} قسطاً` : ''}` : `Down ${fmtMoney(p.down, 'en')}${p.count ? ` · ${fmt(p.count)} installments` : ''}`) : '',
    ar ? `متاحة الآن · ${developerName}` : `Available now · ${developerName}`,
    p?.quasiCash ? (ar ? 'تناسب عميل كاش أو نصف كاش' : 'Fits a cash or half-cash client') : ar ? 'تناسب عميل تقسيط' : 'Fits an installment client',
    f.commissionPct ? (ar ? `العمولة ${pct(f.commissionPct)}` : `Commission ${pct(f.commissionPct)}`) : '',
    ar ? `مطروحة منذ ${fmt(daysOut)} يوماً` : `Listed ${fmt(daysOut)} days`,
  ].filter(Boolean);
  const unit = f.unitType ?? (ar ? 'وحدة' : 'Unit');
  const client = [
    ar
      ? `${unit} ${fmt(f.area ?? 0)} متراً${f.rooms ? `، ${fmt(f.rooms)} غرف` : ''}، في ${where}${f.delivery === 'immediate' ? '، جاهزة للسكن الآن' : ''}`
      : `${f.area} m² ${unit.toLowerCase()}${f.rooms ? `, ${f.rooms} bedrooms` : ''} in ${where}${f.delivery === 'immediate' ? ', ready to move in' : ''}`,
    p && p.months
      ? ar
        ? `تدفع ${fmtMoney(p.down, 'ar')} وتقسّط الباقي على ${years} سنوات (${fmt(Math.round(p.installment / 1000))} ألفاً ${p.periodMonths === 1 ? 'شهرياً' : p.periodMonths === 3 ? 'كل ثلاثة أشهر' : 'سنوياً'})`
        : `Pay ${fmtMoney(p.down, 'en')} and spread ${fmtMoney(remaining, 'en')} over ${years} years (${fmt(Math.round(p.installment / 1000))}k ${p.periodMonths === 1 ? 'a month' : p.periodMonths === 3 ? 'a quarter' : 'a year'})`
      : ar ? `السعر ${fmtMoney(f.price ?? 0, 'ar')}` : `Price ${fmtMoney(f.price ?? 0, 'en')}`,
    v.axes.marketDevPct < -1
      ? ar ? 'سعرها أقل من متوسط منطقتها' : 'Priced below its area average'
      : v.axes.marketDevPct > 1
        ? ar ? 'سعرها أعلى من متوسط منطقتها' : 'Priced above its area average'
        : ar ? 'سعرها على متوسط منطقتها' : 'Priced at its area average',
  ];
  return { investor, broker, client };
}

// ───────────────────────── حالة المطوّر ─────────────────────────

export type TileState = 'hot' | 'warm' | 'cold';

export function developerState(devName: string, events: RadarEvent[], now = Date.now()) {
  const mine = events.filter((e) => e.fields.developer === devName && e.importance === 'real');
  const today = mine.filter((e) => now - Date.parse(e.receivedAt) < DAY);
  const recent = mine.filter((e) => now - Date.parse(e.receivedAt) < 3 * DAY);
  const last = mine.reduce<string | null>((m, e) => (!m || e.receivedAt > m ? e.receivedAt : m), null);
  let state: TileState = 'cold';
  if (today.some((e) => e.type === 'launch' || e.type === 'discount' || e.type === 'limited_offer')) state = 'hot';
  else if (recent.length) state = 'warm';
  return { state, newCount: recent.length, last, activity: today.length * 10 + recent.length };
}

// ───────────────────────── أدوات ─────────────────────────

export function isLive(e: RadarEvent, now = Date.now()): boolean {
  return !e.expiresAt || Date.parse(e.expiresAt) >= now;
}

export function relDays(iso: string, lang: Lang, now = Date.now()): string {
  const d = Math.floor((now - Date.parse(iso)) / DAY);
  if (lang === 'ar') return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d === 2 ? 'منذ يومين' : `منذ ${fmt(d)} أيام`;
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}
