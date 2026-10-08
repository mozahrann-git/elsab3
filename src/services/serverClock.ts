/*
  ساعة واحدة للفريق كله.

  المشكلة اللي بيحلّها: كل حسابات «متأخر كذا» و«بعد كذا» كانت بتتحسب من
  ساعة الجهاز نفسه. وده بيوقع في حالة حقيقية: جهاز ويندوز قديم مبيعرفش
  التوقيت الصيفي المصري الجديد، فساعته متأخرة ساعة بالظبط — ونفس الميعاد
  المحفوظ يظهر «بعد ٣٥ دقيقة» عند واحد و«بعد ساعة و٣٥ دقيقة» عند التاني.
  الداتا واحدة، والفرق كله في ساعة الجهاز.

  الحل: بنجيب وقت السيرفر مرة واحدة أول ما الصفحة تفتح، ونحسب الفرق بينه
  وبين ساعة الجهاز. وبعد كده كل الحسابات بتستخدم now() اللي بيصحّح الفرق
  ده — فالفريق كله بيشوف نفس الكلام مهما كانت ساعة أجهزتهم.

  بنجيب الوقت من ترويسة Date بتاعة السيرفر نفسه (مجانية، مفيش قراءة
  إضافية من قاعدة البيانات).
*/

let offset = 0;             // وقت السيرفر − وقت الجهاز، بالمللي ثانية
let synced = false;

/** الوقت الصح — ساعة السيرفر، مش ساعة الجهاز */
export function now(): number {
  return Date.now() + offset;
}

/** فرق ساعة الجهاز عن السيرفر بالدقايق (موجب = الجهاز متأخر) */
export function deviceSkewMinutes(): number {
  return Math.round(offset / 60000);
}

export function isClockSynced(): boolean {
  return synced;
}

/**
 * بيجيب وقت السيرفر ويحسب الفرق.
 * لو فشل، بنكمّل بساعة الجهاز — أحسن من إن الصفحة تقف.
 */
export async function syncClock(): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await fetch(`${window.location.origin}/?_clock=${t0}`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    const t1 = Date.now();
    const header = res.headers.get('date');
    if (!header) return offset;

    const serverMs = Date.parse(header);
    if (!isFinite(serverMs)) return offset;

    /* بنشيل نص زمن الرحلة عشان التقدير يبقى أقرب للحظة الرد.
       ترويسة Date دقتها ثانية، فمش بنزعّق لفروق صغيرة. */
    const mid = t0 + (t1 - t0) / 2;
    const diff = serverMs - mid;

    // أقل من ٣٠ ثانية فرق = ساعة الجهاز كويسة، مش محتاجين نصحّح
    offset = Math.abs(diff) < 30000 ? 0 : diff;
    synced = true;
    return offset;
  } catch {
    return offset;
  }
}
