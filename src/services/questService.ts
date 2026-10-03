import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebaseService';
import { DailyQuest, SalesAgent } from '../types';

/*
  المهام اليومية.

  قبل كده: كل سيلز كان شايل نسخة متجمّدة من المهام جاية مع النظام،
  والأدمن ما يقدرش يضيف ولا يمسح، وكل "تسجيل نشاط" كان بيدّي ٥٠ نقطة
  ثابتة مهما كانت نقط المهمة مكتوبة كام.

  دلوقتي: الأدمن بيحدد المهام في مكان واحد، وكل سيلز بياخد نسخته منها
  كل يوم بعدّاد جديد. والنقط اللي بتتحسب هي المكتوبة على المهمة.
*/

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  xpReward: number;               // النقط اللي بتتاخد لما المهمة تكمل
  targetCount: number;
  category: DailyQuest['category'];
  active: boolean;                // متقفلة من غير ما تتمسح
  order?: number;
  /* الإثبات: التحدي ما يتحسبش غير لما السيلز يرفع دليل.
     'none'   = من غير إثبات (الثقة بس)
     'photo'  = صورة أو اسكرين شوت
     'note'   = كلام مكتوب (كود الشقة، اسم العميل، رقم)
     'both'   = صورة وكلام */
  proof?: 'none' | 'photo' | 'note' | 'both';
  proofHint?: string;             // إيه اللي المفروض يترفع بالظبط
}

export const QUEST_CATEGORIES: { id: DailyQuest['category']; label: string }[] = [
  { id: 'calls', label: 'مكالمات' },
  { id: 'facebook_share', label: 'نشر إعلانات' },
  { id: 'site_visit', label: 'معاينات' },
  { id: 'add_listing', label: 'إضافة وحدات' },
  { id: 'close_deal', label: 'صفقات' },
];

export const DEFAULT_QUESTS: QuestTemplate[] = [
  { id: 'q_fb', title: 'نشر 5 إعلانات على جروبات فيسبوك', description: 'استخدم أداة تجهيز إعلان فيسبوك للشقق وانشرها بجروبات المقطم والهضبة', xpReward: 50, targetCount: 5, category: 'facebook_share', active: true, order: 1, proof: 'photo', proofHint: 'اسكرين شوت للبوست في الجروب' },
  { id: 'q_calls', title: 'إجراء 15 مكالمة متابعة لليدز', description: 'تواصل مع العملاء في مراحل المتابعة المسجلة بالسيستم', xpReward: 100, targetCount: 15, category: 'calls', active: true, order: 2, proof: 'none' },
  { id: 'q_visit', title: 'تأكيد معاينة على أرض الواقع', description: 'تنسيق ونزول معاينة لشقة ريسيل مسجلة مع عميل جاد', xpReward: 300, targetCount: 1, category: 'site_visit', active: true, order: 3, proof: 'both', proofHint: 'صورة من قدام العمارة + كود الشقة واسم العميل' },
  { id: 'q_listing', title: 'إدخال وحدة جديدة برقم المالك', description: 'إضافة تفاصيل وصور شقة ريسيل جديدة من صاحب العقار', xpReward: 200, targetCount: 1, category: 'add_listing', active: true, order: 4, proof: 'note', proofHint: 'كود الشقة اللي اتضافت' },
];

export function subscribeQuestTemplates(cb: (list: QuestTemplate[]) => void) {
  return onSnapshot(
    doc(db, 'site_config', 'daily_quests'),
    (snap) => {
      const list = (snap.data() as any)?.list as QuestTemplate[] | undefined;
      cb(Array.isArray(list) && list.length ? list : DEFAULT_QUESTS);
    },
    () => cb(DEFAULT_QUESTS),
  );
}

export async function saveQuestTemplates(list: QuestTemplate[]): Promise<void> {
  await setDoc(doc(db, 'site_config', 'daily_quests'), cleanFirestoreData({ list, updatedAt: Date.now() }));
}

// ---------------- نسخة السيلز اليومية ----------------

export const todayKey = (at = Date.now()) => new Date(at).toISOString().slice(0, 10);

/**
 * بيبني مهام السيلز النهارده من قايمة الأدمن.
 * لو اليوم اتغيّر، العدّادات بتبدأ من الصفر — مهام يومية يعني يومية.
 */
export function buildAgentQuests(templates: QuestTemplate[], agent?: SalesAgent | null): DailyQuest[] {
  const day = (agent as any)?.questDay as string | undefined;
  const sameDay = day === todayKey();
  const old = sameDay ? (agent?.activeQuests || []) : [];

  return templates
    .filter((t) => t.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t) => {
      const prev = old.find((q) => q.id === t.id);
      const currentCount = Math.min(prev?.currentCount || 0, t.targetCount);
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        xpReward: t.xpReward,
        targetCount: t.targetCount,
        currentCount,
        isCompleted: currentCount >= t.targetCount,
        category: t.category,
        proof: t.proof || 'none',
        proofHint: t.proofHint,
      };
    });
}

/**
 * بيزوّد عدّاد مهمة ويحسب النقط الصح.
 * النقط بتتاخد مرة واحدة — لما المهمة تكمل، مش مع كل ضغطة.
 */
export function bumpQuest(agent: SalesAgent, questId: string, by = 1): SalesAgent {
  let gained = 0;
  const quests = (agent.activeQuests || []).map((q) => {
    if (q.id !== questId) return q;
    const wasDone = q.currentCount >= q.targetCount;
    const currentCount = Math.min(q.currentCount + by, q.targetCount);
    const isCompleted = currentCount >= q.targetCount;
    if (isCompleted && !wasDone) gained = q.xpReward || 0;   // النقط مرة واحدة
    return { ...q, currentCount, isCompleted };
  });

  return {
    ...agent,
    activeQuests: quests,
    questDay: todayKey(),
    xp: (agent.xp || 0) + gained,
  } as SalesAgent;
}

/** بيزوّد أول مهمة مفتوحة من النوع ده — بيستخدمها النظام لوحده (مثلاً لما معاينة تتم) */
export function bumpByCategory(agent: SalesAgent, category: DailyQuest['category'], by = 1): SalesAgent {
  const target = (agent.activeQuests || []).find((q) => q.category === category && q.currentCount < q.targetCount);
  return target ? bumpQuest(agent, target.id, by) : agent;
}
