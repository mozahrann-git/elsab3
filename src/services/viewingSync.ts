import { Lead, ViewingRequest, ViewingRequestStatus, LeadStatus } from '../types';

/*
  ربط المعاينة بكارت العميل في الـ CRM.

  قبل كده كان الكارت بيتحط في "تحت الطلب" وبيقف هناك — حتى لو البروكر
  أكّد المعاد وحتى لو المعاينة اتعملت خلاص. السيلز كان لازم ينقله بإيده،
  وطبعاً بيفضل مكانه.

  دلوقتي حالة طلب المعاينة هي اللي بتحرّك الكارت لوحدها:
    مستني البروكر / اتحدد معاد  →  تحت الطلب
    مؤكدة                      →  معاينة مؤكدة   (+ تنبيه للسيلز)
    تمت                        →  تمت المعاينة   (+ الفيدباك بيبقى مسؤولية السيلز)
*/

/** المرحلة اللي المفروض الكارت يكون فيها حسب حالة المعاينة */
export function leadStageFor(status: ViewingRequestStatus): LeadStatus | null {
  switch (status) {
    case 'pending_broker':
    case 'scheduled_by_broker':
    case 'escalated_to_admin':
      return 'visit_requested';
    case 'confirmed':
      return 'visit_booked';
    case 'completed':
      return 'visit_done';
    default:
      return null;                 // الملغية مش بتحرّك الكارت — السيلز هو اللي يقرر
  }
}

/** ترتيب المراحل — عشان ما نرجّعش الكارت لورا لو حصل تحديث قديم */
const ORDER: LeadStatus[] = ['visit_requested', 'visit_booked', 'visit_done'];
const rank = (s?: LeadStatus) => (s ? ORDER.indexOf(s) : -1);

export interface SyncResult {
  lead: Lead;
  movedTo: LeadStatus;
  notifyAgent: boolean;            // نبّه السيلز؟ (عند التأكيد وعند التمام)
  message: string;
}

/**
 * بيرجّع نسخة محدّثة من العميل لو المعاينة بتقول إنه لازم يتحرّك.
 * بيرجّع null لو مفيش حاجة تتغيّر — فمفيش كتابة على الداتابيز من غير داعي.
 */
export function syncLeadWithViewing(lead: Lead, req: ViewingRequest): SyncResult | null {
  const target = leadStageFor(req.status);
  if (!target) return null;

  // الصفقة اللي اتقفلت أو ضاعت مبتترجعش لمرحلة معاينة
  if (lead.status === 'closed' || lead.status === 'lost' || lead.status === 'negotiation') return null;

  // مبنرجّعش لورا
  if (rank(lead.status) >= rank(target)) return null;

  const when = [req.scheduledDay, req.scheduledTime].filter(Boolean).join(' ')
    || req.scheduledDate || req.clientPreferredTime || '';
  const message =
    target === 'visit_booked'
      ? `المعاينة اتأكدت — ${req.propertyCode}${when ? ` · ${when}` : ''}`
      : target === 'visit_done'
        ? `تمت المعاينة — ${req.propertyCode}. الفيدباك مستني تأكيدك قبل ما يروح للمالك.`
        : `طلب معاينة اتسجّل — ${req.propertyCode}`;

  const next: Lead = {
    ...lead,
    status: target,
    visitScheduledAt: when || lead.visitScheduledAt,
    visitLocation: req.propertyNeighborhood || lead.visitLocation,
    coordinatorName: req.coordinatorName || lead.coordinatorName,
    // الكارت بيفضل ملوّن لحد ما السيلز يدوس "شفت"
    viewingUpdateAt: Date.now(),
    lastContactDate: new Date().toISOString(),
    activity: [
      { at: Date.now(), by: req.coordinatorName || 'غرفة العمليات', outcome: message, comment: req.propertyTitle || '' },
      ...(lead.activity || []),
    ].slice(0, 80),
  };

  // المعاينة المؤكدة بتاخد ميعاد حقيقي، فالتنبيه بيبقى على الميعاد ده
  if (target === 'visit_booked' && req.scheduledAtTimestamp) {
    next.nextActionAt = req.scheduledAtTimestamp;
    next.followUpStatus = 'pending';
    next.followUpNote = `معاينة ${req.propertyCode}`;
  }

  // بعد المعاينة، الأكشن الجاي هو الفيدباك
  if (target === 'visit_done') {
    next.nextActionAt = Date.now() + 2 * 3600000;
    next.followUpStatus = 'pending';
    next.followUpNote = `أكّد فيدباك معاينة ${req.propertyCode} وابعته للمالك`;
    next.followUpUrgency = 'urgent';
  }

  return { lead: next, movedTo: target, notifyAgent: target !== 'visit_requested', message };
}

/** بيربط كل طلب معاينة بصاحبه — بالـ leadId، وإلا بالتليفون */
export function findLeadFor(req: ViewingRequest, leads: Lead[]): Lead | undefined {
  if (req.leadId) {
    const byId = leads.find((l) => l.id === req.leadId);
    if (byId) return byId;
  }
  const digits = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
  const want = digits(req.clientPhone);
  if (!want) return undefined;
  return leads.find((l) => digits(l.phone) === want || digits(l.whatsapp) === want);
}
