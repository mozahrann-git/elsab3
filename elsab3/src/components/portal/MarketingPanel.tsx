import React, { useEffect, useState } from 'react';
import { CalendarClock, Video, Hash, LogOut, Users } from 'lucide-react';
import { SalesAgent } from '../../types';
import { StaffAccess } from '../../services/firebaseService';
import { uploadFile } from '../../services/mediaStorage';
import { ContentSlot, subscribeSlots, updateSlot, weekKey, adTagOf, subscribeSalesForms, SalesForms, DEFAULT_FORMS } from '../../services/salesToolsService';
import { PortalShell, Card, Chip, Btn, since } from './PortalShell';

/*
  لوحة شركة الماركتنج: مواعيد التصوير والسكربتات ورفع المونتاج ومعرّفات الإعلانات.
  مش بتشوف العملاء ولا الأسعار ولا أرقام الملاك.
*/
export const MarketingPanel: React.FC<{
  access: StaffAccess; agents: SalesAgent[]; logoUrl?: string; onClose: () => void; onLogout: () => void;
}> = ({ access, agents, logoUrl, onClose, onLogout }) => {
  const [tab, setTab] = useState('shoots');
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [forms, setForms] = useState<SalesForms>(DEFAULT_FORMS);
  const [busy, setBusy] = useState('');
  useEffect(() => subscribeSlots(setSlots), []);
  useEffect(() => subscribeSalesForms(setForms), []);

  const wk = weekKey();
  const week = slots.filter((s) => s.weekKey === wk);
  const open = week.filter((s) => s.shoot && s.shoot.status !== 'delivered');
  const pending = open.filter((s) => s.shoot?.status === 'requested').length;

  const upload = async (s: ContentSlot, file: File) => {
    setBusy(s.id);
    try {
      const url = await uploadFile(file, 'marketing', s.id);
      await updateSlot(s.id, { shoot: { ...(s.shoot as any), status: 'delivered', finalUrl: url } });
    } finally { setBusy(''); }
  };

  return (
    <PortalShell
      title={access.name || 'شركة الماركتنج'} subtitle="التصوير والمحتوى والإعلانات" logoUrl={logoUrl}
      badge={pending ? { text: `${pending} طلب جديد`, tone: 'red' } : undefined}
      tabs={[
        { key: 'shoots', label: 'التصوير', icon: <CalendarClock size={18} />, badge: pending },
        { key: 'ads', label: 'معرّفات الإعلانات', icon: <Hash size={18} /> },
        { key: 'team', label: 'الالتزام', icon: <Users size={18} /> },
      ]}
      active={tab} onTab={setTab} onClose={onClose}
      footer={<button onClick={onLogout} className="w-full px-4 py-3 rounded-xl text-sm text-[#F0776A] hover:bg-white/10 text-right flex items-center gap-2"><LogOut size={16} />خروج</button>}
    >
      {tab === 'shoots' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {!open.length && <p className="lg:col-span-2 text-center text-sm text-[#6B665C] py-10">مفيش طلبات تصوير الأسبوع ده</p>}
          {open.map((s) => (
            <Card key={s.id} tone={s.shoot?.status === 'requested' ? 'alert' : undefined}>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="font-bold">{s.agentName} · {s.code}</span>
                <Chip tone={s.shoot?.status === 'requested' ? 'red' : s.shoot?.status === 'confirmed' ? 'gold' : 'green'}>
                  {s.shoot?.status === 'requested' ? `مستني تأكيد · ${since(s.createdAt)}` : s.shoot?.status === 'confirmed' ? `تصوير ${s.shoot?.at || ''}` : 'اتصوّر'}
                </Chip>
              </div>
              <p className="text-sm text-[#6B665C]">{s.title} · الميعاد المقترح: {(s.shoot?.dates || []).join(' / ') || '—'}</p>
              {s.script?.hook && (
                <div className="rounded-xl bg-[#F6F4EF] p-3 text-[13px] leading-7 space-y-1">
                  <p><b>الهوك:</b> {s.script.hook}</p>
                  {s.script.points && <p><b>النقط:</b> {s.script.points}</p>}
                  {s.script.question && <p><b>السؤال:</b> {s.script.question}</p>}
                </div>
              )}
              {s.shoot?.status === 'requested' && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <input placeholder="المصوّر" onBlur={(e) => updateSlot(s.id, { shoot: { ...(s.shoot as any), crew: e.target.value } })} className="rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-2.5 text-sm" />
                  <Btn onClick={() => updateSlot(s.id, { shoot: { ...(s.shoot as any), status: 'confirmed', at: (s.shoot?.dates || [])[0] || '' } })}>أكّد الميعاد</Btn>
                </div>
              )}
              {s.shoot?.status === 'confirmed' && <Btn tone="light" onClick={() => updateSlot(s.id, { shoot: { ...(s.shoot as any), status: 'shot' } })}>اتصوّر</Btn>}
              {(s.shoot?.status === 'shot' || s.shoot?.status === 'confirmed') && (
                <label className="rounded-xl border-2 border-dashed border-[#CFC7B8] p-4 text-center text-sm text-[#6B665C] cursor-pointer">
                  {busy === s.id ? 'جاري الرفع...' : 'ارفع الفيديو بعد المونتاج'}
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(s, e.target.files[0])} />
                </label>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'ads' && (
        <Card>
          <p className="font-bold">معرّفات الإعلانات</p>
          <p className="text-sm text-[#6B665C] leading-7">حطّ المعرّف ده في نص رسالة الواتساب في إعلان فيسبوك/إنستجرام، فالرسالة توصل على رقم السبع الواحد وإحنا نعرف صاحبها.</p>
          {week.map((s) => (
            <div key={s.id} className="flex justify-between items-center border-t border-[#F0ECE4] pt-2 gap-2">
              <span className="text-sm">{s.agentName} · {s.code}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs" dir="ltr">{adTagOf(s.agentName, s.code)}</span>
                <button onClick={() => navigator.clipboard?.writeText(adTagOf(s.agentName, s.code))} className="px-2.5 py-1.5 rounded-lg bg-[#141414] text-white text-xs font-bold">نسخ</button>
              </span>
            </div>
          ))}
          {!week.length && <p className="text-xs text-[#8C877D]">لسه مفيش محتوى الأسبوع ده</p>}
        </Card>
      )}

      {tab === 'team' && (
        <Card>
          <p className="font-bold">التزام الأسبوع ({forms.videosPerWeek} لكل واحد)</p>
          {agents.filter((a) => a.isActive !== false).map((a) => {
            const n = week.filter((s) => s.agentId === a.id).length;
            const done = week.filter((s) => s.agentId === a.id && s.publishedAt).length;
            return (
              <div key={a.id} className="flex justify-between items-center border-t border-[#F0ECE4] pt-2 text-sm">
                <span className="font-bold">{a.name}</span>
                <span className="flex gap-2">
                  <Chip tone={n >= forms.videosPerWeek ? 'green' : n ? 'gold' : 'red'}>{n} / {forms.videosPerWeek}</Chip>
                  <Chip tone="grey">{done} اتنشر</Chip>
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </PortalShell>
  );
};
