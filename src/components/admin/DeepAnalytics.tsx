import React, { useEffect, useMemo, useState } from 'react';
import {
  Timer, TrendingDown, Flame, AlertTriangle, Users, Building2, Megaphone, Eye, Inbox,
} from 'lucide-react';
import {
  AppEvent, subscribeEvents, byType, unitInterest, responseSpeed, sourcePerformance,
  uniqueVisitors, median, dailySeries,
} from '../../services/analyticsService';
import { Lead, Property } from '../../types';

/*
  التحليلات العميقة: مبنية كلها على سجل الأحداث.
  القاعدة اللي مشيت عليها: كل رقم هنا لازم يغيّر قرار. لو رقم بيتعرض للفرجة بس، اتشال.

  الألوان: أخضر/ذهبي/أحمر متفحوصين إنهم متميزين حتى لضعاف تمييز الألوان،
  وكل حالة معاها كلمة مكتوبة — اللون مش بيحمل المعنى لوحده أبداً.
*/

const GOOD = '#1E7A45';
const WARN = '#C99700';
const BAD = '#9E2A1B';
const INK = '#141414';
const MUTED = '#6B665C';

const n = (v?: number) => (typeof v === 'number' && isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');

/** الوقت بصيغة يفهمها حد مستعجل */
const mins = (m: number | null) => {
  if (m === null) return '—';
  if (m < 60) return `${m} دقيقة`;
  if (m < 1440) return `${Math.round(m / 60)} ساعة`;
  return `${Math.round(m / 1440)} يوم`;
};

const speedTone = (m: number | null) =>
  m === null ? { c: MUTED, label: 'مفيش رد' } : m <= 15 ? { c: GOOD, label: 'سريع' } : m <= 120 ? { c: WARN, label: 'متوسط' } : { c: BAD, label: 'بطيء' };

interface Props {
  leads: Lead[];
  properties: Property[];
}

type Range = 7 | 30 | 90;

export const DeepAnalytics: React.FC<Props> = ({ leads, properties }) => {
  const [days, setDays] = useState<Range>(7);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    return subscribeEvents(days, (l) => { setEvents(l); setLoaded(true); });
  }, [days]);

  const views = byType(events, 'unit_view');
  const asks = byType(events, 'unit_whatsapp', 'unit_call', 'viewing_request');
  const units = useMemo(() => unitInterest(events), [events]);
  const speed = useMemo(() => responseSpeed(events), [events]);
  const sources = useMemo(() => sourcePerformance(events), [events]);

  /* الوحدات اللي بتتشاف ومحدش بيسأل عليها — أوضح إشارة على سعر غلط */
  const coldUnits = useMemo(
    () => units.filter((u) => u.views >= 3 && u.asks === 0).sort((a, b) => b.views - a.views).slice(0, 8),
    [units],
  );
  const hotUnits = useMemo(
    () => units.filter((u) => u.asks > 0).sort((a, b) => b.askRate - a.askRate || b.asks - a.asks).slice(0, 8),
    [units],
  );

  /* الليدات الراكدة: عدّى ميعادها ومحدش قربلها */
  const stale = useMemo(() => {
    const now = Date.now();
    return leads
      .filter((l) => l.status !== 'closed' && l.status !== 'lost' && l.followUpStatus !== 'completed')
      .filter((l) => typeof l.nextActionAt === 'number' && l.nextActionAt < now)
      .map((l) => ({ ...l, lateDays: Math.floor((now - (l.nextActionAt || now)) / 86400000) }))
      .sort((a, b) => b.lateDays - a.lateDays)
      .slice(0, 10);
  }, [leads]);

  const allGaps = speed.flatMap((s) => (s.medianMinutes !== null ? [s.medianMinutes] : []));
  const teamMedian = median(allGaps);
  const series = useMemo(() => dailySeries(events, ['unit_view'], days), [events, days]);

  if (!loaded) {
    return <p className="py-16 text-center text-sm text-[#6B665C]">جاري تحميل الأحداث...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="py-14 px-6 text-center bg-white border border-dashed border-[#DCD6CA] rounded-3xl space-y-3">
        <Inbox size={34} className="mx-auto text-[#A07A26]" />
        <p className="font-extrabold text-[#141414]">لسه مفيش أحداث متسجّلة</p>
        <p className="text-sm text-[#6B665C] leading-relaxed max-w-md mx-auto">
          التتبع بيبدأ يجمّع من أول ما الكود يتنشر. افتح أي شقة من الموقع دلوقتي،
          وارجع هنا هتلاقي الرقم زاد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* المدى الزمني */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-[#6B665C]">المدة:</span>
        {([7, 30, 90] as Range[]).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
              days === d ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#4A463F] border-[#ECE8DF]'
            }`}
          >
            آخر {d} يوم
          </button>
        ))}
        <span className="text-[11px] text-[#8C877D] mr-auto">{n(events.length)} حدث</span>
      </div>

      {/* الأرقام الرئيسية */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="زوار مختلفين" value={n(uniqueVisitors(views))} sub={`${n(views.length)} مشاهدة`} Icon={Eye} />
        <Tile label="سألوا فعلاً" value={n(asks.length)} sub={views.length ? `${Math.round((asks.length / views.length) * 100)}٪ من اللي شافوا` : '—'} Icon={Flame} />
        <Tile
          label="وسيط أول اتصال"
          value={mins(teamMedian)}
          sub={speedTone(teamMedian).label}
          tone={speedTone(teamMedian).c}
          Icon={Timer}
        />
        <Tile label="ليدات راكدة" value={n(stale.length)} sub="عدّى ميعادها" tone={stale.length ? BAD : GOOD} Icon={AlertTriangle} />
      </div>

      <Spark data={series} />

      {/* ============ الفريق ============ */}
      <Section title="الفريق" hint="سرعة أول اتصال أقوى مؤشر على الإقفال. الليد اللي بيترد عليه في ربع ساعة بيقفل أضعاف اللي بيترد عليه بعد ساعة." Icon={Users}>
        {speed.length === 0 ? (
          <Empty text="لسه مفيش ليدات اتسجّلت في المدة دي." />
        ) : (
          <div className="space-y-2">
            {speed.map((s) => {
              const t = speedTone(s.medianMinutes);
              const pct = s.leads ? Math.round((s.within15 / s.leads) * 100) : 0;
              return (
                <div key={s.actorId} className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-extrabold text-[#141414]">{s.actorName}</p>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ color: t.c, borderColor: t.c }}>
                      {t.label} · {mins(s.medianMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#6B665C] flex-wrap">
                    <span><b className="text-[#141414] font-mono">{n(s.leads)}</b> ليد</span>
                    <span><b className="text-[#141414] font-mono">{n(s.contacted)}</b> اترد عليهم</span>
                    <span><b className="font-mono" style={{ color: pct >= 60 ? GOOD : pct >= 30 ? WARN : BAD }}>{pct}٪</b> خلال ربع ساعة</span>
                  </div>
                  <Bar pct={pct} color={pct >= 60 ? GOOD : pct >= 30 ? WARN : BAD} />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {stale.length > 0 && (
        <Section title="ليدات واقفة" hint="دول عدّى ميعاد متابعتهم ومحدش قرّبلهم. كل يوم زيادة بيقلّل فرصة الإقفال." Icon={AlertTriangle}>
          <div className="bg-white border border-[#ECE8DF] rounded-2xl divide-y divide-[#F2EFE9]">
            {stale.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#141414] truncate">{l.name}</p>
                  <p className="text-[11px] text-[#6B665C]">{l.assignedAgentName || 'غير مسند'}</p>
                </div>
                <span className="text-xs font-bold font-mono shrink-0" style={{ color: l.lateDays >= 3 ? BAD : WARN }}>
                  متأخر {l.lateDays === 0 ? 'أقل من يوم' : `${l.lateDays} يوم`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ============ الوحدات ============ */}
      <Section title="وحدات بتتشاف ومحدش بيسأل" hint="دي أوضح إشارة على إن السعر غلط أو الصور ضعيفة. الناس بتدخل وبتخرج من غير ما تسأل." Icon={TrendingDown}>
        {coldUnits.length === 0 ? (
          <Empty text="مفيش وحدة اتشافت ٣ مرات أو أكتر من غير سؤال. ده كويس." />
        ) : (
          <div className="bg-white border border-[#ECE8DF] rounded-2xl divide-y divide-[#F2EFE9]">
            {coldUnits.map((u) => {
              const p = properties.find((x) => x.id === u.propertyId);
              return (
                <div key={u.propertyId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#141414]">{u.code}</p>
                    <p className="text-[11px] text-[#6B665C] truncate">
                      {u.neighborhood}{p?.price ? ` · ${n(p.price)} ج.م` : ''}{p?.pricePerMeter ? ` · ${n(p.pricePerMeter)} للمتر` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono shrink-0" style={{ color: BAD }}>
                    {n(u.views)} مشاهدة · صفر سؤال
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="أعلى الوحدات تحويلاً" hint="نسبة اللي سألوا من اللي شافوا. الوحدة دي سعرها وصورها شغالين — كرّر نفس الحاجة." Icon={Building2}>
        {hotUnits.length === 0 ? (
          <Empty text="لسه محدش سأل على أي وحدة في المدة دي." />
        ) : (
          <div className="space-y-2">
            {hotUnits.map((u) => (
              <div key={u.propertyId} className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-sm text-[#141414]">{u.code} <span className="font-medium text-[#6B665C]">· {u.neighborhood}</span></p>
                  <span className="text-xs font-bold font-mono" style={{ color: GOOD }}>{u.askRate}٪ سألوا</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#6B665C]">
                  <span>{n(u.views)} مشاهدة</span>
                  <span>{n(u.visitors)} زائر</span>
                  <span>{n(u.asks)} سؤال</span>
                </div>
                <Bar pct={Math.min(100, u.askRate)} color={GOOD} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ============ المصادر ============ */}
      <Section title="المصادر" hint="المهم مش كام ليد جاب — كام صفقة قفل. كامبين بخمسين ليد بيقفل تلاتة أحسن من واحد بميتين ليد بيقفل واحد." Icon={Megaphone}>
        {sources.length === 0 ? (
          <Empty text="لسه مفيش ليدات متسجّلة بمصدر." />
        ) : (
          <div className="overflow-x-auto bg-white border border-[#ECE8DF] rounded-2xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B665C] border-b border-[#ECE8DF]">
                  <th className="text-right font-bold px-4 py-3">المصدر</th>
                  <th className="font-bold px-2 py-3">ليدات</th>
                  <th className="font-bold px-2 py-3">اترد</th>
                  <th className="font-bold px-2 py-3">عروض</th>
                  <th className="font-bold px-2 py-3">معاينات</th>
                  <th className="font-bold px-2 py-3">صفقات</th>
                  <th className="font-bold px-3 py-3">نسبة الإقفال</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source} className="border-b border-[#F2EFE9] last:border-0">
                    <td className="text-right font-bold text-[#141414] px-4 py-3">{s.source}</td>
                    <td className="text-center font-mono px-2 py-3">{n(s.leads)}</td>
                    <td className="text-center font-mono px-2 py-3">{n(s.contacted)}</td>
                    <td className="text-center font-mono px-2 py-3">{n(s.offers)}</td>
                    <td className="text-center font-mono px-2 py-3">{n(s.viewings)}</td>
                    <td className="text-center font-mono font-bold px-2 py-3" style={{ color: s.won ? GOOD : MUTED }}>{n(s.won)}</td>
                    <td className="text-center font-mono font-bold px-3 py-3" style={{ color: s.winRate >= 5 ? GOOD : s.winRate > 0 ? WARN : MUTED }}>
                      {s.winRate}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
};

/* ---------- عناصر ---------- */

const Tile: React.FC<{ label: string; value: string; sub?: string; tone?: string; Icon: typeof Eye }> = ({ label, value, sub, tone, Icon }) => (
  <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-1">
    <div className="flex items-center gap-1.5 text-[#8C877D]">
      <Icon size={13} />
      <span className="text-[11px] font-bold">{label}</span>
    </div>
    <p className="text-2xl font-extrabold font-mono" style={{ color: tone || INK }}>{value}</p>
    {sub && <p className="text-[11px] text-[#6B665C]">{sub}</p>}
  </div>
);

const Section: React.FC<{ title: string; hint: string; Icon: typeof Eye; children: React.ReactNode }> = ({ title, hint, Icon, children }) => (
  <div className="space-y-2.5">
    <div className="flex items-start gap-2">
      <Icon size={16} className="text-[#A07A26] shrink-0 mt-0.5" />
      <div>
        <p className="font-extrabold text-[#141414]">{title}</p>
        <p className="text-[11px] text-[#6B665C] leading-relaxed max-w-2xl">{hint}</p>
      </div>
    </div>
    {children}
  </div>
);

const Bar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div className="h-2 bg-[#F2EFE9] rounded-full overflow-hidden" role="img" aria-label={`${pct}٪`}>
    <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="bg-white border border-dashed border-[#DCD6CA] rounded-2xl px-4 py-6 text-center text-xs text-[#6B665C]">{text}</p>
);

/** خط المشاهدات اليومي — أعمدة رفيعة، من غير محاور مزدحمة */
const Spark: React.FC<{ data: { day: string; n: number }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#141414]">المشاهدات كل يوم</p>
        <p className="text-[11px] text-[#6B665C]"><b className="font-mono text-[#141414]">{n(total)}</b> إجمالي</p>
      </div>
      <div className="flex items-end gap-[3px] h-20" dir="ltr">
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
