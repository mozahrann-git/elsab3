import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Search, RefreshCw, Check } from 'lucide-react';
import { SalesAgent } from '../../types';
import { CallNumber, CallView, VIEW_LABEL, callView, allCallNumbers, reassignNumbers, errText, MAX_NO_ANSWER } from '../../services/dailyTasks';

/*
  سجل الأرقام: كل رقم اترفع وحصله إيه — القديم والجديد.
  فلترة بالسيلز والحالة والدفعة، وملخص لكل سيلز، وتوزيع تاني.
*/

const n = (x: number) => Math.round(x || 0).toLocaleString('en-US');
const VIEWS: CallView[] = ['pending', 'no_answer', 'gave_up', 'not_interested', 'recall', 'wrong', 'interested'];
const TONE: Record<CallView, string> = {
  pending: 'bg-[#F6F4EF] text-[#141414]',
  no_answer: 'bg-[#FBF1E4] text-[#A07A26]',
  gave_up: 'bg-[#F1ECE2] text-[#6B665C]',
  not_interested: 'bg-[#FBEDEA] text-[#9E2A1B]',
  recall: 'bg-[#EAF0FA] text-[#1F4E9C]',
  wrong: 'bg-[#FBEDEA] text-[#C2412D]',
  interested: 'bg-[#EEF5F0] text-[#1E7A45]',
};
const when = (t?: number) => t ? new Date(t).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }) : '—';

export const CallRegistry: React.FC<{ agents: SalesAgent[]; adminName: string; onClose: () => void }> = ({ agents, adminName, onClose }) => {
  const [all, setAll] = useState<CallNumber[] | null>(null);
  const [err, setErr] = useState('');
  const [agent, setAgent] = useState('');
  const [view, setView] = useState<CallView | ''>('');
  const [batch, setBatch] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [to, setTo] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [limit, setLimit] = useState(100);

  const load = () => { setAll(null); setErr(''); allCallNumbers().then(setAll).catch((e) => { setErr(errText(e)); setAll([]); }); };
  useEffect(load, []);

  const list = all || [];
  const batches = useMemo(() => [...new Set(list.map((x) => x.batch).filter(Boolean))].sort(), [list]);
  const names = useMemo(() => {
    const m = new Map<string, string>();
    list.forEach((x) => x.assignedTo && m.set(x.assignedTo, x.assignedName || x.assignedTo));
    agents.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [list, agents]);

  const shown = useMemo(() => {
    const s = q.replace(/\D/g, '') || q.trim();
    return list.filter((x) =>
      (!agent || x.assignedTo === agent) && (!view || callView(x) === view) && (!batch || x.batch === batch) &&
      (!s || x.phone.includes(s) || (x.name || '').includes(q.trim())))
      .sort((a, b) => (b.lastAt || b.createdAt || 0) - (a.lastAt || a.createdAt || 0));
  }, [list, agent, view, batch, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {} as Record<string, number>;
    list.filter((x) => (!agent || x.assignedTo === agent) && (!batch || x.batch === batch)).forEach((x) => { const v = callView(x); c[v] = (c[v] || 0) + 1; });
    return c;
  }, [list, agent, batch]);

  /* ملخص كل سيلز */
  const perAgent = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    list.filter((x) => !batch || x.batch === batch).forEach((x) => {
      const r = m.get(x.assignedTo) || {}; const v = callView(x);
      r[v] = (r[v] || 0) + 1; r.total = (r.total || 0) + 1;
      if (v === 'interested' && (x.wonAfter || 0) > 0) r.won = (r.won || 0) + 1;
      m.set(x.assignedTo, r);
    });
    return [...m.entries()].sort((a, b) => (b[1].total || 0) - (a[1].total || 0));
  }, [list, batch]);

  const toggle = (id: string) => setSel((s) => { const t = new Set(s); t.has(id) ? t.delete(id) : t.add(id); return t; });
  const pageIds = shown.slice(0, limit).map((x) => x.id);
  const allOn = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  const redistribute = async () => {
    const picked = list.filter((x) => sel.has(x.id));
    const ag = agents.filter((a) => to.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
    if (!picked.length) { setMsg('علّم الأرقام الأول'); return; }
    if (!ag.length) { setMsg('اختار هتتوزع على مين'); return; }
    setBusy(true); setMsg('');
    try {
      await reassignNumbers(picked, ag, adminName);
      setMsg(`اتوزّع ${n(picked.length)} رقم على ${ag.map((a) => a.name).join('، ')} ✓`);
      setSel(new Set()); load();
    } catch (e) { setMsg(errText(e)); }
    finally { setBusy(false); }
  };

  const chip = (on: boolean) => `px-3 py-1.5 rounded-xl text-[11.5px] font-bold border whitespace-nowrap ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF]'}`;
  const sel_ = 'px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold min-w-0';

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-[#FAF8F3] w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-[#FAF8F3] border-b border-[#ECE8DF] px-4 py-3 flex items-center justify-between">
          <p className="font-bold">سجل الأرقام {all && <span className="text-[#8C877D] text-sm font-medium">· {n(list.length)} رقم</span>}</p>
          <div className="flex gap-1">
            <button onClick={load} className="p-2 rounded-lg hover:bg-white" title="تحديث"><RefreshCw size={15} /></button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white"><X size={16} /></button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {err && <p className="text-xs font-bold text-[#9E2A1B] bg-[#FBEDEA] rounded-xl p-2.5">{err}</p>}
          {!all && <p className="text-xs text-[#8C877D] flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> بيحمّل كل الأرقام…</p>}

          {all && (
            <>
              {/* ملخص كل سيلز */}
              <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3 overflow-x-auto">
                <table className="w-full text-[11.5px] min-w-[560px]">
                  <thead><tr className="text-[#8C877D]">
                    <th className="text-right py-1.5 font-bold">السيلز</th><th className="font-bold">الكل</th>
                    {VIEWS.map((v) => <th key={v} className="font-bold">{VIEW_LABEL[v]}</th>)}
                    <th className="font-bold">رد بعد مردش</th>
                  </tr></thead>
                  <tbody>
                    {perAgent.map(([id, r]) => (
                      <tr key={id} onClick={() => setAgent(agent === id ? '' : id)} className={`border-t border-[#F1ECE2] cursor-pointer ${agent === id ? 'bg-[#F6F4EF]' : ''}`}>
                        <td className="py-1.5 font-bold">{names.get(id) || 'من غير سيلز'}</td>
                        <td className="text-center font-mono font-bold">{n(r.total)}</td>
                        {VIEWS.map((v) => <td key={v} className="text-center font-mono">{r[v] ? n(r[v]) : '·'}</td>)}
                        <td className="text-center font-mono text-[#1E7A45] font-bold">{r.won ? n(r.won) : '·'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* فلاتر */}
              <div className="flex gap-2 flex-wrap">
                <select value={agent} onChange={(e) => setAgent(e.target.value)} className={sel_}>
                  <option value="">كل السيلز</option>
                  {[...names.entries()].map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
                </select>
                <select value={batch} onChange={(e) => setBatch(e.target.value)} className={sel_}>
                  <option value="">كل الدفعات</option>
                  {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <label className="flex-1 min-w-[160px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ECE8DF]">
                  <Search size={14} className="text-[#8C877D]" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر برقم أو اسم" className="flex-1 min-w-0 bg-transparent text-xs outline-none" />
                </label>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setView('')} className={chip(!view)}>الكل · {n(list.filter((x) => (!agent || x.assignedTo === agent) && (!batch || x.batch === batch)).length)}</button>
                {VIEWS.map((v) => <button key={v} onClick={() => setView(view === v ? '' : v)} className={chip(view === v)}>{VIEW_LABEL[v]} · {n(counts[v] || 0)}</button>)}
              </div>

              {/* توزيع تاني */}
              <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-bold">معلّم {n(sel.size)} رقم — وزّعهم تاني على:</p>
                  <button onClick={() => setSel(allOn ? new Set([...sel].filter((id) => !pageIds.includes(id))) : new Set([...sel, ...shown.map((x) => x.id)]))}
                    className="text-[11px] font-bold underline">{allOn ? 'شيل العلامات' : `علّم كل اللي ظاهر (${n(shown.length)})`}</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {agents.map((a) => <button key={a.id} onClick={() => setTo((s) => { const t = new Set(s); t.has(a.id) ? t.delete(a.id) : t.add(a.id); return t; })} className={chip(to.has(a.id))}>{a.name}</button>)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled={busy} onClick={redistribute} className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold disabled:opacity-50">{busy ? 'بيوزّع…' : 'وزّع تاني'}</button>
                  <p className="text-[10.5px] text-[#8C877D]">الرقم بيرجع «جديد» عند السيلز الجديد، والسجل القديم بتاعه بيفضل.</p>
                </div>
                {msg && <p className="text-xs font-bold text-[#1E7A45]">{msg}</p>}
              </div>

              {/* الأرقام */}
              <div className="space-y-1.5">
                {!shown.length && <p className="text-xs font-bold text-[#6B665C] bg-white rounded-xl p-3">مفيش أرقام بالفلتر ده.</p>}
                {shown.slice(0, limit).map((x) => {
                  const v = callView(x);
                  const na = x.noAnswers ?? (v === 'no_answer' || v === 'gave_up' ? x.attempts : 0);
                  return (
                    <div key={x.id} className="bg-white border border-[#ECE8DF] rounded-xl">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => toggle(x.id)} className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${sel.has(x.id) ? 'bg-[#141414] border-[#141414] text-white' : 'border-[#CFC7B6]'}`}>{sel.has(x.id) && <Check size={12} />}</button>
                        <button onClick={() => setOpen(open === x.id ? '' : x.id)} className="flex-1 min-w-0 text-right">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[12.5px] font-bold" dir="ltr">{x.phone}</span>
                            {x.name && <span className="text-[12px] font-bold truncate">{x.name}</span>}
                            <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${TONE[v]}`}>{VIEW_LABEL[v]}</span>
                            {v === 'interested' && (x.wonAfter || 0) > 0 && <span className="text-[10.5px] font-bold text-[#1E7A45]">رد بعد {n(x.wonAfter!)} مردش</span>}
                          </span>
                          <span className="block text-[10.5px] text-[#8C877D] truncate">
                            {x.assignedName || '—'} · {x.batch}
                            {(v === 'no_answer' || v === 'gave_up') && na ? ` · مردش ${n(na)} من ${MAX_NO_ANSWER}` : ''}
                            {x.reason ? ` · ${x.reason}` : ''}
                            {x.recallAt ? ` · يتكلم تاني ${when(x.recallAt)}` : ''}
                            {x.lastAt ? ` · آخر مكالمة ${when(x.lastAt)}` : ''}
                          </span>
                        </button>
                      </div>
                      {open === x.id && (
                        <div className="border-t border-[#F1ECE2] px-3 py-2 space-y-1 text-[11px]">
                          {x.note && <p><b>من الشيت:</b> {x.note}</p>}
                          {x.prevBy && <p><b>كان مع:</b> {x.prevBy}</p>}
                          {x.lastNote && <p><b>آخر ملاحظة:</b> {x.lastNote}</p>}
                          {x.history?.length ? x.history.slice().reverse().map((h, i) => (
                            <p key={i} className="text-[#6B665C]">• {when(h.at)} — {h.by}: {h.outcome}{h.note ? ` (${h.note})` : ''}</p>
                          )) : (
                            <p className="text-[#8C877D]">رقم قديم — اتسجّل قبل السجل الجديد: {x.attempts ? `اتكلم ${n(x.attempts)} مرة` : 'محدش كلمه'}{x.lastBy ? `، آخر واحد ${x.lastBy}` : ''}.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {shown.length > limit && <button onClick={() => setLimit(limit + 200)} className="w-full py-2.5 rounded-xl bg-white border border-[#ECE8DF] text-xs font-bold">اعرض كمان ({n(shown.length - limit)} باقي)</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CallRegistry;
