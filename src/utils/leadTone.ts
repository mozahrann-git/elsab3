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
  fresh: {
    tone: 'fresh',
    label: 'ليد فريش',
    hex: '#eb6834',
    card: 'bg-[#FFF6F1] border-2 border-[#eb6834]',
    chip: 'bg-[#eb6834] text-white',
    avatar: 'bg-[#eb6834] text-white',
  },
  old_campaign: {
    tone: 'old_campaign',
    label: 'كامبين قديم',
    hex: '#4a3aa7',
    card: 'bg-[#F5F4FC] border-2 border-[#4a3aa7]',
    chip: 'bg-[#4a3aa7] text-white',
    avatar: 'bg-[#4a3aa7] text-white',
  },
  viewing_update: {
    tone: 'viewing_update',
    label: 'تحديث من سارة',
    hex: '#2a78d6',
    card: 'bg-[#F1F6FD] border-2 border-[#2a78d6]',
    chip: 'bg-[#2a78d6] text-white',
    avatar: 'bg-[#2a78d6] text-white',
  },
  none: {
    tone: 'none',
    label: '',
    hex: '#ECE8DF',
    card: 'bg-white border border-[#ECE8DF]',
    chip: '',
    avatar: 'bg-[#FAF4E5] text-[#A07A26]',
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
