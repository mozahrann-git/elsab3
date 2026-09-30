/*
  اختيار متعدد في الفلاتر.

  قبل كده كل فلتر كان بيقبل اختيار واحد بس: حي واحد، تشطيب واحد، عدد غرف واحد.
  والعميل بيقول "الأول أو التاني أو الخامس" — ومكالمة الاكتشاف بتقبل ده فعلاً،
  فكان الفلتر أضيق من اللي النظام نفسه بيفهمه.

  دلوقتي كل الفلاتر بنفس الطريقة: تدوس على الاختيار يتحدد، تدوس تاني يتشال،
  و"الكل" بتفضّي الاختيارات.
*/

/** بيحط/بيشيل قيمة من قايمة الاختيارات */
export function toggleValue(list: string[] | undefined, value: string): string[] {
  const cur = list || [];
  return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
}

/**
 * هل القيمة دي مقبولة؟
 * القايمة الفاضية معناها "الكل" — مفيش استبعاد.
 * `single` للتوافق مع الاختيار القديم الواحد (شرايط الحي فوق مثلاً).
 */
export function passes(list: string[] | undefined, single: string | undefined, value: string | undefined): boolean {
  if (list && list.length) return list.includes(String(value || ''));
  if (single && single !== 'all') return String(value || '') === single;
  return true;
}

/** عدد الغرف: '2' و'3' بالظبط، و'4+' يعني أربعة أو أكتر */
export function passesBedrooms(list: string[] | undefined, single: string | undefined, bedrooms: number | undefined): boolean {
  const n = Number(bedrooms) || 0;
  const one = (k: string) => (k === '4+' ? n >= 4 : n === Number(k));
  if (list && list.length) return list.some(one);
  if (single && single !== 'all') return one(single);
  return true;
}

/** الكلام اللي بيتكتب على الشارة: "الحي الأول" أو "٣ أحياء" */
export function summarize(list: string[] | undefined, single: string | undefined, unit: string): string | null {
  if (list && list.length) return list.length === 1 ? list[0] : `${list.length} ${unit}`;
  if (single && single !== 'all') return single;
  return null;
}
