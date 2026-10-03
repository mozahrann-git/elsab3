import { db } from './firebaseService';
import { collection, addDoc, query, where, orderBy, getDocs, limit as qLimit } from 'firebase/firestore';

/*
  الإحالة: مين جاب مين.

  مشكلتين بيحلّهم:

  1. السيلز بيبعت لينك لمالك أو لعميل، وبعدين محدش يعرف إن هو اللي جابه.
     دلوقتي اللينك شايل كوده، وأول ما حد يفتحه بنسجّل ده.

  2. العميل بيفتح اللينك النهارده ويتكلم بعد أسبوعين من جوجل مباشرة.
     لو اتبعنا «آخر مصدر» السيلز هيضيع حقه. فإحنا بنمسك **أول لمسة**
     (first touch) وبنثبّتها: مهما رجع بعد كده بأي طريقة، الكريدت
     بيفضل لأول واحد جابه، والزيارات اللي بعدها بتتسجّل كرحلة.

  التخزين: نسخة في المتصفح (بتفضل مع العميل) + نسخة في الداتابيز عشان
  الإدارة تشوفها حتى لو العميل غيّر الجهاز.
*/

const KEY = 'elsab3_ref_v1';
const JOURNEY_KEY = 'elsab3_journey_v1';
const MAX_JOURNEY = 60;

export interface RefTouch {
  code: string;            // كود السيلز
  at: number;
  landing: string;         // أول صفحة دخل عليها
  source?: string;         // utm_source لو موجود
}

export interface JourneyStep {
  at: number;
  what: string;            // 'زار الموقع' / 'فتح شقة' / 'طلب معاينة' ...
  detail?: string;         // كود الشقة مثلاً
}

export interface RefRecord {
  first: RefTouch;         // أول لمسة — دي اللي بتحسب
  last?: RefTouch;         // آخر لمسة — للمعرفة بس
  visits: number;
  journey: JourneyStep[];
}

const safeGet = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* المتصفح رافض التخزين — بنكمّل عادي */ }
};

/** بيقرأ سجل الإحالة من المتصفح */
export function readRef(): RefRecord | null {
  const raw = safeGet(KEY);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RefRecord;
    return r && r.first && r.first.code ? r : null;
  } catch { return null; }
}

/** رحلة العميل على الجهاز ده */
export function readJourney(): JourneyStep[] {
  const raw = safeGet(JOURNEY_KEY);
  if (!raw) return [];
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : []; } catch { return []; }
}

/** بيسجّل خطوة في رحلة العميل */
export function logStep(what: string, detail?: string) {
  const step: JourneyStep = { at: Date.now(), what, detail };
  const list = [step, ...readJourney()].slice(0, MAX_JOURNEY);
  safeSet(JOURNEY_KEY, JSON.stringify(list));
}

/**
 * بيتندهه مرة واحدة أول ما الصفحة تفتح.
 * لو في ?ref= في اللينك بيسجّل اللمسة؛ واللمسة الأولى بتتقفل ومبتتغيّرش.
 */
export function captureRef(): RefRecord | null {
  let code = '';
  let source = '';
  try {
    const q = new URLSearchParams(window.location.search);
    code = (q.get('ref') || q.get('by') || '').trim();
    source = (q.get('utm_source') || '').trim();
  } catch { /* لا يوجد window */ }

  const existing = readRef();

  if (!code) {
    // مفيش كود في اللينك — بنعدّ الزيارة بس لو عندنا إحالة قديمة
    if (existing) {
      const updated: RefRecord = { ...existing, visits: (existing.visits || 0) + 1 };
      safeSet(KEY, JSON.stringify(updated));
      logStep('رجع للموقع');
      return updated;
    }
    return null;
  }

  const touch: RefTouch = {
    code,
    at: Date.now(),
    landing: (() => { try { return window.location.pathname + window.location.search; } catch { return '/'; } })(),
    source: source || undefined,
  };

  /* أول لمسة بتتقفل. اللينك التاني بيتسجّل كآخر لمسة بس — الكريدت
     مبيتسرقش من اللي جابه أول مرة. */
  const rec: RefRecord = existing
    ? { ...existing, last: touch, visits: (existing.visits || 0) + 1 }
    : { first: touch, visits: 1, journey: [] };

  safeSet(KEY, JSON.stringify(rec));
  logStep(existing ? 'فتح لينك تاني' : 'دخل من لينك السيلز', code);

  // نسخة للإدارة — لو فشلت مبنوقعش الصفحة
  if (!existing) {
    recordTouchToDb(touch).catch(() => { /* أوفلاين أو الصلاحيات */ });
  }

  return rec;
}

/** كود اللي يستاهل الكريدت — أول واحد جاب العميل */
export function creditCode(): string {
  return readRef()?.first.code || '';
}

// ---------------- الداتابيز ----------------

export interface TouchDoc extends RefTouch {
  id?: string;
  userAgent?: string;
}

async function recordTouchToDb(touch: RefTouch): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'ref_touches'), {
    ...touch,
    userAgent: (() => { try { return navigator.userAgent.slice(0, 180); } catch { return ''; } })(),
  });
}

/** كل اللي دخلوا من لينك سيلز معيّن */
export async function fetchTouchesFor(code: string, max = 200): Promise<TouchDoc[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'ref_touches'),
    where('code', '==', code),
    orderBy('at', 'desc'),
    qLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** عدد اللي دخلوا من كل سيلز — للوحة الإدارة */
export async function countTouchesByCode(max = 1000): Promise<Record<string, number>> {
  if (!db) return {};
  const snap = await getDocs(query(collection(db, 'ref_touches'), orderBy('at', 'desc'), qLimit(max)));
  const out: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const c = (d.data() as any).code || '';
    if (c) out[c] = (out[c] || 0) + 1;
  });
  return out;
}

// ---------------- كود السيلز ----------------

/* حروف عربية ← إنجليزي، عشان الكود يبقى قصير ومقروء في اللينك */
const AR_MAP: Record<string, string> = {
  ا: 'A', أ: 'A', إ: 'A', آ: 'A', ب: 'B', ت: 'T', ث: 'TH', ج: 'G', ح: 'H', خ: 'KH',
  د: 'D', ذ: 'Z', ر: 'R', ز: 'Z', س: 'S', ش: 'SH', ص: 'S', ض: 'D', ط: 'T', ظ: 'Z',
  ع: 'A', غ: 'GH', ف: 'F', ق: 'Q', ك: 'K', ل: 'L', م: 'M', ن: 'N', ه: 'H', ة: 'H',
  و: 'W', ي: 'Y', ى: 'A', ئ: 'Y', ء: 'A',
};

/**
 * كود قصير ومقروء للسيلز من اسمه.
 *
 * بدل `agent-1790595231677` اللي كان بيتبعت للمالك في اللينك — ده رقم
 * داخلي، مش حاجة حد يشوفها. دلوقتي: MARIAM أو MARIAMK لو في تكرار.
 */
export function agentCode(name?: string, fallbackId?: string): string {
  const raw = String(name || '').trim();
  if (!raw) return String(fallbackId || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'TEAM';

  const parts = raw.split(/\s+/).filter(Boolean);
  const translit = (w: string) =>
    [...w].map((ch) => (AR_MAP[ch] !== undefined ? AR_MAP[ch] : /[A-Za-z0-9]/.test(ch) ? ch : '')).join('');

  let code = translit(parts[0]).toUpperCase();
  // الاسم التاني بيدخل بأول حرف بس — عشان الكود يفضل قصير
  if (parts[1]) code += translit(parts[1]).toUpperCase().slice(0, 1);

  code = code.replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return code || 'TEAM';
}
