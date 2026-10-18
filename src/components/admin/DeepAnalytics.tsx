import React, { useEffect, useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  AppEvent, subscribeEvents, getCachedEvents, byType, unitInterest, responseSpeed,
  uniqueVisitors, dailySeries,
} from '../../services/analyticsService';
import { Lead, Property } from '../../types';

/*
  صفحة الإحصائيات — مصدر واحد لكل رقم، ومدة واحدة لكل الصفحة.

  - أرقام الموقع (زوار/مشاهدات/سؤال/الوحدات): من سجل الأحداث.
  - أرقام الشغل (ليدات/أكشن/معاينات/صفقات/الفريق/المصادر): من CRM نفسه
    (سجل الأكشن على كل عميل) — نفس اللي السيلز بيسجّله، فمفيش رقم هنا
    يختلف عن اللي في غرفة العمليات.
  - أي نسبة مبنية على عدد صغير مش بتتعرض كأنها حقيقة (٤ مشاهدات و٤ أسئلة ≠ ١٠٠٪).
*/

const GOOD = '#1E7A45';
const WARN = '#B07D00';
const BAD = '#9E2A1B';
const MUTED = '#8C877D';

const n = (v?: number) => (typeof v === 'number' && isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const mins = (m: number | null) => (m === null ? '—' : m < 60 ? `${m} د` : m < 1440 ? `${Math.round(m / 60)} س` : `${Math.round(m / 1440)} يوم`);

const SOURCE_AR: Record<string, string> = {
  facebook_group: 'جروب فيسبوك', website_whatsapp: 'واتساب الموقع', cold_call: 'مكالمة باردة',
  referral: 'ترشيح', direct: 'مباشر', campaign: 'حملة إعلانية',
};

/* ترتيب المراحل: العميل «وصل» لمرحلة لو هو فيها أو عدّاها في أي وقت */
const STAGES: { id: string; label: string }[] = [
  { id: 'new', label: 'جديد' }, { id: 'contacted', label: 'تم الاتصال' }, { id: 'sent_details', label: 'إرسال صور' },
  { id: 'visit_requested', label: 'تحت الطلب' }, { id: 'visit_booked', label: 'معاينة مؤكدة' },
  { id: 'visit_done', label: 'تمت المعاينة' }, { id: 'negotiation', label: 'تفاوض' }, { id: 'closed', label: 'صفقة مغلقة' },
];
const rankOf = (id?: string) => STAGES.findIndex((s) => s.id === id);
function maxRank(l: Lead): number {
  let r = rankOf(l.status);
  (l.activity || []).forEach((a) => {
    const m = /نقل إلى\s*(.+)/.exec(a.outcome || '');
    if (m) STAGES.forEach((s, i) => { if (m[1].includes(s.label) && i > r) r = i; });
    if (/تمت المعاينة/.test(a.outcome || '') && r < 5) r = 5;
  });
  return r;
}
const leadTime = (l: Lead) => new Date(l.createdAt || l.lastContactDate || 0).getTime();

type Range = 1 | 7 | 30 | 90;

export const DeepAnalytics: React.FC<{ leads: Lead[]; properties: Property[] }> = ({ leads }) => {
  const [days, setDays] = useState<Range>(7);
  const evDays = days === 1 ? 7 : days;
  const [events, setEvents] = useState<AppEvent[]>(() => getCachedEvents(7) || []);
  const [loaded, setLoaded] = useState(() => !!getCachedEvents(7));
  const [unitTab, setUnitTab] = useState<'cold' | 'hot'>('cold');

  useEffect(() => {
    const seed = getCachedEvents(evDays);
    setLoaded(!!seed);
    if (seed) setEvents(seed);
    return subscribeEvents(evDays, (l) => { setEvents(l); setLoaded(true); });
  }, [evDays]);

  /* بداية المدة: «النهارده» = من نص الليل بتوقيت الجهاز */
  const since = useMemo(() => {
    if (days === 1) { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    return Date.now() - days * 864e5;
  }, [days]);
  const ev = useMemo(() => events.filter((e) => (e.at || 0) >= since), [events, since]);

  /* ---------- الموقع ---------- */
  const views = byType(ev, 'unit_view');
  const wa = byType(ev, 'unit_whatsapp').length;
  const calls = byType(ev, 'unit_call').length;
  const vreq = byType(ev, 'viewing_request').length;
  const asks = wa + calls + vreq;
  const moreClicks = byType(ev, 'more_units').length;
  const series = useMemo(() => dailySeries(events, ['unit_view'], days === 1 ? 7 : days), [events, days]);
  const units = useMemo(() => unitInterest(ev), [ev]);
  const coldUnits = units.filter((u) => u.views >= 5 && u.asks === 0).sort((a, b) => b.views - a.views).slice(0, 6);
  const hotUnits = units.filter((u) => u.asks > 0).sort((a, b) => b.asks - a.asks || b.askRate - a.askRate).slice(0, 6);

  /* ---------- الشغل (من CRM) ---------- */
  const work = useMemo(() => {
    const newLeads = leads.filter((l) => leadTime(l) >= since);
    let actions = 0, viewings = 0, deals = 0;
    const byAgent = new Map<string, { name: string; leads: number; actions: number; viewings: number; deals: number; late: number }>();
    const row = (name: string) => {
      const k = name || 'غير مسند';
      if (!byAgent.has(k)) byAgent.set(k, { name: k, leads: 0, actions: 0, viewings: 0, deals: 0, late: 0 });
      return byAgent.get(k)!;
    };
    const now = Date.now();
    leads.forEach((l) => {
      const r = row(l.assignedAgentName || '');
      if (leadTime(l) >= since) r.leads++;
      if (l.nextActionAt && l.nextActionAt < now && l.followUpStatus !== 'completed' && l.status !== 'closed' && l.status !== 'lost') r.late++;
      (l.activity || []).forEach((a) => {
        if (typeof a.at !== 'number' || a.at < since) return;
        if ((a.by || '').trim() === 'النظام') return;
        actions++; r.actions++;
        if (/تمت المعاينة/.test(a.outcome || '')) { viewings++; r.viewings++; }
        if (/صفقة مغلقة/.test(a.outcome || '')) { deals++; r.deals++; }
      });
    });
    /* القمع: الليدات اللي اتسجلت في المدة، وصلوا لحد فين */
    const ranks = newLeads.map(maxRank);
    const funnel = [
      { label: 'ليد جديد', v: newLeads.length },
      { label: 'اتكلموا', v: ranks.filter((r) => r >= 1).length },
      { label: 'خدوا صور/عروض', v: ranks.filter((r) => r >= 2).length },
      { label: 'طلبوا معاينة', v: ranks.filter((r) => r >= 3).length },
      { label: 'عاينوا', v: ranks.filter((r) => r >= 5).length },
      { label: 'صفقة', v: ranks.filter((r) => r >= 7).length },
    ];
    /* المصادر */
    const src = new Map<string, { leads: number; viewed: number; won: number }>();
    newLeads.forEach((l, i) => {
      const k = SOURCE_AR[l.source] || l.source || 'مش متسجّل';
      if (!src.has(k)) src.set(k, { leads: 0, viewed: 0, won: 0 });
      const s = src.get(k)!;
      s.leads++; if (ranks[i] >= 5) s.viewed++; if (ranks[i] >= 7) s.won++;
    });
    const team = [...byAgent.values()].filter((r) => r.leads || r.actions || r.late).sort((a, b) => b.actions - a.actions || b.leads - a.leads);
    return { newLeads: newLeads.length, actions, viewings, deals, funnel, team, sources: [...src.entries()].sort((a, b) => b[1].leads - a[1].leads) };
  }, [leads, since]);

  /* سرعة أول رد من الأحداث — بتتعرض بس لو العينة ٥ ليدات أو أكتر */
  const speed = useMemo(() => {
    const m = new Map<string, { med: number | null; leads: number }>();
    responseSpeed(ev).forEach((s) => m.set(s.actorName, { med: s.medianMinutes, leads: s.leads }));
    return m;
  }, [ev]);

  if (!loaded) return <p className="py-16 text-center text-sm text-[#6B665C]">جاري التحميل...</p>;

  const fMax = Math.max(1, work.funnel[0].v);

  return (
    <div className="space-y-5" dir="rtl">
      {/* المدة — واحدة للصفحة كلها */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([[1, 'النهارده'], [7, '٧ أيام'], [30, '٣٠ يوم'], [90, '٩٠ يوم']] as [Range, string][]).map(([d, t]) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${days === d ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#4A463F] border-[#ECE8DF]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Tile label="ليدات جديدة" value={n(work.newLeads)} sub="اتسجّلوا في CRM" />
        <Tile label="أكشن الفريق" value={n(work.actions)} sub="مكالمة/كومنت/نقل مرحلة" />
        <Tile label="معاينات اتعملت" value={n(work.viewings)} sub="اتسجّلت «تمت المعاينة»" tone={work.viewings ? GOOD : undefined} />
        <Tile label="صفقات" value={n(work.deals)} sub="اتنقلت «صفقة مغلقة»" tone={work.deals ? GOOD : undefined} />
        <Tile label="زوار الموقع" value={n(uniqueVisitors(views))} sub={`${n(views.length)} مشاهدة شقة · ${n(moreClicks)} ضغطة «شوف كمان»`} />
        <Tile label="سألوا من الموقع" value={n(asks)} sub={`${n(wa)} واتساب · ${n(calls)} اتصال · ${n(vreq)} معاينة`} />
        <Tile label="نسبة السؤال" value={views.length >= 30 ? `${pct(asks, views.length)}٪` : '—'} sub={views.length >= 30 ? 'من اللي فتحوا شقة' : 'المشاهدات لسه قليلة'} />
        <Tile label="عملاء متأخرين دلوقتي" value={n(work.team.reduce((s, r) => s + r.late, 0))} sub="عدّى ميعاد متابعتهم" tone={BAD} />
      </div>

      {/* القمع */}
      <Card title="الليدات الجديدة وصلت لحد فين" hint={work.newLeads ? `من ${n(work.newLeads)} ليد اتسجّلوا في المدة دي` : 'مفيش ليدات اتسجّلت في المدة دي'}>
        {work.newLeads > 0 && (
          <div className="space-y-1.5">
            {work.funnel.map((f, i) => (
              <div key={f.label} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 font-bold text-[#3d3a35]">{f.label}</span>
                <div className="flex-1 h-6 bg-[#F6F4EF] rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg flex items-center px-2 text-[11px] font-bold text-white"
                    style={{ width: `${Math.max(f.v ? 8 : 0, (f.v / fMax) * 100)}%`, background: i === work.funnel.length - 1 ? GOOD : '#A07A26' }}>
                    {f.v > 0 ? n(f.v) : ''}
                  </div>
                </div>
                <span className="w-10 text-left font-mono text-[11px] text-[#6B665C]">{i ? `${pct(f.v, work.funnel[0].v)}٪` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* الفريق — جدول واحد */}
      <Card title="الفريق" hint="مرتّبين بعدد الأكشن. سرعة الرد بتظهر لو الشخص عنده ٥ ليدات جديدة أو أكتر في المدة">
        {!work.team.length ? <Empty text="مفيش شغل متسجّل في المدة دي." /> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="text-[#8C877D] border-b border-[#ECE8DF]">
                  <th className="text-right font-bold py-2 px-1">الاسم</th>
                  <th className="font-bold py-2 px-1">أكشن</th>
                  <th className="font-bold py-2 px-1">ليدات جديدة</th>
                  <th className="font-bold py-2 px-1">معاينات</th>
                  <th className="font-bold py-2 px-1">صفقات</th>
                  <th className="font-bold py-2 px-1">متأخرين</th>
                  <th className="font-bold py-2 px-1">سرعة الرد</th>
                </tr>
              </thead>
              <tbody>
                {work.team.map((r) => {
                  const sp = speed.get(r.name);
                  const showSp = sp && sp.leads >= 5;
                  return (
                    <tr key={r.name} className="border-b border-[#F2EFE9] last:border-0 text-center font-mono">
                      <td className="text-right font-sans font-bold py-2 px-1">{r.name}</td>
                      <td className="py-2 px-1 font-bold">{n(r.actions)}</td>
                      <td className="py-2 px-1">{n(r.leads)}</td>
                      <td className="py-2 px-1" style={{ color: r.viewings ? GOOD : MUTED }}>{n(r.viewings)}</td>
                      <td className="py-2 px-1 font-bold" style={{ color: r.deals ? GOOD : MUTED }}>{n(r.deals)}</td>
                      <td className="py-2 px-1 font-bold" style={{ color: r.late ? BAD : MUTED }}>{n(r.late)}</td>
                      <td className="py-2 px-1" style={{ color: !showSp ? MUTED : (sp!.med ?? 999) <= 15 ? GOOD : (sp!.med ?? 999) <= 120 ? WARN : BAD }}>
                        {showSp ? mins(sp!.med) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* المصادر */}
      <Card title="المصادر" hint="الليدات الجديدة في المدة: جت منين، وكام منهم عاين وقفل">
        {!work.sources.length ? <Empty text="مفيش ليدات في المدة دي." /> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#8C877D] border-b border-[#ECE8DF]">
                <th className="text-right font-bold py-2">المصدر</th>
                <th className="font-bold py-2">ليدات</th>
                <th className="font-bold py-2">عاينوا</th>
                <th className="font-bold py-2">صفقات</th>
              </tr>
            </thead>
            <tbody>
              {work.sources.map(([k, s]) => (
                <tr key={k} className="border-b border-[#F2EFE9] last:border-0 text-center font-mono">
                  <td className="text-right font-sans font-bold py-2">{k}</td>
                  <td className="py-2">{n(s.leads)}</td>
                  <td className="py-2">{n(s.viewed)} <span className="text-[#8C877D]">({pct(s.viewed, s.leads)}٪)</span></td>
                  <td className="py-2 font-bold" style={{ color: s.won ? GOOD : MUTED }}>{n(s.won)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* الشقق */}
      <Card title="الشقق على الموقع" hint={unitTab === 'cold' ? 'اتفتحت ٥ مرات أو أكتر ومحدش سأل — راجع السعر أو الصور' : 'أكتر شقق الناس سألت عليها (واتساب/اتصال/طلب معاينة)'}>
        <div className="flex gap-1.5 mb-2">
          {([['cold', `محدش بيسأل (${coldUnits.length})`], ['hot', `بيسألوا عليها (${hotUnits.length})`]] as const).map(([k, t]) => (
            <button key={k} onClick={() => setUnitTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${unitTab === k ? 'bg-[#141414] text-white' : 'bg-[#F6F4EF]'}`}>{t}</button>
          ))}
        </div>
        {(unitTab === 'cold' ? coldUnits : hotUnits).length === 0 ? (
          <Empty text={unitTab === 'cold' ? 'مفيش شقة اتفتحت ٥ مرات من غير سؤال.' : 'محدش سأل على شقة في المدة دي.'} />
        ) : (
          <div className="divide-y divide-[#F2EFE9]">
            {(unitTab === 'cold' ? coldUnits : hotUnits).map((u) => (
              <div key={u.propertyId} className="flex items-center justify-between gap-2 py-2 text-xs">
                <span><b className="font-mono">{u.code}</b> <span className="text-[#6B665C]">· {u.neighborhood}</span></span>
                <span className="font-mono shrink-0">
                  {n(u.views)} فتح · <b style={{ color: u.asks ? GOOD : BAD }}>{u.asks ? `${n(u.asks)} سؤال` : 'صفر سؤال'}</b>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* المشاهدات اليومية */}
      {events.length > 0 && <Spark data={series} />}

      {events.length === 0 && (
        <div className="py-8 text-center bg-white border border-dashed border-[#DCD6CA] rounded-2xl">
          <Inbox size={26} className="mx-auto text-[#A07A26]" />
          <p className="text-xs text-[#6B665C] mt-2">أرقام الموقع بتبدأ تتجمّع أول ما حد يفتح شقة.</p>
        </div>
      )}
    </div>
  );
};

/* ---------- عناصر ---------- */

const Tile: React.FC<{ label: string; value: string; sub?: string; tone?: string }> = ({ label, value, sub, tone }) => (
  <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3 space-y-0.5">
    <p className="text-[11px] font-bold text-[#8C877D]">{label}</p>
    <p className="text-2xl font-extrabold font-mono" style={{ color: tone || '#141414' }}>{value}</p>
    {sub && <p className="text-[10px] text-[#6B665C] leading-snug">{sub}</p>}
  </div>
);

const Card: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
    <div>
      <p className="font-extrabold text-sm text-[#141414]">{title}</p>
      {hint && <p className="text-[11px] text-[#8C877D]">{hint}</p>}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="bg-[#F6F4EF] rounded-xl px-3 py-3 text-center text-xs text-[#6B665C]">{text}</p>
);

const Spark: React.FC<{ data: { day: string; n: number }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
      <p className="text-xs font-bold text-[#141414]">مشاهدات الشقق كل يوم</p>
      <div className="flex items-end gap-[3px] h-16" dir="ltr">
        {data.map((d) => (
          <div key={d.day} className="flex-1 min-w-[3px] rounded-t-[3px] bg-[#A07A26]" style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }} title={`${d.day}: ${d.n}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-[#8C877D]" dir="ltr">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
};

export default DeepAnalytics;
