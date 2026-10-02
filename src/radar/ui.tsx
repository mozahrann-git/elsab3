// Manateq Radar — مكوّنات نظام التصميم: Figure · SourceStamp · Verdict · TrueCost · DeveloperTile · PriceLine
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DAY, GRADE_WORD, fmt, stampDate, type TileState, type TrueCost as TC, type Verdict as V, type Warning } from './engine';
import type { Lang, PricePoint, Source } from './types';

// ───────────────────────── اللغة ─────────────────────────

export const LangCtx = createContext<Lang>('ar');
export function useLang() {
  const lang = useContext(LangCtx);
  return { lang, tx: (ar: string, en: string) => (lang === 'ar' ? ar : en) };
}

export function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** اهتزازة خفيفة: عند استقرار الحكم وعند إرسال العرض فقط. */
export function haptic() {
  try {
    if (!reducedMotion()) navigator.vibrate?.(12);
  } catch {
    /* غير مدعوم */
  }
}

// ───────────────────────── العدّ ─────────────────────────

/** يعدّ من صفر إلى القيمة مرة واحدة حين يدخل العنصر الشاشة. */
export function useCount(to: number, deps: unknown[] = [], from = 0) {
  const ref = useRef<HTMLElement | null>(null);
  const [v, setV] = useState(() => (reducedMotion() ? to : from));
  useEffect(() => {
    if (reducedMotion()) {
      setV(to);
      return;
    }
    const el = ref.current;
    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 900);
        setV(from + (to - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!el || typeof IntersectionObserver === 'undefined') {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, ...deps]);
  return [ref, v] as const;
}

// ───────────────────────── SourceStamp ─────────────────────────

export function SourceStamp({ source, extra }: { source: Source; extra?: string }) {
  const { tx } = useLang();
  const kind = {
    relayed: tx('منقول', 'Relayed'),
    computed: tx('محسوب', 'Computed'),
    field: tx('ميداني', 'Field'),
    seed: tx('عيّنة تجريبية', 'Demo sample'),
  }[source.kind];
  const parts = [kind, source.name, source.org, source.sample ? `n=${source.sample}` : '', extra, stampDate(source.date)].filter(Boolean) as string[];
  // كل جزء معزول اتجاهياً: العربي والإنجليزي والتاريخ لا يتداخلون.
  return (
    <span className="stamp">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <bdi>{p}</bdi>
        </span>
      ))}
    </span>
  );
}

// ───────────────────────── Figure ─────────────────────────

export function Figure({
  value,
  label,
  unit,
  digits = 0,
  live,
  size = 'figure',
  source,
  stampExtra,
  prefix,
}: {
  value: number;
  label: string;
  unit?: string;
  digits?: number;
  live?: boolean;
  size?: 'figure-hero' | 'figure' | 'figure-sm';
  source?: Source;
  stampExtra?: string;
  prefix?: string;
}) {
  const [ref, v] = useCount(value);
  return (
    <div className="mr-fig">
      <span className="label">{label}</span>
      <div className={`val ${size} ${live ? 'live' : ''}`}>
        <span ref={ref as never} className="num">
          {prefix}
          {fmt(v, digits)}
        </span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {source && <SourceStamp source={source} extra={stampExtra} />}
    </div>
  );
}

// ───────────────────────── Verdict ─────────────────────────

export function VerdictMeter({ v, reason, stamp, onDetails, reply, onReply }: {
  v: V;
  reason: string;
  stamp: ReactNode;
  onDetails?: () => void;
  reply?: string;
  onReply?: () => void;
}) {
  const { lang, tx } = useLang();
  const [pos, setPos] = useState(() => (reducedMotion() ? v.position : 50));
  useEffect(() => {
    if (reducedMotion()) {
      setPos(v.position);
      return;
    }
    setPos(50);
    // يتردد لحظة ثم يستقر: يتجاوز الدرجة قليلاً ويعود إليها.
    const overshoot = v.position + (v.position >= 50 ? 7 : -7);
    const a = setTimeout(() => setPos(Math.max(2, Math.min(98, overshoot))), 60);
    const b = setTimeout(() => setPos(v.position), 760);
    const c = setTimeout(haptic, 1500);
    return () => [a, b, c].forEach(clearTimeout);
  }, [v.position]);
  return (
    <div className="mr-card mr-verdict" aria-live="polite">
      <div className="head">
        <span className={`word ${v.grade}`}>{GRADE_WORD[v.grade][lang]}</span>
        <span className="label">{tx('حكم مناطق', 'Manateq verdict')}</span>
      </div>
      <div className="mr-track" role="img" aria-label={`${tx('حكم مناطق', 'Manateq verdict')}: ${GRADE_WORD[v.grade][lang]}`}>
        <span className="seg s1" />
        <span className="seg s2" />
        <span className="seg s3" />
        <span className={`pin ${v.grade}`} style={{ insetInlineStart: `${100 - pos}%` }} />
      </div>
      <div className="mr-scale">
        <span>{GRADE_WORD.opportunity[lang]}</span>
        <span>{GRADE_WORD.fair[lang]}</span>
        <span>{GRADE_WORD.inflated[lang]}</span>
      </div>
      <p className="mr-why">{reason}</p>
      <div style={{ marginTop: 4 }}>{stamp}</div>
      {reply && (
        <div className="mr-sunken" style={{ padding: '10px 12px', marginTop: 12 }}>
          <span className="label">{tx('توضيح من المطوّر', 'Developer clarification')}</span>
          <p className="small" style={{ marginTop: 4 }}>{reply}</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {onDetails && (
          <button className="mr-link" onClick={onDetails}>
            {tx('التفصيل الكامل ←', 'Full breakdown →')}
          </button>
        )}
        {onReply && (
          <button className="mr-link" style={{ color: 'var(--ink-muted)' }} onClick={onReply}>
            {tx('توضيح من المطوّر', 'Developer clarification')}
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── TrueCost ─────────────────────────

export function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 15 14H1L8 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6v3.6M8 11.6v.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TrueCostCard({ cost, warnings, replayKey }: { cost: TC; warnings: Warning[]; replayKey: string }) {
  const { lang, tx } = useLang();
  const [shown, setShown] = useState(() => (reducedMotion() ? cost.lines.length + 1 : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setShown(cost.lines.length + 1);
      return;
    }
    setShown(0);
    const ts = Array.from({ length: cost.lines.length + 1 }, (_, i) => setTimeout(() => setShown(i + 1), 260 + i * 260));
    return () => ts.forEach(clearTimeout);
  }, [replayKey, cost.lines.length]);
  const misleading = warnings.some((w) => w.key === 'cash_discount');
  const done = shown > cost.lines.length;
  const [totalRef, total] = useCount(done ? cost.total : cost.declared, [done], cost.declared);
  return (
    <div className="mr-card mr-cost">
      <p className="label">{tx('السعر المعلن', 'Declared price')}</p>
      <p className={`declared ${misleading ? 'strike' : ''}`}>
        {fmt(cost.declared)} <span className="unit" style={{ fontSize: 13 }}>{tx('ج.م', 'EGP')}</span>
      </p>
      <div style={{ marginTop: 12 }}>
        {cost.lines.map((l, i) => (
          <div key={l.key} className={`line ${shown > i ? 'in' : ''}`}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
              <span>{l.label[lang]}</span>
              {l.pct !== null && <span className="num muted">{fmt(l.pct, l.pct % 1 ? 1 : 0)}%</span>}
            </span>
            <span className="num">+ {fmt(l.amount)}</span>
          </div>
        ))}
        {!cost.lines.length && <p className="small muted">{tx('الرسالة لم تذكر أي إضافات على السعر.', 'The message lists no add-ons.')}</p>}
      </div>
      <hr className="mr-rule" />
      <p className="label">{tx('التكلفة الحقيقية', 'True cost')}</p>
      <p className="figure-hero total num" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
        <span ref={totalRef as never}>{fmt(total)}</span>
      </p>
      <p className="stamp" style={{ marginTop: 6 }}>
        {tx('محسوب', 'Computed')} · {fmt(Math.round(cost.truePpm))} EGP/m² · +{fmt(cost.gapPct, 1)}% {tx('فوق المعلن', 'over declared')}
      </p>
      {warnings
        .filter((w) => w.key !== 'expired')
        .map((w) => (
          <p key={w.key} className="mr-warn">
            <WarnIcon />
            <span>{w.text[lang]}</span>
          </p>
        ))}
    </div>
  );
}

// ───────────────────────── DeveloperTile ─────────────────────────

export function DeveloperTile({ name, initials, state, count, last, onClick, pressed }: {
  name: string;
  initials: string;
  state: TileState;
  count: number;
  last: string | null;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const { lang, tx } = useLang();
  const sub = !last
    ? tx('لا حركة مسجّلة', 'No recorded move')
    : state === 'hot'
      ? tx('إطلاق أو خصم اليوم', 'Launch or discount today')
      : state === 'warm'
        ? tx('تحرّك خلال 3 أيام', 'Moved in the last 3 days')
        : relSince(last, lang);
  return (
    <button className={`mr-tile ${state}`} onClick={onClick} aria-pressed={pressed}>
      {state === 'hot' && <span className="mr-dot beat beatdot" />}
      <span className="n">{count}</span>
      <span className="mark">{initials}</span>
      <span>
        <span className="nm" style={{ display: 'block' }}>{name}</span>
        <span className="sub">{sub}</span>
      </span>
    </button>
  );
}

function relSince(iso: string, lang: Lang) {
  const d = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  return lang === 'ar' ? `آخر حركة منذ ${fmt(d)} أيام` : `Last move ${d} days ago`;
}

// ───────────────────────── PriceLine ─────────────────────────

export function PriceLine({ points, height = 120 }: { points: PricePoint[]; height?: number }) {
  const W = 560;
  const H = height;
  const pad = { t: 10, b: 18, l: 4, r: 48 };
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const ys = points.map((p) => p.ppm);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min || 1;
    const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.ppm).toFixed(1)}`).join(' ');
    const area = `${d} L${x(points.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
    return { d, area, min, max, lx: x(points.length - 1), ly: y(points[points.length - 1].ppm), y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, H]);
  const [drawn, setDrawn] = useState(reducedMotion());
  useEffect(() => {
    if (reducedMotion()) return;
    setDrawn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
  }, [points]);
  if (!geo) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <svg className="mr-spark" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${fmt(first.ppm)} → ${fmt(last.ppm)} EGP/m²`} style={{ direction: 'ltr' }}>
      <line x1={pad.l} x2={W - pad.r} y1={geo.y(geo.max)} y2={geo.y(geo.max)} />
      <line x1={pad.l} x2={W - pad.r} y1={geo.y(geo.min)} y2={geo.y(geo.min)} />
      <text x={W - pad.r + 6} y={geo.y(geo.max) + 3}>{fmt(geo.max / 1000, 1)}k</text>
      <text x={W - pad.r + 6} y={geo.y(geo.min) + 3}>{fmt(geo.min / 1000, 1)}k</text>
      <text x={pad.l} y={H - 4}>{stampDate(first.date).replace(/^\d+ /, '')}</text>
      <text x={W - pad.r} y={H - 4} textAnchor="end">{stampDate(last.date).replace(/^\d+ /, '')}</text>
      <path className="area" d={geo.area} style={{ opacity: drawn ? undefined : 0 }} />
      <path className="line" d={geo.d} pathLength={1} strokeDasharray="1" strokeDashoffset={drawn ? 0 : 1} />
      <circle cx={geo.lx} cy={geo.ly} r={3.5} />
    </svg>
  );
}
