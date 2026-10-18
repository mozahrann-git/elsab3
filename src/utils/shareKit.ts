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
      const bits = [`${u.area} م²`];
      if (u.label) bits.push(u.label);                       // الدور
      bits.push(`${f(r.price)} ج.م`);
      if ((r as any).down !== undefined) bits.push(`مقدم ${f((r as any).down)}`);
      if ((r as any).monthly !== undefined) bits.push(`قسط ${f((r as any).monthly)}`);
      if (u.count && u.count > 1) bits.push(`${u.count} وحدات`);
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

/* ---------------- الآيفون: الحفظ في الصور ----------------
   سفاري على الآيفون أي تنزيل بيروح «الملفات» مش الصور، ومفيش طريقة من موقع
   تحط فيديو في الصور غير قايمة المشاركة بتاعة الآيفون («حفظ الفيديو»).
   فعلى الآيفون: بنجيب الملفات، ونفتح قايمة المشاركة بيهم. ولو الآيفون رفض
   يفتحها لوحده (بياخد وقت في التحميل)، بيظهر زرار «احفظ في الصور» يدوس عليه. */
export const isIOS = () => {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1);
};

const mimeOf = (name: string, fallback: string) => {
  const e = name.split('.').pop()?.toLowerCase() || '';
  return e === 'mp4' ? 'video/mp4' : e === 'mov' ? 'video/quicktime' : e === 'webm' ? 'video/webm'
    : e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : fallback;
};

async function fetchAsFile(url: string, filename: string): Promise<File> {
  const res = await fetch(downloadUrl(url), { mode: 'cors' });
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  /* النوع من الامتداد الأول — الآيفون مابيعرضش «حفظ الفيديو» لو النوع مش مظبوط */
  const type = mimeOf(filename, blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'application/octet-stream');
  return new File([blob], filename, { type });
}

function askToSave(files: File[]): Promise<boolean> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.setAttribute('dir', 'rtl');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;padding:16px;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif';
    const isVid = files.some((f) => f.type.startsWith('video/'));
    wrap.innerHTML = `<div style="background:#FFFDF8;border-radius:28px;padding:20px;width:100%;max-width:420px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.3)">
      <p style="font-weight:700;font-size:17px;margin:0 0 6px;color:#17150F">${isVid ? 'الفيديو جاهز' : `${files.length > 1 ? `${files.length} صور جاهزين` : 'الصورة جاهزة'}`}</p>
      <p style="font-size:13px;color:#6F695D;margin:0 0 14px">دوس الزرار، وبعدين اختار «${isVid ? 'حفظ الفيديو' : files.length > 1 ? `حفظ ${files.length} صور` : 'حفظ الصورة'}» عشان ${isVid ? 'يروح' : 'تروح'} الصور</p>
      <button data-go style="width:100%;height:52px;border:0;border-radius:16px;background:#17150F;color:#F5F0E6;font-weight:700;font-size:15px">احفظ في الصور</button>
      <button data-no style="width:100%;height:44px;border:0;background:none;color:#6F695D;font-weight:700;font-size:13px;margin-top:6px">إلغاء</button></div>`;
    const done = (ok: boolean) => { wrap.remove(); resolve(ok); };
    wrap.querySelector('[data-go]')!.addEventListener('click', async () => {
      try { await navigator.share({ files } as any); done(true); } catch { done(false); }
    });
    wrap.querySelector('[data-no]')!.addEventListener('click', () => done(false));
    document.body.appendChild(wrap);
  });
}

/** الآيفون: يحفظ الملفات في الصور. بترجّع false لو الجهاز مش بيدعم ده (ساعتها تنزيل عادي) */
async function saveToPhotos(urls: { url: string; name: string }[], onProgress?: (done: number, total: number) => void): Promise<boolean> {
  if (!isIOS() || !(navigator as any).canShare) return false;
  const files: File[] = [];
  for (let i = 0; i < urls.length; i += 1) {
    files.push(await fetchAsFile(urls[i].url, urls[i].name));
    onProgress?.(i + 1, urls.length);
  }
  if (!files.length || !(navigator as any).canShare({ files })) return false;
  try { await navigator.share({ files } as any); return true; }
  catch (e: any) {
    if (e?.name === 'AbortError') return true;           // هو اللي قفل القايمة
    return askToSave(files);                              // اللمسة الأولى «خلصت» — نطلب لمسة جديدة
  }
}

/**
 * بينزّل ملف واحد.
 * بنجرّب نجيبه كـ blob الأول عشان التنزيل يشتغل على الموبايل،
 * ولو الخادم رفض بنفتح رابط التحميل المباشر.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try { if (await saveToPhotos([{ url, name: filename }])) return; } catch { /* نكمّل بالتنزيل العادي */ }
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
  /* الآيفون: كله مرة واحدة في قايمة المشاركة («حفظ ٨ صور») بدل ٨ تنزيلات في «الملفات» */
  try {
    if (await saveToPhotos(list.map((url, i) => ({ url, name: `${base}-${i + 1}.${extOf(url, 'jpg')}` })), onProgress)) return;
  } catch { /* نكمّل بالتنزيل العادي */ }
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
