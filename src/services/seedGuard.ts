import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseService';

/*
  حارس البيانات التجريبية.

  المشكلة اللي بيحلّها: الكود كان بيقول "لو القايمة فاضية املاها بالبيانات التجريبية".
  فلما حد يمسح الحسابات الوهمية، القايمة بتفضى، والكود بيرجّعها تاني — فمستحيل تتمسح.

  الحل: بنسجّل إن الزرع حصل مرة واحدة. بعد كده القايمة الفاضية بتفضل فاضية،
  لأن ده معناه إن حد مسحها بقصد.
*/

const KEY = 'seed_state';
const LOCAL = 'elsab3_seeded';

export type SeedKind = 'agents' | 'leads' | 'properties' | 'brokers';

async function readState(): Promise<Record<string, boolean>> {
  try {
    const snap = await getDoc(doc(db, 'site_config', KEY));
    return snap.exists() ? ((snap.data() as any) || {}) : {};
  } catch {
    return {};
  }
}

/** هل مسموح نزرع النوع ده؟ مسموح مرة واحدة بس في عمر المشروع. */
export async function maySeed(kind: SeedKind): Promise<boolean> {
  // نسخة محلية سريعة عشان ما نستناش الشبكة في كل تحميل
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL) || '{}');
    if (local[kind]) return false;
  } catch { /* الوضع الخاص */ }

  const state = await readState();
  if (state[kind]) {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL) || '{}');
      localStorage.setItem(LOCAL, JSON.stringify({ ...local, [kind]: true }));
    } catch { /* الوضع الخاص */ }
    return false;
  }
  return true;
}

/** بنسجّل إن الزرع حصل — بعد كده مش هيتكرر أبداً */
export async function markSeeded(kind: SeedKind): Promise<void> {
  try {
    await setDoc(doc(db, 'site_config', KEY), { [kind]: true, [`${kind}At`]: Date.now() }, { merge: true });
  } catch { /* مش مشكلة، النسخة المحلية هتمنع التكرار */ }
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL) || '{}');
    localStorage.setItem(LOCAL, JSON.stringify({ ...local, [kind]: true }));
  } catch { /* الوضع الخاص */ }
}

/** بيزرع مرة واحدة بس. بيرجّع true لو الزرع حصل فعلاً. */
export async function seedOnce(kind: SeedKind, run: () => Promise<void> | void): Promise<boolean> {
  if (!(await maySeed(kind))) return false;
  await run();
  await markSeeded(kind);
  return true;
}

/** لو عايز تسمح بالزرع تاني (مثلاً بعد تفريغ كامل بقصد) */
export async function resetSeedFlag(kind: SeedKind): Promise<void> {
  try {
    await setDoc(doc(db, 'site_config', KEY), { [kind]: false }, { merge: true });
  } catch { /* تجاهل */ }
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL) || '{}');
    delete local[kind];
    localStorage.setItem(LOCAL, JSON.stringify(local));
  } catch { /* الوضع الخاص */ }
}
