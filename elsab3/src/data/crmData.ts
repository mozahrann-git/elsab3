import { 
  SalesAgent, 
  Lead, 
  DailyQuest, 
  BroadcastEmergencyAlert, 
  SpinPrize, 
  Badge,
  ViewingFeedback,
  BrokerListing,
  BrokerPartner
} from '../types';

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'visit_king',
    title: 'ملك المعاينات',
    titleEn: 'King of Site Visits',
    description: 'إجراء أكثر من 10 معاينات ناجحة على أرض الواقع',
    icon: '👑',
    color: 'from-amber-500 to-yellow-300'
  },
  {
    id: 'deal_closer',
    title: 'صياد الصفقات',
    titleEn: 'Master Closer',
    description: 'إغلاق 3 صفقات بيع ريسيل في نفس الشهر',
    icon: '💎',
    color: 'from-emerald-500 to-teal-300'
  },
  {
    id: 'listing_hunter',
    title: 'صياد الحصريات',
    titleEn: 'Exclusive Listing Hunter',
    description: 'إدخال 5 وحدات ريسيل حصرية مباشرة من الملاك',
    icon: '🎯',
    color: 'from-blue-500 to-indigo-300'
  },
  {
    id: 'fast_responder',
    title: 'الصاروخ',
    titleEn: 'Rapid Responder',
    description: 'الرد على العملاء ومتابعتهم في أقل من 5 دقائق',
    icon: '⚡',
    color: 'from-purple-500 to-fuchsia-300'
  },
  {
    id: 'facebook_master',
    title: 'وحش السوشيال ميديا',
    titleEn: 'Social Media Beast',
    description: 'نشر 30 إعلان على جروبات فيسبوك الهضبة والمقطم',
    icon: '🦁',
    color: 'from-rose-500 to-orange-400'
  }
];

export const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'q_fb',
    title: 'نشر 5 إعلانات على جروبات فيسبوك',
    description: 'استخدم أداة تجهيز إعلان فيسبوك للشقق وانشرها بجروبات المقطم والهضبة',
    xpReward: 50,
    targetCount: 5,
    currentCount: 3,
    isCompleted: false,
    category: 'facebook_share'
  },
  {
    id: 'q_calls',
    title: 'إجراء 15 مكالمة متابعة لليدز',
    description: 'تواصل مع العملاء في مراحل المتابعة المسجلة بالسيستم',
    xpReward: 100,
    targetCount: 15,
    currentCount: 9,
    isCompleted: false,
    category: 'calls'
  },
  {
    id: 'q_visit',
    title: 'تأكيد معاينة على أرض الواقع (Site Visit)',
    description: 'تنسيق ونزول معاينة لشقة ريسيل مسجلة مع عميل جاد',
    xpReward: 300,
    targetCount: 1,
    currentCount: 1,
    isCompleted: true,
    category: 'site_visit'
  },
  {
    id: 'q_listing',
    title: 'إدخال وحدة جديدة (Listing) برقم المالك',
    description: 'إضافة تفاصيل وصور شقة ريسيل جديدة من صاحب العقار',
    xpReward: 200,
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    category: 'add_listing'
  }
];

export const INITIAL_SALES_AGENTS: SalesAgent[] = [
  {
    id: 'agent_ahmed',
    name: 'أحمد زهران',
    email: 'ahmed@lion-estates.com',
    phone: '01021242871',
    whatsapp: '201021242871',
    role: 'sales_agent',
    commissionRate: 25,
    isActive: true,
    xp: 2850,
    level: 5,
    currentStreak: 6,
    dealsClosedCount: 4,
    totalCommissionEarned: 185000,
    visitsCompletedCount: 14,
    listingsAddedCount: 8,
    badges: [INITIAL_BADGES[0], INITIAL_BADGES[1], INITIAL_BADGES[2]],
    activeQuests: INITIAL_DAILY_QUESTS,
    isCurrentSession: true
  },
  {
    id: 'agent_mahmoud',
    name: 'محمود السبع',
    email: 'mahmoud@lion-estates.com',
    phone: '01011223344',
    whatsapp: '201011223344',
    role: 'team_leader',
    commissionRate: 30,
    isActive: true,
    xp: 4120,
    level: 7,
    currentStreak: 12,
    dealsClosedCount: 7,
    totalCommissionEarned: 320000,
    visitsCompletedCount: 22,
    listingsAddedCount: 15,
    badges: [INITIAL_BADGES[0], INITIAL_BADGES[1], INITIAL_BADGES[4]],
    activeQuests: INITIAL_DAILY_QUESTS
  },
  {
    id: 'agent_karim',
    name: 'كريم الشناوي',
    email: 'karim@lion-estates.com',
    phone: '01122334455',
    whatsapp: '201122334455',
    role: 'sales_agent',
    commissionRate: 20,
    isActive: true,
    xp: 1950,
    level: 4,
    currentStreak: 3,
    dealsClosedCount: 2,
    totalCommissionEarned: 95000,
    visitsCompletedCount: 9,
    listingsAddedCount: 4,
    badges: [INITIAL_BADGES[3]],
    activeQuests: INITIAL_DAILY_QUESTS
  },
  {
    id: 'agent_sara',
    name: 'سارة حنفي',
    email: 'sara@lion-estates.com',
    phone: '01234567890',
    whatsapp: '201234567890',
    role: 'sales_agent',
    commissionRate: 25,
    isActive: true,
    xp: 2300,
    level: 4,
    currentStreak: 5,
    dealsClosedCount: 3,
    totalCommissionEarned: 140000,
    visitsCompletedCount: 11,
    listingsAddedCount: 6,
    badges: [INITIAL_BADGES[2], INITIAL_BADGES[4]],
    activeQuests: INITIAL_DAILY_QUESTS
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_101',
    name: 'د. طارق المنشاوي',
    phone: '01009876543',
    whatsapp: '201009876543',
    source: 'facebook_group',
    interestedPropertyCode: 'H1118',
    interestedPropertyTitle: 'شقة 180م² الحي الثاني (قسط على سنتين)',
    budgetMin: 3000000,
    budgetMax: 3600000,
    preferredNeighborhood: 'الحي الثاني',
    preferredFinishing: 'finished',
    preferredBedrooms: 3,
    assignedAgentId: 'agent_ahmed',
    assignedAgentName: 'أحمد زهران',
    status: 'visit_booked',
    dealValue: 3450000,
    commission: 86250,
    notes: [
      'مهتم جداً بشقق الحي الثاني 3 غرف في حدود 3.6 مليون',
      'تم الاتفاق على موعد معاينة اليوم الساعة 5 مساءً'
    ],
    lastContactDate: 'منذ ساعتين',
    createdAt: '2026-03-05',
    visitScheduledAt: 'اليوم 5:00 م',
    visitLocation: 'الحي الثاني - الهضبة الوسطى',
    followUpScheduledAt: 'اليوم 04:30 م',
    followUpNote: 'تأكيد المعاينة وإرسال اللوكيشن للعميل عبر واتساب',
    followUpStatus: 'pending',
    followUpUrgency: 'urgent'
  },
  {
    id: 'lead_102',
    name: 'م/ إبراهيم حلمي',
    phone: '01123456789',
    whatsapp: '201123456789',
    source: 'website_whatsapp',
    interestedPropertyCode: 'H1305',
    interestedPropertyTitle: 'شقة الحي الأول فيو بانوراما الدائري',
    budgetMin: 2200000,
    budgetMax: 2800000,
    preferredNeighborhood: 'الحي الأول',
    preferredFinishing: 'semi_finished',
    preferredBedrooms: 3,
    assignedAgentId: 'agent_ahmed',
    assignedAgentName: 'أحمد زهران',
    status: 'negotiation',
    dealValue: 2450000,
    commission: 61250,
    notes: [
      'عاين الوحدة وأبدى رغبة في دفع عربون 50 ألف وتوقيع العقد بعد يومين'
    ],
    lastContactDate: 'منذ 4 ساعات',
    createdAt: '2026-03-04',
    followUpScheduledAt: 'اليوم 06:00 م',
    followUpNote: 'متابعة جدول السداد واستلام إيصال العربون مع المالك',
    followUpStatus: 'pending',
    followUpUrgency: 'today'
  },
  {
    id: 'lead_103',
    name: 'أ/ محمود عبد الرحمن',
    phone: '01012349988',
    whatsapp: '201012349988',
    source: 'cold_call',
    budgetMin: 3800000,
    budgetMax: 4500000,
    preferredNeighborhood: 'الحي الرابع',
    preferredFinishing: 'finished',
    preferredBedrooms: 3,
    assignedAgentId: 'agent_mahmoud',
    assignedAgentName: 'محمود السبع',
    status: 'sent_details',
    notes: [
      'يبحث عن دور ثاني أو ثالث بعمارة شيك بأسانسير وجراج بالحي الرابع أو الدبلوماسي'
    ],
    lastContactDate: 'أمس',
    createdAt: '2026-03-06',
    followUpScheduledAt: 'غداً 11:00 ص',
    followUpNote: 'معرفة رأيه في صور وفيديو شقة الحي الرابع وتحديد ميعاد نزول',
    followUpStatus: 'pending',
    followUpUrgency: 'upcoming'
  },
  {
    id: 'lead_104',
    name: 'د/ رانيا سامي',
    phone: '01287654321',
    whatsapp: '201287654321',
    source: 'facebook_group',
    interestedPropertyCode: 'H1711',
    interestedPropertyTitle: 'دوبلكس الحي السابع بحديقة خاصة',
    budgetMin: 4500000,
    budgetMax: 5500000,
    preferredNeighborhood: 'الحي السابع',
    preferredFinishing: 'finished',
    preferredBedrooms: 4,
    assignedAgentId: 'agent_sara',
    assignedAgentName: 'سارة حنفي',
    status: 'new',
    notes: [
      'دخلت من لينك إعلان فيسبوك لشقة الحي السابع'
    ],
    lastContactDate: 'منذ 30 دقيقة',
    createdAt: '2026-03-07',
    followUpScheduledAt: 'الآن (متأخر 15 دقيقة)',
    followUpNote: 'أول اتصال هاتف سريع للتعارف وشرح تفاصيل الدوبلكس',
    followUpStatus: 'pending',
    followUpUrgency: 'urgent'
  },
  {
    id: 'lead_105',
    name: 'أ/ خالد عثمان',
    phone: '01099887766',
    whatsapp: '201099887766',
    source: 'referral',
    interestedPropertyCode: 'H918',
    interestedPropertyTitle: 'شقة الحي الثالث متفرع من كارفور المعادي',
    budgetMin: 2800000,
    budgetMax: 3200000,
    preferredNeighborhood: 'الحي الثالث',
    preferredFinishing: 'finished',
    preferredBedrooms: 3,
    assignedAgentId: 'agent_ahmed',
    assignedAgentName: 'أحمد زهران',
    status: 'closed',
    dealValue: 2950000,
    commission: 73750,
    notes: [
      'تم كتابة العقد وتسليم الوحدة وقبض العمولة بنجاح'
    ],
    lastContactDate: 'منذ 3 أيام',
    createdAt: '2026-02-28',
    followUpStatus: 'completed'
  }
];

export const INITIAL_EMERGENCY_ALERTS: BroadcastEmergencyAlert[] = [
  {
    id: 'alert_1',
    senderName: 'المدير العام (إدارة السبع)',
    message: 'مطلوب فوراً لعميل كاش جاد جداً: شقة دور أرضي بحديقة خاصة أو دور أول في الحي الثاني أو الثالث - ميزانية حتى 4 مليون كاش فوري.',
    bonusAmount: '1,500 ج.م كاش إضافي',
    createdAt: 'اليوم 10:15 ص',
    isActive: true,
    priority: 'urgent'
  }
];

export const SPIN_WHEEL_PRIZES: SpinPrize[] = [
  { id: 'p1', title: '500 جنيه كاش فوري', amount: 500, color: '#10b981', type: 'cash' },
  { id: 'p2', title: '1,000 جنيه كاش فوري', amount: 1000, color: '#3b82f6', type: 'cash' },
  { id: 'p3', title: '1,500 جنيه كاش فوري', amount: 1500, color: '#8b5cf6', type: 'cash' },
  { id: 'p4', title: '2,000 جنيه كاش فوري (الجائزة الكبرى)', amount: 2000, color: '#f59e0b', type: 'cash' },
  { id: 'p5', title: 'قسيمة شراء كارفور 750 ج', amount: 750, color: '#ec4899', type: 'voucher' },
  { id: 'p6', title: 'خروج مبكر يوم الخميس + 500 XP', amount: 0, color: '#06b6d4', type: 'early_leave' },
  { id: 'p7', title: 'غداء مجاني على حساب الإدارة', amount: 0, color: '#ef4444', type: 'free_lunch' },
  { id: 'p8', title: '800 جنيه كاش إضافي', amount: 800, color: '#14b8a6', type: 'cash' },
];

export const INITIAL_VIEWING_FEEDBACKS: ViewingFeedback[] = [
  {
    id: 'fb_1',
    propertyCode: 'MOK-MID-101',
    date: '2026-03-06',
    agentName: 'أحمد زهران',
    showingStatus: 'completed',
    summary: 'العميل أشاد بجودة التشطيب والسيراميك والتقسيم الداخلي، لكن يرى أن السعر أعلى من متوسط الحي الثاني بنحو 150 ألف جنيه. مهتم بالتفاوض لو تم النزول بالسعر.',
    buyerInterestLevel: 'high',
    priceFeedback: 'slightly_high'
  },
  {
    id: 'fb_2',
    propertyCode: 'MOK-MID-101',
    date: '2026-03-04',
    agentName: 'محمود السبع',
    showingStatus: 'completed',
    summary: 'العميل معجب جداً بمدخل العمارة وتوافر المصعد، وطلب مهلة 3 أيام لترتيب سداد دفعة الكاش مع البنك.',
    buyerInterestLevel: 'high',
    priceFeedback: 'fair'
  },
  {
    id: 'fb_3',
    propertyCode: 'MOK-MID-104',
    date: '2026-03-05',
    agentName: 'أحمد زهران',
    showingStatus: 'completed',
    summary: 'العميل أثنى على إطلالة الشارع والموقع القريب من الدائري، ولكن فضل شقة جاهزة للسكن فوراً بدلاً من استكمال دهانات.',
    buyerInterestLevel: 'medium',
    priceFeedback: 'fair'
  },
  {
    id: 'fb_4',
    propertyCode: 'SEBA-RSL-701',
    date: '2026-03-06',
    agentName: 'سارة حنفي',
    showingStatus: 'completed',
    summary: 'المعاينة تمت بإشادة كاملة بالتصميم الديكوري ومساحة الريسبشن، وتجري مناقشة شراء العفش والمطبخ بشكل منفصل.',
    buyerInterestLevel: 'high',
    priceFeedback: 'fair'
  },
  {
    id: 'fb_5',
    propertyCode: 'MOK-MID-101',
    date: '2026-03-09 (مجدولة)',
    agentName: 'كريم الشناوي',
    showingStatus: 'scheduled',
    summary: 'معاينة مؤكدة مجدولة قادمة لعميل كاش من التجمع الخامس يبحث عن استثمار سريع.',
    buyerInterestLevel: 'high',
    priceFeedback: 'fair'
  }
];

export const INITIAL_BROKER_PARTNERS: BrokerPartner[] = [
  {
    id: 'broker_1',
    name: 'كابتن حسام المنياوي',
    phone: '01022334411',
    whatsapp: '201022334411',
    agencyName: 'مكتب المنياوي للاستثمار العقاري - الهضبة',
    status: 'active',
    totalCommissionPaid: 65000,
    pendingCommission: 35000,
    activeUnitsCount: 4,
    closedDealsCount: 2
  },
  {
    id: 'broker_2',
    name: 'أ/ شريف الباز',
    phone: '01155667733',
    whatsapp: '201155667733',
    agencyName: 'الباز بروبرتي (مسوق حر Freelancer)',
    status: 'active',
    totalCommissionPaid: 45000,
    pendingCommission: 28000,
    activeUnitsCount: 3,
    closedDealsCount: 1
  }
];

export const INITIAL_BROKER_LISTINGS: BrokerListing[] = [
  {
    id: 'bl_1',
    brokerId: 'broker_1',
    brokerName: 'كابتن حسام المنياوي',
    brokerPhone: '01022334411',
    propertyCode: 'MOK-MID-101',
    title: 'شقة سوبر لوكس الحي الثاني - موقع متميز',
    neighborhood: 'الحي الثاني',
    price: 3450000,
    area: 140,
    commissionPercentage: 1.0,
    estimatedCommission: 34500,
    status: 'negotiation',
    dealStage: 'مرحلة التفاوض على جدول السداد مع المالك',
    submittedAt: '2026-02-20'
  },
  {
    id: 'bl_2',
    brokerId: 'broker_1',
    brokerName: 'كابتن حسام المنياوي',
    brokerPhone: '01022334411',
    propertyCode: 'SEBA-RSL-701',
    title: 'شقة ألترا سوبر لوكس الحي السابع - أرقى أحياء الهضبة',
    neighborhood: 'الحي السابع',
    price: 4900000,
    area: 175,
    commissionPercentage: 1.0,
    estimatedCommission: 49000,
    status: 'showing',
    dealStage: 'تم عمل معاينتين ميدانيتين وجاري المتابعة',
    submittedAt: '2026-02-28'
  },
  {
    id: 'bl_3',
    brokerId: 'broker_2',
    brokerName: 'أ/ شريف الباز',
    brokerPhone: '01155667733',
    propertyCode: 'MOK-MID-104',
    title: 'شقة الحي الأول فيو بانوراما الدائري',
    neighborhood: 'الحي الأول',
    price: 2450000,
    area: 135,
    commissionPercentage: 1.0,
    estimatedCommission: 24500,
    status: 'active',
    dealStage: 'معروضة على المنصة وبدء تلقي طلبات المعاينة',
    submittedAt: '2026-03-02'
  },
  {
    id: 'bl_4',
    brokerId: 'broker_1',
    brokerName: 'كابتن حسام المنياوي',
    brokerPhone: '01022334411',
    propertyCode: 'MOK-MID-103',
    title: 'شقة الحي الثالث متفرع من كارفور المعادي',
    neighborhood: 'الحي الثالث',
    price: 2950000,
    area: 130,
    commissionPercentage: 1.0,
    estimatedCommission: 29500,
    status: 'paid',
    dealStage: 'تم توقيع العقد وصرف عمولة السمسار بالكامل',
    submittedAt: '2026-02-10',
    paidAt: '2026-03-01'
  }
];
