/*
  انهيار Firestore الداخلي ("INTERNAL ASSERTION FAILED").
  ده عطل جوه مكتبة Firestore نفسها، غالباً من الكاش المحلي المشترك بين
  التابات — مش من شاشة معيّنة. لما بيحصل، المكتبة بتقف ومابترجعش إلا بريفرش.

  فبدل صفحة الخطأ:
  - أول مرة: ريفرش هادي لوحده.
  - لو اتكرر خلال ١٠ دقايق على نفس الجهاز: بنقفل الكاش المحلي ٣ أيام
    (الموقع بيشتغل عادي، بس بيقرا من السيرفر) ونعمل ريفرش.
  - لو اتكرر تاني والكاش مقفول أصلاً: بنسيب صفحة الخطأ تظهر عشان نعرف.
*/
const CRASH_AT = 'fs_crash_at';
const SAFE_UNTIL = 'fs_safe_until';

const get = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const set = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* */ } };

export const firestoreSafeMode = () => get(SAFE_UNTIL) > Date.now();

export function isFirestoreCrash(e: unknown): boolean {
  const msg = String((e as any)?.message || (e as any)?.reason?.message || e || '');
  return /FIRESTORE[\s\S]*INTERNAL ASSERTION FAILED/i.test(msg);
}

let recovering = false;
/** بترجع true لو هتعمل ريفرش (يعني ماتعرضش صفحة الخطأ) */
export function recoverFromFirestoreCrash(): boolean {
  if (recovering) return true;
  const now = Date.now();
  const recent = now - get(CRASH_AT) < 10 * 60000;
  if (recent && firestoreSafeMode()) return false;       // حتى من غير كاش — نسيب الخطأ يبان
  recovering = true;
  set(CRASH_AT, now);
  const reload = () => setTimeout(() => window.location.reload(), 400);
  if (!recent) { reload(); return true; }
  /* مابنمسحش الكاش القديم: لو في تاب تاني للموقع مفتوح، المسح بيبوّظ
     Firestore فيه (القراية تفشل والناس تطلع برا). بنكتفي إن الجهاز ده
     مايستخدموش الأيام الجاية. */
  set(SAFE_UNTIL, now + 3 * 86400000);
  reload();
  return true;
}
