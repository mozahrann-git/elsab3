/*
  أدوات السيلز: مكالمة الاكتشاف، العرض المخصوص، الإعلانات واللينكات المتتبّعة،
  ورشة المحتوى ومواعيد التصوير. كله مربوط بملف العميل وبالمتابعات.
*/
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, increment, deleteDoc } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from './firebaseService';

// ---------------- الإعدادات اللي الأدمن بيعدّلها ----------------
export interface DiscoveryQuestion {
  id: string; label: string; type: 'chips' | 'range' | 'number' | 'text' | 'multi';
  options?: string[]; required?: boolean;
}
export interface AdField { id: string; label: string; hint: string; example: string; required?: boolean }
export interface SalesForms {
  discovery: DiscoveryQuestion[];
  adFields: AdField[];
  minAnswers: number;
  offerUnits: number;
  offerHours: number;
  videosPerWeek: number;
}
export const DEFAULT_FORMS: SalesForms = {
  minAnswers: 5, offerUnits: 5, offerHours: 72, videosPerWeek: 2,
  discovery: [
    { id: 'budget', label: 'ميزانيته', type: 'range', required: true },
    { id: 'payment', label: 'كاش ولا تقسيط', type: 'chips', options: ['كاش', 'تقسيط', 'الاتنين'], required: true },
    { id: 'purpose', label: 'ساكن ولا مستثمر', type: 'chips', options: ['ساكن', 'مستثمر'], required: true },
    { id: 'districts', label: 'الحي', type: 'multi', required: true },
    { id: 'rooms', label: 'الغرف', type: 'chips', options: ['2', '3', '4+'], required: false },
    { id: 'finishing', label: 'التشطيب', type: 'chips', options: ['متشطبة', 'نص تشطيب', 'الاتنين'], required: false },
    { id: 'urgency', label: 'محتاجها إمتى', type: 'chips', options: ['دلوقتي', 'خلال شهر', 'بيدوّر بس'], required: true },
  ],
  adFields: [
    { id: 'hook', label: 'الجملة الأولى — أوقفه عن السكرول', hint: 'ابدأ برقم أو حاجة غريبة، متبدأش بـ «للبيع شقة»', example: 'مش كل شقة في التالت ليها تراس بالمنظر ده.', required: true },
    { id: 'edge', label: 'الميزة اللي محدش هيلاقيها في غيرها', hint: 'اكتب اللي شوفته بعينك ومش موجود في الصور', example: 'الأسانسير جديد والعمارة كلها مُلّاك.' },
    { id: 'flaw', label: 'العيب قبل ما يكتشفه', hint: 'العيب بيبني ثقة وبيمنع معاينة فاشلة', example: 'الشارع ضيق شوية، بس الجراج تحتها.' },
    { id: 'price', label: 'السعر وليه هو منطقي', hint: 'الرقم ده محسوب لك تلقائياً من بيانات الحي', example: '3.2 مليون · 22 ألف للمتر · أقل من متوسط الحي 7%' },
    { id: 'question', label: 'السؤال اللي يخلّيهم يردوا', hint: 'السؤال بيجيب تعليقات، والتعليقات بتجيب ناس', example: 'تفضل دور أعلى ولا مساحة أكبر؟', required: true },
  ],
};
export function subscribeSalesForms(cb: (f: SalesForms) => void) {
  return onSnapshot(doc(db, 'site_config', 'sales_forms'), (s) => {
    const d = s.data() as Partial<SalesForms> | undefined;
    cb({ ...DEFAULT_FORMS, ...(d || {}) });
  }, () => cb(DEFAULT_FORMS));
}
export async function saveSalesForms(f: Partial<SalesForms>) {
  await setDoc(doc(db, 'site_config', 'sales_forms'), cleanFirestoreData(f), { merge: true });
}

// ---------------- العرض المخصوص ----------------
export interface OfferUnit { propertyId: string; code: string; title: string; price: number; image?: string; note?: string }
export interface Offer {
  id: string; leadId: string; leadName: string; agentId: string; agentName: string; agentPhone?: string;
  intro?: string; voiceUrl?: string; question?: string; units: OfferUnit[];
  createdAt: number; expiresAt: number; openCount: number; lastOpenAt?: number; unitViews?: Record<string, number>;
  status: 'sent' | 'replied' | 'closed';
}
const rid = () => Math.random().toString(36).slice(2, 8);
export async function saveOffer(o: Omit<Offer, 'id' | 'createdAt' | 'openCount' | 'status'>) {
  const id = `of${Date.now().toString(36)}${rid()}`;
  await setDoc(doc(db, 'offers', id), cleanFirestoreData({ ...o, id, createdAt: Date.now(), openCount: 0, status: 'sent' }));
  return id;
}
export async function getOffer(id: string): Promise<Offer | null> {
  const s = await getDoc(doc(db, 'offers', id));
  return s.exists() ? (s.data() as Offer) : null;
}
/** فتح العرض بيتسجل (من غير تسجيل دخول) */
export async function logOfferOpen(id: string, code?: string) {
  const data: any = { openCount: increment(1), lastOpenAt: Date.now() };
  if (code) data[`unitViews.${code}`] = increment(1);
  await updateDoc(doc(db, 'offers', id), data).catch(() => {});
}
export function subscribeOffersByAgent(agentId: string | null, all: boolean, cb: (l: Offer[]) => void) {
  const q = all ? collection(db, 'offers') : query(collection(db, 'offers'), where('agentId', '==', agentId || '-'));
  return onSnapshot(q, (snap) => {
    const l: Offer[] = []; snap.forEach((d) => l.push(d.data() as Offer));
    l.sort((a, b) => b.createdAt - a.createdAt); cb(l);
  }, () => cb([]));
}

// ---------------- اللينكات المتتبّعة ----------------
export interface TrackedLink {
  id: string; agentId: string; agentName: string; kind: 'ad' | 'video' | 'offer';
  code?: string; target: string; title?: string; adText?: string;
  createdAt: number; hits: number; waClicks: number;
}
export async function createTrackedLink(l: Omit<TrackedLink, 'id' | 'createdAt' | 'hits' | 'waClicks'>) {
  const id = `${(l.agentName || 'x').replace(/\s+/g, '').slice(0, 6).toLowerCase()}${rid()}`;
  await setDoc(doc(db, 'tracked_links', id), cleanFirestoreData({ ...l, id, createdAt: Date.now(), hits: 0, waClicks: 0 }));
  return id;
}
export async function getTrackedLink(id: string): Promise<TrackedLink | null> {
  const s = await getDoc(doc(db, 'tracked_links', id));
  return s.exists() ? (s.data() as TrackedLink) : null;
}
export async function logLinkHit(id: string, wa = false) {
  await updateDoc(doc(db, 'tracked_links', id), wa ? { waClicks: increment(1) } : { hits: increment(1) }).catch(() => {});
}
export function subscribeLinks(agentId: string | null, all: boolean, cb: (l: TrackedLink[]) => void) {
  const q = all ? collection(db, 'tracked_links') : query(collection(db, 'tracked_links'), where('agentId', '==', agentId || '-'));
  return onSnapshot(q, (snap) => {
    const l: TrackedLink[] = []; snap.forEach((d) => l.push(d.data() as TrackedLink));
    l.sort((a, b) => b.createdAt - a.createdAt); cb(l);
  }, () => cb([]));
}
export const linkUrl = (id: string) => `${window.location.origin}/?t=${id}`;
export const adTagOf = (agentName: string, code: string) => `S-${(agentName || '').split(' ')[0].toUpperCase()}-${code}`;

// ---------------- ورشة المحتوى ومواعيد التصوير ----------------
export interface ContentSlot {
  id: string; weekKey: string; agentId: string; agentName: string;
  propertyId: string; code: string; title: string;
  script?: { hook?: string; points?: string; question?: string };
  shoot?: { dates: string[]; status: 'requested' | 'confirmed' | 'shot' | 'delivered'; at?: string; crew?: string; finalUrl?: string };
  publishedAt?: number; platform?: string; linkId?: string;
  stats?: { views?: number; linkHits?: number; leads?: number };
  createdAt: number;
}
export const weekKey = (d = new Date()) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); // الأسبوع بيبدأ السبت
  return x.toISOString().slice(0, 10);
};
export function subscribeSlots(cb: (l: ContentSlot[]) => void) {
  return onSnapshot(collection(db, 'content_slots'), (snap) => {
    const l: ContentSlot[] = []; snap.forEach((d) => l.push(d.data() as ContentSlot));
    l.sort((a, b) => b.createdAt - a.createdAt); cb(l);
  }, () => cb([]));
}
export async function claimSlot(s: Omit<ContentSlot, 'id' | 'createdAt'>) {
  const id = `${s.weekKey}_${s.agentId}_${s.code}`;
  await setDoc(doc(db, 'content_slots', id), cleanFirestoreData({ ...s, id, createdAt: Date.now() }), { merge: true });
  return id;
}
export async function updateSlot(id: string, data: Partial<ContentSlot>) {
  await updateDoc(doc(db, 'content_slots', id), cleanFirestoreData(data) as any);
}
export async function deleteSlot(id: string) { await deleteDoc(doc(db, 'content_slots', id)); }
