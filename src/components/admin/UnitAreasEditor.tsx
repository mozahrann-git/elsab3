import React from 'react';
import { Plus, Trash2, Ruler } from 'lucide-react';
import { Project, UnitArea, areaPlanNumbers } from '../../services/projectService';

/*
  مساحات المشروع.

  بتكتب المساحة وبس — والنظام بيحسب سعرها من سعر المتر، ومقدمها وقسطها
  على كل نظام سداد. لو المساحة ليها سعر خاص، تكتبه وهو بيغلب على الحساب.

  ده بيمنع غلطة شائعة: السيلز بيحسب المقدم والقسط بإيده في المكالمة
  وبيغلط، أو بيقول رقم "يبدأ من" لمساحة أكبر.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Props {
  d: Project;
  setD: React.Dispatch<React.SetStateAction<Project>>;
}

export const UnitAreasEditor: React.FC<Props> = ({ d, setD }) => {
  const areas = d.unitAreas || [];
  const plans = d.plans || [];

  const setArea = (i: number, patch: Partial<UnitArea>) =>
    setD((prev) => {
      const list = [...(prev.unitAreas || [])];
      list[i] = { ...list[i], ...patch };
      return { ...prev, unitAreas: list };
    });

  const add = () =>
    setD((prev) => ({ ...prev, unitAreas: [...(prev.unitAreas || []), { area: 0 }] }));

  const remove = (i: number) =>
    setD((prev) => ({ ...prev, unitAreas: (prev.unitAreas || []).filter((_, x) => x !== i) }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-[#A07A26] flex items-center gap-1.5">
          <Ruler size={13} /> المساحات
        </p>
        <button onClick={add} className="text-[11px] font-bold text-[#141414] flex items-center gap-1 cursor-pointer">
          <Plus size={12} /> ضيف مساحة
        </button>
      </div>

      {!d.pricePerMeter && areas.length > 0 && (
        <p className="text-[11px] bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-lg px-2.5 py-1.5 leading-relaxed">
          اكتب <b>سعر المتر</b> فوق عشان الأسعار تتحسب لوحدها — أو اكتب سعر كل مساحة بإيدك.
        </p>
      )}

      {areas.length === 0 && (
        <p className="text-[11px] text-[#6B665C] bg-white border border-[#ECE8DF] rounded-xl px-3 py-2.5 leading-relaxed">
          ضيف كل مساحة موجودة في المشروع. النظام هيحسب لكل واحدة سعرها ومقدمها وقسطها على كل نظام سداد،
          والسيلز هيلاقيها جاهزة في المكالمة.
        </p>
      )}

      {areas.map((u, i) => (
        <div key={i} className={`bg-white border rounded-xl p-3 space-y-2 ${u.sold ? 'border-[#E8C2BA] opacity-70' : 'border-[#ECE8DF]'}`}>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <label className="space-y-1 block">
              <span className="text-[10px] text-[#6B665C]">المساحة (م²)</span>
              <input
                type="number" dir="ltr" min={0}
                value={u.area || ''}
                onChange={(e) => setArea(i, { area: Number(e.target.value) || 0 })}
                className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-lg px-2.5 py-2 text-sm font-mono"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] text-[#6B665C]">سعر خاص (اختياري)</span>
              <input
                type="number" dir="ltr" min={0}
                value={u.price || ''}
                placeholder={d.pricePerMeter && u.area ? String(u.area * d.pricePerMeter) : ''}
                onChange={(e) => setArea(i, { price: Number(e.target.value) || undefined })}
                className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-lg px-2.5 py-2 text-sm font-mono"
              />
            </label>
            <button onClick={() => remove(i)} className="p-2 rounded-lg bg-[#FDF2F0] border border-[#E8C2BA] cursor-pointer">
              <Trash2 size={13} className="text-[#9E2A1B]" />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={u.label || ''}
              onChange={(e) => setArea(i, { label: e.target.value })}
              placeholder="وصف (اختياري): الدور التالت مثلاً"
              className="flex-1 min-w-[140px] bg-[#FAF9F5] border border-[#ECE8DF] rounded-lg px-2.5 py-1.5 text-[11px]"
            />
            <label className="flex items-center gap-1.5 text-[11px] text-[#6B665C] cursor-pointer">
              <input type="checkbox" checked={!!u.sold} onChange={(e) => setArea(i, { sold: e.target.checked })} className="accent-[#9E2A1B]" />
              اتباعت
            </label>
          </div>

          {/* الحساب بيظهر وإنت بتكتب — مفيش حساب بإيدك ولا غلط في المكالمة */}
          {u.area > 0 && plans.length > 0 && (
            <div className="bg-[#FAF8F3] border border-[#ECE8DF] rounded-lg divide-y divide-[#ECE8DF]">
              {plans.map((pl, pi) => {
                const r = areaPlanNumbers(d, u, pl);
                return (
                  <div key={pi} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] flex-wrap">
                    <span className="font-bold text-[#141414]">{pl.label || `نظام ${pi + 1}`}</span>
                    <span className="text-[#6B665C]">
                      السعر <b className="text-[#141414] font-mono">{f(r.price)}</b>
                      {' · '}مقدم <b className="text-[#141414] font-mono">{f(r.down)}</b>
                      {' · '}قسط <b className="text-[#141414] font-mono">{f(r.monthly)}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UnitAreasEditor;
