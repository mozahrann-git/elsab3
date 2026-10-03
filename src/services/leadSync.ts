import { Lead } from '../types';

/*
  دمج تعديلات الليد بين أكتر من واحد شغالين في نفس الوقت.

  المشكلة اللي بيحلّها: كل واحد كان بيحفظ **الليد كامل**. فلو الإدارة
  نقلت العميل لـ«معاينة مؤكدة»، ومريم عندها نسخة قديمة مفتوحة وسجّلت
  ملاحظة، حفظها كان بيرجّع الحالة القديمة فوق الجديدة — فكل واحد يشوف
  حاجة.

  الحل: مبنبعتش الليد كامل. بنبعت **اللي اتغيّر بس**، والنشاط بيتدمج
  من الطرفين بدل ما واحد يمسح التاني.
*/

/** المفاتيح اللي بتتدمج كقوايم مش بتتكتب فوق بعض */
const LIST_KEYS = ['activity', 'notes'] as const;

/** مفاتيح محسوبة محلياً، مالهاش لازمة في الكتابة */
const SKIP_KEYS = new Set<string>(['id']);

const sameValue = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }
  return false;
};

/**
 * بيطلّع اللي اتغيّر بين النسخة القديمة والجديدة.
 * لو مفيش قديمة (ليد جديد) بيرجّع الليد كامل.
 */
export function leadDiff(next: Lead, prev?: Lead | null): Record<string, any> {
  if (!prev) return { ...next };
  const patch: Record<string, any> = {};
  Object.keys(next).forEach((k) => {
    if (SKIP_KEYS.has(k)) return;
    if (!sameValue((next as any)[k], (prev as any)[k])) patch[k] = (next as any)[k];
  });
  return patch;
}

const stamp = (x: any): string => {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  return [x.at ?? '', x.by ?? '', x.outcome ?? '', x.comment ?? ''].join('|');
};

/**
 * بيدمج قايمتين نشاط من غير تكرار، الأحدث الأول.
 * الاتنين بيفضلوا — محدش بيمسح نشاط التاني.
 */
export function mergeList(mine: any[] = [], theirs: any[] = [], cap = 80): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  [...(mine || []), ...(theirs || [])].forEach((x) => {
    const k = stamp(x);
    if (k && seen.has(k)) return;
    if (k) seen.add(k);
    out.push(x);
  });
  out.sort((a, b) => (Number(b?.at) || 0) - (Number(a?.at) || 0));
  return out.slice(0, cap);
}

/**
 * بيبني اللي هيتكتب فعلاً على السيرفر.
 *  - الحقول العادية: اللي اتغيّر عندي بس
 *  - القوايم (النشاط والملاحظات): مدموجة مع اللي على السيرفر
 */
export function buildLeadPatch(
  next: Lead,
  prev: Lead | null | undefined,
  server: Partial<Lead> | null,
): Record<string, any> {
  const patch = leadDiff(next, prev);

  LIST_KEYS.forEach((k) => {
    const mine = (next as any)[k];
    const theirs = server ? (server as any)[k] : undefined;
    if (!Array.isArray(mine) && !Array.isArray(theirs)) return;
    const merged = mergeList(mine || [], theirs || []);
    /* بنكتبها بس لو فعلاً اتغيّرت — مش كل مرة */
    if (!sameValue(merged, theirs)) patch[k] = merged;
    else delete patch[k];
  });

  patch.updatedAt = Date.now();
  return patch;
}
