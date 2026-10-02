// Manateq Radar — الشاشات: الخريطة · النبض · المطوّرون · الاستقبال · اسأل · المعايير
import { useEffect, useMemo, useRef, useState } from 'react';
import { answer } from './ask';
import { DEVELOPERS, MARKET, ZONES } from './data';
import { DAY, FIELD_NAMES, GRADE_WORD, THRESHOLDS, developerState, fmt, fmtMoney, isLive, pct, relDays, stampDate, verdict } from './engine';
import { CORE_FIELDS, coverage, ingest } from './parser';
import { radar, useRadar } from './store';
import { DeveloperTile, Figure, PriceLine, SourceStamp, haptic, useLang } from './ui';
import type { EventType, Extracted, Lang, RadarEvent, Zone } from './types';

export const TYPE_LABEL: Record<EventType, { ar: string; en: string }> = {
  launch: { ar: 'إطلاق جديد', en: 'New launch' },
  price_update: { ar: 'تحديث سعر', en: 'Price update' },
  discount: { ar: 'خصم', en: 'Discount' },
  limited_offer: { ar: 'عرض مؤقت', en: 'Limited offer' },
  unit_available: { ar: 'وحدة متاحة', en: 'Unit available' },
  limited_units: { ar: 'وحدات محدودة', en: 'Limited units' },
  construction_update: { ar: 'تحديث إنشاءات', en: 'Construction update' },
  corporate: { ar: 'حدث مؤسسي', en: 'Corporate' },
  repeat: { ar: 'تكرار', en: 'Repeat' },
};

const TYPE_WEIGHT: Record<EventType, number> = {
  launch: 9, discount: 8, limited_offer: 8, price_update: 7, limited_units: 6, unit_available: 5, construction_update: 3, corporate: 1, repeat: 0,
};

function zoneOf(e: RadarEvent): Zone | undefined {
  return ZONES.find((z) => z.id === e.fields.zoneId);
}

// ───────────────────────── سطر حدث ─────────────────────────

export function EventRow({ e, all, onOpen, now }: { e: RadarEvent; all: RadarEvent[]; onOpen: (e: RadarEvent) => void; now: number }) {
  const { lang, tx } = useLang();
  const z = zoneOf(e);
  const v = z ? verdict(e, z, MARKET, all, now) : null;
  const fresh = now - Date.parse(e.receivedAt) < DAY && e.importance === 'real';
  const f = e.fields;
  const title = [f.developer, f.project].filter(Boolean).join(' · ') || e.source.name;
  return (
    <button className={`mr-row ${e.importance === 'repeat' ? 'repeat' : ''}`} onClick={() => onOpen(e)}>
      <span className={`mr-dot lead-dot ${fresh ? 'beat' : ''}`} style={{ background: fresh ? undefined : 'var(--hairline)' }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="rt">{title}</span>
          <span className={`mr-tag ${e.type === 'launch' || e.type === 'discount' || e.type === 'limited_offer' ? 'pulse' : ''}`}>{TYPE_LABEL[e.type][lang]}</span>
          {v && (
            <span className={`mr-tag ${v.grade === 'opportunity' ? 'ok' : v.grade === 'fair' ? 'fair' : 'bad'}`}>
              <span className="pip" />
              {GRADE_WORD[v.grade][lang]}
            </span>
          )}
        </span>
        <span className="rf small muted">
          {z && <span>{z.name[lang]}{f.district ? ` · ${f.district}` : ''}</span>}
          {f.area && <span className="num">{fmt(f.area)} m²</span>}
          {f.price && f.area && <span className="num">{fmt(Math.round(f.price / f.area))} /m²</span>}
          {f.downPct !== undefined && <span className="num">{fmt(f.downPct)}% · {fmt(f.months ?? 0)}m</span>}
        </span>
        <span style={{ display: 'block', marginTop: 4 }}>
          <SourceStamp source={e.source} />
        </span>
      </span>
      <span style={{ textAlign: 'end' }}>
        {f.price ? <span className="figure-sm num" style={{ display: 'block' }}>{fmtMoney(f.price, lang)}</span> : null}
        <span className="stamp">{relDays(e.receivedAt, lang, now)}</span>
        {e.importance === 'repeat' && <span className="stamp" style={{ display: 'block' }}>{tx('إعادة نشر', 'reposted')}</span>}
      </span>
    </button>
  );
}

// ───────────────────────── الخريطة ─────────────────────────

export function MapView({ onOpen, onDeveloper }: { onOpen: (e: RadarEvent) => void; onDeveloper: (name: string) => void }) {
  const { lang, tx } = useLang();
  const { all } = useRadar();
  const now = Date.now();
  const [zoneId, setZoneId] = useState<string>('mokattam');
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const mapScroll = useRef<HTMLDivElement | null>(null);
  // على الموبايل الخريطة أعرض من الشاشة: المنطقة المختارة تنتقل لمنتصف الإطار.
  useEffect(() => {
    const el = mapScroll.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const left = (zone.x / 1000) * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, left);
  }, [zone]);

  const stats = useMemo(
    () =>
      Object.fromEntries(
        ZONES.map((z) => {
          const evs = all.filter((e) => e.fields.zoneId === z.id && e.importance === 'real');
          const first = z.history[0].ppm;
          const last = z.history[z.history.length - 1].ppm;
          const growth = ((last - first) / first) * 100;
          const fresh = evs.filter((e) => now - Date.parse(e.receivedAt) < DAY).length;
          const live = evs.filter((e) => e.fields.price && e.fields.area && isLive(e, now));
          const yieldPct = ((z.rentPpmMonthly * 12) / z.avgPpm) * 100;
          return [z.id, { growth, fresh, live, evs, yieldPct }];
        }),
      ),
    [all, now],
  );
  const s = stats[zoneId];
  const zoneDevs = DEVELOPERS.filter((d) => d.zoneIds.includes(zoneId) || all.some((e) => e.fields.developer === d.name && e.fields.zoneId === zoneId))
    .map((d) => ({ d, st: developerState(d.name, all.filter((e) => e.fields.zoneId === zoneId), now) }))
    .sort((a, b) => b.st.activity - a.st.activity);

  return (
    <>
      <section className="mr-section" style={{ marginTop: 32 }}>
        <div className="mr-section-head">
          <div>
            <h1 className="display-xl">{tx('السوق، مقاساً.', 'The market, measured.')}</h1>
            <p className="mr-lead">
              {tx(
                'كل منطقة تحت غيمة. المرور أو الضغط يفتحها: سعر المتر، اتجاه العائد، ونبض اليوم. كل رقم بمصدره وتاريخه.',
                'Every zone sits under a cloud. Hover or tap to lift it: price per m², yield direction and today’s pulse. Every number carries its source and date.',
              )}
            </p>
          </div>
        </div>

        <div className="mr-split">
          <div className="mr-map">
            <div className="mr-map-scroll" dir="ltr" ref={mapScroll}
            >
              <CairoMap selected={zoneId} onSelect={setZoneId} stats={stats} lang={lang} />
            </div>
            <div className="mr-zone-chips" role="group" aria-label={tx('المناطق', 'Zones')}>
              {ZONES.map((z) => (
                <button key={z.id} aria-pressed={zoneId === z.id} onClick={() => setZoneId(z.id)}>
                  {z.name[lang]}
                </button>
              ))}
            </div>
            <div className="mr-map-legend">
              <span className="stamp">{tx('مخطط تقريبي للقاهرة الكبرى — ليس للقياس', 'Schematic of Greater Cairo — not to scale')}</span>
            </div>
          </div>

          <div className="mr-card lg" key={zoneId} style={{ animation: 'mr-in 260ms var(--ease-settle) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <h2 className="display-lg">{zone.name[lang]}</h2>
              {s.fresh > 0 ? (
                <span className="mr-tag pulse">
                  <span className="mr-dot beat" />
                  {tx(`${fmt(s.fresh)} جديد اليوم`, `${s.fresh} new today`)}
                </span>
              ) : (
                <span className="mr-tag">{tx('هادئة اليوم', 'Quiet today')}</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
              <Figure key={`p${zoneId}`} value={zone.avgPpm} label={tx('متوسط سعر المتر', 'Avg price / m²')} unit="EGP/m²" size="figure" live source={zone.source} />
              <Figure key={`y${zoneId}`} value={s.yieldPct} digits={1} label={tx('العائد الإيجاري (Rental Yield)', 'Rental yield')} unit="%" size="figure" source={{ ...zone.source, kind: 'computed', name: tx('إيجار ÷ سعر', 'rent ÷ price') }} />
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="label">{tx('خط الأسعار — 12 شهراً', 'Price line — 12 months')}</span>
                <span className={`figure-sm num ${s.growth >= 0 ? '' : ''}`} style={{ color: s.growth >= 0 ? 'var(--verdict-opportunity)' : 'var(--verdict-inflated)' }}>
                  {s.growth >= 0 ? '▲' : '▼'} {fmt(Math.abs(s.growth), 1)}%
                </span>
              </div>
              <PriceLine points={zone.history} />
              <SourceStamp source={zone.source} extra={tx('شهري', 'monthly')} />
            </div>
            <hr className="mr-rule" style={{ margin: '20px 0' }} />
            <span className="label">{tx('مطوّرو المنطقة', 'Developers here')}</span>
            <div className="mr-tiles" style={{ marginTop: 10, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
              {zoneDevs.slice(0, 6).map(({ d, st }) => (
                <DeveloperTile key={d.id} name={d.name} initials={d.initials} state={st.state} count={st.newCount} last={st.last} onClick={() => onDeveloper(d.name)} />
              ))}
            </div>
            {s.live.length > 0 && (
              <>
                <hr className="mr-rule" style={{ margin: '20px 0' }} />
                <span className="label">{tx('وحدات حيّة', 'Live units')}</span>
                <div className="mr-feed">
                  {s.live.slice(0, 3).map((e) => (
                    <EventRow key={e.id} e={e} all={all} onOpen={onOpen} now={now} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-section-head">
          <div>
            <h2 className="display-sm">{tx('تكلفة الفرصة البديلة', 'Opportunity cost')}</h2>
            <p className="mr-lead small">{tx('العقار لا يُقارَن بعقار فقط، بل بما كان يمكن أن تفعله النقود بدلاً منه.', 'Property is compared not only with property but with what the money could do instead.')}</p>
          </div>
        </div>
        <div className="mr-strip">
          {MARKET.alternatives.map((a) => (
            <div key={a.id}>
              <Figure value={a.rate} digits={0} label={a.name[lang]} unit={tx('% سنوياً', '% / yr')} size="figure" source={a.source} stampExtra={`${tx('سيولة', 'liquidity')}: ${a.liquidity[lang]}`} />
            </div>
          ))}
          <div>
            <Figure value={MARKET.inflation.rate} label={tx('التضخّم', 'Inflation')} unit="%" size="figure" source={MARKET.inflation.source} />
          </div>
        </div>
      </section>
    </>
  );
}

function CairoMap({ selected, onSelect, stats, lang }: { selected: string; onSelect: (id: string) => void; stats: Record<string, { growth: number; fresh: number; yieldPct: number }>; lang: Lang }) {
  const dots = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = 20; x < 1000; x += 32) for (let y = 20; y < 560; y += 32) out.push([x, y]);
    return out;
  }, []);
  return (
    <svg viewBox="0 0 1000 560" role="group" aria-label={lang === 'ar' ? 'خريطة القاهرة الكبرى' : 'Greater Cairo map'} style={{ direction: 'ltr' }}>
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="grid-dot" cx={x} cy={y} r={1.2} />
      ))}
      <path className="nile" d="M330,580 C340,470 300,400 320,320 C335,250 300,180 310,90 C315,40 300,10 290,-20" />
      <ellipse className="ring" cx="420" cy="280" rx="300" ry="190" />
      <text className="ref" x="345" y="268">{lang === 'ar' ? 'وسط البلد' : 'DOWNTOWN'}</text>
      <circle cx="400" cy="276" r="3" fill="var(--ink-faint)" />
      <text className="ref" x="262" y="470">{lang === 'ar' ? 'النيل' : 'NILE'}</text>
      {ZONES.map((z) => {
        const st = stats[z.id];
        const open = selected === z.id;
        const up = st.growth >= 0;
        return (
          <g
            key={z.id}
            className={`mr-zone ${open ? 'open' : ''}`}
            tabIndex={0}
            role="button"
            aria-pressed={open}
            aria-label={`${z.name[lang]} — ${fmt(z.avgPpm)} EGP/m²`}
            onClick={() => onSelect(z.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(z.id))}
          >
            <circle className="halo" cx={z.x} cy={z.y} r={20} />
            {st.fresh > 0 && <circle className="newring" cx={z.x} cy={z.y} r={14} />}
            <circle className="core" cx={z.x} cy={z.y} r={open ? 7 : 5} />
            <g className="cloud">
              <circle cx={z.x - 26} cy={z.y + 4} r={30} />
              <circle cx={z.x + 4} cy={z.y - 14} r={38} />
              <circle cx={z.x + 34} cy={z.y + 6} r={28} />
              <circle cx={z.x + 2} cy={z.y + 22} r={30} />
            </g>
            <text className="zname veil" x={z.x + 4} y={z.y + 8} textAnchor="middle" style={{ fill: 'var(--ink-muted)' }}>{z.name[lang]}</text>
            <g className="reveal">
              <text className="zname" x={z.x} y={z.y - 30} textAnchor="middle">{z.name[lang]}</text>
              <text className="zfig" x={z.x} y={z.y + 32} textAnchor="middle">{fmt(Math.round(z.avgPpm / 100) / 10, 1)}k/m²</text>
              <text className={`zarrow ${up ? 'up' : 'down'}`} x={z.x} y={z.y + 50} textAnchor="middle">
                {up ? '▲' : '▼'} {fmt(st.yieldPct, 1)}%
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ───────────────────────── النبض ─────────────────────────

export function PulseView({ onOpen }: { onOpen: (e: RadarEvent) => void }) {
  const { lang, tx } = useLang();
  const { all } = useRadar();
  const now = Date.now();
  const [showRepeats, setShowRepeats] = useState(false);
  const [zone, setZone] = useState<string>('all');
  const scoped = all.filter((e) => zone === 'all' || e.fields.zoneId === zone);
  const live = scoped.filter((e) => isLive(e, now) && (showRepeats || e.importance === 'real'));
  const archived = scoped.filter((e) => !isLive(e, now) && e.importance === 'real');
  const repeats = scoped.filter((e) => e.importance === 'repeat').length;
  const zName = zone === 'all' ? tx('السوق', 'the market') : ZONES.find((z) => z.id === zone)!.name[lang];
  const lastMove = scoped.filter((e) => e.importance === 'real')[0];
  const todays = live.filter((e) => now - Date.parse(e.receivedAt) < DAY && e.importance === 'real');
  return (
    <section className="mr-section" style={{ marginTop: 32 }}>
      <div className="mr-section-head">
        <div>
          <h1 className="display-lg">{tx('نبض السوق', 'Market pulse')}</h1>
          <p className="mr-lead">{tx('الأحداث الحقيقية فقط، الأحدث أولاً. التكرار يُستبعد، والعروض المنتهية تُؤرشف تلقائياً.', 'Real events only, newest first. Repeats are filtered; expired offers archive themselves.')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="mr-input" style={{ width: 'auto', height: 36, padding: '0 10px' }} value={zone} onChange={(e) => setZone(e.target.value)} aria-label={tx('المنطقة', 'Zone')}>
            <option value="all">{tx('كل المناطق', 'All zones')}</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>{z.name[lang]}</option>
            ))}
          </select>
          <button className="mr-chip-btn" style={{ height: 36 }} aria-pressed={showRepeats} onClick={() => setShowRepeats((s) => !s)}>
            {showRepeats ? tx('إخفاء التكرار', 'Hide repeats') : tx(`أظهر التكرار (${fmt(repeats)})`, `Show repeats (${repeats})`)}
          </button>
        </div>
      </div>
      <div className="mr-strip" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginBottom: 24 }}>
        <div><Figure value={todays.length} label={tx('حدث حقيقي اليوم', 'Real events today')} live={todays.length > 0} size="figure" /></div>
        <div><Figure value={live.filter((e) => e.importance === 'real').length} label={tx('عرض حيّ', 'Live offers')} size="figure" /></div>
        <div><Figure value={repeats} label={tx('تكرار استُبعد', 'Repeats filtered')} size="figure" /></div>
      </div>
      <div className="mr-card">
        {live.length ? (
          <div className="mr-feed">
            {live.map((e) => (
              <EventRow key={e.id} e={e} all={all} onOpen={onOpen} now={now} />
            ))}
          </div>
        ) : (
          <p className="mr-empty">
            {tx(`مفيش جديد في ${zName} النهارده`, `Nothing new in ${zName} today`)}
            {lastMove ? tx(` — آخر حركة كانت ${relDays(lastMove.receivedAt, 'ar', now)}`, ` — the last move was ${relDays(lastMove.receivedAt, 'en', now)}`) : ''}.
          </p>
        )}
      </div>
      {archived.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary className="label" style={{ cursor: 'pointer' }}>{tx(`الأرشيف — ${fmt(archived.length)} عرض انتهى`, `Archive — ${archived.length} expired`)}</summary>
          <div className="mr-card" style={{ marginTop: 12 }}>
            <div className="mr-feed">
              {archived.map((e) => (
                <EventRow key={e.id} e={e} all={all} onOpen={onOpen} now={now} />
              ))}
            </div>
          </div>
        </details>
      )}
    </section>
  );
}

// ───────────────────────── المطوّرون ─────────────────────────

export function DevelopersView({ selected, onSelect, onOpen, onAsk }: { selected: string | null; onSelect: (n: string | null) => void; onOpen: (e: RadarEvent) => void; onAsk: (q: string) => void }) {
  const { lang, tx } = useLang();
  const { all } = useRadar();
  const now = Date.now();
  const tiles = DEVELOPERS.map((d) => ({ d, st: developerState(d.name, all, now) })).sort((a, b) => b.st.activity - a.st.activity || a.d.name.localeCompare(b.d.name));
  const dev = selected ? DEVELOPERS.find((d) => d.name === selected) : null;
  const mine = dev ? all.filter((e) => e.fields.developer === dev.name) : [];
  // آخر التحديثات مرتّبة بالأهمية لا بالأحدثية
  const byImportance = [...mine].filter((e) => e.importance === 'real').sort((a, b) => TYPE_WEIGHT[b.type] - TYPE_WEIGHT[a.type] || b.receivedAt.localeCompare(a.receivedAt));
  const timeline = mine
    .filter((e) => e.importance === 'real' && e.fields.price && e.fields.area)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    .map((e) => ({ date: e.receivedAt, ppm: Math.round(e.fields.price! / e.fields.area!) }));
  const units = mine.filter((e) => e.importance === 'real' && e.fields.price && isLive(e, now));
  return (
    <section className="mr-section" style={{ marginTop: 32 }}>
      <div className="mr-section-head">
        <div>
          <h1 className="display-lg">{tx('مربّعات المطوّرين', 'Developer tiles')}</h1>
          <p className="mr-lead">{tx('بديل قائمة الواتساب: مربّع لكل مطوّر، لونه يقول حالته، مرتّبة بالحركة لا بالأبجدية. أحمر نابض = إطلاق أو خصم اليوم · ذهبي = تحرّك · رمادي = لا جديد منذ ثلاثة أيام.', 'Instead of a WhatsApp list: one tile per developer, its colour is its state, ordered by activity not alphabet. Pulsing = launch or discount today · gold = moved · grey = nothing new in three days.')}</p>
        </div>
      </div>
      <div className="mr-tiles wide">
        {tiles.map(({ d, st }) => (
          <DeveloperTile key={d.id} name={d.name} initials={d.initials} state={st.state} count={st.newCount} last={st.last} pressed={selected === d.name} onClick={() => onSelect(selected === d.name ? null : d.name)} />
        ))}
      </div>
      {dev && (
        <div className="mr-split" style={{ marginTop: 24 }} key={dev.id}>
          <div className="mr-card lg" style={{ animation: 'mr-in 260ms var(--ease-settle) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 className="display-sm">{tx(`ملف ${dev.name}`, `${dev.name} profile`)}</h2>
              <button className="mr-btn ghost" onClick={() => onAsk(tx(`ايه الجديد عند ${dev.name} الأسبوع ده؟`, `What changed at ${dev.name} this week?`))}>
                {tx('اسأل عن هذا المطوّر', 'Ask about this developer')}
              </button>
            </div>
            <p className="label" style={{ marginTop: 20 }}>{tx('آخر التحديثات — بالأهمية', 'Latest updates — by importance')}</p>
            {byImportance.length ? (
              <div className="mr-feed">
                {byImportance.map((e) => (
                  <EventRow key={e.id} e={e} all={all} onOpen={onOpen} now={now} />
                ))}
              </div>
            ) : (
              <p className="mr-empty">{tx(`لا رسائل من ${dev.name} بعد.`, `No messages from ${dev.name} yet.`)}</p>
            )}
          </div>
          <div className="mr-grid">
            <div className="mr-card">
              <p className="label">{tx('الخط الزمني السعري', 'Price timeline')}</p>
              {timeline.length >= 2 ? (
                <>
                  <PriceLine points={timeline} height={110} />
                  <span className="stamp">{tx('سعر المتر المعلن لكل رسالة', 'Declared EGP/m² per message')} · n={timeline.length}</span>
                </>
              ) : (
                <p className="small muted" style={{ marginTop: 8 }}>{tx('يحتاج الخط رسالتين بسعر على الأقل.', 'The line needs at least two priced messages.')}</p>
              )}
            </div>
            <div className="mr-card">
              <p className="label">{tx('الوحدات المتاحة', 'Available units')}</p>
              <p className="figure" style={{ marginTop: 6 }}><span className="num">{fmt(units.length)}</span></p>
              <p className="small muted">{tx('التصنيف داخل المنطقة محلّي لا عام: الالتزام بالتسليم · جودة التنفيذ · ثبات السعر · وضوح التعاقد · ما بعد البيع — يُفعَّل مع الريلز الميدانية.', 'Ranking is local, not global: delivery record · build quality · price stability · contract clarity · after-sales — enabled with field reels.')}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── الاستقبال ─────────────────────────

const SAMPLE = `إطلاق جديد Verona — المقطم، الحي السادس
شقة 145 م² · 3 غرف
السعر 3,190,000 ج.م
مقدم 20% وتقسيط على 6 سنوات، قسط ربع سنوي
صيانة 8%
استلام 2027
عمولة 3%`;

export function IntakeView({ onOpen, toast }: { onOpen: (e: RadarEvent) => void; toast: (s: string) => void }) {
  const { lang, tx } = useLang();
  const st = useRadar();
  const [raw, setRaw] = useState('');
  const [sender, setSender] = useState('');
  const preview = useMemo(() => (raw.trim().length > 8 ? ingest(raw, { sender: sender || 'Manual', history: st.all }) : null), [raw, sender, st.all]);
  const cov = preview ? coverage(preview.fields) : 0;
  const now = Date.now();
  const submit = () => {
    const ev = radar.receive(raw.trim(), sender.trim() || 'Manual');
    haptic();
    setRaw('');
    if (ev) {
      toast(ev.importance === 'repeat' ? tx('اتسجّلت كتكرار — مش هتظهر في النبض', 'Saved as a repeat — hidden from the pulse') : tx('اتسجّل الحدث', 'Event recorded'));
      onOpen(ev);
    } else toast(tx('التشغيل موقوف — الرسالة في الطابور', 'Paused — message queued'));
  };
  return (
    <section className="mr-section" style={{ marginTop: 32 }}>
      <div className="mr-section-head">
        <div>
          <h1 className="display-lg">{tx('الاستقبال', 'Intake')}</h1>
          <p className="mr-lead">{tx('الصق رسالة سيلز كما وصلت — عربي أو إنجليزي أو الاتنين. الرادار يستخرج الحقول العشرة ويصنّفها على أربعة محاور، وأنت تعتمد.', 'Paste a sales message as received — Arabic, English or both. The radar extracts the ten fields, classifies it on four axes, and you approve.')}</p>
        </div>
        <div className="mr-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`mr-dot ${st.paused ? '' : 'beat'}`} style={{ background: st.paused ? 'var(--ink-faint)' : undefined }} />
          <span className="small">{st.paused ? tx(`موقوف · ${fmt(st.queue.length)} في الطابور`, `Paused · ${st.queue.length} queued`) : tx('التشغيل مفعّل', 'Running')}</span>
          <button className="mr-link" onClick={() => radar.setPaused(!st.paused)}>{st.paused ? tx('شغّل', 'Resume') : tx('أوقف', 'Pause')}</button>
        </div>
      </div>
      <div className="mr-split">
        <div className="mr-card">
          <label className="label" htmlFor="mr-raw">{tx('نص الرسالة', 'Message text')}</label>
          <textarea id="mr-raw" className="mr-textarea" style={{ marginTop: 8 }} dir="auto" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={SAMPLE} />
          <label className="label" htmlFor="mr-sender" style={{ display: 'block', marginTop: 16 }}>{tx('المرسِل · الشركة', 'Sender · company')}</label>
          <input id="mr-sender" className="mr-input" style={{ marginTop: 8 }} dir="auto" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Shady Azmy · Xland" />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="mr-btn" disabled={!preview} onClick={submit}>{tx('اعتمد وسجّل', 'Approve & record')}</button>
            <button className="mr-btn ghost" onClick={() => { setRaw(SAMPLE); setSender('Shady Azmy · Xland'); }}>{tx('جرّب رسالة مثال', 'Try a sample')}</button>
          </div>
          <p className="stamp" style={{ marginTop: 12 }}>{tx('التشغيل يُجدول على ذروة النشر (الصباح والمساء)، والإيقاف لا يُضيّع رسالة: تتراكم وتُقرأ عند التشغيل.', 'Runs on the posting peaks (morning and evening); pausing loses nothing — messages queue and are read on resume.')}</p>
        </div>
        <div className="mr-card">
          {!preview ? (
            <p className="mr-empty">{tx('القراءة تظهر هنا أثناء الكتابة.', 'The reading appears here as you type.')}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="label">{tx('جودة القراءة', 'Read quality')}</span>
                <span className="figure-sm num">{cov}/10</span>
              </div>
              <div className="mr-meter" style={{ marginTop: 8 }}><span style={{ width: `${cov * 10}%` }} /></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                <span className="mr-tag pulse">{TYPE_LABEL[preview.type][lang]}</span>
                <span className="mr-tag">{preview.importance === 'real' ? tx('حدث حقيقي', 'Real event') : tx('إعادة نشر', 'Repost')}</span>
                {preview.audiences.map((a) => (
                  <span key={a} className="mr-tag">{{ investor: tx('مستثمر', 'Investor'), broker: tx('بروكر', 'Broker'), client: tx('عميل', 'Client') }[a]}</span>
                ))}
                <span className="mr-tag">{preview.expiresAt ? `${tx('ينتهي', 'Expires')} ${stampDate(preview.expiresAt)}` : tx('لا ينتهي', 'Permanent')}</span>
              </div>
              <table className="mr-fields" style={{ marginTop: 16 }}>
                <tbody>
                  {CORE_FIELDS.concat(['rooms', 'installment', 'frequency', 'garage', 'club', 'cashDiscountPct', 'commissionPct', 'incentive'] as (keyof Extracted)[]).map((k) => {
                    const val = preview.fields[k];
                    if (val === undefined && !CORE_FIELDS.includes(k)) return null;
                    return (
                      <tr key={k} className={val === undefined ? 'miss' : ''}>
                        <td>{FIELD_NAMES[k][lang]}</td>
                        <td className={typeof val === 'number' ? 'num' : ''}>{display(k, val, lang)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <div className="mr-section" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="label">{tx(`ما سجّلته على هذا الجهاز — ${fmt(st.events.length)}`, `Recorded on this device — ${st.events.length}`)}</span>
          <button className="mr-link" onClick={() => radar.setShowSeed(!st.showSeed)}>{st.showSeed ? tx('أخفِ العيّنة التجريبية', 'Hide demo sample') : tx('أظهر العيّنة التجريبية', 'Show demo sample')}</button>
        </div>
        <div className="mr-card">
          {st.events.length ? (
            <div className="mr-feed">
              {[...st.events].reverse().map((e) => (
                <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}><EventRow e={e} all={st.all} onOpen={onOpen} now={now} /></div>
                  <button className="mr-chip-btn" aria-label={tx('احذف', 'Delete')} onClick={() => radar.remove(e.id)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mr-empty">{tx('لسه ما سجّلتش رسائل. الهدف الأول: ٥٠ تحديثاً حقيقياً — بدونها لا معنى لأي تحليل.', 'No messages recorded yet. First goal: 50 real updates — without them no analysis means anything.')}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function display(k: keyof Extracted, v: unknown, lang: Lang): string {
  if (v === undefined) return lang === 'ar' ? 'لم يُذكر' : 'not stated';
  if (k === 'zoneId') return ZONES.find((z) => z.id === v)?.name[lang] ?? String(v);
  if (k === 'delivery') return v === 'immediate' ? (lang === 'ar' ? 'فوري' : 'Immediate') : String(v);
  if (k === 'frequency') return ({ monthly: lang === 'ar' ? 'شهري' : 'Monthly', quarterly: lang === 'ar' ? 'ربع سنوي' : 'Quarterly', annual: lang === 'ar' ? 'سنوي' : 'Annual' } as Record<string, string>)[v as string];
  if (k === 'area' || k === 'garden') return `${fmt(v as number)} m²`;
  if (k === 'months') return `${fmt(v as number)} ${lang === 'ar' ? 'شهراً' : 'months'}`;
  if (k.endsWith('Pct')) return `${fmt(v as number, (v as number) % 1 ? 1 : 0)}%`;
  if (typeof v === 'number') return fmt(v);
  return String(v);
}

// ───────────────────────── اسأل ─────────────────────────

export function AskView({ seedQuery, onOpen }: { seedQuery: string; onOpen: (e: RadarEvent) => void }) {
  const { lang, tx } = useLang();
  const { all } = useRadar();
  const now = Date.now();
  const [q, setQ] = useState(seedQuery);
  const [log, setLog] = useState<{ q: string; text: string; ids: string[] }[]>(() => (seedQuery ? [{ q: seedQuery, ...toLog(answer(seedQuery, all, lang)) }] : []));
  const ask = (text: string) => {
    if (!text.trim()) return;
    setLog((l) => [...l, { q: text, ...toLog(answer(text, all, lang)) }]);
    setQ('');
  };
  const suggestions = lang === 'ar'
    ? ['عايز 3 غرف في التجمع بـ12 مليون', 'إيه اللي اتغيّر في المقطم الأسبوع ده؟', 'مين عنده أطول تقسيط دلوقتي؟', 'وحدة استلام فوري']
    : ['3 bedrooms in New Cairo for 12 million', 'What changed in Mokattam this week?', 'Who has the longest plan now?', 'Ready to move unit'];
  return (
    <section className="mr-section" style={{ marginTop: 32 }}>
      <div className="mr-section-head">
        <div>
          <h1 className="display-lg">{tx('اسأل الرادار', 'Ask the radar')}</h1>
          <p className="mr-lead">{tx('لغة طبيعية فوق كل ما جُمع. الجواب من أرقام اليوم، ومعه مصدر كل رقم وتاريخه — لا جواب من خارج البيانات.', 'Natural language over everything collected. Answers come from today’s numbers with each source and date — nothing from outside the data.')}</p>
        </div>
      </div>
      <div className="mr-card lg" style={{ maxWidth: 820 }}>
        <div className="mr-chat">
          {!log.length && (
            <div className="mr-suggest">
              {suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          )}
          {log.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="mr-bubble me">{m.q}</div>
              <div className="mr-bubble bot">
                <p>{m.text}</p>
                {m.ids.length > 0 && (
                  <div className="mr-feed" style={{ marginTop: 4 }}>
                    {m.ids.map((id) => {
                      const e = all.find((x) => x.id === id);
                      return e ? <EventRow key={id} e={e} all={all} onOpen={onOpen} now={now} /> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          style={{ display: 'flex', gap: 8, marginTop: 20 }}
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input className="mr-input" dir="auto" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('عايز 3 غرف في التجمع بـ5 مليون تقسيط طويل', '3 bedrooms in New Cairo, 5 million, long plan')} aria-label={tx('سؤالك', 'Your question')} />
          <button className="mr-btn" type="submit" disabled={!q.trim()}>{tx('اسأل', 'Ask')}</button>
        </form>
        {log.length > 0 && (
          <div className="mr-suggest" style={{ marginTop: 12 }}>
            {suggestions.slice(0, 3).map((s) => (
              <button key={s} onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function toLog(a: { text: string; eventIds: string[] }) {
  return { text: a.text, ids: a.eventIds };
}

// ───────────────────────── المعايير ─────────────────────────

export function CriteriaView() {
  const { lang, tx } = useLang();
  const rows: [string, string, string][] = lang === 'ar'
    ? [
        ['السعر الفعلي', 'سعر المتر بعد كل الإضافات', '(الإجمالي + الصيانة + الوديعة + الجراج + النادي) ÷ المساحة'],
        ['موقعه من السوق', 'انحراف سعر المتر عن متوسط المنطقة', 'نسبة مئوية موجبة أو سالبة، والعيّنة المستخدمة معلنة'],
        ['جدّية خطة السداد', 'العبء النقدي الحقيقي', 'المقدّم × مدة التقسيط؛ مقدّم 50٪ على 3 سنوات يُعامَل كشبه كاش'],
        ['العائد', 'الإيجاري + النمو المتوقع', 'متوسط إيجار المنطقة ÷ التكلفة الحقيقية — تقدير لا وعد'],
        ['السيولة', 'سرعة الخروج', 'أفق بيع تقديري بالأشهر، مبني على حركة الوحدات المشابهة'],
        ['ضغط العرض', 'هل البائع تحت ضغط؟', 'تكرار الطرح وعدد أيام البقاء وتاريخ تغيّر السعر'],
      ]
    : [
        ['True price', 'Price per m² after every add-on', '(total + maintenance + deposit + garage + club) ÷ area'],
        ['Vs. market', 'Deviation from the zone average', 'Signed percentage, with the sample disclosed'],
        ['Plan seriousness', 'Real cash burden', 'Down payment × plan length; 50% over 3 years counts as near-cash'],
        ['Yield', 'Rent + expected growth', 'Zone average rent ÷ true cost — an estimate, not a promise'],
        ['Liquidity', 'Speed of exit', 'Estimated months to sell, from similar units’ movement'],
        ['Offer pressure', 'Is the seller under pressure?', 'Reposts, days listed and price-change history'],
      ];
  const covenant = lang === 'ar'
    ? ['كل رقم له مصدر وتاريخ.', 'كل حكم له معيار معلن ومنشور.', 'التقييم لا يُشترى، والإعلان لا يُغيّر الترتيب.', 'المعلومة الخام مجانية؛ التحليل هو المنتج.']
    : ['Every number has a source and a date.', 'Every verdict has a published standard.', 'Ratings are not for sale; advertising never changes the order.', 'Raw information is free; analysis is the product.'];
  return (
    <section className="mr-section" style={{ marginTop: 32 }}>
      <div className="mr-section-head">
        <div>
          <h1 className="display-lg">{tx('حكم مناطق: المعايير', 'The Manateq verdict: standards')}</h1>
          <p className="mr-lead">{tx('الحكم علني، والمعايير منشورة هنا: كيف نحسب، وما مصادرنا، ومتى تُحدَّث. الحكم على الرقم لا على المطوّر، وللمطوّر حق الردّ بجوار الحكم.', 'The verdict is public and the standards live here: how we compute, our sources, when they update. The verdict is on the number, not the developer — who has the right to reply beside it.')}</p>
        </div>
      </div>
      <div className="mr-split">
        <div className="mr-card">
          <p className="label" style={{ marginBottom: 12 }}>{tx('المحاور الستة للتقييم', 'Six rating axes')}</p>
          <table className="mr-table">
            <thead>
              <tr><th>{tx('المحور', 'Axis')}</th><th>{tx('ما يقيسه', 'Measures')}</th><th>{tx('كيف يُحسب', 'How')}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}><td className="body-strong">{r[0]}</td><td>{r[1]}</td><td className="muted">{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mr-grid">
          <div className="mr-card">
            <p className="label">{tx('مخرج الحكم', 'Verdict output')}</p>
            <ul className="mr-angles" style={{ marginTop: 12 }}>
              <li className="small"><span><b style={{ color: 'var(--verdict-opportunity)' }}>{GRADE_WORD.opportunity[lang]}</b> — {tx(`أقل من متوسط المنطقة بـ${THRESHOLDS.opportunity}٪ فأكثر (بعد هامش الضغط وخطة السداد)`, `${THRESHOLDS.opportunity}%+ below the zone average (after pressure and plan adjustments)`)}</span></li>
              <li className="small"><span><b style={{ color: 'var(--verdict-fair)' }}>{GRADE_WORD.fair[lang]}</b> — {tx('بين الحدّين', 'between the two thresholds')}</span></li>
              <li className="small"><span><b style={{ color: 'var(--verdict-inflated)' }}>{GRADE_WORD.inflated[lang]}</b> — {tx(`أعلى من المتوسط بـ${Math.abs(THRESHOLDS.inflated)}٪ فأكثر`, `${Math.abs(THRESHOLDS.inflated)}%+ above the average`)}</span></li>
            </ul>
            <p className="stamp" style={{ marginTop: 12 }}>{tx(`القيمة الحالية لخطة السداد تُخصم بعائد ${pct(MARKET.alternatives[0].rate)} (شهادة البنك)`, `Payment-plan NPV discounted at ${pct(MARKET.alternatives[0].rate)} (bank certificate)`)}</p>
          </div>
          <div className="mr-card">
            <p className="label">{tx('العهد — أربعة التزامات غير قابلة للتفاوض', 'The covenant — four non-negotiables')}</p>
            <ol style={{ margin: '12px 0 0', paddingInlineStart: 20 }} className="small">
              {covenant.map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
