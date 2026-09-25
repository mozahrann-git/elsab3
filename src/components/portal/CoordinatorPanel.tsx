import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Users, MessageSquareText, FilePen, Home, Plus, Phone, Send, LogOut, FileSpreadsheet } from 'lucide-react';
import { Property, OwnerSubmission } from '../../types';
import { fetchPropertyPrivateOwner, subscribeToViewingRequests, saveAccount } from '../../services/firebaseService';
import { WhenPicker, WhenValue, formatWhen } from '../common/WhenPicker';
import { ViewingRequest } from '../../types';
import * as XLSX from 'xlsx';
import {
  UnitViewing, ChangeRequest, FieldAgent, FieldTrip, FieldFeedback, TripUnit,
  subscribeAllUnitViewings, subscribeAllChangeRequests, subscribeFieldAgents, subscribeTrips, subscribeFieldFeedback,
  createUnitViewing, renotifyOwner, findBrokerContact, deleteUnitViewing, setViewingStatus, resolveChangeRequest, saveFieldAgent, nextInLine, createTrip,
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
  onUpdateSubmission?: (s: OwnerSubmission) => void;
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

export const CoordinatorPanel: React.FC<Props> = ({ name, isAdmin, properties, submissions, logoUrl, onApproveSubmission, onRejectSubmission, onUpdateSubmission, onClose, onLogout }) => {
  const [tab, setTab] = useState('viewings');
  const [tripSeed, setTripSeed] = useState<{ code: string; label: string; at?: number } | null>(null);
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
        ...(isAdmin ? [{ key: 'excel', label: 'شيت الملاك', icon: <FileSpreadsheet size={18} /> }] : []),
      ]}
      active={tab} onTab={setTab} onClose={onClose}
      footer={<button onClick={onLogout} className="w-full px-4 py-3 rounded-xl text-sm text-[#F0776A] hover:bg-white/10 text-right flex items-center gap-2"><LogOut size={16} />خروج</button>}
    >
      {tab === 'viewings' && <ViewingsTab viewings={viewings} properties={properties} isAdmin={isAdmin} onSendToAgent={(code, label, at) => { setTripSeed({ code, label, at }); setTab('agents'); }} />}
      {tab === 'agents' && <AgentsTab agents={agents} trips={trips} fbs={fbs} viewings={viewings} properties={properties} isAdmin={isAdmin} seed={tripSeed} />}
      {tab === 'feedback' && <FeedbackTab fbs={fbs} />}
      {tab === 'changes' && <ChangesTab changes={changes} />}
      {tab === 'excel' && isAdmin && <OwnersExcelTab properties={properties} />}
      {tab === 'units' && <UnitsTab submissions={submissions} byName={name || 'الإدارة'} onApprove={onApproveSubmission} onReject={onRejectSubmission} onUpdateSubmission={onUpdateSubmission} />}
    </PortalShell>
  );
};

// ---------------- المعاينات ----------------
const ViewingsTab: React.FC<{ viewings: UnitViewing[]; properties: Property[]; isAdmin: boolean; onSendToAgent: (code: string, label: string, at?: number) => void }> = ({ viewings, properties, isAdmin, onSendToAgent }) => {
  const [code, setCode] = useState('');
  const [time, setTime] = useState<WhenValue | null>(null);
  const [note, setNote] = useState('');
  const [reqs, setReqs] = useState<ViewingRequest[]>([]);
  const [fromReq, setFromReq] = useState<ViewingRequest | null>(null);
  const [owners, setOwners] = useState<Record<string, string>>({});
  useEffect(() => subscribeToViewingRequests(null, setReqs), []);
  const converted = new Set(viewings.map((v) => v.sourceRequestId).filter(Boolean));
  const openReqs = reqs.filter((r) => !converted.has(r.id) && !['cancelled', 'canceled', 'completed', 'done'].includes(String(r.status)));
  useEffect(() => {
    [...openReqs.map((r) => r.propertyId), ...viewings.map((v) => v.propertyId)].forEach((pid) => {
      if (pid && owners[pid] === undefined) fetchPropertyPrivateOwner(pid).then((d) => setOwners((o) => ({ ...o, [pid]: d?.ownerName || '' })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReqs.length, viewings.length]);
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
        {fromReq && <p className="text-xs rounded-xl bg-[#FBF8F1] border border-[#E8D3A6] p-2">طلب من السيلز <b>{fromReq.requestingAgentName}</b> · العميل يفضّل: {fromReq.clientPreferredTime}</p>}
        {p && <p className="text-xs text-[#6B665C]">المالك: <b>{owners[p.id] || '...'}</b></p>}
        <WhenPicker value={time} onChange={setTime} quick={false} label="ميعاد المعاينة" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="وصف العميل (من غير اسم ولا رقم)" className={input} />
        <Btn disabled={!p || !time || busy} onClick={async () => {
          setBusy(true);
          try {
            await createUnitViewing({
              propertyId: p!.id, propertyCode: p!.code, propertyTitle: p!.title, brokerId: p!.brokerId,
              scheduledText: time!.label, scheduledAt: time!.at, clientNote: note, ownerName: owners[p!.id] || '',
              sourceRequestId: fromReq?.id, salesAgentId: fromReq?.requestingAgentId, salesAgentName: fromReq?.requestingAgentName,
            });
            // تبليغ فوري بالواتساب للمالك أو البروكر
            const link = p!.brokerId
              ? await findBrokerContact(p!.brokerId).then((b) => b?.phone ? wa(b.phone, `أهلاً ${b.name}، في طلب معاينة على وحدتك ${p!.code} ${time!.label}. ادخل بوابة البروكر على elsab3.com وأكّدها مع المالك. — سارة · السبع للعقارات`) : '')
              : (owners[p!.id] !== undefined ? await fetchPropertyPrivateOwner(p!.id).then((d) => d?.ownerPhone ? wa(d.ownerPhone, `أهلاً ${d.ownerName || ''}، في معاينة على شقتك ${p!.code} ${time!.label}. أكّدها من بوابة الملاك على elsab3.com أو رد هنا. — سارة · السبع للعقارات`) : '') : '');
            if (link) window.open(link, '_blank');
            setCode(''); setTime(null); setNote(''); setFromReq(null);
          } finally { setBusy(false); }
        }}>بلّغ {p?.brokerId ? 'البروكر' : 'المالك'}</Btn>
      </Card>
      <div className="lg:col-span-2 grid gap-3 content-start">
        {openReqs.map((r) => (
          <Card key={r.id} tone="gold">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold">{r.propertyCode} · {r.clientPreferredTime || 'من غير ميعاد'}</span>
              <Chip tone="gold">طلب من السيلز · {since((r as any).createdAtTimestamp || Date.now())}</Chip>
            </div>
            <p className="text-sm text-[#6B665C]">
              {r.propertyTitle} · السيلز: <b>{r.requestingAgentName || '—'}</b> · المالك: <b>{owners[r.propertyId] || '—'}</b>
            </p>
            <Btn onClick={() => { setFromReq(r); setCode(r.propertyCode); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>كلّمي المالك وحددي الميعاد</Btn>
          </Card>
        ))}
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
              <p className="text-sm text-[#6B665C]">{v.propertyTitle} · المالك: <b>{v.ownerName || owners[v.propertyId] || '—'}</b>{v.salesAgentName ? ` · طلب ${v.salesAgentName}` : ''} · اتبلّغ {v.notifyCount} مرة{late ? ' · فات ربع ساعة' : ''}</p>
              {v.ownerStatus === 'pending' && (
                <div className="grid grid-cols-3 gap-2">
                  <Btn className="!px-2 text-xs" onClick={() => renotifyOwner(v)}>بلّغه تاني</Btn>
                  <Btn tone="green" className="!px-2 text-xs" onClick={async () => { const ph = await phoneOf(v); if (ph) window.open(wa(ph, `أهلاً، في معاينة على شقتك ${v.propertyCode} ${v.scheduledText}. أكّدها من بوابة الملاك على elsab3.com أو رد هنا. — سارة · السبع للعقارات`)); else alert('مفيش رقم مالك متسجل للوحدة دي'); }}>واتساب</Btn>
                  <Btn tone="blue" className="!px-2 text-xs" onClick={async () => { const ph = await phoneOf(v); if (ph) window.location.href = `tel:${ph}`; else alert('مفيش رقم مالك متسجل'); }}><Phone size={14} />اتصال</Btn>
                </div>
              )}
              {(v.ownerStatus === 'confirmed' || v.brokerStatus === 'confirmed') && (
                <div className="grid grid-cols-2 gap-2">
                  <Btn tone="gold" onClick={() => onSendToAgent(v.propertyCode, v.brokerConfirmedTime || v.scheduledText, v.scheduledAt)}><Send size={14} />ابعت للمندوب</Btn>
                  <Btn tone="light" onClick={() => setViewingStatus(v.id, 'done')}>اتعاينت</Btn>
                </div>
              )}
              {v.ownerStatus === 'reschedule' && <Btn tone="light" onClick={() => setViewingStatus(v.id, 'canceled')}>إلغاء</Btn>}
              {isAdmin && (
                <button onClick={() => { if (window.confirm(`تمسح معاينة ${v.propertyCode} نهائياً؟`)) deleteUnitViewing(v.id); }}
                  className="self-start text-xs font-bold text-[#C2412D]">حذف المعاينة</button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ---------------- المندوبين والمشاوير ----------------
const AgentsTab: React.FC<{ agents: FieldAgent[]; trips: FieldTrip[]; fbs: FieldFeedback[]; viewings: UnitViewing[]; properties: Property[]; isAdmin: boolean; seed?: { code: string; label: string; at?: number } | null }> = ({ agents, trips, fbs, viewings, properties, isAdmin, seed }) => {
  const { next, last } = nextInLine(agents);
  const [agentId, setAgentId] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [time, setTime] = useState<WhenValue | null>(null);
  const [edit, setEdit] = useState<Partial<FieldAgent> | null>(null);
  const confirmed = viewings.filter((v) => v.ownerStatus === 'confirmed' || v.brokerStatus === 'confirmed');
  useEffect(() => {
    if (!seed) return;
    setCodes((c) => (c.includes(seed.code) ? c : [...c, seed.code]));
    if (seed.at) setTime({ at: seed.at, label: formatWhen(seed.at) });
    else if (seed.label) setTime({ at: Date.now(), label: seed.label });
  }, [seed?.code]);
  const chosen = agents.find((a) => a.id === (agentId || next?.id));
  const units: TripUnit[] = useMemo(() => codes.map((c) => properties.find((p) => p.code === c)).filter(Boolean).map((p) => ({
    propertyId: p!.id, code: p!.code, title: p!.title, link: `${window.location.origin}/?property=${p!.code}`, location: mapLink(p!), brokerId: p!.brokerId,
    salesAgentId: confirmed.find((v) => v.propertyCode === p!.code)?.salesAgentId,
    salesAgentName: confirmed.find((v) => v.propertyCode === p!.code)?.salesAgentName,
  })), [codes, properties, confirmed]);
  const add = (c: string) => { const k = c.trim().toUpperCase(); if (properties.some((p) => p.code.toUpperCase() === k) && !codes.includes(k)) setCodes((x) => [...x, properties.find((p) => p.code.toUpperCase() === k)!.code]); setCodeInput(''); };
  const message = (a: FieldAgent) => `أهلاً ${a.name}، عندك معاينة ${time?.label || ''}:\n\n` + units.map((u, i) => `${i + 1}) كود ${u.code}\nالشقة: ${u.link}\nاللوكيشن: ${u.location}`).join('\n\n') + `\n\n— سارة · السبع للعقارات`;

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
            {confirmed.map((v) => <button key={v.id} onClick={() => { add(v.propertyCode); if (!time && v.scheduledAt) setTime({ at: v.scheduledAt, label: formatWhen(v.scheduledAt) }); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${codes.includes(v.propertyCode) ? 'bg-[#141414] text-white' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>{v.propertyCode} · {v.brokerConfirmedTime || v.scheduledText}</button>)}
          </div>
        )}
        <div className="flex gap-2"><input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(codeInput)} placeholder="ضيف كود شقة" dir="ltr" className={`${input} font-mono`} list="codes2" /><Btn onClick={() => add(codeInput)}><Plus size={16} /></Btn></div>
        <datalist id="codes2">{properties.map((x) => <option key={x.id} value={x.code} />)}</datalist>
        {units.length > 0 && <div className="flex flex-wrap gap-2">{units.map((u) => <button key={u.code} onClick={() => setCodes((x) => x.filter((c) => c !== u.code))} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#141414] text-white">{u.code} ✕</button>)}</div>}
        <WhenPicker value={time} onChange={setTime} quick={false} label="ميعاد المشوار" />
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
          await createTrip(a, units, time!.label, confirmed.filter((v) => codes.includes(v.propertyCode)).map((v) => v.id));
          window.open(wa(a.phone, txt)); setCodes([]); setTime(null); setAgentId('');
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

// ---------------- الشقق الجديدة: مراجعة قبل النشر ----------------
const UnitsTab: React.FC<{ submissions: OwnerSubmission[]; byName: string; onApprove: (s: OwnerSubmission) => void; onReject: (id: string) => void; onUpdateSubmission?: (s: OwnerSubmission) => void }> = ({ submissions, byName, onApprove, onReject, onUpdateSubmission }) => {
  const [open, setOpen] = useState<OwnerSubmission | null>(null);
  const pend = submissions.filter((s) => s.status === 'pending');
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {!pend.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش شقق جديدة</p>}
      {pend.map((s) => {
        const q = (s as any).qualityCheck;
        return (
          <Card key={s.id}>
            <div className="flex justify-between items-center gap-2">
              <span className="font-bold">{s.area} م² · {s.neighborhood}</span>
              <Chip tone={(s as any).brokerId ? ('blue' as any) : 'gold'}>{(s as any).brokerId ? `بروكر: ${(s as any).brokerId}` : 'من مالك'}</Chip>
            </div>
            <p className="text-sm">{fmt(s.askingPrice)} ج.م · {(s as any).brokerId ? 'بعتها البروكر' : 'المالك'}: {s.ownerName}</p>
            {s.images?.length > 0 && <div className="flex gap-2 overflow-x-auto">{s.images.slice(0, 5).map((u) => <img key={u} src={u} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />)}</div>}
            {q ? <Chip tone="green">اتأكد مع المالك · {q.by}{q.accountDelivered ? ' · الحساب اتسلّم' : ''}</Chip> : <Chip tone="red">لسه محتاجة مراجعة جودة</Chip>}
            <div className="grid grid-cols-3 gap-2">
              <Btn onClick={() => setOpen(s)} className="text-xs !px-2">راجع وانشر</Btn>
              <a href={`tel:${s.phone}`} className="rounded-xl bg-[#F6F4EF] text-sm font-semibold flex items-center justify-center">اتصال</a>
              <Btn tone="danger" onClick={() => onReject(s.id)} className="text-xs !px-2">رفض</Btn>
            </div>
          </Card>
        );
      })}
      {open && <ReviewModal sub={open} byName={byName} onClose={() => setOpen(null)} onApprove={onApprove} onUpdateSubmission={onUpdateSubmission} />}
    </div>
  );
};

/* شاشة المراجعة: تعديل كل البيانات، كتابة الكود بإيدك، شيل الصور الوحشة، وتأكيد الجودة */
const ReviewModal: React.FC<{ sub: OwnerSubmission; byName: string; onClose: () => void; onApprove: (s: OwnerSubmission) => void; onUpdateSubmission?: (s: OwnerSubmission) => void }> = ({ sub, byName, onClose, onApprove, onUpdateSubmission }) => {
  const [d, setD] = useState<any>({ ...sub, code: (sub as any).code || `H${Math.floor(1000 + Math.random() * 8999)}` });
  const [busy, setBusy] = useState(false);
  const q = d.qualityCheck;
  const inp = 'w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm';
  const save = (extra: any = {}) => { const n = { ...d, ...extra }; setD(n); onUpdateSubmission?.(n); return n; };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-[#F6F4EF] w-full sm:max-w-2xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col">
        <header className="bg-[#141414] text-white px-5 py-4 flex justify-between items-center rounded-t-3xl">
          <div><p className="font-bold">مراجعة الشقة قبل النشر</p><p className="text-xs text-[#CFCBC2]">{sub.ownerName} · {sub.phone}</p></div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Card tone={q ? undefined : 'gold'}>
            <p className="font-bold text-sm">1. مراجعة الجودة مع المالك</p>
            {q ? (
              <p className="text-sm text-[#1E7A45] font-bold">✓ اتأكد مع المالك بواسطة {q.by}{q.accountDelivered ? ' · والحساب اتسلّم له' : ''}</p>
            ) : (
              <>
                <p className="text-xs text-[#6B665C] leading-6">كلّم المالك، أكّد البيانات والسعر، وسلّمه الإيميل والباسورد بتاع بوابته.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <a href={`tel:${sub.phone}`} className="py-3 rounded-xl bg-[#1F4E9C] text-white text-center text-sm font-bold">اتصل بالمالك</a>
                  <Btn tone="green" onClick={() => save({ qualityCheck: { by: byName, at: Date.now(), accountDelivered: true } })}>اتأكد وسلّمت الحساب</Btn>
                </div>
              </>
            )}
          </Card>

          <Card>
            <p className="font-bold text-sm">2. الكود والبيانات</p>
            <label className="text-xs font-bold space-y-1 block">كود الوحدة
              <input value={d.code} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })} dir="ltr" className={`${inp} font-mono`} />
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="text-xs font-bold space-y-1">السعر<input type="number" value={d.askingPrice} onChange={(e) => setD({ ...d, askingPrice: Number(e.target.value) })} className={inp} /></label>
              <label className="text-xs font-bold space-y-1">المساحة<input type="number" value={d.area} onChange={(e) => setD({ ...d, area: Number(e.target.value) })} className={inp} /></label>
              <label className="text-xs font-bold space-y-1">الغرف<input type="number" value={d.bedrooms || 3} onChange={(e) => setD({ ...d, bedrooms: Number(e.target.value) })} className={inp} /></label>
              <label className="text-xs font-bold space-y-1">الدور<input value={d.floor || ''} onChange={(e) => setD({ ...d, floor: e.target.value })} className={inp} /></label>
            </div>
            <label className="text-xs font-bold space-y-1 block">العنوان بالتفصيل<input value={d.exactLocation || ''} onChange={(e) => setD({ ...d, exactLocation: e.target.value })} className={inp} /></label>
            <label className="text-xs font-bold space-y-1 block">وصف الوحدة (اللي هيقراه الزائر)
              <textarea rows={4} value={d.description || d.notes || ''} onChange={(e) => setD({ ...d, description: e.target.value })} className={inp} />
            </label>
          </Card>

          <Card>
            <p className="font-bold text-sm">3. الصور ({(d.images || []).length})</p>
            <p className="text-xs text-[#6B665C]">دوس على أي صورة وحشة عشان تشيلها قبل النشر.</p>
            <div className="flex gap-2 flex-wrap">
              {(d.images || []).map((u: string) => (
                <button key={u} onClick={() => setD({ ...d, images: d.images.filter((x: string) => x !== u) })} className="relative">
                  <img src={u} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C2412D] text-white text-xs font-bold flex items-center justify-center">✕</span>
                </button>
              ))}
              {!(d.images || []).length && <span className="text-xs text-[#C2412D] font-bold">مفيش صور · انشرها كده ولا تستنى المالك يبعت؟</span>}
            </div>
          </Card>
        </div>

        <div className="p-4 border-t border-[#E4DFD4] grid grid-cols-2 gap-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <Btn tone="light" onClick={() => { save(); onClose(); }}>احفظ كمسودة</Btn>
          <Btn disabled={busy || !q || !d.code.trim()} onClick={() => { setBusy(true); onApprove(save()); onClose(); }}>انشر بكود {d.code}</Btn>
          {!q && <p className="col-span-2 text-[11px] text-[#C2412D] text-center">النشر مقفول لحد ما تتأكد مع المالك</p>}
        </div>
      </div>
    </div>
  );
};

// ---------------- شيت الملاك القدام: تصدير ثم استيراد بالإيميلات والباسووردات ----------------
const OwnersExcelTab: React.FC<{ properties: Property[] }> = ({ properties }) => {
  const [busy, setBusy] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const genPass = () => `Sb${Math.random().toString(36).slice(2, 6)}${Math.floor(10 + Math.random() * 89)}`;

  const exportSheet = async () => {
    setBusy('جاري تجميع أرقام الملاك...');
    const rows: any[] = [];
    for (const p of properties) {
      const d = await fetchPropertyPrivateOwner(p.id).catch(() => null);
      rows.push({
        'كود الشقة': p.code, 'الحي': p.neighborhood, 'الشقة': p.title, 'السعر': p.price, 'المساحة': p.area,
        'اسم المالك': d?.ownerName || '', 'موبايل المالك': d?.ownerPhone || '',
        'الإيميل (اكتبه)': (p as any).ownerEmail || '', 'الباسوورد': genPass(), 'نسبة العمولة %': '', 'حالة الاتفاق': '', 'ملاحظات': '',
      });
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12, 14, 34, 12, 8, 20, 16, 28, 14, 14, 16, 30].map((w) => ({ wch: w }));
    (ws as any)['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] } as any;
    XLSX.utils.book_append_sheet(wb, ws, 'الملاك');
    XLSX.writeFile(wb, `elsab3-owners-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setBusy('');
  };

  const importSheet = async (file: File) => {
    setBusy('جاري عمل الحسابات...'); setLog([]);
    const wb = XLSX.read(await file.arrayBuffer());
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const byEmail: Record<string, { name: string; phone: string; pass: string; codes: string[]; commission: string }> = {};
    rows.forEach((r) => {
      const email = String(r['الإيميل (اكتبه)'] || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return;
      const e = byEmail[email] || { name: String(r['اسم المالك'] || ''), phone: String(r['موبايل المالك'] || ''), pass: String(r['الباسوورد'] || genPass()), codes: [], commission: String(r['نسبة العمولة %'] || '') };
      e.codes.push(String(r['كود الشقة']).trim());
      byEmail[email] = e;
    });
    const out: string[] = [];
    for (const [email, e] of Object.entries(byEmail)) {
      try {
        await saveAccount({ email, role: 'owner', name: e.name, phone: e.phone, password: e.pass, propertyCodes: e.codes, commission: e.commission } as any);
        out.push(`✓ ${email} · ${e.codes.join('، ')}`);
      } catch (err: any) { out.push(`✗ ${email}: ${err?.message || 'خطأ'}`); }
      setLog([...out]);
    }
    setBusy(''); if (!out.length) setLog(['مفيش صفوف فيها إيميل']);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <p className="font-bold text-lg">1. نزّل شيت الملاك</p>
        <p className="text-sm text-[#6B665C] leading-7">كل شقة بكودها واسم المالك ورقمه، وباسوورد مقترح جاهز. املا الإيميل ونسبة العمولة بعد ما تتفق مع كل مالك.</p>
        <Btn onClick={exportSheet} disabled={!!busy}><FileSpreadsheet size={16} />{busy && busy.includes('تجميع') ? busy : `تنزيل الشيت (${properties.length} شقة)`}</Btn>
      </Card>
      <Card tone="gold">
        <p className="font-bold text-lg">2. ارفع الشيت بعد ما تملاه</p>
        <p className="text-sm text-[#6B665C] leading-7">كل صف فيه إيميل بيتعمله حساب مالك بالباسوورد اللي في الشيت، ووحداته بتترِبط بيه لوحدها.</p>
        <input type="file" accept=".xlsx,.xls" disabled={!!busy} onChange={(e) => e.target.files?.[0] && importSheet(e.target.files[0])} className="text-sm" />
        {busy && busy.includes('الحسابات') && <p className="text-sm font-bold">{busy}</p>}
        {log.length > 0 && <div className="max-h-64 overflow-y-auto text-xs space-y-1 font-mono" dir="ltr">{log.map((l, i) => <p key={i} style={{ textAlign: 'right' }}>{l}</p>)}</div>}
      </Card>
    </div>
  );
};
