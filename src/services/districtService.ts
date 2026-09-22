/*
  محتوى دليل الأحياء: الأرقام بتتحسب لوحدها من الشقق المعروضة،
  والكلام (المحاور، الخدمات، المميزات...) الأدمن بيكتبه ويعدّله من صفحة الحي.
*/
import { doc, onSnapshot, setDoc, collection } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { Property } from '../types';

export interface DistrictContent {
  name: string;
  tagline?: string;       // جملة واحدة بتلخص الحي
  about?: string;         // فقرة
  coverImage?: string;
  bestFor?: string[];     // مناسب لـ
  roads?: string[];       // المحاور والشوارع
  services?: string[];    // مدارس، مستشفيات، أسواق
  pros?: string[];
  watchOut?: string[];    // خلي بالك من
  hidden?: boolean;
  order?: number;
  updatedAt?: number;
}

export const slugOf = (name: string) => name.replace(/\s+/g, '_');

export function subscribeDistrictContent(cb: (map: Record<string, DistrictContent>) => void) {
  return onSnapshot(collection(db, 'district_guides'), (snap) => {
    const m: Record<string, DistrictContent> = {};
    snap.forEach((d) => { const v = d.data() as DistrictContent; m[v.name] = v; });
    cb(m);
  }, () => cb({}));
}

export async function saveDistrictContent(c: DistrictContent) {
  await setDoc(doc(db, 'district_guides', slugOf(c.name)), cleanFirestoreData({ ...c, updatedAt: Date.now() }), { merge: true });
}

export interface DistrictStats {
  name: string;
  count: number;
  avgPpm: number;
  avgPpmFinished: number;
  avgPpmSemi: number;
  minPrice: number;
  maxPrice: number;
  finishedCount: number;
  semiCount: number;
  rooms: Record<string, number>;
  cover?: string;
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function computeDistrictStats(names: string[], properties: Property[]): DistrictStats[] {
  const resale = properties.filter((p) => p.category !== 'off_plan' && p.area > 0 && p.price > 0 && !(p as any).viewingsPaused);
  return names.map((name) => {
    const list = resale.filter((p) => p.neighborhood === name);
    const ppm = (p: Property) => p.price / p.area;
    const fin = list.filter((p) => p.finishing === 'finished');
    const semi = list.filter((p) => p.finishing === 'semi_finished');
    const rooms: Record<string, number> = {};
    list.forEach((p) => { const k = (p.bedrooms || 0) >= 4 ? '4+' : String(p.bedrooms || 0); rooms[k] = (rooms[k] || 0) + 1; });
    return {
      name, count: list.length,
      avgPpm: avg(list.map(ppm)), avgPpmFinished: avg(fin.map(ppm)), avgPpmSemi: avg(semi.map(ppm)),
      minPrice: list.length ? Math.min(...list.map((p) => p.price)) : 0,
      maxPrice: list.length ? Math.max(...list.map((p) => p.price)) : 0,
      finishedCount: fin.length, semiCount: semi.length, rooms,
      cover: list.find((p) => p.images?.[0])?.images[0],
    };
  });
}
