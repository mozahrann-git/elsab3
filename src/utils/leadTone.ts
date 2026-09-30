import { Lead } from '../types';

/*
  ألوان كارت العميل.

  ثلاث حالات بس ليها لون — الباقي أبيض عادي، عشان اللون يفضل معناه واضح.
  كل لون معاه كلام مكتوب، مش لون لوحده: اللي مش بيفرّق الألوان لازم يفهم برضه.

  الألوان دي اتفحصت بأداة فحص عمى الألوان — التلاتة بيتفرّقوا عن بعض
  في كل أنواع عمى الألوان وفي الرؤية العادية.
*/

export type LeadTone = 'fresh' | 'old_campaign' | 'viewing_update' | 'none';

export interface ToneStyle {
  tone: LeadTone;
  label: string;          // الكلام اللي بيتكتب على الكارت
  hex: string;
  card: string;           // كلاس الكارت
  chip: string;           // كلاس الشارة
  avatar: string;
  solid: boolean;         // الكارت ملوّن بالكامل؟
  ink: string;            // لون الكلام الأساسي على الكارت
  inkSoft: string;        // لون الكلام الثانوي
  divider: string;        // لون الخط الفاصل
}

/* بعد كام يوم الليد بيبقى "كامبين قديم" */
const OLD_AFTER_DAYS = 3;

export function leadTone(lead: Lead, now = Date.now()): LeadTone {
  // ١) تحديث من سارة على المعاينة والسيلز لسه مشافهوش — ده الأهم
  const upd = (lead as any).viewingUpdateAt as number | undefined;
  const seen = (lead as any).viewingSeenAt as number | undefined;
  if (upd && (!seen || seen < upd)) return 'viewing_update';

  // ٢) ليد فريش في خانة جديد — لسه محدش كلّمه
  if (lead.isFresh && lead.status === 'new') return 'fresh';

  // ٣) كامبين بقاله كام يوم ومحدش اتحرك عليه
  const fromCampaign = lead.source === 'campaign' || !!lead.campaignName;
  if (fromCampaign && lead.status === 'new') {
    const at = lead.distributedAt || Date.parse(lead.createdAt || '') || 0;
    if (at && now - at > OLD_AFTER_DAYS * 86400000) return 'old_campaign';
  }

  return 'none';
}

const STYLES: Record<LeadTone, ToneStyle> = {
  /* الكارت كله بياخد اللون — مش شريط ولا نقطة.
     الكلام أبيض عليه، والأزرار بتفضل بخلفية بيضا عشان تفضل مقروءة. */
  fresh: {
    tone: 'fresh',
    label: 'ليد فريش',
    hex: '#C2410C',
    card: 'bg-[#C2410C] border-2 border-[#9A340A]',
    chip: 'bg-white/25 text-white',
    avatar: 'bg-white/20 text-white',
    solid: true,
    ink: 'text-white',
    inkSoft: 'text-white/80',
    divider: 'border-white/25',
  },
  old_campaign: {
    tone: 'old_campaign',
    label: 'كامبين قديم',
    hex: '#4A5568',
    card: 'bg-[#4A5568] border-2 border-[#3A4353]',
    chip: 'bg-white/25 text-white',
    avatar: 'bg-white/20 text-white',
    solid: true,
    ink: 'text-white',
    inkSoft: 'text-white/80',
    divider: 'border-white/25',
  },
  viewing_update: {
    tone: 'viewing_update',
    label: 'تحديث من سارة',
    hex: '#1F5FB0',
    card: 'bg-[#1F5FB0] border-2 border-[#184B8C]',
    chip: 'bg-white/25 text-white',
    avatar: 'bg-white/20 text-white',
    solid: true,
    ink: 'text-white',
    inkSoft: 'text-white/80',
    divider: 'border-white/25',
  },
  none: {
    tone: 'none',
    label: '',
    hex: '#ECE8DF',
    card: 'bg-white border border-[#ECE8DF]',
    chip: '',
    avatar: 'bg-[#FAF4E5] text-[#A07A26]',
    solid: false,
    ink: 'text-[#141414]',
    inkSoft: 'text-[#6B665C]',
    divider: 'border-[#ECE8DF]/70',
  },
};

export function toneStyle(lead: Lead, now = Date.now()): ToneStyle {
  return STYLES[leadTone(lead, now)];
}

/** آخر خبر من سارة — بيتكتب على الكارت الأزرق */
export function viewingUpdateText(lead: Lead): string {
  const s = lead.status;
  return s === 'visit_booked' ? 'المعاينة اتأكدت'
    : s === 'visit_done' ? 'تمت المعاينة — الفيدباك مستني تأكيدك'
    : 'طلب المعاينة اتسجّل';
}

/** السيلز دوس "شفت" — اللون بيرجع عادي */
export function markViewingSeen(lead: Lead): Lead {
  return { ...lead, viewingSeenAt: Date.now() } as Lead;
}
