/*
  ملف «محمد زهران» جوه الـCRM — نسخة من كل عميل عاين وفيدباكه اتأكد.

  - العميل الأصلي بيفضل مع السيلز بتاعه زي ما هو.
  - النسخة بتتحط على ملف الإدارة، فيها اسمه ورقمه وطلبه، والفيدباك
    على كل كود طلع عليه — وبتظهر في متابعات «محتاج ميعاد» لحد ما
    الإدارة تحدد الأكشن الجاي وميعاده.
  - كل ما سارة تأكد فيدباك جديد لنفس العميل، بيتضاف على النسخة نفسها.
  - الـid ثابت (own_ + id العميل الأصلي أو رقمه) فمستحيل يتكرر.
*/
import { Lead, SalesAgent, ViewingRequest } from '../types';
import { FieldFeedback, FieldTrip, groupFeedback } from './portalService';

export const OWNER_DESK: SalesAgent = {
  id: 'owner_desk', name: 'محمد زهران', email: '', phone: '', whatsapp: '',
  role: 'sales_manager', isActive: true, xp: 0, level: 1, currentStreak: 0,
  dealsClosedCount: 0, totalCommissionEarned: 0, visitsCompletedCount: 0, listingsAddedCount: 0,
  badges: [], activeQuests: [],
};

const digits = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
const stars = (r: number) => (r ? `${'★'.repeat(Math.max(0, Math.min(5, Math.round(r))))} (${r}/5)` : 'من غير تقييم');

export interface DeskPlan { create: Lead[]; update: Lead[]; skipped: number }

/** بيحسب إيه اللي لازم يتعمل — من غير ما يكتب حاجة */
export function planOwnerDesk(leads: Lead[], fbs: FieldFeedback[], trips: FieldTrip[], now = Date.now(), vrs: ViewingRequest[] = []): DeskPlan {
  /* أي فيدباك المندوب بعته ومااترفضش — القديم كمان */
  const ok = fbs.filter((f) => f.stage !== 'rejected');
  const groups = groupFeedback(ok, trips);
  const byId = new Map(leads.map((l) => [l.id, l]));
  const plan: DeskPlan = { create: [], update: [], skipped: 0 };
  const touched = new Map<string, Lead>();

  groups.forEach((g) => {
    const trip = trips.find((t) => t.id === g.key);
    /* المشاوير القديمة من غير اسم عميل: بندوّر عليه في طلبات المعاينة اللي المشوار اتعمل منها */
    const vr = (trip?.viewingIds || []).map((id) => vrs.find((v) => v.id === id)).find((v) => v && (v.leadId || v.clientPhone));
    const phone = digits(g.phone || trip?.clientPhone || vr?.clientPhone);
    const leadId = trip?.leadId || vr?.leadId;
    const orig = (leadId && byId.get(leadId))
      || (phone.length >= 10 ? leads.find((l) => l.assignedAgentId !== OWNER_DESK.id && digits(l.phone) === phone) : undefined);
    const name = g.client || orig?.name || vr?.clientName || '';
    const ph = orig?.phone || g.phone || trip?.clientPhone || vr?.clientPhone || '';
    if (!name || digits(ph).length < 10) { plan.skipped++; return; }   // فيدباك قديم من غير عميل

    const id = `own_${orig?.id || digits(ph)}`;
    const existing = touched.get(id) || byId.get(id);
    const seen = new Set<string>(((existing as any)?.ownerFbIds as string[]) || []);
    const fresh = g.items.filter((f) => !seen.has(f.id));
    if (existing && !fresh.length) return;

    const fbLines = fresh.map((f) => `${f.code}: ${stars(f.rating)}${f.text ? ` — ${f.text}` : ''}${(f.positives || []).length ? ` · عجبه: ${f.positives.join('، ')}` : ''}${(f.negatives || []).length ? ` · ماعجبوش: ${f.negatives.join('، ')}` : ''}`);
    const act = {
      at: now, by: 'النظام',
      outcome: `فيدباك معاينة${g.time ? ` (${g.time})` : ''} — طلع على ${fresh.map((f) => f.code).join('، ')}`,
      comment: fbLines.join('\n'),
    };

    if (existing) {
      const upd: Lead = {
        ...existing,
        activity: [act, ...(existing.activity || [])],
        nextActionAt: existing.nextActionAt && existing.nextActionAt > now ? existing.nextActionAt : now,
        followUpStatus: 'pending',
        ...( { ownerFbIds: [...seen, ...fresh.map((f) => f.id)] } as any),
      };
      touched.set(id, upd);
      if (!plan.create.some((l) => l.id === id)) {
        plan.update = plan.update.filter((l) => l.id !== id).concat(upd);
      } else {
        plan.create = plan.create.map((l) => (l.id === id ? upd : l));
      }
      return;
    }

    const lead: Lead = {
      id, name, phone: ph, whatsapp: orig?.whatsapp,
      source: orig?.source || 'direct',
      budgetMin: orig?.budgetMin, budgetMax: orig?.budgetMax,
      preferredNeighborhood: orig?.preferredNeighborhood, preferredBedrooms: orig?.preferredBedrooms,
      discovery: orig?.discovery, clientRequest: orig?.clientRequest,
      interestedPropertyCode: fresh[0]?.code,
      assignedAgentId: OWNER_DESK.id, assignedAgentName: OWNER_DESK.name,
      status: 'visit_done', notes: [],
      createdAt: new Date(now).toISOString(),
      nextActionAt: now, followUpStatus: 'pending',
      addedByName: 'النظام',
      activity: [
        act,
        { at: now - 1, by: 'النظام', outcome: 'نسخة لملف محمد زهران', comment: orig ? `العميل الأصلي مع ${orig.assignedAgentName || g.salesName || '—'}` : `من مشوار ${g.agentName}${g.salesName ? ` · السيلز ${g.salesName}` : ''}` },
      ],
      ...( { copiedFrom: orig?.id, ownerFbIds: fresh.map((f) => f.id) } as any),
    };
    touched.set(id, lead);
    plan.create.push(lead);
  });

  /* العملاء اللي اتسجّل عليهم «تمت المعاينة» من غير فيدباك مندوب (القديم) */
  leads.forEach((l) => {
    if (l.assignedAgentId === OWNER_DESK.id) return;
    const acts = (l.activity || []).filter((a) => /تمت المعاينة/.test(a.outcome || ''));
    const viewed = acts.length || l.status === 'visit_done' || !!l.fieldViewingRecordedAt;
    if (!viewed || digits(l.phone).length < 10) return;
    const id = `own_${l.id}`;
    if (touched.has(id) || byId.has(id)) return;
    const notes = [
      ...acts.map((a) => `${new Date(a.at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} · ${a.by || ''}${a.comment ? ` — ${a.comment}` : ''}`),
      l.fieldViewingComment ? `ملاحظة المعاينة${l.fieldViewingBrokerName ? ` (${l.fieldViewingBrokerName})` : ''}: ${l.fieldViewingComment}` : '',
      l.fieldViewingOutcome ? `النتيجة: ${l.fieldViewingOutcome}` : '',
    ].filter(Boolean);
    const lead: Lead = {
      id, name: l.name, phone: l.phone, whatsapp: l.whatsapp, source: l.source || 'direct',
      budgetMin: l.budgetMin, budgetMax: l.budgetMax, preferredNeighborhood: l.preferredNeighborhood,
      preferredBedrooms: l.preferredBedrooms, discovery: l.discovery, clientRequest: l.clientRequest,
      interestedPropertyCode: l.interestedPropertyCode, interestedPropertyTitle: l.interestedPropertyTitle,
      assignedAgentId: OWNER_DESK.id, assignedAgentName: OWNER_DESK.name,
      status: l.status === 'negotiation' || l.status === 'closed' ? l.status : 'visit_done', notes: [],
      createdAt: new Date(now).toISOString(), nextActionAt: now, followUpStatus: 'pending', addedByName: 'النظام',
      activity: [
        { at: now, by: 'النظام', outcome: 'عاين (قبل فيدباك المندوب)', comment: notes.join('\n') || 'مفيش تفاصيل متسجّلة عن المعاينة' },
        { at: now - 1, by: 'النظام', outcome: 'نسخة لملف محمد زهران', comment: `العميل الأصلي مع ${l.assignedAgentName || '—'}` },
      ],
      ...( { copiedFrom: l.id, ownerFbIds: [] } as any),
    };
    touched.set(id, lead);
    plan.create.push(lead);
  });
  return plan;
}
