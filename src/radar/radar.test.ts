// اختبارات Manateq Radar — تُشغَّل بـ: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { answer, parseQuery } from './ask';
import { MARKET, SEED_MESSAGES, ZONES } from './data';
import { developerState, fmtMoney, paymentPlan, reasonLine, threeAngles, trueCost, verdict, DAY } from './engine';
import { classifyType, coverage, expiry, extract, ingest, normalize } from './parser';
import { radar } from './store';
import type { RadarEvent } from './types';

const NOW = Date.parse('2026-10-02T12:00:00.000Z');
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();
const mokattam = ZONES.find((z) => z.id === 'mokattam')!;

// الرسالة الحقيقية من الوثيقة التأسيسية (القسم 4)
const VERONA = 'وحدة متاحة Verona — المقطم، الحي السادس\nشقة ١٣٧ م² · ٣ غرف\nالسعر ٣٬٠٨٢٬٥٠٠ ج.م\nمقدم ٥٠٪ وقسط شهري ٤٢٬٣١٣ على ٣٦ شهراً\nوديعة صيانة ٥٪\nاستلام فوري';

describe('normalize', () => {
  it('converts Arabic-Indic digits, separators and percent', () => {
    assert.equal(normalize('٣٬٠٨٢٬٥٠٠ ج.م ٥٠٪'), '3082500 ج.م 50%');
    assert.equal(normalize('3,082,500'), '3082500');
    assert.equal(normalize('۱۲۳'), '123');
  });
});

describe('extract — the ten fields', () => {
  it('reads the Verona message from the foundation document exactly', () => {
    const f = extract(VERONA);
    assert.equal(f.project, 'Verona');
    assert.equal(f.developer, 'Xland');
    assert.equal(f.zoneId, 'mokattam');
    assert.equal(f.district, 'الحي السادس');
    assert.equal(f.unitType, 'شقة');
    assert.equal(f.rooms, 3);
    assert.equal(f.area, 137);
    assert.equal(f.price, 3_082_500);
    assert.equal(f.downPct, 50);
    assert.equal(f.installment, 42_313);
    assert.equal(f.months, 36);
    assert.equal(f.frequency, 'monthly');
    assert.equal(f.maintenancePct, 5);
    assert.equal(f.delivery, 'immediate');
    assert.equal(coverage(f), 10);
  });

  it('reads English messages', () => {
    const f = extract('Marina Heights — New Capital\nApartment 155 sqm, 3 bedrooms\nPrice EGP 6,700,000\n10% down payment, 8 years installments\nMaintenance 8%\nDelivery 2029');
    assert.equal(f.developer, 'Dubai Misr');
    assert.equal(f.zoneId, 'capital');
    assert.equal(f.area, 155);
    assert.equal(f.price, 6_700_000);
    assert.equal(f.downPct, 10);
    assert.equal(f.months, 96);
    assert.equal(f.maintenancePct, 8);
    assert.equal(f.delivery, '2029');
  });

  it('understands "million" and does not read the garden as the unit area', () => {
    const f = extract('دوبلكس حديقة 60 م ومساحة 210 م² بسعر 8.4 مليون، خصم كاش 32%');
    assert.equal(f.garden, 60);
    assert.equal(f.area, 210);
    assert.equal(f.price, 8_400_000);
    assert.equal(f.cashDiscountPct, 32);
    assert.equal(f.unitType, 'دوبلكس');
  });

  it('reads years, quarterly plans, garage and club', () => {
    const f = extract('تاون هاوس 240 م² السعر 15,600,000 مقدم 15% على 7 سنوات قسط ربع سنوي، جراج 450 الف ونادي 120,000');
    assert.equal(f.months, 84);
    assert.equal(f.frequency, 'quarterly');
    assert.equal(f.garage, 450_000);
    assert.equal(f.club, 120_000);
  });

  it('never guesses a field that is not in the message', () => {
    const f = extract('تم الانتهاء من أعمال الخرسانة في The Park District');
    assert.equal(f.price, undefined);
    assert.equal(f.area, undefined);
    assert.equal(f.downPct, undefined);
  });
});

describe('classification — four axes', () => {
  it('classifies type', () => {
    assert.equal(classifyType('إطلاق جديد في التجمع', {}), 'launch');
    assert.equal(classifyType('خصم لفترة محدودة', {}), 'limited_offer');
    assert.equal(classifyType('خصم 10% على الكاش', {}), 'discount');
    assert.equal(classifyType('آخر وحدات في المرحلة', {}), 'limited_units');
    assert.equal(classifyType('تحديث أسعار المرحلة الثانية', {}), 'price_update');
    assert.equal(classifyType('نسبة الإنشاءات 62%', {}), 'construction_update');
    assert.equal(classifyType('وحدة متاحة', {}), 'unit_available');
  });

  it('flags a repost of the same unit at the same price as a repeat', () => {
    const first = ingest(VERONA, { sender: 'Shady · Xland', receivedAt: at(5) });
    const again = ingest('تذكير 🔔 ' + VERONA, { sender: 'Shady · Xland', receivedAt: at(1), history: [first] });
    assert.equal(first.importance, 'real');
    assert.equal(again.importance, 'repeat');
    assert.equal(again.type, 'repeat');
  });

  it('a price change is a real event, not a repeat', () => {
    const first = ingest(VERONA, { sender: 'Shady · Xland', receivedAt: at(50) });
    const cut = ingest(VERONA.replace('٣٬٠٨٢٬٥٠٠', '٢٬٩٩٠٬٠٠٠'), { sender: 'Shady · Xland', receivedAt: at(1), history: [first] });
    assert.equal(cut.importance, 'real');
  });

  it('assigns audiences and expiry', () => {
    const e = ingest(VERONA + '\nعمولة 2.5%', { sender: 'Shady · Xland', receivedAt: at(0) });
    assert.deepEqual(e.audiences, ['investor', 'broker', 'client']);
    assert.ok(e.expiresAt, 'available units expire');
    assert.equal(expiry('إطلاق جديد', 'launch', at(0)), null, 'launches never expire');
    const until = expiry('العرض حتى 15/10', 'limited_offer', '2026-10-02T12:00:00.000Z');
    assert.equal(until?.slice(0, 10), '2026-10-15');
  });
});

describe('engine — the verdict', () => {
  const ev = ingest(VERONA, { sender: 'Shady Azmy · Xland', receivedAt: at(1) });

  it('builds the true cost from the foundation example: 3,082,500 → 3,236,625', () => {
    const c = trueCost(ev.fields)!;
    assert.equal(c.declared, 3_082_500);
    assert.equal(c.lines[0].amount, 154_125);
    assert.equal(c.total, 3_236_625);
    assert.equal(Math.round(c.declaredPpm), 22_500);
  });

  it('rates Verona an opportunity: 9% below the district average', () => {
    const v = verdict(ev, mokattam, MARKET, [ev], NOW)!;
    assert.equal(v.grade, 'opportunity');
    assert.equal(Math.round(v.axes.marketDevPct), -9);
    assert.equal(v.axes.yieldPct.toFixed(1), '7.4');
    assert.match(reasonLine(v, mokattam, ev.fields, 'ar'), /أقل من متوسط الحي السادس بـ9%، والاستلام فوري/);
  });

  it('issues the honest warning on a near-cash plan', () => {
    const v = verdict(ev, mokattam, MARKET, [ev], NOW)!;
    assert.ok(v.warnings.some((w) => w.key === 'quasi_cash'));
  });

  it('rates an overpriced unit as inflated, judging the number not the developer', () => {
    const pricey = ingest('شقة 137 م² المقطم السعر 4,100,000 ج.م مقدم 10% على 8 سنوات استلام 2028', { sender: 'X · Xland', receivedAt: at(1) });
    const v = verdict(pricey, mokattam, MARKET, [pricey], NOW)!;
    assert.equal(v.grade, 'inflated');
    assert.match(reasonLine(v, mokattam, pricey.fields, 'en'), /above the Mokattam average/);
    assert.doesNotMatch(reasonLine(v, mokattam, pricey.fields, 'ar'), /Xland/);
  });

  it('computes payment-plan NPV and its implied discount', () => {
    const p = paymentPlan({ price: 1_000_000, downPct: 10, months: 96 }, 22)!;
    assert.equal(p.count, 96);
    assert.ok(p.npv < 1_000_000 && p.npv > 400_000);
    assert.ok(p.impliedDiscountPct > 30, `a long plan is a real discount, got ${p.impliedDiscountPct}`);
    assert.equal(p.quasiCash, false);
    const cash = paymentPlan({ price: 1_000_000 }, 22)!;
    assert.equal(Math.round(cash.impliedDiscountPct), 0);
  });

  it('detects seller pressure from a price cut', () => {
    const old = ingest(VERONA.replace('٣٬٠٨٢٬٥٠٠', '٣٬١٥٠٬٠٠٠'), { sender: 'S · Xland', receivedAt: at(120) });
    const now = ingest(VERONA, { sender: 'S · Xland', receivedAt: at(1), history: [old] });
    const v = verdict(now, mokattam, MARKET, [old, now], NOW)!;
    assert.equal(v.axes.pressure.priceCuts, 1);
    assert.ok(v.axes.pressure.underPressure);
  });

  it('writes three angles from one set of facts', () => {
    const v = verdict(ev, mokattam, MARKET, [ev], NOW)!;
    const a = threeAngles(ev, v, mokattam, 'Xland', 'ar');
    assert.match(a.investor.join(' '), /22,500/);
    assert.match(a.broker.join(' '), /مقدّم 1.54 مليون/);
    assert.match(a.broker.join(' '), /كاش/);
    assert.match(a.client.join(' '), /شقة 137 متراً، 3 غرف/);
    assert.match(a.client.join(' '), /جاهزة للسكن الآن/);
  });

  it('formats money without mangling round millions', () => {
    assert.equal(fmtMoney(10_000_000, 'ar'), '10 مليون');
    assert.equal(fmtMoney(1_541_250, 'en'), '1.54M EGP');
    assert.equal(fmtMoney(1_500_000, 'ar'), '1.5 مليون');
    assert.equal(fmtMoney(850_000, 'en'), 'EGP 850,000');
  });
});

describe('developer tiles', () => {
  it('is hot on a launch today, warm on a recent move, cold after three quiet days', () => {
    const launch = ingest('إطلاق جديد Lakeview Terraces التجمع شقة 165 م² بسعر 10,725,000', { sender: 'M · EgyGab', receivedAt: at(2) });
    const move = ingest(VERONA, { sender: 'S · Xland', receivedAt: at(40) });
    const stale = ingest('Cedar Row الشيخ زايد تاون هاوس 240 م² السعر 15,600,000', { sender: 'N · SED', receivedAt: at(100) });
    const all = [launch, move, stale];
    assert.equal(developerState('EgyGab', all, NOW).state, 'hot');
    assert.equal(developerState('Xland', all, NOW).state, 'warm');
    assert.equal(developerState('SED', all, NOW).state, 'cold');
  });
});

describe('ask — the chat bot', () => {
  const seed: RadarEvent[] = [];
  for (const m of [...SEED_MESSAGES].sort((a, b) => b.ago - a.ago)) seed.push(ingest(m.text, { sender: m.sender, receivedAt: at(m.ago), history: seed, seed: true }));

  it('parses a natural Egyptian query', () => {
    const q = parseQuery('عايز ٣ غرف في التجمع بـ٥ مليون تقسيط طويل');
    assert.equal(q.zoneId, 'new-cairo');
    assert.equal(q.rooms, 3);
    assert.equal(q.budget, 5_000_000);
    assert.equal(q.longPlan, true);
  });

  it('answers "what changed in Mokattam this week" from real events only', () => {
    const a = answer('إيه اللي اتغيّر في المقطم الأسبوع ده؟', seed, 'ar', NOW);
    assert.ok(a.eventIds.length >= 1);
    for (const id of a.eventIds) {
      const e = seed.find((x) => x.id === id)!;
      assert.equal(e.fields.zoneId, 'mokattam');
      assert.equal(e.importance, 'real');
    }
  });

  it('finds the longest plan', () => {
    const a = answer('مين عنده أطول تقسيط دلوقتي؟', seed, 'ar', NOW);
    const top = seed.find((x) => x.id === a.eventIds[0])!;
    assert.equal(top.fields.months, 120);
    assert.match(a.text, /10 سنوات/);
  });

  it('says so tastefully when nothing matches', () => {
    const a = answer('عايز شقة في الشيخ زايد بمليون', seed, 'ar', NOW);
    assert.equal(a.eventIds.length, 0);
    assert.match(a.text, /مفيش وحدة متاحة اليوم في الشيخ زايد/);
  });
});

describe('seed sample', () => {
  it('every seed message parses with price and area, and exactly one is a repeat', () => {
    const out: RadarEvent[] = [];
    for (const m of [...SEED_MESSAGES].sort((a, b) => b.ago - a.ago)) out.push(ingest(m.text, { sender: m.sender, receivedAt: at(m.ago), history: out, seed: true }));
    const priced = out.filter((e) => e.fields.price && e.fields.area);
    assert.equal(priced.length, SEED_MESSAGES.length - 1);
    assert.equal(out.filter((e) => e.importance === 'repeat').length, 1);
    assert.ok(out.every((e) => e.source.kind === 'seed'), 'demo data is always stamped as demo');
  });
});

describe('store — pausing never loses a message', () => {
  it('queues while paused and reads the queue on resume', () => {
    radar._reset();
    radar.setPaused(true);
    assert.equal(radar.receive(VERONA, 'Shady · Xland'), null);
    assert.equal(radar.get().queue.length, 1);
    assert.equal(radar.get().events.length, 0);
    radar.setPaused(false);
    assert.equal(radar.get().queue.length, 0);
    assert.equal(radar.get().events.length, 1);
    assert.equal(radar.get().events[0].fields.price, 3_082_500);
  });

  it('every number shown has a source and a date', () => {
    for (const e of radar.get().all) {
      assert.ok(e.source.name);
      assert.ok(!Number.isNaN(Date.parse(e.source.date)));
    }
    for (const z of ZONES) assert.ok(z.source.date && z.source.name);
    for (const a of MARKET.alternatives) assert.ok(a.source.date && a.source.name);
    assert.ok(DAY > 0);
  });
});
