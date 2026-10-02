// Manateq Radar — بيانات البداية.
// كل ما هنا «عيّنة تجريبية» معلنة كذلك في الختم: تُظهر المنصة كاملة قبل أن تمتلئ قاعدة البيانات
// برسائل حقيقية، ولا تُقدَّم كأرقام سوق. أي رسالة تُدخلها من شاشة الاستقبال تحلّ محلها.
import type { Developer, Market, Source, Zone } from './types';

const SEED_DATE = '2026-10-01T09:00:00.000Z';
const seed = (name: string, sample?: number): Source => ({ kind: 'seed', name, date: SEED_DATE, sample });

function history(current: number, drift: number[]): Zone['history'] {
  // سلسلة شهرية تنتهي عند المتوسط الحالي: نرجع للخلف شهراً شهراً.
  const pts: Zone['history'] = [];
  let v = current;
  for (let i = 0; i < drift.length; i++) {
    pts.push({ date: new Date(Date.UTC(2026, 9 - i, 1)).toISOString(), ppm: Math.round(v) });
    v = v / (1 + drift[i] / 100);
  }
  return pts.reverse();
}

export const ZONES: Zone[] = [
  {
    id: 'mokattam',
    name: { ar: 'المقطم', en: 'Mokattam' },
    aliases: ['المقطم', 'مقطم', 'الهضبة الوسطى', 'mokattam', 'mokkatam'],
    x: 560,
    y: 300,
    avgPpm: 24_725,
    rentPpmMonthly: 146,
    liquidityMonths: 5,
    history: history(24_725, [1.2, 2.1, 0.8, 1.6, 2.4, 0.4, 1.9, 2.8, 1.1, 0.6, 2.2, 1.4]),
    source: seed('avg ppm · Mokattam', 41),
  },
  {
    id: 'new-cairo',
    name: { ar: 'التجمع الخامس', en: 'New Cairo' },
    aliases: ['التجمع', 'التجمع الخامس', 'القاهرة الجديدة', 'new cairo', '5th settlement', 'fifth settlement'],
    x: 700,
    y: 330,
    avgPpm: 61_500,
    rentPpmMonthly: 290,
    liquidityMonths: 4,
    history: history(61_500, [2.6, 1.8, 3.1, 2.2, 1.4, 2.9, 3.4, 1.2, 2.5, 1.9, 2.7, 3.0]),
    source: seed('avg ppm · New Cairo', 128),
  },
  {
    id: 'mostakbal',
    name: { ar: 'المستقبل سيتي', en: 'Mostakbal City' },
    aliases: ['المستقبل', 'مستقبل سيتي', 'المستقبل سيتي', 'mostakbal', 'mostakbal city', 'future city'],
    x: 820,
    y: 300,
    avgPpm: 47_800,
    rentPpmMonthly: 175,
    liquidityMonths: 8,
    history: history(47_800, [3.4, 2.8, 4.1, 2.0, 3.6, 2.2, 4.4, 1.8, 3.1, 2.6, 3.9, 2.4]),
    source: seed('avg ppm · Mostakbal City', 64),
  },
  {
    id: 'capital',
    name: { ar: 'العاصمة الإدارية', en: 'New Capital' },
    aliases: ['العاصمة', 'العاصمة الإدارية', 'العاصمة الادارية', 'new capital', 'nac', 'administrative capital'],
    x: 920,
    y: 380,
    avgPpm: 42_300,
    rentPpmMonthly: 118,
    liquidityMonths: 11,
    history: history(42_300, [2.2, 1.4, 2.8, 0.6, 1.9, 2.4, 1.1, 2.6, 0.9, 1.7, 2.1, 1.3]),
    source: seed('avg ppm · New Capital', 87),
  },
  {
    id: 'zayed',
    name: { ar: 'الشيخ زايد', en: 'Sheikh Zayed' },
    aliases: ['زايد', 'الشيخ زايد', 'sheikh zayed', 'zayed'],
    x: 150,
    y: 250,
    avgPpm: 58_200,
    rentPpmMonthly: 280,
    liquidityMonths: 4,
    history: history(58_200, [2.4, 2.0, 2.9, 1.6, 2.2, 3.1, 1.8, 2.5, 2.0, 1.4, 2.6, 2.3]),
    source: seed('avg ppm · Sheikh Zayed', 96),
  },
];

export const DEVELOPERS: Developer[] = [
  { id: 'egygab', name: 'EgyGab', initials: 'EG', aliases: ['egygab', 'egy gab', 'ايجي جاب', 'إيجي جاب'], zoneIds: ['new-cairo', 'mostakbal'] },
  { id: 'urbnlanes', name: 'Urbnlanes', initials: 'UL', aliases: ['urbnlanes', 'urban lanes', 'اربن لينز', 'أوربن لينز'], zoneIds: ['mostakbal', 'capital'] },
  { id: 'xland', name: 'Xland', initials: 'XL', aliases: ['xland', 'x land', 'اكس لاند', 'إكس لاند'], zoneIds: ['mokattam', 'new-cairo'] },
  { id: 'sed', name: 'SED', initials: 'SED', aliases: ['sed', 'اس اي دي', 'إس إي دي'], zoneIds: ['zayed', 'new-cairo'] },
  { id: 'hydepark', name: 'Hyde Park', initials: 'HP', aliases: ['hyde park', 'hydepark', 'هايد بارك'], zoneIds: ['new-cairo', 'capital'] },
  { id: 'dubaimisr', name: 'Dubai Misr', initials: 'DM', aliases: ['dubai misr', 'دبي مصر'], zoneIds: ['capital', 'zayed'] },
];

/** مشروعات العيّنة: اسم المشروع ← المطوّر والمنطقة. */
export const PROJECTS: { name: string; aliases: string[]; developer: string; zoneId: string }[] = [
  { name: 'Verona', aliases: ['verona', 'فيرونا'], developer: 'Xland', zoneId: 'mokattam' },
  { name: 'Lakeview Terraces', aliases: ['lakeview', 'ليك فيو'], developer: 'EgyGab', zoneId: 'new-cairo' },
  { name: 'Solé', aliases: ['sole', 'solé', 'سولي'], developer: 'Urbnlanes', zoneId: 'mostakbal' },
  { name: 'Cedar Row', aliases: ['cedar', 'سيدار'], developer: 'SED', zoneId: 'zayed' },
  { name: 'The Park District', aliases: ['park district', 'بارك ديستريكت'], developer: 'Hyde Park', zoneId: 'new-cairo' },
  { name: 'Marina Heights', aliases: ['marina heights', 'مارينا هايتس'], developer: 'Dubai Misr', zoneId: 'capital' },
];

export const MARKET: Market = {
  inflation: { rate: 24, source: seed('headline CPI y/y') },
  alternatives: [
    { id: 'bank', name: { ar: 'شهادات البنك', en: 'Bank certificates' }, rate: 22, liquidity: { ar: 'أيام', en: 'Days' }, source: seed('1-yr fixed certificate') },
    { id: 'gold', name: { ar: 'الذهب', en: 'Gold' }, rate: 18, liquidity: { ar: 'ساعات', en: 'Hours' }, source: seed('21k EGP/g, 12-mo change') },
    { id: 'stocks', name: { ar: 'البورصة', en: 'Stock market' }, rate: 16, liquidity: { ar: 'أيام', en: 'Days' }, source: seed('EGX30, 12-mo total return') },
  ],
};

/**
 * رسائل العيّنة: نصوص بنفس شكل رسائل السيلز الحقيقية، تمر على نفس المحلّل الذي تمر عليه
 * أي رسالة تُدخلها — فالعيّنة تختبر المسار كاملاً لا شاشة مرسومة.
 * `ago` بالساعات قبل لحظة الفتح، فالنبض يبدو حيّاً.
 */
export const SEED_MESSAGES: { ago: number; sender: string; text: string }[] = [
  {
    ago: 2,
    sender: 'Shady Azmy · Xland',
    text: 'وحدة متاحة 🔥 Verona — المقطم، الحي السادس\nشقة 137 م² · 3 غرف\nالسعر 3,082,500 ج.م\nمقدم 50% وقسط شهري 42,313 على 36 شهر\nوديعة صيانة 5%\nاستلام فوري\nعمولة 2.5%',
  },
  {
    ago: 5,
    sender: 'Mariam Fathy · EgyGab',
    text: 'إطلاق جديد 🚀 Lakeview Terraces التجمع الخامس\nشقة 165 م² 3 غرف بسعر 10,725,000 جنيه\nمقدم 10% وتقسيط على 8 سنوات\nصيانة 8% · جراج 450,000\nاستلام 2029\nعمولة 3% + حافز 25 ألف للبروكر',
  },
  {
    ago: 9,
    sender: 'Omar Nabil · Urbnlanes',
    text: 'خصم لفترة محدودة على Solé — المستقبل سيتي\nدوبلكس 210 م² + حديقة 60 م\nالسعر بعد الخصم 8,400,000 ج.م (خصم كاش 32%)\nالعرض حتى نهاية الأسبوع',
  },
  {
    ago: 30,
    sender: 'Nour Hamdy · SED',
    text: 'تحديث أسعار Cedar Row الشيخ زايد\nتاون هاوس 240 م² السعر الجديد 15,600,000\nمقدم 15% على 7 سنوات، قسط ربع سنوي\nصيانة 10%\nاستلام 2028',
  },
  {
    ago: 50,
    sender: 'Karim Adel · Hyde Park',
    text: 'وحدات محدودة في The Park District التجمع\nشقة 140 م² 2 غرف 9,940,000 ج.م\nمقدم 5% وتقسيط 10 سنوات\nصيانة 8% ونادي 120,000\nاستلام 2030',
  },
  {
    ago: 80,
    sender: 'Salma Reda · Dubai Misr',
    text: 'Marina Heights — New Capital\nApartment 155 sqm, 3 bedrooms\nPrice EGP 6,700,000\n10% down payment, 8 years installments\nMaintenance 8%\nDelivery 2029',
  },
  {
    ago: 120,
    sender: 'Shady Azmy · Xland',
    text: 'وحدة متاحة Verona — المقطم، الحي السادس\nشقة 137 م² · 3 غرف\nالسعر 3,150,000 ج.م\nمقدم 50% على 36 شهر\nوديعة صيانة 5%\nاستلام فوري',
  },
  {
    ago: 3,
    sender: 'Mariam Fathy · EgyGab',
    text: 'تذكير 🔔 إطلاق جديد Lakeview Terraces التجمع الخامس\nشقة 165 م² 3 غرف بسعر 10,725,000 جنيه\nمقدم 10% وتقسيط على 8 سنوات',
  },
  {
    ago: 200,
    sender: 'Hyde Park PR',
    text: 'تم الانتهاء من أعمال الخرسانة للمرحلة الثانية في The Park District — التجمع الخامس، ونسبة الإنشاءات 62%',
  },
];
