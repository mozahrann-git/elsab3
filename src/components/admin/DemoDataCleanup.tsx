import React, { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Eraser, Users, UserCheck, BarChart3 } from 'lucide-react';
import { SalesAgent, Lead, Property } from '../../types';

/*
  تنضيف البيانات التجريبية.

  الحسابات اللي جاية مع النظام (أحمد زهران، سارة حنفي...) إيميلاتها على
  lion-estates.com، ودي مش إيميلات حقيقية. والليدات التجريبية مربوطة بيهم.

  القراءات: عدّادات المشاهدات والواتساب على الشقق اتجمعت وهي بتتصفّر وبتترجع،
  فأرقامها مش معبّرة عن حاجة. تصفيرها بيخلّي اللي جاي بس هو الحقيقي.
*/

/** الإيميلات دي جاية مع النظام، مش حسابات ناس حقيقية */
const DEMO_DOMAINS = ['lion-estates.com', 'example.com', 'test.com'];

const isDemoEmail = (email?: string) =>
  DEMO_DOMAINS.some((d) => (email || '').toLowerCase().includes(d));

interface Props {
  agents: SalesAgent[];
  leads: Lead[];
  properties: Property[];
  currentAgentId?: string;
  onDeleteAgents: (ids: string[]) => Promise<void>;
  onDeleteLeads: (ids: string[]) => Promise<void>;
  onResetClicks: () => Promise<void>;
  showToast: (m: string) => void;
}

export const DemoDataCleanup: React.FC<Props> = ({
  agents, leads, properties, currentAgentId,
  onDeleteAgents, onDeleteLeads, onResetClicks, showToast,
}) => {
  const [busy, setBusy] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const demoAgents = useMemo(() => agents.filter((a) => isDemoEmail(a.email)), [agents]);
  const realAgents = useMemo(() => agents.filter((a) => !isDemoEmail(a.email)), [agents]);

  /* ليدات مربوطة بحساب تجريبي */
  const demoAgentIds = useMemo(() => new Set(demoAgents.map((a) => a.id)), [demoAgents]);
  const demoLeads = useMemo(
    () => leads.filter((l) => demoAgentIds.has(l.assignedAgentId || '')),
    [leads, demoAgentIds],
  );

  const clicksTotal = useMemo(
    () => properties.reduce((sum, p) => sum + (p.clicks?.views || 0) + (p.clicks?.whatsapp || 0) + (p.clicks?.call || 0) + (p.clicks?.favorites || 0), 0),
    [properties],
  );

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const run = async (label: string, fn: () => Promise<void>, done: string) => {
    setBusy(label);
    try {
      await fn();
      showToast(done);
    } catch (e: any) {
      showToast(`ما نفعش — ${e?.message || 'جرّب تاني'}`);
    } finally {
      setBusy('');
    }
  };

  const deleteSelected = async () => {
    if (!picked.length) return;
    const names = agents.filter((a) => picked.includes(a.id)).map((a) => a.name).join('، ');
    const theirLeads = leads.filter((l) => picked.includes(l.assignedAgentId || ''));
    const msg = theirLeads.length
      ? `هتمسح ${picked.length} حساب (${names}) ومعاهم ${theirLeads.length} عميل مربوط بيهم. متأكد؟`
      : `هتمسح ${picked.length} حساب: ${names}. متأكد؟`;
    if (!window.confirm(msg)) return;

    await run('بيمسح...', async () => {
      if (theirLeads.length) await onDeleteLeads(theirLeads.map((l) => l.id));
      await onDeleteAgents(picked);
      setPicked([]);
    }, 'اتمسحوا');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5">
        <Eraser size={18} className="text-[#A07A26] shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-[#141414]">تنضيف البيانات التجريبية</p>
          <p className="text-[11px] text-[#6B665C] leading-relaxed max-w-2xl">
            الحسابات اللي جات مع النظام وإيميلاتها على lion-estates.com مش حسابات ناس حقيقية.
            امسحها عشان الأرقام تبقى معبّرة عن شغلك الفعلي.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat n={demoAgents.length} label="حساب تجريبي" bad={demoAgents.length > 0} Icon={Users} />
        <Stat n={realAgents.length} label="حساب حقيقي" bad={false} Icon={UserCheck} />
        <Stat n={clicksTotal} label="قراءة متجمّعة" bad={false} Icon={BarChart3} />
      </div>

      {/* الحسابات */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-[#141414]">اختار اللي عايز تمسحه</p>
          {demoAgents.length > 0 && (
            <button
              onClick={() => setPicked(demoAgents.map((a) => a.id))}
              className="text-[11px] font-bold text-[#A07A26] cursor-pointer"
            >
              اختار كل التجريبي ({demoAgents.length})
            </button>
          )}
        </div>

        <div className="bg-white border border-[#ECE8DF] rounded-2xl divide-y divide-[#F2EFE9]">
          {agents.map((a) => {
            const demo = isDemoEmail(a.email);
            const me = a.id === currentAgentId;
            const theirs = leads.filter((l) => l.assignedAgentId === a.id).length;
            return (
              <label key={a.id} className={`flex items-center gap-3 px-4 py-3 ${me ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={me}
                  checked={picked.includes(a.id)}
                  onChange={() => toggle(a.id)}
                  className="accent-[#C2412D] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#141414]">{a.name}</span>
                    {demo ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF2F0] text-[#9E2A1B] border border-[#E8C2BA]">تجريبي</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF5F0] text-[#1E7A45] border border-[#BFE0CC]">حقيقي</span>
                    )}
                    {me && <span className="text-[10px] font-bold text-[#6B665C]">إنت</span>}
                  </div>
                  <p className="text-[11px] text-[#6B665C] font-mono truncate" dir="ltr">{a.email || '—'}</p>
                  {theirs > 0 && <p className="text-[11px] text-[#A07A26]">{theirs} عميل مربوط بيه</p>}
                </div>
              </label>
            );
          })}
        </div>

        <button
          onClick={deleteSelected}
          disabled={!picked.length || !!busy}
          className="w-full py-3 rounded-xl bg-[#9E2A1B] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <Trash2 size={15} />
          {busy || (picked.length ? `امسح ${picked.length} حساب وعملاءهم` : 'اختار حسابات الأول')}
        </button>
      </div>

      {/* الليدات التجريبية */}
      {demoLeads.length > 0 && (
        <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
          <p className="font-bold text-sm text-[#141414]">عملاء تجريبيين ({demoLeads.length})</p>
          <p className="text-[11px] text-[#6B665C] leading-relaxed">
            دول مربوطين بالحسابات التجريبية. بيتمسحوا لوحدهم مع الحساب، أو امسحهم هنا من غير ما تمسح الحسابات.
          </p>
          <button
            onClick={() => {
              if (!window.confirm(`هتمسح ${demoLeads.length} عميل تجريبي. متأكد؟`)) return;
              run('بيمسح العملاء...', () => onDeleteLeads(demoLeads.map((l) => l.id)), 'اتمسحوا');
            }}
            disabled={!!busy}
            className="w-full py-2.5 rounded-xl border border-[#E8C2BA] text-[#9E2A1B] font-bold text-xs disabled:opacity-40 cursor-pointer"
          >
            امسح العملاء التجريبيين بس
          </button>
        </div>
      )}

      {/* القراءات */}
      <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-[#C99700] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-[#141414]">تصفير قراءات الشقق</p>
            <p className="text-[11px] text-[#6B665C] leading-relaxed">
              عدّادات المشاهدات والواتساب والاتصال على كل الشقق. الأرقام القديمة اتجمعت
              وهي بتتصفّر وبترجع، فمش معبّرة عن حاجة. لما تصفّرها، اللي هيتجمع بعد كده بس هو الحقيقي.
              <b className="text-[#141414]"> ده مبيمسحش أي شقة ولا أي عميل.</b>
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!window.confirm('هتصفّر عدّادات كل الشقق. الشقق نفسها مش هتتمس. متأكد؟')) return;
            run('بيصفّر...', onResetClicks, 'القراءات اتصفّرت');
          }}
          disabled={!!busy || clicksTotal === 0}
          className="w-full py-2.5 rounded-xl border border-[#DCD6CA] text-[#141414] font-bold text-xs disabled:opacity-40 cursor-pointer"
        >
          {clicksTotal === 0 ? 'القراءات صفر بالفعل' : `صفّر ${clicksTotal.toLocaleString('en-US')} قراءة`}
        </button>
      </div>

      {demoAgents.length === 0 && demoLeads.length === 0 && (
        <p className="bg-[#EEF5F0] border border-[#BFE0CC] rounded-2xl px-4 py-3 text-xs text-[#1E7A45] font-bold flex items-center gap-2">
          <CheckCircle2 size={15} /> مفيش بيانات تجريبية متبقية.
        </p>
      )}
    </div>
  );
};

const Stat: React.FC<{ n: number; label: string; bad: boolean; Icon: typeof Users }> = ({ n, label, bad, Icon }) => (
  <div className="bg-white border border-[#ECE8DF] rounded-xl py-3 px-2">
    <Icon size={14} className="mx-auto text-[#8C877D]" />
    <p className="text-xl font-extrabold font-mono mt-1" style={{ color: bad ? '#9E2A1B' : '#141414' }}>
      {n.toLocaleString('en-US')}
    </p>
    <p className="text-[10px] text-[#6B665C] leading-tight">{label}</p>
  </div>
);

export default DemoDataCleanup;
