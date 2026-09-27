/*
  قراءة شيت مشاريع السبع تحت الإنشاء.
  الشيت فيه صفين عناوين: الأول تجميعي (العمارة / المواصفات / السعر...) والتاني هو أسماء الأعمدة الحقيقية.
  فبنقرا الصف التاني كعناوين، والداتا بتبدأ من الصف التالت.
  الصفوف الفاضية وصفوف المثال بتتجاهل لوحدها.
*/
import * as XLSX from 'xlsx';
import type { Project, PaymentPlan } from '../services/projectService';

/** نفس قاعدة تحويل الكود لاسم مستند اللي في projectService — متكتوبة هنا عشان القارئ يفضل مستقل عن Firebase */
const docIdOf = (code: string) => String(code || '').trim().toUpperCase().replace(/[^\w-]/g, '_');

/** بيحوّل نسبة مكتوبة ككسر (0.35) لنسبة مئوية (35). الأرقام الأكبر من 1 بترجع زي ما هي. */
export function toPercent(v: unknown): number | undefined {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return undefined;
  // أقل من واحد صحيح = كسر (0.35 يعني 35٪). واحد أو أكتر = نسبة مكتوبة زي ما هي.
  return n < 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

const BUILDINGS_SHEET = 'العمارات المنفصلة';
const COMPOUNDS_SHEET = 'الكمبوندات';

const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  // الصفر قيمة حقيقية (وحدات متاحة = 0 يعني اتباعت كلها)، فمبنرميهوش
  return isFinite(n) ? n : undefined;
};
const yesNo = (v: unknown): boolean | undefined => {
  const s = txt(v);
  if (!s) return undefined;
  return /نعم|yes|true|1/i.test(s);
};

/** صف مثال أو صف فاضي؟ */
const isSkippable = (code: string, name: string) =>
  !code || name.includes('[مثال]') || name.includes('امسح الصف');

/** بيحوّل الشيت لصفوف {اسم العمود: القيمة} باستخدام الصف التاني كعناوين */
function rowsOf(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (grid.length < 3) return [];

  /* الشيت فيه أعمدة بنفس الاسم مرتين (المقدم، القسط الشهري — واحد لكل نظام سداد).
     فبنسمّي التكرار التاني "الاسم#2" عشان ما يمسحش الأول.
     وبنعتمد على الترتيب مش على مسافة في آخر الاسم، لأن الإكسل ممكن يشيلها لوحده. */
  const counts: Record<string, number> = {};
  const headers = (grid[1] || []).map((h) => {
    const base = txt(h);
    if (!base) return '';
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base}#${counts[base]}`;
  });

  const out: Record<string, unknown>[] = [];
  for (let r = 2; r < grid.length; r += 1) {
    const row = grid[r] || [];
    if (row.every((c) => txt(c) === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    out.push(obj);
  }
  return out;
}

/** بيبني أنظمة السداد من الأعمدة، وبيتجاهل النظام اللي مفيهوش أي رقم */
function plansOf(parts: PaymentPlan[]): PaymentPlan[] {
  return parts.filter((p) => p.downPaymentPercent || p.years || p.downPaymentAmount || p.monthly || p.quarterly);
}

function buildingFrom(r: Record<string, unknown>): Project | null {
  const code = txt(r['كود العمارة']);
  const name = txt(r['اسم العمارة']);
  if (isSkippable(code, name)) return null;

  return {
    id: code,
    kind: 'building',
    code,
    name: name || code,
    neighborhood: txt(r['الحي']),
    developer: txt(r['المالك / المقاول']) || undefined,
    plotOrStreet: txt(r['رقم القطعة / الشارع']) || undefined,
    headline: txt(r['ميزة العمارة في جملة']) || undefined,
    internalNotes: txt(r['ملاحظات داخلية']) || undefined,
    mediaUrl: txt(r['رابط الصور والفيديو']) || undefined,

    floors: num(r['عدد الأدوار']),
    unitsPerFloor: num(r['شقق في الدور']),
    facade: txt(r['الواجهة']) || undefined,
    hasElevator: yesNo(r['أسانسير']),
    hasGarage: yesNo(r['جراج']),
    finishing: txt(r['التشطيب']) || undefined,
    licenseStatus: txt(r['الترخيص']) || undefined,

    constructionPercent: toPercent(r['نسبة الإنشاء']),
    deliveryDate: txt(r['ميعاد الاستلام']) || undefined,

    pricePerMeter: num(r['سعر المتر (ج.م)']),
    minArea: num(r['أقل مساحة م²']),
    maxArea: num(r['أكبر مساحة م²']),
    startingPrice: num(r['يبدأ من (ج.م)']),
    cashDiscountPercent: toPercent(r['خصم الكاش']),
    cashPrice: num(r['سعر الكاش (ج.م)']),
    availableUnits: num(r['الوحدات المتاحة']),

    plans: plansOf([
      {
        label: 'نظام ١',
        downPaymentPercent: toPercent(r['مقدم النظام 1']),
        years: num(r['سنين النظام 1']),
        downPaymentAmount: num(r['المقدم (ج.م)']),
        monthly: num(r['القسط الشهري (ج.م)']),
        quarterly: num(r['القسط الربع سنوي (ج.م)']),
      },
      {
        label: 'نظام ٢',
        downPaymentPercent: toPercent(r['مقدم النظام 2']),
        years: num(r['سنين النظام 2']),
        // تكرار تاني لنفس اسم العمود — بص على التعليق فوق في rowsOf
        downPaymentAmount: num(r['المقدم (ج.م)#2']),
        monthly: num(r['القسط الشهري (ج.م)#2']),
      },
    ]),
  };
}

function compoundFrom(r: Record<string, unknown>): Project | null {
  const code = txt(r['كود المشروع']);
  const name = txt(r['اسم الكمبوند']);
  if (isSkippable(code, name)) return null;

  return {
    id: code,
    kind: 'compound',
    code,
    name: name || code,
    neighborhood: txt(r['الحي']),
    developer: txt(r['المطور']) || undefined,
    headline: txt(r['ميزة المشروع في جملة']) || undefined,
    internalNotes: txt(r['ملاحظات داخلية']) || undefined,
    mediaUrl: txt(r['رابط الصور والفيديو']) || undefined,

    developerTrackRecord: num(r['مشاريع مسلّمة للمطور']),
    totalFeddan: num(r['المساحة الكلية (فدان)']),
    builtRatioPercent: toPercent(r['نسبة المباني']),
    phase: txt(r['المرحلة']) || undefined,
    unitTypes: txt(r['أنواع الوحدات']) || undefined,
    amenities: txt(r['الخدمات']) || undefined,

    constructionPercent: toPercent(r['نسبة الإنشاء']),
    deliveryDate: txt(r['ميعاد الاستلام']) || undefined,

    minArea: num(r['أقل مساحة م²']),
    pricePerMeter: num(r['سعر المتر (ج.م)']),
    startingPrice: num(r['يبدأ من (ج.م)']),

    maintenanceFeePercent: toPercent(r['وديعة الصيانة']),
    clubFee: num(r['النادي (ج.م)']),
    garageFee: num(r['الجراج (ج.م)']),
    actualTotalCost: num(r['التكلفة الفعلية (ج.م)']),
    overAnnouncedPercent: toPercent(r['زيادة عن المعلن']),

    plans: plansOf([
      {
        label: 'النظام المعلن',
        downPaymentPercent: toPercent(r['أقل مقدم']),
        years: num(r['أقصى سنين']),
        downPaymentAmount: num(r['المقدم (ج.م)']),
        monthly: num(r['القسط الشهري (ج.م)']),
        quarterly: num(r['القسط الربع سنوي (ج.م)']),
      },
    ]),
  };
}

export interface ParseResult {
  projects: Project[];
  buildings: number;
  compounds: number;
  skipped: number;
  errors: string[];
}

/**
 * بيفتح ملف الإكسل.
 * بنستخدم نفس طريقة استيراد الشقق (FileReader + binary + codepage) لأنها مجرّبة وشغالة،
 * والطريقة التانية (arrayBuffer على طول) بتفشل على بعض المتصفحات وخصوصاً الموبايل
 * وبتطلّع رسالة زي "Unsupported ZIP Compression method".
 */
function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('المتصفح مقدرش يقرا الملف. جرّب تنزّله على الجهاز الأول وبعدين ارفعه.'));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('الملف فاضي أو مقفول.');
        resolve(XLSX.read(data, { type: 'binary', cellDates: false, codepage: 65001 }));
      } catch (err: any) {
        // نجرّب الطريقة التانية قبل ما نستسلم
        try {
          const buf = new Uint8Array(e.target?.result as ArrayBuffer);
          resolve(XLSX.read(buf, { type: 'array', cellDates: false }));
        } catch {
          reject(new Error(`الملف ده مش ملف إكسل سليم (${err?.message || 'مش مقروء'}). افتحه في إكسل واحفظه باسم جديد بصيغة .xlsx وجرّب تاني.`));
        }
      }
    };
    reader.readAsBinaryString(file);
  });
}

/** بيقرا ملف الشيت ويرجّع المشاريع الجاهزة للحفظ */
export async function parseProjectsWorkbook(file: File): Promise<ParseResult> {
  return projectsFromWorkbook(await readWorkbook(file));
}

/** التحويل نفسه، منفصل عن قراءة الملف عشان نقدر نجرّبه لوحده */
export function projectsFromWorkbook(wb: XLSX.WorkBook): ParseResult {
  const errors: string[] = [];

  if (!wb.Sheets[BUILDINGS_SHEET] && !wb.Sheets[COMPOUNDS_SHEET]) {
    errors.push(`الملف ده مش شيت المشاريع. المفروض يكون فيه صفحة "${BUILDINGS_SHEET}" أو "${COMPOUNDS_SHEET}".`);
    return { projects: [], buildings: 0, compounds: 0, skipped: 0, errors };
  }

  const bRows = rowsOf(wb, BUILDINGS_SHEET);
  const cRows = rowsOf(wb, COMPOUNDS_SHEET);

  const projects: Project[] = [];
  let skipped = 0;

  bRows.forEach((r, i) => {
    try {
      const p = buildingFrom(r);
      if (p) projects.push(p); else skipped += 1;
    } catch (e: any) {
      errors.push(`العمارات — صف ${i + 3}: ${e?.message || 'صف مش مفهوم'}`);
    }
  });

  cRows.forEach((r, i) => {
    try {
      const p = compoundFrom(r);
      if (p) projects.push(p); else skipped += 1;
    } catch (e: any) {
      errors.push(`الكمبوندات — صف ${i + 3}: ${e?.message || 'صف مش مفهوم'}`);
    }
  });

  // كود متكرر بيخلي مشروع يمسح التاني، فبننبّه
  const seen = new Set<string>();
  projects.forEach((p) => {
    // بنقارن بالاسم اللي المستند هياخده فعلاً: "BLD 1" و "BLD.1" الاتنين بيبقوا BLD_1
    const k = docIdOf(p.code);
    if (seen.has(k)) errors.push(`الكود ${p.code} مكرر — آخر صف هو اللي هيتحفظ.`);
    seen.add(k);
  });

  return {
    projects,
    buildings: projects.filter((p) => p.kind === 'building').length,
    compounds: projects.filter((p) => p.kind === 'compound').length,
    skipped,
    errors,
  };
}
