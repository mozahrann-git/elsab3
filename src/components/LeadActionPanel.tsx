import React, { useState } from 'react';
import { Lead, SalesAgent } from '../types';
import { WhenPicker, WhenValue, formatWhen, relTime } from './common/WhenPicker';

/*
  خانة الأكشن للسيلز: كومنت + نتيجة المكالمة + الأكشن الجاي بوقت حقيقي + نقل العميل لزميل.
  كل حفظ بيتسجل في سجل العميل، والوقت بيتحول لتنبيه حقيقي.
*/
export interface LeadActivity { at: number; by: string; outcome: string; comment: string; nextAt?: number; transferTo?: string }

const OUTCOMES: { k: string; t: string; next?: number | 'tomorrow'; tone: string }[] = [
  { k: 'done', t: 'تمت بنجاح', tone: '#1E7A45' },
  { k: 'no_answer', t: 'مردّش', next: 60, tone: '#C2412D' },
  { k: 'call_later', t: 'قال كلّمني بعدين', next: 180, tone: '#A07A26' },
  { k: 'tomorrow', t: 'نكمّل غداً', next: 'tomorrow', tone: '#1F4E9C' },
  { k: 'interested', t: 'مهتم وعايز معاينة', tone: '#1E7A45' },
  { k: 'not_interested', t: 'مش مهتم', tone: '#6B665C' },
];

export const LeadActionPanel: React.FC<{ lead: Lead; agents: SalesAgent[]; byName: string; onUpdateLead: (l: Lead) => void }> = ({ lead, agents, byName, onUpdateLead }) => {
  const [outcome, setOutcome] = useState('');
  const [comment, setComment] = useState('');
  const [next, setNext] = useState<WhenValue | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [saved, setSaved] = useState('');
  const act = (lead as any).activity as LeadActivity[] | undefined;
  const nextAt = (lead as any).nextActionAt as number | undefined;

  const pick = (o: typeof OUTCOMES[number]) => {
    setOutcome(o.k);
    if (o.next === 'tomorrow') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); setNext({ at: d.getTime(), label: formatWhen(d.getTime()) }); }
    else if (typeof o.next === 'number') { const at = Date.now() + o.next * 60000; setNext({ at, label: formatWhen(at) }); }
    else setNext(null);
  };

  const save = () => {
    const o = OUTCOMES.find((x) => x.k === outcome);
    const target = agents.find((a) => a.id === transferTo);
    const entry: LeadActivity = { at: Date.now(), by: byName, outcome: o?.t || 'ملاحظة', comment: comment.trim(), nextAt: next?.at, transferTo: target?.name };
    const updated: any = {
      ...lead,
      notes: [`${o ? o.t + ' · ' : ''}${comment.trim()}`.trim(), ...(lead.notes || [])].filter(Boolean),
      activity: [entry, ...(act || [])].slice(0, 60),
      lastContactDate: new Date().toISOString(),
      nextActionAt: next?.at || null,
      followUpScheduledAt: next ? next.label : lead.followUpScheduledAt,
      followUpNote: comment.trim() || o?.t || lead.followUpNote,
      followUpStatus: outcome === 'done' || outcome === 'not_interested' ? 'completed' : next ? 'pending' : lead.followUpStatus,
      followUpUrgency: next && next.at - Date.now() < 3 * 3600000 ? 'urgent' : next ? 'upcoming' : lead.followUpUrgency,
    };
    if (target) { updated.assignedAgentId = target.id; updated.assignedAgentName = target.name; updated.transferredFrom = lead.assignedAgentName; }
    onUpdateLead(updated);
    setSaved(target ? `اتنقل لـ ${target.name}` : next ? `اتسجّل، وهيجيلك تنبيه ${formatWhen(next.at)}` : 'اتسجّل');
    setOutcome(''); setComment(''); setNext(null); setTransferTo('');
  };

  return (
    <div className="p-4 rounded-2xl border border-[#E8D3A6] bg-[#FBF8F1] space-y-3" dir="rtl">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[#141414]">الأكشن الجاي</p>
        {nextAt ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${nextAt < Date.now() ? 'bg-[#FBEDEA] text-[#C2412D]' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>{formatWhen(nextAt)} · {relTime(nextAt)}</span> : <span className="text-xs text-[#8C877D]">مفيش أكشن متحدد</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <button key={o.k} type="button" onClick={() => pick(o)} className="px-3 py-2 rounded-xl text-sm font-semibold border" style={outcome === o.k ? { background: o.tone, borderColor: o.tone, color: '#fff' } : { background: '#fff', borderColor: '#E4DFD4' }}>{o.t}</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="اكتب اللي حصل" className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm" />
      {outcome !== 'done' && outcome !== 'not_interested' && <WhenPicker value={next} onChange={setNext} label="ميعاد الأكشن الجاي" />}
      <div>
        <p className="text-xs font-bold mb-1">نقل إلى</p>
        <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm">
          <option value="">يفضل مع {lead.assignedAgentName}</option>
          {agents.filter((a) => a.id !== lead.assignedAgentId && a.isActive !== false).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <button type="button" disabled={!outcome && !comment.trim() && !next && !transferTo} onClick={save} className="w-full rounded-xl py-3 bg-[#141414] text-white font-bold disabled:opacity-40">حفظ الأكشن</button>
      {saved && <p className="text-sm font-bold text-[#1E7A45]">✓ {saved}</p>}
      {act && act.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E8D3A6]">
          <p className="text-xs font-bold">سجل المتابعة</p>
          {act.slice(0, 8).map((a, i) => (
            <div key={i} className="text-xs leading-6">
              <b>{a.outcome}</b>{a.comment ? ` · ${a.comment}` : ''}{a.transferTo ? ` · اتنقل لـ ${a.transferTo}` : ''}{a.nextAt ? ` · الجاي ${formatWhen(a.nextAt)}` : ''}
              <span className="text-[#8C877D]"> — {a.by}، {formatWhen(a.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
