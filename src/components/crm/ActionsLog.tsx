import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Lead } from '../../types';
import { cairoDay, shiftDay, dayLabel } from '../../services/dailyTasks';
import { readBrief, briefGaps } from '../../services/clientBrief';

/*
  سجل الأكشن اليومي: كام أكشن اتسجّل في يوم معيّن، مين اللي سجّله،
  وتفاصيل كل أكشن (الساعة، العميل، اتعمل إيه، الكومنت، الميعاد الجاي).

  المصدر: سجل الأكشن (activity) اللي على كل عميل — نفس اللي بيتكتب
  لما السيلز ينقل مرحلة أو يكتب كومنت أو يأجّل. مفيش عدّاد منفصل
  ممكن يختلف عن الحقيقة.
*/

export interface ActionRow {
  at: number; by: string; outcome: string; comment: string; nextAt?: number;
  leadId: string; leadName: string; leadPhone?: string; assignedName?: string;
  lead: Lead;
  /** لو نقل مرحلة: اتقدّم ولا رجع ولا خسارة */
  move?: 'up' | 'down' | 'lost';
}

/* ترتيب المراحل — عشان نعرف النقل كان لقدام ولا لورا */
const STAGE_ORDER = ['جديد', 'تم الاتصال', 'إرسال صور', 'تحت الطلب', 'معاينة مؤكدة', 'تمت المعاينة', 'تفاوض', 'صفقة مغلقة'];
const stageIdx = (outcome: string) => {
  const m = /نقل إلى:\s*([^·]+)/.exec(outcome || '');
  if (!m) return null;
  const t = m[1].trim();
  if (/غير مهتم|مؤجل/.test(t)) return -1;
  const i = STAGE_ORDER.findIndex((x) => t.startsWith(x) || x.startsWith(t));
  return i === -1 ? null : i;
};

/** سطر مختصر بطلب العميل: الميزانية · كاش/تقسيط · الأحياء · الغرف */
const fmtM = (n: number) => (Math.round((n / 1e6) * 100) / 100).toLocaleString('en-US');
export function briefLine(lead: Lead): { text: string; gaps: string[] } {
  const b = readBrief(lead);
  const parts: string[] = [];
  if (b.budgetMax) parts.push(`💰 ${b.budgetMin && b.budgetMin < b.budgetMax ? `${fmtM(b.budgetMin)}–${fmtM(b.budgetMax)}` : `حتى ${fmtM(b.budgetMax)}`} م`);
  if (b.payment) parts.push(b.payment);
  if (b.districts.length) {
    const ds = b.districts.map((d) => d.replace(/^الحي\s+/, ''));
    parts.push(`📍 ${ds.slice(0, 3).join('، ')}${ds.length > 3 ? ` +${ds.length - 3}` : ''}`);
  }
  if (b.bedrooms) parts.push(`${b.bedrooms} غرف`);
  const code = (lead as any).interestedPropertyCode;
  if (code) parts.push(`🏷 ${code}`);
  return { text: parts.join(' · '), gaps: briefGaps(lead).map((g) => g.label) };
}

/** نوع الأكشن من الكلام المكتوب فيه */
export function actionKind(outcome: string): string {
  const o = outcome || '';
  if (o.startsWith('نقل إلى')) return 'نقل مرحلة';
  if (o.startsWith('تأجيل')) return 'تأجيل';
  if (o.startsWith('مكالمة')) return 'مكالمة';
  if (o.startsWith('في:')) return 'كومنت';
  if (/معاينة/.test(o)) return 'معاينة';
  return 'تحديث';
}

/** كل الأكشن اللي اتسجّلت في يوم (بتوقيت القاهرة) */
export function actionsOn(leads: Lead[], day: string): ActionRow[] {
  const out: ActionRow[] = [];
  leads.forEach((l) => {
    /* من الأقدم للأحدث — عشان نعرف المرحلة اللي قبل كل نقل، ونشيل التكرار */
    const all = [...(l.activity || [])].filter((a) => typeof a.at === 'number').sort((x, y) => x.at - y.at);
    let lastStage: number = 0;                    // من غير نقل قبل كده = جديد
    let prev: { by: string; outcome: string; at: number } | null = null;
    all.forEach((a) => {
      const si = stageIdx(a.outcome || '');
      const from = lastStage;
      if (si !== null) lastStage = si;
      if (cairoDay(a.at) !== day) return;
      if ((a.by || '').trim() === 'النظام') return;   // تسجيلات أوتوماتيك مش شغل حد
      if ((a as any).kind === 'note') return;           // ملاحظة/تأجيل مش أكشن
      if (/^(الإدارة|الادارة|admin|الأدمن)$/i.test((a.by || '').trim())) return;   // أكشن الإدارة مش بيظهر وسط شغل الفريق
      const by = (a.by || '—').trim();
      /* نفس العميل ونفس النتيجة من نفس الشخص في خلال ١٠ دقايق = أكشن واحد (دوسة مكررة) */
      if (prev && prev.by === by && prev.outcome === (a.outcome || '') && a.at - prev.at < 10 * 60000) {
        const last = out[out.length - 1];
        Object.assign(last, { at: a.at, comment: a.comment || last.comment, nextAt: a.nextAt ?? last.nextAt });
        prev = { by, outcome: a.outcome || '', at: a.at };
        return;
      }
      prev = { by, outcome: a.outcome || '', at: a.at };
      out.push({
        at: a.at, by, outcome: a.outcome || '', comment: a.comment || '', nextAt: a.nextAt,
        leadId: l.id, leadName: l.name, leadPhone: l.phone, assignedName: l.assignedAgentName, lead: l,
        move: si === null ? undefined : si === -1 ? 'lost' : si > from ? 'up' : si < from ? 'down' : undefined,
      });
    });
  });
  return out.sort((a, b) => b.at - a.at);
}

const time = (t: number) => new Date(t).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' });
const when = (t: number) => new Date(t).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short', hour: 'numeric', minute: '2-digit' });

export const ActionsLog: React.FC<{ leads: Lead[]; onOpenLead?: (id: string) => void }> = ({ leads, onOpenLead }) => {
  const today = cairoDay();
  const [day, setDay] = useState(today);
  const [open, setOpen] = useState<string>('');

  const rows = useMemo(() => actionsOn(leads, day), [leads, day]);
  const people = useMemo(() => {
    const m = new Map<string, ActionRow[]>();
    rows.forEach((r) => { if (!m.has(r.by)) m.set(r.by, []); m.get(r.by)!.push(r); });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDay(shiftDay(day, -1))} className="p-2 rounded-xl bg-[#F6F4EF]" aria-label="اليوم اللي قبله"><ChevronRight size={16} /></button>
          <p className="font-bold text-sm min-w-[120px] text-center">{dayLabel(day)}{day === today ? ' · النهارده' : ''}</p>
          <button disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))} className="p-2 rounded-xl bg-[#F6F4EF] disabled:opacity-30" aria-label="اليوم اللي بعده"><ChevronLeft size={16} /></button>
        </div>
        <p className="text-sm font-bold">
          <span className="font-mono text-lg">{rows.length}</span> أكشن
          <span className="text-[#8C877D] font-medium"> · {new Set(rows.map((r) => r.leadId)).size} عميل · {people.length} شخص</span>
        </p>
      </div>

      {!rows.length && <p className="text-xs text-[#8C877D] bg-[#F6F4EF] rounded-xl p-3">مفيش أكشن اتسجّل في اليوم ده.</p>}

      {people.map(([by, list]) => {
        const kinds = new Map<string, number>();
        list.forEach((r) => kinds.set(actionKind(r.outcome), (kinds.get(actionKind(r.outcome)) || 0) + 1));
        const isOpen = open === by;
        const postponed = kinds.get('تأجيل') || 0;
        const pct = list.length ? Math.round((postponed / list.length) * 100) : 0;
        const up = list.filter((r) => r.move === 'up').length;
        const down = list.filter((r) => r.move === 'down').length;
        const lost = list.filter((r) => r.move === 'lost').length;
        const noBrief = new Set(list.filter((r) => briefGaps(r.lead).length).map((r) => r.leadId)).size;
        return (
          <div key={by} className="border border-[#ECE8DF] rounded-xl overflow-hidden">
            <button onClick={() => setOpen(isOpen ? '' : by)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-right ${isOpen ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F6F4EF]'}`}>
              <span className="font-bold text-sm flex items-center gap-1.5">
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180 text-[#D9B864]' : 'text-[#A07A26]'}`} />
                {by}
              </span>
              <span className="flex flex-wrap gap-1.5 text-[11px] justify-end">
                <span className={`px-2 py-0.5 rounded-lg font-bold ${isOpen ? 'bg-white/15' : 'bg-[#141414] text-white'}`}>{list.length} أكشن</span>
                <span className={`px-2 py-0.5 rounded-lg ${isOpen ? 'bg-white/10' : 'bg-[#F6F4EF]'}`}>{new Set(list.map((r) => r.leadId)).size} عميل</span>
                {[...kinds.entries()].map(([k, c]) => (
                  <span key={k} className={`px-2 py-0.5 rounded-lg ${isOpen ? 'bg-white/10' : 'bg-[#FBF8F1] text-[#6E5418]'}`}>{c} {k}</span>
                ))}
              </span>
            </button>
            {/* جودة الشغل مش عدده: نسبة التأجيل، والحركة لقدام، والطلبات الناقصة */}
            <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-[#FBF8F1] border-t border-[#ECE8DF] text-[11px] font-bold">
              <span className={`px-2 py-0.5 rounded-lg ${pct >= 30 ? 'bg-[#FBEDEA] text-[#C2412D]' : 'bg-white text-[#6B665C]'}`}>تأجيل {pct}٪{postponed ? ` (${postponed} من ${list.length})` : ''}</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#EEF5F0] text-[#1E7A45]">⬆ اتقدّم {up}</span>
              {down > 0 && <span className="px-2 py-0.5 rounded-lg bg-white text-[#A07A26]">⬇ رجع {down}</span>}
              {lost > 0 && <span className="px-2 py-0.5 rounded-lg bg-white text-[#6B665C]">✖ غير مهتم {lost}</span>}
              {noBrief > 0 && <span className="px-2 py-0.5 rounded-lg bg-white text-[#C2412D]">⚠ {noBrief} عميل طلبه ناقص</span>}
            </div>
            {isOpen && (
              <div className="divide-y divide-[#F0ECE4] bg-[#FDFCF9]">
                {list.map((r, i) => (
                  <div key={i} className="px-3 py-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        <span className="text-[#8C877D] font-medium">{time(r.at)} · </span>
                        {onOpenLead
                          ? <button onClick={() => onOpenLead(r.leadId)} className="underline decoration-dotted">{r.leadName}</button>
                          : r.leadName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F6F4EF] text-[#6B665C] shrink-0">{actionKind(r.outcome)}</span>
                    </div>
                    {(() => {
                      const bl = briefLine(r.lead);
                      return (
                        <p className="text-[11px] text-[#6E5418]">
                          {bl.text}
                          {bl.gaps.length > 0 && <span className="text-[#C2412D]">{bl.text ? ' · ' : ''}⚠ طلبه ناقص: {bl.gaps.join('، ')}</span>}
                        </p>
                      );
                    })()}
                    <p className="text-[#141414]">{r.outcome}{r.move === 'up' ? ' ⬆' : r.move === 'down' ? ' ⬇' : ''}</p>
                    {r.comment && <p className="text-[#6B665C]">«{r.comment}»</p>}
                    <p className="text-[10px] text-[#8C877D]">
                      {r.nextAt ? `الميعاد الجاي: ${when(r.nextAt)}` : ''}
                      {r.assignedName && r.assignedName !== r.by ? `${r.nextAt ? ' · ' : ''}العميل مع ${r.assignedName}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ActionsLog;
