import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { CampaignLeadsModal } from './crm/CampaignLeadsModal';
import { saveDraft, loadDraft, clearDraft } from '../utils/uiSession';
import { LionLogo } from './LionLogo';
import { formatPrice, formatNumber, generateCallLink, generateWhatsAppLink, waLink } from '../utils/helpers';
import { SpinWheelModal } from './SpinWheelModal';
import { LeadDetailsModal } from './LeadDetailsModal';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { WhenPicker, WhenValue, BudgetRange } from './common/WhenPicker';
import { ContentTab } from './sales/ContentTab';
import { LeaderboardTab } from './sales/LeaderboardTab';
import { matchProperties, briefLine, briefGaps, readBrief, payModeOf, resaleFits, projectsFit, resaleCeiling, PayMode } from '../services/clientBrief';
import { toggleValue } from '../utils/multiFilter';
import { toneStyle, viewingUpdateText, markViewingSeen } from '../utils/leadTone';
import { humanDuration, followUpBadge } from '../utils/followUpAlerts';
import { QuestTemplate, DEFAULT_QUESTS, subscribeQuestTemplates, buildAgentQuests, bumpQuest } from '../services/questService';
import { AgentDayPanel } from './crm/AgentDayPanel';
import { OwnerLinkCard } from './crm/OwnerLinkCard';
import { QuickBriefRow } from './crm/QuickBriefRow';
import { ProjectMatchPanel } from './crm/ProjectMatchPanel';
import { QuestEditor } from './crm/QuestEditor';
import { QuestLogSheet } from './crm/QuestLogSheet';
import { DayLogSummary } from './crm/DayLogSummary';
import { QuestLog, subscribeDayLogs, dayKey, summarizeCalls, summarizeAds, CALL_OUTCOMES } from '../services/questLogService';
import { DiscoveryCallModal } from './sales/DiscoveryCallModal';
import { OfferBuilderModal } from './sales/OfferBuilderModal';
import { FollowUpNotificationsModal } from './FollowUpNotificationsModal';
import { INITIAL_DAILY_QUESTS } from '../data/crmData';
import { DailyQuest } from '../types';
import { subscribeCrmBoard, saveCrmBoard, CrmBoard, CrmBanner, deleteLeadFromDb } from '../services/crmBoardService';
import { subscribeAllUnitViewings } from '../services/portalService';

interface SalesCrmModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  agents: SalesAgent[];
  leads: Lead[];
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
  isOpen,
  onClose,
  properties,
  agents,
  leads,
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
  onLogout
}) => {
  // Navigation Tabs matching sidebar items (Properties tab removed)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'followups' | 'matching' | 'quests' | 'leaderboard'>('pipeline');
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
    preferredNeighborhood: 'الحي الثاني',
    districts: [] as string[],
    budgetMin: 2500000,
    budgetMax: 3500000,
    preferredBedrooms: 3,
    preferredFinishing: 'finished' as 'finished' | 'semi_finished' | 'all',
    interestedPropertyCode: '',
    notes: '',
    followUpScheduledAt: 'اليوم بعد ساعتين',
    followUpUrgency: 'urgent' as 'urgent' | 'today' | 'upcoming',
    assignedAgentId: '',
    nextAt: null as WhenValue | null,
  };

  const [newLeadForm, setNewLeadForm] = useState(() => loadDraft('new_lead', EMPTY_LEAD_FORM));

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

     دلوقتي: مفيش سيلز داخل = مفيش سيلز. الأدمن إدارة، مش سيلز. */
  const currentSalesAgent = useMemo(() => {
    if (currentAgentId) {
      const found = agents.find((a) => a.id === currentAgentId);
      if (found) return found;
    }
    return agents.find((a) => a.isCurrentSession) || undefined;
  }, [agents, currentAgentId]);

  const currentAgent = currentSalesAgent;

  // من بشوف شغله؟ (الأدمن والتيم ليدر بيختاروا)
  const [viewAgentId, setViewAgentId] = useState<string>('all');
  const myTeam = useMemo(() => agents.filter((a) => (a as any).teamLeadId === currentSalesAgent?.id), [agents, currentSalesAgent]);
  const isLeadRole = currentSalesAgent?.role === 'team_leader' || currentSalesAgent?.role === 'sales_manager' || (currentSalesAgent as any)?.isTeamLead;
  const isLead = isLeadRole || myTeam.length > 0;
  const visibleAgents = useMemo(() => (isAdmin ? agents : isLead ? [currentSalesAgent!, ...myTeam].filter(Boolean) : [currentSalesAgent!].filter(Boolean)), [isAdmin, isLead, agents, myTeam, currentSalesAgent]);

  // Scoped Leads
  const scopedLeads = useMemo(() => {
    const ids = visibleAgents.map((a) => a.id);
    const base = isAdmin ? leads : leads.filter((l) => ids.includes(l.assignedAgentId || '') || l.assignedAgentName === currentSalesAgent?.name);
    if (viewAgentId === 'all') return base;
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
  const activePay: PayMode = matchPay || (matchBrief ? payModeOf(matchBrief) : 'cash');
  const showResale = resaleFits(activePay);
  const showProjects = projectsFit(activePay);

  // نفس المحرك اللي بيبني العرض المخصوص — فالشاشتين مستحيل يختلفوا
  const matchedProperties = useMemo(() => {
    if (!selectedMatchingLead) return [];
    return matchProperties(selectedMatchingLead, properties, {
      tolerance: matchTolerance,
      strictDistrict: matchStrictHood,
      payMode: activePay,
    });
  }, [selectedMatchingLead, properties, matchTolerance, matchStrictHood, activePay]);

  // الشقق اللي السيلز معلّم عليها عشان يبعتها عرض مخصوص
  // الليدات اللي فيها طلب تعديل ميزانية مستني
  const budgetRequests = useMemo(
    () => leads.filter((l) => l.budgetChangeRequest?.status === 'pending'),
    [leads],
  );

  const [questTemplates, setQuestTemplates] = useState<QuestTemplate[]>(DEFAULT_QUESTS);
  useEffect(() => subscribeQuestTemplates(setQuestTemplates), []);

  /* سجل مهام النهارده لكل الفريق — منه بنعرف المكالمات راحت فين والإعلانات اتنشرت على إيه */
  const [dayLogs, setDayLogs] = useState<QuestLog[]>([]);
  useEffect(() => subscribeDayLogs(dayKey(), setDayLogs), []);
  const [logQuest, setLogQuest] = useState<DailyQuest | null>(null);
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
    await deleteLeadFromDb(lead.id).catch(() => {});
    onDeleteLead?.(lead.id);
  };
  const [discoveryLead, setDiscoveryLead] = useState<Lead | null>(null);
  const [offerLead, setOfferLead] = useState<Lead | null>(null);
  const [moveTarget, setMoveTarget] = useState<LeadStatus | null>(null);
  const [board, setBoard] = useState<CrmBoard>({});
  const [editBoard, setEditBoard] = useState<null | 'banner' | 'quests'>(null);
  const [draftBoard, setDraftBoard] = useState<CrmBoard>({});
  useEffect(() => subscribeCrmBoard(setBoard), []);
  const [myViewings, setMyViewings] = useState<any[]>([]);
  useEffect(() => subscribeAllUnitViewings(setMyViewings), []);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const viewingAgentIds = viewAgentId !== 'all' ? [viewAgentId] : visibleAgents.map((a) => a.id);
  const todayViewings = myViewings.filter((v) => viewingAgentIds.includes(v.salesAgentId || '') && v.createdAt >= startOfToday.getTime()).length;
  const viewingsLabel = viewAgentId !== 'all'
    ? `معاينات ${agents.find((a) => a.id === viewAgentId)?.name || ''} النهارده`
    : (isAdmin || isLead) ? 'معاينات الفريق النهارده' : 'معايناتك النهارده';
  const todayNewLeads = scopedLeads.filter((l) => {
    const t = new Date(l.createdAt || l.lastContactDate || 0).getTime();
    return t >= startOfToday.getTime();
  }).length;
  const todayDone = scopedLeads.filter((l) => (l.activity || []).some((a: any) => a.at >= startOfToday.getTime())).length;
  /* المهام جاية من إعدادات الأدمن، والعدّادات بتبدأ من الصفر كل يوم */
  const questTemplate: DailyQuest[] = questTemplates.filter((t) => t.active !== false).map((t) => ({
    id: t.id, title: t.title, description: t.description, xpReward: t.xpReward,
    targetCount: t.targetCount, currentCount: 0, isCompleted: false, category: t.category,
  }));
  /* الإدارة لما تدوس على حد في قايمة الفريق، المفروض تشوف نقطه هو ومهامه هو */
  const shownAgent = (viewAgentId !== 'all' ? agents.find((a) => a.id === viewAgentId) : null) || currentAgent;
  const viewingSomeoneElse = !!shownAgent && shownAgent.id !== currentAgent?.id;
  const agentQuests: DailyQuest[] = shownAgent ? buildAgentQuests(questTemplates, shownAgent) : [];
  const banner: CrmBanner = board.banner || { active: true, title: 'طلب عاجل من الإدارة: عميل كاش جاد', subtitle: 'دور أرضي بحديقة أو دور أول · الحي الثاني أو الثالث · حتى 4 مليون', bonus: 'بونص 1,500 ج.م' };
  const deleteRequests = isAdmin && canEdit ? leads.filter((l: any) => l.deleteRequest && !l.deleteRequest.resolved) : [];
  const [moveComment, setMoveComment] = useState('');
  const [moveNext, setMoveNext] = useState<WhenValue | null>(null);

  /* بعد الحفظ رايح فين: مكالمة الاكتشاف ولا المطابقة على طول.
     لازم يفضل فوق الـ return اللي تحت — أي hook تحته بيكسر الصفحة. */
  const [afterAdd, setAfterAdd] = useState<'discovery' | 'matching'>('discovery');

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
      activity: [{ at: Date.now(), by: currentAgent?.name || 'الفريق', outcome: `نقل إلى: ${stageLabel}`, comment, nextAt: next?.at }, ...(lead.activity || [])].slice(0, 80),
      nextActionAt: newStatus === 'closed' || newStatus === 'lost' ? null : next?.at ?? null,
      followUpScheduledAt: next?.label || lead.followUpScheduledAt,
      followUpNote: comment,
      followUpStatus: newStatus === 'closed' || newStatus === 'lost' ? 'completed' : 'pending',
    };
    setMoveTarget(null); setMoveComment(''); setMoveNext(null);

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
      preferredNeighborhood: newLeadForm.districts?.[0] || newLeadForm.preferredNeighborhood,
      /* اللي السيلز كتبه هنا بيتسجّل كأول جزء من مكالمة الاكتشاف،
         فالمطابقة بتشتغل على طول والمكالمة بتفتح وهي نصّها متملّي. */
      discovery: {
        districts: newLeadForm.districts?.length ? newLeadForm.districts : (newLeadForm.preferredNeighborhood ? [newLeadForm.preferredNeighborhood] : []),
        rooms: String(newLeadForm.preferredBedrooms || ''),
        finishing: newLeadForm.preferredFinishing === 'finished' ? 'متشطبة' : newLeadForm.preferredFinishing === 'semi_finished' ? 'نص تشطيب' : '',
        by: currentAgent?.name || 'الفريق',
      },
      budgetMin: Number(newLeadForm.budgetMin) || 0,
      budgetMax: Number(newLeadForm.budgetMax) || 0,
      preferredBedrooms: Number(newLeadForm.preferredBedrooms) || 3,
      preferredFinishing: newLeadForm.preferredFinishing,
      interestedPropertyCode: newLeadForm.interestedPropertyCode.trim() || undefined,
      notes: newLeadForm.notes.trim() ? [newLeadForm.notes.trim()] : ['تم إضافة العميل للمتابعة'],
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      /* مين ضافه فعلاً — عشان الكارت يفرّق بين عميل السيلز جابه بنفسه
         وعميل الإدارة وزّعته عليه */
      addedByName: currentAgent?.name || (isAdmin ? 'الإدارة' : 'الفريق'),
      addedById: currentAgent?.id,
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
    if (newLead.source !== 'campaign') {
      if (afterAdd === 'matching') {
        setMatchingLeadId(newLead.id);
        setActiveTab('matching');
      } else {
        setTimeout(() => setDiscoveryLead(newLead), 220);
      }
    }
    setNewLeadForm({
      name: '',
      phone: '',
      source: 'facebook_group',
      preferredNeighborhood: 'الحي الثاني',
      districts: [] as string[],
      budgetMin: 2500000,
      budgetMax: 3500000,
      preferredBedrooms: 3,
      preferredFinishing: 'finished',
      interestedPropertyCode: '',
      notes: '',
      followUpScheduledAt: 'اليوم بعد ساعتين',
      followUpUrgency: 'urgent',
      assignedAgentId: '',
    });
  };

  // Quests Increment
  /* النقط بقت المكتوبة على المهمة، وبتتاخد مرة واحدة لما تكمل —
     مش ٥٠ نقطة ثابتة مع كل ضغطة زي الأول */
  const handleIncrementQuest = (questId: string) => {
    if (!currentAgent) return;
    onUpdateAgent(bumpQuest({ ...currentAgent, activeQuests: agentQuests }, questId));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F6F4EF] flex flex-col lg:flex-row font-ibm overflow-hidden" 
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
                {shownAgent ? `${(shownAgent.xp || 0).toLocaleString('en-US')} XP` : 'إدارة'}
              </span>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className={`p-3 space-y-1.5 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
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
                setActiveTab('quests');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quests'
                  ? 'bg-[#A07A26] text-white shadow-xs'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} />
                <span>تحديات اليوم والـ XP</span>
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
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
        
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
            { id: 'pipeline', label: 'مسار العملاء' },
            { id: 'followups', label: 'المتابعات' },
            { id: 'matching', label: 'المطابقة الذكية' },
            { id: 'quests', label: 'المهام والـ XP' },
            { id: 'content', label: 'المحتوى والإعلانات' },
            { id: 'leaderboard', label: 'المتصدرين' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#141414] text-white shadow-2xs'
                  : 'bg-white border border-[#ECE8DF] text-[#6B665C] hover:text-[#141414]'
              }`}
            >
              {tab.label}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-sm">متابعات الفريق</p>
                  {viewAgentId !== 'all' && (
                    <button
                      onClick={() => setViewAgentId('all')}
                      className="px-3 py-1.5 rounded-xl bg-[#141414] text-white text-[11px] font-bold active:scale-95 transition"
                    >
                      ✕ بتشوف {agents.find((a) => a.id === viewAgentId)?.name || ''} · رجوع لكل الفريق
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#8C877D]">دوس على أي حد عشان تشوف عملاءه ونقطه وإنجازه النهارده</p>

                {/* اللي إنت دايس عليه: نقطه هو ومهامه هو واللي عمله النهارده */}
                {viewAgentId !== 'all' && (() => {
                  const sel = agents.find((a) => a.id === viewAgentId);
                  return sel ? (
                    <AgentDayPanel
                      agent={sel}
                      leads={leads}
                      questTemplates={questTemplates}
                      dayLogs={dayLogs}
                      onClose={() => setViewAgentId('all')}
                    />
                  ) : null;
                })()}
                {visibleAgents.map((a) => {
                  const mine = leads.filter((l) => l.assignedAgentId === a.id);
                  const late = mine.filter((l) => l.nextActionAt && l.nextActionAt < Date.now() && l.followUpStatus !== 'completed').length;
                  const snoozes = mine.reduce((n, l: any) => n + (l.snoozeCount || 0), 0);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setViewAgentId(viewAgentId === a.id ? 'all' : a.id)}
                      aria-pressed={viewAgentId === a.id}
                      className={`w-full flex flex-wrap justify-between items-center gap-2 border-t border-[#F0ECE4] pt-2 px-2 -mx-2 rounded-xl text-right transition active:scale-[0.99] hover:bg-[#F6F4EF] ${viewAgentId === a.id ? 'bg-[#141414] text-white hover:bg-[#141414]' : viewAgentId !== 'all' ? 'opacity-50' : ''}`}
                    >
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        <ChevronLeft size={14} className={viewAgentId === a.id ? 'text-[#D9B864]' : 'text-[#A07A26]'} />
                        {a.name}
                      </span>
                      <span className="flex gap-2 text-[11px]">
                        <span className="px-2 py-1 rounded-lg bg-[#F6F4EF]">{mine.length} عميل</span>
                        <span className={`px-2 py-1 rounded-lg ${late ? 'bg-[#FBEDEA] text-[#C2412D] font-bold' : 'bg-[#EEF5F0] text-[#1E7A45]'}`}>{late} متأخرة</span>
                        <span className="px-2 py-1 rounded-lg bg-[#FBF8F1] text-[#6E5418]">{snoozes} تأجيل</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* عدّاد النهارده */}
            <div className="grid grid-cols-3 gap-2">
              {[['ريكويست جديد النهارده', todayNewLeads, '#1F4E9C'], ['أكشن اتسجّل النهارده', todayDone, '#141414'], [viewingsLabel, todayViewings, '#1E7A45']].map(([t, v, c]) => (
                <div key={t as string} className="rounded-2xl bg-white border border-[#ECE8DF] p-3 text-center">
                  <p className="text-2xl font-readex font-bold" style={{ color: c as string }}>{v as number}</p>
                  <p className="text-[11px] text-[#6B665C]">{t as string}</p>
                </div>
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
                <div className="flex gap-2"><button onClick={async () => { await saveCrmBoard({ banner: draftBoard.banner }); setEditBoard(null); }} className="flex-1 py-2.5 rounded-xl bg-[#141414] text-white text-sm font-bold">حفظ</button><button onClick={() => setEditBoard(null)} className="px-4 py-2.5 rounded-xl bg-[#F6F4EF] text-sm font-bold">إلغاء</button></div>
              </div>
            )}
            {isAdmin && editBoard !== 'banner' && (
              <button onClick={() => { setDraftBoard({ banner }); setEditBoard('banner'); }} className="self-start text-xs font-bold text-[#A07A26]">✎ تعديل الطلب العاجل</button>
            )}
            {banner.active !== false && (
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
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#9E7A26] font-bold text-[11px] sm:text-xs rounded-xl">
                  {banner.bonus}
                </span>
                <button
                  onClick={() => setActiveTab('matching')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#141414] hover:bg-black text-white font-readex font-bold text-[11px] sm:text-xs rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  شوف المطابقات
                </button>
              </div>
            </div>
            )}

            {/* Stage Selector Chips (All 9 Stages with Counters) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar shrink-0">
              <button
                onClick={() => setActiveMobileStageFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMobileStageFilter === 'all'
                    ? 'bg-[#141414] text-white shadow-2xs'
                    : 'bg-white border border-[#ECE8DF] text-[#6B665C]'
                }`}
              >
                <span>جميع المراحل</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                  {scopedLeads.length}
                </span>
              </button>

              {CRM_PIPELINE_STAGES.map((st) => {
                const count = stageCounts[st.id] || 0;
                const isSelected = activeMobileStageFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveMobileStageFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#A07A26] text-white shadow-2xs'
                        : 'bg-white border border-[#ECE8DF] text-[#6B665C] hover:border-stone-400'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-[#F6F4EF] text-[#141414]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* دليل الألوان — عشان محدش يقعد يخمّن اللون ده معناه إيه */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#6B665C] px-1">
              {([['#C2410C', 'ليد فريش'], ['#4A5568', 'كامبين قديم'], ['#1F5FB0', 'تحديث من سارة']] as const).map(([c, t]) => (
                <span key={c} className="text-white font-bold px-2.5 py-1 rounded-lg" style={{ background: c }}>
                  {t}
                </span>
              ))}
            </div>

            {/* Kanban Columns Board (Scrollable horizontal board with all 9 stages) */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar flex-1 items-start">
              {CRM_PIPELINE_STAGES
                .filter((st) => activeMobileStageFilter === 'all' || activeMobileStageFilter === st.id)
                .map((st) => {
                  const stageLeads = filteredLeads.filter((l) => l.status === st.id);

                  return (
                    <div 
                      key={st.id}
                      className="bg-[#EFECE5] rounded-3xl p-3.5 flex flex-col gap-3 min-h-[440px] shadow-2xs w-[82vw] sm:w-[310px] shrink-0 snap-center"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-2 pt-1 pb-0.5 border-b border-[#ECE8DF]/60">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${st.dotColor}`} />
                          <h4 className="font-readex font-bold text-xs text-[#141414]">
                            {st.label}
                          </h4>
                        </div>
                        <span className="w-6 h-6 rounded-full bg-white text-[#6B665C] text-xs font-bold flex items-center justify-center shadow-2xs font-mono">
                          {stageLeads.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[65vh]">
                        {stageLeads.length === 0 ? (
                          <div className="py-12 text-center text-xs text-[#8C877D] border border-dashed border-[#ECE8DF] rounded-2xl bg-white/40">
                            لا يوجد عملاء في هذه المرحلة
                          </div>
                        ) : (
                          stageLeads.map((lead, idx) => {
                          const tone = toneStyle(lead);
                          return (
                            <div 
                              key={lead.id}
                              className={`rounded-2xl p-3.5 shadow-2xs space-y-2.5 transition-all group ${tone.card}`}
                            >
                              {/* اللون معاه كلام دايماً — اللي مش بيفرّق الألوان يفهم برضه */}
                              {tone.tone !== 'none' && (
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${tone.chip}`}>
                                    {tone.label}
                                  </span>
                                  {tone.tone === 'viewing_update' && (
                                    <button
                                      onClick={() => onUpdateLead(markViewingSeen(lead))}
                                      className="text-[10px] font-extrabold bg-white text-[#1F5FB0] px-2 py-0.5 rounded-full cursor-pointer"
                                    >
                                      شفته
                                    </button>
                                  )}
                                  {tone.tone === 'old_campaign' && lead.campaignName && (
                                    <span className="text-[10px] text-white/80 font-bold truncate">{lead.campaignName}</span>
                                  )}

                                </div>
                              )}
                              {tone.tone === 'viewing_update' && (
                                <p className="text-[11px] font-bold text-white leading-relaxed">
                                  {viewingUpdateText(lead)}
                                </p>
                              )}
                              {/* Top row: Client Name & Follow-up urgency badge */}
                              <div className="flex items-center justify-between">
                                {/* الأولوية من الميعاد نفسه — مش من رقم قديم متخزّن */}
                                {(() => {
                                  const b = followUpBadge(lead.nextActionAt, lead.followUpStatus, lead.followUpScheduledAt || st.defaultBadge);
                                  if (b.tone === 'late') {
                                    return (
                                      <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-lg ${
                                        tone.solid ? 'bg-white text-[#9E2A1B]' : 'bg-[#9E2A1B] text-white'
                                      }`}>{b.text}</span>
                                    );
                                  }
                                  const color = tone.solid
                                    ? (b.tone === 'soon' ? 'text-white' : 'text-white/85')
                                    : (b.tone === 'soon' ? 'text-[#C2410C]' : b.tone === 'today' ? 'text-[#A07A26]' : 'text-[#6B665C]');
                                  return <span className={`font-bold text-xs ${color}`}>{b.text}</span>;
                                })()}
                                
                                <h5 
                                  onClick={() => setSelectedLeadForDetails(lead)}
                                  className={`font-readex font-bold text-xs truncate max-w-[130px] cursor-pointer ${tone.solid ? 'text-white' : 'text-[#141414] hover:text-[#A07A26]'}`}
                                >
                                  {lead.name}
                                </h5>
                              </div>

                              {/* Details text */}
                              <p 
                                onClick={() => setSelectedLeadForDetails(lead)}
                                className={`text-xs truncate cursor-pointer ${tone.inkSoft}`}
                              >
                                {lead.preferredBedrooms ? `${lead.preferredBedrooms} غرف · ` : ''}
                                {lead.preferredNeighborhood || 'الهضبة الوسطى'}
                              </p>

                              {/* Property Code & Budget */}
                              <div className={`flex items-center justify-between pt-1 border-t text-xs ${tone.divider}`}>
                                <span className={`font-mono text-xs ${tone.solid ? 'text-white/75' : 'text-[#8C877D]'}`}>
                                  {lead.interestedPropertyCode ? `#${lead.interestedPropertyCode}` : '—'}
                                </span>
                                <span className={`font-bold text-xs ${tone.ink}`}>
                                  {lead.budgetMax ? `${(lead.budgetMax / 1000000).toFixed(1)}M` : '—'}
                                </span>
                              </div>

                              {/* Field Viewing Report Badge (From Broker via Sarah Hanafy) */}
                              {lead.fieldViewingComment && (
                                <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between font-bold text-amber-950 text-[11px]">
                                    <span className="flex items-center gap-1">
                                      <Eye size={12} className="text-amber-700 shrink-0" />
                                      <span>كومنت المعاينة ({lead.fieldViewingBrokerName || 'البروكر'}):</span>
                                    </span>
                                    {lead.fieldViewingOutcome && (
                                      <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded font-black text-[9px]">
                                        {lead.fieldViewingOutcome === 'interested' ? 'مهتم' : lead.fieldViewingOutcome === 'made_offer' ? 'قدّم عرض' : lead.fieldViewingOutcome === 'not_suitable' ? 'غير مناسبة' : lead.fieldViewingOutcome}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-stone-900 line-clamp-2 text-[11px] font-semibold leading-relaxed">
                                    « {lead.fieldViewingComment} »
                                  </p>
                                  <div className="text-[10px] text-stone-500 flex items-center justify-between pt-0.5">
                                    <span>تنسيق: {lead.coordinatorName || 'سارة حنفي'}</span>
                                    {lead.fieldViewingRecordedAt && <span className="font-mono text-[9px]">{lead.fieldViewingRecordedAt}</span>}
                                  </div>
                                </div>
                              )}

                              {/* السيلز المسؤول */}
                              <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                                <span className="px-2 py-0.5 rounded-lg bg-[#F6F4EF] text-[#6B665C] font-bold truncate max-w-[60%]">
                                  {lead.assignedAgentName || 'غير مسند'}
                                </span>
                                {isAdmin && canEdit && (
                                  <button type="button" onClick={(e) => { e.stopPropagation(); adminDeleteLead(lead); }}
                                    className="px-2 py-0.5 rounded-lg text-[#C2412D] bg-[#FBEDEA] border border-[#E9B8AE] font-bold">حذف</button>
                                )}
                              </div>

                              {/* Bottom Action Bar: Quick Status Move & Communication */}
                              <div className="pt-2 border-t border-[#ECE8DF] flex items-center justify-between gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setLeadToChangeStatus(lead)}
                                  className="px-2.5 py-1 bg-[#F6F4EF] hover:bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="نقل مرحلة العميل (سريع)"
                                >
                                  <ArrowLeftRight size={12} />
                                  <span>نقل المرحلة</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <a
                                    href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً أستاذ ${lead.name}، بخصوص طلبك العقاري في الهضبة الوسطى`)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                    title="مراسلة واتساب"
                                  >
                                    <MessageCircle size={14} />
                                  </a>
                                  <a
                                    href={generateCallLink(lead.phone)}
                                    className="p-1.5 bg-[#F6F4EF] text-[#141414] hover:bg-[#ECE8DF] rounded-lg transition-colors cursor-pointer"
                                    title="اتصال هاتفياً"
                                  >
                                    <Phone size={14} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FOLLOW-UPS PATH (مسار المتابعة مع كافة الخانات) */}
        {/* ========================================================= */}
        {activeTab === 'followups' && (
          <div className="space-y-4 sm:space-y-5 flex-1 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#ECE8DF] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xs">
              <div>
                <h3 className="font-readex font-bold text-base sm:text-lg text-[#141414]">
                  مسار المتابعات اليومية (Follow-up Pipeline)
                </h3>
                <p className="text-xs text-[#6B665C]">
                  جدول المواعيد والاتصالات المستحقة لمستشاري المبيعات
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {(isAdmin || isLead) && (
                  <select value={viewAgentId} onChange={(e) => setViewAgentId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE8DF] text-xs font-bold text-[#141414]">
                    <option value="all">{isAdmin ? 'كل الفريق' : 'فريقي كله'}</option>
                    {visibleAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
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
              {scopedLeads
                .filter((lead) => lead.followUpStatus !== 'completed' && lead.status !== 'closed' && lead.status !== 'lost')
                .sort((a, b) => (a.nextActionAt || Infinity) - (b.nextActionAt || Infinity))
                .map((lead) => {
                const stageObj = CRM_PIPELINE_STAGES.find((s) => s.id === lead.status) || CRM_PIPELINE_STAGES[0];
                const tone = toneStyle(lead);
                return (
                  <div 
                    key={lead.id}
                    className={`rounded-2xl p-4 shadow-2xs space-y-3 transition-all ${tone.card}`}
                  >
                    {/* نفس ألوان البايبلاين بالظبط — الكارت الواحد بلون واحد في كل مكان */}
                    {tone.tone === 'viewing_update' && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${tone.chip}`}>
                          {tone.label} · {viewingUpdateText(lead)}
                        </span>
                        <button
                          onClick={() => onUpdateLead(markViewingSeen(lead))}
                          className="text-[10px] font-extrabold bg-white text-[#1F5FB0] px-2.5 py-0.5 rounded-full cursor-pointer"
                        >
                          شفته
                        </button>
                      </div>
                    )}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${tone.divider}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center font-readex text-sm ${tone.avatar}`}>
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-readex font-bold text-sm ${tone.ink}`}>{lead.name}</h4>
                            <span className={`font-mono text-xs dir-ltr ${tone.inkSoft}`}>{lead.phone}</span>
                            {(tone.tone === 'fresh' || tone.tone === 'old_campaign') && (
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${tone.chip}`}>
                                <Flame size={10} /> {tone.label}
                              </span>
                            )}
                          </div>
                          {lead.campaignName && (tone.tone === 'fresh' || tone.tone === 'old_campaign') && (
                            <p className="text-[11px] font-bold text-white/85">من كامبين: {lead.campaignName}</p>
                          )}
                          <p className={`text-xs ${tone.inkSoft}`}>
                            المستشار المسؤول: <strong className={tone.ink}>{lead.assignedAgentName || 'سارة حنفي'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Current Stage Button that opens quick stage switcher */}
                      <button
                        onClick={() => setLeadToChangeStatus(lead)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 self-start sm:self-auto cursor-pointer ${stageObj.bgTag} ${stageObj.badgeColor} border-current/20`}
                      >
                        <span>{stageObj.pickerLabel}</span>
                        <ChevronDown size={13} />
                      </button>
                    </div>
{!compactView && (<>
                    {/* Follow-up Fields Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F6F4EF] p-3 rounded-xl border border-[#ECE8DF]">
                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">موعد المتابعة:</span>
                        <span className="font-bold text-[#141414]">{lead.followUpScheduledAt || 'اليوم بعد ساعتين'}</span>
                      </div>

                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">الأولوية:</span>
                        {(() => {
                          const b = followUpBadge(lead.nextActionAt, lead.followUpStatus, '—');
                          if (b.tone === 'late') {
                            return <span className="font-extrabold text-white bg-[#9E2A1B] px-2 py-0.5 rounded-lg inline-block">{b.text}</span>;
                          }
                          if (b.tone === 'soon') return <span className="font-bold text-[#C2410C]">🟠 {b.text}</span>;
                          if (b.tone === 'today') return <span className="font-bold text-[#A07A26]">🟡 {b.text}</span>;
                          return <span className="font-bold text-[#6B665C]">{b.text}</span>;
                        })()}
                      </div>

                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">الحي والميزانية:</span>
                        <span className="font-bold text-[#141414]">
                          {lead.preferredNeighborhood || 'الهضبة الوسطى'} ({lead.budgetMax ? `${(lead.budgetMax / 1000000).toFixed(1)}M` : '—'})
                        </span>
                      </div>

                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">كود الشقة المهتم بها:</span>
                        <span className="font-mono font-bold text-[#A07A26]">
                          {lead.interestedPropertyCode ? `#${lead.interestedPropertyCode}` : 'طلب عام'}
                        </span>
                      </div>
                    </div>

                    {/* الطلب — بيتعدّل من هنا على طول، من غير ما تفتح شاشة تانية */}
                    <QuickBriefRow lead={lead} onUpdateLead={onUpdateLead} byName={currentAgent?.name || 'السيلز'} />

                    {/* Field Viewing Report Box in List View */}
                    {lead.fieldViewingComment && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950 flex-wrap gap-1">
                          <span className="flex items-center gap-1.5">
                            <Eye size={14} className="text-amber-700 shrink-0" />
                            <span>تقرير وكومنت المعاينة الميدانية من البروكر ({lead.fieldViewingBrokerName || 'الوسيط العقاري'}):</span>
                          </span>
                          {lead.fieldViewingOutcome && (
                            <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 text-xs rounded-lg font-black">
                              النتيجة: {lead.fieldViewingOutcome === 'interested' ? 'العميل مهتم وجاد للتفاوض' : lead.fieldViewingOutcome === 'made_offer' ? 'قدّم عرض سعر' : lead.fieldViewingOutcome === 'not_suitable' ? 'غير مناسبة' : lead.fieldViewingOutcome}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-900 leading-relaxed font-semibold bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                          « {lead.fieldViewingComment} »
                        </p>
                        <div className="text-[10px] text-stone-500 flex items-center justify-between pt-0.5">
                          <span>منسقة المعاينة: <strong className="text-stone-700">{lead.coordinatorName || 'سارة حنفي'}</strong></span>
                          {lead.fieldViewingRecordedAt && <span>توقيت التسجيل: {lead.fieldViewingRecordedAt}</span>}
                        </div>
                      </div>
                    )}

</>)}
                    {/* Notes & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className={`text-xs text-[#6B665C] truncate max-w-xl ${compactView ? 'hidden sm:block' : ''}`}>
                        📝 <strong className="text-[#141414]">آخر ملاحظة:</strong> {lead.followUpNote || lead.notes?.[0] || 'لا توجد ملاحظات مسجلة بعد'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 justify-end self-stretch sm:self-auto">
                        <a
                          href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً أستاذ ${lead.name}، بخصوص الشقق المعروضة بالهضبة الوسطى`)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <MessageCircle size={14} />
                          <span>واتساب</span>
                        </a>

                        <a
                          href={generateCallLink(lead.phone)}
                          className="px-3 py-1.5 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Phone size={14} />
                          <span>اتصال</span>
                        </a>

                        <button
                          onClick={() => {
                            // العرض بيتبني من المطابقة — بيختار الشقق الأول وبعدين يبعت،
                            // بدل ما العرض يفتح على طول باقتراح مش شايفه
                            if (briefGaps(lead).length > 0) { setDiscoveryLead(lead); return; }
                            setMatchingLeadId(lead.id);
                            setActiveTab('matching');
                          }}
                          className="px-3 py-1.5 bg-[#A07A26] text-white text-xs font-bold rounded-xl whitespace-nowrap shrink-0"
                        >
                          {briefGaps(lead).length === 0 ? 'ابني عرض من المطابقة' : 'كمّل طلبه'}
                        </button>
                        {/* الطلب بيتفتح للتعديل دايماً — ناقص أو كامل.
                            العميل بيغيّر رأيه، والمسار لازم يغيّر معاه. */}
                        <button
                          onClick={() => setDiscoveryLead(lead)}
                          title={briefGaps(lead).length ? `ناقص: ${briefGaps(lead).map((g) => g.label).join('، ')}` : 'افتح الطلب وعدّله'}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border whitespace-nowrap shrink-0 cursor-pointer ${
                            briefGaps(lead).length
                              ? 'bg-[#FFF8E6] text-[#7A5E12] border-[#EBD9A6]'
                              : 'bg-white text-[#141414] border-[#E4DFD4]'
                          }`}
                        >
                          {/* مختصرة عشان ما تتكسرش عمودي وتبوّظ شكل الكارت */}
                          {briefGaps(lead).length === 0
                            ? 'عدّل الطلب كله'
                            : briefGaps(lead).length === 1
                            ? `ناقص ${briefGaps(lead)[0].label}`
                            : `ناقص ${briefGaps(lead).length} بيانات`}
                        </button>
                        <button
                          onClick={() => { setMatchingLeadId(lead.id); setActiveTab('matching'); }}
                          className="px-3 py-1.5 bg-[#E6F7ED] text-[#0E7A5A] text-xs font-bold rounded-xl border border-[#B3E8C8] whitespace-nowrap shrink-0"
                        >
                          شقق مناسبة له
                        </button>
                        <button
                          onClick={() => setSelectedLeadForDetails(lead)}
                          className="px-3 py-1.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] text-xs font-bold rounded-xl border border-[#ECE8DF] whitespace-nowrap shrink-0"
                        >
                          تفاصيل الملف
                        </button>
                        {isAdmin && canEdit ? (
                          <button onClick={() => adminDeleteLead(lead)}
                            className="px-2.5 py-1.5 bg-[#FBEDEA] hover:bg-[#F7DED8] text-[#C2412D] text-xs font-bold rounded-xl border border-[#E9B8AE] whitespace-nowrap shrink-0">
                            حذف
                          </button>
                        ) : (lead as any).deleteRequest && !(lead as any).deleteRequest.resolved ? (
                          <span className="px-2.5 py-1.5 bg-[#FBEDEA] text-[#9A2E1F] text-[11px] font-bold rounded-xl">طلب المسح مستني الإدارة</span>
                        ) : (
                          <button onClick={() => {
                            const reason = window.prompt('ليه عايز تمسح العميل ده؟');
                            if (reason && reason.trim()) onUpdateLead({ ...lead, deleteRequest: { by: currentAgent?.name || 'السيلز', reason: reason.trim(), at: Date.now() } } as any);
                          }} className="px-2.5 py-1.5 bg-white text-[#C2412D] text-[11px] font-bold rounded-xl border border-[#E9B8AE]">
                            اطلب مسح
                          </button>
                        )}
                      </div>
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
                  {selectedMatchingLead && briefGaps(selectedMatchingLead).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscoveryLead(selectedMatchingLead)}
                      className="text-[11px] bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-xl px-2.5 py-1.5 font-bold cursor-pointer text-right leading-relaxed"
                    >
                      طلبه ناقص: {briefGaps(selectedMatchingLead).map((g) => g.label).join('، ')} — افتح مكالمة الاكتشاف
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#6B665C] ml-1">الدفع:</span>
                        {([['cash', 'كاش'], ['instalment', 'تقسيط'], ['both', 'الاتنين']] as [PayMode, string][]).map(([v, t]) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setMatchPay(v)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${activePay === v ? 'bg-[#A07A26] text-white border-[#A07A26]' : 'bg-white border-[#E4DFD4]'}`}
                          >
                            {t}
                          </button>
                        ))}
                        {matchPay && (
                          <button type="button" onClick={() => setMatchPay(null)} className="text-[11px] font-bold text-[#6B665C] underline cursor-pointer">
                            رجّع اللي قاله
                          </button>
                        )}
                      </div>

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

                      {activePay !== 'cash' && !matchBrief.downCash && !matchBrief.monthly && (
                        <button
                          type="button"
                          onClick={() => setDiscoveryLead(selectedMatchingLead!)}
                          className="text-[11px] font-bold text-[#7A5E12] bg-[#FFF8E6] border border-[#EBD9A6] rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          اكتب المقدم والقسط عشان نفلتر المشاريع
                        </button>
                      )}
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
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#141414]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span>أكواد الشقق المطابقة ({matchedProperties.length}):</span>
                <span className="text-xs text-stone-500 font-normal">اضغط على أي كود للمعاينة</span>
              </div>

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
                        src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                      onClick={() => onOpenAffiliateModal && onOpenAffiliateModal(prop)}
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
        {/* TAB 4: QUESTS & XP */}
        {/* ========================================================= */}
        {activeTab === 'quests' && (
          <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto flex-1 pt-1 w-full">
            <div className="bg-white border border-[#ECE8DF] p-5 sm:p-6 rounded-3xl shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DF] pb-4">
                <div>
                  <h3 className="font-readex font-bold text-base sm:text-lg text-[#141414]">
                    {viewAgentId !== 'all' && shownAgent ? `مهام ${shownAgent.name} ونقطه` : 'تحديات اليوم ونقاط الخبرة XP'}
                  </h3>
                  <p className="text-xs text-[#6B665C]">
                    {viewAgentId !== 'all' && shownAgent
                      ? `${(shownAgent.xp || 0).toLocaleString('en-US')} نقطة · بتتفرّج بس، التسجيل بيتعمل من حسابه`
                      : 'أنجز المهام اليومية لرفع مستواك وفتح جوائز وعمولات إضافية'}
                  </p>
                </div>
                <button
                  onClick={() => setSpinModalOpen(true)}
                  className="self-start sm:self-auto px-4 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-readex font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Sparkles size={14} />
                  <span>عجلة الحظ للمبيعات</span>
                </button>
              </div>

              {!shownAgent ? (
                <p className="text-xs bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-xl px-4 py-3 leading-relaxed">
                  إنت داخل كإدارة، والمهام والنقط بتبقى لكل سيلز لوحده.
                  ارجع لـ<b> مسار المتابعات اليومية </b>ودوس على أي حد من الفريق عشان تشوف مهامه ونقطه وإنجازه.
                </p>
              ) : (
                /* شغل النهارده بالتفصيل — المكالمات والإعلانات */
                <DayLogSummary logs={dayLogs.filter((l) => l.agentId === shownAgent.id)} />
              )}

              {/* Quest Items List */}
              <div className="space-y-3.5">
                {isAdmin && editBoard !== 'quests' && (
                  <button onClick={() => setEditBoard('quests')} className="text-xs font-bold text-[#A07A26] cursor-pointer">✎ تعديل تحديات اليوم</button>
                )}
                {isAdmin && editBoard === 'quests' && (
                  <QuestEditor
                    templates={questTemplates}
                    onDone={() => setEditBoard(null)}
                    showToast={showToast}
                  />
                )}
                {agentQuests.map((quest) => {
                  const isDone = quest.isCompleted || quest.currentCount >= quest.targetCount;
                  const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

                  return (
                    <div 
                      key={quest.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-[#FAF4E5]/60 border-[#E9DFCA]'
                          : 'bg-[#F6F4EF] border-[#ECE8DF]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-[#141414]">
                              {quest.title}
                            </h4>
                            <span className="px-2 py-0.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] text-[11px] font-bold rounded-lg">
                              +{quest.xpReward} XP
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B665C]">
                            {quest.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                          <span className="font-mono text-xs font-bold text-[#141414] dir-ltr">
                            {quest.currentCount} / {quest.targetCount}
                          </span>

                          {isDone ? (
                            <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1">
                              <Check size={13} />
                              <span>مكتملة ✓</span>
                            </span>
                          ) : viewingSomeoneElse ? (
                            /* بتتفرّج على حد تاني — ما ينفعش تسجّل نشاط باسمه */
                            <span className="px-3 py-1.5 bg-[#F6F4EF] border border-[#E4DFD4] text-[#6B665C] text-[11px] font-bold rounded-xl">
                              لسه
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                /* المكالمة والإعلان محتاجين تفاصيل، وأي تحدي
                                   الإدارة طلبت عليه إثبات محتاج دليل — مش مجرد +1 */
                                if (quest.category === 'calls' || quest.category === 'facebook_share'
                                    || ((quest as any).proof && (quest as any).proof !== 'none')) setLogQuest(quest);
                                else handleIncrementQuest(quest.id);
                              }}
                              className="px-3.5 py-1.5 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                            >
                              <Plus size={13} />
                              <span>
                                {quest.category === 'calls' ? 'سجّل مكالمة'
                                  : quest.category === 'facebook_share' ? 'سجّل إعلان'
                                  : ((quest as any).proof && (quest as any).proof !== 'none') ? 'سجّل بالإثبات'
                                  : 'تسجيل نشاط (+1)'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-[#ECE8DF] rounded-full overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-600' : 'bg-[#A07A26]'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LEADERBOARD */}
        {/* ========================================================= */}
        {activeTab === 'content' && (
          <div className="p-4 sm:p-5">
            <ContentTab properties={properties} agents={agents} currentAgent={currentAgent} isAdmin={isAdmin} />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="p-4 sm:p-5">
            <LeaderboardTab agents={agents} leads={leads} />
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

      {/* تسجيل مكالمة أو إعلان بتفاصيله */}
      {logQuest && currentAgent && (
        <QuestLogSheet
          quest={logQuest}
          agent={currentAgent}
          leads={leads}
          onClose={() => setLogQuest(null)}
          onSaved={() => handleIncrementQuest(logQuest.id)}
          showToast={showToast}
        />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[#141414] block mb-1 font-bold">الحي المطلوب:</label>
                  {/* أكتر من حي — نفس اللي مكالمة الاكتشاف والفلاتر بيقبلوه */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewLeadForm({ ...newLeadForm, districts: [] })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!newLeadForm.districts?.length ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}
                    >أي حي</button>
                    {HADABA_WOSTA_NEIGHBORHOODS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewLeadForm({ ...newLeadForm, districts: toggleValue(newLeadForm.districts, n) })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${newLeadForm.districts?.includes(n) ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}
                      >{n}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[#141414] block mb-1 font-bold">عدد الغرف:</label>
                  <select
                    value={newLeadForm.preferredBedrooms}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, preferredBedrooms: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n > 2 ? 'غرف' : n === 2 ? 'أوضتين' : 'أوضة'}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#141414] block mb-1 font-bold">كود الشقة المهتم بها:</label>
                  <select
                    value={newLeadForm.interestedPropertyCode}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, interestedPropertyCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  >
                    <option value="">مفيش شقة معيّنة</option>
                    {properties.map((p) => <option key={p.id} value={p.code}>{p.code} · {p.neighborhood} · {p.area}م²</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-3">
                  <BudgetRange min={newLeadForm.budgetMin} max={newLeadForm.budgetMax} onChange={(mn, mx) => setNewLeadForm({ ...newLeadForm, budgetMin: mn, budgetMax: mx })} />
                  <WhenPicker value={newLeadForm.nextAt} onChange={(v) => setNewLeadForm({ ...newLeadForm, nextAt: v })} label="أول متابعة" />
                </div>
              </div>

              <div>
                <label className="text-[#141414] block mb-1 font-bold">ملاحظات العميل:</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                  placeholder="تفاصيل طلب العميل وموعد الاتصال..."
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
                  onClick={() => setAfterAdd('matching')}
                  className="px-4 py-2.5 bg-[#E6F7ED] text-[#0E7A5A] border border-[#B3E8C8] font-bold rounded-xl cursor-pointer"
                >
                  احفظ وشوف الشقق
                </button>
                <button
                  type="submit"
                  onClick={() => setAfterAdd('discovery')}
                  className="px-5 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  احفظ وكمّل الاكتشاف
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {/* PROPERTY DETAILS PREVIEW MODAL */}
      {previewProperty && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div 
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full text-right space-y-4 shadow-2xl border border-[#ECE8DF] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ECE8DF] pb-3">
              <span className="font-mono text-xs font-bold text-[#A07A26] bg-[#FAF4E5] px-2.5 py-1 rounded-lg">
                #{previewProperty.code}
              </span>
              <button
                type="button"
                onClick={() => setPreviewProperty(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="aspect-video rounded-2xl overflow-hidden border border-[#ECE8DF]">
              <img 
                src={previewProperty.images[0]} 
                alt={previewProperty.title}
                className="w-full h-full object-cover" 
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#141414] font-readex">{previewProperty.title}</h3>
              <p className="text-xs text-[#6B665C]">{previewProperty.neighborhood}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#F6F4EF] rounded-xl border border-[#ECE8DF]">
                <span className="text-[#6B665C] text-[10px] block">المساحة</span>
                <strong className="font-bold text-[#141414] font-mono">{previewProperty.area} م²</strong>
              </div>
              <div className="p-2.5 bg-[#F6F4EF] rounded-xl border border-[#ECE8DF]">
                <span className="text-[#6B665C] text-[10px] block">الغرف</span>
                <strong className="font-bold text-[#141414]">{previewProperty.bedrooms} غرف</strong>
              </div>
              <div className="p-2.5 bg-[#F6F4EF] rounded-xl border border-[#ECE8DF]">
                <span className="text-[#6B665C] text-[10px] block">السعر</span>
                <strong className="font-bold text-[#141414]">{formatPrice(previewProperty.price)}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewProperty(null)}
                className="px-5 py-2.5 bg-[#141414] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
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

    {discoveryLead && (
        <DiscoveryCallModal isOpen={!!discoveryLead} lead={discoveryLead} properties={properties} byName={currentAgent?.name || 'الفريق'}
          onClose={() => setDiscoveryLead(null)}
          onSaved={(u) => { onUpdateLead(u); setDiscoveryLead((d) => (d ? u : d)); }}
          onBuildOffer={(u) => { setDiscoveryLead(null); setOfferLead(u); }} />
      )}
      {offerLead && (
        <OfferBuilderModal isOpen={!!offerLead} lead={offerLead} properties={properties} preselectedIds={offerPicks}
          agentId={currentAgent?.id || ''} agentName={currentAgent?.name || ''} agentPhone={currentAgent?.phone}
          onClose={() => setOfferLead(null)}
          onSent={(u) => onUpdateLead(u)} />
      )}
    </div>
  );
};
