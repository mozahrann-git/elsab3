/*
  مشاريع تحت الإنشاء: عمارات منفصلة وكمبوندات.
  دي كيانات لوحدها مش شقق — المشروع فيه مساحات وأنظمة سداد، مش وحدة واحدة بسعر واحد.

  الملاحظات الداخلية بتتخزن في مستند جوّاني منفصل (projects/{id}/private/notes)
  عشان الزوار ما يقدروش يقروها — المستند الرئيسي نفسه مفتوح للقراءة للكل.
*/
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { passes } from '../utils/multiFilter';

export type ProjectKind = 'building' | 'compound';

/** نظام سداد واحد: مقدم وسنين وقسط. المشروع ممكن يكون له أكتر من نظام. */
export interface PaymentPlan {
  label?: string;              // اسم النظام لو ليه اسم
  downPaymentPercent?: number; // نسبة المقدم ٪
  years?: number;              // سنين التقسيط
  downPaymentAmount?: number;  // قيمة المقدم بالجنيه
  monthly?: number;            // القسط الشهري
  quarterly?: number;          // القسط الربع سنوي
}

export interface Project {
  id: string;                  // = الكود
  kind: ProjectKind;
  code: string;                // BLD-001 أو CMP-001
  neighborhood: string;
  name: string;                // اسم العمارة أو الكمبوند
  developer?: string;          // المالك/المقاول أو المطور

  // الموقع والوصف
  plotOrStreet?: string;       // رقم القطعة / الشارع (للعمارات)
  headline?: string;           // ميزة المشروع في جملة
  internalNotes?: string;      // ملاحظات داخلية — بتتخزن في مستند جوّاني، مش في المستند العام
  mediaUrl?: string;           // رابط خارجي للصور والفيديو (اختياري، للتوافق مع الشيت)
  images?: string[];           // صور مرفوعة على السحابة
  videoUrl?: string;           // فيديو مرفوع أو رابط يوتيوب
  locationUrl?: string;        // لينك الموقع على خرايط جوجل
  address?: string;            // العنوان بالكلام

  // الإنشاء والاستلام
  constructionPercent?: number; // نسبة الإنشاء ٪
  deliveryDate?: string;        // ميعاد الاستلام

  // الأسعار
  pricePerMeter?: number;
  minArea?: number;
  maxArea?: number;
  startingPrice?: number;       // يبدأ من
  cashDiscountPercent?: number;
  cashPrice?: number;

  plans?: PaymentPlan[];
  availableUnits?: number;      // عدد الوحدات المتاحة

  // خاص بالعمارات المنفصلة
  floors?: number;
  unitsPerFloor?: number;
  facade?: string;
  hasElevator?: boolean;
  hasGarage?: boolean;
  finishing?: string;
  licenseStatus?: string;

  // خاص بالكمبوندات
  developerTrackRecord?: number; // مشاريع مسلّمة للمطور
  totalFeddan?: number;
  builtRatioPercent?: number;    // نسبة المباني ٪
  phase?: string;
  unitTypes?: string;
  maintenanceFeePercent?: number;
  clubFee?: number;
  garageFee?: number;
  actualTotalCost?: number;      // التكلفة الفعلية بعد الإضافات
  overAnnouncedPercent?: number; // زيادة عن المعلن ٪
  amenities?: string;

  hidden?: boolean;              // متخبّي عن الزوار
  order?: number;
  updatedAt?: number;
}

/** الكود بيتحوّل لاسم مستند. لازم نستخدمها في أي مقارنة عشان كودين مختلفين ما يدّوش نفس المستند. */
export function projectDocId(code: string): string {
  return String(code || '').trim().toUpperCase().replace(/[^\w-]/g, '_');
}

export function subscribeProjects(cb: (list: Project[]) => void) {
  return onSnapshot(
    collection(db, 'projects'),
    (snap) => {
      const list: Project[] = [];
      snap.forEach((d) => list.push({ ...(d.data() as Project), id: d.id }));
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.code.localeCompare(b.code));
      cb(list);
    },
    () => cb([]),
  );
}

export async function fetchProjects(): Promise<Project[]> {
  const snap = await getDocs(collection(db, 'projects'));
  const list: Project[] = [];
  snap.forEach((d) => list.push({ ...(d.data() as Project), id: d.id }));
  return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.code.localeCompare(b.code));
}

/** البيانات اللي بتدلّ على المشروع — الفريق بس اللي بيقراها */
export async function fetchProjectPrivate(projectId: string): Promise<Partial<Project>> {
  try {
    const snap = await getDoc(doc(db, 'projects', projectId, 'private', 'notes'));
    if (!snap.exists()) return {};
    const d = snap.data() as any;
    return {
      developer: d.developer, developerTrackRecord: d.developerTrackRecord,
      locationUrl: d.locationUrl, address: d.address, plotOrStreet: d.plotOrStreet,
      internalNotes: d.text || '',
    };
  } catch {
    return {};
  }
}

/** الملاحظات الداخلية بتتقرا لوحدها — الأدمن بس اللي عنده صلاحية */
export async function fetchInternalNotes(projectId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'projects', projectId, 'private', 'notes'));
    return snap.exists() ? String((snap.data() as any)?.text || '') : '';
  } catch {
    return '';
  }
}

/**
 * بيحفظ المشروع.
 * بيكتب المستند كامل (من غير merge) عشان الخانة اللي تتفضّى تتفضّى فعلاً —
 * مع merge كانت القيمة القديمة بتفضل مكانها وتظهر تاني بعد الحفظ.
 * لو الكود اتغيّر، بيمسح المستند القديم عشان ما يبقاش عندنا نسختين.
 */
/* اللي بيدلّ على المشروع على طول: اسم المطور واللوكيشن والعنوان ورقم القطعة.
   دول بيتخزنوا في مستند جوّاني، مش في المستند العام —
   عشان إخفاؤهم من الشاشة مايبقاش كفاية والزائر يقراهم من الداتابيز. */
const PRIVATE_FIELDS = ['developer', 'developerTrackRecord', 'locationUrl', 'address', 'plotOrStreet'] as const;

export async function saveProject(p: Project, previousId?: string): Promise<void> {
  const id = projectDocId(p.code || p.id);
  if (!id) throw new Error('المشروع لازم يكون له كود');

  const { internalNotes, ...rest } = p;
  const publicData: any = { ...rest };
  const privateData: any = {};
  PRIVATE_FIELDS.forEach((k) => {
    if (publicData[k] !== undefined) { privateData[k] = publicData[k]; delete publicData[k]; }
  });

  await setDoc(doc(db, 'projects', id), cleanFirestoreData({ ...publicData, id, updatedAt: Date.now() }));
  await setDoc(doc(db, 'projects', id, 'private', 'notes'), cleanFirestoreData({ ...privateData, text: internalNotes || '', updatedAt: Date.now() }));

  const oldId = previousId || p.id;
  if (oldId && oldId !== id) {
    await deleteDoc(doc(db, 'projects', oldId, 'private', 'notes')).catch(() => {});
    await deleteDoc(doc(db, 'projects', oldId));
  }
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', id, 'private', 'notes')).catch(() => {});
  await deleteDoc(doc(db, 'projects', id));
}

/**
 * بيحفظ مجموعة مشاريع مرة واحدة (استيراد الإكسل).
 * بيحافظ على حالة "متخبّي" والترتيب بتوع المشروع القديم، لأن دول مش في الشيت.
 */
export async function saveProjects(list: Project[]): Promise<number> {
  const existing = await fetchProjects();
  const byId = new Map(existing.map((p) => [p.id, p]));

  let saved = 0;
  for (const p of list) {
    const id = projectDocId(p.code);
    const prev = byId.get(id);
    /* الشيت مفيهوش المطور واللوكيشن والملاحظات — بنجيبهم من المحفوظ
       ونسيبهم زي ما هما إلا لو الشيت جاب قيمة جديدة. من غير كده
       أي استيراد كان هيمسحهم. */
    const priv = prev ? await fetchProjectPrivate(id) : {};
    await saveProject({
      ...priv,
      ...p,
      developer: p.developer || priv.developer,
      locationUrl: p.locationUrl || priv.locationUrl,
      address: p.address || priv.address,
      plotOrStreet: p.plotOrStreet || priv.plotOrStreet,
      internalNotes: p.internalNotes || priv.internalNotes,
      hidden: prev?.hidden ?? p.hidden,
      order: prev?.order ?? p.order,
    });
    saved += 1;
  }
  return saved;
}

/* ---------- فلترة المشاريع ---------- */

export interface ProjectFilter {
  kind: 'all' | ProjectKind;
  neighborhood: string;       // 'all' أو اسم حي
  neighborhoods?: string[];   // اختيار متعدد — الفاضي معناه الكل
  maxDownPercent: 'all' | number;
  delivery: string;           // 'all' أو سنة
  maxPrice: 'all' | number;
  /* اللي العميل يقدر عليه — جاي من مكالمة الاكتشاف */
  maxMonthly?: 'all' | number;      // أعلى قسط شهري
  maxDownAmount?: 'all' | number;   // أعلى مقدم بالجنيه
}

export const EMPTY_PROJECT_FILTER: ProjectFilter = {
  kind: 'all', neighborhood: 'all', maxDownPercent: 'all', delivery: 'all', maxPrice: 'all',
  maxMonthly: 'all', maxDownAmount: 'all',
};

/** المشروع بيعدّي فلتر المقدم لو أي نظام من أنظمته في حدود المطلوب */
export function lowestDownPercent(p: Project): number | undefined {
  const values = (p.plans || []).map((pl) => pl.downPaymentPercent).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.min(...values) : undefined;
}

/** قيمة المقدم بالجنيه: مكتوبة، أو محسوبة من النسبة على السعر اللي بيبدأ منه */
export function planDownAmount(p: Project, pl: PaymentPlan): number | undefined {
  if (typeof pl.downPaymentAmount === 'number' && pl.downPaymentAmount > 0) return pl.downPaymentAmount;
  if (typeof pl.downPaymentPercent === 'number' && typeof p.startingPrice === 'number') {
    return (p.startingPrice * pl.downPaymentPercent) / 100;
  }
  return undefined;
}

/** القسط الشهري: مكتوب، أو من الربع سنوي ÷ ٣، أو محسوب من الباقي على السنين */
export function planMonthly(p: Project, pl: PaymentPlan): number | undefined {
  if (typeof pl.monthly === 'number' && pl.monthly > 0) return pl.monthly;
  if (typeof pl.quarterly === 'number' && pl.quarterly > 0) return pl.quarterly / 3;
  const down = planDownAmount(p, pl);
  if (typeof p.startingPrice === 'number' && typeof pl.years === 'number' && pl.years > 0 && down !== undefined) {
    const rest = p.startingPrice - down;
    if (rest > 0) return rest / (pl.years * 12);
  }
  return undefined;
}

/**
 * أنظمة السداد اللي العميل يقدر عليها فعلاً.
 * النظام بيعدّي لو قسطه ومقدمه الاتنين في حدوده — مش واحد منهم بس،
 * لأن اللي مقدمه قليل وقسطه عالي مش حل بالنسباله.
 */
export function affordablePlans(p: Project, f: ProjectFilter): PaymentPlan[] {
  const maxM = f.maxMonthly && f.maxMonthly !== 'all' ? f.maxMonthly : Infinity;
  const maxD = f.maxDownAmount && f.maxDownAmount !== 'all' ? f.maxDownAmount : Infinity;
  if (maxM === Infinity && maxD === Infinity) return p.plans || [];

  return (p.plans || []).filter((pl) => {
    const m = planMonthly(p, pl);
    const d = planDownAmount(p, pl);
    // اللي مش عارفين رقمه مبنستبعدوش — بنستبعد اللي متأكدين إنه أعلى
    if (m !== undefined && m > maxM) return false;
    if (d !== undefined && d > maxD) return false;
    return true;
  });
}

export function matchProject(p: Project, f: ProjectFilter): boolean {
  if (p.hidden) return false;
  if (f.kind !== 'all' && p.kind !== f.kind) return false;
  if (!passes(f.neighborhoods, f.neighborhood, p.neighborhood)) return false;
  if (f.delivery !== 'all' && p.deliveryDate !== f.delivery) return false;
  if (f.maxPrice !== 'all' && typeof p.startingPrice === 'number' && p.startingPrice > f.maxPrice) return false;
  if (f.maxDownPercent !== 'all') {
    const low = lowestDownPercent(p);
    if (low === undefined || low > f.maxDownPercent) return false;
  }
  // القسط والمقدم: المشروع بيعدّي لو فيه نظام واحد على الأقل يقدر عليه
  const wantsAfford = (f.maxMonthly && f.maxMonthly !== 'all') || (f.maxDownAmount && f.maxDownAmount !== 'all');
  if (wantsAfford && (p.plans || []).length && affordablePlans(p, f).length === 0) return false;
  return true;
}

export const countActiveProjectFilters = (f: ProjectFilter): number =>
  [f.kind !== 'all', !!(f.neighborhoods?.length) || f.neighborhood !== 'all', f.delivery !== 'all', f.maxPrice !== 'all', f.maxDownPercent !== 'all',
   !!f.maxMonthly && f.maxMonthly !== 'all', !!f.maxDownAmount && f.maxDownAmount !== 'all'].filter(Boolean).length;
