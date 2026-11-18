import { Lead } from '../types';

/*
  «مابيردش»: دوسة بتسجّل إن العميل مردش.
  - يا إما المتابعة الجاية بعد ٤٨ ساعة لوحدها
  - يا إما السيلز يحدد الميعاد بنفسه
  وتالت مرة ورا بعض ← المتابعة بعد أسبوع (ومفيش تنبيه قبلها)،
  وبيظهر للإدارة في «حل المتأخر ← مابيردش ٣ مرات».
*/
export const NA_LIMIT = 3;
const H = 3600000;
export const NA_HOURS = 48;
export const NA_WEEK_DAYS = 7;

const isNA = (e: any) => e?.call === 'no_answer' || /مردش|مابيردش|مبيردش|لم يتم الرد/.test(String(e?.outcome || ''));
const isAdminEntry = (e: any) => /^(الإدارة|الادارة|admin|الأدمن)$/i.test(String(e?.by || '').trim());

/** كام «مابيردش» ورا بعض من آخر حاجة (الملاحظات وأكشن الإدارة مابيتحسبوش) */
export function naStreak(l: Lead): number {
  let c = 0;
  for (const e of (((l as any).activity || []) as any[])) {
    if (e?.kind === 'note' || e?.snooze || isAdminEntry(e)) continue;
    if (!isNA(e)) break;
    c++;
  }
  return c;
}

/** الميعاد الجاي لو سجّلنا «مابيردش» دلوقتي */
export function naNextAt(l: Lead, chosen?: number): { at: number; week: boolean; n: number } {
  const n = naStreak(l) + 1;
  if (n >= NA_LIMIT) return { at: Date.now() + NA_WEEK_DAYS * 24 * H, week: true, n };
  return { at: chosen || Date.now() + NA_HOURS * H, week: false, n };
}

/** العميل بعد تسجيل «مابيردش» */
export function markNoAnswer(l: Lead, by: string, chosen?: { at: number; label: string }, comment = ''): Lead {
  const { at, week, n } = naNextAt(l, chosen?.at);
  const label = week ? 'بعد أسبوع' : chosen?.label || 'بعد ٤٨ ساعة';
  const entry = {
    at: Date.now(), by, call: 'no_answer', nextAt: at,
    outcome: `📵 مابيردش (مرة ${n})${week ? ' · يرجع بعد أسبوع' : ''}`,
    comment: comment.trim() || `المتابعة ${label}`,
  };
  return {
    ...l,
    activity: [entry, ...(((l as any).activity || []) as any[])].slice(0, 80),
    notes: [`${entry.outcome} · ${entry.comment}`, ...(l.notes || [])],
    lastContactDate: new Date().toISOString(),
    nextActionAt: at,
    followUpScheduledAt: label,
    followUpNote: entry.outcome,
    followUpStatus: 'pending',
    isFresh: false,
  } as Lead;
}
