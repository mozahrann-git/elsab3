import React, { useMemo, useState } from 'react';
import { Loader2, Settings2, Shuffle, ExternalLink } from 'lucide-react';
import type {
  Lead, Property, SalesAgent, ViewingRequest, WorkProof, SalesTargets, AgentUnitAssignment,
} from '../../types';
import { DEFAULT_SALES_TARGETS } from '../../types';
import {
  buildScorecard, distributeUnits, saveAssignment, saveTargets, signedUnitIds, cairoDay,
} from '../../services/dailyTasksService';
import { thumbUrl } from '../../services/mediaStorage';

/* ============================================================
   متابعة المهام — شاشة الإدارة
   ============================================================
   الستة مع بعض في جدول واحد، والأرقام هي نفس أرقام شاشة
   المندوب بالظبط (نفس الدالة بتحسبهم) — عشان ما يحصلش إن
   المندوب شايف رقم وأنت شايف رقم تاني.                     */

const Cell: React.FC<{ done: number; target: number }> = ({ done, target }) => {
  const full = done >= target;
  const near = !full && target > 0 && done / target >= 0.7;
  return (
    <td className="px-2 py-2 text-center">
      <span className={`font-mono font-black text-xs px-2 py-1 rounded-lg inline-block ${
        full ? 'bg-[#EEF5F0] text-[#1E7A45]'
        : near ? 'bg-[#FBF1E4] text-[#A07A26]'
        : 'bg-[#FBEDEA] text-[#C2412D]'
      }`}>
        {done}<span className="opacity-40">/{target}</span>
      </span>
    </td>
  );
};

export const TasksOverview: React.FC<{
  agents: SalesAgent[];
  leads: Lead[];
  requests: ViewingRequest[];
  properties: Property[];
  proofs: WorkProof[];
  assignments: AgentUnitAssignment[];
  targets?: SalesTargets;
  onTargetsSaved?: (t: SalesTargets) => void;
  onAssignmentsSaved?: () => void;
}> = ({
  agents, leads, requests, properties, proofs, assignments,
  targets, onTargetsSaved, onAssignmentsSaved,
}) => {
  const t = targets || DEFAULT_SALES_TARGETS;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SalesTargets>(t);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [openProofs, setOpenProofs] = useState<string | null>(null);

  const active = useMemo(
    () => agents.filter((a) => a.isActive !== false),
    [agents],
  );

  const cards = useMemo(
    () => active.map((a) => ({
      agent: a,
      card: buildScorecard({ agentId: a.id, leads, requests, proofs, targets: t }),
      units: assignments.find((x) => x.agentId === a.id),
    })),
    [active, leads, requests, proofs, t, assignments],
  );

  const saveT = async () => {
    setBusy('targets'); setMsg('');
    try { await saveTargets(form); onTargetsSaved?.(form); setEditing(false); setMsg('الأهداف اتحفظت'); }
    catch (e: any) { setMsg(e?.message || 'الحفظ ما نجحش'); }
    finally { setBusy(''); }
  };

  const redistribute = async () => {
    if (!active.length) { setMsg('مفيش مناديب نشطين'); return; }
    const ok = window.confirm(
      `هيتوزّع ${t.unitsPerAgent} شقة على ${active.length} مندوب.\n`
      + `التوزيع القديم هيتبدّل، والنظام هيتجنّب يدّي أي مندوب نفس شققه السابقة.\n\nتمام؟`,
    );
    if (!ok) return;
    setBusy('dist'); setMsg('');
    try {
      const prev: Record<string, string[]> = {};
      assignments.forEach((a) => { prev[a.agentId] = a.propertyIds || []; });
      const res = distributeUnits({
        properties, agentIds: active.map((a) => a.id),
        perAgent: t.unitsPerAgent, previous: prev,
      });
      const map = res.map;
      const start = Date.now();
      const end = start + t.cycleDays * 86400000;
      for (const a of active) {
        await saveAssignment({
          id: a.id, agentId: a.id, agentName: a.name,
          propertyIds: map[a.id] || [], cycleStart: start, cycleEnd: end,
          previousPropertyIds: prev[a.id] || [],
        });
      }
      onAssignmentsSaved?.();
      setMsg(
        `اتوزّعت على ${active.length} مندوب · ${res.priority.size} شقة تحت المتوسط `
        + `اتكررت بينهم (متوسط التفاعل ${Math.round(res.average)})`,
      );
    } catch (e: any) { setMsg(e?.message || 'التوزيع ما نجحش'); }
    finally { setBusy(''); }
  };

  const keys = cards[0]?.card.rows.map((r) => ({ key: r.key, label: r.label })) || [];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-black text-stone-900">متابعة المهام</h3>
          <p className="text-xs text-stone-400 font-medium">
            {cairoDay()} · {active.length} مندوب نشط
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => { setForm(t); setEditing((v) => !v); }}
            className="rounded-xl px-3 py-2 bg-white border border-[#E4DFD4] font-bold text-xs flex items-center gap-1.5">
            <Settings2 size={14} /> الأهداف
          </button>
          <button type="button" onClick={redistribute} disabled={busy === 'dist'}
            className="rounded-xl px-3 py-2 bg-[#141414] text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
            {busy === 'dist' ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
            وزّع الشقق
          </button>
        </div>
      </div>

      {msg && <p className="text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-xl px-3 py-2">{msg}</p>}

      {editing && (
        <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] space-y-3">
          <p className="text-xs font-bold text-stone-500">
            غيّر أي رقم هنا وهو بيسري على الكل فوراً — من غير ما تحتاج حد يعدّل الكود
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ['callsDaily', 'مكالمات يومي'],
              ['requestsDaily', 'ريكويستات يومي'],
              ['requestsPotential', 'منهم مهتم جداً'],
              ['adsResaleDaily', 'إعلانات ريسيل يومي'],
              ['adsOffplanDaily', 'إعلانات تحت الإنشاء يومي'],
              ['visitsWeekly', 'معاينات أسبوعي'],
              ['videosWeekly', 'فيديو أسبوعي'],
              ['unitsPerAgent', 'شقق لكل مندوب'],
              ['cycleDays', 'أيام الدورة'],
              ['workDaysPerWeek', 'أيام الشغل في الأسبوع'],
              ['weeksPerMonth', 'أسابيع الشهر'],
            ] as [keyof SalesTargets, string][]).map(([k, label]) => (
              <label key={String(k)} className="block">
                <span className="text-[11px] font-bold text-stone-500 block mb-1">{label}</span>
                <input
                  type="number" min={0} value={form[k]}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-[#E4DFD4] px-3 py-2 text-sm font-mono font-bold"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveT} disabled={busy === 'targets'}
              className="rounded-xl px-4 py-2.5 bg-[#141414] text-white font-bold text-xs disabled:opacity-50">
              {busy === 'targets' ? 'بيحفظ…' : 'احفظ الأهداف'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-xl px-4 py-2.5 bg-white border border-[#E4DFD4] font-bold text-xs">إلغاء</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#ECE8DF] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#ECE8DF]">
              <th className="px-3 py-3 text-right text-xs font-black text-stone-500">المندوب</th>
              {keys.map((k) => (
                <th key={k.key} className="px-2 py-3 text-center text-xs font-black text-stone-500 whitespace-nowrap">
                  {k.label}
                </th>
              ))}
              <th className="px-2 py-3 text-center text-xs font-black text-stone-500">شقق الدورة</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(({ agent, card, units }) => {
              const signed = signedUnitIds(proofs, agent.id, units?.cycleStart || 0);
              const total = units?.propertyIds?.length || 0;
              return (
                <tr key={agent.id} className="border-b border-[#F4F1EA] last:border-0">
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setOpenProofs(openProofs === agent.id ? null : agent.id)}
                      className="font-black text-xs text-stone-900 hover:text-[#A07A26] flex items-center gap-1">
                      {agent.name}
                      <ExternalLink size={11} className="opacity-40" />
                    </button>
                  </td>
                  {card.rows.map((r) => <Cell key={r.key} done={r.done} target={r.target} />)}
                  <td className="px-2 py-2 text-center">
                    <span className="font-mono font-black text-xs text-stone-600">
                      {signed.size}<span className="opacity-40">/{total}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openProofs && (
        <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] space-y-3">
          <p className="font-black text-sm text-stone-900">
            إثباتات {active.find((a) => a.id === openProofs)?.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {proofs.filter((p) => p.agentId === openProofs).slice(0, 60).map((p) => (
              <a key={p.id} href={p.proofUrl} target="_blank" rel="noreferrer"
                title={`${p.propertyCode || p.kind} · ${p.day}`}
                className="w-20 h-20 rounded-xl overflow-hidden border border-[#ECE8DF] block">
                <img loading="lazy" src={thumbUrl(p.proofUrl, 160)} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
            {proofs.filter((p) => p.agentId === openProofs).length === 0 && (
              <p className="text-xs text-stone-400 font-medium">لسه مرفعش أي إثبات</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksOverview;
