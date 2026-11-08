import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { WhenPicker, WhenValue, formatWhen, relTime } from './common/WhenPicker';

/*
  نقل العميل لمرحلة: لازم كومنت عشان رحلة العميل تتسجل بالتفصيل،
  وميعاد الأكشن الجاي (اختياري) بيتحول لتنبيه حقيقي.
*/
/* نتيجة المكالمة — دي اللي بتخلّي رقم الـ٥٠ يعني حاجة.
   من غيرها العدّاد بيقول "٥٠ مكالمة" وانت مش عارف رد كام
   ومردش كام ومهتم كام. */
export type CallOutcome = 'interested' | 'answered' | 'no_answer';

export const CALL_OUTCOMES: { id: CallOutcome; label: string; tone: string }[] = [
  { id: 'interested', label: 'رد ومهتم', tone: 'bg-[#EEF5F0] text-[#1E7A45] border-[#BFE0CC]' },
  { id: 'answered',   label: 'رد مش مهتم', tone: 'bg-[#FBF1E4] text-[#A07A26] border-[#E8D3A6]' },
  { id: 'no_answer',  label: 'مردش', tone: 'bg-[#FBEDEA] text-[#C2412D] border-[#E8C4BC]' },
];

export interface LeadActivity {
  at: number; by: string; outcome: string; comment: string;
  nextAt?: number; transferTo?: string;
  /* موجودة في التسجيل السريع بس — التسجيل الكامل بيسيبها فاضية */
  call?: CallOutcome;
  /* نوع التسجيل: أكشن فعلي، معاينة جديدة، ولا مجرد ملاحظة/تأجيل تذكير.
     الملاحظة مابتتحسبش أكشن ولا معاينة. القديم من غير نوع = زي ما كان. */
  kind?: 'action' | 'viewing' | 'note';
}

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
  const [kind, setKind] = useState<'action' | 'viewing' | 'note' | ''>('');
  const act = (lead.activity || []) as LeadActivity[];
  const nextAt = lead.nextActionAt || undefined;
  const label = (id: string) => stages.find((s) => s.id === id)?.label || id;
  // الصفقة المغلقة والمؤجل/غير مهتم بس هما اللي مش محتاجين ميعاد جاي
  const closing = stage === ('closed' as LeadStatus) || stage === ('lost' as LeadStatus);
  /* السؤال بيظهر بس لعميل في «تمت المعاينة» وفاضل فيها: الكومنت هنا غالباً متابعة،
     فلازم يقول هل دي معاينة جديدة فعلاً — عشان مايتعدّش معاينة والعميل ماجاش */
  /* أي أكشن على كارت «تمت المعاينة» لازم يقول الأول: معاينة جديدة ولا متابعة.
     لو متابعة ← لازم ينقله لمرحلته الصحيحة (مايفضلش في «تمت المعاينة») وبعدين يكتب الأكشن */
  const ask = lead.status === ('visit_done' as LeadStatus);
  const needMove = ask && kind === 'note' && stage === lead.status;
  const canSave = (!ask || !!kind) && !needMove && !!comment.trim() && (closing || !!next);

  /* تسجيل سريع: دوسة واحدة بتسجّل المكالمة ونتيجتها.
     ٥٠ مكالمة في اليوم مستحيلة لو كل واحدة محتاجة كومنت
     وميعاد — فالمكالمة اللي مردش فيها بتتسجّل بدوسة،
     واللي محتاجة تفاصيل بتتسجّل من التسجيل الكامل تحت. */
  const quickLog = (c: CallOutcome) => {
    const meta = CALL_OUTCOMES.find((x) => x.id === c)!;
    const entry: LeadActivity = {
      at: Date.now(), by: byName,
      outcome: `مكالمة: ${meta.label}`,
      comment: '', call: c,
    };
    onUpdateLead({
      ...lead,
      notes: [`مكالمة: ${meta.label}`, ...(lead.notes || [])],
      activity: [entry, ...act].slice(0, 80),
      lastContactDate: new Date().toISOString(),
      isFresh: false,
    });
    setSaved(`اتسجّلت: ${meta.label}`);
    setTimeout(() => setSaved(''), 2500);
  };

  const save = () => {
    const moved = stage !== lead.status;
    // التأجيل بيتسجل: مفيش حد يغيّر ميعاد من غير أثر
    const postponed = !!(lead.nextActionAt && next && next.at > lead.nextActionAt);
    const entry: LeadActivity = {
      at: Date.now(), by: byName,
      /* اسم المرحلة مابيتكتبش غير لو اتنقل فعلاً — عشان كومنت على عميل في «تمت المعاينة»
         مايتعدّش معاينة جديدة */
      outcome: ask && kind === 'viewing' ? (moved ? `معاينة جديدة · نقل إلى: ${label(stage)}` : 'معاينة جديدة · تمت المعاينة')
        : ask && kind === 'note' && moved ? `📝 متابعة · نقل إلى: ${label(stage)}`
        : postponed ? `${ask ? '📝 متابعة · ' : ''}تأجيل من ${formatWhen(lead.nextActionAt!)} لـ ${formatWhen(next!.at)}`
        : moved ? `نقل إلى: ${label(stage)}`
        : ask ? '📝 متابعة بعد المعاينة' : `في: ${label(stage)}`,
      comment: comment.trim(), nextAt: next?.at, kind: ask ? (kind || undefined) : undefined,
    };
    onUpdateLead({
      ...lead,
      status: stage,
      notes: [`${entry.outcome} · ${comment.trim()}`, ...(lead.notes || [])],
      activity: [entry, ...act].slice(0, 80),
      snoozeCount: ((lead as any).snoozeCount || 0) + (postponed ? 1 : 0),
      lastContactDate: new Date().toISOString(),
      nextActionAt: closing ? null : next?.at ?? lead.nextActionAt ?? null,
      followUpScheduledAt: next ? next.label : lead.followUpScheduledAt,
      followUpNote: comment.trim(),
      followUpStatus: closing ? 'completed' : next ? 'pending' : lead.followUpStatus,
    });
    setSaved(next ? `اتسجّل، والتنبيه ${formatWhen(next.at)}` : 'اتسجّل');
    setComment(''); setNext(null); setKind(''); setStage(stage);
  };

  return (
    <div className="p-4 rounded-2xl border border-[#E8D3A6] bg-[#FBF8F1] space-y-3" dir="rtl">
      <div className="flex justify-between items-center gap-2">
        <p className="font-bold text-[#141414]">نقل وتسجيل</p>
        {nextAt ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${nextAt < Date.now() ? 'bg-[#FBEDEA] text-[#C2412D]' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>الأكشن: {formatWhen(nextAt)} · {relTime(nextAt)}</span> : null}
      </div>
      {ask && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-[#141414]">العميل نزل معاينة جديدة فعلاً؟ (إجباري)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([['viewing', '👁️ أيوه، معاينة جديدة', 'تتحسب معاينة'], ['note', '📝 لأ، مجرد متابعة', 'كومنت أو تأجيل التذكير']] as const).map(([k, t, d]) => (
              <button key={k} type="button" onClick={() => { setKind(k); setStage(lead.status); }}
                className={`rounded-xl p-2 text-right border transition ${kind === k ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>
                <span className="block text-[12px] font-bold">{t}</span>
                <span className={`block text-[10px] ${kind === k ? 'text-white/70' : 'text-[#8C877D]'}`}>{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {(!ask || kind === 'viewing') && (
        <select value={stage} onChange={(e) => setStage(e.target.value as LeadStatus)} className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm font-bold">
          {stages.map((s) => <option key={s.id} value={s.id}>{s.id === lead.status ? `${s.label} (الحالية)` : `نقل إلى: ${s.label}`}</option>)}
        </select>
      )}
      {ask && kind === 'note' && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-[#141414]">العميل دلوقتي في أنهي مرحلة؟ (إجباري)</p>
          <select value={stage === lead.status ? '' : stage} onChange={(e) => setStage((e.target.value || lead.status) as LeadStatus)}
            className={`w-full rounded-xl bg-white border p-3 text-sm font-bold ${needMove ? 'border-[#C2412D]' : 'border-[#E4DFD4]'}`}>
            <option value="">اختار مرحلته الصحيحة…</option>
            {stages.filter((s) => s.id !== lead.status).map((s) => <option key={s.id} value={s.id}>نقل إلى: {s.label}</option>)}
          </select>
        </div>
      )}
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="اكتب اللي حصل (إجباري)" className="w-full rounded-xl bg-white border border-[#E4DFD4] p-3 text-sm" />
      {!closing && <WhenPicker value={next} onChange={setNext} label="ميعاد المتابعة الجاية (إجباري)" />}
      <button type="button" disabled={!canSave} onClick={save} className="w-full rounded-xl py-3 bg-[#141414] text-white font-bold disabled:opacity-40">
        {stage !== lead.status ? `نقل إلى ${label(stage)} وحفظ` : 'حفظ الكومنت'}
      </button>
      {!canSave && <p className="text-[11px] text-[#C2412D]">{ask && !kind ? 'قول هل دي معاينة جديدة ولا متابعة' : needMove ? 'انقل العميل لمرحلته الصحيحة الأول' : !comment.trim() ? 'اكتب اللي حصل الأول' : 'حدد ميعاد المتابعة الجاية'}{closing ? '' : ' · (الصفقة المغلقة والمؤجل بس من غير ميعاد)'}</p>}
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
