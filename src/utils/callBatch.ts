import { Lead } from '../types';

/**
 * العميل ده جه من أرقام المكالمات اللي الإدارة رفعتها؟ ومن أنهي دفعة؟
 * - الجديد: متسجّل على العميل نفسه (callBatch)
 * - القديم: بيتقرا من أول أكشن «مكالمة: رد ومهتم (الدفعة)»
 */
export function callBatchOf(lead: Lead): string {
  const b = (lead as any).callBatch;
  if (b) return String(b);
  for (const e of ((lead as any).activity || []) as any[]) {
    const m = /مكالمة: رد ومهتم \(([^)]+)\)/.exec(String(e?.outcome || ''));
    if (m) return m[1];
  }
  return (lead as any).source === 'cold_call' ? 'أرقام المكالمات' : '';
}
