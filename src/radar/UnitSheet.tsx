// Manateq Radar — صفحة الوحدة: الحكم · التكلفة الحقيقية · الكارت الواحد بثلاثة أزرار · المحاور الستة · البدائل
import { useEffect, useMemo, useState } from 'react';
import { MARKET, ZONES } from './data';
import { alternativesLine, fmt, pct, reasonLine, stampDate, threeAngles, verdict } from './engine';
import { radar, useRadar } from './store';
import { SourceStamp, TrueCostCard, VerdictMeter, haptic, useLang } from './ui';
import type { Audience, RadarEvent } from './types';

export function UnitSheet({ event, onClose, onCriteria, toast }: { event: RadarEvent; onClose: () => void; onCriteria: () => void; toast: (s: string) => void }) {
  const { lang, tx } = useLang();
  const { all, replies } = useRadar();
  const zone = ZONES.find((z) => z.id === event.fields.zoneId);
  const v = useMemo(() => (zone ? verdict(event, zone, MARKET, all) : null), [event, zone, all]);
  const [angle, setAngle] = useState<Audience>('investor');
  const [details, setDetails] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const reply = replies.find((r) => r.eventId === event.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const f = event.fields;
  const devName = f.developer ?? event.source.org ?? '—';
  const title = [f.project, zone?.name[lang]].filter(Boolean).join(' — ') || tx('حدث من السوق', 'Market event');
  const angles = v && zone ? threeAngles(event, v, zone, devName, lang) : null;
  const angleText = angles ? angles[angle].join(lang === 'ar' ? ' · ' : ' · ') : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(angleText);
      toast(tx('اتنسخت — راجعها قبل ما تبعت', 'Copied — review before sending'));
    } catch {
      toast(tx('النسخ غير متاح في هذا المتصفح', 'Copy is not available here'));
    }
  };
  const send = () => {
    haptic();
    window.open(`https://wa.me/?text=${encodeURIComponent(angleText)}`, '_blank', 'noopener');
  };

  return (
    <>
      <div className="mr-scrim" onClick={onClose} />
      <aside className="mr-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mr-sheet-head">
          <button className="mr-chip-btn" onClick={onClose} aria-label={tx('إغلاق', 'Close')}>
            ✕
          </button>
          <div style={{ minWidth: 0 }}>
            <p className="body-strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
            <p className="stamp">
              {devName}
              {f.district ? ` · ${f.district}` : ''}
            </p>
          </div>
        </div>

        <div className="mr-sheet-body">
          {!v || !zone ? (
            <div className="mr-card">
              <p className="small muted">{tx('هذا الحدث لا يحمل سعراً ومساحة، فلا حكم عليه — يُعرض كما وصل.', 'This event carries no price and area, so there is no verdict — shown as received.')}</p>
              <p className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{event.raw}</p>
              <div style={{ marginTop: 8 }}>
                <SourceStamp source={event.source} />
              </div>
            </div>
          ) : (
            <>
              <VerdictMeter
                v={v}
                reason={reasonLine(v, zone, f, lang)}
                stamp={<SourceStamp source={{ kind: 'computed', name: tx('المحاور الستة', 'Six axes'), org: zone.name[lang], date: zone.source.date, sample: zone.source.sample }} />}
                onDetails={() => setDetails((d) => !d)}
                reply={reply?.text}
                onReply={() => setReplying((r) => !r)}
              />

              {replying && (
                <div className="mr-card">
                  <p className="label">{tx('حق الردّ', 'Right of reply')}</p>
                  <p className="small muted" style={{ marginTop: 4 }}>
                    {tx('توضيح المطوّر يُنشر بجوار الحكم كما هو. الحكم على الرقم، والردّ يضيف السياق.', 'The developer’s note is published beside the verdict as written. The verdict is on the number; the reply adds context.')}
                  </p>
                  <textarea className="mr-textarea" style={{ minHeight: 90, marginTop: 10 }} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={tx('مثال: السعر يشمل تشطيب كامل وتكييفات.', 'e.g. The price includes full finishing and AC units.')} />
                  <div style={{ marginTop: 10 }}>
                    <button
                      className="mr-btn"
                      disabled={!replyText.trim()}
                      onClick={() => {
                        radar.reply(event.id, replyText.trim());
                        setReplying(false);
                        setReplyText('');
                        toast(tx('نُشر التوضيح بجوار الحكم', 'Clarification published beside the verdict'));
                      }}
                    >
                      {tx('انشر التوضيح', 'Publish clarification')}
                    </button>
                  </div>
                </div>
              )}

              {details && (
                <div className="mr-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <p className="label">{tx('المحاور الستة', 'The six axes')}</p>
                    <button className="mr-link" onClick={onCriteria}>
                      {tx('كيف نحسب ←', 'How we compute →')}
                    </button>
                  </div>
                  <div className="mr-axes">
                    <Axis label={tx('السعر الفعلي', 'True price')} value={`${fmt(Math.round(v.axes.truePpm))}`} unit="EGP/m²" />
                    <Axis label={tx('موقعه من السوق', 'Vs. market')} value={`${v.axes.marketDevPct > 0 ? '+' : ''}${fmt(v.axes.marketDevPct, 1)}%`} unit={`avg ${fmt(zone.avgPpm)}`} />
                    <Axis
                      label={tx('جدّية خطة السداد', 'Plan seriousness')}
                      value={v.axes.plan ? `${fmt(f.downPct ?? 0)}% / ${fmt(v.axes.plan.months)}m` : '—'}
                      unit={v.axes.plan?.quasiCash ? tx('شبه كاش', 'near-cash') : tx('تقسيط', 'installment')}
                    />
                    <Axis label={tx('العائد', 'Yield')} value={pct(v.axes.yieldPct)} unit={tx('تقدير لا وعد', 'estimate')} />
                    <Axis label={tx('السيولة', 'Liquidity')} value={`~${fmt(v.axes.liquidityMonths)}`} unit={tx('شهور للبيع', 'months to sell')} />
                    <Axis
                      label={tx('ضغط العرض', 'Offer pressure')}
                      value={`${fmt(v.axes.pressure.reposts)}×`}
                      unit={v.axes.pressure.priceCuts ? tx(`${fmt(v.axes.pressure.priceCuts)} تخفيض سعر`, `${v.axes.pressure.priceCuts} price cut`) : tx(`${fmt(v.axes.pressure.daysListed)} يوماً`, `${v.axes.pressure.daysListed} days`)}
                    />
                  </div>
                  {v.axes.plan && v.axes.plan.months > 0 && (
                    <p className="small" style={{ marginTop: 12 }}>
                      {tx('القيمة الحالية لخطة السداد', 'Payment-plan NPV')}: <span className="num">{fmt(Math.round(v.axes.plan.npv))}</span> —{' '}
                      {tx(`التقسيط يساوي خصماً حقيقياً ${fmt(v.axes.plan.impliedDiscountPct, 1)}% بعائد الشهادة ${pct(MARKET.alternatives[0].rate)}.`, `the plan is worth a real ${fmt(v.axes.plan.impliedDiscountPct, 1)}% discount at the ${pct(MARKET.alternatives[0].rate)} certificate rate.`)}
                    </p>
                  )}
                </div>
              )}

              <TrueCostCard cost={v.cost} warnings={v.warnings} replayKey={event.id} />

              <div className="mr-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p className="label">{tx('الترجمة الثلاثية', 'Three angles')}</p>
                  <div className="mr-seg" role="group">
                    {(['investor', 'broker', 'client'] as Audience[]).map((a) => (
                      <button key={a} aria-pressed={angle === a} onClick={() => setAngle(a)}>
                        {{ investor: tx('مستثمر', 'Investor'), broker: tx('بروكر', 'Broker'), client: tx('عميل', 'Client') }[a]}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="mr-angles" style={{ marginTop: 16 }} key={angle}>
                  {angles![angle].map((line, i) => (
                    <li key={i} className="small" style={{ animation: `mr-in 260ms ${i * 40}ms var(--ease-settle) both` }}>
                      {line}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <button className="mr-btn ghost" onClick={copy}>
                    {tx('انسخ', 'Copy')}
                  </button>
                  {angle === 'client' && (
                    <button className="mr-btn pulse" onClick={send}>
                      {tx('راجع وابعت واتساب', 'Review & send on WhatsApp')}
                    </button>
                  )}
                </div>
                <p className="stamp" style={{ marginTop: 10 }}>
                  {tx('النظام يجهّز ٩٠٪ والمُرسِل يراجع ويُرسل — لا تخرج رسالة للعميل من النظام مباشرة.', 'The system prepares 90%; a person reviews and sends — nothing goes to a client automatically.')}
                </p>
              </div>

              <div className="mr-card">
                <p className="label" style={{ marginBottom: 8 }}>{tx('مقارنة بالبدائل', 'Against the alternatives')}</p>
                <p className="small">{alternativesLine(v, MARKET, lang)}</p>
                <div style={{ marginTop: 8 }}>
                  <SourceStamp source={MARKET.alternatives[0].source} />
                </div>
              </div>

              <div className="mr-card">
                <p className="label" style={{ marginBottom: 8 }}>{tx('الرسالة كما وصلت', 'Message as received')}</p>
                <p className="small" dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{event.raw}</p>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SourceStamp source={event.source} />
                  {event.expiresAt && (
                    <span className="stamp">
                      <bdi>{tx('صالح حتى', 'Valid until')}</bdi> <bdi>{stampDate(event.expiresAt)}</bdi>
                    </span>
                  )}
                  <span className="stamp">{tx('الأسعار قابلة للتغيير — تُراجَع مع المطوّر قبل التعاقد.', 'Prices may change — confirm with the developer before contracting.')}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Axis({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="figure-sm num" style={{ marginTop: 4, fontSize: 16, lineHeight: '22px' }}>{value}</p>
      <p className="stamp">{unit}</p>
    </div>
  );
}
