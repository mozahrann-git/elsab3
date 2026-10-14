import React, { useMemo, useState } from 'react';
import { BellRing, Check, Loader2, Plus, Search, X } from 'lucide-react';
import type { ClientRequest, Lead, Property, RequestKind } from '../../types';
import {
  matchAllRequests, installmentHint, estimatePlan, affordableFromPlan,
  existingMatches, saveClientRequest, markRequestSeen, closeClientRequest,
  requestFromLead, RequestMatch,
} from '../../services/clientRequests';
import { thumbUrl } from '../../services/mediaStorage';
import { formatPrice } from '../../utils/helpers';

/* ============================================================
   طلبات العملاء
   ============================================================
   العميل اللي طلبه مش موجود النهاردة مبيضيعش. طلبه بيتسجّل،
   وأول ما شقة قريبة تتضاف بتبان هنا للسيلز بتاعه.

   المطابقة بتتحسب من الشقق والطلبات اللي الصفحة جايباهم
   أصلاً — مفيش كتابة ولا وظيفة على السيرفر تفشل في صمت.   */

const num = (v: string) => Number(String(v).replace(/[^\d]/g, '')) || 0;

/* ---------- فورم تسجيل طلب ---------- */
const RequestForm: React.FC<{
  lead: Lead;
  agentName: string;
  properties: Property[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ lead, agentName, properties, onClose, onSaved }) => {
  const hint = useMemo(() => installmentHint(properties), [properties]);
  const [kind, setKind] = useState<RequestKind>('cash');
  const [down, setDown] = useState('');
  const [monthly, setMonthly] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const draft = useMemo(
    () => requestFromLead(lead, agentName, kind, {
      downPayment: num(down), monthly: num(monthly), note: note.trim(),
    }),
    [lead, agentName, kind, down, monthly, note],
  );

  /* الميزانية المتوقّعة من المقدم والقسط — بأرقام الشقق الحقيقية */
  const afford = kind === 'installment'
    ? affordableFromPlan(num(down), num(monthly), hint)
    : 0;

  /* لو فيه شقق موجودة دلوقتي تناسبه، مفيش داعي نسجّل طلب */
  const already = useMemo(() => existingMatches(draft, properties).slice(0, 4), [draft, properties]);

  const save = async () => {
    setBusy(true); setErr('');
    try { await saveClientRequest(draft); onSaved(); onClose(); }
    catch (e: any) { setErr(e?.code || e?.message || 'الحفظ ما نجحش'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[125] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-[#FBF8F1] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#FBF8F1] px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF] z-10">
          <div className="min-w-0">
            <p className="font-black text-stone-900 truncate">سجّل طلب {lead.name}</p>
            <p className="text-xs text-stone-400 font-medium">
              أول ما شقة قريبة تتضاف هتبان لك هنا
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-stone-500 mb-1.5">طريقة الدفع</p>
            <div className="grid grid-cols-2 gap-2">
              {([['cash', 'كاش'], ['installment', 'تقسيط']] as [RequestKind, string][]).map(([k, l]) => (
                <button
                  key={k} type="button" onClick={() => setKind(k)}
                  className={`rounded-2xl py-3 font-black text-sm ${
                    kind === k ? 'bg-[#141414] text-white' : 'bg-white border border-[#E4DFD4] text-stone-600'
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          {kind === 'cash' ? (
            <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF]">
              <p className="text-xs font-bold text-stone-500">ميزانيته من ملفه</p>
              <p className="text-sm font-black text-stone-900 mt-1">
                {lead.budgetMin ? `${formatPrice(lead.budgetMin)} — ` : 'لحد '}
                {lead.budgetMax ? formatPrice(lead.budgetMax) : '؟'} ج.م
              </p>
              {!lead.budgetMax && (
                <p className="text-[11px] text-[#C2412D] font-bold mt-1">
                  مفيش ميزانية في ملفه — املاها من مكالمة الاكتشاف الأول
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">المقدم اللي معاه</span>
                  <input
                    inputMode="numeric" value={down} onChange={(e) => setDown(e.target.value)}
                    placeholder="600000"
                    className="w-full rounded-2xl border border-[#E4DFD4] px-3 py-2.5 text-sm font-mono font-bold"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">القسط الشهري</span>
                  <input
                    inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)}
                    placeholder="40000"
                    className="w-full rounded-2xl border border-[#E4DFD4] px-3 py-2.5 text-sm font-mono font-bold"
                  />
                </label>
              </div>

              <div className="bg-[#FBF1E4] border border-[#E8D3A6] rounded-2xl p-3 space-y-1">
                <p className="text-[11px] font-bold text-[#A07A26]">
                  من شقق التقسيط الموجودة عندنا: المقدم عادةً {hint.downPercent}٪ والتقسيط {hint.years} سنين
                  {hint.sample > 0 ? ` (من ${hint.sample} شقة)` : ''}
                </p>
                {afford > 0 && (
                  <p className="text-sm font-black text-[#141414]">
                    يقدر على شقة لحد {formatPrice(afford)} ج.م
                  </p>
                )}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold text-stone-500 block mb-1">ملاحظة (اختياري)</span>
            <input
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: لازم دور عالي، أو مستعجل"
              className="w-full rounded-2xl border border-[#E4DFD4] px-3 py-2.5 text-sm"
            />
          </label>

          {already.length > 0 && (
            <div className="bg-[#EEF5F0] border border-[#BFE0CC] rounded-2xl p-3 space-y-2">
              <p className="text-xs font-black text-[#1E7A45]">
                استنى — فيه {already.length} شقة موجودة دلوقتي تناسبه:
              </p>
              {already.map((m) => (
                <p key={m.property.id} className="text-[11px] font-bold text-stone-700">
                  • {m.property.code} · {formatPrice(m.property.price)} ج.م · {m.property.area} م²
                </p>
              ))}
              <p className="text-[11px] text-[#1E7A45] font-medium">
                اعرضهم عليه الأول. سجّل الطلب لو مناسبوهوش.
              </p>
            </div>
          )}

          {err && <p className="text-xs font-black text-[#C2412D] bg-[#FBEDEA] rounded-xl p-3">✗ {err}</p>}

          <button
            type="button" onClick={save} disabled={busy}
            className="w-full rounded-2xl py-3.5 bg-[#141414] text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {busy ? 'بيسجّل…' : 'سجّل الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- الشاشة ---------- */
export const ClientRequestsPanel: React.FC<{
  requests: ClientRequest[];
  properties: Property[];
  leads: Lead[];
  agentId?: string;
  agentName: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
  onOpenProperty?: (p: Property) => void;
}> = ({ requests, properties, leads, agentId, agentName, isAdmin, onRefresh, onOpenProperty }) => {
  const [formFor, setFormFor] = useState<Lead | null>(null);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const rows = useMemo(
    () => matchAllRequests(requests, properties, isAdmin ? undefined : agentId),
    [requests, properties, agentId, isAdmin],
  );

  const totalNew = rows.reduce((n, r) => n + r.matches.length, 0);

  const myLeads = useMemo(() => {
    const open = new Set(requests.filter((r) => r.status === 'open').map((r) => r.leadId));
    const mine = leads.filter((l) => (isAdmin || l.assignedAgentId === agentId) && !open.has(l.id));
    const s = q.trim().toLowerCase();
    return (s
      ? mine.filter((l) => (l.name || '').toLowerCase().includes(s) || (l.phone || '').includes(s))
      : mine
    ).slice(0, 40);
  }, [leads, requests, agentId, isAdmin, q]);

  const seen = async (r: ClientRequest, ms: RequestMatch[]) => {
    setBusy(r.id);
    try { await markRequestSeen(r, ms.map((m) => m.property.id)); onRefresh?.(); }
    finally { setBusy(''); }
  };

  const close = async (r: ClientRequest) => {
    if (!window.confirm(`تقفل طلب ${r.leadName}؟ مش هيتنبّه عليه تاني.`)) return;
    setBusy(r.id);
    try { await closeClientRequest(r); onRefresh?.(); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-stone-900">طلبات العملاء</h2>
          <p className="text-xs text-stone-400 font-medium">
            {rows.length} طلب مفتوح
            {totalNew > 0 && <span className="text-[#1E7A45] font-black"> · {totalNew} شقة جديدة تناسبهم</span>}
          </p>
        </div>
        <button
          type="button" onClick={() => { setPicking(true); setQ(''); }}
          className="rounded-2xl px-4 py-2.5 bg-[#141414] text-white font-black text-xs flex items-center gap-2"
        >
          <Plus size={14} /> سجّل طلب
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-stone-400 font-medium bg-white rounded-2xl p-5 border border-[#ECE8DF] text-center">
          مفيش طلبات مفتوحة. لما عميل يطلب حاجة مش موجودة عندنا، سجّل طلبه —
          وأول ما شقة قريبة تتضاف هتعرف.
        </p>
      )}

      {rows.map(({ request: r, matches }) => (
        <div
          key={r.id}
          className={`bg-white rounded-2xl border p-4 space-y-3 ${
            matches.length ? 'border-[#BFE0CC]' : 'border-[#ECE8DF]'
          }`}
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-stone-900">{r.leadName}</span>
                <span className="text-[10px] font-black bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                  {r.kind === 'cash' ? 'كاش' : 'تقسيط'}
                </span>
                {matches.length > 0 && (
                  <span className="text-[10px] font-black bg-[#EEF5F0] text-[#1E7A45] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BellRing size={10} /> {matches.length} شقة جديدة
                  </span>
                )}
                {isAdmin && (
                  <span className="text-[10px] text-stone-400 font-bold">{r.agentName}</span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 font-medium mt-1">
                {(r.neighborhoods || []).join('، ') || 'أي حي'}
                {r.bedrooms ? ` · ${r.bedrooms} غرف` : ''}
                {r.kind === 'cash'
                  ? (r.budgetMax ? ` · لحد ${formatPrice(r.budgetMax)}` : '')
                  : ` · مقدم ${formatPrice(r.downPayment || 0)} · قسط ${formatPrice(r.monthly || 0)}`}
              </p>
              {r.note && <p className="text-[11px] text-stone-500 font-medium mt-0.5">{r.note}</p>}
            </div>

            <button
              type="button" onClick={() => close(r)} disabled={busy === r.id}
              className="text-[11px] font-bold text-stone-400 hover:text-[#C2412D] shrink-0"
            >
              اقفل الطلب
            </button>
          </div>

          {matches.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#F4F1EA]">
              {matches.slice(0, 5).map((m) => (
                <button
                  key={m.property.id} type="button"
                  onClick={() => onOpenProperty?.(m.property)}
                  className="w-full bg-[#FBF8F1] rounded-2xl p-3 flex items-center gap-3 text-right"
                >
                  {(m.property.images || []).filter(Boolean).length > 0 ? (
                    <img loading="lazy" src={thumbUrl(m.property.images[0], 120)} alt=""
                      className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : <div className="w-12 h-12 rounded-xl bg-stone-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-black bg-white px-2 py-0.5 rounded-full">
                        {m.property.code}
                      </span>
                      <span className="text-[10px] font-black text-[#1E7A45]">{m.score}%</span>
                    </div>
                    <p className="text-xs font-bold text-stone-800 truncate mt-0.5">
                      {formatPrice(m.property.price)} ج.م · {m.property.area} م²
                    </p>
                    <p className="text-[10px] text-stone-400 font-medium truncate">
                      {m.reasons.join(' · ')}
                    </p>
                  </div>
                </button>
              ))}

              <button
                type="button" onClick={() => seen(r, matches)} disabled={busy === r.id}
                className="w-full rounded-xl py-2 bg-white border border-[#E4DFD4] font-bold text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                شفتهم — ما تنبّهنيش عليهم تاني
              </button>
            </div>
          )}
        </div>
      ))}

      {/* اختيار العميل اللي هنسجّل طلبه */}
      {picking && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-[#FBF8F1] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF]">
              <p className="font-black text-stone-900">طلب مين؟</p>
              <button type="button" onClick={() => setPicking(false)} className="p-2 rounded-full hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم"
                  className="w-full rounded-2xl border border-[#E4DFD4] pr-9 pl-4 py-3 text-sm font-bold"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {myLeads.length === 0 ? (
                <p className="text-xs text-stone-400 font-medium text-center py-6">
                  مفيش عملاء من غير طلب مفتوح
                </p>
              ) : myLeads.map((l) => (
                <button
                  key={l.id} type="button"
                  onClick={() => { setPicking(false); setFormFor(l); }}
                  className="w-full bg-white rounded-2xl p-3 border border-[#ECE8DF] text-right"
                >
                  <span className="block text-xs font-black text-stone-900">{l.name}</span>
                  <span className="block text-[11px] text-stone-400 font-mono" dir="ltr">{l.phone}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {formFor && (
        <RequestForm
          lead={formFor} agentName={agentName} properties={properties}
          onClose={() => setFormFor(null)}
          onSaved={() => onRefresh?.()}
        />
      )}
    </div>
  );
};

export default ClientRequestsPanel;
