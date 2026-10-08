/*
  تصعيد معاينة وحدة البروكر.

  القاعدة اللي اتفقنا عليها:
  - المعاينة على وحدة بروكر بتروح للبروكر هو، مش للمالك.
  - سارة مبتشوفش رقم المالك. اللي قدامها هو رقم البروكر.
  - كل ربع ساعة من غير تأكيد = تنبيه للبروكر (جوّه بوابته وعلى الواتساب).
  - بعد ٣ تنبيهات (٤٥ دقيقة) من غير رد: رقم المالك يتكشف لسارة، وتتسجّل
    "فاتت على البروكر" في صفحته.

  الملف ده حساب صافي من غير أي قراءة أو كتابة — عشان يتجرّب لوحده.
*/
import { UnitViewing } from './portalService';

export const SLOT_MS = 15 * 60 * 1000;   // ربع ساعة
export const MAX_SLOTS = 3;              // ٣ تنبيهات
export const REVEAL_MS = SLOT_MS * MAX_SLOTS;  // ٤٥ دقيقة

export interface BrokerEscalation {
  /** وحدة بروكر ولسه المعاينة متأكدتش */
  active: boolean;
  /** عدّى قد إيه من أول ما سارة بعتت الطلب */
  elapsedMs: number;
  /** كام تنبيه اتبعت للبروكر فعلاً */
  notified: number;
  /** حان وقت تنبيه جديد */
  dueNow: boolean;
  /** باقي قد إيه على التنبيه الجاي (٠ لو حان دلوقتي أو خلصنا) */
  nextDueInMs: number;
  /** رقم المالك المفروض يبقى مكشوف لسارة */
  shouldReveal: boolean;
  /** رقم المالك اتكشف فعلاً */
  revealed: boolean;
}

const ms = (x: any): number => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0);

export function brokerEscalation(v: UnitViewing, now: number): BrokerEscalation {
  const confirmed = v.brokerStatus === 'confirmed' || v.ownerStatus === 'confirmed';
  const closed = v.ownerStatus === 'done' || v.ownerStatus === 'canceled';
  const active = !!v.brokerId && !confirmed && !closed;
  const base = ms(v.createdAt) || now;
  const elapsedMs = Math.max(0, now - base);

  /* التنبيه الأول بيتبعت وقت ما سارة بتعمل المعاينة، فالعدّاد بيبدأ من ١.
     الحقل ممكن يكون فاضي في معاينات قديمة اتعملت قبل التعديل ده. */
  const notified = Math.max(1, ms((v as any).brokerNotifyCount) || 1);
  const revealed = !!ms((v as any).ownerRevealedAt);

  if (!active) {
    return { active: false, elapsedMs, notified, dueNow: false, nextDueInMs: 0, shouldReveal: false, revealed };
  }

  /* كام تنبيه المفروض يكون اتبعت لحد دلوقتي: واحد عند الصفر،
     وواحد كل ربع ساعة بعد كده، وبنقف عند ٣. */
  const earned = Math.min(MAX_SLOTS, 1 + Math.floor(elapsedMs / SLOT_MS));
  const dueNow = notified < earned;

  const nextDueInMs = notified >= MAX_SLOTS
    ? 0
    : dueNow
      ? 0
      : Math.max(0, notified * SLOT_MS - elapsedMs);

  return {
    active: true,
    elapsedMs,
    notified,
    dueNow,
    nextDueInMs,
    shouldReveal: elapsedMs >= REVEAL_MS,
    revealed,
  };
}

/** "١٢ دقيقة" / "ساعة و٥ دقايق" — للعرض على الكارت */
export function minsText(msLeft: number): string {
  const m = Math.max(0, Math.round(msLeft / 60000));
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ساعة و${r} دقيقة` : `${h} ساعة`;
}
