/*
  سجل الأحداث: كل حاجة بتحصل في الموقع بتتكتب هنا في مكان واحد.

  ليه مكان واحد؟ عشان أي سؤال جديد يتجاوب من غير ما نضيف تتبع جديد.
  "أنهي وحدة بتتشاف ومحدش بيسأل عليها؟" و"السيلز بيرد في كام دقيقة؟"
  الاتنين بيتجاوبوا من نفس السجل.

  ملاحظة: الكتابة مبتوقفش الشاشة أبداً — لو فشلت، بتتجاهل في صمت.
  التتبع مستحيل يعطّل شغل حد.
*/
import { collection, doc, setDoc, onSnapshot, query, where, orderBy, limit as qLimit, getDocs } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { visitorId } from './visitorService';

export type EventType =
  // الزائر على الموقع
  | 'unit_view'            // فتح صفحة وحدة
  | 'unit_gallery'         // قلّب الصور
  | 'unit_video'           // شغّل الفيديو
  | 'unit_whatsapp'        // ضغط واتساب
  | 'unit_call'            // ضغط اتصال
  | 'unit_favorite'        // حفظها في المفضلة
  | 'viewing_request'      // طلب معاينة
  | 'valuation_request'    // طلب تقييم
  | 'owner_submission'     // مالك عرض شقته
  // العرض المخصوص
  | 'offer_sent' | 'offer_opened' | 'offer_unit_view' | 'offer_whatsapp'
  // رحلة الليد
  | 'lead_created' | 'lead_first_contact' | 'lead_stage' | 'lead_activity' | 'lead_won' | 'lead_lost'
  // الميدان
  | 'trip_sent' | 'field_feedback' | 'field_checkin'
  // المعاينات
  | 'viewing_confirmed' | 'viewing_done';

export interface AppEvent {
  id: string;
  type: EventType;
  at: number;
  day: string;                // yyyy-mm-dd — عشان التجميع اليومي يبقى سريع
  visitor?: string;           // هوية الجهاز (للزوار)
  actorId?: string;           // السيلز/المندوب اللي عمل الحدث
  actorName?: string;
  propertyId?: string;
  code?: string;
  neighborhood?: string;
  leadId?: string;
  offerId?: string;
  source?: string;            // اللينك المتتبّع أو اسم الكامبين
  value?: number;             // رقم حسب الحدث: سعر، ثواني، عدد
  meta?: Record<string, string | number | boolean>;
}

const dayOf = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** بيمنع تكرار نفس الحدث لنفس الحاجة في نفس الجلسة (زي المشاهدة) */
const onceKeys = new Set<string>();

export interface LogOptions {
  /** يتسجّل مرة واحدة بس لنفس المفتاح في الجلسة دي */
  onceKey?: string;
}

export async function logEvent(
  type: EventType,
  data: Omit<Partial<AppEvent>, 'id' | 'type' | 'at' | 'day'> = {},
  opts: LogOptions = {},
): Promise<void> {
  try {
    if (opts.onceKey) {
      if (onceKeys.has(opts.onceKey)) return;
      onceKeys.add(opts.onceKey);
    }
    const at = Date.now();
    const id = `${type}_${at}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'events', id), cleanFirestoreData({
      id, type, at, day: dayOf(at), visitor: visitorId(), ...data,
    }));
  } catch {
    /* التتبع مبيعطّلش الشغل */
  }
}

/* ---------- القراءة ---------- */

/** آخر N يوم من الأحداث — ده اللي كل التقارير بتشتغل عليه */
export function subscribeEvents(days: number, cb: (l: AppEvent[]) => void) {
  const since = Date.now() - days * 86400000;
  return onSnapshot(
    query(collection(db, 'events'), where('at', '>=', since), orderBy('at', 'desc'), qLimit(5000)),
    (snap) => {
      const l: AppEvent[] = [];
      snap.forEach((d) => l.push(d.data() as AppEvent));
      cb(l);
    },
    () => cb([]),
  );
}

export async function fetchEvents(days: number): Promise<AppEvent[]> {
  try {
    const since = Date.now() - days * 86400000;
    const snap = await getDocs(query(collection(db, 'events'), where('at', '>=', since), orderBy('at', 'desc'), qLimit(5000)));
    const l: AppEvent[] = [];
    snap.forEach((d) => l.push(d.data() as AppEvent));
    return l;
  } catch {
    return [];
  }
}

/* ---------- حسابات جاهزة ---------- */

export const byType = (events: AppEvent[], ...types: EventType[]) =>
  events.filter((e) => types.includes(e.type));

export const countBy = <T extends string>(events: AppEvent[], key: (e: AppEvent) => T | undefined): Record<string, number> => {
  const m: Record<string, number> = {};
  events.forEach((e) => { const k = key(e); if (k) m[k] = (m[k] || 0) + 1; });
  return m;
};

/** عدد الأجهزة المختلفة مش عدد الفتحات */
export const uniqueVisitors = (events: AppEvent[]) => new Set(events.map((e) => e.visitor).filter(Boolean)).size;

/**
 * اهتمام الوحدة: بتتشاف قد إيه، وكام واحد سأل عليها فعلاً.
 * الوحدة اللي نسبة سؤالها صفر مع مشاهدات عالية = سعرها غلط.
 */
export interface UnitInterest {
  propertyId: string;
  code: string;
  neighborhood?: string;
  views: number;
  visitors: number;
  asks: number;              // واتساب + اتصال + طلب معاينة
  videoPlays: number;
  askRate: number;           // نسبة اللي سألوا من اللي شافوا
  lastAt?: number;
}

export function unitInterest(events: AppEvent[]): UnitInterest[] {
  const map = new Map<string, UnitInterest & { _visitors: Set<string> }>();

  events.forEach((e) => {
    if (!e.propertyId) return;
    if (!['unit_view', 'unit_whatsapp', 'unit_call', 'unit_video', 'viewing_request'].includes(e.type)) return;

    let u = map.get(e.propertyId);
    if (!u) {
      u = {
        propertyId: e.propertyId, code: e.code || '', neighborhood: e.neighborhood,
        views: 0, visitors: 0, asks: 0, videoPlays: 0, askRate: 0, lastAt: e.at,
        _visitors: new Set<string>(),
      };
      map.set(e.propertyId, u);
    }
    if (e.code && !u.code) u.code = e.code;
    if (e.neighborhood && !u.neighborhood) u.neighborhood = e.neighborhood;
    if (e.at > (u.lastAt || 0)) u.lastAt = e.at;
    if (e.visitor) u._visitors.add(e.visitor);

    if (e.type === 'unit_view') u.views += 1;
    else if (e.type === 'unit_video') u.videoPlays += 1;
    else u.asks += 1;
  });

  return [...map.values()].map(({ _visitors, ...u }) => ({
    ...u,
    visitors: _visitors.size,
    askRate: u.views ? Math.round((u.asks / u.views) * 100) : 0,
  }));
}

/**
 * سرعة أول اتصال لكل سيلز — أهم رقم في المبيعات.
 * بنقيس من وصول الليد لحد أول تواصل فعلي.
 */
export interface ResponseStat {
  actorId: string;
  actorName: string;
  leads: number;
  contacted: number;
  medianMinutes: number | null;
  within15: number;          // كام ليد اترد عليه خلال ربع ساعة
}

export function responseSpeed(events: AppEvent[]): ResponseStat[] {
  const created = new Map<string, AppEvent>();
  byType(events, 'lead_created').forEach((e) => { if (e.leadId) created.set(e.leadId, e); });

  const firstContact = new Map<string, AppEvent>();
  byType(events, 'lead_first_contact').forEach((e) => {
    if (!e.leadId) return;
    const prev = firstContact.get(e.leadId);
    if (!prev || e.at < prev.at) firstContact.set(e.leadId, e);
  });

  const perAgent = new Map<string, { name: string; leads: number; gaps: number[]; within15: number }>();

  created.forEach((c, leadId) => {
    const agentId = c.actorId || firstContact.get(leadId)?.actorId || 'unassigned';
    const name = c.actorName || firstContact.get(leadId)?.actorName || 'غير محدد';
    let a = perAgent.get(agentId);
    if (!a) { a = { name, leads: 0, gaps: [], within15: 0 }; perAgent.set(agentId, a); }
    a.leads += 1;

    const fc = firstContact.get(leadId);
    if (fc && fc.at >= c.at) {
      const mins = Math.round((fc.at - c.at) / 60000);
      a.gaps.push(mins);
      if (mins <= 15) a.within15 += 1;
    }
  });

  return [...perAgent.entries()].map(([actorId, a]) => ({
    actorId,
    actorName: a.name,
    leads: a.leads,
    contacted: a.gaps.length,
    medianMinutes: median(a.gaps),
    within15: a.within15,
  })).sort((x, y) => (x.medianMinutes ?? 1e9) - (y.medianMinutes ?? 1e9));
}

/** الوسيط أصدق من المتوسط هنا: ليد واحد اتنسي أسبوع مش المفروض يبوّظ رقم الشهر */
export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** المصدر: مش كام ليد جاب — كام صفقة قفل */
export interface SourceStat {
  source: string;
  leads: number;
  contacted: number;
  offers: number;
  viewings: number;
  won: number;
  lost: number;
  winRate: number;
}

export function sourcePerformance(events: AppEvent[]): SourceStat[] {
  const leadSource = new Map<string, string>();
  byType(events, 'lead_created').forEach((e) => {
    if (e.leadId) leadSource.set(e.leadId, e.source || 'مباشر');
  });

  const m = new Map<string, SourceStat>();
  const bump = (src: string, k: keyof SourceStat) => {
    let s = m.get(src);
    if (!s) { s = { source: src, leads: 0, contacted: 0, offers: 0, viewings: 0, won: 0, lost: 0, winRate: 0 }; m.set(src, s); }
    (s[k] as number) += 1;
  };

  leadSource.forEach((src) => bump(src, 'leads'));
  const seenContact = new Set<string>();
  events.forEach((e) => {
    if (!e.leadId) return;
    const src = leadSource.get(e.leadId);
    if (!src) return;
    if (e.type === 'lead_first_contact' && !seenContact.has(e.leadId)) { seenContact.add(e.leadId); bump(src, 'contacted'); }
    else if (e.type === 'offer_sent') bump(src, 'offers');
    else if (e.type === 'viewing_confirmed') bump(src, 'viewings');
    else if (e.type === 'lead_won') bump(src, 'won');
    else if (e.type === 'lead_lost') bump(src, 'lost');
  });

  return [...m.values()]
    .map((s) => ({ ...s, winRate: s.leads ? Math.round((s.won / s.leads) * 1000) / 10 : 0 }))
    .sort((a, b) => b.won - a.won || b.leads - a.leads);
}

/** عدد الأحداث في كل يوم — للرسم البياني */
export function dailySeries(events: AppEvent[], types: EventType[], days: number): { day: string; n: number }[] {
  const out: { day: string; n: number }[] = [];
  const counts = countBy(byType(events, ...types), (e) => e.day);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = dayOf(Date.now() - i * 86400000);
    out.push({ day: d, n: counts[d] || 0 });
  }
  return out;
}
