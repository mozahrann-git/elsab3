export type HadabaWostaNeighborhood =
  | 'الحي الأول'
  | 'الحي الثاني'
  | 'الحي الثالث'
  | 'الحي الرابع'
  | 'الحي الخامس'
  | 'الحي السادس'
  | 'الحي السابع'
  | 'الحي الثامن'
  | 'تقسيم المباحث';

export type ListingCategory = 'resale' | 'off_plan';

export type OffPlanCategoryType = 'standalone_building' | 'compound';

export type FinishingType = 
  | 'finished'       // متشطب بالكامل (سوبر / ألترا سوبر لوكس)
  | 'semi_finished';  // نصف تشطيب (محارة وحلوق وسباكة وكهرباء)

export type PropertyType = 
  | 'apartment'        // شقة سكنية
  | 'duplex'           // دوبلكس
  | 'penthouse'        // بنتهاوس ورُوف
  | 'ground_garden';   // أرضي بحديقة خاصة

export interface PropertyClicks {
  whatsapp: number;
  call: number;
  views: number;
  favorites: number;
}

export interface Property {
  id: string;
  code: string;                     // e.g. MOK-MID-104 or SEBA-RSL-101 or SEBA-OFF-101
  title: string;
  titleEn?: string;
  category?: ListingCategory;       // 'resale' (ريسيل - استلام فوري) | 'off_plan' (تحت الإنشاء)
  offPlanType?: OffPlanCategoryType; // 'standalone_building' (عمارات منفصلة 35%-50% مقدم، 2-3 سنوات) | 'compound' (كمبوندات من 10% مقدم حتى 10 سنوات)
  plotNumber?: string;              // رقم القطعة في العمارات المنفصلة (مثال: "قطعة 8432" أو "قطعة 105 أ")
  buildingName?: string;            // اسم العمارة
  compoundName?: string;            // اسم الكمبوند
  availableUnits?: {                // المساحات والوحدات المتاحة داخل القطعة أو الكمبوند
    id?: string;
    area: number;                   // المساحة بالمتر المربع
    floor: string;                  // الدور
    bedrooms: number;               // غرف
    bathrooms: number;              // حمامات
    price: number;                  // السعر الإجمالي
    downPaymentAmount?: number;     // قيمة المقدم
    monthlyInstallment?: number;    // القسط الشهري / الربع سنوي
    finishing?: string;             // التشطيب
    view?: string;                  // الفيو
    isGardenOrRoof?: boolean;       // حديقة أو روف
    gardenOrRoofArea?: number;      // مساحة الروف أو الحديقة
  }[];
  buildingDetails?: {               // تفاصيل العمارة والقطعة
    totalUnits?: number;
    unitsPerFloor?: number;
    licenseStatus?: string;         // حالة الترخيص ونسبة البناء
    landShare?: string;             // حصة الأرض
    streetWidth?: string;           // عرض الشارع
    facadeType?: string;            // نوع الواجهة
    constructionProgress?: string;  // نسبة الإنجاز والإنشاء
  };
  compoundDetails?: {               // تفاصيل الكمبوند
    totalArea?: string;             // مساحة المشروع
    clubHouse?: boolean;
    swimmingPools?: boolean;
    commercialMall?: boolean;
    maintenanceFee?: string;        // وديعة الصيانة
    parkingDetails?: string;        // تفاصيل الجراج
  };
  projectName?: string;             // اسم المشروع أو العمارة أو الكمبوند
  developerName?: string;           // اسم المطور أو شركة المقاولات
  downPaymentPercentage?: number;   // نسبة المقدم: 10, 15, 35, 50 %
  installmentYears?: number;        // عدد سنوات التقسيط: 2، 3 (للعمارات) أو حتى 10 (للكمبوندات)
  deliveryYear?: string;            // موعد الاستلام مثل "2026", "2027", "2028"
  neighborhood: HadabaWostaNeighborhood;
  propertyType: PropertyType;
  propertyTypeLabel: string;
  finishing: FinishingType;
  finishingLabel: string;
  price: number;                    // EGP (Asking Price)
  pricePerMeter: number;            // EGP/m²
  area: number;                     // m²
  bedrooms: number;                 // 2, 3, 4
  bathrooms: number;                // 1, 2, 3
  floor: string;                    // e.g. "الدور الثالث", "الدور الثاني"
  totalFloors?: number;
  view: string;                     // e.g. "واجهة بحري شارع رئيسي", "فيو حديقة"
  deliveryDate: string;             // "استلام فوري" أو "استلام 2026"
  paymentMethod: 'cash' | 'cash_or_facilities'; // كاش فوري أو بتسهيلات قصيرة
  images: string[];                 // Property photos (flexible count: 1, 2, 3, or more photos)
  videoUrl?: string;                // Property video / video tour (YouTube, Drive, Vimeo, MP4, etc.)
  videoMuted?: boolean;             // True if video is without sound / silent
  features: string[];
  description: string;
  ownerName?: string;
  ownerPhone?: string;
  brokerId?: string;                // مسند لبروكر معين
  ownerEmail?: string;              // حساب المالك في البوابة
  viewingsPaused?: boolean;         // المالك طلب إيقاف المعاينات
  lastViewAt?: number;              // آخر مشاهدة حقيقية
  lastRequestAt?: number;           // آخر طلب (واتساب/مكالمة)
  note?: string;
  location?: string;
  sales?: string;
  isFeatured?: boolean;
  hasElevator: boolean;
  hasGarage: boolean;
  registeredContract: boolean;      // مسجلة / حصة بالأرض
  createdAt: string;
  clicks: PropertyClicks;
}

export interface FilterState {
  search: string;
  category: 'all' | 'resale' | 'off_plan';
  offPlanType: 'all' | 'standalone_building' | 'compound';
  downPaymentPercentMax?: number;    // Slider for max down payment percentage (e.g., 10% to 50%)
  installmentYearsMax?: number;      // Slider for installment duration (e.g., 2 to 10 years)
  deliveryYearMax?: number;          // Slider for delivery year (e.g., 2026 to 2030)
  downPayment?: 'all' | '10' | '15' | '35' | '50' | string;
  installmentYears?: 'all' | '2' | '3' | '7' | '8' | '10' | string;
  budgetRange?: 'all' | 'under_2m' | '2.2m_2.4m' | '2.5m_2.7m' | '2.8m_3.2m' | '3.2m_3.8m' | '4m_plus' | string;
  neighborhood: string;             // 'all' or specific neighborhood 1-8
  finishing: 'all' | 'finished' | 'semi_finished';
  bedrooms: 'all' | '2' | '3' | '4+';
  propertyType?: string;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  floor?: string;
  hasGarageOnly: boolean;
  hasElevatorOnly: boolean;
  registeredOnly: boolean;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'views_desc' | 'most_viewed';
}

export interface OwnerSubmission {
  id: string;
  ownerName: string;
  propertyCode?: string;            // كود الوحدة لو المالك عارفه، بيربط الطلب بالشقة على طول
  phone: string;
  whatsapp: string;
  neighborhood: HadabaWostaNeighborhood;
  unitType: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  finishing: FinishingType;
  askingPrice: number;
  price?: number;                   // Optional alias for askingPrice
  ownerPhone?: string;              // Optional alias for phone
  paymentMethod: 'cash' | 'cash_or_facilities';
  unitDescription: string;
  exactLocation?: string;           // لوكيشن الوحدة بالتحديد (العنوان التفصيلي / الشارع ورقم العمارة / رابط جوجل ماب)
  googleMapsUrl?: string;           // رابط موقع الشقة على خرائط جوجل
  viewingSchedule?: string;         // مواعيد وأيام المعاينة المناسبة للمالك
  inspectionContactPhone?: string;  // رقم اتصال إضافي اختياري للمعاينات
  inspectionContactRole?: string;   // صفة مسؤول المعاينة (حارس العقار / البواب / وسيط / شريك / المالك نفسه / وكيل)
  images: string[];                 // Photos uploaded (flexible count: 1, 2, 3, or more photos)
  videoUrl?: string;                // Optional video link
  videoMuted?: boolean;             // True if video is without sound / silent
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  notes?: string;
  ownerEmail?: string;              // حساب المالك/البروكر في البوابة
  brokerId?: string;                // لو اللي عارضها بروكر
  submittedAtMs?: number;
  realOwnerName?: string;           // صاحب الشقة الحقيقي لو اللي عارضها بروكر
  realOwnerPhone?: string;
  qualityCheck?: { by: string; at: number; accountDelivered?: boolean; note?: string };
}

export interface AdminCredentials {
  email: string;
  passwordHash?: string;
  isLoggedIn: boolean;
  lastLogin?: string;
}

// -------------------------------------------------------------
// CRM & GAMIFICATION SYSTEM TYPES
// -------------------------------------------------------------

export type LeadStatus = 
  | 'new'           // عميل جديد
  | 'contacted'     // تم التواصل
  | 'sent_details'  // إرسال تفاصيل / صور
  | 'visit_requested' // معاينة تحت الطلب (تنسيق سارة حنفي)
  | 'visit_booked'  // معاينة مؤكدة (ميعاد محدد)
  | 'visit_done'    // تمت المعاينة على أرض الواقع
  | 'negotiation'   // تفاوض ودفع عربون
  | 'closed'        // تم الإغلاق وكتابة العقد (Deal Won)
  | 'lost';         // غير مهتم / إلغاء (Lost)

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  source: 'facebook_group' | 'website_whatsapp' | 'cold_call' | 'referral' | 'direct';
  interestedPropertyCode?: string;
  interestedPropertyTitle?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredNeighborhood?: string;
  preferredFinishing?: 'finished' | 'semi_finished' | 'all';
  preferredBedrooms?: number;
  assignedAgentId: string;
  assignedAgentName: string;
  status: LeadStatus;
  dealValue?: number;
  commission?: number;
  notes: string[];
  lastContactDate?: string;
  createdAt: string;
  visitScheduledAt?: string;
  visitLocation?: string;
  followUpScheduledAt?: string;
  followUpNote?: string;
  followUpStatus?: 'pending' | 'completed' | 'snoozed';
  followUpUrgency?: 'urgent' | 'today' | 'upcoming';
  // نتيجة وتعليق المعاينة الميدانية من البروكر
  fieldViewingComment?: string;
  fieldViewingOutcome?: string;
  fieldViewingBrokerName?: string;
  fieldViewingRecordedAt?: string;
  coordinatorName?: string;
  nextActionAt?: number | null;     // ميعاد الأكشن الجاي بالظبط (تنبيه حقيقي)
  activity?: { at: number; by: string; outcome: string; comment: string; nextAt?: number; transferTo?: string }[];
  transferredFrom?: string;
  snoozeCount?: number;             // كام مرة اتأجل، بيظهر في تقرير الليدر
}

export interface FollowUpAlert {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: LeadStatus;
  assignedAgentId: string;
  assignedAgentName: string;
  type: 'follow_up' | 'visit' | 'overdue_contact' | 'urgent_lead';
  title: string;
  dueTime: string;
  note?: string;
  urgency: 'urgent' | 'today' | 'upcoming';
  relativeTimeText: string;
  isOverdue?: boolean;
}

export interface OwnerPrivateDetails {
  ownerName?: string;
  ownerPhone?: string;
  notes?: string;
  updatedAt?: string;
}

export interface SalesAgent {
  teamLeadId?: string;              // تحت أنهي تيم ليدر
  isTeamLead?: boolean;
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatarUrl?: string;
  role: 'sales_agent' | 'team_leader' | 'sales_manager';
  commissionRate?: number; // e.g. 25%
  isActive?: boolean;
  xp: number;
  level: number;
  currentStreak: number;
  dealsClosedCount: number;
  totalCommissionEarned: number;
  visitsCompletedCount: number;
  listingsAddedCount: number;
  badges: Badge[];
  activeQuests: DailyQuest[];
  isCurrentSession?: boolean;
}

export interface ViewingFeedback {
  id: string;
  propertyCode: string;
  date: string;
  agentName: string;
  showingStatus: 'completed' | 'scheduled' | 'canceled';
  summary: string;
  buyerInterestLevel: 'high' | 'medium' | 'low';
  priceFeedback: 'fair' | 'slightly_high' | 'overpriced' | 'bargain';
  brokerName?: string;
  requestingSalesAgentName?: string;
  coordinatorName?: string;
  outcome?: string;
  clientName?: string;
}

export interface LandlordPropertyData {
  propertyCode: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  neighborhood: string;
  price: number;
  area: number;
  status: 'active' | 'negotiation' | 'paused' | 'sold';
  viewsCount: number;
  inquiriesCount: number;
  showingsDoneCount: number;
  showingsScheduledCount: number;
  feedbacks: ViewingFeedback[];
  boostStatus?: 'none' | 'active_500' | 'pending';
  lastPriceReductionDate?: string;
}

export interface BrokerListing {
  id: string;
  brokerId: string;
  brokerName: string;
  brokerPhone: string;
  propertyCode: string;
  title: string;
  neighborhood: string;
  price: number;
  area: number;
  commissionPercentage: number;
  estimatedCommission: number;
  status: 'active' | 'showing' | 'negotiation' | 'closed' | 'paid';
  dealStage: string;
  submittedAt: string;
  paidAt?: string;
  smartShareUrl?: string;
}

export interface BrokerPartner {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  agencyName?: string;
  status: 'active' | 'pending' | 'suspended';
  totalCommissionPaid: number;
  pendingCommission: number;
  activeUnitsCount: number;
  closedDealsCount: number;
}

export interface Badge {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  color: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  category: 'facebook_share' | 'calls' | 'site_visit' | 'add_listing' | 'close_deal';
}

export interface BroadcastEmergencyAlert {
  id: string;
  senderName: string;
  message: string;
  bonusAmount?: string;
  createdAt: string;
  isActive: boolean;
  priority: 'urgent' | 'high' | 'normal';
}

export interface SpinPrize {
  id: string;
  title: string;
  amount: number;
  color: string;
  type: 'cash' | 'voucher' | 'early_leave' | 'free_lunch';
}

export interface DistrictGuideInfo {
  id?: string;
  name: string;
  tagline: string;
  desc: string;
  imageUrl?: string;
  locationDetails: string;
  avgMeterFinished: string;
  avgMeterSemi: string;
  keyLandmarks: string[];
  mainRoads: string[];
  advantages: string[];
  propertyTypesFocus: string;
  investmentRating?: number;
  residentialRating?: number;
}

export interface HighwayInfo {
  name: string;
  description: string;
  destinations: string;
  travelTime: string;
}

export interface LandmarkItem {
  name: string;
  district: string;
  desc: string;
}

export interface LandmarkCategory {
  category: string;
  items: LandmarkItem[];
}

export interface LegalTip {
  title: string;
  description: string;
  iconType: 'shield' | 'document' | 'check' | 'alert';
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  preferredNeighborhoods: string[];
  preferredFinishing?: 'all' | 'finished' | 'semi_finished';
  budgetMax?: number;
  budgetMin?: number;
  enableNewListingAlerts: boolean;
  enablePriceDropAlerts: boolean;
  registeredAt: string;
}

export interface ClientNotification {
  id: string;
  clientId?: string;
  propertyCode: string;
  propertyTitle: string;
  propertyNeighborhood: string;
  propertyPrice: number;
  propertyImage?: string;
  title: string;
  message: string;
  type: 'new_listing' | 'price_drop' | 'urgent_deal';
  createdAt: string;
  isRead: boolean;
}

export interface FooterConfig {
  branchAddress?: string;
  workingHours?: string;
  aboutText?: string;
  phone?: string;
  whatsapp?: string;
  copyrightText?: string;
  tagline?: string;
}

// -------------------------------------------------------------
// MARKET PRICE MAP & VALUATION & CLOSED DEALS TYPES
// -------------------------------------------------------------

export interface ClosedDeal {
  id: string;
  neighborhood: HadabaWostaNeighborhood;
  area: number;
  price: number;
  daysToClose: number;
  timeframeLabel: string; // e.g. 'اتباعت الأسبوع ده', 'اتباعت من أسبوعين', 'اتباعت الشهر ده'
  closedDate?: string;
  notes?: string;
}

export interface NeighborhoodPriceMapData {
  neighborhood: HadabaWostaNeighborhood;
  avgFinishedPrice: number;     // متوسط سعر المتر متشطب (ج.م)
  avgSemiFinishedPrice: number; // متوسط سعر المتر نصف تشطيب (ج.م)
  heatScore: number;            // 1 (lowest) to 10 (highest) for heatmap gradient
  keyLandmarks: string;         // المحاور والخدمات
  availableUnitsCount?: number; // عدد الوحدات المتاحة
}

export interface ValuationSubmission {
  id: string;
  neighborhood: HadabaWostaNeighborhood;
  area: number;
  floorType: 'ground_garden' | 'floor_1_4' | 'floor_5_7' | 'floor_5_7';
  finishing: 'super_lux' | 'semi_finished';
  features: string[];
  estimatedMinPrice: number;
  estimatedMaxPrice: number;
  similarUnitsCount: number;
  phone: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'visited';
}

export interface InstantWhatsAppAlert {
  id: string;
  neighborhood: HadabaWostaNeighborhood | 'all';
  maxBudget: number;
  phone: string;
  createdAt: string;
  status: 'active' | 'sent';
}

// -------------------------------------------------------------
// BROKER PORTAL & VIEWING REQUESTS TYPES
// -------------------------------------------------------------

export interface AgencyTeamMember {
  id: string;
  name: string;
  phone: string;
  role: 'director' | 'broker' | 'coordinator';
  activeViewings: number;
}

export interface AgencyOffice {
  id: string;
  name: string;
  managerName: string;
  phone: string;
  email?: string;
  address?: string;
  commissionSplitPercent: number;  // نسبة العمولة من السبع (e.g. 50%)
  assignedUnitsCount: number;
  viewingsCount: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  team: AgencyTeamMember[];
}

export interface BrokerProfile {
  id: string;                      // Firebase Auth UID or broker identifier (e.g. 'broker_ahmed')
  name: string;                    // اسم البروكر (e.g. 'أحمد فؤاد')
  phone: string;                   // هاتف البروكر
  email: string;                   // إيميل البروكر المسجل (للدخول الخاص)
  password?: string;               // كلمة المرور للدخول الخاص
  isActive?: boolean;              // حالة الحساب (نشط / موقوف)
  companyName?: string;            // اسم المكتب أو الشركة
  officeId?: string;               // معرف المكتب المسجل تحته
  commissionRate?: number;         // نسبة العمولة من السبع (افتراضي 50%)
  assignedPropertyIds?: string[];  // معرفات وأكواد الشقق المسندة له حصرياً
  assignedUnitsCount: number;      // عدد الوحدات المسندة للبروكر
  viewingsThisMonth: number;       // عدد المعاينات المنفذة الشهر ده
  averageResponseMinutes: number;  // متوسط سرعة الرد بالدقائق
  lateResponsesCount: number;      // عدد مرات التأخير المسجلة في البروفايل
  createdAt?: string;              // تاريخ انضمام البروكر
  notes?: string;                  // ملاحظات الإدارة
  fcmToken?: string;               // Push notification FCM Token
}

export type ViewingRequestStatus = 
  | 'pending_broker'       // طلب جديد - مستني البروكر يكلم المالك ويحدد معاد
  | 'scheduled_by_broker'  // البروكر حدد المعاد - مستني تأكيد العميل مع فريق السيلز
  | 'confirmed'            // مؤكدة ومعاد محجوز رسمي
  | 'escalated_to_admin'   // متأخرة بعد 4 تذكيرات واتحولت لإدارة السبع
  | 'cancelled'            // ملغية لعدم توفر المالك أو البيع
  | 'completed';           // تمت المعاينة بنجاح

export interface ViewingRequest {
  id: string;
  propertyId: string;
  propertyCode: string;            // e.g. H1705
  propertyTitle: string;           // e.g. شقة 140 م² · الحي الأول
  propertyNeighborhood: string;    // e.g. الحي الأول
  propertyPrice: number;           // e.g. 3200000
  propertyArea: number;            // e.g. 140
  propertyImage?: string;
  brokerId: string;                // البروكر المسؤول
  brokerName?: string;
  officeId?: string;               // المكتب التابع له
  assigneeName?: string;           // اسم مسؤول المعاينة الميداني
  leadId?: string;                 // مخفي تماماً عن البروكر (أدمن فقط)
  requestingAgentId?: string;      // كود السيلز الذي طلب المعاينة
  requestingAgentName?: string;    // اسم السيلز
  requestingAgentPhone?: string;   // هاتف السيلز
  coordinatorName?: string;        // مسؤولة التنسيق (e.g. سارة حنفي)
  clientName?: string;             // اسم العميل
  clientPhone?: string;            // هاتف العميل
  clientNotes?: string;            // ملاحظات السيلز والعميل
  clientPreferredTime: string;     // e.g. "النهارده أو بكرة بعد 5 مساءً"
  status: ViewingRequestStatus;
  createdAt: string;               // تاريخ ووقت الإنشاء
  createdAtTimestamp: number;      // وقت الإنشاء بالـ millisecond
  remindersSent: number;           // عدد التذكيرات المرسلة: 0 إلى 4
  nextReminderCountdownSeconds?: number; // ثواني التذكير القادم (افتراضي 15 دقيقة)
  
  // بيانات المعاد المحدد بواسطة البروكر
  scheduledDay?: string;           // 'النهارده' | 'بكرة' | 'تاريخ محدد'
  scheduledDate?: string;          // YYYY-MM-DD
  scheduledTime?: string;          // e.g. '6:00'
  whoOpens?: 'owner' | 'guard' | 'broker'; // المالك | الحارس | أنا
  scheduledNote?: string;          // ملاحظة للفريق
  scheduledAtTimestamp?: number;

  // تأجيل التذكيرات أو الإلغاء
  remindersPausedUntil?: number;   // تأجيل التذكيرات 60 دقيقة ("محتاج ساعة")
  cancellationReason?: 'owner_unavailable' | 'sold' | 'other';
  cancellationNote?: string;

  // نتيجة المعاينة بعد التنفيذ
  viewingOutcome?: 'interested' | 'made_offer' | 'not_suitable' | 'postponed';
  viewingFeedback?: string;
  outcome?: string;
  outcomeFeedback?: string;
  completedAtTimestamp?: number;

  // بيانات المالك (خاصة للبروكر والادمن فقط - لا يراها العميل نهائياً)
  ownerName?: string;
  ownerPhone?: string;
}

// -------------------------------------------------------------
// PORTAL ACCESS & GOVERNANCE AUDIT TRAIL TYPES
// -------------------------------------------------------------

export type PortalRole = 'admin' | 'landlord' | 'broker' | 'sales';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: PortalRole;
  isActive: boolean;
  assignedPropertyCodes?: string[]; // للمالك: أكواد الشقق التي يراها حصرياً
  brokerId?: string;               // للبروكر: معرف حسابه
  salesAgentId?: string;           // للسيلز: معرف حسابه
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
  passwordHint?: string;
}

export type GovernanceEventType = 
  | 'sarah_notified_broker'      // إشعار لبروكر من سارة
  | 'landlord_paused_unit'        // مالك عمل إيقاف فقط
  | 'landlord_resumed_unit'       // مالك أعاد تنشيط الشقة
  | 'sales_logged_activity'      // سيلز سجل نشاط
  | 'sales_new_lead'             // سيلز سجل عميل جديد
  | 'sales_slacking_alert'       // سيلز متخاذل / خامل
  | 'viewing_comment_pending'    // كومنت على معاينة ما نزلت
  | 'viewing_comment_published'; // كومنت معاينة نزل وسُجل

export interface GovernanceAuditLog {
  id: string;
  type: GovernanceEventType;
  title: string;
  description: string;
  timestamp: string;
  timestampMs: number;
  actorName: string;
  actorEmail?: string;
  actorRole: PortalRole | 'system' | 'sarah_hanafy';
  targetPropertyCode?: string;
  targetClientName?: string;
  targetClientPhone?: string;
  targetBrokerName?: string;
  targetSalesAgentName?: string;
  severity: 'info' | 'warning' | 'urgent' | 'success';
  metadata?: Record<string, any>;
  isResolved?: boolean;
}


