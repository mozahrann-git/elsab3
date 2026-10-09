/*
  هل الشقة دي موجودة عندنا قبل كده؟

  المشكلة: بروكر بيعرض شقة، ومالك جديد بيعرض نفس الشقة، وممكن بروكر تاني
  كمان. كلهم بأكواد مختلفة وأسعار مختلفة شوية. النتيجة إن نفس الشقة بتتنشر
  ٣ مرات، والعميل بيشوفها مكررة، والعمولة بتبقى محل خلاف.

  الحل: قبل ما سارة تنشر، بنقارن الطلب الجديد بكل الشقق الموجودة ونقول لها
  "دي شبه H1710 بنسبة ٩٢٪" — وهي تقرر.

  بنقارن بحاجتين:
   - المواصفات: الحي، المساحة، السعر، الغرف، الدور  (شغالة دايماً)
   - الصور: نفس الرابط بالظبط، أو بصمة قريبة  (شغالة لو الصور اتقرت)

  مبنقررش بدل سارة. بنرتّب الشبيهين ونسيب القرار لها.
*/
import { Property } from '../types';
import { bestHashDistance } from './imageFingerprint';

/** توحيد اسم الحي: "الحى الثالث" و"الحي الثالث " نفس الحاجة */
export const normHood = (s?: string): string =>
  String(s || '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[ىي]/g, 'ي').replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim();

/** نسبة الفرق بين رقمين (٠ = متطابقين) */
const diff = (a: number, b: number): number => {
  if (!a || !b) return 1;
  return Math.abs(a - b) / Math.max(a, b);
};

export interface MatchInput {
  neighborhood?: string;
  area?: number;
  price?: number;
  bedrooms?: number;
  floor?: string;
  images?: string[];
  imageHashes?: string[];
}

export interface UnitMatch {
  property: Property;
  score: number;            // ٠ – ١٠٠
  reasons: string[];        // ليه شبهها — بالعربي، عشان سارة تقرا مش تخمّن
  sameImage: boolean;       // نفس الصورة بالظبط — ده شبه دليل قاطع
}

/* الأوزان. مجموع المواصفات لوحدها ٩٥، والصور بتضيف فوقهم.
   نفس الصورة بالظبط بتوصل لـ ١٠٠ لوحدها تقريباً — وده مقصود. */
const W = {
  hood: 22,
  area: 28,
  price: 22,
  beds: 10,
  floor: 8,
  imageSame: 55,     // نفس رابط الصورة
  imageNear: 40,     // بصمة قريبة جداً
  imageLike: 22,     // بصمة قريبة
};

export function scoreMatch(a: MatchInput, p: Property): UnitMatch {
  const reasons: string[] = [];
  let score = 0;

  if (a.neighborhood && normHood(a.neighborhood) === normHood(p.neighborhood)) {
    score += W.hood;
    reasons.push('نفس الحي');
  }

  const ad = diff(Number(a.area) || 0, Number(p.area) || 0);
  if (ad === 0) { score += W.area; reasons.push('نفس المساحة بالظبط'); }
  else if (ad <= 0.02) { score += W.area * 0.85; reasons.push('المساحة فرقها أقل من ٢٪'); }
  else if (ad <= 0.05) { score += W.area * 0.6; reasons.push('المساحة قريبة'); }
  else if (ad <= 0.10) { score += W.area * 0.3; }

  const pd = diff(Number(a.price) || 0, Number(p.price) || 0);
  if (pd === 0) { score += W.price; reasons.push('نفس السعر بالظبط'); }
  else if (pd <= 0.03) { score += W.price * 0.8; reasons.push('السعر فرقه بسيط'); }
  else if (pd <= 0.08) { score += W.price * 0.5; reasons.push('السعر قريب'); }
  else if (pd <= 0.15) { score += W.price * 0.2; }

  if (a.bedrooms && Number(a.bedrooms) === Number(p.bedrooms)) { score += W.beds; reasons.push('نفس عدد الغرف'); }
  if (a.floor && String(a.floor).trim() && String(a.floor).trim() === String(p.floor || '').trim()) {
    score += W.floor; reasons.push('نفس الدور');
  }

  /* الصور. نفس الرابط = نفس الملف، وده مش صدفة. */
  const mine = new Set((a.images || []).filter(Boolean));
  const sameImage = (p.images || []).some((u) => mine.has(u));
  if (sameImage) {
    score += W.imageSame;
    reasons.push('نفس الصورة بالظبط');
  } else {
    /* الحدود دي اتظبطت بالتجربة: صورة اتصغّرت واتضغطت طلعت مسافة ٩،
       ونفس الصورة بسطوع أعلى ٢٥٪ طلعت ١١، وصورة مختلفة خالص ٢١.
       فحطّينا ١٢ — بتمسك التعديلات العادية وبعيدة عن المختلف.
       والدرجة دي لوحدها متكفّيش للتحذير، لازم المواصفات توافق كمان. */
    const d = bestHashDistance(a.imageHashes || [], (p as any).imageHashes || []);
    if (d <= 5) { score += W.imageNear; reasons.push('الصور شبه بعض جداً'); }
    else if (d <= 12) { score += W.imageLike; reasons.push('الصور شبه بعض'); }
  }

  return { property: p, score: Math.min(100, Math.round(score)), reasons, sameImage };
}

/**
 * الشقق الشبيهة بالطلب الجديد، مرتبة من الأقرب.
 * `minScore` الافتراضي ٥٥ — تحتها الشبه ضعيف ومش هيستاهل يوقف سارة.
 */
export function findSimilarUnits(
  a: MatchInput,
  properties: Property[],
  opts: { minScore?: number; limit?: number; excludeId?: string } = {},
): UnitMatch[] {
  const min = opts.minScore ?? 55;
  const limit = opts.limit ?? 5;
  return properties
    .filter((p) => p && p.id !== opts.excludeId)
    .map((p) => scoreMatch(a, p))
    .filter((m) => m.score >= min)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

/** كلمة واحدة توصف قوة الشبه */
export function matchLabel(score: number): { text: string; tone: 'red' | 'gold' | 'grey' } {
  if (score >= 85) return { text: 'شبه قوي جداً — غالباً نفس الشقة', tone: 'red' };
  if (score >= 70) return { text: 'شبه قوي — راجعها', tone: 'red' };
  if (score >= 55) return { text: 'فيه شبه — بص عليها', tone: 'gold' };
  return { text: 'شبه ضعيف', tone: 'grey' };
}
