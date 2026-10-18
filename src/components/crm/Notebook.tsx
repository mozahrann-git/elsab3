import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Phone, MessageCircle, UserPlus, Bell, Check, RotateCcw } from 'lucide-react';
import { Lead } from '../../types';
import { OwnerNote, NoteKind, NOTE_KINDS, subscribeNotes, saveNote, updateNote, deleteNote, isDue } from '../../services/notebook';
import { OWNER_DESK } from '../../services/ownerDesk';
import { generateCallLink, generateWhatsAppLink } from '../../utils/helpers';

/* أوقات «فكّرني» السريعة */
const at = (h: number, addDays = 0) => { const d = new Date(); d.setDate(d.getDate() + addDays); d.setHours(h, 0, 0, 0); return d.getTime(); };
const QUICK: { label: string; t: () => number }[] = [
  { label: 'بعد ساعة', t: () => Date.now() + 3600e3 },
  { label: 'النهارده بليل', t: () => at(20) },
  { label: 'بكرة الصبح', t: () => at(11, 1) },
  { label: 'بعد ٣ أيام', t: () => at(11, 3) },
  { label: 'الأسبوع الجاي', t: () => at(11, 7) },
];
const when = (t: number) => new Date(t).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const digits = (p?: string) => String(p || '').replace(/\D/g, '');

export const Notebook: React.FC<{ byName: string; onAddLead: (l: Lead) => void; onOpenLead?: (id: string) => void }> = ({ byName, onAddLead, onOpenLead }) => {
  const [notes, setNotes] = useState<OwnerNote[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => subscribeNotes(setNotes, (e) => setErr(String(e?.code || '').includes('permission') ? 'الصلاحيات رافضة — لازم firebase deploy للقواعد الجديدة' : 'مش قادر يقرا الدفتر')), []);

  const [kind, setKind] = useState<NoteKind>('task');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [remind, setRemind] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'open' | NoteKind | 'done'>('open');
  const withPerson = kind === 'client' || kind === 'deal';

  const add = async () => {
    if (!text.trim() && !name.trim()) return;
    setBusy(true); setErr('');
    try {
      await saveNote({ kind, text: text.trim(), name: name.trim() || undefined, phone: phone.trim() || undefined, place: place.trim() || undefined, remindAt: remind || undefined, by: byName });
      setText(''); setName(''); setPhone(''); setPlace(''); setRemind(null);
    } catch (e: any) { setErr(String(e?.code || '').includes('permission') ? 'الصلاحيات رافضة — لازم firebase deploy للقواعد الجديدة' : 'ماتحفظش — جرّب تاني'); }
    finally { setBusy(false); }
  };

  const toLead = async (n: OwnerNote) => {
    if (digits(n.phone).length < 10) { alert('اكتب رقم العميل الأول (١٠ أرقام على الأقل)'); return; }
    const id = `own_note_${n.id}`;
    const now = Date.now();
    onAddLead({
      id, name: n.name || 'عميل', phone: n.phone!, source: 'direct',
      assignedAgentId: OWNER_DESK.id, assignedAgentName: OWNER_DESK.name,
      status: 'contacted', notes: [], createdAt: new Date(now).toISOString(),
      nextActionAt: n.remindAt || now, followUpStatus: 'pending', addedByName: byName, leadKind: 'personal',
      activity: [{ at: now, by: byName, outcome: n.kind === 'deal' ? 'فرصة من الدفتر' : 'عميل من الدفتر', comment: [n.text, n.place].filter(Boolean).join(' · ') }],
    } as Lead);
    await updateNote(n.id, { leadId: id }).catch(() => {});
  };

  const now = Date.now();
  const shown = useMemo(() => notes.filter((n) =>
    filter === 'done' ? n.done : n.done ? false : filter === 'open' ? true : n.kind === filter,
  ).sort((a, b) => Number(isDue(b, now)) - Number(isDue(a, now)) || (a.remindAt || 9e15) - (b.remindAt || 9e15) || b.createdAt - a.createdAt), [notes, filter, now]);
  const count = (k: NoteKind) => notes.filter((n) => !n.done && n.kind === k).length;

  const inp = 'w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] px-3 py-2.5 text-sm';
  return (
    <div className="space-y-4" dir="rtl">
      {/* الكتابة السريعة */}
      <div className="bg-white border border-[#E8D3A6] rounded-2xl p-4 space-y-3">
        <p className="font-bold">📝 دفتري <span className="text-xs font-medium text-[#8C877D]">— اكتبها قبل ما تتنسي</span></p>
        <div className="flex gap-1.5 flex-wrap">
          {NOTE_KINDS.map((k) => (
            <button key={k.id} onClick={() => setKind(k.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${kind === k.id ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        {withPerson && (
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className={inp} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الرقم (اختياري)" dir="ltr" inputMode="tel" className={inp} />
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="المكان (التجمع، حلوان، مدينة نصر...)" className={`${inp} col-span-2`} />
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder={kind === 'task' ? 'لازم أعمل إيه؟' : kind === 'idea' ? 'الفكرة...' : kind === 'deal' ? 'تفاصيل الفرصة: شقة / أرض / شراكة، الميزانية...' : 'عايز إيه؟ اتكلمتوا في إيه؟'}
          className={inp} />
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-[#6B665C] flex items-center gap-1"><Bell size={12} />فكّرني {remind ? `· ${when(remind)}` : '(اختياري)'}</p>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK.map((q) => (
              <button key={q.label} onClick={() => setRemind(q.t())} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FBF8F1] border border-[#E8D3A6] text-[#6E5418]">{q.label}</button>
            ))}
            <input type="datetime-local" onChange={(e) => setRemind(e.target.value ? new Date(e.target.value).getTime() : null)} className="px-2 py-1 rounded-lg text-[11px] bg-white border border-[#E4DFD4]" />
            {remind && <button onClick={() => setRemind(null)} className="text-[11px] text-[#C2412D] font-bold">شيل</button>}
          </div>
        </div>
        {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
        <button disabled={busy || (!text.trim() && !name.trim())} onClick={add} className="w-full py-3 rounded-xl bg-[#A07A26] text-white font-bold disabled:opacity-40">{busy ? '...' : 'سجّل'}</button>
      </div>

      {/* القايمة */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {([['open', `مفتوح (${notes.filter((n) => !n.done).length})`], ...NOTE_KINDS.map((k) => [k.id, `${k.emoji} ${k.label} (${count(k.id)})`]), ['done', 'خلصت']] as [string, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as any)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${filter === k ? 'bg-[#141414] text-white' : 'bg-white border border-[#ECE8DF]'}`}>{l}</button>
        ))}
      </div>

      {!shown.length && <p className="text-xs text-[#8C877D] bg-white border border-dashed border-[#DCD6CA] rounded-2xl p-4 text-center">مفيش حاجة هنا.</p>}
      <div className="space-y-2">
        {shown.map((n) => {
          const k = NOTE_KINDS.find((x) => x.id === n.kind)!;
          const due = isDue(n, now);
          return (
            <div key={n.id} className={`bg-white rounded-2xl border p-3 space-y-2 ${due ? 'border-[#C2412D] shadow-[0_0_0_3px_rgba(194,65,45,0.08)]' : 'border-[#ECE8DF]'} ${n.done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2">
                <button onClick={() => updateNote(n.id, n.done ? { done: false } : { done: true, doneAt: Date.now() })}
                  aria-label={n.done ? 'رجّعها' : 'خلصت'}
                  className={`mt-0.5 w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center ${n.done ? 'bg-[#1E7A45] border-[#1E7A45] text-white' : 'border-[#CFC8BA]'}`}>
                  {n.done ? <Check size={14} /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[#8C877D]">{k.emoji} {k.label}{n.place ? ` · ${n.place}` : ''} · {new Date(n.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                  {n.name && <p className="font-bold text-sm">{n.name}{n.phone && <span className="font-mono font-medium text-[#6B665C] mr-1.5" dir="ltr">{n.phone}</span>}</p>}
                  {n.text && <p className={`text-sm whitespace-pre-line ${n.done ? 'line-through' : ''}`}>{n.text}</p>}
                  {n.remindAt && !n.done && <p className={`text-[11px] font-bold mt-0.5 ${due ? 'text-[#C2412D]' : 'text-[#A07A26]'}`}>⏰ {due ? 'جه ميعادها · ' : ''}{when(n.remindAt)}</p>}
                </div>
                <button onClick={() => { if (window.confirm('تمسحها؟')) deleteNote(n.id); }} className="text-[#C2412D] p-1" aria-label="امسح"><Trash2 size={14} /></button>
              </div>
              {!n.done && (
                <div className="flex gap-1.5 flex-wrap pr-8">
                  {n.phone && <a href={generateCallLink(n.phone)} className="px-2.5 py-1 rounded-lg bg-[#141414] text-white text-[11px] font-bold flex items-center gap-1"><Phone size={11} />اتصال</a>}
                  {n.phone && <a href={generateWhatsAppLink(n.phone, undefined, undefined, `أهلاً ${n.name || ''}`)} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-[#1E7A45] text-white text-[11px] font-bold flex items-center gap-1"><MessageCircle size={11} />واتساب</a>}
                  {(n.kind === 'client' || n.kind === 'deal') && (n.leadId
                    ? <button onClick={() => onOpenLead?.(n.leadId!)} className="px-2.5 py-1 rounded-lg bg-[#FBF8F1] border border-[#E8D3A6] text-[11px] font-bold">في ملفي ← افتحه</button>
                    : <button onClick={() => toLead(n)} className="px-2.5 py-1 rounded-lg bg-[#A07A26] text-white text-[11px] font-bold flex items-center gap-1"><UserPlus size={11} />حطّه عميل في ملفي</button>)}
                  {QUICK.slice(1, 3).map((q) => (
                    <button key={q.label} onClick={() => updateNote(n.id, { remindAt: q.t() })} className="px-2.5 py-1 rounded-lg bg-[#F6F4EF] text-[11px] font-bold flex items-center gap-1"><RotateCcw size={10} />{q.label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notebook;
