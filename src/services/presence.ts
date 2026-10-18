/*
  «إنت موجود؟» — تذكير عشوائي في ساعات الشغل.

  - كل ساعة شغل فيها تذكير واحد، في دقيقة عشوائية مختلفة لكل سيلز وكل يوم
    (محسوبة من اسمه والتاريخ — كل جهاز بيطلع نفس المواعيد من غير ما تتخزن).
  - السيلز لازم يدوس «موجود»، وبيتسجّل رد بعد قد إيه.
  - لو الموقع كان مقفول وقت التذكير، بيظهرله أول ما يفتح، والتأخير بيتحسب
    من الميعاد الأصلي. والتذكيرات اللي فاتت من غير رد بتتحسب «مارّدش».
  - الجمعة مفيش.
*/
import { collection, doc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { cairoDay } from './dailyTasks';

export interface PresenceCheck {
  id: string; agentId: string; agentName: string; day: string;
  slot: number; dueAt: number; answeredAt: number; delayMin: number;
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };

/** الوقت (ms) للساعة h والدقيقة m في يوم بتوقيت القاهرة */
function cairoTime(day: string, h: number, m: number): number {
  const [y, mo, d] = day.split('-').map(Number);
  let t = Date.UTC(y, mo - 1, d, h - 3, m);
  for (let i = 0; i < 2; i++) {
    const hh = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t))) % 24;
    t -= (hh - h) * 3600e3;
  }
  return t;
}

export const isFriday = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5; };

/** مواعيد التذكير لسيلز في يوم: واحد في كل ساعة شغل، في دقيقة عشوائية */
export function checkTimes(agentId: string, day: string, startHour: number, closeHour: number): { slot: number; dueAt: number }[] {
  if (isFriday(day)) return [];
  const out: { slot: number; dueAt: number }[] = [];
  for (let h = startHour; h < closeHour; h++) {
    out.push({ slot: h, dueAt: cairoTime(day, h, 3 + (hash(`${agentId}|${day}|${h}`) % 52)) });
  }
  return out;
}

export async function answerCheck(agentId: string, agentName: string, day: string, slot: number, dueAt: number) {
  const now = Date.now();
  const id = `${agentId}_${day}_${slot}`;
  await setDoc(doc(db, 'presence_checks', id), cleanFirestoreData({
    id, agentId, agentName, day, slot, dueAt, answeredAt: now, delayMin: Math.max(0, Math.round((now - dueAt) / 60000)),
  }));
}

export function subscribePresenceOfDay(day: string, cb: (l: PresenceCheck[]) => void, agentId?: string) {
  const q = agentId
    ? query(collection(db, 'presence_checks'), where('agentId', '==', agentId), where('day', '==', day))
    : query(collection(db, 'presence_checks'), where('day', '==', day));
  return onSnapshot(q, (s) => { const l: PresenceCheck[] = []; s.forEach((d) => l.push(d.data() as PresenceCheck)); cb(l); }, () => cb([]));
}

export interface PresenceSummary { due: number; answered: number; missed: number; waiting: boolean; avgDelay: number | null; lastAt: number | null }

/** ملخص يوم سيلز: كام تذكير جه وقته، رد على كام، ومتوسط سرعة رده */
export function summarize(agentId: string, day: string, startHour: number, closeHour: number, checks: PresenceCheck[], now = Date.now()): PresenceSummary {
  const sched = checkTimes(agentId, day, startHour, closeHour).filter((s) => s.dueAt <= now);
  const mine = checks.filter((c) => c.agentId === agentId && c.day === day);
  const answeredSlots = new Set(mine.map((c) => c.slot));
  const unanswered = sched.filter((s) => !answeredSlots.has(s.slot));
  /* آخر تذكير لسه مارّدش عليه ومافيش بعده = «مستني»، مش «مارّدش» */
  const last = sched[sched.length - 1];
  const waiting = !!last && !answeredSlots.has(last.slot) && cairoDay(now) === day;
  const delays = mine.map((c) => c.delayMin);
  return {
    due: sched.length,
    answered: mine.length,
    missed: unanswered.length - (waiting ? 1 : 0),
    waiting,
    avgDelay: delays.length ? Math.round(delays.reduce((s, x) => s + x, 0) / delays.length) : null,
    lastAt: mine.length ? Math.max(...mine.map((c) => c.answeredAt)) : null,
  };
}
