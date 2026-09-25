/*
  تتبّع الزوار الحقيقي: كل جهاز له معرّف ثابت، وكل زيارة بتتسجل في قاعدة البيانات
  ومعاها المصدر (أنهي إعلان/لينك)، فنعرف كام زائر مختلف فعلاً مش كام فتحة.
*/
import { collection, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';

const KEY = 'lion_visitor_id';
export function visitorId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) { v = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem(KEY, v); }
    return v;
  } catch { return 'v_anon'; }
}

export interface UnitVisit {
  id: string; propertyId: string; code: string; visitor: string;
  source?: string;          // لينك متتبّع أو إعلان
  agentId?: string;         // صاحب اللينك
  at: number; day: string;
  seconds?: number; sawVideo?: boolean; requested?: boolean;
}

const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** زيارة واحدة لكل زائر لكل وحدة في اليوم */
export async function logVisit(propertyId: string, code: string, extra: Partial<UnitVisit> = {}) {
  const v = visitorId();
  const id = `${propertyId}_${v}_${dayOf()}`;
  await setDoc(doc(db, 'unit_visits', id), cleanFirestoreData({
    id, propertyId, code, visitor: v, at: Date.now(), day: dayOf(), ...extra,
  }), { merge: true }).catch(() => {});
  return id;
}
export async function markVisit(propertyId: string, data: Partial<UnitVisit>) {
  const id = `${propertyId}_${visitorId()}_${dayOf()}`;
  await setDoc(doc(db, 'unit_visits', id), cleanFirestoreData(data), { merge: true }).catch(() => {});
}

export function subscribeVisits(cb: (l: UnitVisit[]) => void) {
  return onSnapshot(collection(db, 'unit_visits'), (snap) => {
    const l: UnitVisit[] = []; snap.forEach((d) => l.push(d.data() as UnitVisit));
    l.sort((a, b) => b.at - a.at); cb(l);
  }, () => cb([]));
}
export async function visitsOfProperty(propertyId: string): Promise<UnitVisit[]> {
  try {
    const snap = await getDocs(query(collection(db, 'unit_visits'), where('propertyId', '==', propertyId)));
    const l: UnitVisit[] = []; snap.forEach((d) => l.push(d.data() as UnitVisit));
    return l;
  } catch { return []; }
}

/** ملخص وحدة: زوار مختلفين، زيارات، طلبات، ومن فين جم */
export function summarize(visits: UnitVisit[]) {
  const uniq = new Set(visits.map((v) => v.visitor));
  const sources: Record<string, number> = {};
  visits.forEach((v) => { const k = v.source || 'مباشر'; sources[k] = (sources[k] || 0) + 1; });
  return {
    visitors: uniq.size,
    visits: visits.length,
    requests: visits.filter((v) => v.requested).length,
    videoViews: visits.filter((v) => v.sawVideo).length,
    lastAt: visits[0]?.at,
    sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
  };
}
