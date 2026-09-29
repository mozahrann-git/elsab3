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
  at: number;
}

const rel = (mins: number) => {
  const a = Math.abs(mins);
  return a < 60 ? `${a} د` : a < 1440 ? `${Math.round(a / 60)} س` : `${Math.round(a / 1440)} يوم`;
};

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
      rel: m < 0 ? `متأخر ${rel(m)}` : `بعد ${rel(m)}`,
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
