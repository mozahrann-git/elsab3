import { Property } from '../types';

/*
  الأدوار المخالفة.

  الرخصة في الهضبة الوسطى: أرضي + ٤ أدوار في كل الأحياء،
  ما عدا تقسيم المباحث: أرضي + ٩ أدوار.

  يعني الدور الخامس وطالع مخالف — إلا في تقسيم المباحث، العاشر وطالع.

  الدور متخزّن نص حر ("الدور الثالث"، "الأول فوق الأرضي")، فبنقراه من الكلام.
  اللي مش بنعرف نقراه بنقول عليه "محتاج تأكيد" — مبنقولش عليه سليم ولا مخالف،
  لأن الكلام ده بيتقال لعميل.
*/

/** أرضي + كام دور في الرخصة، لكل حي */
const LICENSED_FLOORS: Record<string, number> = {
  'تقسيم المباحث': 9,
};
const DEFAULT_LICENSED = 4;

export function licensedFloors(neighborhood?: string): number {
  return LICENSED_FLOORS[(neighborhood || '').trim()] ?? DEFAULT_LICENSED;
}

// ---------------- قراءة الدور من الكلام ----------------

const WORDS: Record<string, number> = {
  'ارضي': 0, 'أرضي': 0, 'الارضي': 0, 'الأرضي': 0, 'جراج': 0,
  'اول': 1, 'أول': 1, 'الاول': 1, 'الأول': 1,
  'تاني': 2, 'ثاني': 2, 'التاني': 2, 'الثاني': 2,
  'تالت': 3, 'ثالث': 3, 'التالت': 3, 'الثالث': 3,
  'رابع': 4, 'الرابع': 4,
  'خامس': 5, 'الخامس': 5,
  'سادس': 6, 'السادس': 6,
  'سابع': 7, 'السابع': 7,
  'تامن': 8, 'ثامن': 8, 'التامن': 8, 'الثامن': 8,
  'تاسع': 9, 'التاسع': 9,
  'عاشر': 10, 'العاشر': 10,
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toEn = (t: string) => t.replace(/[٠-٩]/g, (c) => String(ARABIC_DIGITS.indexOf(c)));

/**
 * بيقرا رقم الدور من الكلام. بيرجّع null لو مش فاهم.
 * بيمشي على أول كلمة دور يلاقيها — عشان "الدور الأول فوق الأرضي" تطلع ١ مش ٠.
 */
export function parseFloor(text?: string): number | null {
  const t = toEn(String(text || '')).replace(/[ـ]/g, '').trim();
  if (!t) return null;

  // رقم مكتوب بالأرقام: "الدور 5"، "5"، "الدور الـ 5"
  const num = t.match(/(?:^|\D)(\d{1,2})(?:\D|$)/);

  // كلمة دور
  const tokens = t.split(/[\s،,\-/()]+/).filter(Boolean);
  for (const tok of tokens) {
    const w = tok.replace(/^(ال)?دور$/, '');
    if (w === '' && tok.length) continue;              // كلمة "الدور" نفسها
    if (Object.prototype.hasOwnProperty.call(WORDS, tok)) return WORDS[tok];
  }

  if (num) {
    const n = Number(num[1]);
    if (n >= 0 && n <= 30) return n;
  }

  return null;
}

// ---------------- حالة الشقة ----------------

export type FloorStatus = 'licensed' | 'violation' | 'unknown';

/** الشقة اللي الأدمن أكّد إن معاها ورقها بتتعلّم كده وبتخرج من القاعدة */
export function isExempt(p: Property): boolean {
  return (p as any).licensedException === true;
}

export function floorStatusOf(p: Property): FloorStatus {
  if (isExempt(p)) return 'licensed';
  const n = parseFloor(p.floor);
  if (n === null) return 'unknown';
  return n > licensedFloors(p.neighborhood) ? 'violation' : 'licensed';
}

/** الجملة اللي بتتقال للعميل جوّه الشقة */
export function violationNote(p: Property): string {
  const lic = licensedFloors(p.neighborhood);
  const n = parseFloor(p.floor);
  return `رخصة المبنى في ${p.neighborhood || 'الحي'} أرضي + ${lic} أدوار، والشقة دي في الدور ${n ?? '؟'}. `
    + 'يعني الدور مخالف لارتفاع الرخصة — وده بيأثر على التسجيل والتمويل العقاري. '
    + 'بنقولها لك من الأول عشان تبقى داخل وإنت عارف.';
}

/** بتتقال للفريق بس */
export const UNKNOWN_FLOOR_NOTE = 'الدور مكتوب بشكل النظام مش فاهمه — أكّده من الأدمن عشان نعرف مخالف ولا لأ.';
