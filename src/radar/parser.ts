// Manateq Radar — قراءة الرسالة.
// المرحلة الأولى: استخراج بالقواعد (الأغلبية تُقرأ لأن الأنماط متشابهة)، ثم التصنيف على أربعة محاور.
// عربي ومصري وإنجليزي في نفس الرسالة، وأرقام هندية أو لاتينية، بفواصل أو بدونها.
import { DEVELOPERS, PROJECTS, ZONES } from './data';
import { DAY, unitKey } from './engine';
import type { Audience, EventType, Extracted, PayFrequency, RadarEvent, Source } from './types';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** يوحّد الأرقام والفواصل والمسافات قبل أي قاعدة. */
export function normalize(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/(\d)[,٬’'](?=\d{3}\b)/g, '$1')
    .replace(/(\d)[,٬’'](?=\d{3}\b)/g, '$1')
    .replace(/٪/g, '%')
    .replace(/[ً-ْـ]/g, '') // تشكيل وتطويل
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى(?=\s|$)/g, 'ي')
    .replace(/[ \t ]+/g, ' ');
}

const NUM = '(\\d+(?:\\.\\d+)?)';

function num(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

/** «3.08 مليون» · «850 ألف» · «3082500» → رقم بالجنيه. */
function money(value: string, unit?: string): number | undefined {
  const n = num(value);
  if (n === undefined) return undefined;
  const u = (unit ?? '').toLowerCase();
  if (/مليون|million|\bm\b|mn/.test(u)) return Math.round(n * 1_000_000);
  if (/الف|ألف|k\b|thousand/.test(u)) return Math.round(n * 1_000);
  return n;
}

const MONEY_UNIT = '(مليون|million|mn|m\\b|الف|ألف|k\\b)?';

function first(re: RegExp, t: string): RegExpMatchArray | null {
  return t.match(re);
}

function findAlias<T extends { aliases: string[] }>(items: T[], t: string): T | undefined {
  const low = t.toLowerCase();
  let best: { item: T; at: number; len: number } | undefined;
  for (const item of items) {
    for (const a of item.aliases) {
      const needle = normalize(a).toLowerCase();
      const at = /^[a-z0-9 ]+$/.test(needle) ? low.search(new RegExp(`\\b${needle.replace(/ /g, '\\s*')}\\b`)) : low.indexOf(needle);
      if (at >= 0 && (!best || needle.length > best.len)) best = { item, at, len: needle.length };
    }
  }
  return best?.item;
}

const ORDINALS: Record<string, number> = {
  الاول: 1, الثاني: 2, الثالث: 3, الرابع: 4, الخامس: 5, السادس: 6, السابع: 7, الثامن: 8, التاسع: 9, العاشر: 10,
};

const UNIT_TYPES: [RegExp, string][] = [
  [/دوبلكس|duplex/i, 'دوبلكس'],
  [/بنتهاوس|بنت هاوس|penthouse/i, 'بنتهاوس'],
  [/تاون ?هاوس|town ?house/i, 'تاون هاوس'],
  [/توين ?هاوس|twin ?house/i, 'توين هاوس'],
  [/فيلا|villa/i, 'فيلا'],
  [/ستوديو|studio/i, 'ستوديو'],
  [/شاليه|chalet/i, 'شاليه'],
  [/شقة|شقه|apartment|\bapt\b|flat/i, 'شقة'],
];

/** يستخرج الحقول العشرة. ما لا يُذكر يبقى غائباً — لا تخمين. */
export function extract(raw: string): Extracted {
  const t = normalize(raw);
  const f: Extracted = {};

  // المطوّر والمشروع والمنطقة
  const project = findAlias(PROJECTS, t);
  const dev = findAlias(DEVELOPERS, t);
  const zone = findAlias(ZONES, t);
  if (project) {
    f.project = project.name;
    f.developer = project.developer;
    f.zoneId = project.zoneId;
  }
  if (dev) f.developer = dev.name;
  if (zone) f.zoneId = zone.id;
  if (!f.project) {
    const m = first(/(?:مشروع|كمبوند|كومباوند|compound|project)\s+([A-Za-z][\w'é ]{1,30}?)(?=\s*[—\-–,،\n]|$)/i, t);
    if (m) f.project = m[1].trim();
  }
  const district = first(/الحي\s+(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d{1,2})/, t);
  if (district) {
    const n = ORDINALS[district[1]] ?? num(district[1]);
    const names = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
    f.district = n && names[n] ? `الحي ${names[n]}` : `الحي ${district[1]}`;
  }

  for (const [re, name] of UNIT_TYPES) {
    if (re.test(t)) {
      f.unitType = name;
      break;
    }
  }

  const rooms = first(new RegExp(`${NUM}\\s*(?:غرف|غرفة|غرفه|اوض|bedrooms?|beds?|br\\b)`, 'i'), t);
  if (rooms) f.rooms = num(rooms[1]);

  // الحديقة قبل المساحة حتى لا يُقرأ رقمها كمساحة الوحدة
  const garden = first(new RegExp(`(?:حديقة|حديقه|جاردن|garden)\\s*(?:بمساحة)?\\s*${NUM}`, 'i'), t);
  if (garden) f.garden = num(garden[1]);
  const areaRe = new RegExp(`${NUM}\\s*(?:م²|م2|مترا?|م(?![\\u0600-\\u06FF])|m²|m2|sqm|sq\\.?\\s?m|square meters?)`, 'gi');
  for (const m of t.matchAll(areaRe)) {
    const before = t.slice(Math.max(0, (m.index ?? 0) - 14), m.index);
    if (/حديقة|حديقه|جاردن|garden/i.test(before)) continue;
    const n = num(m[1]);
    if (n && n >= 20 && n <= 2000) {
      f.area = n;
      break;
    }
  }

  // السعر: بعد كلمة دالة، أو رقم بعملة، أو رقم مليوني منفرد
  const priceRe = [
    new RegExp(`(?:السعر بعد الخصم|السعر الجديد|السعر الاجمالي|اجمالي السعر|السعر|بسعر|total price|price|for)\\s*:?\\s*(?:egp|le|ج\\.?م)?\\s*${NUM}\\s*${MONEY_UNIT}`, 'i'),
    new RegExp(`${NUM}\\s*${MONEY_UNIT}\\s*(?:ج\\.م|جنيه|جم|egp|le\\b)`, 'i'),
    new RegExp(`(?:egp|le)\\s*${NUM}\\s*${MONEY_UNIT}`, 'i'),
  ];
  for (const re of priceRe) {
    const m = first(re, t);
    if (m) {
      const v = money(m[1], m[2]);
      if (v && v >= 100_000) {
        f.price = v;
        break;
      }
    }
  }
  if (!f.price) {
    const big = [...t.matchAll(/\b(\d{6,9})\b/g)].map((m) => +m[1]).filter((n) => n >= 500_000);
    if (big.length) f.price = Math.max(...big);
  }

  const down =
    first(new RegExp(`(?:مقدم|المقدم|مقدّم|down ?payment|\\bdp\\b|down)\\s*:?\\s*${NUM}\\s*%`, 'i'), t) ??
    first(new RegExp(`${NUM}\\s*%\\s*(?:مقدم|المقدم|down ?payment|down|dp\\b)`, 'i'), t);
  if (down) f.downPct = num(down[1]);

  const freq: [RegExp, PayFrequency][] = [
    [/ربع سنوي|ربع سنوية|كل 3 شهور|quarterly/i, 'quarterly'],
    [/نصف سنوي|semi-?annual/i, 'quarterly'],
    [/قسط سنوي|سنويا|annual(?:ly)?|yearly/i, 'annual'],
    [/شهري|شهريا|monthly/i, 'monthly'],
  ];
  for (const [re, v] of freq) {
    if (re.test(t)) {
      f.frequency = v;
      break;
    }
  }

  const inst = first(new RegExp(`(?:قسط|القسط|installment)\\s*(?:شهري|ربع سنوي|سنوي|monthly|quarterly)?\\s*:?\\s*${NUM}\\s*${MONEY_UNIT}`, 'i'), t);
  if (inst) {
    const v = money(inst[1], inst[2]);
    if (v && v >= 1000) f.installment = v;
  }

  const months = first(new RegExp(`${NUM}\\s*(?:شهر|شهرا|شهور|months?)`, 'i'), t);
  const years = first(new RegExp(`(?:تقسيط|علي|على|اقساط|over|installments?)\\D{0,12}?${NUM}\\s*(?:سنين|سنوات|سنة|سنه|years?)|${NUM}\\s*(?:years?)\\s*installments?`, 'i'), t);
  if (months && (num(months[1]) ?? 0) >= 6) f.months = num(months[1]);
  else if (years) f.months = Math.round((num(years[1] ?? years[2]) ?? 0) * 12);

  const maint = first(new RegExp(`(?:وديعة صيانة|وديعه صيانه|الصيانة|الصيانه|صيانة|صيانه|maintenance)\\s*:?\\s*${NUM}\\s*%`, 'i'), t);
  if (maint) f.maintenancePct = num(maint[1]);

  const garage = first(new RegExp(`(?:جراج|الجراج|garage|parking)\\s*:?\\s*${NUM}\\s*${MONEY_UNIT}`, 'i'), t);
  if (garage) f.garage = money(garage[1], garage[2]);
  const club = first(new RegExp(`(?:نادي|النادي|club)\\s*:?\\s*${NUM}\\s*${MONEY_UNIT}`, 'i'), t);
  if (club) f.club = money(club[1], club[2]);

  if (/استلام فوري|فوري|جاهز(?:ة)? للسكن|ready to move|\brtm\b|immediate delivery/i.test(t)) f.delivery = 'immediate';
  else {
    const y = first(/(?:استلام|تسليم|التسليم|delivery|handover)\D{0,10}(20\d\d)/i, t);
    if (y) f.delivery = y[1];
  }

  const cash = first(new RegExp(`(?:خصم (?:كاش|نقدي)|خصم|cash discount|discount)\\s*:?\\s*${NUM}\\s*%`, 'i'), t);
  if (cash) f.cashDiscountPct = num(cash[1]);

  const comm = first(new RegExp(`(?:عمولة|عموله|العمولة|commission)\\s*:?\\s*${NUM}\\s*%`, 'i'), t);
  if (comm) f.commissionPct = num(comm[1]);
  const inc = first(/(?:حافز|incentive|bonus)\s*:?\s*([^\n]{2,40})/i, t);
  if (inc) f.incentive = inc[1].trim();

  return f;
}

// ───────────────────────── التصنيف ─────────────────────────

const TYPE_RULES: [RegExp, EventType][] = [
  [/اطلاق|لونش|launch|new launch/i, 'launch'],
  [/لفترة محدودة|لفتره محدوده|العرض حتي|العرض حتى|limited time|ينتهي|offer ends|until/i, 'limited_offer'],
  [/خصم|discount/i, 'discount'],
  [/وحدات محدودة|وحدات محدوده|اخر وحدات|آخر وحدات|last units|limited units/i, 'limited_units'],
  [/تحديث اسعار|تحديث الاسعار|السعر الجديد|زيادة الاسعار|زيادة اسعار|price (?:update|increase)|new prices/i, 'price_update'],
  [/انشاءات|الانشاءات|الخرسانة|construction|progress|تم الانتهاء/i, 'construction_update'],
  [/توقيع|شراكة|احتفال|جائزة|partnership|award|ceremony/i, 'corporate'],
  [/متاح|متاحة|available|resale|ريسيل/i, 'unit_available'],
];

export function classifyType(raw: string, f: Extracted): EventType {
  const t = normalize(raw);
  for (const [re, type] of TYPE_RULES) if (re.test(t)) return type;
  return f.price ? 'unit_available' : 'corporate';
}

export function audiences(f: Extracted, type: EventType): Audience[] {
  const a = new Set<Audience>();
  if (f.price && f.area) a.add('investor');
  if (type === 'launch' || type === 'price_update' || type === 'discount') a.add('investor');
  if (f.commissionPct || f.incentive || type === 'unit_available' || type === 'limited_units' || type === 'launch') a.add('broker');
  if (f.area && (f.price || f.installment || f.months)) a.add('client');
  if (!a.size) a.add('investor');
  return (['investor', 'broker', 'client'] as Audience[]).filter((x) => a.has(x));
}

/** مدة الصلاحية: العرض المؤقت يموت ويؤرشف تلقائياً؛ الإطلاق يبقى. */
export function expiry(raw: string, type: EventType, receivedAt: string): string | null {
  const t = normalize(raw);
  const base = Date.parse(receivedAt);
  const date = t.match(/(?:حتي|حتى|لغاية|until|ends?)\s*(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/i);
  if (date) {
    const d = new Date(base);
    const y = date[3] ? (date[3].length === 2 ? 2000 + +date[3] : +date[3]) : d.getUTCFullYear();
    return new Date(Date.UTC(y, +date[2] - 1, +date[1], 23, 59)).toISOString();
  }
  if (/نهاية الاسبوع|اخر الاسبوع|end of (?:the )?week/i.test(t)) {
    const d = new Date(base);
    const toFri = (5 - d.getUTCDay() + 7) % 7 || 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + toFri, 23, 59)).toISOString();
  }
  if (type === 'limited_offer' || type === 'discount') return new Date(base + 7 * DAY).toISOString();
  if (type === 'unit_available' || type === 'limited_units') return new Date(base + 30 * DAY).toISOString();
  return null;
}

export function fingerprint(f: Extracted, type: EventType): string {
  return [unitKey(f), f.price ?? '', type === 'repeat' ? '' : type].join('#');
}

/** فلتر «الحدث لا الإعادة»: نفس الوحدة بنفس السعر خلال 14 يوماً = تكرار. */
export function isRepeat(f: Extracted, receivedAt: string, history: RadarEvent[]): boolean {
  const key = unitKey(f);
  const t = Date.parse(receivedAt);
  return history.some(
    (e) =>
      e.importance === 'real' &&
      unitKey(e.fields) === key &&
      (e.fields.price ?? null) === (f.price ?? null) &&
      Math.abs(t - Date.parse(e.receivedAt)) < 14 * DAY &&
      Date.parse(e.receivedAt) <= t,
  );
}

let seq = 0;
export function newId(): string {
  seq = (seq + 1) % 1e6;
  return `ev_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** رسالة خام ← حدث مصنّف كامل. */
export function ingest(raw: string, opts: { sender: string; receivedAt?: string; history?: RadarEvent[]; seed?: boolean }): RadarEvent {
  const receivedAt = opts.receivedAt ?? new Date().toISOString();
  const fields = extract(raw);
  const [name, org] = opts.sender.split('·').map((s) => s.trim());
  fields.sender = name;
  if (!fields.developer && org) {
    const d = findAlias(DEVELOPERS, normalize(org));
    if (d) fields.developer = d.name;
  }
  if (!fields.zoneId && fields.project) {
    const p = PROJECTS.find((x) => x.name === fields.project);
    if (p) fields.zoneId = p.zoneId;
  }
  let type = classifyType(raw, fields);
  const repeat = isRepeat(fields, receivedAt, opts.history ?? []);
  if (repeat) type = 'repeat';
  const source: Source = { kind: opts.seed ? 'seed' : 'relayed', name: name || 'Unknown', org: org || fields.developer, date: receivedAt };
  return {
    id: newId(),
    receivedAt,
    raw,
    fields,
    type,
    importance: repeat ? 'repeat' : 'real',
    audiences: audiences(fields, type),
    expiresAt: expiry(raw, type, receivedAt),
    source,
    fingerprint: fingerprint(fields, type),
  };
}

/** عدد الحقول العشرة الأساسية التي قُرئت — مقياس جودة القراءة. */
export const CORE_FIELDS: (keyof Extracted)[] = ['project', 'developer', 'zoneId', 'unitType', 'area', 'price', 'downPct', 'months', 'maintenancePct', 'delivery'];

export function coverage(f: Extracted): number {
  return CORE_FIELDS.filter((k) => f[k] !== undefined).length;
}
