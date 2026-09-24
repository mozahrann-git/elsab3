import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PhoneCall, ArrowLeft } from 'lucide-react';
import { Lead, Property } from '../../types';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../../data/properties';
import { BudgetRange } from '../common/WhenPicker';
import { DiscoveryQuestion, SalesForms, DEFAULT_FORMS, subscribeSalesForms } from '../../services/salesToolsService';

/*
  مكالمة الاكتشاف: السيلز بيدوس الإجابات وهو بيتكلم، فملف العميل بيتملى لوحده،
  وزرار العرض المخصوص مبيفتحش غير بعد عدد إجابات تحدده الإدارة.
*/
interface Props {
  isOpen: boolean;
  lead: Lead;
  properties: Property[];
  byName: string;
  onClose: () => void;
  onSaved: (updated: Lead) => void;
  onBuildOffer: (updated: Lead) => void;
}

export const DiscoveryCallModal: React.FC<Props> = ({ isOpen, lead, properties, byName, onClose, onSaved, onBuildOffer }) => {
  const [forms, setForms] = useState<SalesForms>(DEFAULT_FORMS);
  const [a, setA] = useState<Record<string, any>>(() => (lead as any).discovery || {});
  const [minB, setMinB] = useState<number>(lead.budgetMin || 1500000);
  const [maxB, setMaxB] = useState<number>(lead.budgetMax || 4000000);
  useEffect(() => subscribeSalesForms(setForms), []);
  useEffect(() => { if (isOpen) { setA((lead as any).discovery || {}); setMinB(lead.budgetMin || 1500000); setMaxB(lead.budgetMax || 4000000); } }, [isOpen, lead]);

  const answered = useMemo(() => forms.discovery.filter((q) => (q.id === 'budget' ? true : Array.isArray(a[q.id]) ? a[q.id].length > 0 : !!a[q.id])).length, [a, forms]);
  const missingRequired = forms.discovery.filter((q) => q.required && q.id !== 'budget' && !(Array.isArray(a[q.id]) ? a[q.id].length : a[q.id]));
  const canBuild = answered >= forms.minAnswers && missingRequired.length === 0;

  if (!isOpen) return null;

  const pick = (q: DiscoveryQuestion, v: string) => {
    setA((s) => {
      if (q.type === 'multi') {
        const cur: string[] = s[q.id] || [];
        return { ...s, [q.id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
      }
      return { ...s, [q.id]: s[q.id] === v ? '' : v };
    });
  };

  const build = (): Lead => {
    const districts: string[] = a.districts || [];
    return {
      ...lead,
      discovery: { ...a, answeredAt: Date.now(), by: byName },
      budgetMin: minB, budgetMax: maxB,
      preferredNeighborhood: districts[0] || lead.preferredNeighborhood,
      preferredBedrooms: a.rooms ? Number(String(a.rooms).replace('+', '')) : lead.preferredBedrooms,
      preferredFinishing: a.finishing === 'متشطبة' ? 'finished' : a.finishing === 'نص تشطيب' ? 'semi_finished' : lead.preferredFinishing,
      activity: [{ at: Date.now(), by: byName, outcome: 'مكالمة اكتشاف', comment: `${districts.join('، ') || '—'} · ${(minB / 1e6).toFixed(1)}-${(maxB / 1e6).toFixed(1)} مليون · ${a.purpose || ''} ${a.urgency || ''}`.trim() }, ...(lead.activity || [])].slice(0, 80),
      lastContactDate: new Date().toISOString(),
    } as Lead;
  };

  const chip = (on: boolean) => `px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'}`;

  return createPortal(
    <div className="fixed inset-0 z-[75] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-[#F6F4EF] w-full sm:max-w-2xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col">
        <header className="bg-[#141414] text-white px-5 py-4 flex justify-between items-center rounded-t-3xl">
          <div>
            <p className="font-bold flex items-center gap-2"><PhoneCall size={16} className="text-[#D9B864]" />مكالمة اكتشاف</p>
            <p className="text-xs text-[#CFCBC2]">{lead.name} · {lead.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#D9B864] text-[#141414]">{answered} من {forms.discovery.length}</span>
            <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          <p className="text-sm text-[#6B665C] leading-7">دوس الإجابات وانت بتتكلم معاه. ملف العميل والمطابقة والعرض بيتبنوا من هنا.</p>
          {forms.discovery.map((q, i) => {
            const opts = q.id === 'districts' ? (HADABA_WOSTA_NEIGHBORHOODS as unknown as string[]) : (q.options || []);
            const val = a[q.id];
            const done = q.type === 'range' ? true : Array.isArray(val) ? val.length > 0 : !!val;
            return (
              <section key={q.id} className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-sm">{i + 1}. {q.label}{q.required && <span className="text-[#C2412D]"> *</span>}</span>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${done ? 'bg-[#EEF5F0] text-[#1E7A45]' : 'bg-[#F0ECE4] text-[#8C877D]'}`}>{done ? '✓ اتسجّل' : 'لسه'}</span>
                </div>
                {q.type === 'range' ? (
                  <BudgetRange min={minB} max={maxB} onChange={(mn, mx) => { setMinB(mn); setMaxB(mx); }} />
                ) : q.type === 'number' || q.type === 'text' ? (
                  <input value={val || ''} onChange={(e) => setA({ ...a, [q.id]: e.target.value })} className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {opts.map((o) => (
                      <button key={o} type="button" onClick={() => pick(q, o)} className={chip(Array.isArray(val) ? val.includes(o) : val === o)}>{o}</button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#E4DFD4] space-y-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <button disabled={!canBuild} onClick={() => { const u = build(); onSaved(u); onBuildOffer(u); }}
            className="w-full py-4 rounded-2xl bg-[#A07A26] text-white text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            جهّز العرض المخصوص <ArrowLeft size={18} />
          </button>
          {!canBuild && <p className="text-[11px] text-[#C2412D] text-center">محتاج {forms.minAnswers} إجابات على الأقل{missingRequired.length ? ` · ناقص: ${missingRequired.map((q) => q.label).join('، ')}` : ''}</p>}
          <button onClick={() => { onSaved(build()); onClose(); }} className="w-full py-3 rounded-xl bg-[#F6F4EF] text-sm font-bold">احفظ الإجابات وأكمل بعدين</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
