import React, { useMemo, useState } from 'react';
import { Loader2, Settings2, Shuffle, ExternalLink, X } from 'lucide-react';
import type {
  Lead, Property, SalesAgent, ViewingRequest, WorkProof, SalesTargets, AgentUnitAssignment,
} from '../../types';
import { DEFAULT_SALES_TARGETS } from '../../types';
import {
  buildScorecard, distributeUnits, saveAssignmentsBatch, saveTargets, signedUnitIds, cairoDay,
  detailsFor, DetailRow, diagnosePermissions, PermReport,
} from '../../services/dailyTasksService';
import { thumbUrl } from '../../services/mediaStorage';

/* ============================================================
   متابعة المهام — شاشة الإدارة
   ============================================================
   الستة مع بعض في جدول واحد، والأرقام هي نفس أرقام شاشة
   المندوب بالظبط (نفس الدالة بتحسبهم) — عشان ما يحصلش إن
   المندوب شايف رقم وأنت شايف رقم تاني.                     */

const Cell: React.FC<{ done: number; target: number; onClick?: () => void }> = ({ done, target, onClick }) => {
  const full = done >= target;
  const near = !full && target > 0 && done / target >= 0.7;
  return (
    <td className="px-2 py-2 text-center">
      <button
        type="button" onClick={onClick} disabled={!onClick || done === 0}
        className={`font-mono font-black text-xs px-2 py-1 rounded-lg inline-block transition-transform ${
          full ? 'bg-[#EEF5F0] text-[#1E7A45]'
          : near ? 'bg-[#FBF1E4] text-[#A07A26]'
          : 'bg-[#FBEDEA] text-[#C2412D]'
        } ${onClick && done > 0 ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
      >
        {done}<span className="opacity-40">/{target}</span>
      </button>
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
  onResetXp?: () => Promise<void>;
}> = ({
  agents, leads, requests, properties, proofs, assignments,
  targets, onTargetsSaved, onAssignmentsSaved, onResetXp,
}) => {
  const t = targets || DEFAULT_SALES_TARGETS;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SalesTargets>(t);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openProofs, setOpenProofs] = useState<string | null>(null);
  /* الرقم اللي الإدارة دوست عليه — بنوريها الشغل اللي وراه */
  const [drill, setDrill] = useState<null | { agentName: string; label: string; rows: DetailRow[] }>(null);
  const [perm, setPerm] = useState<PermReport | null>(null);
  /* مين ياخد شقق الدورة. مش كل حساب في النظام مندوب شغّال
     على الشقق — فيه حسابات إدارية وقديمة. الاختيار بإيدك. */
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

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
    setBusy('targets'); setMsg(''); setErr('');
    try { await saveTargets(form); onTargetsSaved?.(form); setEditing(false); setMsg('الأهداف اتحفظت'); }
    catch (e: any) { setErr(e?.message || 'الحفظ ما نجحش'); }
    finally { setBusy(''); }
  };

  const redistribute = async () => {
    /* بنوزّع على اللي أنت اخترتهم بس. لو مفيش اختيار، بنفتح
       شاشة الاختيار بدل ما نوزّع على الكل من غير ما تقصد. */
    const targetsList = active.filter((a) => chosen.includes(a.id));
    if (!targetsList.length) { setPicking(true); return; }

    /* كود فيه شرطة مايلة بيعمل مسار جوّه مسار في فايرستور،
       والمسار ده مالوش قاعدة — فالكتابة بتترفض برسالة صلاحيات
       مضلّلة. بنستبعدهم ونقول عليهم بالاسم. */
    const bad = targetsList.filter((a) => !a.id || a.id.includes('/'));
    const good = targetsList.filter((a) => a.id && !a.id.includes('/'));
    if (!good.length) {
      setErr(`كل الحسابات المختارة أكوادها مش صالحة: ${bad.map((b) => b.name).join('، ')}`);
      return;
    }

    const ok = window.confirm(
      `هيتوزّع ${t.unitsPerAgent} شقة على ${good.length} مندوب:\n`
      + `${good.map((a) => a.name).join('، ')}\n\n`
      + `التوزيع القديم بتاعهم هيتبدّل، والنظام هيتجنّب يدّي أي مندوب نفس شققه السابقة.\n\nتمام؟`,
    );
    if (!ok) return;
    setBusy('dist'); setMsg(''); setErr('');
    try {
      const prev: Record<string, string[]> = {};
      assignments.forEach((a) => { prev[a.agentId] = a.propertyIds || []; });
      const res = distributeUnits({
        properties, agentIds: good.map((a) => a.id),
        perAgent: t.unitsPerAgent, previous: prev,
      });
      const map = res.map;
      const start = Date.now();
      const end = start + t.cycleDays * 86400000;
      await saveAssignmentsBatch(good.map((a) => ({
        id: a.id, agentId: a.id, agentName: a.name,
        propertyIds: map[a.id] || [], cycleStart: start, cycleEnd: end,
        previousPropertyIds: prev[a.id] || [],
      })));
      onAssignmentsSaved?.();
      setPicking(false);
      setMsg(
        `اتوزّعت على ${good.length} مندوب · ${res.priority.size} شقة تحت المتوسط `
        + `اتكررت بينهم (متوسط التفاعل ${Math.round(res.average)})`
        + (bad.length ? ` · اتستبعد ${bad.length} حساب كوده مش صالح` : ''),
      );
    } catch (e: any) { setErr(e?.message || 'التوزيع ما نجحش'); }
    finally { setBusy(''); }
  };

  /* النقط القديمة كانت بتتزوّد بالإيد، فمالهاش معنى دلوقتي.
     بنصفّرها مرة واحدة ونبدأ من جديد — النقط الجديدة بتتحسب
     من الشغل الحقيقي ومش بتتخزّن أصلاً. */
  const resetXp = async () => {
    const ok = window.confirm(
      'هتتمسح نقط الـ XP القديمة والمهام القديمة لكل المناديب، وده مش بيترجع.\n\n'
      + 'النقط الجديدة بتتحسب من الشغل الحقيقي، فمش هتضيع حاجة اتعملت فعلاً.\n\nتمام؟',
    );
    if (!ok || !onResetXp) return;
    setBusy('xp'); setMsg(''); setErr('');
    try { await onResetXp(); setMsg('النقط القديمة اتصفّرت — البداية من جديد'); }
    catch (e: any) { setErr(e?.message || 'التصفير ما نجحش'); }
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
          <button type="button" onClick={() => setPicking(true)} disabled={busy === 'dist'}
            className="rounded-xl px-3 py-2 bg-[#141414] text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
            {busy === 'dist' ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
            وزّع الشقق
          </button>
          {onResetXp && (
            <button type="button" onClick={resetXp} disabled={busy === 'xp'}
              className="rounded-xl px-3 py-2 bg-white border border-[#E8C4BC] text-[#C2412D] font-bold text-xs disabled:opacity-50">
              {busy === 'xp' ? 'بيصفّر…' : 'صفّر النقط القديمة'}
            </button>
          )}
        </div>
      </div>

      {msg && <p className="text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-xl px-3 py-2">{msg}</p>}
      {err && (
        <div className="bg-[#FBEDEA] border border-[#E8C4BC] rounded-xl px-3 py-3 space-y-1">
          <p className="text-xs font-black text-[#C2412D]">✗ ما نجحش: {err}</p>
          {/permission|insufficient/i.test(err) && (
            <>
              <p className="text-[11px] text-[#C2412D] leading-relaxed">
                فايربيز رافض الكتابة، بس الرسالة دي مبتقولش فشل فين بالظبط.
                دوس على الفحص عشان نعرف.
              </p>
              <button
                type="button" disabled={busy === 'perm'}
                onClick={async () => {
                  setBusy('perm'); setPerm(null);
                  try { setPerm(await diagnosePermissions()); }
                  finally { setBusy(''); }
                }}
                className="rounded-xl px-3 py-2 bg-[#141414] text-white font-bold text-xs disabled:opacity-50"
              >
                {busy === 'perm' ? 'بيفحص…' : 'افحص الصلاحيات'}
              </button>
            </>
          )}
        </div>
      )}

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
              ['xpCall', 'نقط المكالمة'],
              ['xpRequest', 'نقط الريكويست'],
              ['xpAd', 'نقط الإعلان'],
              ['xpVideo', 'نقط الفيديو'],
              ['xpVisit', 'نقط المعاينة'],
              ['xpBonusListing', 'نقط الوحدة الجديدة (بونص)'],
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
                  {card.rows.map((r) => (
                    <Cell
                      key={r.key} done={r.done} target={r.target}
                      onClick={() => setDrill({
                        agentName: agent.name, label: r.label,
                        rows: detailsFor({
                          key: r.key, agentId: agent.id,
                          leads, requests, proofs,
                        }),
                      })}
                    />
                  ))}
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

      {picking && (
        <div className="bg-white rounded-2xl p-4 border border-[#E8D3A6] space-y-3" dir="rtl">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-black text-sm text-stone-900">مين ياخد شقق الدورة؟</p>
              <p className="text-[11px] text-stone-400 font-medium">
                عندك {active.length} حساب نشط — علّم على اللي شغّالين على الشقق بس
              </p>
            </div>
            <button type="button" onClick={() => setPicking(false)} className="p-1.5 rounded-full hover:bg-stone-100">
              <X size={16} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {active.map((a) => {
              const on = chosen.includes(a.id);
              const badId = !a.id || a.id.includes('/');
              return (
                <label
                  key={a.id}
                  className={`flex items-center gap-2.5 rounded-2xl p-3 border cursor-pointer ${
                    on ? 'bg-[#FBF1E4] border-[#E8D3A6]' : 'bg-[#FBF8F1] border-[#ECE8DF]'
                  } ${badId ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox" checked={on} disabled={badId}
                    onChange={(e) => setChosen((prev) =>
                      e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id))}
                    className="w-4 h-4 shrink-0 accent-[#A07A26]"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-stone-900 truncate">{a.name}</span>
                    <span className="block text-[10px] text-stone-400 font-mono truncate" dir="ltr">
                      {badId ? 'كود مش صالح' : a.id}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#ECE8DF]">
            <p className="text-[11px] font-bold text-stone-500">
              {chosen.length === 0 ? 'لسه ما اخترتش حد'
                : `${chosen.length} مندوب · ${chosen.length * t.unitsPerAgent} خانة على ${properties.length} شقة`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChosen([])}
                className="rounded-xl px-3 py-2 bg-white border border-[#E4DFD4] font-bold text-xs">
                امسح الاختيار
              </button>
              <button
                type="button" disabled={!chosen.length || busy === 'dist'} onClick={redistribute}
                className="rounded-xl px-4 py-2 bg-[#141414] text-white font-bold text-xs disabled:opacity-40"
              >
                {busy === 'dist' ? 'بيوزّع…' : 'وزّع عليهم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {perm && (
        <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] space-y-3 text-xs" dir="rtl">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-stone-900">نتيجة الفحص</p>
            <button type="button" onClick={() => setPerm(null)} className="p-1 rounded-full hover:bg-stone-100">
              <X size={14} />
            </button>
          </div>

          <div className="bg-[#FBF8F1] rounded-xl p-3 space-y-1 font-medium text-stone-700">
            <p>الإيميل: <b dir="ltr">{perm.email}</b></p>
            <p>طريقة الدخول: <b dir="ltr">{perm.provider}</b>
              {perm.provider !== 'password' && (
                <span className="text-[#C2412D] font-black"> ← لازم تكون password</span>
              )}
            </p>
            <p>حسابك في staff_access: <b>{perm.staffDocFound ? 'موجود' : 'مش موجود'}</b>
              {!perm.staffDocFound && (
                <span className="text-[#C2412D] font-black"> ← دي المشكلة</span>
              )}
            </p>
            <p>الدور المسجّل: <b>{perm.role || '(فاضي)'}</b>
              {perm.staffDocFound && perm.role !== 'admin' && (
                <span className="text-[#C2412D] font-black"> ← لازم admin</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            {perm.checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-2 bg-[#FBF8F1] rounded-xl px-3 py-2">
                <span className="font-bold text-stone-700">{c.label}</span>
                <span className={`font-black shrink-0 ${c.ok ? 'text-[#1E7A45]' : 'text-[#C2412D]'}`}>
                  {c.ok ? '✓ تمام' : `✗ ${c.error}`}
                </span>
              </div>
            ))}
          </div>

          {perm.provider === 'password' && perm.role === 'admin'
            && perm.checks.some((c) => !c.ok) && (
            <p className="text-[11px] text-[#C2412D] font-bold leading-relaxed bg-[#FBEDEA] rounded-xl p-3">
              حسابك أدمن سليم، ومع ذلك فيه مرفوض فوق — يعني القواعد المنزّلة على
              فايربيز قديمة. شغّل <b dir="ltr">firebase deploy --only firestore:rules</b>
              {' '}من نفس فولدر المشروع، واتأكد إن الأمر خلّص بـ<b dir="ltr">Deploy complete</b>
              {' '}من غير أخطاء.
            </p>
          )}
        </div>
      )}

      {drill && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-[#FBF8F1] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF]">
              <div className="min-w-0">
                <p className="font-black text-stone-900 truncate">{drill.label} · {drill.agentName}</p>
                <p className="text-xs text-stone-400 font-medium">{drill.rows.length} سطر</p>
              </div>
              <button type="button" onClick={() => setDrill(null)} className="p-2 rounded-full hover:bg-stone-100 shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {drill.rows.length === 0 ? (
                <p className="text-xs text-stone-400 font-medium text-center py-8">مفيش حاجة اتسجّلت</p>
              ) : drill.rows.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-3 border border-[#ECE8DF] flex items-center gap-3">
                  {r.imageUrl && (
                    <a href={r.linkUrl || r.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <img loading="lazy" src={thumbUrl(r.imageUrl, 120)} alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-[#ECE8DF]" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-stone-900 truncate">{r.title}</p>
                    {r.sub && <p className="text-[11px] text-stone-400 font-medium truncate">{r.sub}</p>}
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 shrink-0">
                    {new Date(r.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
