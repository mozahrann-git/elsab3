import React, { useState } from 'react';
import { Lead } from '../../types';
import { heatOf, HEAT_LABEL, Heat } from '../../utils/heat';

/*
  حرارة العميل في رأس الكارت + طلب تعديل.
  السيلز بيطلب (لازم سبب) ← الإدارة توافق أو ترفض.
  الإدارة لو غيّرت بنفسها بيتطبق على طول.
*/
export const HeatBox: React.FC<{
  lead: Lead; isAdmin: boolean; byName: string; chip: string; fg: string;
  onUpdateLead: (l: Lead) => void;
}> = ({ lead, isAdmin, byName, chip, fg, onUpdateLead }) => {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<Heat | ''>('');
  const [why, setWhy] = useState('');
  if (lead.status === 'closed') return null;
  const h = heatOf(lead);
  const req = (lead as any).heatRequest as { heat: Heat; reason: string; by: string; at: number } | undefined;
  const act = (outcome: string, comment = '') => [{ at: Date.now(), by: byName, outcome, comment, kind: 'note' }, ...((lead as any).activity || [])].slice(0, 80);

  const approve = (heat: Heat, note: string) => onUpdateLead({
    ...lead, heatOverride: { heat, at: Date.now(), by: byName }, heatRequest: null,
    activity: act(`الحرارة اتعدّلت لـ ${HEAT_LABEL[heat]}`, note),
  } as any);
  const reject = () => onUpdateLead({ ...lead, heatRequest: null, activity: act(`اترفض طلب تعديل الحرارة لـ ${req ? HEAT_LABEL[req.heat] : ''}`) } as any);
  const submit = () => {
    if (!to || !why.trim()) return;
    if (isAdmin) approve(to, why.trim());
    else onUpdateLead({ ...lead, heatRequest: { heat: to, reason: why.trim(), by: byName, at: Date.now() }, activity: act(`طلب تعديل الحرارة لـ ${HEAT_LABEL[to]}`, why.trim()) } as any);
    setOpen(false); setTo(''); setWhy('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="h-7 px-3 rounded-full font-bold inline-flex items-center" style={{ background: chip, color: fg }}>{HEAT_LABEL[h.heat]}</span>
        <span className="opacity-80">{h.reason}</span>
        {!req && <button onClick={() => setOpen((v) => !v)} className="underline font-bold">{isAdmin ? 'غيّر الحرارة' : 'اطلب تعديل'}</button>}
      </div>
      {req && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs rounded-xl px-3 py-2" style={{ background: chip }}>
          <span className="font-bold">طلب من {req.by}: يبقى {HEAT_LABEL[req.heat]} — «{req.reason}»</span>
          {isAdmin ? (
            <>
              <button onClick={() => approve(req.heat, req.reason)} className="px-2.5 py-1 rounded-lg bg-white text-[#1E7A45] font-bold">وافق</button>
              <button onClick={reject} className="px-2.5 py-1 rounded-lg bg-white text-[#9E2A1B] font-bold">ارفض</button>
            </>
          ) : <span className="opacity-80">مستني موافقة الإدارة</span>}
        </div>
      )}
      {open && (
        <div className="rounded-xl p-2.5 space-y-2 bg-white text-[#141414]">
          <div className="flex gap-1.5">
            {(['hot', 'warm', 'cold'] as Heat[]).filter((x) => x !== h.heat).map((x) => (
              <button key={x} onClick={() => setTo(x)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${to === x ? 'bg-[#141414] text-white border-[#141414]' : 'bg-[#F6F4EF] border-[#ECE8DF]'}`}>{HEAT_LABEL[x]}</button>
            ))}
          </div>
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="السبب (إجباري)"
            className="w-full px-3 py-2 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-xs" />
          <button disabled={!to || !why.trim()} onClick={submit} className="w-full py-2 rounded-lg bg-[#141414] text-white text-xs font-bold disabled:opacity-40">
            {isAdmin ? 'غيّرها' : 'ابعت الطلب للإدارة'}
          </button>
        </div>
      )}
    </div>
  );
};
export default HeatBox;
