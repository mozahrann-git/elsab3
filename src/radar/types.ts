// Manateq Radar — الأنواع الأساسية.
// بنية البيانات هي القرار الذي لا يُصحَّح لاحقاً إلا بإعادة بناء (الوثيقة التأسيسية، المرحلة صفر):
// المطوّر · المشروع · الوحدة · التحديث (حدث مؤرّخ مرتبط بما قبله) · المصدر.

export type Lang = 'ar' | 'en';
export type Bi = { ar: string; en: string };

/** النوع — المحور الأول من تصنيف كل رسالة. */
export type EventType =
  | 'launch'
  | 'price_update'
  | 'discount'
  | 'limited_offer'
  | 'unit_available'
  | 'limited_units'
  | 'construction_update'
  | 'corporate'
  | 'repeat';

/** الأهمية — حدث حقيقي أم إعادة نشر؟ */
export type Importance = 'real' | 'repeat';

/** الجمهور — المستثمر · البروكر · العميل. */
export type Audience = 'investor' | 'broker' | 'client';

/** أنواع المصدر الثلاثة + العيّنة التجريبية (تُعلَن صراحةً ولا تُقدَّم كبيانات حقيقية). */
export type SourceKind = 'relayed' | 'computed' | 'field' | 'seed';

export interface Source {
  kind: SourceKind;
  /** اسم المرسل أو الطريقة. */
  name: string;
  org?: string;
  /** ISO-8601 */
  date: string;
  /** حجم العيّنة للمحسوب. */
  sample?: number;
}

export type PayFrequency = 'monthly' | 'quarterly' | 'annual';

/** الحقول العشرة المستخرجة من أي رسالة مهما اختلف شكلها أو لغتها. */
export interface Extracted {
  project?: string;
  developer?: string;
  zoneId?: string;
  district?: string;
  unitType?: string;
  rooms?: number;
  area?: number;
  garden?: number;
  price?: number;
  downPct?: number;
  installment?: number;
  months?: number;
  frequency?: PayFrequency;
  maintenancePct?: number;
  deposit?: number;
  garage?: number;
  club?: number;
  /** 'immediate' أو سنة الاستلام. */
  delivery?: string;
  cashDiscountPct?: number;
  /** السعر قبل الخصم إن ذُكر. */
  originalPrice?: number;
  commissionPct?: number;
  incentive?: string;
  sender?: string;
}

export interface RadarEvent {
  id: string;
  /** ISO-8601 */
  receivedAt: string;
  raw: string;
  fields: Extracted;
  type: EventType;
  importance: Importance;
  audiences: Audience[];
  /** null = لا ينتهي (الإطلاق يبقى). */
  expiresAt: string | null;
  source: Source;
  fingerprint: string;
}

export interface PricePoint {
  date: string;
  ppm: number;
}

export interface Zone {
  id: string;
  name: Bi;
  aliases: string[];
  /** موضع على الخريطة المبسّطة (0..1000 × 0..560). */
  x: number;
  y: number;
  avgPpm: number;
  /** متوسط الإيجار الشهري للمتر. */
  rentPpmMonthly: number;
  /** أفق البيع التقديري بالأشهر للوحدات المشابهة. */
  liquidityMonths: number;
  history: PricePoint[];
  source: Source;
}

export interface Developer {
  id: string;
  name: string;
  initials: string;
  aliases: string[];
  zoneIds: string[];
}

export interface Alternative {
  id: 'bank' | 'gold' | 'stocks';
  name: Bi;
  /** العائد السنوي المرجعي (٪). */
  rate: number;
  liquidity: Bi;
  source: Source;
}

export interface Market {
  inflation: { rate: number; source: Source };
  alternatives: Alternative[];
}

export interface DeveloperReply {
  eventId: string;
  text: string;
  date: string;
}
