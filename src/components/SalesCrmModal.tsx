import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Lead, 
  SalesAgent, 
  Property, 
  LeadStatus, 
  BroadcastEmergencyAlert
} from '../types';
import { 
  X, 
  Plus, 
  Search, 
  MessageCircle, 
  Phone, 
  Clock, 
  Calendar, 
  Target, 
  Award, 
  Sparkles, 
  Crown, 
  Layers, 
  Bell, 
  Check, 
  CheckCircle2, 
  Flame, 
  Eye, 
  Shuffle, 
  Share2,
  Building,
  User,
  ArrowRight,
  UserCheck,
  Menu,
  ChevronLeft,
  ChevronDown,
  ArrowLeftRight,
  MapPin,
  DollarSign,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { CampaignLeadsModal } from './crm/CampaignLeadsModal';
import { saveDraft, loadDraft, clearDraft } from '../utils/uiSession';
import { LionLogo } from './LionLogo';
import { UnitPreview } from './crm/UnitPreview';
import { PresencePrompt } from './sales/PresencePrompt';
import { crmTheme as T, stageTone, LATE_TONE } from '../theme/crmTheme';
import { Notebook } from './crm/Notebook';
import { OwnerNote, subscribeNotes, isDue } from '../services/notebook';
import { OWNER_DESK, planOwnerDesk } from '../services/ownerDesk';
import { subscribeTrips, subscribeFieldFeedback, FieldTrip, FieldFeedback } from '../services/portalService';
import { saveSalesAgentToDb } from '../services/firebaseService';
import { formatPrice, formatNumber, generateCallLink, generateWhatsAppLink, waLink } from '../utils/helpers';
import { SpinWheelModal } from './SpinWheelModal';
import { LeadDetailsModal } from './LeadDetailsModal';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { WhenPicker, WhenValue, BudgetRange } from './common/WhenPicker';
import { ContentTab } from './sales/ContentTab';
import { LeaderboardTab } from './sales/LeaderboardTab';
import { DailyTab, UnitAdPopup } from './sales/DailyTab';
import { DailyAdminBoard } from './sales/DailyAdminBoard';
import { ActionsLog, actionsOn } from './crm/ActionsLog';
import { cairoDay } from '../services/dailyTasks';
import { matchDetailed, briefLine, briefGaps, readBrief, payModeOf, resaleFits, projectsFit, resaleCeiling, PayMode } from '../services/clientBrief';
import { toggleValue } from '../utils/multiFilter';
import { toneStyle, viewingUpdateText, markViewingSeen } from '../utils/leadTone';
import { humanDuration, followUpBadge, followUpState } from '../utils/followUpAlerts';
import { OwnerLinkCard } from './crm/OwnerLinkCard';
import { QuickBriefRow } from './crm/QuickBriefRow';
import { ProjectMatchPanel } from './crm/ProjectMatchPanel';
import { OfferBuilderModal } from './sales/OfferBuilderModal';
import { FollowUpNotificationsModal } from './FollowUpNotificationsModal';
import { INITIAL_DAILY_QUESTS } from '../data/crmData';
import { ViewingRequest } from '../types';
import { subscribeCrmBoard, saveCrmBoard, CrmBoard, CrmBanner, deleteLeadFromDb } from '../services/crmBoardService';
import { thumbUrl } from '../services/mediaStorage';
import ClientRequestsPanel, { RequestForm } from './sales/ClientRequestsPanel';
import { paymentOf, PAY_LABEL } from '../services/clientRequests';

interface SalesCrmModalProps {
  /** لوجو الشركة — بيظهر علامة مائية ورا الشغل */
  logoUrl?: string;
  /** الأدمن نفسه: ملفه الخاص ودفتره (الأونر مالوش دعوة بيهم) */
  ownerDesk?: boolean;
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  agents: SalesAgent[];
  leads: Lead[];
  /** المزامنة واقفة؟ السبب بالعربي — بيظهر كتحذير أحمر جوه الغرفة */
  syncError?: string;
  onUpdateLead: (updatedLead: Lead) => void;
  onAddLead: (newLead: Lead) => void;
  /* توزيع ليدات الكامبين دفعة واحدة — الأدمن بس */
  onAddLeadsBulk?: (leads: Lead[]) => void;
  /* ليد معيّن يتفتح ملفه على طول (جاي من تنبيه المتابعة) */
  openLeadId?: string | null;
  onOpenLeadHandled?: () => void;
  onUpdateAgent: (updatedAgent: SalesAgent) => void;
  emergencyAlerts: BroadcastEmergencyAlert[];
  onSendEmergencyAlert: (alert: Omit<BroadcastEmergencyAlert, 'id' | 'createdAt'>) => void;
  onOpenAffiliateModal?: (property: Property) => void;
  onSelectProperty?: (property: Property) => void;
  isAdmin?: boolean;
  onDeleteLead?: (id: string) => void;
  canEdit?: boolean;
  currentAgentId?: string;
  onLogout?: () => void;
  viewingRequests?: ViewingRequest[];
}

// All 9 Pipeline Stages matching operations room & mobile selector
export const CRM_PIPELINE_STAGES: { 
  id: LeadStatus; 
  label: string; 
  pickerLabel: string;
  defaultBadge: string; 
  badgeColor: string;
  dotColor: string;
  bgTag: string;
}[] = [
  { id: 'new', label: 'جديد', pickerLabel: 'نقل: جديد', defaultBadge: 'عاجل', badgeColor: 'text-rose-600', dotColor: 'bg-rose-500', bgTag: 'bg-rose-50' },
  { id: 'contacted', label: 'تم الاتصال', pickerLabel: 'نقل: تم الاتصال', defaultBadge: 'اليوم', badgeColor: 'text-[#A07A26]', dotColor: 'bg-amber-500', bgTag: 'bg-amber-50' },
  { id: 'sent_details', label: 'إرسال صور', pickerLabel: 'نقل: إرسال صور', defaultBadge: 'واتساب', badgeColor: 'text-blue-600', dotColor: 'bg-blue-500', bgTag: 'bg-blue-50' },
  { id: 'visit_requested', label: 'تحت الطلب', pickerLabel: '⏳ نقل: تحت الطلب', defaultBadge: 'تنسيق', badgeColor: 'text-amber-700', dotColor: 'bg-amber-600', bgTag: 'bg-amber-100' },
  { id: 'visit_booked', label: 'معاينة مؤكدة', pickerLabel: '✅ نقل: معاينة مؤكدة', defaultBadge: 'ميعاد', badgeColor: 'text-emerald-700', dotColor: 'bg-emerald-500', bgTag: 'bg-emerald-50' },
  { id: 'visit_done', label: 'تمت المعاينة', pickerLabel: 'نقل: تمت المعاينة', defaultBadge: 'تمت', badgeColor: 'text-indigo-600', dotColor: 'bg-indigo-500', bgTag: 'bg-indigo-50' },
  { id: 'negotiation', label: 'تفاوض', pickerLabel: 'نقل: تفاوض', defaultBadge: 'عربون', badgeColor: 'text-purple-600', dotColor: 'bg-purple-500', bgTag: 'bg-purple-50' },
  { id: 'closed', label: 'صفقة مغلقة', pickerLabel: '🏆 نقل: صفقة مغلقة', defaultBadge: 'تم البيع', badgeColor: 'text-emerald-800', dotColor: 'bg-emerald-600', bgTag: 'bg-emerald-100' },
  { id: 'lost', label: 'مؤجل', pickerLabel: 'نقل: مؤجل', defaultBadge: 'مؤجل', badgeColor: 'text-stone-500', dotColor: 'bg-stone-400', bgTag: 'bg-stone-100' }
];

export const SalesCrmModal: React.FC<SalesCrmModalProps> = ({
  logoUrl,
  ownerDesk = false,
  isOpen,
  onClose,
  properties,
  agents,
  leads,
  syncError,
  onUpdateLead,
  onAddLead,
  onAddLeadsBulk,
  openLeadId,
  onOpenLeadHandled,
  onUpdateAgent,
  emergencyAlerts,
  onSendEmergencyAlert,
  onOpenAffiliateModal,
  onSelectProperty,
  isAdmin = false,
  onDeleteLead,
  canEdit = true,
  currentAgentId,
  onLogout,
  viewingRequests,
}) => {
  // Navigation Tabs matching sidebar items (Properties tab removed)
  /* السيلز بيفتح على «يومي» — مهامه قدامه أول حاجة. الإدارة على المسار. */
  const [activeTab, setActiveTab] = useState<'daily' | 'pipeline' | 'followups' | 'matching' | 'content' | 'leaderboard' | 'notebook'>(isAdmin ? 'pipeline' : 'daily');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileStageFilter, setActiveMobileStageFilter] = useState<string>('all');
  
  // Smart Matching Lead Selection & State
  /* بيتحدد من عملاء الشخص الداخل بس — مش من كل ليدات الشركة */
  const [matchingLeadId, setMatchingLeadId] = useState<string>('');
  const [highlightedPropCode, setHighlightedPropCode] = useState<string | null>(null);

  // Modals inside CRM
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  /* جاي من تنبيه المتابعة: نفتح ملف الليد نفسه مش الـCRM عموماً */
  useEffect(() => {
    if (!isOpen || !openLeadId) return;
    const found = leads.find((l) => l.id === openLeadId);
    if (found) { setSelectedLeadForDetails(found); onOpenLeadHandled?.(); }
  }, [isOpen, openLeadId, leads]);
  const [leadToChangeStatus, setLeadToChangeStatus] = useState<Lead | null>(null);
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [celebrationDealData, setCelebrationDealData] = useState<{ lead: Lead; value: number; commission: number } | null>(null);
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);

  // New Lead Form State
  /* المسوّدة بتتحفظ مع كل حرف، عشان لو المتصفح قفل التاب وانت في واتساب
     ترجع تلاقي اللي كتبته مكانه. بتتمسح بعد الحفظ. */
  const EMPTY_LEAD_FORM = {
    name: '',
    phone: '',
    source: 'facebook_group' as Lead['source'],
    /* فاضيين عن قصد. كانوا "الحي الثاني · ٢.٥–٣.٥ مليون · ٣ غرف ·
       متشطبة" وبيتحفظوا حتى لو السيلز ماشافهمش — فكل عميل جديد
       كان بيطلع ليه طلب ماحدش قاله، والـ٣.٥ مليون بتبقى ميزانية
       معتمدة تحتاج موافقة الإدارة عشان تتغيّر. */
    preferredNeighborhood: '',
    districts: [] as string[],
    budgetMin: 0,
    budgetMax: 0,
    preferredBedrooms: 0,
    preferredFinishing: 'all' as 'finished' | 'semi_finished' | 'all',
    interestedPropertyCode: '',
    notes: '',
    followUpScheduledAt: 'اليوم بعد ساعتين',
    followUpUrgency: 'urgent' as 'urgent' | 'today' | 'upcoming',
    assignedAgentId: '',
    nextAt: null as WhenValue | null,
    /* نوع الليد — السيلز بيختار «بيرسونال» لو هو اللي جابه */
    leadKind: 'personal' as 'personal' | 'fresh' | 'old_campaign',
  };

  const [newLeadForm, setNewLeadForm] = useState(() => {
    /* من المسودة القديمة بناخد الاسم والرقم وبس — المسودات القديمة
       كان فيها الحي والميزانية المخبّيين */
    const d = loadDraft('new_lead', EMPTY_LEAD_FORM);
    return { ...EMPTY_LEAD_FORM, name: d.name || '', phone: d.phone || '', source: d.source || EMPTY_LEAD_FORM.source, leadKind: d.leadKind ?? EMPTY_LEAD_FORM.leadKind };
  });
  /* الفورم بقى اسم ورقم وبس. الباقي بيتسأل في مكالمة
     الاكتشاف اللي بتفتح بعد الحفظ على طول. */

  useEffect(() => {
    const hasAnything = newLeadForm.name.trim() || newLeadForm.phone.trim() || newLeadForm.notes.trim();
    if (hasAnything) saveDraft('new_lead', newLeadForm);
  }, [newLeadForm]);

  // لو فيه مسوّدة، الفورم بيفتح لوحده عشان الشخص يلاقي شغله
  useEffect(() => {
    if (isOpen && (newLeadForm.name.trim() || newLeadForm.phone.trim())) setIsAddLeadOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Active Sales Agent for current session
  /* مين الداخل فعلاً.

     كان فيه بق خطير: لو مفيش سيلز داخل (يعني الأدمن)، الكود كان بيرجّع
     agents[0] — أول واحد في القايمة. فالإدارة كانت بتشتغل باسم سهير
     من غير ما حد ياخد باله: نقطها هي اللي بتظهر، ومهامها هي،
     وأي مكالمة الأدمن يسجّلها كانت هتتسجّل باسمها.

     وبعدين رجع من باب تاني: `isCurrentSession` حقل متخزّن في الداتابيز
     على كارت السيلز. أول ما أي حد يسجّل دخول من أي جهاز، الحقل بيتكتب
     على كارته في الداتابيز المشتركة — فكل اللي فاتحين الموقع، الإدارة
     كمان، بيقروا نفس الحقل ويفتكروا إن الجلسة بتاعته هو.

     حقل واحد مشترك ما ينفعش يقول "مين فاتح دلوقتي" لأن كل واحد قاعد
     على جهاز لوحده. فبنقرا من الجهاز نفسه بس، والإدارة إدارة مهما كان. */
  const currentSalesAgent = useMemo(() => {
    if (isAdmin) return undefined;
    if (!currentAgentId) return undefined;
    return agents.find((a) => a.id === currentAgentId) || undefined;
  }, [agents, currentAgentId, isAdmin]);

  const currentAgent = currentSalesAgent;

  /* مين بيتكتب اسمه على الأكشن.
     الإدارة بتتكتب «الإدارة» — مش اسم سيلز، ومش «الفريق» المبهمة.
     كان فيه بق بيخلّي أكشن الإدارة يتسجّل باسم آخر سيلز سجّل دخول. */
  const actorName = currentSalesAgent?.name || (isAdmin ? 'الإدارة' : 'الفريق');

  // من بشوف شغله؟ (الأدمن والتيم ليدر بيختاروا)
  const [viewAgentId, setViewAgentId] = useState<string>('all');
  const myTeam = useMemo(() => agents.filter((a) => (a as any).teamLeadId === currentSalesAgent?.id), [agents, currentSalesAgent]);
  const isLeadRole = currentSalesAgent?.role === 'team_leader' || currentSalesAgent?.role === 'sales_manager' || (currentSalesAgent as any)?.isTeamLead;
  const isLead = isLeadRole || myTeam.length > 0;
  const visibleAgents = useMemo(() => (isAdmin ? agents : isLead ? [currentSalesAgent!, ...myTeam].filter(Boolean) : [currentSalesAgent!].filter(Boolean)), [isAdmin, isLead, agents, myTeam, currentSalesAgent]);
  /* الاختيار بيرجع «الكل» مع أي تغيير في مين داخل — قبل كده الأدمن يختار
     «ملفي» ويخرج، وفرح تدخل على نفس الجهاز تلاقي نفسها شايفة ملف محمد زهران */
  useEffect(() => { setViewAgentId('all'); }, [isAdmin, currentAgentId]);
  useEffect(() => {
    if (viewAgentId !== 'all' && agents.length && !isAdmin && !visibleAgents.some((a) => a.id === viewAgentId)) setViewAgentId('all');
  }, [viewAgentId, visibleAgents, isAdmin, agents.length]);

  // Scoped Leads
  const scopedLeads = useMemo(() => {
    const ids = visibleAgents.map((a) => a.id);
    const base = isAdmin ? leads : leads.filter((l) => ids.includes(l.assignedAgentId || '') || l.assignedAgentName === currentSalesAgent?.name);
    /* «كل الفريق» = الفريق بس — ملف محمد زهران بيظهر لما يختاره بس */
    if (viewAgentId === 'all') return base.filter((l) => l.assignedAgentId !== OWNER_DESK.id);
    return base.filter((l) => l.assignedAgentId === viewAgentId);
  }, [leads, isAdmin, currentSalesAgent, visibleAgents, viewAgentId]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!leadSearchQuery.trim()) return scopedLeads;
    const q = leadSearchQuery.toLowerCase();
    return scopedLeads.filter((l) => 
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.interestedPropertyCode && l.interestedPropertyCode.toLowerCase().includes(q)) ||
      (l.preferredNeighborhood && l.preferredNeighborhood.toLowerCase().includes(q)) ||
      (l.followUpNote && l.followUpNote.toLowerCase().includes(q))
    );
  }, [scopedLeads, leadSearchQuery]);

  // Count leads per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CRM_PIPELINE_STAGES.forEach((st) => {
      counts[st.id] = scopedLeads.filter((l) => l.status === st.id).length;
    });
    return counts;
  }, [scopedLeads]);

  // Pending Follow-ups Count
  const pendingFollowUpsCount = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return scopedLeads.filter((l) => (l.nextActionAt && l.nextActionAt <= end.getTime() && l.followUpStatus !== 'completed') || (l.status === 'new' && !l.nextActionAt)).length;
  }, [scopedLeads]);

  // Selected Lead for Smart Matching — من عملاء الشخص الداخل بس
  const selectedMatchingLead = useMemo(() => {
    return scopedLeads.find((l) => l.id === matchingLeadId) || scopedLeads[0] || null;
  }, [scopedLeads, matchingLeadId]);

  // Matched Properties List for the selected lead
  const [matchTolerance, setMatchTolerance] = useState<number>(0);   // 0 = بالظبط، 0.05، 0.1
  const [matchStrictHood, setMatchStrictHood] = useState<boolean>(true);
  /* نوع الدفع: null = زي ما قال في المكالمة. السيلز يقدر يجرّب كاش أو تقسيط
     من غير ما يغيّر ملف العميل. */
  const [matchPay, setMatchPay] = useState<PayMode | null>(null);
  useEffect(() => { setMatchPay(null); }, [matchingLeadId]);

  const matchBrief = useMemo(
    () => (selectedMatchingLead ? readBrief(selectedMatchingLead) : null),
    [selectedMatchingLead],
  );
  /* الدفع من طلب العميل المتسجّل بس — مفيش تبديل مؤقت */
  const activePay: PayMode = matchBrief ? payModeOf(matchBrief) : 'cash';
  const showResale = resaleFits(activePay);
  const showProjects = projectsFit(activePay);

  // نفس المحرك اللي بيبني العرض المخصوص — فالشاشتين مستحيل يختلفوا
  const matchDetail = useMemo(() => {
    if (!selectedMatchingLead) return [];
    return matchDetailed(selectedMatchingLead, properties, {
      tolerance: matchTolerance,
      strictDistrict: matchStrictHood,
      payMode: activePay,
    });
  }, [selectedMatchingLead, properties, matchTolerance, matchStrictHood, activePay]);

  /* بنفصل اللي جوه الأحياء اللي طلبها عن اللي برّه.
     كانوا في قايمة واحدة، فالسيلز بيبعت شقة في حي العميل مقالش عليه
     وهو فاكرها مطابقة. دلوقتي اللي برّه تحت عنوان واضح. */
  const inDistrictProps = useMemo(() => matchDetail.filter((r) => r.inDistrict).map((r) => r.property), [matchDetail]);
  const outDistrictProps = useMemo(() => matchDetail.filter((r) => !r.inDistrict).map((r) => r.property), [matchDetail]);
  const matchedProperties = inDistrictProps;

  // الشقق اللي السيلز معلّم عليها عشان يبعتها عرض مخصوص
  // الليدات اللي فيها طلب تعديل ميزانية مستني
  const budgetRequests = useMemo(
    () => leads.filter((l) => l.budgetChangeRequest?.status === 'pending'),
    [leads],
  );

  /* شقق كل عميل في شاشة المتابعات.
     الزرار كان بينقل لتبويب المطابقة وبس — يعني مفيش معلومة
     زيادة، والمندوب بيسيب مكانه وهو على التليفون. دلوقتي
     الرقم بيبان على الزرار والشقق بتتفتح مكانها. */
  /* فورم الطلب بيتفتح من أي مكان فيه كارت عميل — مش محتاج
     تروح تبويب تاني وتدوّر على الاسم */
  const [requestLead, setRequestLead] = useState<Lead | null>(null);

  /* اللي بيبان في شاشة المتابعات بس — مش الـ٢٣١ كلهم.
     الحساب على كل العملاء كان ١١٧ ملي ثانية على كمبيوتر سريع،
     يعني نص ثانية تقفيل على موبايل المندوب كل ما حاجة تتغيّر. */
  const followUpList = useMemo(
    () => scopedLeads
      .filter((l) => l.followUpStatus !== 'completed' && l.status !== 'closed' && l.status !== 'lost')
      .sort((a, b) => (a.nextActionAt || Infinity) - (b.nextActionAt || Infinity)),
    [scopedLeads],
  );

  /* زرار «المتأخر»: يعرض المتأخرين بس مرة واحدة. للإدارة بيمشي
     على اختيار «كل الفريق» أو مندوب معيّن، وللسيلز على عملاؤه. */
  const [lateOnly, setLateOnly] = useState(false);
  const lateCount = useMemo(
    () => followUpList.filter((l) => followUpState(l.nextActionAt, l.followUpStatus) === 'late').length,
    [followUpList],
  );
  const shownFollowUps = useMemo(
    () => (lateOnly ? followUpList.filter((l) => followUpState(l.nextActionAt, l.followUpStatus) === 'late') : followUpList),
    [followUpList, lateOnly],
  );

  const followUpMatches = useMemo(() => {
    const m = new Map<string, Property[]>();
    followUpList.forEach((l) => {
      try {
        const b = readBrief(l);
        const res = matchDetailed(l, properties, {
          /* نفس إعدادات صفحة المطابقة بالظبط (الميزانية بالظبط + نفس الحي)
             — كان ±٥٪ هنا، فالرقم هنا ٣٨ وهناك ٢٩ */
          tolerance: 0, strictDistrict: true, payMode: payModeOf(b),
        });
        m.set(l.id, res.filter((r) => r.inDistrict).map((r) => r.property));
      } catch { m.set(l.id, []); }
    });
    return m;
  }, [followUpList, properties]);

  const [toast, setToast] = useState('');
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  const [offerPicks, setOfferPicks] = useState<string[]>([]);
  useEffect(() => { setOfferPicks([]); }, [matchingLeadId]);
  const togglePick = (id: string) => setOfferPicks((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const scrollToProperty = (code: string) => {
    setHighlightedPropCode(code);
    const element = document.getElementById(`matched-prop-${code}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedPropCode(null);
    }, 2500);
  };

  const getLeadWhatsAppLink = (prop: Property, lead: Lead | null) => {
    const rawPhone = lead?.whatsapp || lead?.phone || '01009876543';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '2' + cleanPhone;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const agentParam = currentSalesAgent?.id ? `&agent=${currentSalesAgent.id}` : '';
    const shareUrl = `${origin}/?property=${prop.code}${agentParam}`;
    const msg = `مرحباً ${lead?.name || 'يا فندم'}، بناءً على طلبك لشقة في ${prop.neighborhood}، دي شقة مطابقة لمواصفاتك:\nكود: ${prop.code}\nالمساحة: ${prop.area}م² · ${prop.bedrooms} غرف\nالسعر: ${formatPrice(prop.price)}\nللمعاينة والتفاصيل: ${shareUrl}`;
    return waLink(cleanPhone, msg);
  };

  const [compactView, setCompactView] = useState<boolean>(() => { try { return localStorage.getItem('lion_crm_compact') === '1'; } catch { return false; } });
  const toggleCompact = () => setCompactView((v) => { const n = !v; try { localStorage.setItem('lion_crm_compact', n ? '1' : '0'); } catch { /* */ } return n; });
  const removeFromFollowUps = (lead: Lead) => onUpdateLead({ ...lead, nextActionAt: null, followUpStatus: 'completed', followUpUrgency: 'upcoming' } as Lead);
  const adminDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`تمسح ${lead.name} نهائياً من الـ CRM؟`)) return;
    try { await deleteLeadFromDb(lead.id); }
    catch (e: any) { window.alert(`المسح مانجحش — ${e?.code === 'permission-denied' ? 'الصلاحيات رافضة' : 'النت أو السيرفر'}`); return; }
    onDeleteLead?.(lead.id);
  };
  /* مكالمة الاكتشاف اتشالت. الطلب بيتسجّل من المطابقة
     بفورم واحد — مفيش ١١ سؤال على مراحل. */
  const [offerLead, setOfferLead] = useState<Lead | null>(null);
  const [moveTarget, setMoveTarget] = useState<LeadStatus | null>(null);
  const [board, setBoard] = useState<CrmBoard>({});
  const [editBoard, setEditBoard] = useState<null | 'banner' | 'quests'>(null);
  const [draftBoard, setDraftBoard] = useState<CrmBoard>({});
  useEffect(() => subscribeCrmBoard(setBoard), []);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  /* المعاينات اللي اتعملت النهارده = عملاء وصلوا «تمت المعاينة» النهارده،
     سواء السيلز نقلهم بإيده أو المعاينة اتقفلت من التنسيق.
     كان بيعدّ طلبات المعاينة اللي اتعملت في بوابة الملاك بس — فالعميل
     اللي السيلز نقله لـ«تمت المعاينة» ماكانش بيتحسب. */
  const todayViewingRows = useMemo(() => {
    const today = cairoDay();
    const out: { lead: Lead; at: number; by: string; comment: string }[] = [];
    scopedLeads.forEach((l) => (l.activity || []).forEach((a) => {
      if (typeof a.at === 'number' && cairoDay(a.at) === today && /تمت المعاينة/.test(a.outcome || ''))
        out.push({ lead: l, at: a.at, by: (a.by || '').trim(), comment: a.comment || '' });
    }));
    /* عميل واحد = معاينة واحدة في العدّاد، بآخر تسجيل ليه */
    const m = new Map<string, typeof out[number]>();
    out.sort((x, y) => x.at - y.at).forEach((r) => m.set(r.lead.id, r));
    return [...m.values()].sort((x, y) => y.at - x.at);
  }, [scopedLeads]);
  const todayViewings = todayViewingRows.length;
  const viewingsLabel = viewAgentId !== 'all'
    ? `معاينات ${agents.find((a) => a.id === viewAgentId)?.name || ''} النهارده`
    : (isAdmin || isLead) ? 'معاينات الفريق النهارده' : 'معايناتك النهارده';
  const todayNewRows = scopedLeads.filter((l) => !(l as any).copiedFrom && !(l as any).ownerFbIds && !l.id.startsWith('own_')).filter((l) => {
    const t = new Date(l.createdAt || l.lastContactDate || 0).getTime();
    return t >= startOfToday.getTime();
  }).sort((a, b) => new Date(b.createdAt || b.lastContactDate || 0).getTime() - new Date(a.createdAt || a.lastContactDate || 0).getTime());
  const todayNewLeads = todayNewRows.length;
  /* أي عدّاد من التلاتة بيتداس عليه ويفتح اللي وراه */
  const [counterOpen, setCounterOpen] = useState<null | 'new' | 'viewings'>(null);
  /* عدد الأكشن نفسه — كان بيعدّ العملاء اللي اتعمل عليهم حاجة،
     فعميل اتعمل عليه ٥ أكشن كان بيتحسب ١ */
  const todayDone = useMemo(() => actionsOn(scopedLeads, cairoDay()).length, [scopedLeads]);
  const [actionsLogOpen, setActionsLogOpen] = useState(false);
  /* دفتري: اللي جه ميعاده بيظهر فوق لحد ما يتقفل */
  const [myNotes, setMyNotes] = useState<OwnerNote[]>([]);
  useEffect(() => (ownerDesk ? subscribeNotes(setMyNotes) : undefined), [ownerDesk]);
  const [noteTick, setNoteTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setNoteTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  const dueNotes = useMemo(() => myNotes.filter((n) => isDue(n)), [myNotes, noteTick]);
  /* ملف «محمد زهران»: نسخة من كل عميل عاين وفيدباكه اتأكد — بتتعمل
     أوتوماتيك لما الإدارة تفتح الـCRM، والعميل الأصلي بيفضل مع السيلز */
  const [deskTrips, setDeskTrips] = useState<FieldTrip[]>([]);
  const [deskFbs, setDeskFbs] = useState<FieldFeedback[]>([]);
  useEffect(() => (ownerDesk ? subscribeTrips(setDeskTrips) : undefined), [ownerDesk]);
  useEffect(() => (ownerDesk ? subscribeFieldFeedback(setDeskFbs) : undefined), [ownerDesk]);
  const deskDone = useRef(new Set<string>());
  useEffect(() => {
    if (!ownerDesk || !agents.length) return;
    /* الملف نفسه بيتعمل على طول — حتى لو مفيش فيدباك متأكد لسه */
    if (!agents.some((a) => a.id === OWNER_DESK.id) && !deskDone.current.has('agent')) {
      deskDone.current.add('agent');
      saveSalesAgentToDb(OWNER_DESK).catch((e) => console.warn('[OwnerDesk] agent', e));
    }
    if (!leads.length) return;
    const plan = planOwnerDesk(leads, deskFbs, deskTrips, Date.now(), viewingRequests || []);
    plan.create.forEach((l) => {
      const k = `${l.id}:${((l as any).ownerFbIds || []).join(',')}`;
      if (deskDone.current.has(k)) return;
      deskDone.current.add(k);
      onAddLead(l);
    });
    plan.update.forEach((l) => {
      const k = `${l.id}:${((l as any).ownerFbIds || []).join(',')}`;
      if (deskDone.current.has(k)) return;
      deskDone.current.add(k);
      onUpdateLead(l);
    });
  }, [ownerDesk, leads, deskFbs, deskTrips, agents, viewingRequests]);
  /* متابعات الفريق: مقفولة، ولما تتفتح السيلز مرتّبين بالأنشط */
  const [teamOpen, setTeamOpen] = useState(false);
  const rankedAgents = useMemo(() => {
    const today = cairoDay();
    const weekAgo = Date.now() - 7 * 864e5;
    return visibleAgents.filter((a) => a.id !== OWNER_DESK.id).map((a) => {
      const mineL = leads.filter((l) => l.assignedAgentId === a.id);
      let t = 0, w = 0;
      mineL.forEach((l) => (l.activity || []).forEach((x) => {
        if (typeof x.at !== 'number') return;
        if (cairoDay(x.at) === today) t++;
        if (x.at >= weekAgo) w++;
      }));
      return {
        a, mine: mineL.length, today: t, week: w,
        late: mineL.filter((l) => l.nextActionAt && l.nextActionAt < Date.now() && l.followUpStatus !== 'completed').length,
        snoozes: mineL.reduce((n, l: any) => n + (l.snoozeCount || 0), 0),
      };
    }).sort((x, y) => y.today - x.today || y.week - x.week || y.mine - x.mine);
  }, [visibleAgents, leads]);
  /* «إعلان» من المطابقة: بوب أب الشقة (صور وفيديو بتحميل + نصوص الإعلانات) */
  const [adShareProp, setAdShareProp] = useState<Property | null>(null);
  /* المهام جاية من إعدادات الأدمن، والعدّادات بتبدأ من الصفر كل يوم */
  /* الإدارة لما تدوس على حد في قايمة الفريق، المفروض تشوف نقطه هو ومهامه هو */
  const shownAgent = (viewAgentId !== 'all' ? agents.find((a) => a.id === viewAgentId) : null) || currentAgent;

  const viewingSomeoneElse = !!shownAgent && shownAgent.id !== currentAgent?.id;
  /* الطلب العاجل بيظهر بس لو الإدارة كتبته وفعّلته. كان فيه طلب
     تجريبي مكتوب في الكود ("عميل كاش جاد · بونص 1,500") بيظهر لكل
     السيلز طول ما الإدارة ماحفظتش طلب — يعني كان ظاهر من غير ما حد يطلبه. */
  const banner: CrmBanner = board.banner || { active: false, title: '', subtitle: '', bonus: '', showMatching: true };
  const deleteRequests = isAdmin && canEdit ? leads.filter((l: any) => l.deleteRequest && !l.deleteRequest.resolved) : [];
  const [moveComment, setMoveComment] = useState('');
  const [moveNext, setMoveNext] = useState<WhenValue | null>(null);

  /* بعد الحفظ رايح فين: مكالمة الاكتشاف ولا المطابقة على طول.
     لازم يفضل فوق الـ return اللي تحت — أي hook تحته بيكسر الصفحة. */

  /* لون الكارت في كل مكان في الـCRM: المتأخر أحمر، وبعده تنبيه (فريش/كامبين/سارة)، وبعده لون المرحلة */
  const cardLook = (lead: Lead, fallback = '') => {
    const b = followUpBadge(lead.nextActionAt, lead.followUpStatus, lead.followUpScheduledAt || fallback);
    const late = b.tone === 'late';
    const tone = toneStyle(lead);
    const c = late ? LATE_TONE
      : tone.tone !== 'none'
        ? { bg: tone.hex, fg: '#FFFFFF', soft: 'rgba(255,255,255,.8)', line: 'rgba(255,255,255,.25)', chip: 'rgba(255,255,255,.18)', dark: true }
        : stageTone(lead.status);
    return { b, late, tone, c };
  };

  /* لازم قبل أي return — React بيقع لو عدد الـhooks اتغيّر بين رسمة والتانية */
  /* الثيم الموحّد بيتفعّل على الصفحة كلها وهي مفتوحة — عشان النوافذ اللي بتتفتح فوقها تاخده كمان */
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('crm-skin');
    return () => document.body.classList.remove('crm-skin');
  }, [isOpen]);
  const [undoMove, setUndoMove] = useState<{ prev: Lead; text: string } | null>(null);
  const undoTimer = useRef<any>(null);
  if (!isOpen) return null;

  // Quick Move Status Handler
  const handleMoveStatus = (lead: Lead, newStatus: LeadStatus, comment = '', next: WhenValue | null = null) => {
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG');
    const stageLabel = CRM_PIPELINE_STAGES.find((s) => s.id === newStatus)?.label || newStatus;
    const noteText = `[${timestamp}] تم نقل المرحلة إلى: ${stageLabel}${comment ? ' · ' + comment : ''}`;

    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
      lastContactDate: new Date().toISOString(),
      notes: [noteText, ...(lead.notes || [])],
      activity: [{ at: Date.now(), by: actorName, outcome: `نقل إلى: ${stageLabel}`, comment, nextAt: next?.at }, ...(lead.activity || [])].slice(0, 80),
      nextActionAt: newStatus === 'closed' || newStatus === 'lost' ? null : next?.at ?? null,
      followUpScheduledAt: next?.label || lead.followUpScheduledAt,
      followUpNote: comment,
      followUpStatus: newStatus === 'closed' || newStatus === 'lost' ? 'completed' : 'pending',
    };
    setMoveTarget(null); setMoveComment(''); setMoveNext(null);

    /* «تراجع» بدل «متأكد؟» — النقل بيحصل على طول، وتحت شريط صغير يرجّعه */
    clearTimeout(undoTimer.current);
    setUndoMove({ prev: lead, text: `${lead.name.split(' ').slice(0, 2).join(' ')} ← ${stageLabel}` });
    undoTimer.current = setTimeout(() => setUndoMove(null), 7000);

    onUpdateLead(updatedLead);
    setLeadToChangeStatus(null);
    if (selectedLeadForDetails && selectedLeadForDetails.id === lead.id) {
      setSelectedLeadForDetails(updatedLead);
    }
  };

  // Submit New Lead
  const handleAddNewLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) return;

    /* الأدمن لازم يختار السيلز بإيده — من غير كده العميل كان بيروح
       لأول واحد في القايمة من غير ما حد يعرف */
    const assignedAgent = agents.find((a) => a.id === newLeadForm.assignedAgentId) || currentSalesAgent;
    if (!assignedAgent) { showToast('اختار السيلز المسؤول عن العميل ده'); return; }

    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: newLeadForm.name.trim(),
      phone: newLeadForm.phone.trim(),
      status: 'new',
      source: newLeadForm.source,
      interestedPropertyCode: newLeadForm.interestedPropertyCode.trim() || undefined,
      notes: newLeadForm.notes.trim() ? [newLeadForm.notes.trim()] : ['تم إضافة العميل للمتابعة'],
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      /* مين ضافه فعلاً — عشان الكارت يفرّق بين عميل السيلز جابه بنفسه
         وعميل الإدارة وزّعته عليه */
      addedByName: currentAgent?.name || (isAdmin ? 'الإدارة' : 'الفريق'),
      addedById: currentAgent?.id,
      /* اختيار صريح — اللون بيتبعه، مش بيتخمّن */
      leadKind: newLeadForm.leadKind,
      createdAt: new Date().toISOString(),
      lastContactDate: 'الآن',
      followUpStatus: 'pending',
      followUpScheduledAt: newLeadForm.nextAt?.label || 'بعد ساعتين',
      followUpNote: newLeadForm.notes.trim() || 'متابعة أولية مع العميل',
      followUpUrgency: newLeadForm.nextAt && newLeadForm.nextAt.at - Date.now() > 3 * 3600000 ? 'upcoming' : 'urgent',
      nextActionAt: newLeadForm.nextAt?.at || Date.now() + 2 * 3600000,
    };

    onAddLead(newLead);
    clearDraft('new_lead');
    setIsAddLeadOpen(false);
    // عميل الكامبين بييجي بالجملة فبيتضاف بسرعة. العميل اللي السيلز كلّمه بنفسه،
    // مكالمة الاكتشاف بتفتح على طول عشان الطلب يبقى كامل من أول لحظة.
    /* الربط: العميل الجديد بيروح على طول للخطوة اللي بعده.
       عميل الكامبين بييجي بالجملة فبيتضاف وبس. */
    /* العميل الجديد بينزل في "جديد" وبس — مفيش فورم ولا قفزة
       للمطابقة. الطلب بيتسجّل من المطابقة لما يحتاج. */
    setNewLeadForm(EMPTY_LEAD_FORM);
  };


  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F5F0E6] flex flex-col lg:flex-row font-ibm overflow-hidden" 
      dir="rtl"
    >
      {/* 1. SIDEBAR (Desktop: Fixed Left Sidebar, Mobile: Top Collapsible Menu) */}
      <aside className="w-full lg:w-64 xl:w-72 bg-[#141414] text-white flex flex-col justify-between shrink-0 border-b lg:border-b-0 lg:border-l border-stone-800 z-20">
        
        {/* Sidebar Header */}
        <div>
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <LionLogo size={34} textColor="text-white" subtextColor="text-[#E9DFCA]" />
              <div>
                <h2 className="font-readex font-bold text-sm text-white">غرفة العمليات</h2>
                <p className="text-[11px] text-[#A07A26] font-bold">CRM السبع للعقارات</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-stone-400 hover:text-white rounded-xl bg-white/5"
              >
                <Menu size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-white rounded-xl bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Current Sales Agent Profile Card */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#A07A26] text-white font-bold flex items-center justify-center text-xs shadow-xs font-readex">
                  {isAdmin ? 'إد' : (currentSalesAgent?.name?.charAt(0) || 'م')}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white truncate max-w-[120px]">
                    {isAdmin ? 'الإدارة' : (currentSalesAgent?.name || 'مستشار المبيعات')}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{(isAdmin || isLead) ? (viewAgentId === 'all' ? 'بتشوف الفريق كله' : `بتشوف ${agents.find((a) => a.id === viewAgentId)?.name || ''}`) : 'متاح للمتابعات'}</span>
                  </div>
                </div>
              </div>

              {/* بتتبع اللي إنت شايفه. الإدارة من غير اختيار = مفيش نقط، مش نقط حد تاني */}
              <span className="px-2 py-0.5 bg-[#FAF4E5]/10 border border-[#E9DFCA]/20 text-[#FAF4E5] text-[10px] font-mono font-bold rounded-lg">
                {shownAgent ? shownAgent.name : 'إدارة'}
              </span>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className={`p-3 space-y-1.5 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <button
              onClick={() => {
                setActiveTab('daily');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} />
                <span>{isAdmin ? 'مهام الفريق' : 'مهامي النهارده'}</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('pipeline');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers size={16} />
                <span>مسار العملاء (Kanban)</span>
              </div>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono">
                {scopedLeads.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('followups');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'followups'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={16} />
                <span>مسار المتابعات اليومية</span>
              </div>
              {pendingFollowUpsCount > 0 && (
                <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {pendingFollowUpsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('matching');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matching'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Target size={16} />
                <span>المطابقة الذكية للعملاء</span>
              </div>
            </button>

            {ownerDesk && (
              <button
                onClick={() => { setActiveTab('notebook'); setIsMobileMenuOpen(false); }}
                className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'notebook' ? 'bg-[#A07A26] text-white shadow-xs' : 'text-stone-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5"><span>📝</span><span>دفتري</span></div>
                {dueNotes.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px]">{dueNotes.length}</span>}
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('content');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Target size={16} />
                <span>المحتوى والإعلانات</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('leaderboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown size={16} />
                <span>المتصدرين الشهر ده</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Buttons */}
        <div className={`p-4 border-t border-white/10 space-y-2 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
          <button
            onClick={() => setIsAddLeadOpen(true)}
            className="w-full py-2.5 px-3 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={15} />
            <span>إضافة عميل جديد</span>
          </button>

          {isAdmin && onAddLeadsBulk && (
            <button
              onClick={() => setIsCampaignOpen(true)}
              className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white font-readex font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Flame size={15} className="text-[#FF7A1A]" />
              <span>وزّع ليدات كامبين</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>العودة لمعرض الشقق</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CRM WORKSPACE */}
      <main className="isolate flex-1 flex flex-col h-full overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
        {/* لوجو الشركة علامة مائية — ثابت ورا الشغل، مش بيتداس عليه */}
        <div aria-hidden="true" className="pointer-events-none select-none fixed flex items-center justify-center" style={{ zIndex: -1, bottom: '-6vh', left: '-8vw', width: 'min(78vw, 560px)', aspectRatio: '1 / 1', opacity: 0.06, filter: 'invert(1) grayscale(1)', mixBlendMode: 'multiply' }}>
          {logoUrl
            ? <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            : <LionLogo size={520} className="w-full h-full" />}
        </div>


        {/* المزامنة واقفة — بيظهر لما تقع بس، مش مؤشر دايم.
            من غيره كل واحد بيفضل على نسخته القديمة ومحدش عارف. */}
        {syncError && (
          <div className="bg-[#FBEDEA] border-2 border-[#C2412D] rounded-2xl p-3.5 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-[#9E2A1B] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#9E2A1B]">
                المزامنة واقفة — إنت شايف نسخة قديمة
              </p>
              <p className="text-[11px] text-[#9E2A1B]/90 leading-relaxed">
                {syncError} · أي تعديل تعمله دلوقتي ممكن ما يوصلش لباقي الفريق.
                اقفل وافتح الصفحة، ولو فضلت كده بلّغني.
              </p>
            </div>
          </div>
        )}

        
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#ECE8DF] p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xs">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
            <input
              type="text"
              value={leadSearchQuery}
              onChange={(e) => setLeadSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الهاتف، كود الشقة أو الحي..."
              className="w-full pr-10 pl-3.5 py-2 sm:py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26] transition-colors"
            />
            {leadSearchQuery && (
              <button
                onClick={() => setLeadSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* لينكات الإحالة — زرار صغير، مش كارت في نص الشاشة */}
            <OwnerLinkCard
              byCode={currentSalesAgent?.id || (isAdmin ? 'admin' : undefined)}
              byName={currentSalesAgent?.name || (isAdmin ? 'الإدارة' : undefined)}
            />

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 sm:px-3 sm:py-2 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 relative border border-[#ECE8DF]"
              title="تنبيهات المتابعة"
            >
              <Bell size={15} className="text-[#A07A26]" />
              <span className="hidden sm:inline">المتابعات</span>
              {pendingFollowUpsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingFollowUpsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsAddLeadOpen(true)}
              className="px-3 sm:px-4 py-2 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
            >
              <Plus size={14} />
              <span>عميل جديد</span>
            </button>

            <button
              onClick={onClose}
              className="hidden lg:flex p-2 text-stone-400 hover:text-stone-800 hover:bg-[#ECE8DF]/50 rounded-xl transition-colors cursor-pointer"
              title="إغلاق غرفة العمليات"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Tabs */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar shrink-0 border-b border-[#ECE8DF]">
          {[
            { id: 'daily', label: isAdmin ? 'مهام الفريق' : 'يومي' },
            { id: 'pipeline', label: 'مسار العملاء' },
            { id: 'followups', label: 'المتابعات' },
            { id: 'matching', label: 'المطابقة الذكية' },
            { id: 'content', label: 'المحتوى والإعلانات' },
            { id: 'leaderboard', label: 'المتصدرين' },
            ...(ownerDesk ? [{ id: 'notebook', label: '📝 دفتري' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`h-10 px-4 rounded-[14px] text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center ${
                activeTab === tab.id
                  ? 'bg-[#17150F] text-[#F5F0E6]'
                  : 'bg-white border border-[#E7DFCF] text-[#17150F]'
              }`}
            >
              {tab.label}
              {tab.id === 'notebook' && dueNotes.length > 0 && (
                <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px]">{dueNotes.length}</span>
              )}
              {tab.id === 'followups' && pendingFollowUpsCount > 0 && (
                <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px]">
                  {pendingFollowUpsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: KANBAN BOARD & PIPELINE */}
        {/* ========================================================= */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4 sm:space-y-5 flex-1 flex flex-col pt-1">

            {/* طلبات تعديل الميزانية مستنية الإدارة — مكان واحد، مش كل ملف لوحده */}
            {isAdmin && budgetRequests.length > 0 && (
              <div className="bg-[#FFF8E6] border border-[#EBD9A6] rounded-2xl p-4 space-y-2">
                <p className="font-bold text-sm text-[#7A5E12]">
                  {budgetRequests.length} طلب تعديل ميزانية مستني تأكيدك
                </p>
                <div className="space-y-1.5">
                  {budgetRequests.slice(0, 6).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLeadForDetails(l)}
                      className="w-full text-right bg-white border border-[#EBD9A6] rounded-xl px-3 py-2 cursor-pointer"
                    >
                      <span className="font-bold text-xs text-[#141414]">{l.name}</span>
                      <span className="text-[11px] text-[#7A5E12] block leading-relaxed">
                        {l.budgetChangeRequest?.by} طلب يغيّرها لـ{' '}
                        {Math.round(l.budgetChangeRequest?.toMax || 0).toLocaleString('en-US')} ج.م
                        {l.budgetChangeRequest?.note ? ` — ${l.budgetChangeRequest.note}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Urgent Broadcast Banner */}
            {(isAdmin || isLead) && (
              <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
                {/* مقفولة افتراضياً — بتتفتح وتختار السيلز، ومرتّبين بالأنشط */}
                <button
                  onClick={() => setTeamOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 text-right"
                  aria-expanded={teamOpen}
                >
                  <span className="font-bold text-sm">
                    متابعات الفريق
                    <span className="font-medium text-[#8C877D]"> · {viewAgentId !== 'all' ? `بتشوف ${agents.find((a) => a.id === viewAgentId)?.name || ''}` : 'كل الفريق'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {ownerDesk && viewAgentId !== OWNER_DESK.id && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); setViewAgentId(OWNER_DESK.id); setTeamOpen(false); }}
                        className="px-2.5 py-1 rounded-lg bg-[#A07A26] text-white text-[11px] font-bold whitespace-nowrap"
                      >
                        📁 ملفي
                      </span>
                    )}
                    {viewAgentId !== 'all' && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); setViewAgentId('all'); }}
                        className="px-2.5 py-1 rounded-lg bg-[#141414] text-white text-[11px] font-bold"
                      >
                        ✕ كل الفريق
                      </span>
                    )}
                    <ChevronDown size={16} className={`text-[#A07A26] transition-transform ${teamOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {teamOpen && (
                  <>
                    <p className="text-[11px] text-[#8C877D]">مرتّبين بالأنشط (أكشن النهارده، وبعدين آخر ٧ أيام). دوس على أي حد عشان تشوف عملاءه.</p>
                    {rankedAgents.map(({ a, mine, late, snoozes, today, week }) => (
                      <button
                        key={a.id}
                        onClick={() => { setViewAgentId(viewAgentId === a.id ? 'all' : a.id); setTeamOpen(false); }}
                        aria-pressed={viewAgentId === a.id}
                        className={`w-full flex flex-wrap justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 px-2 -mx-2 rounded-xl text-right transition active:scale-[0.99] hover:bg-[#F6F4EF] ${viewAgentId === a.id ? 'bg-[#141414] text-white hover:bg-[#141414]' : ''} ${!mine && !week ? 'opacity-50' : ''}`}
                      >
                        <span className="font-bold text-sm flex items-center gap-1.5">
                          <ChevronLeft size={14} className={viewAgentId === a.id ? 'text-[#D9B864]' : 'text-[#A07A26]'} />
                          {a.name}
                        </span>
                        <span className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className={`px-2 py-1 rounded-lg font-bold ${today ? 'bg-[#141414] text-white' : 'bg-[#F6F4EF] text-[#8C877D]'}`}>{today} أكشن النهارده</span>
                          <span className="px-2 py-1 rounded-lg bg-[#F6F4EF]">{mine} عميل</span>
                          <span className={`px-2 py-1 rounded-lg ${late ? 'bg-[#FBEDEA] text-[#C2412D] font-bold' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>{late} متأخرة</span>
                          <span className="px-2 py-1 rounded-lg bg-[#FBF8F1] text-[#6E5418]">{snoozes} تأجيل</span>
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* عدّاد النهارده — رقم كبير، وتحته كلمة، وشارة صغيرة واحدة */}
            <div className="grid grid-cols-3 gap-2">
              {([['ريكويست جديد النهارده', todayNewLeads, 'new'], ['أكشن اتسجّل النهارده', todayDone, 'actions'], [viewingsLabel, todayViewings, 'viewings']] as [string, number, 'new' | 'actions' | 'viewings'][]).map(([t, v, k]) => (
                <button
                  key={k}
                  onClick={() => (k === 'actions' ? setActionsLogOpen(true) : setCounterOpen(k))}
                  className="text-right rounded-[20px] p-3 flex flex-col gap-1 border transition active:scale-[0.97]"
                  style={{ background: T.surface, borderColor: T.line, color: T.ink }}
                >
                  <span className="font-readex font-semibold text-[26px] leading-none">{v}</span>
                  <span className="text-[11px] leading-snug" style={{ color: T.muted }}>{t}</span>
                  <span className="self-start mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: k === 'viewings' ? stageTone('visit_done').bg : k === 'new' ? T.accent : T.ink, color: '#fff' }}>التفاصيل</span>
                </button>
              ))}
            </div>

            {isAdmin && canEdit && leads.filter((l: any) => l.deleteRequest && !l.deleteRequest.resolved).length > 0 && (
              <div className="bg-[#FBEDEA] border border-[#E9B8AE] rounded-2xl p-4 space-y-2">
                <p className="font-bold text-sm text-[#9A2E1F]">طلبات مسح من الفريق</p>
                {leads.filter((l: any) => l.deleteRequest && !l.deleteRequest.resolved).map((l: any) => (
                  <div key={l.id} className="flex flex-wrap justify-between items-center gap-2 bg-white rounded-xl p-3">
                    <div className="text-xs"><b className="text-sm">{l.name}</b> · {l.assignedAgentName}<br />{l.deleteRequest.by}: {l.deleteRequest.reason}</div>
                    <div className="flex gap-2">
                      <button onClick={() => adminDeleteLead(l)} className="px-3 py-2 rounded-xl bg-[#C2412D] text-white text-xs font-bold">موافقة ومسح</button>
                      <button onClick={() => onUpdateLead({ ...l, deleteRequest: { ...l.deleteRequest, resolved: true } })} className="px-3 py-2 rounded-xl bg-[#F6F4EF] text-xs font-bold">رفض</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && editBoard === 'banner' && (
              <div className="bg-white border-2 border-[#A07A26] rounded-2xl p-4 space-y-2">
                <input value={draftBoard.banner?.title || ''} onChange={(e) => setDraftBoard({ banner: { ...(draftBoard.banner as CrmBanner), title: e.target.value } })} placeholder="العنوان" className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-sm font-bold" />
                <input value={draftBoard.banner?.subtitle || ''} onChange={(e) => setDraftBoard({ banner: { ...(draftBoard.banner as CrmBanner), subtitle: e.target.value } })} placeholder="التفاصيل" className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-sm" />
                <input value={draftBoard.banner?.bonus || ''} onChange={(e) => setDraftBoard({ banner: { ...(draftBoard.banner as CrmBanner), bonus: e.target.value } })} placeholder="البونص (اختياري)" className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-sm" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draftBoard.banner?.active !== false} onChange={(e) => setDraftBoard({ banner: { ...(draftBoard.banner as CrmBanner), active: e.target.checked } })} />ظاهر للسيلز</label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={draftBoard.banner?.showMatching !== false}
                    onChange={(e) => setDraftBoard({ banner: { ...(draftBoard.banner as CrmBanner), showMatching: e.target.checked } })}
                  />
                  <span>
                    الطلب ده بخصوص عميل
                    <span className="block text-[11px] text-[#8C877D] leading-relaxed">
                      شيل العلامة لو ده كلام عام للفريق — زرار «شوف المطابقات» هيختفي.
                    </span>
                  </span>
                </label>
                <div className="flex gap-2"><button onClick={async () => { await saveCrmBoard({ banner: draftBoard.banner }); setEditBoard(null); }} className="flex-1 py-2.5 rounded-xl bg-[#141414] text-white text-sm font-bold">حفظ</button><button onClick={() => setEditBoard(null)} className="px-4 py-2.5 rounded-xl bg-[#F6F4EF] text-sm font-bold">إلغاء</button></div>
              </div>
            )}
            {isAdmin && editBoard !== 'banner' && (
              <button onClick={() => { setDraftBoard({ banner: banner.title?.trim() ? banner : { ...banner, active: true } }); setEditBoard('banner'); }} className="self-start text-xs font-bold text-[#A07A26]">✎ تعديل الطلب العاجل</button>
            )}
            {banner.active !== false && !!banner.title?.trim() && (
            <div className="bg-white border-2 border-[#E9DFCA] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 sm:mt-0 animate-ping" />
                <div>
                  <h3 className="font-readex font-bold text-xs sm:text-sm text-[#141414]">
                    {banner.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#6B665C] mt-0.5 leading-relaxed">
                    {banner.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 self-end sm:self-auto shrink-0">
                {!!(banner.bonus || '').trim() && (
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#9E7A26] font-bold text-[11px] sm:text-xs rounded-xl">
                    {banner.bonus}
                  </span>
                )}
                {/* الزرار بيظهر بس لما الطلب يكون بخصوص عميل —
                    الطلب العام مفيش حاجة يطابقها */}
                {banner.showMatching !== false && (
                  <button
                    onClick={() => setActiveTab('matching')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#141414] hover:bg-black text-white font-readex font-bold text-[11px] sm:text-xs rounded-xl transition-all cursor-pointer active:scale-98"
                  >
                    شوف المطابقات
                  </button>
                )}
              </div>
            </div>
            )}

            {/* المراحل — كل واحدة بنقطة لونها، والمختارة أسود */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0 -mx-1 px-1">
              {([['all', 'الكل', scopedLeads.length, T.accent] as const, ...CRM_PIPELINE_STAGES.map((st) => [st.id, st.label, stageCounts[st.id] || 0, stageTone(st.id).bg] as const)]).map(([id, label, count, dot]) => {
                const on = activeMobileStageFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveMobileStageFilter(id as any)}
                    className="shrink-0 h-10 px-3.5 rounded-[14px] text-[13px] font-semibold flex items-center gap-2 border transition active:scale-[0.97]"
                    style={on ? { background: T.ink, color: T.ground, borderColor: T.ink } : { background: T.surface, color: T.ink, borderColor: T.line }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: dot, boxShadow: on ? 'none' : `0 0 0 1px ${T.line}` }} />
                    {label}
                    <span className="font-readex text-[11px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* دليل ألوان التنبيه — اللون معاه كلمة دايماً */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] px-1">
              {([['#C2410C', 'ليد فريش'], ['#4A5568', 'كامبين قديم'], ['#1F5FB0', 'تحديث من سارة']] as const).map(([c, t]) => (
                <span key={c} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold" style={{ borderColor: T.line, background: T.surface, color: T.ink }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />{t}
                </span>
              ))}
            </div>

            {/* لوحة المراحل */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar flex-1 items-start">
              {CRM_PIPELINE_STAGES
                .filter((st) => activeMobileStageFilter === 'all' || activeMobileStageFilter === st.id)
                .map((st) => {
                  const stageLeads = filteredLeads.filter((l) => l.status === st.id);
                  const sTone = stageTone(st.id);

                  return (
                    <div
                      key={st.id}
                      className="rounded-[28px] p-2.5 flex flex-col gap-2.5 min-h-[440px] w-[84vw] sm:w-[320px] shrink-0 snap-center border"
                      style={{ background: 'rgba(255,253,248,.55)', borderColor: T.line }}
                    >
                      <div className="flex items-center justify-between px-2.5 pt-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: sTone.bg, boxShadow: `0 0 0 1px ${T.line}` }} />
                          <h4 className="font-readex font-semibold text-sm" style={{ color: T.ink }}>{st.label}</h4>
                        </div>
                        <span className="min-w-7 h-7 px-2 rounded-full text-xs font-bold flex items-center justify-center font-readex" style={{ background: T.surface, color: T.muted, border: `1px solid ${T.line}` }}>
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[65vh] no-scrollbar">
                        {stageLeads.length === 0 ? (
                          <div className="py-12 text-center text-xs rounded-[22px] border border-dashed" style={{ color: T.muted, borderColor: T.line }}>
                            مفيش عملاء في المرحلة دي
                          </div>
                        ) : (
                          stageLeads.map((lead) => {
                          const tone = toneStyle(lead);
                          /* لون الكارت = المرحلة. التنبيهات (فريش / كامبين / تحديث سارة) بتغطّي عليه
                             لأنها حاجة لازم تتشاف — ومعاها كلمتها دايماً */
                          const b = followUpBadge(lead.nextActionAt, lead.followUpStatus, lead.followUpScheduledAt || st.defaultBadge);
                          const late = b.tone === 'late';
                          /* المتأخر بيقلب أحمر كله — أهم من أي لون تاني */
                          const c = late ? LATE_TONE
                            : tone.tone !== 'none'
                              ? { bg: tone.hex, fg: '#FFFFFF', soft: 'rgba(255,255,255,.8)', line: 'rgba(255,255,255,.25)', chip: 'rgba(255,255,255,.18)', dark: true }
                              : sTone;
                          const circle = 'w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95';
                          return (
                            <div
                              key={lead.id}
                              className={`rounded-[22px] p-3.5 flex flex-col gap-2 transition ${late ? 'crm-late' : ''}`}
                              style={{ background: c.bg, color: c.fg, boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 12px 26px -16px rgba(0,0,0,.45)' }}
                            >
                              {/* الميعاد + تنبيه الكارت */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[11.5px] font-bold"
                                  style={late ? { background: '#FFFFFF', color: LATE_TONE.bg } : { background: c.chip, color: c.fg }}>
                                  {late ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                  {b.text || st.defaultBadge}
                                </span>
                                {tone.tone !== 'none' ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: c.chip }}>{tone.label}</span>
                                    {tone.tone === 'viewing_update' && (
                                      <button onClick={() => onUpdateLead(markViewingSeen(lead))} className="text-[10px] font-extrabold bg-white text-[#1F5FB0] px-2 py-0.5 rounded-full cursor-pointer">شفته</button>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold" style={{ color: c.soft }}>{st.label}</span>
                                )}
                              </div>
                              {tone.tone === 'old_campaign' && lead.campaignName && (
                                <span className="text-[10px] font-bold truncate" style={{ color: c.soft }}>{lead.campaignName}</span>
                              )}
                              {tone.tone === 'viewing_update' && (
                                <p className="text-[11.5px] font-bold leading-relaxed">{viewingUpdateText(lead)}</p>
                              )}

                              {/* الاسم والطلب */}
                              <button onClick={() => setSelectedLeadForDetails(lead)} className="text-right flex flex-col gap-0.5 cursor-pointer">
                                <span className="font-readex font-semibold text-[17px] leading-snug truncate">{lead.name}</span>
                                <span className="text-[12.5px] truncate" style={{ color: c.soft }}>
                                  {lead.preferredBedrooms ? `${lead.preferredBedrooms} غرف · ` : ''}
                                  {lead.preferredNeighborhood || 'الهضبة الوسطى'}
                                </span>
                              </button>

                              {/* الكود والميزانية */}
                              <div className="flex items-center justify-between pt-2 text-xs border-t" style={{ borderColor: c.line }}>
                                <span className="font-mono" style={{ color: c.soft }}>{lead.interestedPropertyCode ? `#${lead.interestedPropertyCode}` : '—'}</span>
                                <span className="font-readex font-semibold text-[13px]">{lead.budgetMax ? `${(lead.budgetMax / 1000000).toFixed(1)}M` : '—'}</span>
                              </div>

                              {/* كومنت المعاينة */}
                              {lead.fieldViewingComment && (
                                <div className="rounded-2xl p-2.5 space-y-1" style={{ background: c.chip }}>
                                  <div className="flex items-center justify-between font-bold text-[11px]">
                                    <span className="flex items-center gap-1"><Eye size={12} />كومنت المعاينة ({lead.fieldViewingBrokerName || 'البروكر'})</span>
                                    {lead.fieldViewingOutcome && (
                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white text-[#17150F]">
                                        {lead.fieldViewingOutcome === 'interested' ? 'مهتم' : lead.fieldViewingOutcome === 'made_offer' ? 'قدّم عرض' : lead.fieldViewingOutcome === 'not_suitable' ? 'غير مناسبة' : lead.fieldViewingOutcome}
                                      </span>
                                    )}
                                  </div>
                                  <p className="line-clamp-2 text-[11.5px] font-semibold leading-relaxed">« {lead.fieldViewingComment} »</p>
                                  <div className="text-[10px] flex items-center justify-between" style={{ color: c.soft }}>
                                    <span>تنسيق: {lead.coordinatorName || 'سارة حنفي'}</span>
                                    {lead.fieldViewingRecordedAt && <span className="font-mono text-[9px]">{lead.fieldViewingRecordedAt}</span>}
                                  </div>
                                </div>
                              )}

                              {/* السيلز + الأزرار */}
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="flex items-center gap-1.5 min-w-0 text-[11.5px] font-semibold">
                                  <span className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: c.dark ? 'rgba(255,255,255,.2)' : T.ink, color: c.dark ? '#fff' : T.ground }}>
                                    {(lead.assignedAgentName || '؟').trim().charAt(0)}
                                  </span>
                                  <span className="truncate">{lead.assignedAgentName || 'غير مسند'}</span>
                                </span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <a href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً أستاذ ${lead.name}، بخصوص طلبك العقاري في الهضبة الوسطى`)} target="_blank" rel="noreferrer"
                                    className={circle} style={{ background: c.chip }} aria-label="واتساب" title="واتساب"><MessageCircle size={15} /></a>
                                  <a href={generateCallLink(lead.phone)} className={circle} style={{ background: c.chip }} aria-label="اتصال" title="اتصال"><Phone size={15} /></a>
                                  <button type="button" onClick={() => setLeadToChangeStatus(lead)}
                                    className="h-9 px-3 rounded-full flex items-center gap-1 text-[11.5px] font-bold transition active:scale-95 cursor-pointer"
                                    style={c.dark ? { background: '#FFFFFF', color: c.bg } : { background: T.ink, color: T.ground }}
                                    title="نقل المرحلة">
                                    <ArrowLeftRight size={12} />نقل
                                  </button>
                                </span>
                              </div>
                              {isAdmin && canEdit && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); adminDeleteLead(lead); }}
                                  className="self-start text-[10.5px] font-bold underline underline-offset-2 opacity-80 cursor-pointer" style={{ color: c.dark ? '#FFFFFF' : T.late }}>حذف العميل</button>
                              )}
                            </div>
                          );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* «تراجع» بعد نقل المرحلة */}
            {undoMove && (
              <div role="status" className="fixed z-[95] bottom-5 left-1/2 -translate-x-1/2 w-[min(360px,calc(100vw-24px))] flex items-center justify-between gap-2 rounded-[18px] p-2 ps-4 text-[13px] shadow-[0_14px_34px_rgba(0,0,0,.28)] animate-[fadeUp_.3s_ease]"
                style={{ background: T.ink, color: T.ground }}>
                <span className="flex items-center gap-2 min-w-0"><CheckCircle2 size={16} style={{ color: T.accent }} className="shrink-0" /><span className="truncate">{undoMove.text}</span></span>
                <button onClick={() => { clearTimeout(undoTimer.current); onUpdateLead(undoMove.prev); setUndoMove(null); }}
                  className="h-9 px-3.5 rounded-xl font-bold text-[13px] shrink-0 cursor-pointer" style={{ background: T.accent, color: T.accentInk }}>تراجع</button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FOLLOW-UPS PATH (مسار المتابعة مع كافة الخانات) */}
        {/* ========================================================= */}
        {activeTab === 'followups' && (
          <div className="space-y-4 sm:space-y-5 flex-1 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-readex font-semibold text-[26px] leading-tight text-[#17150F]">المتابعات</h3>
                <p className="text-[13px] text-[#6F695D]">مين ميعاده جه، ومين اتأخر — الأحمر الأول</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {(isAdmin || isLead) && (
                  <select value={viewAgentId} onChange={(e) => setViewAgentId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE8DF] text-xs font-bold text-[#141414]">
                    <option value="all">{isAdmin ? 'كل الفريق' : 'فريقي كله'}</option>
                    {visibleAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                <button
                  onClick={() => setLateOnly((v) => !v)}
                  className={`h-10 px-4 rounded-[14px] text-[13px] font-bold border ${lateOnly ? 'bg-[#D3262B] text-white border-[#D3262B]' : 'bg-white text-[#D3262B] border-[#F0C2BF]'}`}
                >
                  {lateOnly ? `اعرض الكل` : `المتأخر (${lateCount})`}
                </button>
                <button onClick={toggleCompact} className="px-3.5 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold text-[#141414]">
                  {compactView ? 'عرض مفصّل' : 'عرض مختصر'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddLeadOpen(true)}
                  className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>إضافة موعد متابعة</span>
                </button>
              </div>
            </div>

            {/* Followups Cards / Table */}
            <div className="space-y-3">
              {lateOnly && lateCount === 0 && (
                <p className="text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-2xl p-4 text-center">مفيش متابعات متأخرة</p>
              )}
              {shownFollowUps
                .map((lead) => {
                const stageObj = CRM_PIPELINE_STAGES.find((s) => s.id === lead.status) || CRM_PIPELINE_STAGES[0];
                const { b, late, tone, c } = cardLook(lead, stageObj.defaultBadge);
                const pill = 'h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer';
                return (
                  <div
                    key={lead.id}
                    className={`rounded-[24px] p-4 space-y-3 ${late ? 'crm-late' : ''}`}
                    style={{ background: c.bg, color: c.fg, boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 14px 30px -18px rgba(0,0,0,.5)' }}
                  >
                    {/* الميعاد + المرحلة */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-bold"
                        style={late ? { background: '#FFFFFF', color: LATE_TONE.bg } : { background: c.chip }}>
                        {late ? <AlertTriangle size={13} /> : <Clock size={13} />}
                        {b.text || lead.followUpScheduledAt || '—'}
                      </span>
                      <button onClick={() => setLeadToChangeStatus(lead)}
                        className="h-7 px-3 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer" style={{ background: c.chip }}>
                        {stageObj.label}<ChevronDown size={13} />
                      </button>
                    </div>

                    {tone.tone === 'viewing_update' && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: c.chip }}>{tone.label} · {viewingUpdateText(lead)}</span>
                        <button onClick={() => onUpdateLead(markViewingSeen(lead))} className="text-[11px] font-extrabold bg-white text-[#1F5FB0] px-2.5 py-0.5 rounded-full cursor-pointer">شفته</button>
                      </div>
                    )}

                    {/* الاسم */}
                    <div className="flex items-start gap-3">
                      <span className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-readex font-bold text-base" style={{ background: c.dark ? 'rgba(255,255,255,.2)' : T.ink, color: c.dark ? '#fff' : T.ground }}>
                        {lead.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setSelectedLeadForDetails(lead)} className="text-right font-readex font-semibold text-[19px] leading-snug cursor-pointer">{lead.name}</button>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="font-mono text-xs" dir="ltr" style={{ color: c.soft }}>{lead.phone}</span>
                          {(tone.tone === 'fresh' || tone.tone === 'old_campaign') && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: c.chip }}><Flame size={10} /> {tone.label}</span>
                          )}
                          {paymentOf(lead) && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: c.chip }}>{PAY_LABEL[paymentOf(lead)!]}</span>
                          )}
                        </div>
                        {lead.campaignName && (tone.tone === 'fresh' || tone.tone === 'old_campaign') && (
                          <p className="text-[11px] font-bold" style={{ color: c.soft }}>من كامبين: {lead.campaignName}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: c.soft }}>مع <strong style={{ color: c.fg }}>{lead.assignedAgentName || 'سارة حنفي'}</strong></p>
                      </div>
                    </div>
{!compactView && (<>
                    {/* الطلب في سطر */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs rounded-2xl p-3" style={{ background: c.chip }}>
                      <div><span className="text-[10px] block font-bold" style={{ color: c.soft }}>موعد المتابعة</span><span className="font-bold">{lead.followUpScheduledAt || '—'}</span></div>
                      <div><span className="text-[10px] block font-bold" style={{ color: c.soft }}>الحالة</span><span className="font-bold">{b.text || '—'}</span></div>
                      <div><span className="text-[10px] block font-bold" style={{ color: c.soft }}>الحي والميزانية</span><span className="font-bold">{lead.preferredNeighborhood || 'الهضبة الوسطى'} ({lead.budgetMax ? `${(lead.budgetMax / 1000000).toFixed(1)}M` : '—'})</span></div>
                      <div><span className="text-[10px] block font-bold" style={{ color: c.soft }}>الكود</span><span className="font-mono font-bold">{lead.interestedPropertyCode ? `#${lead.interestedPropertyCode}` : 'طلب عام'}</span></div>
                    </div>

                    {/* الطلب — بيتعدّل من هنا على طول */}
                    <div className="rounded-2xl p-2" style={{ background: T.surface, color: T.ink }}>
                      <QuickBriefRow lead={lead} onUpdateLead={onUpdateLead} byName={actorName} />
                    </div>

                    {lead.fieldViewingComment && (
                      <div className="rounded-2xl p-3 space-y-1.5" style={{ background: c.chip }}>
                        <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                          <span className="flex items-center gap-1.5"><Eye size={14} />كومنت المعاينة ({lead.fieldViewingBrokerName || 'الوسيط'})</span>
                          {lead.fieldViewingOutcome && (
                            <span className="px-2.5 py-0.5 bg-white text-[#17150F] text-[11px] rounded-full font-black">
                              {lead.fieldViewingOutcome === 'interested' ? 'مهتم وجاد' : lead.fieldViewingOutcome === 'made_offer' ? 'قدّم عرض سعر' : lead.fieldViewingOutcome === 'not_suitable' ? 'غير مناسبة' : lead.fieldViewingOutcome}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed font-semibold">« {lead.fieldViewingComment} »</p>
                        <div className="text-[10px] flex items-center justify-between" style={{ color: c.soft }}>
                          <span>منسقة المعاينة: <strong>{lead.coordinatorName || 'سارة حنفي'}</strong></span>
                          {lead.fieldViewingRecordedAt && <span>{lead.fieldViewingRecordedAt}</span>}
                        </div>
                      </div>
                    )}
</>)}
                    {/* آخر ملاحظة + الأزرار */}
                    <p className={`text-[13px] leading-relaxed line-clamp-2 ${compactView ? 'hidden sm:block' : ''}`} style={{ color: c.soft }}>
                      <strong style={{ color: c.fg }}>آخر ملاحظة: </strong>{lead.followUpNote || lead.notes?.[0] || 'مفيش ملاحظات لسه'}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <a href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً أستاذ ${lead.name}، بخصوص الشقق المعروضة بالهضبة الوسطى`)} target="_blank" rel="noreferrer"
                        className={pill} style={{ background: c.chip }}><MessageCircle size={14} />واتساب</a>
                      <a href={generateCallLink(lead.phone)} className={pill} style={{ background: c.chip }}><Phone size={14} />اتصال</a>
                      {(() => {
                        const n = (followUpMatches.get(lead.id) || []).length;
                        return (
                          <button onClick={() => { setMatchingLeadId(lead.id); setActiveTab('matching'); }} className={pill}
                            style={c.dark ? { background: '#FFFFFF', color: c.bg } : { background: T.ink, color: T.ground }}>
                            المطابقة · {n ? `${n} شقة` : 'مفيش مناسب'}
                          </button>
                        );
                      })()}
                      <button onClick={() => setSelectedLeadForDetails(lead)} className={pill} style={{ background: c.chip }}>الملف</button>
                      {isAdmin && canEdit ? (
                        <button onClick={() => adminDeleteLead(lead)} className="text-[11px] font-bold underline underline-offset-2 opacity-80 ms-auto cursor-pointer">حذف</button>
                      ) : (lead as any).deleteRequest && !(lead as any).deleteRequest.resolved ? (
                        <span className="text-[11px] font-bold ms-auto" style={{ color: c.soft }}>طلب المسح مستني الإدارة</span>
                      ) : (
                        <button onClick={() => {
                          const reason = window.prompt('ليه عايز تمسح العميل ده؟');
                          if (reason && reason.trim()) onUpdateLead({ ...lead, deleteRequest: { by: actorName, reason: reason.trim(), at: Date.now() } } as any);
                        }} className="text-[11px] font-bold underline underline-offset-2 opacity-80 ms-auto cursor-pointer">اطلب مسح</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SMART MATCHING (Exact Match with Screenshot 1) */}
        {/* ========================================================= */}
        {activeTab === 'matching' && (
          <div className="space-y-4 sm:space-y-5 flex-1 pt-1 max-w-4xl mx-auto w-full">
            
            {/* Top Client Header Card (Doctor/Client Info & Matching Count Badge) */}
            <div className="bg-white border border-[#ECE8DF] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-readex font-bold text-sm sm:text-base text-[#141414] truncate">
                    {selectedMatchingLead?.name || 'العميل المحدد'} 
                    <span className="text-xs text-stone-500 font-normal font-mono mr-1.5 dir-ltr inline-block">
                      ({selectedMatchingLead?.phone || '01009876543'})
                    </span>
                  </h3>
                  <p className="text-xs text-[#6B665C]">
                    الطلب: <span className="font-bold text-[#141414]">{selectedMatchingLead ? briefLine(selectedMatchingLead) : '—'}</span>
                  </p>
                  {/* مكان واحد لتعديل الطلب — الفورم بيفتح مليان باللي متسجّل.
                      قبل كده كان فيه أزرار دفع هنا بتغيّر المطابقة مؤقتاً من
                      غير ما تتحفظ، و"رجّع اللي قاله"، وعشان تعدّل الميزانية
                      تقلب كاش… مكانين بيعدّلوا نفس الحاجة. */}
                  {selectedMatchingLead && (
                    <button
                      type="button"
                      onClick={() => setRequestLead(selectedMatchingLead)}
                      className={`text-[11px] rounded-xl px-3 py-1.5 font-bold cursor-pointer text-right leading-relaxed border ${
                        briefGaps(selectedMatchingLead).length
                          ? 'bg-[#FFF8E6] border-[#EBD9A6] text-[#7A5E12]'
                          : 'bg-[#141414] border-[#141414] text-white'
                      }`}
                    >
                      {briefGaps(selectedMatchingLead).length
                        ? `طلبه ناقص: ${briefGaps(selectedMatchingLead).map((g) => g.label).join('، ')} — سجّل طلبه`
                        : 'عدّل طلبه'}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[[0, 'الميزانية بالظبط'], [0.05, '±5%'], [0.1, '±10%']].map(([v, t]) => (
                      <button key={String(v)} type="button" onClick={() => setMatchTolerance(v as number)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${matchTolerance === v ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>{t}</button>
                    ))}
                    <button type="button" onClick={() => setMatchStrictHood(!matchStrictHood)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${matchStrictHood ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>{matchStrictHood ? 'نفس الحي بس' : 'كل الأحياء'}</button>
                  </div>

                  {/* كاش ولا تقسيط — ده اللي بيحدد السقف اللي بنطابق عليه */}
                  {matchBrief && (
                    <div className="mt-2 bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl p-2.5 space-y-2">

                      {/* القاعدة بالكلام — الريسيل كاش، والتقسيط مشاريع */}
                      <p className="text-[11px] text-[#6B665C] leading-relaxed">
                        {activePay === 'instalment' ? (
                          <>
                            <b className="text-[#141414]">مشاريع بس.</b> الريسيل كاش — المالك مش بيقسّط،
                            فمش بنوريه شقق ريسيل خالص. الفلتر بيشتغل على مقدمه{' '}
                            <b className="font-mono">{matchBrief.downCash.toLocaleString('en-US')}</b> وقسطه{' '}
                            <b className="font-mono">{matchBrief.monthly.toLocaleString('en-US')}</b>.
                          </>
                        ) : activePay === 'cash' ? (
                          resaleCeiling(matchBrief) ? (
                            <><b className="text-[#141414]">ريسيل كاش</b> — لحد <b className="text-[#141414] font-mono">{resaleCeiling(matchBrief).toLocaleString('en-US')}</b> ج.م</>
                          ) : 'مفيش ميزانية متسجّلة — بيطلّع كل حاجة'
                        ) : (
                          <>
                            <b className="text-[#141414]">الاتنين:</b> ريسيل كاش لحد{' '}
                            <b className="font-mono">{(resaleCeiling(matchBrief) || 0).toLocaleString('en-US')}</b> ج.م،
                            ومشاريع على مقدمه وقسطه.
                          </>
                        )}
                      </p>

                    </div>
                  )}
                </div>

                {/* Matching Counter Badge */}
                <div className="bg-[#E6F7ED] border border-[#B3E8C8] text-[#0E7A5A] px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#0E7A5A]" />
                  <span>{showResale ? `${matchedProperties.length} شقق مطابقة` : 'تقسيط · مشاريع'}</span>
                </div>
              </div>

              {/* Client Quick Switcher */}
              <div className="pt-2 border-t border-[#ECE8DF]/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">تبديل العميل:</span>
                {scopedLeads.map((ld) => (
                  <button
                    key={ld.id}
                    onClick={() => setMatchingLeadId(ld.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      (selectedMatchingLead?.id === ld.id)
                        ? 'bg-[#141414] text-white shadow-2xs'
                        : 'bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#6B665C]'
                    }`}
                  >
                    {ld.name.split(' ')[0]} {ld.name.split(' ')[1] || ''}
                  </button>
                ))}
              </div>
            </div>

            {/* التقسيط = مشاريع. الريسيل مبيظهرش هنا خالص. */}
            {showProjects && selectedMatchingLead && (
              <ProjectMatchPanel lead={selectedMatchingLead} />
            )}

            {/* Matched Codes Header & Pills Grid */}
            <div className={`space-y-2.5 ${showResale ? '' : 'hidden'}`}>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#141414] flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span>أكواد الشقق المطابقة ({matchedProperties.length}):</span>
                <span className="text-xs text-stone-500 font-normal">اضغط على أي كود للمعاينة</span>
              </div>

              {/* الأحياء اللي بنطابق عليها مكتوبة — عشان متبصّش في القايمة
                  وتلاقي حي مقالش عليه وتفتكره مطابق */}
              {matchBrief && matchBrief.districts.length > 0 && (
                <p className="text-[11px] text-[#6B665C] leading-relaxed">
                  طلب الأحياء دي بس: <b className="text-[#141414]">{matchBrief.districts.join('، ')}</b>
                </p>
              )}
              {matchBrief && matchBrief.districts.length === 0 && (
                <p className="text-[11px] font-bold text-[#7A5E12] bg-[#FFF8E6] border border-[#EBD9A6] rounded-xl px-3 py-2 leading-relaxed">
                  محددش أحياء في المكالمة — فبنعرض كل الأحياء. حدّدها من «عدّل الطلب كله».
                </p>
              )}

              {/* Grid of Pill Buttons (Exact layout from Screenshot 1) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {matchedProperties.map((prop) => (
                  <button
                    key={prop.code}
                    onClick={() => scrollToProperty(prop.code)}
                    className={`bg-white hover:bg-stone-50 border rounded-2xl px-3 py-2 text-right flex items-center justify-between gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98 ${
                      highlightedPropCode === prop.code
                        ? 'border-[#0E7A5A] ring-2 ring-[#0E7A5A]/30 bg-[#E6F7ED]/30'
                        : 'border-[#E2DFD7] hover:border-[#0E7A5A]'
                    }`}
                  >
                    <span className="font-mono font-bold text-xs text-[#0E7A5A]">
                      #{prop.code}
                    </span>
                    <span className="text-[11px] font-medium text-stone-600 truncate">
                      • {prop.neighborhood}
                    </span>
                  </button>
                ))}
              </div>

              {/* برّه الأحياء اللي طلبها — تحت عنوان واضح، مش مخلوطة */}
              {outDistrictProps.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="bg-[#FFF8E6] border border-[#EBD9A6] rounded-xl px-3 py-2">
                    <p className="text-[11px] font-extrabold text-[#7A5E12]">
                      برّه الأحياء اللي طلبها ({outDistrictProps.length})
                    </p>
                    <p className="text-[11px] text-[#7A5E12]/85 leading-relaxed">
                      دول مطابقين في السعر والغرف بس في أحياء مقالش عليها. اسأله الأول قبل ما تبعتهم.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {outDistrictProps.map((prop) => (
                      <button
                        key={`out-${prop.id}`}
                        onClick={() => scrollToProperty(prop.code)}
                        className="bg-[#FFFCF5] border border-[#EBD9A6] rounded-2xl px-3 py-2 text-right flex items-center justify-between gap-1.5 cursor-pointer"
                      >
                        <span className="font-mono font-bold text-xs text-[#7A5E12]">#{prop.code}</span>
                        <span className="text-[11px] font-bold text-[#9E7A26] truncate">• {prop.neighborhood}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* من المطابقة للعرض المخصوص مباشرة — نفس الشقق، مفيش اختيار من الأول */}
            {selectedMatchingLead && showResale && matchedProperties.length > 0 && (
              <div className="bg-[#141414] text-white rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-sm">ابعتله عرض مخصوص</p>
                  <p className="text-[11px] text-[#CFCBC2]">
                    {offerPicks.length ? `معلّم على ${offerPicks.length} شقة` : 'علّم على اللي عاجبك، أو ابعت أحسن الاقتراحات على طول'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {offerPicks.length > 0 && (
                    <button type="button" onClick={() => setOfferPicks([])} className="text-[11px] font-bold text-[#CFCBC2] cursor-pointer">امسح</button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOfferLead(selectedMatchingLead)}
                    className="px-4 py-2.5 rounded-xl bg-[#D9B864] text-[#141414] font-bold text-xs cursor-pointer"
                  >
                    {offerPicks.length ? `ابني العرض بـ ${offerPicks.length}` : 'ابني العرض'}
                  </button>
                </div>
              </div>
            )}

            {/* Matched Properties Cards List (Exact layout from Screenshot 1) */}
            <div className={`space-y-3 sm:space-y-3.5 pt-1 ${showResale ? '' : 'hidden'}`}>
              {matchedProperties.map((prop) => (
                <div
                  key={prop.id}
                  id={`matched-prop-${prop.code}`}
                  className={`bg-white border rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xs space-y-3 transition-all ${
                    highlightedPropCode === prop.code
                      ? 'border-[#0E7A5A] ring-2 ring-[#0E7A5A]/30 bg-[#FAF9F5]'
                      : 'border-[#ECE8DF]'
                  }`}
                >
                  {/* Top info flex */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left Details in RTL */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="checkbox"
                          aria-label={`علّم على ${prop.code} للعرض المخصوص`}
                          checked={offerPicks.includes(prop.id)}
                          onChange={() => togglePick(prop.id)}
                          className="accent-[#0E7A5A] w-4 h-4 cursor-pointer shrink-0"
                        />
                        <span className="font-mono font-bold text-xs text-[#0E7A5A] bg-[#E6F7ED] px-2.5 py-0.5 rounded-lg border border-[#B3E8C8]">
                          #{prop.code}
                        </span>
                        <span className="text-[11px] font-bold text-stone-600 bg-[#F6F4EF] px-2.5 py-0.5 rounded-lg border border-[#ECE8DF]">
                          {prop.neighborhood}
                        </span>
                        <span className="text-[11px] font-bold text-stone-600 bg-[#F6F4EF] px-2.5 py-0.5 rounded-lg border border-[#ECE8DF]">
                          {prop.area} م²
                        </span>
                        {prop.bedrooms && (
                          <span className="text-[11px] font-bold text-stone-600 bg-[#F6F4EF] px-2.5 py-0.5 rounded-lg border border-[#ECE8DF]">
                            {prop.bedrooms} غرف
                          </span>
                        )}
                      </div>

                      {/* Property Title */}
                      <h4 className="font-readex font-bold text-xs sm:text-sm text-[#141414] line-clamp-1 pt-0.5">
                        {prop.title}
                      </h4>

                      {/* Price */}
                      <div className="text-xs sm:text-sm font-bold text-[#0E7A5A] font-ibm">
                        {formatPrice(prop.price)}
                      </div>
                    </div>

                    {/* Right Property Image Thumbnail in RTL */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-[#ECE8DF]">
                      <img
                        loading="lazy" decoding="async" src={thumbUrl(prop.images?.[0], 400) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* 3 Action Buttons Row (WhatsApp, Ad, Preview) */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#ECE8DF]/70">
                    {/* 1. WhatsApp Button (Green) */}
                    <a
                      href={getLeadWhatsAppLink(prop, selectedMatchingLead)}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 sm:py-2.5 px-2.5 bg-[#1E7E48] hover:bg-[#18683B] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                    >
                      <MessageCircle size={14} />
                      <span>واتساب</span>
                    </a>

                    {/* 2. Ad Button (Amber/Orange) */}
                    <button
                      type="button"
                      onClick={() => setAdShareProp(prop)}
                      className="py-2 sm:py-2.5 px-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                    >
                      <Share2 size={14} />
                      <span>إعلان</span>
                    </button>

                    {/* 3. Preview Button (Light Gray/White) */}
                    <button
                      type="button"
                      onClick={() => setPreviewProperty(prop)}
                      className="py-2 sm:py-2.5 px-2.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-[#ECE8DF] transition-all cursor-pointer active:scale-98"
                    >
                      <Eye size={14} />
                      <span>معاينة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* ========================================================= */}




        {/* ========================================================= */}
        {/* TAB 5: LEADERBOARD */}
        {/* ========================================================= */}
        {activeTab === 'daily' && (
          <div className="pt-1">
            {isAdmin ? (
              <DailyAdminBoard agents={agents.filter((a) => a.id !== OWNER_DESK.id)} leads={leads.filter((l) => l.assignedAgentId !== OWNER_DESK.id)} viewingRequests={viewingRequests} adminName={actorName} />
            ) : (
              <DailyTab
                properties={properties} leads={leads} currentAgent={currentSalesAgent}
                viewingRequests={viewingRequests} onAddLead={onAddLead}
                onGo={(t) => setActiveTab(t)}
              />
            )}
          </div>
        )}

        {ownerDesk && dueNotes.length > 0 && activeTab !== 'notebook' && (
          <button onClick={() => setActiveTab('notebook')} className="mx-4 sm:mx-5 mt-3 w-[calc(100%-2rem)] sm:w-[calc(100%-2.5rem)] text-right bg-[#FBEDEA] border border-[#E9B8AE] rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#9A2E1F]">⏰ {dueNotes.length === 1 ? `فكّرتني: ${dueNotes[0].name || dueNotes[0].text.slice(0, 40)}` : `${dueNotes.length} حاجات في دفترك جه ميعادها`}</span>
            <span className="text-xs font-bold text-[#9A2E1F] shrink-0">افتح ←</span>
          </button>
        )}

        {activeTab === 'notebook' && ownerDesk && (
          <div className="p-4 sm:p-5">
            <Notebook
              byName={actorName}
              onAddLead={onAddLead}
              onOpenLead={(id) => { const l = leads.find((x) => x.id === id); if (l) setSelectedLeadForDetails(l); }}
            />
          </div>
        )}

        {activeTab === 'content' && (
          <div className="p-4 sm:p-5">
            <ContentTab properties={properties} agents={agents.filter((a) => a.id !== OWNER_DESK.id)} currentAgent={currentAgent} isAdmin={isAdmin} />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="p-4 sm:p-5">
            <LeaderboardTab agents={agents} leads={leads} isAdmin={isAdmin} currentAgentId={currentSalesAgent?.id} />
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* QUICK STATUS CHANGER DARK BOTTOM SHEET / MODAL */}
      {/* (Exact match with Screenshot 2) */}
      {/* ========================================================= */}
      {leadToChangeStatus && (
        <div 
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-ibm"
          dir="rtl"
          onClick={() => setLeadToChangeStatus(null)}
        >
          <div 
            className="relative w-full sm:max-w-md max-h-[88dvh] overflow-y-auto overscroll-contain bg-[#22252A] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-5 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h4 className="font-readex font-bold text-sm sm:text-base text-white">
                  نقل مرحلة: {leadToChangeStatus.name}
                </h4>
                <p className="text-[11px] text-stone-400">
                  حدد المرحلة لنقل العميل وتحديث مسار المتابعة فوراً
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadToChangeStatus(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* List of 9 stages matching Screenshot 2 */}
            <div className="space-y-2 max-h-[65vh] overflow-y-auto py-1">
              {CRM_PIPELINE_STAGES.map((stage) => {
                const isCurrent = leadToChangeStatus.status === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setMoveTarget(stage.id)}
 className={`w-full p-3 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer ${moveTarget === stage.id ? 'ring-2 ring-[#D9B864] ' : ''}${
                      isCurrent 
                        ? 'bg-[#1E3A5F] text-white font-bold border border-sky-400/50 shadow-md' 
                        : 'bg-[#191B1F] hover:bg-[#2A2E35] text-stone-200 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                      <span className="text-xs sm:text-sm font-readex font-medium">
                        {stage.pickerLabel}
                      </span>
                    </div>

                    {/* Radio circle */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isCurrent ? 'border-sky-400 bg-sky-500' : 'border-stone-600'
                    }`}>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* كومنت إجباري قبل النقل */}
            {moveTarget && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <textarea value={moveComment} onChange={(e) => setMoveComment(e.target.value)} rows={2} autoFocus
                  placeholder="اكتب اللي حصل مع العميل (إجباري)" className="w-full rounded-xl bg-[#191B1F] border border-white/10 p-3 text-sm text-white" />
                {moveTarget !== 'closed' && moveTarget !== 'lost' && (
                  <div className="rounded-2xl bg-white p-3 text-[#141414]"><WhenPicker value={moveNext} onChange={setMoveNext} label="ميعاد المتابعة الجاية (إجباري)" /></div>
                )}
                <button type="button" disabled={!moveComment.trim() || (moveTarget !== 'closed' && moveTarget !== 'lost' && !moveNext)} onClick={() => handleMoveStatus(leadToChangeStatus, moveTarget, moveComment.trim(), moveNext)}
                  className="w-full py-3 rounded-xl bg-[#D9B864] text-[#141414] font-bold disabled:opacity-40">
                  نقل إلى {CRM_PIPELINE_STAGES.find((x) => x.id === moveTarget)?.label}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD NEW LEAD MODAL */}
      {/* ========================================================= */}
      {toast && (
        <div className="fixed bottom-5 inset-x-0 z-[120] flex justify-center px-4 pointer-events-none">
          <p className="bg-[#141414] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">{toast}</p>
        </div>
      )}


      {onAddLeadsBulk && (
        <CampaignLeadsModal
          isOpen={isCampaignOpen}
          onClose={() => setIsCampaignOpen(false)}
          agents={agents}
          existingLeads={leads}
          distributorName={currentAgent?.name || 'الإدارة'}
          onDistribute={onAddLeadsBulk}
        />
      )}

      {requestLead && (
        <RequestForm
          lead={requestLead}
          agentName={agents.find((a) => a.id === requestLead.assignedAgentId)?.name || actorName}
          properties={properties}
          onUpdateLead={onUpdateLead}
          onClose={() => setRequestLead(null)}
          onSaved={() => showToast('اتسجّل الطلب — أول شقة قريبة هتوصلك')}
        />
      )}

      {isAddLeadOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full text-right space-y-4 shadow-2xl border border-[#ECE8DF] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ECE8DF] pb-3">
              <h3 className="text-base font-bold text-[#141414] font-readex">إضافة عميل جديد لمسار المتابعة</h3>
              <button
                type="button"
                onClick={() => { clearDraft('new_lead'); setNewLeadForm(EMPTY_LEAD_FORM); setIsAddLeadOpen(false); }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewLead} className="space-y-3 text-xs">
              {/* نوع الليد — اللون بيتبع الاختيار ده، مش بيتخمّن */}
              <div>
                <label className="text-[#141414] block mb-1 font-bold">العميل ده جاي منين؟</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['personal', 'بيرسونال ليد', 'أنا اللي جبته — كارت أبيض'],
                    ['fresh', 'ليد فريش', 'نازل من الإدارة دلوقتي'],
                    ['old_campaign', 'كامبين قديم', 'من كامبين قديم'],
                  ] as const)
                    /* السيلز مش بيوزّع على نفسه ليدات إدارة */
                    .filter(([k]) => isAdmin || k === 'personal')
                    .map(([k, label, hint]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setNewLeadForm({ ...newLeadForm, leadKind: k })}
                        title={hint}
                        className={`px-3 py-2 rounded-xl font-bold border cursor-pointer transition ${
                          newLeadForm.leadKind === k
                            ? 'bg-[#141414] text-white border-[#141414]'
                            : 'bg-white text-[#141414] border-[#E4DFD4]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
                <p className="text-[11px] text-[#8C877D] mt-1 leading-relaxed">
                  {newLeadForm.leadKind === 'personal'
                    ? 'العميل ده بتاعك إنت — الكارت هيفضل أبيض عادي.'
                    : newLeadForm.leadKind === 'fresh'
                    ? 'الكارت هيبقى برتقالي عند السيلز لحد ما يكلّمه.'
                    : 'الكارت هيبقى رمادي غامق عند السيلز لحد ما يكلّمه.'}
                </p>
              </div>

              <div>
                <label className="text-[#141414] block mb-1 font-bold">اسم العميل:</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  placeholder="مثال: أحمد سمير"
                />
              </div>

              <div>
                <label className="text-[#141414] block mb-1 font-bold">رقم الهاتف / الواتساب:</label>
                <input
                  type="tel"
                  required
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26] dir-ltr text-right"
                  placeholder="010XXXXXXXX"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { clearDraft('new_lead'); setNewLeadForm(EMPTY_LEAD_FORM); setIsAddLeadOpen(false); }}
                  className="px-4 py-2.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  احفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* «إنت موجود؟» — للسيلز بس */}
      {!isAdmin && currentSalesAgent && <PresencePrompt agentId={currentSalesAgent.id} agentName={currentSalesAgent.name} />}

      {counterOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={() => setCounterOpen(null)}>
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between">
              <p className="font-bold text-sm">
                {counterOpen === 'new' ? `ريكويست جديد النهارده · ${todayNewLeads}` : `${viewingsLabel} · ${todayViewings}`}
              </p>
              <button onClick={() => setCounterOpen(null)} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-2">
              {counterOpen === 'new' && (todayNewRows.length ? todayNewRows.map((l) => (
                <button key={l.id} onClick={() => { setCounterOpen(null); setSelectedLeadForDetails(l); }} className="w-full text-right border border-[#ECE8DF] rounded-xl p-3 hover:bg-[#FBF8F1] space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{l.name || 'من غير اسم'}</span>
                    <span className="text-[11px] text-[#8C877D]">{new Date(l.createdAt || l.lastContactDate || 0).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-[#6B665C] font-mono" dir="ltr">{l.phone}</p>
                  <p className="text-[11px] text-[#8C877D]">
                    {[CRM_PIPELINE_STAGES.find((c) => c.id === l.status)?.label, ({ facebook_group: 'جروب فيسبوك', website_whatsapp: 'واتساب الموقع', cold_call: 'مكالمة باردة', referral: 'ترشيح', direct: 'مباشر', campaign: 'حملة' } as Record<string, string>)[l.source] || '', (isAdmin || isLead) && l.assignedAgentName ? `مع ${l.assignedAgentName}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </button>
              )) : <p className="text-xs text-[#8C877D] bg-[#F6F4EF] rounded-xl p-3">مفيش عملاء جداد اتسجّلوا النهارده.</p>)}

              {counterOpen === 'viewings' && (todayViewingRows.length ? todayViewingRows.map((r) => (
                <button key={r.lead.id} onClick={() => { setCounterOpen(null); setSelectedLeadForDetails(r.lead); }} className="w-full text-right border border-[#ECE8DF] rounded-xl p-3 hover:bg-[#FBF8F1] space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{r.lead.name || 'من غير اسم'}</span>
                    <span className="text-[11px] text-[#8C877D]">{new Date(r.at).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-[#6B665C] font-mono" dir="ltr">{r.lead.phone}</p>
                  {r.comment && <p className="text-xs text-[#3d3a35]">«{r.comment}»</p>}
                  <p className="text-[11px] text-[#8C877D]">{[r.by ? `سجّلها ${r.by}` : '', (isAdmin || isLead) && r.lead.assignedAgentName ? `العميل مع ${r.lead.assignedAgentName}` : ''].filter(Boolean).join(' · ')}</p>
                </button>
              )) : <p className="text-xs text-[#8C877D] bg-[#F6F4EF] rounded-xl p-3">مفيش معاينات اتسجّلت النهارده.</p>)}
            </div>
          </div>
        </div>
      )}

      {actionsLogOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={() => setActionsLogOpen(false)}>
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between">
              <p className="font-bold text-sm">سجل الأكشن اليومي{viewAgentId !== 'all' ? ` · عملاء ${agents.find((a) => a.id === viewAgentId)?.name || ''}` : ''}</p>
              <button onClick={() => setActionsLogOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
            </div>
            <div className="p-4">
              <ActionsLog
                leads={scopedLeads}
                onOpenLead={(id) => { const l = leads.find((x) => x.id === id); if (l) { setActionsLogOpen(false); setSelectedLeadForDetails(l); } }}
              />
            </div>
          </div>
        </div>
      )}

      {adShareProp && (
        <UnitAdPopup
          mode="share"
          unit={{ code: adShareProp.code, kind: 'resale', title: `${adShareProp.neighborhood} · ${adShareProp.area}م² · ${adShareProp.bedrooms} غرف`, image: adShareProp.images?.[0], prop: adShareProp }}
          agentId={currentSalesAgent?.id || ''} agentName={currentSalesAgent?.name || 'السبع للعقارات'} agentPhone={currentSalesAgent?.phone}
          onClose={() => setAdShareProp(null)}
        />
      )}

      {/* LEAD DETAILS FULL VIEW MODAL */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          isOpen={Boolean(selectedLeadForDetails)}
          onClose={() => setSelectedLeadForDetails(null)}
          lead={selectedLeadForDetails}
          agents={agents}
          properties={properties}
          isAdmin={isAdmin}
          currentUserName={currentAgent?.name || (isAdmin ? 'الإدارة' : 'الفريق')}
          currentUserId={currentAgent?.id}
          onUpdateLead={(updated) => {
            onUpdateLead(updated);
            setSelectedLeadForDetails(updated);
          }}
          onOpenAffiliateModal={onOpenAffiliateModal ? (prop) => {
            setSelectedLeadForDetails(null);
            onOpenAffiliateModal(prop);
          } : undefined}
        />
      )}

      {/* معاينة الشقة: كل الصور والفيديو والتفاصيل ومقارنة السعر بالحي */}
      {previewProperty && (
        <UnitPreview
          property={previewProperty}
          properties={properties}
          onClose={() => setPreviewProperty(null)}
          onAd={() => { setAdShareProp(previewProperty); setPreviewProperty(null); }}
        />
      )}

      {/* SPIN WHEEL MODAL */}
      {celebrationDealData && (
        <SpinWheelModal
          isOpen={spinModalOpen}
          onClose={() => {
            setSpinModalOpen(false);
            setCelebrationDealData(null);
          }}
          agent={currentAgent}
          dealValue={celebrationDealData.value}
          commission={celebrationDealData.commission}
          onPrizeWon={(prize) => {
            // updated prize
          }}
        />
      )}

      {/* FOLLOW-UP NOTIFICATIONS MODAL */}
      <FollowUpNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        leads={scopedLeads}
        agents={agents}
        currentAgent={currentAgent}
        onUpdateLead={onUpdateLead}
        onSelectLead={(lead) => {
          setSelectedLeadForDetails(lead);
          setIsNotificationsOpen(false);
        }}
      />

      {offerLead && (
        <OfferBuilderModal isOpen={!!offerLead} lead={offerLead} properties={properties} preselectedIds={offerPicks}
          agentId={currentAgent?.id || ''} agentName={currentAgent?.name || ''} agentPhone={currentAgent?.phone}
          onClose={() => setOfferLead(null)}
          onSent={(u) => onUpdateLead(u)} />
      )}
    </div>
  );
};
