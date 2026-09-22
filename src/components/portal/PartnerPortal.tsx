import React, { useEffect, useMemo, useState } from 'react';
import { Home, CalendarClock, MessageSquareText, UserRound, Plus, ExternalLink, Pause, Play, Image as ImageIcon, BadgeDollarSign, LogOut, KeyRound, Phone } from 'lucide-react';
import { Property } from '../../types';
import { StaffAccess } from '../../services/firebaseService';
import { uploadFile } from '../../services/mediaStorage';
import {
  UnitViewing, OwnerFeedback, ChangeRequest,
  subscribeViewingsByCodes, subscribeFeedbackByCodes, subscribeViewingsByBroker, subscribeFeedbackByBroker,
  subscribeMyChangeRequests, subscribeMySubmissions, respondToViewing, createChangeRequest,
  brokerSaveOwnerPhone, brokerMarkMessaged, brokerConfirmViewing,
} from '../../services/portalService';
import { PortalShell, Card, Chip, Btn, fmt, since } from './PortalShell';
import { ChangePasswordModal } from '../ChangePasswordModal';

/*
  بوابة المالك والبروكر (نفس الهيكل):
  - المالك: وحداته بالأكواد المربوطة بحسابه، يأكد المعاينات، يشوف الآراء، يطلب تعديلات
  - البروكر: وحداته بالـ brokerId، ويأكد المعاينة مع المالك في 3 خطوات
*/

interface Props {
  mode: 'owner' | 'broker';
  access: StaffAccess;
  properties: Property[];
  logoUrl?: string;
  onClose: () => void;
  onLogout: () => void;
  onAddUnit: () => void;
}

const REMIND_MS = 15 * 60 * 1000;

export const PartnerPortal: React.FC<Props> = ({ mode, access, properties, logoUrl, onClose, onLogout, onAddUnit }) => {
  const isBroker = mode === 'broker';
  const [tab, setTab] = useState(isBroker ? 'viewings' : 'units');
  const [viewings, setViewings] = useState<UnitViewing[]>([]);
  const [feedback, setFeedback] = useState<OwnerFeedback[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [nag, setNag] = useState(false);

  const codes = useMemo(() => (access.propertyCodes || []).map((c) => c.trim().toUpperCase()), [access.propertyCodes]);
  const mine = useMemo(() => properties.filter((p) =>
    isBroker ? (access.role === 'admin' || p.brokerId === access.brokerId) : codes.includes(String(p.code || '').toUpperCase())
  ), [properties, codes, access, isBroker]);

  useEffect(() => {
    const u1 = isBroker && access.brokerId ? subscribeViewingsByBroker(access.brokerId, setViewings) : subscribeViewingsByCodes(codes, setViewings);
    const u2 = isBroker && access.brokerId ? subscribeFeedbackByBroker(access.brokerId, setFeedback) : subscribeFeedbackByCodes(codes, setFeedback);
    const u3 = subscribeMyChangeRequests(setChanges);
    const u4 = subscribeMySubmissions(setSubs);
    return () => { u1(); u2(); u3(); u4(); };
  }, [codes.join(','), access.brokerId, isBroker]);

  const pending = viewings.filter((v) => isBroker ? v.brokerStatus !== 'confirmed' && v.ownerStatus === 'pending' : v.ownerStatus === 'pending');

  // تذكير كل ربع ساعة طول ما في معاينة مستنية
  useEffect(() => {
    if (!pending.length) { setNag(false); return; }
    setNag(true);
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* */ }
    const t = setInterval(() => {
      setNag(true);
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('السبع للعقارات', { body: 'في معاينة مستنية تأكيدك' }); } catch { /* */ }
    }, REMIND_MS);
    return () => clearInterval(t);
  }, [pending.length]);

  const weekViews = mine.reduce((s, p) => s + (p.clicks?.views || 0), 0);
  const weekAsks = mine.reduce((s, p) => s + (p.clicks?.whatsapp || 0) + (p.clicks?.call || 0), 0);
  const reviewSubs = subs.filter((s) => s.status === 'pending');

  const tabs = [
    ...(isBroker ? [{ key: 'viewings', label: 'الطلبات', icon: <CalendarClock size={18} />, badge: pending.length }] : []),
    { key: 'units', label: 'وحداتي', icon: <Home size={18} />, badge: isBroker ? 0 : pending.length },
    ...(!isBroker ? [{ key: 'viewings', label: 'المعاينات', icon: <CalendarClock size={18} /> }] : []),
    { key: 'feedback', label: 'الآراء', icon: <MessageSquareText size={18} /> },
    { key: 'account', label: 'حسابي', icon: <UserRound size={18} /> },
  ];

  const unit = openUnit ? mine.find((p) => p.id === openUnit) : null;
  const district = (p: Property) => {
    const peers = properties.filter((x) => x.neighborhood === p.neighborhood && x.area > 0 && x.id !== p.id).map((x) => x.price / x.area);
    if (peers.length < 2) return null;
    const avg = peers.reduce((a, b) => a + b, 0) / peers.length;
    return { avg, diff: ((p.price / p.area - avg) / avg) * 100 };
  };

  return (
    <PortalShell
      title={`أهلاً ${access.name || ''}`.trim()}
      subtitle={isBroker ? 'بوابة شركاء السبع' : 'بوابة ملاك السبع'}
      logoUrl={logoUrl}
      badge={pending.length ? { text: `${pending.length} مستني ردك`, tone: 'red' } : { text: `${mine.length} وحدات`, tone: 'gold' }}
      tabs={tabs} active={unit ? 'units' : tab} onTab={(k) => { setOpenUnit(null); setTab(k); }} onClose={onClose}
      footer={<button onClick={onLogout} className="w-full px-4 py-3 rounded-xl text-sm text-[#F0776A] hover:bg-white/10 text-right flex items-center gap-2"><LogOut size={16} />خروج</button>}
    >
      <ChangePasswordModal isOpen={passOpen} onClose={() => setPassOpen(false)} />

      {nag && pending.length > 0 && (
        <div className="mb-4 rounded-2xl bg-[#C2412D] text-white p-4 flex items-center justify-between gap-3" role="alert">
          <span className="font-semibold">عندك {pending.length} معاينة مستنية تأكيدك</span>
          <button onClick={() => { setNag(false); setOpenUnit(null); setTab(isBroker ? 'viewings' : 'viewings'); }} className="px-4 py-2 rounded-xl bg-white text-[#C2412D] font-bold text-sm">شوفها</button>
        </div>
      )}

      {unit ? (
        <UnitDetail unit={unit} viewings={viewings.filter((v) => v.propertyCode === unit.code)} feedback={feedback.filter((f) => f.propertyCode === unit.code)}
          changes={changes.filter((c) => c.propertyId === unit.id)} district={district(unit)} isBroker={isBroker} brokerId={access.brokerId} onBack={() => setOpenUnit(null)} />
      ) : tab === 'units' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card tone="dark" className="lg:col-span-3">
            <span className="text-sm text-[#D9B864]">على وحداتك لحد النهارده</span>
            <div className="grid grid-cols-3 gap-2">
              <Stat n={fmt(weekViews)} l="مشاهدة" light />
              <Stat n={fmt(weekAsks)} l="طلب تفاصيل" color="#7ED3A0" light />
              <Stat n={String(viewings.length)} l="معاينة" color="#D9B864" light />
            </div>
          </Card>
          {mine.map((p) => {
            const pv = viewings.find((v) => v.propertyCode === p.code && v.ownerStatus === 'pending');
            return (
              <button key={p.id} onClick={() => setOpenUnit(p.id)} className="text-right">
                <Card className="h-full hover:border-[#A07A26] transition">
                  <div className="flex gap-3">
                    <Thumb p={p} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        {(p as any).viewingsPaused ? <Chip tone="grey">المعاينات موقوفة</Chip> : <Chip tone="green">● منشورة</Chip>}
                        <span className="font-mono text-[11px] bg-[#141414] text-white px-2 py-0.5 rounded-md">{p.code}</span>
                      </div>
                      <p className="font-bold text-[15px] truncate">{p.title}</p>
                      <p className="font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{fmt(p.price)} <span className="text-xs font-normal">ج.م</span></p>
                    </div>
                  </div>
                  {pv && <div className="rounded-xl bg-[#FBEDEA] border border-[#E9B8AE] text-[#9A2E1F] text-sm font-semibold px-3 py-2">معاينة {pv.scheduledText} مستنية تأكيدك</div>}
                  <div className="grid grid-cols-3 border-t border-[#F0ECE4] pt-3">
                    <Stat n={fmt(p.clicks?.views)} l="مشاهدة" />
                    <Stat n={fmt(p.clicks?.whatsapp)} l="واتساب" color="#1E7A45" />
                    <Stat n={fmt(p.clicks?.call)} l="مكالمة" color="#1F4E9C" />
                  </div>
                </Card>
              </button>
            );
          })}
          {reviewSubs.map((s) => (
            <Card key={s.id}>
              <div className="flex justify-between"><Chip tone="gold">قيد المراجعة</Chip><span className="text-xs text-[#6B665C]">الكود بيتحدد بعد المراجعة</span></div>
              <p className="font-bold">{s.area} م² · {s.neighborhood}</p>
              <p className="font-bold">{fmt(s.askingPrice)} ج.م</p>
            </Card>
          ))}
          <button onClick={onAddUnit} className="rounded-2xl border-2 border-dashed border-[#CFC7B8] bg-white p-6 flex items-center justify-center gap-2 font-bold hover:border-[#A07A26]">
            <Plus size={18} />اعرض شقة {mine.length ? 'تانية' : ''}
          </button>
          {!mine.length && !reviewSubs.length && <p className="lg:col-span-3 text-center text-sm text-[#6B665C]">لسه مفيش وحدات مربوطة بحسابك</p>}
        </div>
      ) : tab === 'viewings' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {viewings.length === 0 && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش معاينات لسه</p>}
          {viewings.map((v) => isBroker ? <BrokerViewing key={v.id} v={v} brokerId={access.brokerId || ''} brokerName={access.name || ''} /> : <OwnerViewing key={v.id} v={v} />)}
        </div>
      ) : tab === 'feedback' ? (
        <FeedbackList feedback={feedback} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="font-bold text-lg">{access.name || 'حسابي'}</p>
            <p className="font-mono text-sm text-[#6B665C]" dir="ltr" style={{ textAlign: 'right' }}>{access.email}</p>
            <Btn tone="light" onClick={() => setPassOpen(true)}><KeyRound size={16} />تغيير الباسوورد</Btn>
            <Btn tone="danger" onClick={onLogout}><LogOut size={16} />خروج</Btn>
          </Card>
          <Card tone="gold">
            <p className="font-bold">خصوصيتك محفوظة</p>
            <p className="text-sm text-[#6B665C] leading-7">رقمك مش بيظهر لأي عميل ولا لفريق المبيعات، وأرقامهم مش بتظهرلك. التواصل كله عن طريق مسؤولة الملاك.</p>
          </Card>
        </div>
      )}
    </PortalShell>
  );
};

const Stat: React.FC<{ n: string; l: string; color?: string; light?: boolean }> = ({ n, l, color, light }) => (
  <div className="flex flex-col items-center">
    <span className="text-xl font-bold" style={{ color: color || (light ? '#fff' : '#141414'), fontFamily: "'Readex Pro', sans-serif" }}>{n}</span>
    <span className="text-[11px]" style={{ color: light ? '#CFCBC2' : '#6B665C' }}>{l}</span>
  </div>
);
const Thumb: React.FC<{ p: Property }> = ({ p }) => p.images?.[0]
  ? <img src={p.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
  : <div className="w-20 h-20 rounded-xl shrink-0" style={{ background: 'repeating-linear-gradient(135deg,#E7E2D8 0 10px,#EFEBE3 10px 20px)' }} />;

const OwnerViewing: React.FC<{ v: UnitViewing }> = ({ v }) => {
  const [note, setNote] = useState('');
  const [asking, setAsking] = useState(false);
  const tone = v.ownerStatus === 'pending' ? 'alert' : undefined;
  return (
    <Card tone={tone as any}>
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold">{v.propertyCode} · {v.propertyTitle}</span>
        {v.ownerStatus === 'pending' ? <Chip tone="red">مستني ردك</Chip> : v.ownerStatus === 'confirmed' ? <Chip tone="green">أكّدت</Chip> : v.ownerStatus === 'reschedule' ? <Chip tone="gold">طلبت ميعاد تاني</Chip> : <Chip tone="grey">{v.ownerStatus === 'done' ? 'اتعاينت' : 'اتلغت'}</Chip>}
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{v.scheduledText}</p>
      {v.clientNote && <p className="text-sm text-[#6B665C]">{v.clientNote}</p>}
      {v.ownerStatus === 'pending' && (
        <>
          {asking ? (
            <div className="flex flex-col gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب الميعاد اللي يناسبك" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              <Btn tone="dark" onClick={() => respondToViewing(v.id, 'reschedule', note)}>ابعت الميعاد</Btn>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Btn tone="green" onClick={() => respondToViewing(v.id, 'confirmed')}>تمام، موجود</Btn>
              <Btn tone="light" onClick={() => setAsking(true)}>ميعاد تاني</Btn>
            </div>
          )}
          <p className="text-xs text-[#9A2E1F]">لو مأكدتش هيوصلك تذكير كل ربع ساعة، ومسؤولة الملاك هتتواصل معاك</p>
        </>
      )}
    </Card>
  );
};

const BrokerViewing: React.FC<{ v: UnitViewing; brokerId: string; brokerName: string }> = ({ v, brokerId, brokerName }) => {
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [time, setTime] = useState('');
  const step = v.brokerStatus === 'confirmed' ? 4 : v.brokerStatus === 'messaged' ? 3 : saved ? 2 : 1;
  const msg = `أهلاً ${ownerName || 'أستاذنا'}، في عميل جاد عايز يعاين شقتك (${v.propertyTitle}) ${v.scheduledText}. ينفع؟ — ${brokerName} · السبع للعقارات`;
  const phone = ownerPhone.replace(/\D/g, '').replace(/^0/, '20');
  const Step: React.FC<{ n: number; t: string }> = ({ n, t }) => (
    <div className="flex items-center gap-2.5">
      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step > n ? 'bg-[#1E7A45] text-white' : step === n ? 'bg-[#141414] text-white' : 'bg-[#E4DFD4] text-[#6B665C]'}`}>{step > n ? '✓' : n}</span>
      <span className={`text-sm ${step === n ? 'font-bold' : 'text-[#6B665C]'}`}>{t}</span>
    </div>
  );
  return (
    <Card tone={step < 4 ? 'alert' : undefined}>
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold">مطلوب معاينة · {v.propertyCode}</span>
        {step < 4 ? <Chip tone="red">من {since(v.createdAt)}</Chip> : <Chip tone="green">اتأكدت {v.brokerConfirmedTime}</Chip>}
      </div>
      <p className="text-sm text-[#6B665C]">{v.propertyTitle} · العميل يفضّل: {v.scheduledText}</p>
      {step < 4 && (
        <div className="flex flex-col gap-3 border-t border-[#F0ECE4] pt-3">
          <Step n={1} t="سجّل رقم المالك (بيظهر للإدارة بس)" />
          {step === 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="اسم المالك" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              <Btn className="sm:col-span-2" disabled={ownerPhone.replace(/\D/g, '').length < 10}
                onClick={async () => { await brokerSaveOwnerPhone(v.propertyId, ownerName, ownerPhone, brokerId); setSaved(true); }}>حفظ الرقم</Btn>
            </div>
          )}
          <Step n={2} t="ابعت للمالك الرسالة الجاهزة" />
          {step === 2 && (
            <>
              <div className="rounded-xl bg-[#F6F4EF] p-3 text-sm leading-7">{msg}</div>
              <a href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" onClick={() => brokerMarkMessaged(v.id)}
                className="rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-[#1E7A45] text-white"><Phone size={16} />ابعت على واتساب</a>
            </>
          )}
          <Step n={3} t="أكّد المعاد هنا بعد ما المالك يرد" />
          {step === 3 && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {['5:00', '6:00', '7:00', '8:00'].map((t) => (
                  <button key={t} onClick={() => setTime(t)} className={`rounded-xl py-2.5 text-sm font-semibold ${time === t ? 'bg-[#141414] text-white' : 'bg-[#F6F4EF]'}`}>{t}</button>
                ))}
              </div>
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="أو اكتب الميعاد" className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              <Btn tone="gold" disabled={!time} onClick={() => brokerConfirmViewing(v.id, time)}>تأكيد المعاد {time}</Btn>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

const FeedbackList: React.FC<{ feedback: OwnerFeedback[] }> = ({ feedback }) => {
  const priceIssues = feedback.filter((f) => (f.negatives || []).some((n) => n.includes('السعر')) || f.priceFeedback === 'overpriced' || f.priceFeedback === 'slightly_high').length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {feedback.length >= 2 && (
        <Card tone="dark" className="lg:col-span-2">
          <span className="text-sm text-[#D9B864]">ملخص الآراء</span>
          <p className="leading-8">{priceIssues * 2 >= feedback.length
            ? <>{priceIssues} من {feedback.length} معاينين شايفين إن <b className="text-[#D9B864]">السعر أعلى من المتوقع</b>. كلّم مسؤولة الملاك تتناقشوا.</>
            : <>متوسط التقييم <b className="text-[#D9B864]">{(feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1)} من 5</b> من {feedback.length} معاينات.</>}</p>
        </Card>
      )}
      {feedback.length === 0 && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">الآراء بتظهر هنا بعد كل معاينة</p>}
      {feedback.map((f) => (
        <Card key={f.id}>
          <div className="flex justify-between"><span className="font-bold">{f.propertyCode} · {f.date}</span><span className="text-[#D9B864]">{'★'.repeat(f.rating || 0)}<span className="text-[#E4DFD4]">{'★'.repeat(5 - (f.rating || 0))}</span></span></div>
          <p className="leading-8">"{f.summary}"</p>
          <div className="flex flex-wrap gap-1.5">
            {(f.positives || []).map((x) => <Chip key={x} tone="green">+ {x}</Chip>)}
            {(f.negatives || []).map((x) => <Chip key={x} tone="red">− {x}</Chip>)}
          </div>
          <span className="text-[11px] text-[#8C877D]">كتبه فريق السبع بعد المعاينة</span>
        </Card>
      ))}
    </div>
  );
};

const UnitDetail: React.FC<{
  unit: Property; viewings: UnitViewing[]; feedback: OwnerFeedback[]; changes: ChangeRequest[];
  district: { avg: number; diff: number } | null; isBroker: boolean; brokerId?: string; onBack: () => void;
}> = ({ unit, viewings, feedback, changes, district, isBroker, brokerId, onBack }) => {
  const [mode, setMode] = useState<'' | 'price' | 'photos'>('');
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const paused = (unit as any).viewingsPaused;
  const send = async (type: 'price' | 'photos' | 'pause' | 'resume') => {
    setBusy(true);
    try {
      await createChangeRequest({
        propertyId: unit.id, propertyCode: unit.code, propertyTitle: unit.title, requesterRole: isBroker ? 'broker' : 'owner', brokerId,
        type, oldPrice: unit.price, newPrice: type === 'price' ? Number(price.replace(/\D/g, '')) : undefined, images: type === 'photos' ? files : undefined,
      });
      setDone('اتبعت الطلب، هيتراجع قبل ما يظهر للزوار'); setMode(''); setPrice(''); setFiles([]);
    } finally { setBusy(false); }
  };
  const steps = [
    { t: `اتنشرت بكود ${unit.code}`, s: unit.createdAt, on: true },
    { t: `${fmt(unit.clicks?.views)} مشاهدة و${fmt((unit.clicks?.whatsapp || 0) + (unit.clicks?.call || 0))} طلب تفاصيل`, s: 'لحد النهارده', on: true },
    { t: viewings.length ? `${viewings.length} طلب معاينة` : 'طلبات المعاينة', s: viewings[0]?.scheduledText || 'هتظهر هنا', on: viewings.length > 0 },
    { t: feedback.length ? `${feedback.length} رأي بعد المعاينة` : 'فيدباك بعد المعاينة', s: feedback.length ? 'في تبويب الآراء' : 'هيوصلك هنا', on: feedback.length > 0 },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <button onClick={onBack} className="lg:col-span-3 text-right text-sm font-semibold text-[#A07A26]">→ كل الوحدات</button>
      <Card className="lg:col-span-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <p className="font-bold text-xl" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{unit.title}</p>
          <a href={`/?property=${unit.code}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#A07A26] flex items-center gap-1">شوفها زي الزوار <ExternalLink size={14} /></a>
        </div>
        <div className="flex flex-wrap gap-2 items-center"><span className="font-mono text-xs bg-[#141414] text-white px-2 py-1 rounded-md">{unit.code}</span><Chip tone={paused ? 'grey' : 'green'}>{paused ? 'المعاينات موقوفة' : 'منشورة'}</Chip><span className="font-bold">{fmt(unit.price)} ج.م</span></div>
      </Card>
      <div className="lg:col-span-2 grid gap-4">
        {viewings.filter((v) => v.ownerStatus === 'pending').map((v) => isBroker ? <BrokerViewing key={v.id} v={v} brokerId={brokerId || ''} brokerName="" /> : <OwnerViewing key={v.id} v={v} />)}
        <Card>
          <p className="font-bold">مسار الشقة</p>
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center"><span className="w-3 h-3 rounded-full" style={{ background: s.on ? '#1E7A45' : '#C9C4BA' }} />{i < steps.length - 1 && <span className="w-0.5 flex-1 bg-[#ECE8DF] min-h-6" />}</div>
              <div className="pb-2"><p className={s.on ? 'font-bold text-sm' : 'text-sm text-[#9A958B]'}>{s.t}</p><p className="text-xs text-[#6B665C]">{s.s}</p></div>
            </div>
          ))}
        </Card>
      </div>
      <div className="grid gap-4 content-start">
        {district && (
          <Card tone="gold">
            <p className="font-bold">سعرك فين من الحي؟</p>
            <p className="text-sm">{fmt(unit.price / unit.area)} للمتر · متوسط {unit.neighborhood} {fmt(district.avg)}</p>
            <p className="font-bold" style={{ color: district.diff <= 0 ? '#1E7A45' : '#C2412D' }}>{district.diff <= 0 ? 'أقل' : 'أعلى'} من المتوسط بـ {Math.abs(district.diff).toFixed(0)}%</p>
          </Card>
        )}
        <Card>
          <p className="font-bold">عايز تغيّر حاجة؟</p>
          {done && <p className="text-sm rounded-xl bg-[#EEF5F0] text-[#1E7A45] p-3">{done}</p>}
          <div className="grid grid-cols-3 gap-2">
            <Btn tone="light" className="flex-col !py-3 text-xs" onClick={() => setMode(mode === 'price' ? '' : 'price')}><BadgeDollarSign size={18} />السعر</Btn>
            <Btn tone="light" className="flex-col !py-3 text-xs" onClick={() => setMode(mode === 'photos' ? '' : 'photos')}><ImageIcon size={18} />الصور</Btn>
            <Btn tone="light" className="flex-col !py-3 text-xs" disabled={busy} onClick={() => send(paused ? 'resume' : 'pause')}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'تشغيل' : 'إيقاف'}</Btn>
          </div>
          {mode === 'price' && (
            <div className="flex gap-2"><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر الجديد" inputMode="numeric" className="flex-1 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" /><Btn disabled={busy || !price} onClick={() => send('price')}>ابعت</Btn></div>
          )}
          {mode === 'photos' && (
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" multiple onChange={async (e) => {
                const list = Array.from(e.target.files || []) as File[]; setBusy(true);
                try { const urls = await Promise.all(list.map((f) => uploadFile(f, 'properties', unit.id))); setFiles((x) => [...x, ...urls]); } finally { setBusy(false); }
              }} className="text-sm" />
              {files.length > 0 && <div className="flex gap-2 flex-wrap">{files.map((u) => <img key={u} src={u} alt="" className="w-14 h-14 rounded-lg object-cover" />)}</div>}
              <Btn disabled={busy || !files.length} onClick={() => send('photos')}>{busy ? 'جاري الرفع...' : `ابعت ${files.length} صورة للمراجعة`}</Btn>
            </div>
          )}
          <p className="text-xs text-[#6B665C]">أي تعديل بيتراجع من الإدارة قبل ما يظهر للزوار</p>
          {changes.map((c) => (
            <div key={c.id} className="flex justify-between text-sm border-t border-[#F0ECE4] pt-2">
              <span>{c.type === 'price' ? `سعر ${fmt(c.newPrice)}` : c.type === 'photos' ? 'صور جديدة' : c.type === 'pause' ? 'إيقاف المعاينات' : 'تشغيل المعاينات'}</span>
              <Chip tone={c.status === 'pending' ? 'gold' : c.status === 'approved' ? 'green' : 'red'}>{c.status === 'pending' ? 'قيد المراجعة' : c.status === 'approved' ? 'اتوافق' : 'اترفض'}</Chip>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
