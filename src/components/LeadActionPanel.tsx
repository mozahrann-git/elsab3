import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { WhenPicker, WhenValue, formatWhen, relTime } from './common/WhenPicker';

/*
  نقل العميل لمرحلة: لازم كومنت عشان رحلة العميل تتسجل بالتفصيل،
  وميعاد الأكشن الجاي (اختياري) بيتحول لتنبيه حقيقي.
*/
export interface LeadActivity { at: number; by: string; outcome: string; comment: string; nextAt?: number; transferTo?: string }

export const LeadActionPanel: React.FC<{
  lead: Lead;
  stages: { id: LeadStatus; label: string }[];
  byName: string;
  onUpdateLead: (l: Lead) => void;
}> = ({ lead, stages, byName, onUpdateLead }) => {
  const [stage, setStage] = useState<LeadStatus>(lead.status);
  const [comment, setComment] = useState('');
  const [next, setNext] = useState<WhenValue | null>(null);
  const [saved, setSaved] = useState('');
  const act = (lead.activity || []) as LeadActivity[];
  const nextAt = lead.nextActionAt || undefined;
  const label = (id: string) => stages.find((s) => s.id === id)?.label || id;
  const closing = stage === ('closed_won' as LeadStatus) || stage === ('lost' as LeadStatus) || /مغلقة|غير مهتم/.test(label(stage));

  const save = () => {
    const moved = stage !== lead.status;
    const entry: LeadActivity = { at: Date.now(), by: byName, outcome: moved ? `نقل إلى: ${label(stage)}` : `في: ${label(stage)}`, comment: comment.trim(), nextAt: next?.at };
    onUpdateLead({
      ...lead,
      status: stage,
      notes: [`${entry.outcome} · ${comment.trim()}`, ...(lead.notes || [])],
      activity: [entry, ...act].slice(0, 80),
      lastContactDate: new Date().toISOString(),
      nextActionAt: closing ? null : next?.at ?? lead.nextActionAt ?? null,
      followUpScheduledAt: next ? next.label : lead.followUpScheduledAt,
      followUpNote: comment.trim(),
      followUpStatus: closing ? 'completed' : next ? 'pending' : lead.followUpStatus,
    });
    setSaved(next ? `اتسجّل، والتنبيه ${formatWhen(next.at)}` : 'اتسجّل');
    setComment(''); setNext(null);
  };

  return (
    <div className="p-4 rounded-2xl border border-[#E8D3A6] bg-[#FBF8F1] space-y-3" dir="rtl">
      <div className="flex justify-between items-center gap-2">
        <p className="font-bold text-[#141414]">نقل وتسجيل</p>
        {nextAt ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${nextAt < Date.now() ? 'bg-[#FBEDEA] text-[#C2412D]' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>الأكشن: {formatWhen(nextAt)} · {relTime(nextAt)}</span> : null}
      </div>
      <select value={stage} onChange={(e) => setStage(e.target.value as LeadStatus)} className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm font-bold">
        {stages.map((s) => <option key={s.id} value={s.id}>{s.id === lead.status ? `${s.label} (الحالية)` : `نقل إلى: ${s.label}`}</option>)}
      </select>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="اكتب اللي حصل (إجباري)" className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm" />
      {!closing && <WhenPicker value={next} onChange={setNext} label="ميعاد الأكشن الجاي (اختياري)" />}
      <button type="button" disabled={!comment.trim()} onClick={save} className="w-full rounded-xl py-3 bg-[#141414] text-white font-bold disabled:opacity-40">
        {stage !== lead.status ? `نقل إلى ${label(stage)} وحفظ` : 'حفظ الكومنت'}
      </button>
      {!comment.trim() && <p className="text-[11px] text-[#8C877D]">مينفعش تنقل أو تحفظ من غير كومنت</p>}
      {saved && <p className="text-sm font-bold text-[#1E7A45]">✓ {saved}</p>}
      {act.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E8D3A6]">
          <p className="text-xs font-bold">رحلة العميل</p>
          {act.slice(0, 12).map((a, i) => (
            <div key={i} className="text-xs leading-6 border-r-2 border-[#E8D3A6] pr-2">
              <b>{a.outcome}</b>{a.comment ? ` · ${a.comment}` : ''}{a.nextAt ? ` · الجاي ${formatWhen(a.nextAt)}` : ''}
              <span className="text-[#8C877D] block">{a.by} · {formatWhen(a.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
