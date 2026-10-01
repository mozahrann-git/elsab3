import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { DailyQuest } from '../types';

/*
  سجل المهام.

  قبل كده: المهمة كانت عدّاد أعمى — "+1" وخلاص. مكانش فيه طريقة تعرف
  المكالمات دي راحت فين، ولا الإعلانات اتنشرت على إيه.

  دلوقتي كل تسجيلة بتتخزن بتفاصيلها:
    المكالمة  → ردّ ولا مردّش، طلع ريكويست ولا مش مهتم
    الإعلان   → على أنهي منصة، ومعاه سكرين شوت

  فالإدارة تقدر تقيس الكواليتي، مش الكمية بس.
*/

export type CallOutcome = 'answered' | 'request' | 'not_interested' | 'no_answer';

export const CALL_OUTCOMES: { id: CallOutcome; label: string; hex: string; weight: number }[] = [
  // الوزن = نقط إضافية على المكالمة دي. الريكويست أثمن حاجة.
  { id: 'request',        label: 'طلع ريكويست', hex: '#1E7A45', weight: 3 },
  { id: 'answered',       label: 'ردّ',          hex: '#1F5FB0', weight: 1 },
  { id: 'not_interested', label: 'مش مهتم',      hex: '#8C877D', weight: 0 },
  { id: 'no_answer',      label: 'مردّش',        hex: '#9E2A1B', weight: 0 },
];

export const AD_PLATFORMS = [
  'فيسبوك — جروبات',
  'فيسبوك — صفحة',
  'انستجرام',
  'تيك توك',
  'OLX',
  'بروبرتي فايندر',
  'واتساب — ستوري',
  'أخرى',
];

export interface QuestLog {
  id: string;
  agentId: string;
  agentName: string;
  questId: string;
  category: DailyQuest['category'];
  day: string;                  // YYYY-MM-DD
  at: number;

  // مكالمات
  outcome?: CallOutcome;
  leadId?: string;
  leadName?: string;

  // إعلانات
  platform?: string;
  screenshotUrl?: string;
  propertyCode?: string;

  note?: string;
}

export const dayKey = (at = Date.now()) => new Date(at).toISOString().slice(0, 10);

export async function saveQuestLog(log: Omit<QuestLog, 'id' | 'at' | 'day'> & Partial<Pick<QuestLog, 'at'>>): Promise<string> {
  const at = log.at || Date.now();
  const id = `${log.agentId}_${log.questId}_${at}_${Math.random().toString(36).slice(2, 6)}`;
  await setDoc(doc(db, 'quest_logs', id), cleanFirestoreData({ ...log, id, at, day: dayKey(at) }));
  return id;
}

export async function deleteQuestLog(id: string): Promise<void> {
  await deleteDoc(doc(db, 'quest_logs', id));
}

/** تسجيلات يوم واحد لكل الفريق */
export function subscribeDayLogs(day: string, cb: (logs: QuestLog[]) => void) {
  return onSnapshot(
    query(collection(db, 'quest_logs'), where('day', '==', day)),
    (snap) => {
      const list: QuestLog[] = [];
      snap.forEach((d) => list.push(d.data() as QuestLog));
      cb(list.sort((a, b) => b.at - a.at));
    },
    () => cb([]),
  );
}

// ---------------- تلخيص ----------------

export interface CallSummary {
  total: number;
  answered: number;              // ردّ (بيشمل اللي طلع ريكويست)
  request: number;
  notInterested: number;
  noAnswer: number;
  answerRate: number;            // ٪ اللي ردّوا
  requestRate: number;           // ٪ اللي طلعوا ريكويست من اللي ردّوا
}

export function summarizeCalls(logs: QuestLog[]): CallSummary {
  const calls = logs.filter((l) => l.category === 'calls' && l.outcome);
  const n = (o: CallOutcome) => calls.filter((l) => l.outcome === o).length;

  const request = n('request');
  const answeredOnly = n('answered');
  const notInterested = n('not_interested');
  const noAnswer = n('no_answer');

  // اللي طلع ريكويست أكيد ردّ، واللي قال مش مهتم ردّ برضه
  const answered = request + answeredOnly + notInterested;
  const total = answered + noAnswer;

  return {
    total,
    answered,
    request,
    notInterested,
    noAnswer,
    answerRate: total ? Math.round((answered / total) * 100) : 0,
    requestRate: answered ? Math.round((request / answered) * 100) : 0,
  };
}

/** الإعلانات مجمّعة بالمنصة */
export function summarizeAds(logs: QuestLog[]): { platform: string; count: number; withShot: number }[] {
  const ads = logs.filter((l) => l.category === 'facebook_share');
  const map = new Map<string, { count: number; withShot: number }>();
  ads.forEach((l) => {
    const k = l.platform || 'غير محدد';
    const cur = map.get(k) || { count: 0, withShot: 0 };
    cur.count += 1;
    if (l.screenshotUrl) cur.withShot += 1;
    map.set(k, cur);
  });
  return [...map.entries()]
    .map(([platform, v]) => ({ platform, ...v }))
    .sort((a, b) => b.count - a.count);
}

/** نقط إضافية من جودة الشغل — مش من عدد الضغطات */
export function qualityBonus(logs: QuestLog[]): number {
  let xp = 0;
  logs.forEach((l) => {
    if (l.category === 'calls' && l.outcome) {
      xp += CALL_OUTCOMES.find((o) => o.id === l.outcome)?.weight || 0;
    }
    // الإعلان اللي معاه إثبات بياخد نقطة زيادة
    if (l.category === 'facebook_share' && l.screenshotUrl) xp += 2;
  });
  return xp;
}
