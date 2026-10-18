/*
  «دفتري» — دفتر الإدارة: أي حاجة بتيجي في نص اليوم وبتتنسي.
  عميل قابلك في المكتب، فرصة برّه المنطقة، فكرة، مهمة افتكرتها.
  ليها «فكّرني» اختياري، والمستحق بيظهر فوق في الـCRM لحد ما يتقفل.
  الإدارة بس اللي بتقرا وتكتب (قواعد owner_notes).
*/
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';

export type NoteKind = 'client' | 'deal' | 'idea' | 'task';
export const NOTE_KINDS: { id: NoteKind; label: string; emoji: string }[] = [
  { id: 'task', label: 'مهمة', emoji: '✅' },
  { id: 'client', label: 'عميل', emoji: '👤' },
  { id: 'deal', label: 'فرصة', emoji: '💼' },
  { id: 'idea', label: 'فكرة', emoji: '💡' },
];

export interface OwnerNote {
  id: string; kind: NoteKind; text: string;
  name?: string; phone?: string; place?: string;
  remindAt?: number; done?: boolean; doneAt?: number;
  leadId?: string;                 // لو اتحوّل عميل في الـCRM
  createdAt: number; by?: string;
}

export function subscribeNotes(cb: (l: OwnerNote[]) => void, onErr?: (e: any) => void) {
  return onSnapshot(collection(db, 'owner_notes'), (s) => {
    const l: OwnerNote[] = []; s.forEach((d) => l.push(d.data() as OwnerNote));
    l.sort((a, b) => b.createdAt - a.createdAt); cb(l);
  }, (e) => { cb([]); onErr?.(e); });
}
export async function saveNote(n: Omit<OwnerNote, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
  const id = n.id || `note_${Date.now()}`;
  await setDoc(doc(db, 'owner_notes', id), cleanFirestoreData({ ...n, id, createdAt: n.createdAt || Date.now() }), { merge: true });
  return id;
}
export const updateNote = (id: string, d: Partial<OwnerNote>) => updateDoc(doc(db, 'owner_notes', id), cleanFirestoreData(d) as any);
export const deleteNote = (id: string) => deleteDoc(doc(db, 'owner_notes', id));

export const isDue = (n: OwnerNote, now = Date.now()) => !n.done && !!n.remindAt && n.remindAt <= now;
