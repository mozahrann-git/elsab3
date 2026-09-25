import { ViewingFeedback, BrokerPartner, BrokerListing } from '../types';

export type BrokerUnitListing = BrokerListing;
export type { BrokerPartner };

export const INITIAL_VIEWING_FEEDBACKS: ViewingFeedback[] = [
  {
    id: 'fb-1',
    propertyCode: 'MOK-MID-104',
    date: 'منذ يومين',
    agentName: 'أحمد السبع',
    showingStatus: 'completed',
    summary: 'الموقع ممتاز جداً وتشطيب الريسبشن الترا سوبر لوكس والمطبخ كبير ومريح. العميل يبدي اهتماماً كبيراً.',
    buyerInterestLevel: 'high',
    priceFeedback: 'slightly_high'
  },
  {
    id: 'fb-2',
    propertyCode: 'MOK-MID-104',
    date: 'منذ 4 أيام',
    agentName: 'محمود فهمي',
    showingStatus: 'completed',
    summary: 'فيو الحديقة مفتوح والتهوية رائعة، وموقع العمارة راقي وقريب من الخدمات. ينتظر موافقة البنك.',
    buyerInterestLevel: 'high',
    priceFeedback: 'fair'
  },
  {
    id: 'fb-3',
    propertyCode: 'MOK-DUP-201',
    date: 'منذ أسبوع',
    agentName: 'أحمد السبع',
    showingStatus: 'completed',
    summary: 'مساحة الدوبلكس والحديقة الخاصة ممتازة ومثالية للعائلة، يطلب تفاوض بسيط على دفعة الحجز.',
    buyerInterestLevel: 'medium',
    priceFeedback: 'fair'
  }
];

export const INITIAL_BROKER_PARTNERS: BrokerPartner[] = [
  {
    id: 'brk-1',
    name: 'كريم المنشاوي',
    agencyName: 'قمة الهضبة للاستثمار العقاري',
    phone: '01099887766',
    whatsapp: '01099887766',
    status: 'active',
    totalCommissionPaid: 85000,
    pendingCommission: 35000,
    activeUnitsCount: 6,
    closedDealsCount: 4
  },
  {
    id: 'brk-2',
    name: 'عمر الصاوي',
    agencyName: 'الصاوي هومز المقطم',
    phone: '01122334455',
    whatsapp: '01122334455',
    status: 'active',
    totalCommissionPaid: 45000,
    pendingCommission: 20000,
    activeUnitsCount: 3,
    closedDealsCount: 2
  },
  {
    id: 'brk-3',
    name: 'شريف النجار',
    agencyName: 'وسيط عقاري حر',
    phone: '01233445566',
    whatsapp: '01233445566',
    status: 'active',
    totalCommissionPaid: 120000,
    pendingCommission: 50000,
    activeUnitsCount: 8,
    closedDealsCount: 5
  }
];

export const INITIAL_BROKER_LISTINGS: BrokerListing[] = [
  {
    id: 'blist-1',
    brokerId: 'brk-1',
    brokerName: 'كريم المنشاوي',
    brokerPhone: '01099887766',
    propertyCode: 'BRK-701',
    title: 'شقة 180م بحري فيو بانوراما بالحي الثاني',
    neighborhood: 'الحي الثاني',
    price: 3400000,
    area: 180,
    commissionPercentage: 2.5,
    estimatedCommission: 85000,
    status: 'active',
    dealStage: 'معروضة ونشطة في شبكة التعاون',
    submittedAt: '2026-03-01'
  },
  {
    id: 'blist-2',
    brokerId: 'brk-2',
    brokerName: 'عمر الصاوي',
    brokerPhone: '01122334455',
    propertyCode: 'BRK-702',
    title: 'دوبلكس 240م بحديقة خاصة الحي الدبلوماسي',
    neighborhood: 'الحي الدبلوماسي',
    price: 4800000,
    area: 240,
    commissionPercentage: 2.5,
    estimatedCommission: 120000,
    status: 'showing',
    dealStage: 'جاري حجز موعد معاينة مشتركة مع العميل',
    submittedAt: '2026-03-03'
  },
  {
    id: 'blist-3',
    brokerId: 'brk-3',
    brokerName: 'شريف النجار',
    brokerPhone: '01233445566',
    propertyCode: 'BRK-703',
    title: 'بنتهاوس 210م مع روف خاص بحي النرجس',
    neighborhood: 'حي النرجس',
    price: 3900000,
    area: 210,
    commissionPercentage: 2.5,
    estimatedCommission: 97500,
    status: 'active',
    dealStage: 'تم التحقق من الأوراق ومطابقتها',
    submittedAt: '2026-03-06'
  }
];
