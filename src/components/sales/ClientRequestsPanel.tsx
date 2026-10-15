import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Loader2, Plus, Search, X } from 'lucide-react';
import type { ClientRequest, Lead, Property, RequestKind } from '../../types';
import {
  matchAllRequests, installmentHint, estimatePlan, affordableFromPlan,
  existingMatches, leadWithRequest, leadWithSeen, leadWithClosedRequest,
  requestsFromLeads, requestFromLead, RequestMatch, findStuckLeads,
  REQUEST_FILTERS, paymentOf,
} from '../../services/clientRequests';
import {
  Project, ProjectKind, subscribeProjects, projectPlanOptions,
} from '../../services/projectService';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../../data/properties';
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
  onUpdateLead: (l: Lead) => void;
}> = ({ lead, agentName, properties, onClose, onSaved, onUpdateLead }) => {
  /* الفورم بيفتح مليان باللي متسجّل — "عدّل طلبه" مايبقاش
     فورم فاضي تملاه من الأول */
  const prev = (lead as any).clientRequest as Partial<ClientRequest> | undefined;
  const d0 = ((lead as any).discovery || {}) as Record<string, any>;
  const [kind, setKind] = useState<RequestKind>(
    prev?.kind || (String(d0.payment || '').includes('تقسيط') ? 'installment' : 'cash'),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  /* مشترك */
  const [beds, setBeds] = useState<number>(prev?.bedrooms || lead.preferredBedrooms || 3);
  const [note, setNote] = useState(prev?.note || '');
  const [reasons, setReasons] = useState<string[]>(prev?.rejectionReasons || []);

  /* كاش */
  const [hoods, setHoods] = useState<string[]>(
    prev?.neighborhoods?.length ? prev.neighborhoods
      : Array.isArray(d0.districts) && d0.districts.length ? d0.districts
      : lead.preferredNeighborhood ? [lead.preferredNeighborhood] : [],
  );
  const [finishing, setFinishing] = useState(prev?.kind === 'cash' ? (prev?.finishing || '') : '');
  const [bMin, setBMin] = useState<number>(prev?.budgetMin || lead.budgetMin || 1500000);
  const [bMax, setBMax] = useState<number>(prev?.budgetMax || lead.budgetMax || 3500000);

  /* تقسيط — من المشاريع الحقيقية (قسم المشاريع)، نفس المكان
     اللي المطابقة بتعرض منه. كان بيقرا من شقق قديمة في الموقع
     فالخيارات مكانتش بتطابق اللي بيظهر في المطابقة. */
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => subscribeProjects(setProjects), []);
  const [planKind, setPlanKind] = useState<ProjectKind>(
    prev?.offPlanKind === 'compound' ? 'compound' : 'building',
  );
  const opts = useMemo(() => projectPlanOptions(projects, planKind), [projects, planKind]);
  const floorDown = opts.minDown;
  const [years, setYears] = useState<number>(prev?.years || 0);
  const [down, setDown] = useState<number>(prev?.downPayment || 0);
  const [delivery, setDelivery] = useState(prev?.deliveryWithin || '');

  /* أول ما يغيّر النوع، الخيارات بتتغيّر — فبنرجّع الاختيار
     لأقل حاجة موجودة بدل ما يفضل على رقم مش متاح للنوع ده */
  useEffect(() => {
    /* لو القيمة المتسجّلة لسه متاحة في النوع ده نسيبها،
       وإلا نرجع لأقل حاجة موجودة */
    setYears((y) => (y && opts.years.includes(y) ? y : (opts.years[0] || 0)));
    setDown((v) => (v && v >= floorDown ? v : floorDown));
  }, [planKind, opts.years.length, floorDown]);

  /* كام مشروع المقدم ده يكفيه، بنفس عدد السنين.
     كان فيه "يعني قسط حوالي كذا" — بس الرقم ده كان متحسب من
     أرخص مشروع في الفئة كلها، مش من حاجة العميل اختارها،
     فكان رقم مالوش معنى. ده بقى عدد حقيقي من أنظمة السداد. */
  const covered = useMemo(() => {
    const hits: { name: string; monthly: number }[] = [];
    projects.filter((p) => p.kind === planKind).forEach((p) => {
      const start = Number(p.startingPrice || p.cashPrice || 0);
      let best = 0;
      (p.plans || []).forEach((pl) => {
        if (years && Number(pl.years) !== years) return;
        const pct = Number(pl.downPaymentPercent) || 0;
        const need = Number(pl.downPaymentAmount) || (pct && start ? Math.round((start * pct) / 100) : 0);
        if (!need || need > down) return;
        const m = Number(pl.monthly)
          || (start && pl.years ? Math.round((start - need) / (Number(pl.years) * 12)) : 0);
        if (m && (!best || m < best)) best = m;
      });
      if (best) hits.push({ name: p.name, monthly: best });
    });
    return hits.sort((a, b) => a.monthly - b.monthly);
  }, [projects, planKind, years, down]);
  /* القسط اللي بيتسجّل = أقل قسط في المشاريع اللي المقدم يغطيها */
  const monthly = covered.length ? covered[0].monthly : 0;

  const draft = useMemo(() => {
    const base = requestFromLead(lead, agentName, kind, { note: note.trim() });
    if (kind === 'cash') {
      return {
        ...base,
        neighborhoods: hoods,
        bedrooms: beds || undefined,
        finishing: finishing || undefined,
        budgetMin: bMin, budgetMax: bMax,
        rejectionReasons: reasons,
      };
    }
    return {
      ...base,
      neighborhoods: hoods,
      bedrooms: beds || undefined,
      /* تحت الإنشاء بييجي نص تشطيب على طول — مفيش سؤال */
      finishing: 'نص تشطيب',
      offPlanKind: planKind === 'compound' ? 'compound' : 'standalone_building',
      years: years || undefined,
      downPayment: down || undefined,
      monthly: monthly || undefined,
      deliveryWithin: delivery || undefined,
      rejectionReasons: reasons,
    };
  }, [lead, agentName, kind, hoods, beds, finishing, bMin, bMax,
      planKind, years, down, monthly, delivery, note, reasons]);


  const tooLow = kind === 'installment' && floorDown > 0 && down < floorDown;

  const save = async () => {
    if (tooLow) { setErr(`أقل مقدم موجود عندنا ${floorDown.toLocaleString('en-US')} ج.م`); return; }
    setBusy(true); setErr('');
    try {
      /* الحفظ بيمشي على نفس مسار تحديث ملف العميل اللي شغال
         طول اليوم — مفيش مجموعة جديدة ولا قاعدة ممكن ترفض */
      onUpdateLead(leadWithRequest(lead, draft as any));
      onSaved(); onClose();
    } catch (e: any) { setErr(e?.message || 'الحفظ ما نجحش'); }
    finally { setBusy(false); }
  };

  const chip = (on: boolean) =>
    `text-[11px] font-black px-3 py-2 rounded-xl border transition-colors ${
      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-stone-600 border-[#E4DFD4]'
    }`;

  return (
    <div className="fixed inset-0 z-[125] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-[#FBF8F1] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#FBF8F1] px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF] z-10">
          <div className="min-w-0">
            <p className="font-black text-stone-900 truncate">{prev ? 'عدّل طلب' : 'طلب'} {lead.name}</p>
            <p className="text-xs text-stone-400 font-medium">
              مرة واحدة · وأول ما شقة قريبة تتضاف هتعرف
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-stone-500 mb-1.5">كاش ولا تقسيط</p>
            <div className="grid grid-cols-2 gap-2">
              {([['cash', 'كاش'], ['installment', 'تقسيط']] as [RequestKind, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={`rounded-2xl py-3 font-black text-sm ${
                    kind === k ? 'bg-[#141414] text-white' : 'bg-white border border-[#E4DFD4] text-stone-600'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          {kind === 'installment' ? (
            <>
              <div>
                <p className="text-xs font-bold text-stone-500 mb-1.5">كمبوند ولا عمارات</p>
                <div className="grid grid-cols-2 gap-2">
                  {([['building', 'عمارات'], ['compound', 'كمبوند']] as [ProjectKind, string][]).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setPlanKind(k)} className={chip(planKind === k)}>
                      {l}
                      <span className="block text-[10px] font-bold opacity-60 mt-0.5">
                        {projectPlanOptions(projects, k).count} مشروع
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {opts.count === 0 ? (
                <p className="text-xs font-black text-[#C2412D] bg-[#FBEDEA] rounded-2xl p-3">
                  مفيش عندنا {planKind === 'compound' ? 'كمبوندات' : 'عمارات'} في قسم المشاريع دلوقتي —
                  سجّل الطلب وهيوصلك أول ما تتضاف
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-bold text-stone-500 mb-1.5">
                      التقسيط على كام سنة
                      <span className="text-stone-400 font-medium"> — من أنظمة السداد في {opts.count} مشروع</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opts.years.map((y) => (
                        <button key={y} type="button" onClick={() => setYears(y)} className={chip(years === y)}>
                          {y} سنين
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-xs font-bold text-stone-500">المقدم اللي معاه</p>
                      <p className="text-sm font-black text-stone-900 font-mono">
                        {down.toLocaleString('en-US')} ج.م
                      </p>
                    </div>
                    <input
                      type="range" min={floorDown} max={Math.max(floorDown + 25000, opts.maxDown * 2)}
                      step={25000} value={down}
                      onChange={(e) => setDown(Number(e.target.value))}
                      className="w-full accent-[#A07A26]"
                    />
                    <p className="text-[11px] font-bold text-[#A07A26] mt-1">
                      أقل مقدم في أنظمة السداد عندنا {floorDown.toLocaleString('en-US')} ج.م
                      {opts.minDownPercent ? ` (${opts.minDownPercent}٪)` : ''} — مفيش أقل من كده
                    </p>
                    <div className={`mt-2 rounded-xl p-2.5 ${covered.length ? 'bg-[#EEF5F0]' : 'bg-[#FBEDEA]'}`}>
                      {covered.length ? (
                        <>
                          <p className="text-[11px] font-black text-[#1E7A45]">
                            المقدم ده يكفي {covered.length} من {opts.count} مشروع
                            {years ? ` على ${years} سنين` : ''}
                          </p>
                          {covered.slice(0, 3).map((c) => (
                            <p key={c.name} className="text-[11px] font-bold text-stone-600">
                              • {c.name} — قسط {c.monthly.toLocaleString('en-US')} في الشهر
                            </p>
                          ))}
                        </>
                      ) : (
                        <p className="text-[11px] font-black text-[#C2412D]">
                          مفيش مشروع المقدم ده يكفيه{years ? ` على ${years} سنين` : ''} — زوّد المقدم أو غيّر السنين
                        </p>
                      )}
                    </div>
                  </div>

                  {opts.deliveries.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-stone-500 mb-1.5">عايز الاستلام خلال</p>
                      <div className="flex flex-wrap gap-2">
                        {['٦ شهور', 'سنة', 'سنتين', '٣ سنين'].map((d) => (
                          <button key={d} type="button" onClick={() => setDelivery(delivery === d ? '' : d)} className={chip(delivery === d)}>
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-stone-400 font-medium mt-1">
                        الاستلام المتاح عندنا: {opts.deliveries.join(' · ')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-bold text-stone-500">ميزانيته</p>
                  <p className="text-sm font-black text-stone-900 font-mono">
                    {formatPrice(bMin)} — {formatPrice(bMax)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="range" min={500000} max={15000000} step={100000} value={bMin}
                    onChange={(e) => setBMin(Math.min(Number(e.target.value), bMax))}
                    className="w-full accent-[#A07A26]" />
                  <input type="range" min={500000} max={15000000} step={100000} value={bMax}
                    onChange={(e) => setBMax(Math.max(Number(e.target.value), bMin))}
                    className="w-full accent-[#A07A26]" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-stone-500 mb-1.5">نوع التشطيب</p>
                <div className="flex flex-wrap gap-2">
                  {['متشطبة', 'نص تشطيب', 'على الطوب', 'مش فارق'].map((x) => (
                    <button key={x} type="button" onClick={() => setFinishing(finishing === x ? '' : x)} className={chip(finishing === x)}>
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <p className="text-xs font-bold text-stone-500 mb-1.5">الأحياء (ممكن أكتر من واحد)</p>
            <div className="flex flex-wrap gap-1.5">
              {(HADABA_WOSTA_NEIGHBORHOODS as unknown as string[]).map((h) => {
                const on = hoods.includes(h);
                return (
                  <button key={h} type="button"
                    onClick={() => setHoods((p) => on ? p.filter((x) => x !== h) : [...p, h])}
                    className={chip(on)}>{h}</button>
                );
              })}
            </div>
            {hoods.length === 0 && (
              <p className="text-[11px] text-stone-400 font-medium mt-1">
                من غير اختيار = أي حي
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-stone-500 mb-1.5">كام غرفة</p>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5].map((b) => (
                <button key={b} type="button" onClick={() => setBeds(b)} className={chip(beds === b)}>
                  {b === 5 ? '5+' : b} غرف
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-stone-500 mb-1.5">
              شروط لازمة (اختياري) — دي بتشيل شقق من نتيجته
            </p>
            <div className="space-y-1.5">
              {REQUEST_FILTERS.map((f) => {
                const on = reasons.includes(f.label);
                return (
                  <button key={f.id} type="button"
                    onClick={() => setReasons((p) => on ? p.filter((y) => y !== f.label) : [...p, f.label])}
                    className={`w-full text-right rounded-2xl p-3 border ${
                      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'
                    }`}>
                    <span className="block text-xs font-black">{f.label}</span>
                    <span className={`block text-[10px] font-medium mt-0.5 ${on ? 'text-white/60' : 'text-stone-400'}`}>
                      {f.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-stone-500 block mb-1">ملاحظة (اختياري)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="الفيو، شكل الواجهة، توزيع المساحة… أي حاجة مش في الداتا"
              className="w-full rounded-2xl border border-[#E4DFD4] px-3 py-2.5 text-sm" />
          </label>

          {err && <p className="text-xs font-black text-[#C2412D] bg-[#FBEDEA] rounded-xl p-3">✗ {err}</p>}

          <button type="button" onClick={save} disabled={busy || tooLow}
            className="w-full rounded-2xl py-3.5 bg-[#141414] text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {busy ? 'بيسجّل…' : 'سجّل الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- الشاشة ---------- */
export { RequestForm };

export const ClientRequestsPanel: React.FC<{
  properties: Property[];
  leads: Lead[];
  onUpdateLead: (l: Lead) => void;
  agentId?: string;
  agentName: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
  onOpenProperty?: (p: Property) => void;
}> = ({ properties, leads, onUpdateLead, agentId, agentName, isAdmin, onRefresh, onOpenProperty }) => {
  /* الطلبات بتتقرا من ملفات العملاء — مفيش مصدر تاني */
  const requests = useMemo(() => requestsFromLeads(leads), [leads]);
  const [formFor, setFormFor] = useState<Lead | null>(null);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const rows = useMemo(
    () => matchAllRequests(requests, properties, isAdmin ? undefined : agentId),
    [requests, properties, agentId, isAdmin],
  );

  const totalNew = rows.reduce((n, r) => n + r.matches.length, 0);

  /* العميل اللي اتبعتله صور وسجّل عليه كومنتات وفضل مكانه:
     اللي عندنا مناسبوش، والسبب مش في الأرقام */
  const stuck = useMemo(
    () => findStuckLeads(leads, requests, { agentId: isAdmin ? undefined : agentId }),
    [leads, requests, agentId, isAdmin],
  );

  const myLeads = useMemo(() => {
    const open = new Set(requests.filter((r) => r.status === 'open').map((r) => r.leadId));
    const mine = leads.filter((l) => (isAdmin || l.assignedAgentId === agentId) && !open.has(l.id));
    const s = q.trim().toLowerCase();
    return (s
      ? mine.filter((l) => (l.name || '').toLowerCase().includes(s) || (l.phone || '').includes(s))
      : mine
    ).slice(0, 40);
  }, [leads, requests, agentId, isAdmin, q]);

  const leadOf = (id: string) => leads.find((l) => l.id === id);

  const seen = (r: ClientRequest, ms: RequestMatch[]) => {
    const l = leadOf(r.leadId);
    if (l) onUpdateLead(leadWithSeen(l, ms.map((m) => m.property.id)));
  };

  const close = (r: ClientRequest) => {
    if (!window.confirm(`تقفل طلب ${r.leadName}؟ مش هيتنبّه عليه تاني.`)) return;
    const l = leadOf(r.leadId);
    if (l) onUpdateLead(leadWithClosedRequest(l));
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

      {stuck.length > 0 && (
        <div className="bg-[#FBF1E4] border border-[#E8D3A6] rounded-2xl p-4 space-y-2">
          <div>
            <p className="font-black text-sm text-[#A07A26]">
              {stuck.length} عميل اتبعتله صور وماتحركش
            </p>
            <p className="text-[11px] text-[#6B665C] font-medium mt-0.5">
              يعني اللي عندنا مناسبوش — حتى لو الميزانية والحي مظبوطين.
              سجّل طلبه عشان أول شقة مناسبة توصلك.
            </p>
          </div>
          <div className="space-y-1.5">
            {stuck.slice(0, 6).map((sl) => (
              <button
                key={sl.lead.id} type="button" onClick={() => setFormFor(sl.lead)}
                className="w-full bg-white rounded-2xl p-3 flex items-center justify-between gap-2 text-right border border-[#ECE8DF]"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-black text-stone-900 truncate">
                    {sl.lead.name}
                    {paymentOf(sl.lead) === 'installment' && (
                      <span className="text-[10px] font-bold text-[#1F5C8B]"> · تقسيط</span>
                    )}
                    {paymentOf(sl.lead) === 'cash' && (
                      <span className="text-[10px] font-bold text-[#1E7A45]"> · كاش</span>
                    )}
                  </span>
                  <span className="block text-[11px] text-stone-400 font-medium">
                    {sl.comments} كومنت
                    {sl.daysStuck > 0 ? ` · واقف من ${sl.daysStuck} يوم` : ''}
                  </span>
                </span>
                <span className="text-[11px] font-black text-[#A07A26] shrink-0">سجّل طلبه</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
          onUpdateLead={onUpdateLead}
          onClose={() => setFormFor(null)}
          onSaved={() => onRefresh?.()}
        />
      )}
    </div>
  );
};

export default ClientRequestsPanel;
