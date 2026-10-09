// Manateq Radar — الشات بوت.
// مدخل لغة طبيعية فوق كل ما جُمع: «عايز 3 غرف في التجمع بـ5 مليون تقسيط طويل».
// الجواب يأتي من أرقام اليوم، ومعه مصدر كل رقم وتاريخه. لا جواب من خارج البيانات.
import { DEVELOPERS, MARKET, ZONES } from './data';
import { DAY, fmt, fmtMoney, isLive, relDays, verdict, GRADE_WORD } from './engine';
import { normalize } from './parser';
import type { Lang, RadarEvent } from './types';

export interface Query {
  zoneId?: string;
  rooms?: number;
  budget?: number;
  longPlan?: boolean;
  ready?: boolean;
  changes?: boolean;
  days?: number;
  developer?: string;
}

export function parseQuery(q: string): Query {
  const t = normalize(q).toLowerCase();
  const out: Query = {};
  let bestLen = 0;
  for (const z of ZONES) {
    for (const a of z.aliases) {
      const n = normalize(a).toLowerCase();
      if (t.includes(n) && n.length > bestLen) {
        out.zoneId = z.id;
        bestLen = n.length;
      }
    }
  }
  for (const d of DEVELOPERS) {
    if (d.aliases.some((a) => new RegExp(`(^|[^a-z])${normalize(a).toLowerCase()}($|[^a-z])`).test(t))) out.developer = d.name;
  }
  const rooms = t.match(/(\d)\s*(?:غرف|غرفة|اوض|bed)/);
  if (rooms) out.rooms = +rooms[1];
  const budget = t.match(/(\d+(?:\.\d+)?)\s*(مليون|million|m\b|الف|k\b)/);
  if (budget) out.budget = +budget[1] * (/الف|k/.test(budget[2]) ? 1_000 : 1_000_000);
  else if (/(?:^|\s|ب)مليونين/.test(t)) out.budget = 2_000_000;
  else if (/(?:^|\s|ب)(?:مليون|million)/.test(t)) out.budget = 1_000_000;
  if (/تقسيط طويل|اطول تقسيط|اطول قسط|longest|long plan|long installment/.test(t)) out.longPlan = true;
  if (/فوري|جاهز|ready|immediate/.test(t)) out.ready = true;
  if (/اتغير|تغير|ايه الجديد|الجديد|what changed|changed|new this/.test(t)) out.changes = true;
  if (/الاسبوع|week/.test(t)) out.days = 7;
  else if (/النهارده|اليوم|today/.test(t)) out.days = 1;
  return out;
}

export interface Answer {
  text: string;
  eventIds: string[];
}

export function answer(q: string, events: RadarEvent[], lang: Lang, now = Date.now()): Answer {
  const query = parseQuery(q);
  const ar = lang === 'ar';
  const real = events.filter((e) => e.importance === 'real' && (!query.developer || e.fields.developer === query.developer));
  const zoneName = query.developer
    ? query.developer + (query.zoneId ? ` · ${ZONES.find((z) => z.id === query.zoneId)!.name[lang]}` : '')
    : query.zoneId ? ZONES.find((z) => z.id === query.zoneId)!.name[lang] : ar ? 'كل المناطق' : 'all zones';

  if (query.changes) {
    const days = query.days ?? 7;
    const hits = real
      .filter((e) => (!query.zoneId || e.fields.zoneId === query.zoneId) && now - Date.parse(e.receivedAt) <= days * DAY)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    if (!hits.length) {
      const last = real.filter((e) => !query.zoneId || e.fields.zoneId === query.zoneId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
      return {
        text: ar
          ? `مفيش جديد في ${zoneName} ${days === 1 ? 'النهارده' : 'الأسبوع ده'}${last ? ` — آخر حركة كانت ${relDays(last.receivedAt, 'ar', now)}` : ''}.`
          : `Nothing new in ${zoneName} ${days === 1 ? 'today' : 'this week'}${last ? ` — the last move was ${relDays(last.receivedAt, 'en', now)}` : ''}.`,
        eventIds: last ? [last.id] : [],
      };
    }
    return {
      text: ar ? `${fmt(hits.length)} حدث حقيقي في ${zoneName} ${days === 1 ? 'النهارده' : 'آخر 7 أيام'} (بعد استبعاد التكرار):` : `${hits.length} real events in ${zoneName} ${days === 1 ? 'today' : 'in the last 7 days'} (repeats removed):`,
      eventIds: hits.slice(0, 6).map((e) => e.id),
    };
  }

  let units = real.filter((e) => e.fields.price && e.fields.area && isLive(e, now));
  if (query.zoneId) units = units.filter((e) => e.fields.zoneId === query.zoneId);
  if (query.rooms) units = units.filter((e) => !e.fields.rooms || e.fields.rooms === query.rooms);
  if (query.ready) units = units.filter((e) => e.fields.delivery === 'immediate');
  if (query.budget) {
    // الميزانية تُقارن بالتكلفة الحقيقية لا بالسعر المعلن، بهامش 10٪.
    units = units.filter((e) => {
      const z = ZONES.find((x) => x.id === e.fields.zoneId);
      const v = z && verdict(e, z, MARKET, events, now);
      const total = v ? v.cost.total : e.fields.price!;
      return query.longPlan ? (e.fields.price! * (e.fields.downPct ?? 100)) / 100 <= query.budget! || total <= query.budget! * 1.1 : total <= query.budget! * 1.1;
    });
  }
  if (query.longPlan) units.sort((a, b) => (b.fields.months ?? 0) - (a.fields.months ?? 0));
  else units.sort((a, b) => a.fields.price! - b.fields.price!);

  if (!units.length) {
    return {
      text: ar
        ? `مفيش وحدة متاحة اليوم في ${zoneName} بالشروط دي. ${query.budget ? `جرّب ميزانية أعلى من ${fmtMoney(query.budget, 'ar')} أو منطقة أوسع.` : 'جرّب منطقة أوسع.'}`
        : `No live unit in ${zoneName} matches today. ${query.budget ? `Try above ${fmtMoney(query.budget, 'en')} or a wider area.` : 'Try a wider area.'}`,
      eventIds: [],
    };
  }

  const top = units[0];
  const z = ZONES.find((x) => x.id === top.fields.zoneId);
  const v = z && verdict(top, z, MARKET, events, now);
  const lead = query.longPlan
    ? ar
      ? `أطول تقسيط متاح: ${fmt((top.fields.months ?? 0) / 12, 0)} سنوات عند ${top.fields.developer}.`
      : `Longest plan available: ${fmt((top.fields.months ?? 0) / 12, 0)} years with ${top.fields.developer}.`
    : ar
      ? `${fmt(units.length)} ${units.length === 1 ? 'وحدة' : 'وحدات'} في ${zoneName} تطابق طلبك من أرقام اليوم.`
      : `${units.length} unit${units.length === 1 ? '' : 's'} in ${zoneName} match, from today's numbers.`;
  const verdictLine = v ? (ar ? ` الأقرب: حكم مناطق «${GRADE_WORD[v.grade].ar}».` : ` Closest: Manateq verdict “${GRADE_WORD[v.grade].en}”.`) : '';
  return { text: lead + verdictLine, eventIds: units.slice(0, 4).map((e) => e.id) };
}
