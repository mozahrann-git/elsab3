/* إعدادات لوحة السيلز اللي الأدمن بيعدّلها: الطلب العاجل وتحديات اليوم */
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { DailyQuest } from '../types';

export interface CrmBanner { active: boolean; title: string; subtitle: string; bonus: string }
export interface CrmBoard { banner?: CrmBanner; quests?: DailyQuest[] }

export function subscribeCrmBoard(cb: (b: CrmBoard) => void) {
  return onSnapshot(doc(db, 'site_config', 'crm_board'), (s) => cb((s.data() as CrmBoard) || {}), () => cb({}));
}
export async function saveCrmBoard(b: CrmBoard) {
  await setDoc(doc(db, 'site_config', 'crm_board'), cleanFirestoreData(b), { merge: true });
}
export async function deleteLeadFromDb(id: string) {
  await deleteDoc(doc(db, 'crm_leads', id));
}
