import React, { useEffect, useMemo, useState } from 'react';
import { subscribeDailySettings } from '../../services/dailyTasks';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { Lead, SalesAgent } from '../../types';
import { endOfCairoDay, fmtDate } from '../../utils/followUpAlerts';

/*
  حل المتأخر (للإدارة):
  ١) توزيع المتأخر على الأيام الجاية — عدد ثابت في اليوم لكل سيلز، والمهم الأول.
  ٢) «مابيردش»: عميل اتسجّل عليه «مردش» ٣ مرات ورا بعض — الإدارة تقرر:
     يتحوّل لسيلز تاني، يتقفل «غير مهتم»، أو يتساب.
*/

const n = (x: number) => Math.round(x || 0).toLocaleString('en-US');
const DAY = 86400000;
/* الأهم الأول: اللي قرّب يقفل، وبعده اللي في المعاينات، والجديد في الآخر */
const RANK: Record<string, number> = {
  negotiation: 0, visit_booked: 1, visit_done: 2, visit_requested: 3, sent_details: 4, contacted: 5, new: 6,
};
const STAGE_AR: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', sent_details: 'إرسال صور', visit_requested: 'معاينة تحت الطلب',
  visit_booked: 'معاينة مؤكدة', visit_done: 'تمت المعاينة', negotiation: 'تفاوض', closed: 'صفقة مغلقة', lost: 'غير مهتم / مؤجل',
};
const isFriday = (t: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(new Date(t)) === 'Fri';

/** كام «مردش» ورا بعض من آخر حاجة (الملاحظات مابتتحسبش) */
export function noAnswerStreak(l: Lead): number {
  let c = 0;
  for (const e of ((l as any).activity || []) as any[]) {
    if (e?.kind === 'note') continue;
    const na = e?.call === 'no_answer' || /مردش|لم يتم الرد|مبيردش|مابيردش/.test(String(e?.outcome || '') + ' ' + String(e?.comment || ''));
    if (!na) break;
    c++;
  }
  return c;
}

export const LateFixModal: React.FC<{
  leads: Lead[]; agents: SalesAgent[]; adminName: string;
  onUpdateLead: (l: Lead) => void; onOpenLead: (l: Lead) => void; onClose: () => void;
}> = ({ leads, agents, adminName, onUpdateLead, onOpenLead, onClose }) => {
  /* ساعات الشغل من إعدادات المهام — المواعيد الجديدة بتتوزع جوّاها */
  const [hours, setHours] = useState({ start: 11, close: 19 });
  useEffect(() => subscribeDailySettings((st) => setHours({ start: st.startHour || 11, close: st.closeHour || 19 })), []);
  const startHour = hours.start, closeHour = hours.close;
  const [tab, setTab] = useState<'spread' | 'noans'>('spread');
  const [perDay, setPerDay] = useState(15);
  const [fromToday, setFromToday] = useState(false);
  const [agentF, setAgentF] = useState('all');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [to, setTo] = useState('');

  const now = Date.now();
  const active = useMemo(() => leads.filter((l) => l.status !== 'closed' && l.status !== 'lost' && l.followUpStatus !== 'completed'), [leads]);
  const streak = useMemo(() => new Map(active.map((l) => [l.id, noAnswerStreak(l)])), [active]);
  const noAns = useMemo(() => active.filter((l) => (streak.get(l.id) || 0) >= 3), [active, streak]);
  const late = useMemo(() => active.filter((l) => l.nextActionAt && l.nextActionAt <= now && (streak.get(l.id) || 0) < 3), [active, streak]);
  const nameOf = (id?: string) => agents.find((a) => a.id === id)?.name || 'من غير سيلز';

  const byAgent = useMemo(() => {
    const m = new Map<string, Lead[]>();
    late.forEach((l) => { const k = l.assignedAgentId || ''; m.set(k, [...(m.get(k) || []), l]); });
    m.forEach((list, k) => m.set(k, list.sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || (a.nextActionAt || 0) - (b.nextActionAt || 0))));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [late]);

  /* أيام الشغل الجاية (الجمعة إجازة) — بداية كل يوم بتوقيت القاهرة */
  const workDays = (count: number) => {
    const out: number[] = [];
    let sod = endOfCairoDay(now) + 1 - (fromToday ? DAY : 0);
    while (out.length < count) { if (!isFriday(sod + 12 * 3600000)) out.push(sod); sod += DAY; }
    return out;
  };
  const endH = Math.max(startHour + 1, Math.min(closeHour, 24) - 1);
  const slotsOf = (sod: number, k: number) => {
    const from = sod + startHour * 3600000;
    const span = (endH - startHour) * 3600000;
    const first = fromToday && sod <= now ? Math.max(from, now + 15 * 60000) : from;
    const len = Math.max(span - (first - from), 3600000);
    return Array.from({ length: k }, (_, i) => Math.round((first + (len * i) / k) / 60000) * 60000);
  };
  const plan = (list: Lead[]) => {
    const days = workDays(Math.ceil(list.length / Math.max(1, perDay)));
    return list.map((l, i) => {
      const d = Math.floor(i / perDay);
      const k = Math.min(perDay, list.length - d * perDay);
      return { l, at: slotsOf(days[d], k)[i % perDay] };
    });
  };
  const chosen = byAgent.filter(([id]) => agentF === 'all' || id === agentF);

  const spread = async () => {
    const total = chosen.reduce((t, [, l]) => t + l.length, 0);
    if (!total) return;
    if (!window.confirm(`هيترحّل ${total} متابعة متأخرة على الأيام الجاية (${perDay} في اليوم لكل سيلز). متأكد؟`)) return;
    setBusy(true); setMsg('');
    let c = 0;
    chosen.forEach(([, list]) => plan(list).forEach(({ l, at }) => {
      const was = l.nextActionAt ? fmtDate(new Date(l.nextActionAt)) : '';
      onUpdateLead({
        ...l, nextActionAt: at, followUpStatus: 'pending',
        activity: [{ at: Date.now(), by: adminName, outcome: '📅 الإدارة رحّلت المتابعة', comment: was ? `كانت متأخرة من ${was}` : '', nextAt: at, kind: 'note' }, ...((l as any).activity || [])].slice(0, 80),
      } as Lead);
      c++;
    }));
    setBusy(false);
    setMsg(`اترحّل ${n(c)} متابعة ✓`);
  };

  const noAnsShown = noAns.filter((l) => agentF === 'all' || l.assignedAgentId === agentF)
    .sort((a, b) => (streak.get(b.id) || 0) - (streak.get(a.id) || 0));
  const picked = noAnsShown.filter((l) => sel.has(l.id));
  const transfer = () => {
    const ag = agents.find((a) => a.id === to);
    if (!ag || !picked.length) { setMsg(!picked.length ? 'علّم العملاء الأول' : 'اختار السيلز'); return; }
    picked.forEach((l) => onUpdateLead({
      ...l, assignedAgentId: ag.id, assignedAgentName: ag.name, nextActionAt: Date.now() + 3600000, followUpStatus: 'pending',
      activity: [{ at: Date.now(), by: adminName, outcome: `اتحوّل لـ ${ag.name} (مابيردش مع ${l.assignedAgentName || '—'})`, comment: '', transferTo: ag.name, nextAt: Date.now() + 3600000, kind: 'note' }, ...((l as any).activity || [])].slice(0, 80),
    } as Lead));
    setMsg(`اتحوّل ${picked.length} عميل لـ ${ag.name} ✓`); setSel(new Set());
  };
  const closeLost = () => {
    if (!picked.length) { setMsg('علّم العملاء الأول'); return; }
    if (!window.confirm(`${picked.length} عميل هيتنقلوا «غير مهتم / مؤجل». متأكد؟`)) return;
    picked.forEach((l) => onUpdateLead({
      ...l, status: 'lost', followUpStatus: 'completed',
      activity: [{ at: Date.now(), by: adminName, outcome: 'نقل إلى: غير مهتم / مؤجل', comment: `الإدارة قفلته — مردش ${streak.get(l.id)} مرات ورا بعض`, kind: 'action' }, ...((l as any).activity || [])].slice(0, 80),
    } as Lead));
    setMsg(`اتقفل ${picked.length} عميل ✓`); setSel(new Set());
  };

  const chip = (on: boolean) => `px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF]'}`;

  return createPortal(
    <div className="fixed inset-0 z-[58] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-[#FAF8F3] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-[#FAF8F3] border-b border-[#ECE8DF] px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-bold">حل المتأخر</p>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white"><X size={16} /></button>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { setTab('spread'); setMsg(''); }} className={chip(tab === 'spread')}>📅 وزّع المتأخر · {n(late.length)}</button>
            <button onClick={() => { setTab('noans'); setMsg(''); }} className={chip(tab === 'noans')}>📵 مابيردش ٣ مرات · {n(noAns.length)}</button>
          </div>
          <select value={agentF} onChange={(e) => setAgentF(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-[#ECE8DF] text-xs font-bold">
            <option value="all">كل السيلز</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="p-4 space-y-3">
          {msg && <p className="text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-xl p-2.5">{msg}</p>}

          {tab === 'spread' && (
            <>
              <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3 space-y-2.5">
                <p className="text-xs text-[#6B665C]">كل متأخر بياخد ميعاد جديد في الأيام الجاية (الجمعة إجازة). الأهم الأول: تفاوض ← معاينة مؤكدة ← تمت المعاينة ← … ← جديد. اللي مردش ٣ مرات مش هنا — في التاب التاني.</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold">في اليوم لكل سيلز:</span>
                  {[10, 15, 20, 30].map((x) => <button key={x} onClick={() => setPerDay(x)} className={chip(perDay === x)}>{x}</button>)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold">يبدأ من:</span>
                  <button onClick={() => setFromToday(true)} className={chip(fromToday)}>النهارده</button>
                  <button onClick={() => setFromToday(false)} className={chip(!fromToday)}>بكرة</button>
                </div>
              </div>

              {!chosen.length && <p className="text-xs font-bold text-[#6B665C] bg-white rounded-xl p-3">مفيش متابعات متأخرة 👏</p>}
              {chosen.map(([id, list]) => {
                const p = plan(list);
                const days = Math.ceil(list.length / perDay);
                return (
                  <div key={id} className="bg-white border border-[#ECE8DF] rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{nameOf(id)}</p>
                      <p className="text-xs font-bold text-[#C2412D]">{n(list.length)} متأخر</p>
                    </div>
                    <p className="text-[11.5px] text-[#6B665C]">هيخلصوا في {n(days)} يوم شغل · آخر يوم {p.length ? fmtDate(new Date(p[p.length - 1].at)) : ''}</p>
                    <p className="text-[11px] text-[#8C877D] mt-1">
                      {Object.entries(list.reduce((m: Record<string, number>, l) => { m[l.status] = (m[l.status] || 0) + 1; return m; }, {}))
                        .sort((a, b) => (RANK[a[0]] ?? 9) - (RANK[b[0]] ?? 9)).map(([s, c]) => `${STAGE_AR[s] || s}: ${c}`).join(' · ')}
                    </p>
                  </div>
                );
              })}
              {chosen.length > 0 && (
                <button disabled={busy} onClick={spread} className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm disabled:opacity-50">
                  وزّع {n(chosen.reduce((t, [, l]) => t + l.length, 0))} متابعة على الأيام
                </button>
              )}
            </>
          )}

          {tab === 'noans' && (
            <>
              <p className="text-xs text-[#6B665C]">عملاء اتسجّل عليهم «مردش» ٣ مرات أو أكتر ورا بعض. علّم اللي عايزه، وبعدين حوّلهم لسيلز تاني أو اقفلهم.</p>
              {!noAnsShown.length && <p className="text-xs font-bold text-[#6B665C] bg-white rounded-xl p-3">مفيش 👏</p>}
              {noAnsShown.length > 0 && (
                <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold">معلّم {picked.length}</p>
                    <button onClick={() => setSel(picked.length === noAnsShown.length ? new Set() : new Set(noAnsShown.map((l) => l.id)))} className="text-[11px] font-bold underline">
                      {picked.length === noAnsShown.length ? 'شيل العلامات' : `علّم الكل (${noAnsShown.length})`}
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <select value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold">
                      <option value="">حوّلهم لـ…</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={transfer} className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold">حوّل</button>
                    <button onClick={closeLost} className="px-4 py-2 rounded-xl bg-[#FBEDEA] border border-[#E9B8AE] text-[#9E2A1B] text-xs font-bold">اقفلهم غير مهتم</button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {noAnsShown.map((l) => (
                  <div key={l.id} className="bg-white border border-[#ECE8DF] rounded-xl flex items-center gap-2 px-3 py-2">
                    <button onClick={() => setSel((s) => { const t = new Set(s); t.has(l.id) ? t.delete(l.id) : t.add(l.id); return t; })}
                      className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${sel.has(l.id) ? 'bg-[#141414] border-[#141414] text-white' : 'border-[#CFC7B6]'}`}>{sel.has(l.id) && <Check size={12} />}</button>
                    <button onClick={() => onOpenLead(l)} className="flex-1 min-w-0 text-right">
                      <span className="block text-[13px] font-bold truncate">{l.name} <span className="font-mono font-medium text-[#6B665C] text-[11.5px]" dir="ltr">{l.phone}</span></span>
                      <span className="block text-[11px] text-[#6B665C] truncate">{l.assignedAgentName || '—'} · {STAGE_AR[l.status] || l.status} · <b className="text-[#C2412D]">مردش {streak.get(l.id)} مرات</b></span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default LateFixModal;
