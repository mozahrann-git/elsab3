import { Lead } from '../types';

/*
  مصدر واحد لحساب التنبيهات.

  قبل كده كان الجرس بيعد بمعادلة والشاشة جوه بمعادلة تانية، فالرقمين كانوا بيختلفوا.
  دلوقتي الاتنين بيندهوا نفس الدالة دي، فمستحيل يختلفوا.
*/

export type AlertUrgency = 'urgent' | 'today' | 'upcoming';

export interface LeadAlert {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: Lead['status'];
  assignedAgentId: string;
  assignedAgentName: string;
  type: 'follow_up' | 'urgent_lead';
  title: string;
  dueTime: string;
  note: string;
  urgency: AlertUrgency;
  relativeTimeText: string;
  isOverdue: boolean;
  /** متأخر بكام دقيقة. صفر أو أقل يعني لسه في ميعاده. */
  lateMinutes: number;
  at: number;
}

/*
  مدة بالعربي زي ما بتتقال: "٣ ساعات" مش "3 س".
  المثنى والجمع مظبوطين، عشان "متأخر 2 يوم" وحشة.
*/
const arCount = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

export const humanDuration = (mins: number): string => {
  const a = Math.max(0, Math.round(Math.abs(mins)));
  if (a < 1) return 'دلوقتي';
  if (a < 60) return arCount(a, 'دقيقة', 'دقيقتين', 'دقايق', 'دقيقة');

  const hours = Math.floor(a / 60);
  if (hours < 24) {
    const rest = a % 60;
    const h = arCount(hours, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
    // الدقايق بتتقال مع الساعة الواحدة والاتنين بس — أكتر من كده بتبقى زحمة
    return hours <= 2 && rest >= 10 ? `${h} و${rest} دقيقة` : h;
  }

  const days = Math.floor(a / 1440);
  if (days < 7) {
    const restH = Math.floor((a % 1440) / 60);
    const d = arCount(days, 'يوم', 'يومين', 'أيام', 'يوم');
    return days <= 2 && restH >= 1 ? `${d} و${arCount(restH, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}` : d;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return arCount(weeks, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوع');
  const months = Math.floor(days / 30);
  return arCount(months, 'شهر', 'شهرين', 'شهور', 'شهر');
};

const rel = (mins: number) => humanDuration(mins);

/** بيبني كل التنبيهات من الليدات. الليد المقفول أو الخسران مبيطلّعش تنبيه. */
export function buildAlerts(leads: Lead[], now = Date.now()): LeadAlert[] {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const eod = endOfDay.getTime();

  const fmt = (at: number) => {
    const d = new Date(at);
    const t = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
    const m = Math.round((at - now) / 60000);
    return {
      t: at <= eod ? `النهارده ${t}` : `${d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })} ${t}`,
      rel: m < 0 ? `متأخر من ${rel(m)}` : `بعد ${rel(m)}`,
    };
  };

  const list: LeadAlert[] = [];

  leads.forEach((lead) => {
    // الليد اللي اتقفل أو ضاع مش محتاج متابعة
    if (lead.status === 'closed' || lead.status === 'lost') return;

    const at = lead.nextActionAt || 0;
    const base = {
      leadId: lead.id, leadName: lead.name, leadPhone: lead.phone, leadStatus: lead.status,
      assignedAgentId: lead.assignedAgentId, assignedAgentName: lead.assignedAgentName,
    };

    if (at && lead.followUpStatus !== 'completed') {
      const f = fmt(at);
      list.push({
        ...base,
        id: `followup_${lead.id}`,
        type: 'follow_up',
        title: `متابعة ${lead.name}`,
        dueTime: f.t,
        note: lead.followUpNote || '',
        urgency: at <= now ? 'urgent' : at <= eod ? 'today' : 'upcoming',
        relativeTimeText: f.rel,
        isOverdue: at <= now,
        lateMinutes: Math.max(0, Math.round((now - at) / 60000)),
        at,
      });
    } else if (lead.status === 'new' && !at) {
      // ليد جديد من غير ميعاد = محتاج أول تواصل حالاً
      list.push({
        ...base,
        id: `newlead_${lead.id}`,
        type: 'urgent_lead',
        title: 'عميل جديد محتاج أول تواصل',
        dueTime: 'دلوقتي',
        note: '',
        urgency: 'urgent',
        relativeTimeText: 'دلوقتي',
        isOverdue: true,
        lateMinutes: 0,
        at: now,
      });
    }
  });

  return list.sort((a, b) => a.at - b.at);
}

/** تنبيهات الشخص الداخل بس. الإدارة بتشوف الكل. */
export function scopeAlerts(alerts: LeadAlert[], agentId?: string | null, seeAll = false): LeadAlert[] {
  if (seeAll) return alerts;
  if (!agentId) return [];
  return alerts.filter((a) => a.assignedAgentId === agentId);
}

/** الرقم اللي بيظهر على الجرس ونفسه اللي بيظهر جوه في "الكل" */
export function alertCount(leads: Lead[], agentId?: string | null, seeAll = false, now = Date.now()): number {
  return scopeAlerts(buildAlerts(leads, now), agentId, seeAll).length;
}
