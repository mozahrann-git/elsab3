import { Lead } from '../types';
import { endOfCairoDay } from './followUpAlerts';
import { now as serverNow } from '../services/serverClock';

/*
  حرارة العميل 🔥 / 🌤 / ❄️ — بتتحسب لوحدها من اللي حصل مع العميل،
  ومحدش بيختارها. بتتحدّث مع كل أكشن.

  🔥 سخن : معاينة (تحت الطلب / مؤكدة / تمت) أو تفاوض، أو جديد أول ٣ أيام،
           أو رد في آخر ٧ أيام.  ← الوحيد اللي بيحمر لو اتأخر.
  🌤 دافي : عنده طلب أو اتبعتله شقق ولسه مفيش معاينة.
           ← لو فات ميعاده بيبان «فاتك»، ويحمر بس بعد ٣ أيام.
  ❄️ بارد : مردش ٣ مرات ورا بعض، أو «رد مش مهتم»، أو مفيش رد من ٣٠ يوم،
           أو «غير مهتم / مؤجل».  ← عمره ما يحمر، وبيرجع في لستة النهارده كل ١٥ يوم.

  الإدارة تقدر توافق على تعديل الحرارة (طلب من السيلز بسبب)، والتعديل
  بيفضل ماشي لحد ما يحصل حاجة جديدة مع العميل.
*/

export type Heat = 'hot' | 'warm' | 'cold';
export const HEAT_LABEL: Record<Heat, string> = { hot: '🔥 سخن', warm: '🌤 دافي', cold: '❄️ بارد' };
export const HEAT_COLOR: Record<Heat, string> = { hot: '#D3262B', warm: '#C98A1B', cold: '#3E6E9E' };

const H = 3600000, D = 24 * H;
export const HOT_STAGES = ['visit_requested', 'visit_booked', 'visit_done', 'negotiation'];
export const COLD_RETURN_DAYS = 15;
export const WARM_GRACE_DAYS = 3;
export const NEW_GRACE_H = 24;

type Act = { at: number; by?: string; outcome?: string; comment?: string; call?: string; kind?: string };
const acts = (l: Lead): Act[] => (((l as any).activity || []) as Act[]).filter((e) => e && typeof e.at === 'number');
const isAdminEntry = (e: Act) => /^(الإدارة|الادارة|admin|الأدمن)$/i.test(String(e.by || '').trim()) || /الإدارة رحّلت/.test(String(e.outcome || ''));
const isNoAnswer = (e: Act) => e.call === 'no_answer' || /مردش|لم يتم الرد|مابيردش|مبيردش/.test(`${e.outcome || ''} ${e.comment || ''}`);
const isNotInterested = (e: Act) => e.call === 'answered' || /رد مش مهتم|رد ومش مهتم/.test(String(e.outcome || ''));
const createdMs = (l: Lead) => { const t = Date.parse(String(l.createdAt || '')); return isNaN(t) ? 0 : t; };

/** كام «مردش» ورا بعض من آخر حاجة (الملاحظات وأكشن الإدارة مابيتحسبوش) */
export function noAnswerStreak(l: Lead): number {
  let c = 0;
  for (const e of acts(l)) {
    if (e.kind === 'note' || isAdminEntry(e)) continue;
    if (!isNoAnswer(e)) break;
    c++;
  }
  return c;
}

/** آخر مرة العميل اتكلم فعلاً (أي أكشن حقيقي غير «مردش») */
export function lastResponseAt(l: Lead): number {
  for (const e of acts(l)) {
    if (e.kind === 'note' || isAdminEntry(e) || isNoAnswer(e)) continue;
    return e.at;
  }
  return 0;
}
/** آخر حاجة اتعملت مع العميل (أي أكشن غير الملاحظات) */
export function lastTouchAt(l: Lead): number {
  for (const e of acts(l)) { if (e.kind !== 'note' && !isAdminEntry(e)) return e.at; }
  return 0;
}

export interface HeatInfo { heat: Heat; auto: Heat; reason: string; overridden: boolean }

/** الحرارة الأوتوماتيك + السبب */
export function autoHeat(l: Lead, now = serverNow()): { heat: Heat; reason: string } {
  if (l.status === 'lost') return { heat: 'cold', reason: 'غير مهتم / مؤجل' };
  const streak = noAnswerStreak(l);
  if (streak >= 3) return { heat: 'cold', reason: `مردش ${streak} مرات ورا بعض` };
  const last = acts(l).find((e) => e.kind !== 'note' && !isAdminEntry(e));
  if (last && isNotInterested(last)) return { heat: 'cold', reason: 'رد مش مهتم' };
  if (HOT_STAGES.includes(l.status)) return { heat: 'hot', reason: 'في مرحلة المعاينة / التفاوض' };
  const created = createdMs(l);
  if (l.status === 'new' && created && now - created < 3 * D) return { heat: 'hot', reason: 'عميل جديد (أول ٣ أيام)' };
  const resp = lastResponseAt(l);
  if (resp && now - resp < 7 * D) return { heat: 'hot', reason: 'رد في آخر ٧ أيام' };
  const ref = resp || created;
  if (ref && now - ref > 30 * D) return { heat: 'cold', reason: 'مفيش رد من أكتر من ٣٠ يوم' };
  return { heat: 'warm', reason: l.status === 'new' ? 'جديد عدّى عليه ٣ أيام' : 'عنده طلب / اتبعتله شقق ولسه مفيش معاينة' };
}

/** الحرارة الفعلية: تعديل الإدارة لو لسه ماحصلش جديد بعده، وإلا الأوتوماتيك */
export function heatOf(l: Lead, now = serverNow()): HeatInfo {
  const a = autoHeat(l, now);
  const ov = (l as any).heatOverride as { heat: Heat; at: number } | undefined;
  if (ov && ov.heat && l.status !== 'lost') {
    const touched = lastTouchAt(l);
    if (!touched || touched <= ov.at) return { heat: ov.heat, auto: a.heat, reason: 'الإدارة وافقت على التعديل', overridden: true };
  }
  return { heat: a.heat, auto: a.heat, reason: a.reason, overridden: false };
}

/** ميعاد العميل الفعلي — البارد بيرجع كل ١٥ يوم حتى لو مالوش ميعاد */
export function dueAt(l: Lead, heat: Heat): number {
  const next = l.nextActionAt || 0;
  if (heat !== 'cold') return next;
  const back = (lastTouchAt(l) || createdMs(l) || 0) + COLD_RETURN_DAYS * D;
  return Math.max(next, back);
}

export type LateLevel = 'late' | 'missed' | 'none';
/**
 * التأخير الحقيقي:
 *  - 🔥 سخن فات ميعاده ← متأخر (أحمر)
 *  - 🌤 دافي فات ميعاده ← «فاتك» (هادي) ولو عدّى ٣ أيام ← متأخر
 *  - ❄️ بارد ← عمره ما يتأخر
 *  - عميل اتضاف من أقل من ٢٤ ساعة ← مش متأخر (عشان السيلز مايخافش يضيف)
 */
export function lateLevel(l: Lead, now = serverNow(), info = heatOf(l, now)): LateLevel {
  if (l.followUpStatus === 'completed' || l.status === 'closed' || l.status === 'lost') return 'none';
  const at = l.nextActionAt || 0;
  if (!at || at > now) return 'none';
  if (info.heat === 'cold') return 'none';
  const created = createdMs(l);
  if (created && now - created < NEW_GRACE_H * H && !lastTouchAt(l)) return 'missed';
  if (info.heat === 'hot') return 'late';
  return now - at > WARM_GRACE_DAYS * D ? 'late' : 'missed';
}

/** في لستة «شغلك النهارده»؟ */
export function dueToday(l: Lead, now = serverNow(), info = heatOf(l, now)): boolean {
  if (l.followUpStatus === 'completed' || l.status === 'closed') return false;
  if (l.status === 'lost' && !(l as any).heatOverride) {
    // البارد «غير مهتم» بيرجع كل ١٥ يوم
    return dueAt(l, 'cold') <= endOfCairoDay(now);
  }
  const at = dueAt(l, info.heat);
  return !!at && at <= endOfCairoDay(now);
}

/** ترتيب لستة النهارده: جديد النهارده ← سخن ← دافي ← بارد، والأقدم ميعاداً الأول */
export function todayRank(l: Lead, now = serverNow(), info = heatOf(l, now)): number {
  const created = createdMs(l);
  if (created && created >= endOfCairoDay(now) - D && !lastTouchAt(l)) return 0;
  return info.heat === 'hot' ? 1 : info.heat === 'warm' ? 2 : 3;
}
export const TODAY_LIMIT = 20;
export const RANK_TITLE = ['🆕 جديد النهارده', '🔥 سخن', '🌤 دافي', '❄️ جرّب تاني'];
