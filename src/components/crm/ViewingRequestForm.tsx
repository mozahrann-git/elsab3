import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import { Lead, Property } from '../../types';
import { createViewingRequests } from '../../services/portalService';

/*
  طلب معاينة لسارة من جوه الـCRM — بدل «أدوات المستشار العقاري».
  اسم العميل ورقمه، أكواد الشقق (أكتر من كود)، واليوم والساعة من قايمة.
  بيعمل طلب لكل كود في بوابة سارة، وبينقل العميل لـ«تحت الطلب».
*/

const DAY_NAMES = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
const TIMES: { label: string; h: number; m: number }[] = [];
for (let h = 10; h <= 21; h++) for (const m of [0, 30]) {
  const hh = h > 12 ? h - 12 : h;
  TIMES.push({ label: `${hh}:${m ? '30' : '00'} ${h < 12 ? 'الصبح' : h < 17 ? 'الضهر' : 'بالليل'}`, h, m });
}

export const ViewingRequestForm: React.FC<{
  lead: Lead;
  properties: Property[];
  byName: string;
  onUpdateLead: (l: Lead) => void;
  onClose: () => void;
}> = ({ lead, properties, byName, onUpdateLead, onClose }) => {
  const [name, setName] = useState(lead.name || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [codes, setCodes] = useState<string[]>(lead.interestedPropertyCode ? [lead.interestedPropertyCode] : []);
  const [codeIn, setCodeIn] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [timeIdx, setTimeIdx] = useState(TIMES.findIndex((t) => t.h === 17 && t.m === 0));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const days = useMemo(() => Array.from({ length: 8 }, (_, k) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + k);
    return { d, label: k === 0 ? 'النهارده' : k === 1 ? 'بكرة' : `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` };
  }), []);

  const byCode = (c: string) => properties.find((p) => (p.code || '').toUpperCase() === c.trim().toUpperCase());
  const add = () => {
    const p = byCode(codeIn);
    if (!p) { setErr(`الكود ${codeIn || ''} مش موجود`); return; }
    if (!codes.includes(p.code)) setCodes((x) => [...x, p.code]);
    setCodeIn(''); setErr('');
  };

  const t = TIMES[timeIdx];
  const when = new Date(days[dayIdx].d); when.setHours(t.h, t.m, 0, 0);
  const whenLabel = `${days[dayIdx].label} الساعة ${t.label}`;

  const save = async () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) { setErr('اكتب اسم العميل ورقمه'); return; }
    if (!codes.length) { setErr('ضيف كود شقة واحد على الأقل'); return; }
    setBusy(true); setErr('');
    const now = Date.now();
    const reqs = codes.map((c, k) => {
      const p = byCode(c)!;
      return {
        id: `req_${now}_${k}`,
        propertyId: p.id, propertyCode: p.code, propertyTitle: p.title,
        propertyNeighborhood: p.neighborhood, propertyPrice: p.price, propertyArea: p.area,
        propertyImage: p.images?.[0], brokerId: (p as any).brokerId || '',
        leadId: lead.id,
        requestingAgentId: lead.assignedAgentId, requestingAgentName: lead.assignedAgentName,
        coordinatorName: 'سارة',
        clientName: name.trim(), clientPhone: phone.trim(), clientNotes: note.trim(),
        clientPreferredTime: whenLabel, scheduledAtTimestamp: when.getTime(),
        status: 'pending_broker', createdAt: new Date(now).toISOString(), createdAtTimestamp: now, remindersSent: 0,
      };
    });
    try {
      await createViewingRequests(reqs);
      onUpdateLead({
        ...lead,
        name: name.trim(), phone: phone.trim(),
        status: ['closed', 'lost', 'visit_booked', 'visit_done', 'negotiation'].includes(lead.status) ? lead.status : 'visit_requested',
        interestedPropertyCode: codes[0],
        visitScheduledAt: whenLabel,
        coordinatorName: 'سارة',
        nextActionAt: when.getTime(),
        followUpStatus: 'pending',
        followUpNote: `معاينة ${codes.join('، ')} — ${whenLabel} (مستنية تأكيد سارة)`,
        activity: [{ at: now, by: byName, outcome: `طلب معاينة · ${codes.join('، ')}`, comment: `${whenLabel}${note.trim() ? ` · ${note.trim()}` : ''}`, nextAt: when.getTime() },
          ...(lead.activity || [])].slice(0, 80),
        lastContactDate: new Date(now).toISOString(),
      } as Lead);
      setDone(true);
    } catch (e: any) {
      setErr(`الطلب ماتبعتش — ${String(e?.code || '').includes('permission') ? 'الصلاحيات رافضة، اعمل خروج وادخل تاني' : 'النت أو السيرفر، جرّب تاني'}`);
    } finally { setBusy(false); }
  };

  const input = 'w-full px-3 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm';
  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between">
          <p className="font-bold text-sm">طلب معاينة من سارة</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
        </div>
        {done ? (
          <div className="p-5 space-y-3 text-center">
            <p className="font-bold text-[#1E7A45]">✓ الطلب وصل لسارة</p>
            <p className="text-sm text-[#6B665C]">{codes.join('، ')} · {whenLabel}</p>
            <p className="text-xs text-[#6B665C]">العميل اتنقل لـ«تحت الطلب»، وأول ما سارة تأكد هيتنقل لـ«معاينة مؤكدة» لوحده.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm">تمام</button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العميل" className={input} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقمه" dir="ltr" className={`${input} font-mono`} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#6B665C] mb-1">أكواد الشقق</p>
              <div className="flex gap-2">
                <input value={codeIn} onChange={(e) => setCodeIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="H1128" dir="ltr" list="vr-codes" className={`${input} font-mono`} />
                <button onClick={add} className="px-3 rounded-xl bg-[#141414] text-white"><Plus size={16} /></button>
              </div>
              <datalist id="vr-codes">{properties.filter((p) => p.code).map((p) => <option key={p.id} value={p.code}>{p.neighborhood} · {p.area}م²</option>)}</datalist>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {codes.map((c) => (
                  <button key={c} onClick={() => setCodes((x) => x.filter((y) => y !== c))} className="px-3 py-1.5 rounded-full bg-[#141414] text-white text-xs font-mono font-bold">{c} ✕</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-[#6B665C] space-y-1">اليوم
                <select value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))} className={input}>
                  {days.map((d, k) => <option key={k} value={k}>{d.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-[#6B665C] space-y-1">الساعة
                <select value={timeIdx} onChange={(e) => setTimeIdx(Number(e.target.value))} className={input}>
                  {TIMES.map((x, k) => <option key={k} value={k}>{x.label}</option>)}
                </select>
              </label>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة لسارة (اختياري)" className={input} />
            {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
            <button disabled={busy} onClick={save} className="w-full py-3 rounded-xl bg-[#A07A26] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <><Loader2 size={15} className="animate-spin" />بيتبعت…</> : `ابعت لسارة · ${codes.length || 0} كود · ${whenLabel}`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ViewingRequestForm;
