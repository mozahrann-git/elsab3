/*
  خدمات بوابات الملاك والبروكرز ومسؤولة الملاك.
  كل البيانات اللي المالك أو البروكر بيشوفها متخزنة في collections منفصلة "نضيفة"
  مفيهاش رقم العميل ولا رقم السيلز، عشان القواعد تقدر تحميها صح.

  unit_viewings/{id}   معاينة على وحدة (المالك بيأكدها، والبروكر بيأكدها مع المالك)
  owner_feedback/{id}  رأي العميل بعد المعاينة، منشور للمالك من سارة
  change_requests/{id} طلب تعديل سعر/صور/إيقاف من المالك أو البروكر
*/
import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where, arrayUnion, getDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, cleanFirestoreData, savePropertyPrivateOwner } from './firebaseService';

export type OwnerViewingStatus = 'pending' | 'confirmed' | 'reschedule' | 'done' | 'canceled';

export interface UnitViewing {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  brokerId?: string;
  scheduledText: string;          // مثال: "بكرة الأحد 6:00 مساءً"
  clientNote?: string;            // وصف عام للعميل من غير اسم ولا رقم
  ownerStatus: OwnerViewingStatus;
  ownerNote?: string;
  ownerRespondedAt?: number;
  notifyCount: number;
  lastNotifiedAt: number;
  brokerStatus?: 'pending' | 'messaged' | 'confirmed';
  brokerConfirmedTime?: string;
  brokerConfirmedAt?: number;
  sourceRequestId?: string;
  scheduledAt?: number;            // الوقت بالظبط
  salesAgentId?: string;           // السيلز اللي طلب المعاينة (الفيدباك يرجعله)
  salesAgentName?: string;
  ownerName?: string;
  createdAt: number;
}

export interface OwnerFeedback {
  id: string;
  propertyCode: string;
  brokerId?: string;
  date: string;
  rating: number;                 // 1..5
  summary: string;
  positives: string[];
  negatives: string[];
  priceFeedback?: 'fair' | 'slightly_high' | 'overpriced' | 'bargain';
  publishedAt: number;
  sourceFeedbackId?: string;
}

export type ChangeType = 'price' | 'photos' | 'pause' | 'resume';
export interface ChangeRequest {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  requesterEmail: string;
  requesterRole: 'owner' | 'broker';
  brokerId?: string;
  type: ChangeType;
  oldPrice?: number;
  newPrice?: number;
  images?: string[];
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

const me = () => (auth.currentUser?.email || '').toLowerCase();

// ---------- الاشتراكات ----------
function listen<T>(q: any, cb: (list: T[]) => void, sortKey: keyof T = 'createdAt' as keyof T) {
  return onSnapshot(q, (snap: any) => {
    const list: T[] = [];
    snap.forEach((d: any) => list.push({ id: d.id, ...d.data() } as T));
    list.sort((a: any, b: any) => (b[sortKey] || 0) - (a[sortKey] || 0));
    cb(list);
  }, (err: any) => { console.warn('[Portal] listen error:', err?.code || err); cb([]); });
}

/** المالك: معايناته وآراؤه بأكواد وحداته */
function byCodes<T extends { id: string }>(col: string, codes: string[], cb: (l: T[]) => void, sortKey: string) {
  // استعلام لكل كود (==) عشان قواعد الأمان تقدر تتحقق منه، وبعدين بندمجهم
  if (!codes.length) { cb([]); return () => {}; }
  const parts: Record<string, T[]> = {};
  const unsubs = codes.slice(0, 30).map((c) => listen<T>(query(collection(db, col), where('propertyCode', '==', c)), (l) => {
    parts[c] = l;
    const all = Object.values(parts).flat();
    all.sort((a: any, b: any) => (b[sortKey] || 0) - (a[sortKey] || 0));
    cb(all);
  }, sortKey as any));
  return () => unsubs.forEach((u) => u());
}
export function subscribeViewingsByCodes(codes: string[], cb: (l: UnitViewing[]) => void) {
  return byCodes<UnitViewing>('unit_viewings', codes, cb, 'createdAt');
}
export function subscribeFeedbackByCodes(codes: string[], cb: (l: OwnerFeedback[]) => void) {
  return byCodes<OwnerFeedback>('owner_feedback', codes, cb, 'publishedAt');
}
/** البروكر: بالـ brokerId */
export function subscribeViewingsByBroker(brokerId: string, cb: (l: UnitViewing[]) => void) {
  return listen<UnitViewing>(query(collection(db, 'unit_viewings'), where('brokerId', '==', brokerId)), cb);
}
export function subscribeFeedbackByBroker(brokerId: string, cb: (l: OwnerFeedback[]) => void) {
  return listen<OwnerFeedback>(query(collection(db, 'owner_feedback'), where('brokerId', '==', brokerId)), cb, 'publishedAt');
}
export function subscribeMyChangeRequests(cb: (l: ChangeRequest[]) => void) {
  return listen<ChangeRequest>(query(collection(db, 'change_requests'), where('requesterEmail', '==', me())), cb);
}
export function subscribeMySubmissions(cb: (l: any[]) => void) {
  return listen<any>(query(collection(db, 'owner_submissions'), where('ownerEmail', '==', me())), cb, 'submittedAtMs' as any);
}
/** سارة والأدمن: كل حاجة */
export function subscribeAllUnitViewings(cb: (l: UnitViewing[]) => void) {
  return listen<UnitViewing>(collection(db, 'unit_viewings'), cb);
}
export function subscribeAllChangeRequests(cb: (l: ChangeRequest[]) => void) {
  return listen<ChangeRequest>(collection(db, 'change_requests'), cb);
}
export function subscribeAllOwnerFeedback(cb: (l: OwnerFeedback[]) => void) {
  return listen<OwnerFeedback>(collection(db, 'owner_feedback'), cb, 'publishedAt');
}

// ---------- المالك ----------
export async function respondToViewing(id: string, status: 'confirmed' | 'reschedule', note?: string) {
  await updateDoc(doc(db, 'unit_viewings', id), cleanFirestoreData({ ownerStatus: status, ownerNote: note || '', ownerRespondedAt: Date.now() }));
}

export async function createChangeRequest(r: Omit<ChangeRequest, 'id' | 'status' | 'createdAt' | 'requesterEmail'>) {
  const id = `cr-${Date.now()}`;
  await setDoc(doc(db, 'change_requests', id), cleanFirestoreData({ ...r, id, requesterEmail: me(), status: 'pending', createdAt: Date.now() }));
}

/** حساب جديد من فورم "اعرض شقتك": المالك تحت @owner.com والبروكر تحت @broker.com، وبيسجّل دخول على طول */
export const PORTAL_DOMAIN = { owner: 'owner.com', broker: 'broker.com' } as const;
export const cleanUsername = (u: string) => u.trim().toLowerCase().replace(/@.*$/, '').replace(/[^a-z0-9._-]/g, '');

export async function registerPortalAccount(role: 'owner' | 'broker', username: string, password: string, name: string, phone: string) {
  const user = cleanUsername(username);
  if (user.length < 3) throw new Error('اسم المستخدم لازم 3 حروف إنجليزي أو أرقام على الأقل');
  const email = `${user}@${PORTAL_DOMAIN[role]}`;
  const cred = await createUserWithEmailAndPassword(auth, email, password.trim());
  await setDoc(doc(db, 'staff_access', email), cleanFirestoreData({
    role, name, phone, password: password.trim(), propertyCodes: [],
    ...(role === 'broker' ? { brokerId: user } : {}),
    selfRegistered: true, updatedAt: new Date().toISOString(),
  }));
  return { user: cred.user, email, brokerId: role === 'broker' ? user : undefined };
}

// ---------- فيدباك البروكر: بيشوفه السيلز اللي طلب المعاينة والأدمن بس ----------
export interface BrokerFeedback {
  id: string; viewingId: string; propertyCode: string; propertyTitle: string;
  brokerId: string; brokerName: string; salesAgentId: string; salesAgentName?: string;
  rating: number; text: string; createdAt: number;
}
export async function saveBrokerFeedback(f: Omit<BrokerFeedback, 'id' | 'createdAt'>) {
  const id = `bf-${f.viewingId}`;
  await setDoc(doc(db, 'broker_feedback', id), cleanFirestoreData({ ...f, id, createdAt: Date.now() }));
}
export function subscribeBrokerFeedbackForSales(agentId: string | null, all: boolean, cb: (l: BrokerFeedback[]) => void) {
  const q = all ? collection(db, 'broker_feedback') : query(collection(db, 'broker_feedback'), where('salesAgentId', '==', agentId || '-'));
  return listen<BrokerFeedback>(q, cb);
}
export function subscribeMyBrokerFeedback(brokerId: string, cb: (l: BrokerFeedback[]) => void) {
  return listen<BrokerFeedback>(query(collection(db, 'broker_feedback'), where('brokerId', '==', brokerId)), cb);
}

// ---------- البروكر ----------
export async function brokerSaveOwnerPhone(propertyId: string, ownerName: string, ownerPhone: string, brokerId: string) {
  await savePropertyPrivateOwner(propertyId, { ownerName, ownerPhone, brokerId });
}
export async function brokerMarkMessaged(viewingId: string) {
  await updateDoc(doc(db, 'unit_viewings', viewingId), { brokerStatus: 'messaged' });
}
export async function brokerConfirmViewing(viewingId: string, time: string) {
  await updateDoc(doc(db, 'unit_viewings', viewingId), {
    brokerStatus: 'confirmed', brokerConfirmedTime: time, brokerConfirmedAt: Date.now(), ownerStatus: 'confirmed',
  });
}

// ---------- سارة (مسؤولة الملاك) والأدمن ----------
export async function createUnitViewing(v: Omit<UnitViewing, 'id' | 'createdAt' | 'notifyCount' | 'lastNotifiedAt' | 'ownerStatus'>) {
  const id = v.sourceRequestId ? `uv-${v.sourceRequestId}` : `uv-${Date.now()}`;
  await setDoc(doc(db, 'unit_viewings', id), cleanFirestoreData({
    ...v, id, ownerStatus: 'pending', brokerStatus: v.brokerId ? 'pending' : undefined,
    notifyCount: 1, lastNotifiedAt: Date.now(), createdAt: Date.now(),
  }), { merge: true });
  return id;
}
export async function renotifyOwner(v: UnitViewing) {
  await updateDoc(doc(db, 'unit_viewings', v.id), { notifyCount: (v.notifyCount || 0) + 1, lastNotifiedAt: Date.now() });
}
export async function setViewingStatus(id: string, ownerStatus: OwnerViewingStatus) {
  await updateDoc(doc(db, 'unit_viewings', id), { ownerStatus });
}
export async function publishFeedback(f: Omit<OwnerFeedback, 'id' | 'publishedAt'>) {
  const id = f.sourceFeedbackId ? `of-${f.sourceFeedbackId}` : `of-${Date.now()}`;
  await setDoc(doc(db, 'owner_feedback', id), cleanFirestoreData({ ...f, id, publishedAt: Date.now() }));
}
export async function resolveChangeRequest(r: ChangeRequest, approve: boolean) {
  if (approve) {
    const updates: Record<string, any> = {};
    if (r.type === 'price' && r.newPrice) updates.price = r.newPrice;
    if (r.type === 'photos' && r.images?.length) updates.images = r.images;
    if (r.type === 'pause') updates.viewingsPaused = true;
    if (r.type === 'resume') updates.viewingsPaused = false;
    if (r.type === 'price' && r.newPrice) {
      const snap = await getDoc(doc(db, 'properties', r.propertyId));
      const area = (snap.data() as any)?.area;
      if (area) updates.pricePerMeter = Math.round(r.newPrice / area);
    }
    if (Object.keys(updates).length) await updateDoc(doc(db, 'properties', r.propertyId), updates);
  }
  await updateDoc(doc(db, 'change_requests', r.id), { status: approve ? 'approved' : 'rejected', resolvedAt: Date.now(), resolvedBy: me() });
}
/** ربط وحدة بمالكها بعد الموافقة على عرضها */
export async function linkPropertyToOwner(ownerEmail: string, code: string) {
  await updateDoc(doc(db, 'staff_access', ownerEmail.toLowerCase()), { propertyCodes: arrayUnion(code) });
}

// ============================================================
// مندوبين المعاينات (الخمس شباب) + مشاوير المعاينة + الفيدباك
// ============================================================
export interface FieldAgent {
  id: string; name: string; phone: string; active: boolean;
  viewingsCount: number; feedbackCount: number; lastAssignedAt: number; createdAt: number;
}
export interface TripUnit { propertyId: string; code: string; title: string; link: string; location?: string; brokerId?: string; salesAgentId?: string; salesAgentName?: string }
export interface FieldTrip {
  id: string;                       // نفس الـ id هو التوكن في لينك الفيدباك
  agentId: string; agentName: string; agentPhone: string;
  units: TripUnit[]; timeText: string; viewingIds?: string[];
  status: 'sent' | 'done'; createdAt: number;
}
export type FeedbackStage = 'submitted' | 'sara_confirmed' | 'sales_confirmed' | 'rejected';
export interface FieldFeedback {
  id: string; tripId: string; agentId: string; agentName: string;
  propertyId: string; code: string; title: string; brokerId?: string;
  text: string; voiceUrl?: string; rating: number; positives: string[]; negatives: string[];
  stage: FeedbackStage; createdAt: number; saraAt?: number; salesAt?: number; salesBy?: string;
  salesAgentId?: string; salesAgentName?: string;
}

export function subscribeFieldAgents(cb: (l: FieldAgent[]) => void) {
  return onSnapshot(collection(db, 'field_agents'), (snap) => {
    const l: FieldAgent[] = []; snap.forEach((d) => l.push({ id: d.id, ...(d.data() as any) }));
    l.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); cb(l);
  }, () => cb([]));
}
export async function saveFieldAgent(a: Partial<FieldAgent> & { name: string; phone: string }) {
  const id = a.id || `fa-${Date.now()}`;
  await setDoc(doc(db, 'field_agents', id), cleanFirestoreData({
    viewingsCount: 0, feedbackCount: 0, lastAssignedAt: 0, createdAt: Date.now(), active: true, ...a, id,
  }), { merge: true });
}
/** الدور: أقدم واحد طلع معاينة من النشطين */
export function nextInLine(agents: FieldAgent[]) {
  const act = agents.filter((a) => a.active !== false);
  if (!act.length) return { next: undefined, last: undefined };
  const sorted = [...act].sort((a, b) => (a.lastAssignedAt || 0) - (b.lastAssignedAt || 0));
  const last = [...act].sort((a, b) => (b.lastAssignedAt || 0) - (a.lastAssignedAt || 0))[0];
  return { next: sorted[0], last: last.lastAssignedAt ? last : undefined };
}
export async function createTrip(agent: FieldAgent, units: TripUnit[], timeText: string, viewingIds: string[] = []) {
  const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, 'field_trips', id), cleanFirestoreData({
    id, agentId: agent.id, agentName: agent.name, agentPhone: agent.phone, units, timeText, viewingIds, status: 'sent', createdAt: Date.now(),
  }));
  await updateDoc(doc(db, 'field_agents', agent.id), { lastAssignedAt: Date.now(), viewingsCount: (agent.viewingsCount || 0) + units.length });
  return id;
}
export function subscribeTrips(cb: (l: FieldTrip[]) => void) { return listen<FieldTrip>(collection(db, 'field_trips'), cb); }
export async function getTrip(id: string): Promise<FieldTrip | null> {
  const s = await getDoc(doc(db, 'field_trips', id)); return s.exists() ? (s.data() as FieldTrip) : null;
}
/** المندوب بيبعت الفيدباك من اللينك (من غير تسجيل دخول) */
export async function submitFieldFeedback(trip: FieldTrip, u: TripUnit, data: { text: string; voiceUrl?: string; rating: number; positives: string[]; negatives: string[] }) {
  const id = `ff-${trip.id}-${u.code}`.replace(/[^\w-]/g, '_');
  await setDoc(doc(db, 'field_feedback', id), cleanFirestoreData({
    id, tripId: trip.id, agentId: trip.agentId, agentName: trip.agentName, propertyId: u.propertyId, code: u.code, title: u.title,
    brokerId: u.brokerId, salesAgentId: u.salesAgentId, salesAgentName: u.salesAgentName, ...data, stage: 'submitted', createdAt: Date.now(),
  }));
}
export function subscribeFieldFeedback(cb: (l: FieldFeedback[]) => void) { return listen<FieldFeedback>(collection(db, 'field_feedback'), cb); }
export async function saraConfirmFeedback(f: FieldFeedback, edits: Partial<FieldFeedback>) {
  await updateDoc(doc(db, 'field_feedback', f.id), cleanFirestoreData({ ...edits, stage: 'sara_confirmed', saraAt: Date.now() }));
}
export async function rejectFeedback(f: FieldFeedback) { await updateDoc(doc(db, 'field_feedback', f.id), { stage: 'rejected' }); }
/** السيلز بيأكد، فيتنشر للمالك ويتحسب للمندوب */
export async function salesConfirmFeedback(f: FieldFeedback, agents: FieldAgent[]) {
  await updateDoc(doc(db, 'field_feedback', f.id), { stage: 'sales_confirmed', salesAt: Date.now(), salesBy: me() });
  await publishFeedback({
    propertyCode: f.code, brokerId: f.brokerId, date: new Date(f.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }),
    rating: f.rating, summary: f.text, positives: f.positives || [], negatives: f.negatives || [], sourceFeedbackId: f.id,
  });
  const a = agents.find((x) => x.id === f.agentId);
  if (a) await updateDoc(doc(db, 'field_agents', a.id), { feedbackCount: (a.feedbackCount || 0) + 1 });
}
