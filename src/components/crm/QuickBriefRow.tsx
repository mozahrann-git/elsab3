import React, { useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { Lead } from '../../types';
import { readBrief, instalmentCeiling, payModeOf, DEFAULT_INSTALMENT_YEARS } from '../../services/clientBrief';

/*
  تعديل طلب العميل من مسار المتابعات.

  المشكلة اللي بيحلّها: المسار كان بيعرض الطلب وبس. العميل يقولك في
  المكالمة «خلاص أنا ماشي نص تشطيب» أو «أقسّط أحسن»، والسيلز ملوش طريقة
  يغيّرها غير إنه يفتح مكالمة اكتشاف من الأول — فمكانش بيغيّرها، والمطابقة
  تفضل شغالة على طلب قديم.

  دلوقتي: التشطيب والدفع والمقدم والقسط بيتغيّروا من الكارت نفسه.
  الميزانية مش هنا بقصد — دي بتعدّل بموافقة الإدارة من الملف الكامل.
*/

const n = (v: string) => Number(String(v).replace(/[^\d]/g, '')) || 0;
const money = (v: number) => (v ? v.toLocaleString('en-US') : '');

interface Props {
  lead: Lead;
  byName: string;
  onUpdateLead: (lead: Lead) => void;
}

export const QuickBriefRow: React.FC<Props> = ({ lead, byName, onUpdateLead }) => {
  const [open, setOpen] = useState(false);
  const b = readBrief(lead);
  const mode = payModeOf(b);
  const ceiling = instalmentCeiling(b);

  /* بنكتب جوه discovery عشان readBrief والمطابقة يقروها على طول —
     نفس المكان اللي مكالمة الاكتشاف بتكتب فيه، مش مكان تاني. */
  const patch = (changes: Record<string, any>, what: string) => {
    const d = { ...((lead as any).discovery || {}), ...changes };
    onUpdateLead({
      ...lead,
      discovery: d,
      preferredFinishing:
        changes.finishing === 'متشطبة' ? 'finished'
        : changes.finishing === 'نص تشطيب' ? 'semi_finished'
        : lead.preferredFinishing,
      activity: [
        { at: Date.now(), by: byName, outcome: 'تعديل الطلب', comment: what },
        ...(lead.activity || []),
      ].slice(0, 80),
    } as Lead);
  };

  const chip = (on: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition ${
      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'
    }`;

  const finishingLabel =
    b.finishing === 'finished' ? 'متشطبة' : b.finishing === 'semi_finished' ? 'نص تشطيب' : 'أي تشطيب';
  const payLabel = mode === 'cash' ? 'كاش' : mode === 'instalment' ? 'تقسيط' : 'كاش أو تقسيط';

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-xl p-2.5 space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 text-right cursor-pointer"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <SlidersHorizontal size={13} className="text-[#A07A26] shrink-0" />
          <span className="text-[11px] font-bold text-[#141414] truncate">
            {finishingLabel} · {payLabel}
            {mode === 'instalment' ? ' · مشاريع بس' : ''}
            {ceiling && mode !== 'cash' ? ` · مشاريع لحد ${(ceiling / 1e6).toFixed(1)}م` : ''}
          </span>
        </span>
        <span className="text-[11px] font-bold text-[#A07A26] shrink-0">
          {open ? 'اقفل' : 'عدّل طلبه'}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 pt-1 border-t border-[#F0ECE4]">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8C877D]">التشطيب</p>
            <div className="flex flex-wrap gap-1.5">
              {['متشطبة', 'نص تشطيب', 'الاتنين'].map((o) => (
                <button
                  key={o}
                  onClick={() => patch({ finishing: o }, `التشطيب بقى: ${o}`)}
                  className={chip((((lead as any).discovery || {}).finishing || '') === o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8C877D]">الدفع</p>
            <div className="flex flex-wrap gap-1.5">
              {['كاش', 'تقسيط', 'الاتنين'].map((o) => (
                <button
                  key={o}
                  onClick={() => patch({ payment: o }, `الدفع بقى: ${o}`)}
                  className={chip(b.payment === o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {b.payment !== 'كاش' && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#8C877D]">المقدم والقسط</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#8C877D]">المقدم (ج.م)</span>
                  <input
                    defaultValue={money(b.downCash)}
                    dir="ltr"
                    inputMode="numeric"
                    onBlur={(e) => {
                      const v = n(e.target.value);
                      if (v !== b.downCash) patch({ downCash: v }, `المقدم: ${money(v)}`);
                    }}
                    className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-lg px-2 py-1.5 text-[11px] font-mono"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#8C877D]">القسط الشهري (ج.م)</span>
                  <input
                    defaultValue={money(b.monthly)}
                    dir="ltr"
                    inputMode="numeric"
                    onBlur={(e) => {
                      const v = n(e.target.value);
                      if (v !== b.monthly) patch({ monthly: v }, `القسط: ${money(v)}`);
                    }}
                    className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-lg px-2 py-1.5 text-[11px] font-mono"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#8C877D]">على كام سنة:</span>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <button
                    key={y}
                    onClick={() => patch({ years: String(y) }, `التقسيط على ${y} سنين`)}
                    className={chip(b.years === y)}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* القاعدة صريحة: الريسيل كاش، والتقسيط مشاريع */}
              {ceiling > 0 && (
                <p className="text-[11px] bg-[#EEF5F0] border border-[#BFE0CC] text-[#1E7A45] rounded-lg px-2.5 py-1.5 leading-relaxed flex items-start gap-1.5">
                  <Check size={13} className="shrink-0 mt-0.5" />
                  <span>
                    في المشاريع يقدر على وحدة لحد{' '}
                    <b className="font-mono">{money(ceiling)}</b> ج.م — مقدم{' '}
                    <b className="font-mono">{money(b.downCash)}</b> + قسط{' '}
                    <b className="font-mono">{money(b.monthly)}</b> ×{' '}
                    {b.years || DEFAULT_INSTALMENT_YEARS} سنين.
                    {' '}<b>الريسيل مش هيظهرله</b> لأن المالك مش بيقسّط.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickBriefRow;
