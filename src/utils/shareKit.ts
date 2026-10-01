import { Property } from '../types';
import { Project, areaPlanNumbers, areaPrice } from '../services/projectService';

/*
  عُدّة المشاركة.

  السيلز بيبعت للعميل على الواتساب مباشرة — مش بيبعت لينك. فمحتاج
  حاجتين: النص جاهز للنسخ، والصور والفيديو منزّلين على الموبايل.

  اللينك بيفضل موجود لمين عايزه، بس مبقاش الطريقة الوحيدة.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

// ---------------- النصوص ----------------

/** نص الشقة جاهز للصق في الواتساب */
export function propertyText(p: Property, opts: { withCode?: boolean } = {}): string {
  const L: string[] = [];
  L.push(`${p.title || `شقة ${p.area} م²`} · ${p.neighborhood || 'الهضبة الوسطى'}`);
  if (opts.withCode !== false && p.code) L.push(`كود: ${p.code}`);
  L.push('');
  L.push(`المساحة: ${p.area} م²`);
  if (p.bedrooms) L.push(`الغرف: ${p.bedrooms}`);
  if (p.bathrooms) L.push(`الحمامات: ${p.bathrooms}`);
  if (p.floor) L.push(`الدور: ${p.floor}`);
  L.push(`التشطيب: ${p.finishingLabel || (p.finishing === 'finished' ? 'متشطبة بالكامل' : 'نص تشطيب')}`);
  if (p.view) L.push(`الفيو: ${p.view}`);
  L.push('');
  L.push(`السعر: ${f(p.price)} ج.م`);
  if (p.area) L.push(`سعر المتر: ${f(p.price / p.area)} ج.م`);
  if ((p.features || []).length) {
    L.push('');
    (p.features || []).slice(0, 6).forEach((x) => L.push(`• ${x}`));
  }
  if (p.description) { L.push(''); L.push(p.description); }
  L.push('');
  L.push('السبع للعقارات — الهضبة الوسطى بالمقطم');
  return L.join('\n');
}

/** نص المشروع. الحي والمطور واللوكيشن مش بيتكتبوا إلا للفريق. */
export function projectText(p: Project, opts: { isStaff?: boolean } = {}): string {
  const L: string[] = [];
  const kind = p.kind === 'building' ? 'عمارة منفصلة' : 'كمبوند';
  L.push(`${p.name} · ${kind}`);
  L.push(`كود: ${p.code}`);
  L.push(opts.isStaff ? `الحي: ${p.neighborhood}` : 'الهضبة الوسطى بالمقطم');
  if (opts.isStaff && p.developer) L.push(`المطور: ${p.developer}`);
  L.push('');
  if (p.headline) { L.push(p.headline); L.push(''); }
  if (p.constructionPercent != null) L.push(`نسبة الإنشاء: ${p.constructionPercent}٪`);
  if (p.deliveryDate) L.push(`الاستلام: ${p.deliveryDate}`);
  if (p.pricePerMeter) L.push(`سعر المتر: ${f(p.pricePerMeter)} ج.م`);
  if (p.startingPrice) L.push(`يبدأ من: ${f(p.startingPrice)} ج.م`);

  const areas = (p.unitAreas || []).filter((u) => !u.sold && u.area > 0);
  const first = (p.plans || [])[0];
  if (areas.length) {
    L.push('');
    L.push('المساحات المتاحة:');
    areas.forEach((u) => {
      const r = first ? areaPlanNumbers(p, u, first) : { price: areaPrice(p, u) };
      const bits = [`${u.area} م²`, `${f(r.price)} ج.م`];
      if ((r as any).down !== undefined) bits.push(`مقدم ${f((r as any).down)}`);
      if ((r as any).monthly !== undefined) bits.push(`قسط ${f((r as any).monthly)}`);
      L.push(`• ${bits.join(' · ')}`);
    });
    if (first?.years != null) L.push(`(على ${first.years} سنين)`);
  }

  if ((p.plans || []).length) {
    L.push('');
    L.push('أنظمة السداد:');
    (p.plans || []).forEach((pl, i) => {
      const bits: string[] = [];
      if (pl.downPaymentPercent != null) bits.push(`مقدم ${pl.downPaymentPercent}٪`);
      else if (pl.downPaymentAmount) bits.push(`مقدم ${f(pl.downPaymentAmount)}`);
      if (pl.years != null) bits.push(`${pl.years} سنين`);
      if (pl.monthly) bits.push(`قسط ${f(pl.monthly)}`);
      L.push(`• ${pl.label || `نظام ${i + 1}`}: ${bits.join(' · ')}`);
    });
  }

  if (opts.isStaff && p.locationUrl) { L.push(''); L.push(`الموقع: ${p.locationUrl}`); }
  L.push('');
  L.push('السبع للعقارات — الهضبة الوسطى بالمقطم');
  return L.join('\n');
}

// ---------------- النسخ ----------------

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* المتصفحات القديمة ولما الصفحة مش https */
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ---------------- التحميل ----------------

const extOf = (url: string, fallback: string) => {
  const m = url.split('?')[0].match(/\.(\w{3,4})$/);
  return m ? m[1] : fallback;
};

/** كلاودينري بيوفّر رابط تحميل مباشر — بيخلي الموبايل ينزّل بدل ما يفتح */
function downloadUrl(url: string): string {
  if (url.includes('/upload/') && url.includes('cloudinary')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * بينزّل ملف واحد.
 * بنجرّب نجيبه كـ blob الأول عشان التنزيل يشتغل على الموبايل،
 * ولو الخادم رفض بنفتح رابط التحميل المباشر.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(downloadUrl(url), { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    triggerDownload(obj, filename);
    setTimeout(() => URL.revokeObjectURL(obj), 60000);
  } catch {
    triggerDownload(downloadUrl(url), filename);
  }
}

/** بينزّل مجموعة ملفات واحد ورا التاني — المتصفح بيزهق لو نزلناهم مرة واحدة */
export async function downloadAll(
  urls: string[],
  base: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const list = urls.filter(Boolean);
  for (let i = 0; i < list.length; i += 1) {
    const url = list[i];
    await downloadFile(url, `${base}-${i + 1}.${extOf(url, 'jpg')}`);
    onProgress?.(i + 1, list.length);
    // فاصل صغير عشان المتصفح ما يعتبرهاش نوافذ منبثقة
    await new Promise((r) => setTimeout(r, 450));
  }
}

/**
 * مشاركة النظام نفسه (الواتساب بيظهر في القايمة).
 * بترجّع false لو الجهاز مش بيدعمها — ساعتها بنرجع للنسخ.
 */
export async function nativeShare(text: string, title?: string): Promise<boolean> {
  try {
    if (!navigator.share) return false;
    await navigator.share({ text, title });
    return true;
  } catch {
    return false;
  }
}
