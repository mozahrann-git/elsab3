import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Users, MessageSquareText, FilePen, Home, Plus, Phone, Send, LogOut } from 'lucide-react';
import { Property, OwnerSubmission } from '../../types';
import { fetchPropertyPrivateOwner } from '../../services/firebaseService';
import {
  UnitViewing, ChangeRequest, FieldAgent, FieldTrip, FieldFeedback, TripUnit,
  subscribeAllUnitViewings, subscribeAllChangeRequests, subscribeFieldAgents, subscribeTrips, subscribeFieldFeedback,
  createUnitViewing, renotifyOwner, setViewingStatus, resolveChangeRequest, saveFieldAgent, nextInLine, createTrip,
  saraConfirmFeedback, rejectFeedback,
} from '../../services/portalService';
import { PortalShell, Card, Chip, Btn, fmt, since } from './PortalShell';

/*
  لوحة سارة (مسؤولة الملاك) والأدمن:
  المعاينات مع الملاك · مندوبين المعاينات بالدور · الفيدباك · طلبات التعديل · الشقق الجديدة
*/
interface Props {
  name: string;
  isAdmin: boolean;
  properties: Property[];
  submissions: OwnerSubmission[];
  logoUrl?: string;
  onApproveSubmission: (s: OwnerSubmission) => void;
  onRejectSubmission: (id: string) => void;
  onClose: () => void;
  onLogout: () => void;
}

const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '20')}?text=${encodeURIComponent(text)}`;
const input = 'w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm';
const mapLink = (p: Property) => {
  const loc = (p.location || '').trim();
  if (/^https?:\/\//.test(loc)) return loc;
  return `https://maps.google.com/?q=${encodeURIComponent(`${loc || p.neighborhood} الهضبة الوسطى المقطم`)}`;
};

export const CoordinatorPanel: React.FC<Props> = ({ name, isAdmin, properties, submissions, logoUrl, onApproveSubmission, onRejectSubmission, onClose, onLogout }) => {
  const [tab, setTab] = useState('viewings');
  const [viewings, setViewings] = useState<UnitViewing[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [trips, setTrips] = useState<FieldTrip[]>([]);
  const [fbs, setFbs] = useState<FieldFeedback[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    const u = [subscribeAllUnitViewings(setViewings), subscribeAllChangeRequests(setChanges), subscribeFieldAgents(setAgents), subscribeTrips(setTrips), subscribeFieldFeedback(setFbs)];
    const t = setInterval(() => tick((x) => x + 1), 60000);
    return () => { u.forEach((f) => f()); clearInterval(t); };
  }, []);

  const pendingV = viewings.filter((v) => v.ownerStatus === 'pending').length;
  const pendingC = changes.filter((c) => c.status === 'pending').length;
  const pendingS = submissions.filter((s) => s.status === 'pending').length;
  const pendingF = fbs.filter((f) => f.stage === 'submitted').length;

  return (
    <PortalShell
      title={name || 'مسؤولة الملاك'} subtitle={isAdmin ? 'الإدارة · الملاك والمعاينات' : 'مسؤولة الملاك'} logoUrl={logoUrl}
      badge={pendingV + pendingC + pendingS + pendingF ? { text: `${pendingV + pendingC + pendingS + pendingF} محتاجين رد`, tone: 'red' } : undefined}
      tabs={[
        { key: 'viewings', label: 'المعاينات', icon: <CalendarClock size={18} />, badge: pendingV },
        { key: 'agents', label: 'المندوبين', icon: <Users size={18} /> },
        { key: 'feedback', label: 'الفيدباك', icon: <MessageSquareText size={18} />, badge: pendingF },
        { key: 'changes', label: 'التعديلات', icon: <FilePen size={18} />, badge: pendingC },
        { key: 'units', label: 'شقق جديدة', icon: <Home size={18} />, badge: pendingS },
      ]}
      active={tab} onTab={setTab} onClose={onClose}
      footer={<button onClick={onLogout} className="w-full px-4 py-3 rounded-xl text-sm text-[#F0776A] hover:bg-white/10 text-right flex items-center gap-2"><LogOut size={16} />خروج</button>}
    >
      {tab === 'viewings' && <ViewingsTab viewings={viewings} properties={properties} onSendToAgent={() => setTab('agents')} />}
      {tab === 'agents' && <AgentsTab agents={agents} trips={trips} fbs={fbs} viewings={viewings} properties={properties} isAdmin={isAdmin} />}
      {tab === 'feedback' && <FeedbackTab fbs={fbs} />}
      {tab === 'changes' && <ChangesTab changes={changes} />}
      {tab === 'units' && <UnitsTab submissions={submissions} onApprove={onApproveSubmission} onReject={onRejectSubmission} />}
    </PortalShell>
  );
};

// ---------------- المعاينات ----------------
const ViewingsTab: React.FC<{ viewings: UnitViewing[]; properties: Property[]; onSendToAgent: () => void }> = ({ viewings, properties, onSendToAgent }) => {
  const [code, setCode] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const p = properties.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  const [phones, setPhones] = useState<Record<string, string>>({});
  const phoneOf = async (v: UnitViewing) => {
    if (phones[v.id] !== undefined) return phones[v.id];
    const d = await fetchPropertyPrivateOwner(v.propertyId);
    const ph = d?.ownerPhone || '';
    setPhones((s) => ({ ...s, [v.id]: ph }));
    return ph;
  };
  const active = viewings.filter((v) => v.ownerStatus !== 'done' && v.ownerStatus !== 'canceled');
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 content-start">
        <p className="font-bold text-lg">معاينة جديدة</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="كود الشقة (مثلاً H1128)" dir="ltr" className={`${input} font-mono`} list="codes" />
        <datalist id="codes">{properties.map((x) => <option key={x.id} value={x.code}>{x.title}</option>)}</datalist>
        {p ? <p className="text-sm text-[#1E7A45]">✓ {p.title}{p.brokerId ? ' · وحدة بروكر' : ''}</p> : code && <p className="text-sm text-[#C2412D]">الكود مش موجود</p>}
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="الميعاد: بكرة الأحد 6:00 مساءً" className={input} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="وصف العميل (من غير اسم ولا رقم)" className={input} />
        <Btn disabled={!p || !time || busy} onClick={async () => {
          setBusy(true);
          try {
            await createUnitViewing({ propertyId: p!.id, propertyCode: p!.code, propertyTitle: p!.title, brokerId: p!.brokerId, scheduledText: time, clientNote: note });
            setCode(''); setTime(''); setNote('');
          } finally { setBusy(false); }
        }}>بلّغ {p?.brokerId ? 'البروكر' : 'المالك'}</Btn>
      </Card>
      <div className="lg:col-span-2 grid gap-3 content-start">
        {active.length === 0 && <p className="text-center text-sm text-[#6B665C] py-10">مفيش معاينات مفتوحة</p>}
        {active.map((v) => {
          const late = v.ownerStatus === 'pending' && Date.now() - v.lastNotifiedAt > 15 * 60000;
          return (
            <Card key={v.id} tone={v.ownerStatus === 'pending' ? 'alert' : undefined}>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-bold">{v.propertyCode} · {v.scheduledText}</span>
                {v.ownerStatus === 'pending' ? <Chip tone="red">{v.brokerId ? 'البروكر' : 'المالك'} ما ردّش · {since(v.lastNotifiedAt)}</Chip>
                  : v.ownerStatus === 'confirmed' ? <Chip tone="green">اتأكدت {v.brokerConfirmedTime || ''}</Chip>
                  : <Chip tone="gold">طلب ميعاد تاني: {v.ownerNote}</Chip>}
              </div>
              <p className="text-sm text-[#6B665C]">{v.propertyTitle} · اتبلّغ {v.notifyCount} مرة{late ? ' · فات ربع ساعة' : ''}</p>
              {v.ownerStatus === 'pending' && (
                <div className="grid grid-cols-3 gap-2">
                  <Btn className="!px-2 text-xs" onClick={() => renotifyOwner(v)}>بلّغه تاني</Btn>
                  <Btn tone="green" className="!px-2 text-xs" onClick={async () => { const ph = await phoneOf(v); if (ph) window.open(wa(ph, `أهلاً، في معاينة على شقتك ${v.propertyCode} ${v.scheduledText}. أكّدها من بوابة الملاك على elsab3.com أو رد هنا. — سارة · السبع للعقارات`)); else alert('مفيش رقم مالك متسجل للوحدة دي'); }}>واتساب</Btn>
                  <Btn tone="blue" className="!px-2 text-xs" onClick={async () => { const ph = await phoneOf(v); if (ph) window.location.href = `tel:${ph}`; else alert('مفيش رقم مالك متسجل'); }}><Phone size={14} />اتصال</Btn>
                </div>
              )}
              {v.ownerStatus === 'confirmed' && (
                <div className="grid grid-cols-2 gap-2">
                  <Btn tone="gold" onClick={onSendToAgent}><Send size={14} />ابعت للمندوب</Btn>
                  <Btn tone="light" onClick={() => setViewingStatus(v.id, 'done')}>اتعاينت</Btn>
                </div>
              )}
              {v.ownerStatus === 'reschedule' && <Btn tone="light" onClick={() => setViewingStatus(v.id, 'canceled')}>إلغاء</Btn>}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ---------------- المندوبين والمشاوير ----------------
const AgentsTab: React.FC<{ agents: FieldAgent[]; trips: FieldTrip[]; fbs: FieldFeedback[]; viewings: UnitViewing[]; properties: Property[]; isAdmin: boolean }> = ({ agents, trips, fbs, viewings, properties, isAdmin }) => {
  const { next, last } = nextInLine(agents);
  const [agentId, setAgentId] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [time, setTime] = useState('');
  const [edit, setEdit] = useState<Partial<FieldAgent> | null>(null);
  const confirmed = viewings.filter((v) => v.ownerStatus === 'confirmed');
  const chosen = agents.find((a) => a.id === (agentId || next?.id));
  const units: TripUnit[] = useMemo(() => codes.map((c) => properties.find((p) => p.code === c)).filter(Boolean).map((p) => ({
    propertyId: p!.id, code: p!.code, title: p!.title, link: `${window.location.origin}/?property=${p!.code}`, location: mapLink(p!), brokerId: p!.brokerId,
  })), [codes, properties]);
  const add = (c: string) => { const k = c.trim().toUpperCase(); if (properties.some((p) => p.code.toUpperCase() === k) && !codes.includes(k)) setCodes((x) => [...x, properties.find((p) => p.code.toUpperCase() === k)!.code]); setCodeInput(''); };
  const message = (a: FieldAgent) => `أهلاً ${a.name}، عندك معاينة ${time}:\n\n` + units.map((u, i) => `${i + 1}) كود ${u.code}\nالشقة: ${u.link}\nاللوكيشن: ${u.location}`).join('\n\n') + `\n\n— سارة · السبع للعقارات`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card tone="dark" className="lg:col-span-3">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[#D9B864]">عليه الدور</p><p className="text-2xl font-bold">{next?.name || '—'}</p></div>
          <div><p className="text-xs text-[#CFCBC2]">آخر واحد طلع</p><p className="text-xl font-bold text-[#CFCBC2]">{last ? `${last.name} · ${since(last.lastAssignedAt)}` : '—'}</p></div>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <p className="font-bold text-lg">مشوار معاينة جديد</p>
        {confirmed.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[#6B665C] w-full">معاينات متأكدة:</span>
            {confirmed.map((v) => <button key={v.id} onClick={() => add(v.propertyCode)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${codes.includes(v.propertyCode) ? 'bg-[#141414] text-white' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>{v.propertyCode} · {v.brokerConfirmedTime || v.scheduledText}</button>)}
          </div>
        )}
        <div className="flex gap-2"><input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(codeInput)} placeholder="ضيف كود شقة" dir="ltr" className={`${input} font-mono`} list="codes2" /><Btn onClick={() => add(codeInput)}><Plus size={16} /></Btn></div>
        <datalist id="codes2">{properties.map((x) => <option key={x.id} value={x.code} />)}</datalist>
        {units.length > 0 && <div className="flex flex-wrap gap-2">{units.map((u) => <button key={u.code} onClick={() => setCodes((x) => x.filter((c) => c !== u.code))} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#141414] text-white">{u.code} ✕</button>)}</div>}
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="الميعاد: النهارده 6:00 مساءً" className={input} />
        <p className="text-sm font-bold">مين هيطلع؟</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {agents.filter((a) => a.active !== false).map((a) => (
            <button key={a.id} onClick={() => setAgentId(a.id)} className={`rounded-xl p-3 text-right border ${chosen?.id === a.id ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF]'}`}>
              <p className="font-bold text-sm">{a.name}{a.id === next?.id ? ' ★' : ''}</p>
              <p className="text-[11px] opacity-70">{a.id === next?.id ? 'عليه الدور' : a.lastAssignedAt ? `طلع من ${since(a.lastAssignedAt)}` : 'لسه ماطلعش'}</p>
            </button>
          ))}
        </div>
        <Btn tone="green" disabled={!chosen || !units.length || !time} onClick={async () => {
          const a = chosen!; const txt = message(a);
          await createTrip(a, units, time, confirmed.filter((v) => codes.includes(v.propertyCode)).map((v) => v.id));
          window.open(wa(a.phone, txt)); setCodes([]); setTime(''); setAgentId('');
        }}><Send size={16} />ابعت لـ {chosen?.name || '...'} على واتساب</Btn>
      </Card>

      <Card className="content-start">
        <div className="flex justify-between items-center"><p className="font-bold">المندوبين</p>{isAdmin && <Btn tone="light" className="!py-2 text-xs" onClick={() => setEdit({ name: '', phone: '', active: true })}><Plus size={14} />إضافة</Btn>}</div>
        {agents.map((a) => (
          <div key={a.id} className="border-t border-[#F0ECE4] pt-2 flex justify-between items-center gap-2">
            <div><p className="font-bold text-sm">{a.name} {a.active === false && <Chip tone="grey">موقوف</Chip>}</p><p className="text-xs text-[#6B665C]">{a.viewingsCount || 0} معاينة · {a.feedbackCount || 0} فيدباك</p></div>
            {isAdmin && <button onClick={() => setEdit(a)} className="text-xs font-bold text-[#A07A26]">تعديل</button>}
          </div>
        ))}
        {edit && (
          <div className="border-t border-[#F0ECE4] pt-3 space-y-2">
            <input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="الاسم" className={input} />
            <input value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="الموبايل" dir="ltr" className={input} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />نشط</label>
            <div className="flex gap-2"><Btn className="flex-1" disabled={!edit.name || !edit.phone} onClick={async () => { await saveFieldAgent(edit as any); setEdit(null); }}>حفظ</Btn><Btn tone="light" onClick={() => setEdit(null)}>إلغاء</Btn></div>
          </div>
        )}
      </Card>

      <Card className="lg:col-span-3">
        <p className="font-bold">آخر المشاوير</p>
        {trips.slice(0, 12).map((t) => {
          const got = fbs.filter((f) => f.tripId === t.id).length;
          return (
            <div key={t.id} className="border-t border-[#F0ECE4] pt-2 flex flex-wrap justify-between items-center gap-2">
              <div><p className="font-bold text-sm">{t.agentName} · {t.timeText}</p><p className="text-xs text-[#6B665C]">{t.units.map((u) => u.code).join('، ')} · فيدباك {got}/{t.units.length}</p></div>
              <a href={wa(t.agentPhone, `${t.agentName}، بعد المعاينة ابعت رأي العميل من هنا (تكتب أو تسجل فويس):\n${window.location.origin}/?fb=${t.id}`)} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-[#1E7A45] text-white text-xs font-bold">ابعت لينك الفيدباك</a>
            </div>
          );
        })}
        {!trips.length && <p className="text-sm text-[#6B665C]">مفيش مشاوير لسه</p>}
      </Card>
    </div>
  );
};

// ---------------- الفيدباك ----------------
const FeedbackTab: React.FC<{ fbs: FieldFeedback[] }> = ({ fbs }) => {
  const [txt, setTxt] = useState<Record<string, string>>({});
  const groups: [string, FieldFeedback[]][] = [
    ['وصل من المندوب · راجعيه', fbs.filter((f) => f.stage === 'submitted')],
    ['مستني تأكيد السيلز', fbs.filter((f) => f.stage === 'sara_confirmed')],
    ['اتنشر للمالك', fbs.filter((f) => f.stage === 'sales_confirmed').slice(0, 10)],
  ];
  return (
    <div className="space-y-6">
      {groups.map(([title, list]) => (
        <div key={title} className="space-y-3">
          <p className="font-bold">{title} ({list.length})</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((f) => (
              <Card key={f.id}>
                <div className="flex justify-between"><span className="font-bold">{f.code} · {f.agentName}</span><span className="text-[#D9B864]">{'★'.repeat(f.rating)}</span></div>
                {f.voiceUrl && <audio controls src={f.voiceUrl} className="w-full" />}
                {f.stage === 'submitted'
                  ? <textarea rows={3} className={input} value={txt[f.id] ?? f.text} onChange={(e) => setTxt((s) => ({ ...s, [f.id]: e.target.value }))} placeholder="اكتبي الفيدباك من الفويس" />
                  : <p className="leading-7">"{f.text}"</p>}
                <div className="flex flex-wrap gap-1.5">{(f.positives || []).map((x) => <Chip key={x} tone="green">+ {x}</Chip>)}{(f.negatives || []).map((x) => <Chip key={x} tone="red">− {x}</Chip>)}</div>
                {f.stage === 'submitted' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Btn tone="green" onClick={() => saraConfirmFeedback(f, { text: (txt[f.id] ?? f.text).trim() })}>تأكيد وابعت للسيلز</Btn>
                    <Btn tone="danger" onClick={() => rejectFeedback(f)}>رفض</Btn>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------- التعديلات ----------------
const ChangesTab: React.FC<{ changes: ChangeRequest[] }> = ({ changes }) => {
  const pend = changes.filter((c) => c.status === 'pending');
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {!pend.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش طلبات تعديل</p>}
      {pend.map((c) => (
        <Card key={c.id} tone="gold">
          <div className="flex justify-between"><span className="font-bold">{c.propertyCode} · {c.type === 'price' ? 'تغيير سعر' : c.type === 'photos' ? 'صور جديدة' : c.type === 'pause' ? 'إيقاف المعاينات' : 'تشغيل المعاينات'}</span><Chip tone="gold">{c.requesterRole === 'broker' ? 'بروكر' : 'مالك'} · {since(c.createdAt)}</Chip></div>
          {c.type === 'price' && <div className="flex justify-between items-baseline"><span className="line-through text-[#8C877D]">{fmt(c.oldPrice)}</span><span className="text-xl font-bold">{fmt(c.newPrice)} ج.م</span></div>}
          {c.type === 'photos' && <div className="flex gap-2 flex-wrap">{(c.images || []).map((u) => <img key={u} src={u} alt="" className="w-16 h-16 rounded-lg object-cover" />)}</div>}
          <div className="grid grid-cols-2 gap-2"><Btn onClick={() => resolveChangeRequest(c, true)}>موافقة ونشر</Btn><Btn tone="danger" onClick={() => resolveChangeRequest(c, false)}>رفض</Btn></div>
        </Card>
      ))}
    </div>
  );
};

// ---------------- الشقق الجديدة ----------------
const UnitsTab: React.FC<{ submissions: OwnerSubmission[]; onApprove: (s: OwnerSubmission) => void; onReject: (id: string) => void }> = ({ submissions, onApprove, onReject }) => {
  const pend = submissions.filter((s) => s.status === 'pending');
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {!pend.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش شقق جديدة</p>}
      {pend.map((s) => (
        <Card key={s.id}>
          <div className="flex justify-between"><span className="font-bold">{s.area} م² · {s.neighborhood}</span><Chip tone="gold">{(s as any).brokerId ? 'من بروكر' : 'من مالك'}</Chip></div>
          <p className="text-sm">{fmt(s.askingPrice)} ج.م · {s.ownerName}</p>
          {s.images?.length > 0 && <div className="flex gap-2 overflow-x-auto">{s.images.slice(0, 5).map((u) => <img key={u} src={u} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />)}</div>}
          <div className="grid grid-cols-3 gap-2">
            <Btn onClick={() => onApprove(s)} className="text-xs !px-2">انشر بكود</Btn>
            <a href={`tel:${s.phone}`} className="rounded-xl bg-[#F6F4EF] text-sm font-semibold flex items-center justify-center">اتصال</a>
            <Btn tone="danger" onClick={() => onReject(s.id)} className="text-xs !px-2">رفض</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
};
