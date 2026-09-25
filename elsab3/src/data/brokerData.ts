import { BrokerProfile, ViewingRequest, AgencyOffice } from '../types';

export const DEFAULT_BROKERS: BrokerProfile[] = [
  {
    id: 'broker_ahmed',
    name: 'أحمد فؤاد',
    phone: '01098765432',
    email: 'ahmed.broker@lion-estates.com',
    password: 'broker123',
    isActive: true,
    companyName: 'مكتب السبع للشركاء · فرع الهضبة الوسطى',
    officeId: 'office_hadaba_partners',
    commissionRate: 50,
    assignedUnitsCount: 6,
    viewingsThisMonth: 14,
    averageResponseMinutes: 12,
    lateResponsesCount: 0,
    assignedPropertyIds: ['prop-wst-101', 'prop-wst-103', 'SEBA-RSL-101', 'SEBA-RSL-103', 'H1705', 'H1650'],
    createdAt: '2025-11-10',
    notes: 'وسيط معتمد ومسؤول فرع الهضبة الوسطى، أداء ممتاز في سرعة الاستجابة'
  },
  {
    id: 'broker_tarek',
    name: 'م/ طارق عزت',
    phone: '01223344556',
    email: 'tarek.broker@lion-estates.com',
    password: 'tarek2026',
    isActive: true,
    companyName: 'مكتب إليت العقاري الشريك',
    officeId: 'office_elite_mokatam',
    commissionRate: 50,
    assignedUnitsCount: 5,
    viewingsThisMonth: 8,
    averageResponseMinutes: 19,
    lateResponsesCount: 1,
    assignedPropertyIds: ['prop-wst-102', 'prop-wst-104', 'SEBA-RSL-102', 'SEBA-RSL-104', 'H1588'],
    createdAt: '2026-01-15',
    notes: 'مكتب إليت شريك استراتيجي في الحي الثاني والثالث'
  },
  {
    id: 'broker_samy',
    name: 'أ/ سامي الجمل',
    phone: '01122334455',
    email: 'samy.broker@lion-estates.com',
    password: 'samy2026',
    isActive: true,
    companyName: 'وسيط عقاري معتمد (مستقل)',
    commissionRate: 45,
    assignedUnitsCount: 3,
    viewingsThisMonth: 5,
    averageResponseMinutes: 24,
    lateResponsesCount: 0,
    assignedPropertyIds: ['prop-wst-105', 'prop-wst-108', 'H1502'],
    createdAt: '2026-02-01',
    notes: 'متخصص في عمارات تقسيم المباحث والحي السادس'
  }
];

export const DEFAULT_BROKER: BrokerProfile = DEFAULT_BROKERS[0];

export const INITIAL_VIEWING_REQUESTS: ViewingRequest[] = [
  {
    id: 'req_h1705',
    propertyId: 'prop-wst-101',
    propertyCode: 'H1705',
    propertyTitle: 'شقة 140 م² · الحي الأول',
    propertyNeighborhood: 'الحي الأول',
    propertyPrice: 3200000,
    propertyArea: 140,
    propertyImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
    brokerId: 'broker_ahmed',
    brokerName: 'أحمد فؤاد',
    officeId: 'office_hadaba_partners',
    leadId: 'lead_crm_private_991',
    clientPreferredTime: 'النهارده أو بكرة بعد 5 مساءً',
    status: 'pending_broker',
    createdAt: 'من 3 دقايق',
    createdAtTimestamp: Date.now() - 3 * 60 * 1000,
    remindersSent: 0,
    nextReminderCountdownSeconds: 760, // 12:40
    ownerName: 'أ/ محمد خيري',
    ownerPhone: '01001234567',
  },
  {
    id: 'req_h1650',
    propertyId: 'prop-wst-103',
    propertyCode: 'H1650',
    propertyTitle: 'شقة 165 م² · الحي الثالث',
    propertyNeighborhood: 'الحي الثالث',
    propertyPrice: 3600000,
    propertyArea: 165,
    propertyImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    brokerId: 'broker_ahmed',
    brokerName: 'أحمد فؤاد',
    officeId: 'office_hadaba_partners',
    clientPreferredTime: 'النهارده 6:00',
    status: 'scheduled_by_broker',
    createdAt: 'من ساعتين',
    createdAtTimestamp: Date.now() - 2 * 60 * 60 * 1000,
    remindersSent: 1,
    scheduledDay: 'النهارده',
    scheduledTime: '6:00',
    whoOpens: 'owner',
    ownerName: 'م/ حسام الدين',
    ownerPhone: '01122334455',
  },
  {
    id: 'req_h1588',
    propertyId: 'prop-wst-102',
    propertyCode: 'H1588',
    propertyTitle: 'شقة 190 م² · تقسيم المباحث',
    propertyNeighborhood: 'تقسيم المباحث',
    propertyPrice: 4100000,
    propertyArea: 190,
    propertyImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    brokerId: 'broker_tarek',
    brokerName: 'م/ طارق عزت',
    officeId: 'office_elite_mokatam',
    clientPreferredTime: 'بكرة 5:00',
    status: 'confirmed',
    createdAt: 'من 4 ساعات',
    createdAtTimestamp: Date.now() - 4 * 60 * 60 * 1000,
    remindersSent: 1,
    scheduledDay: 'بكرة',
    scheduledTime: '5:00',
    whoOpens: 'guard',
    ownerName: 'د/ إبراهيم فتحي',
    ownerPhone: '01233445566',
  },
  {
    id: 'req_h1502',
    propertyId: 'prop-wst-105',
    propertyCode: 'H1502',
    propertyTitle: 'شقة 130 م² · الحي الثاني',
    propertyNeighborhood: 'الحي الثاني',
    propertyPrice: 2900000,
    propertyArea: 130,
    propertyImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80',
    brokerId: 'broker_samy',
    brokerName: 'أ/ سامي الجمل',
    clientPreferredTime: 'امبارح 4:00',
    status: 'completed',
    createdAt: 'امبارح',
    createdAtTimestamp: Date.now() - 26 * 60 * 60 * 1000,
    remindersSent: 1,
    scheduledDay: 'امبارح',
    scheduledTime: '4:00',
    whoOpens: 'broker',
    ownerName: 'أ/ عادل كمال',
    ownerPhone: '01055667788',
  }
];

export function generateOwnerWhatsAppMessage(request: ViewingRequest): string {
  const ownerName = request.ownerName || 'يا فندم';
  const district = request.propertyNeighborhood || 'الهضبة الوسطى';
  const area = request.propertyArea ? `${request.propertyArea} م²` : '';
  const timePref = request.clientPreferredTime || 'في أقرب وقت متاح';

  return `أهلاً أستاذ ${ownerName}، في عميل جاد عايز يعاين شقتك في ${district} (${area}). ينفع ${timePref}؟`;
}

export const DEFAULT_OFFICES: AgencyOffice[] = [
  {
    id: 'office_hadaba_partners',
    name: 'مكتب السبع للشركاء · فرع الهضبة الوسطى',
    managerName: 'أحمد فؤاد',
    phone: '01098765432',
    email: 'partners@lion-estates.com',
    address: 'شارع الجامعة الحديثة · المقطم',
    commissionSplitPercent: 50,
    assignedUnitsCount: 6,
    viewingsCount: 14,
    totalCommissionEarned: 145000,
    pendingCommission: 48000,
    team: [
      { id: 'tm_1', name: 'أحمد فؤاد', phone: '01098765432', role: 'director', activeViewings: 3 },
      { id: 'tm_2', name: 'كريم عبد الله', phone: '01011223344', role: 'broker', activeViewings: 2 },
      { id: 'tm_3', name: 'سارة ممدوح', phone: '01155443322', role: 'coordinator', activeViewings: 1 }
    ]
  },
  {
    id: 'office_elite_mokatam',
    name: 'مكتب إليت العقاري الشريك',
    managerName: 'م/ طارق عزت',
    phone: '01223344556',
    email: 'elite.hadaba@gmail.com',
    address: 'شارع كلية الصيدلة · الحي الثاني',
    commissionSplitPercent: 50,
    assignedUnitsCount: 5,
    viewingsCount: 8,
    totalCommissionEarned: 82000,
    pendingCommission: 35000,
    team: [
      { id: 'tm_elite_1', name: 'م/ طارق عزت', phone: '01223344556', role: 'director', activeViewings: 2 },
      { id: 'tm_elite_2', name: 'محمود سامي', phone: '01077889900', role: 'broker', activeViewings: 2 }
    ]
  }
];
