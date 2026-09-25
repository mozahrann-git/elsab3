import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, CalendarClock, MessageSquareText, Users, Building2, Home, Plus, LogOut } from 'lucide-react';
import { Property, Lead, SalesAgent, OwnerSubmission } from '../../types';
import { StaffAccess, subscribeToAccounts, AccountRecord } from '../../services/firebaseService';
import {
  UnitViewing, OwnerFeedback, ChangeRequest,
  subscribeAllUnitViewings, subscribeAllOwnerFeedback, subscribeAllChangeRequests,
} from '../../services/portalService';
import { PortalShell, Card, Chip, Btn, fmt, since } from './PortalShell';
import { UnitVisit, subscribeVisits, summarize } from '../../services/visitorService';
import { formatWhen } from '../common/WhenPicker';

/*
  لوحة أونر شركة السبع: بيشوف كل حاجة، ومبيعدّلش في حاجة.
  الاستثناء الوحيد: يقدر يعرض شقة جديدة، وبتروح للإدارة توافق عليها.
*/
interface Props {
  access: StaffAccess;
  properties: Property[];
  leads: Lead[];
  agents: SalesAgent[];
  submissions: OwnerSubmission[];
  logoUrl?: string;
  onClose: () => void;
  onLogout: () => void;
  onAddUnit: () => void;
  onOpenCrm: () => void;
}

const STAGES: { id: string; label: string }[] = [
  { id: 'new', label: 'جديد' }, { id: 'contacted', label: 'تم الاتصال' }, { id: 'sent_details', label: 'إرسال صور' },
  { id: 'visit_requested', label: 'تحت الطلب' }, { id: 'visit_booked', label: 'معاينة مؤكدة' }, { id: 'visit_done', label: 'تمت المعاينة' },
  { id: 'negotiation', label: 'تفاوض' }, { id: 'closed', label: 'صفقة مغلقة' }, { id: 'lost', label: 'مؤجل' },
];

export const CompanyOwnerPanel: React.FC<Props> = ({ access, properties, leads, agents, submissions, logoUrl, onClose, onLogout, onAddUnit, onOpenCrm }) => {
  const [tab, setTab] = useState('overview');
  const [viewings, setViewings] = useState<UnitViewing[]>([]);
  const [feedback, setFeedback] = useState<OwnerFeedback[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [visits, setVisits] = useState<UnitVisit[]>([]);
  useEffect(() => subscribeVisits(setVisits), []);

  useEffect(() => {
    const u = [subscribeAllUnitViewings(setViewings), subscribeAllOwnerFeedback(setFeedback), subscribeAllChangeRequests(setChanges), subscribeToAccounts(setAccounts)];
    return () => u.forEach((f) => f());
  }, []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const live = properties.filter((p) => p.category !== 'off_plan');
  const todayLeads = leads.filter((l) => new Date(l.createdAt || 0).getTime() >= today).length;
  const todayViewings = viewings.filter((v) => v.createdAt >= today).length;
  const pendingOwners = viewings.filter((v) => v.ownerStatus === 'pending').length;
  const brokers = accounts.filter((a) => a.role === 'broker');
  const owners = accounts.filter((a) => a.role === 'owner');
  const stageCount = (id: string) => leads.filter((l) => l.status === id).length;
  const codesOf = (a: AccountRecord) => (Array.isArray(a.propertyCodes) ? a.propertyCodes : String(a.propertyCodes || '').split(',').map((c) => c.trim()).filter(Boolean));

  const readonly = null;

  return (
    <PortalShell
      title={`أهلاً ${access.name || 'أونر السبع'}`} subtitle="لوحة أونر الشركة · عرض شامل" logoUrl={logoUrl}
      badge={pendingOwners ? { text: `${pendingOwners} معاينة مستنية`, tone: 'red' } : undefined}
      tabs={[
        { key: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard size={18} /> },
        { key: 'viewings', label: 'المعاينات', icon: <CalendarClock size={18} />, badge: pendingOwners },
        { key: 'feedback', label: 'الفيدباك', icon: <MessageSquareText size={18} /> },
        { key: 'crm', label: 'الطلبات والـ CRM', icon: <Users size={18} /> },
        { key: 'partners', label: 'البروكرز والملاك', icon: <Building2 size={18} /> },
        { key: 'add', label: 'إضافة شقة', icon: <Home size={18} /> },
      ]}
      active={tab} onTab={setTab} onClose={onClose}
      footer={<button onClick={onLogout} className="w-full px-4 py-3 rounded-xl text-sm text-[#F0776A] hover:bg-white/10 text-right flex items-center gap-2"><LogOut size={16} />خروج</button>}
    >
      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ['وحدات معروضة', live.length, '#141414'], ['عملاء في الـ CRM', leads.length, '#1F4E9C'],
            ['ريكويست جديد النهارده', todayLeads, '#A07A26'], ['معاينات النهارده', todayViewings, '#1E7A45'],
            ['زوار مختلفين النهارده', new Set(visits.filter((v) => v.at >= today).map((v) => v.visitor)).size, '#7A3E9C'],
            ['طلبات تواصل النهارده', visits.filter((v) => v.at >= today && v.requested).length, '#C2412D'],
          ].map(([t, v, c]) => (
            <Card key={t as string}>
              <p className="text-xs text-[#6B665C]">{t as string}</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Readex Pro', sans-serif", color: c as string }}>{v as number}</p>
            </Card>
          ))}
          <Card className="lg:col-span-4">
            <p className="font-bold">أدوات الأونر</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Btn onClick={onOpenCrm}><Users size={16} />افتح غرفة العمليات والـ CRM</Btn>
              <Btn tone="light" onClick={() => setTab('partners')}><Building2 size={16} />داشبورد البروكرز والملاك</Btn>
            </div>
          </Card>
          <Card tone="dark" className="lg:col-span-4">
            <span className="text-sm text-[#D9B864]">قيمة المعروض</span>
            <p className="text-3xl font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{fmt(live.reduce((s, p) => s + p.price, 0))} <span className="text-sm font-normal">ج.م</span></p>
            <span className="text-xs text-[#A3A09A]">{brokers.length} بروكر · {owners.length} مالك · {agents.length} في فريق المبيعات</span>
          </Card>
          <Card className="lg:col-span-4">
            <p className="font-bold">مراحل العملاء</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {STAGES.map((s) => (
                <div key={s.id} className="rounded-xl bg-[#F6F4EF] p-3 text-center">
                  <p className="text-xl font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{stageCount(s.id)}</p>
                  <p className="text-[10px] text-[#6B665C] leading-4">{s.label}</p>
                </div>
              ))}
            </div>
            {readonly}
          </Card>
        </div>
      )}

      {tab === 'viewings' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {!viewings.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش معاينات لسه</p>}
          {viewings.map((v) => (
            <Card key={v.id} tone={v.ownerStatus === 'pending' ? 'alert' : undefined}>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-bold">{v.propertyCode} · {v.scheduledText}</span>
                <Chip tone={v.ownerStatus === 'confirmed' ? 'green' : v.ownerStatus === 'pending' ? 'red' : 'grey'}>
                  {v.ownerStatus === 'confirmed' ? 'مؤكدة' : v.ownerStatus === 'pending' ? `مستنية رد · ${since(v.lastNotifiedAt)}` : v.ownerStatus === 'done' ? 'اتعاينت' : 'اتلغت'}
                </Chip>
              </div>
              <p className="text-sm text-[#6B665C]">{v.propertyTitle}</p>
              <p className="text-xs text-[#6B665C]">السيلز: {v.salesAgentName || '—'} · {v.brokerId ? `بروكر: ${v.brokerId}` : `المالك: ${v.ownerName || '—'}`}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {!feedback.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش فيدباك منشور لسه</p>}
          {feedback.map((f) => (
            <Card key={f.id}>
              <div className="flex justify-between"><span className="font-bold">{f.propertyCode} · {f.date}</span><span className="text-[#D9B864]">{'★'.repeat(f.rating || 0)}</span></div>
              <p className="leading-7 text-sm">"{f.summary}"</p>
              <div className="flex flex-wrap gap-1.5">
                {(f.positives || []).map((x) => <Chip key={x} tone="green">+ {x}</Chip>)}
                {(f.negatives || []).map((x) => <Chip key={x} tone="red">− {x}</Chip>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'crm' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <p className="font-bold">داشبورد فريق المبيعات</p>
            {agents.map((a) => {
              const mine = leads.filter((l) => l.assignedAgentId === a.id);
              return (
                <div key={a.id} className="flex flex-wrap justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 text-sm">
                  <span className="font-bold">{a.name}</span>
                  <span className="flex flex-wrap gap-2 text-[11px]">
                    <Chip tone="grey">{mine.length} عميل</Chip>
                    <Chip tone="green">{mine.filter((l) => l.status === 'closed').length} صفقة</Chip>
                    <Chip tone="blue">{viewings.filter((v) => v.salesAgentId === a.id).length} معاينة</Chip>
                    <Chip tone="gold">{mine.filter((l) => (l.activity || []).some((x: any) => x.at >= today)).length} أكشن النهارده</Chip>
                    <Chip tone="red">{mine.filter((l) => l.nextActionAt && l.nextActionAt < Date.now() && l.followUpStatus !== 'completed').length} متأخرة</Chip>
                  </span>
                </div>
              );
            })}
            {readonly}
          </Card>
          <Card className="lg:col-span-2">
            <p className="font-bold">آخر الطلبات</p>
            {leads.slice(0, 15).map((l) => (
              <div key={l.id} className="flex flex-wrap justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 text-sm">
                <span className="font-bold">{l.name}</span>
                <span className="text-xs text-[#6B665C]">
                  {STAGES.find((s) => s.id === l.status)?.label || l.status} · {l.assignedAgentName || '—'}
                  {l.nextActionAt ? ` · الجاي ${formatWhen(l.nextActionAt)}` : ''}
                </span>
              </div>
            ))}
            {readonly}
          </Card>
        </div>
      )}

      {tab === 'partners' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="font-bold">البروكرز ({brokers.length})</p>
            {brokers.map((b) => {
              const units = properties.filter((p) => p.brokerId === b.brokerId);
              const vs = viewings.filter((v) => v.brokerId === b.brokerId);
              return (
                <div key={b.email} className="border-t border-[#F0ECE4] pt-2 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-sm">{b.name || b.brokerId}</span>
                    <Chip tone="blue">{units.length} وحدة</Chip>
                  </div>
                  <p className="text-xs text-[#6B665C]">{vs.length} معاينة · {vs.filter((v) => v.brokerStatus === 'confirmed').length} مؤكدة{b.commission ? ` · عمولة ${b.commission}%` : ''}</p>
                </div>
              );
            })}
            {!brokers.length && <p className="text-sm text-[#6B665C]">مفيش بروكرز لسه</p>}
            {readonly}
          </Card>
          <Card>
            <p className="font-bold">الملاك ({owners.length})</p>
            {owners.map((o) => {
              const codes = codesOf(o);
              const units = properties.filter((p) => codes.includes(p.code));
              const vs = viewings.filter((v) => codes.includes(v.propertyCode));
              return (
                <div key={o.email} className="border-t border-[#F0ECE4] pt-2 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-sm">{o.name || o.email}</span>
                    <Chip tone="gold">{units.length} وحدة</Chip>
                  </div>
                  <p className="text-xs text-[#6B665C]">{codes.join('، ') || '—'} · {vs.length} معاينة</p>
                </div>
              );
            })}
            {!owners.length && <p className="text-sm text-[#6B665C]">مفيش ملاك مسجلين لسه</p>}
            {readonly}
          </Card>
          <Card className="lg:col-span-2">
            <p className="font-bold">طلبات التعديل من الملاك والبروكرز</p>
            {changes.slice(0, 12).map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 text-sm">
                <span>{c.propertyCode} · {c.type === 'price' ? `سعر ${fmt(c.newPrice)}` : c.type === 'photos' ? 'صور جديدة' : c.type === 'pause' ? 'إيقاف معاينات' : 'تشغيل معاينات'}</span>
                <Chip tone={c.status === 'pending' ? 'gold' : c.status === 'approved' ? 'green' : 'red'}>{c.status === 'pending' ? 'مستني الإدارة' : c.status === 'approved' ? 'اتوافق' : 'اترفض'}</Chip>
              </div>
            ))}
            {!changes.length && <p className="text-sm text-[#6B665C]">مفيش طلبات</p>}
          </Card>
        </div>
      )}

      {tab === 'add' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="gold">
            <p className="font-bold text-lg">اعرض شقة جديدة</p>
            <p className="text-sm text-[#6B665C] leading-7">املا بيانات الشقة وصورها، وهتروح للإدارة تراجعها وتنشرها بكود. هتلاقيها تحت "قيد المراجعة" لحد ما تتوافق.</p>
            <Btn onClick={onAddUnit}><Plus size={16} />ابدأ</Btn>
          </Card>
          <Card>
            <p className="font-bold">شقق قيد المراجعة ({submissions.filter((s) => s.status === 'pending').length})</p>
            {submissions.filter((s) => s.status === 'pending').map((s) => (
              <div key={s.id} className="flex justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 text-sm">
                <span>{s.area} م² · {s.neighborhood}</span>
                <span className="font-bold">{fmt(s.askingPrice)}</span>
              </div>
            ))}
            {!submissions.filter((s) => s.status === 'pending').length && <p className="text-sm text-[#6B665C]">مفيش شقق مستنية مراجعة</p>}
          </Card>
        </div>
      )}
    </PortalShell>
  );
};
