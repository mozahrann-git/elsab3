import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { LionLogo } from './LionLogo';
import { formatPrice, formatNumber, generateCallLink, generateWhatsAppLink } from '../utils/helpers';
import { SpinWheelModal } from './SpinWheelModal';
import { LeadDetailsModal } from './LeadDetailsModal';
import { FollowUpNotificationsModal } from './FollowUpNotificationsModal';
import { INITIAL_DAILY_QUESTS } from '../data/crmData';

interface SalesCrmModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  agents: SalesAgent[];
  leads: Lead[];
  onUpdateLead: (updatedLead: Lead) => void;
  onAddLead: (newLead: Lead) => void;
  onUpdateAgent: (updatedAgent: SalesAgent) => void;
  emergencyAlerts: BroadcastEmergencyAlert[];
  onSendEmergencyAlert: (alert: Omit<BroadcastEmergencyAlert, 'id' | 'createdAt'>) => void;
  onOpenAffiliateModal?: (property: Property) => void;
  onSelectProperty?: (property: Property) => void;
  isAdmin?: boolean;
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
  onUpdateAgent,
  emergencyAlerts,
  onSendEmergencyAlert,
  onOpenAffiliateModal,
  onSelectProperty,
  isAdmin = false,
  currentAgentId,
  onLogout
}) => {
  // Navigation Tabs matching sidebar items (Properties tab removed)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'followups' | 'matching' | 'quests' | 'leaderboard'>('pipeline');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileStageFilter, setActiveMobileStageFilter] = useState<string>('all');
  
  // Smart Matching Lead Selection & State
  const [matchingLeadId, setMatchingLeadId] = useState<string>(() => leads[0]?.id || 'lead_101');
  const [highlightedPropCode, setHighlightedPropCode] = useState<string | null>(null);

  // Modals inside CRM
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [leadToChangeStatus, setLeadToChangeStatus] = useState<Lead | null>(null);
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [celebrationDealData, setCelebrationDealData] = useState<{ lead: Lead; value: number; commission: number } | null>(null);
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    source: 'facebook_group' as Lead['source'],
    preferredNeighborhood: 'الحي الثاني',
    budgetMin: 2500000,
    budgetMax: 3500000,
    preferredBedrooms: 3,
    preferredFinishing: 'finished' as 'finished' | 'semi_finished' | 'all',
    interestedPropertyCode: '',
    notes: '',
    followUpScheduledAt: 'اليوم بعد ساعتين',
    followUpUrgency: 'urgent' as 'urgent' | 'today' | 'upcoming',
    assignedAgentId: '',
  });

  // Active Sales Agent for current session
  const currentSalesAgent = useMemo(() => {
    if (currentAgentId) {
      const found = agents.find((a) => a.id === currentAgentId);
      if (found) return found;
    }
    return agents.find((a) => a.isCurrentSession) || agents[0];
  }, [agents, currentAgentId]);

  const currentAgent = currentSalesAgent;

  // Scoped Leads
  const scopedLeads = useMemo(() => {
    if (isAdmin) return leads;
    return leads.filter((l) => 
      l.assignedAgentId === currentSalesAgent?.id || 
      l.assignedAgentName === currentSalesAgent?.name
    );
  }, [leads, isAdmin, currentSalesAgent]);

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
    return scopedLeads.filter((l) => l.followUpStatus === 'pending' || l.followUpUrgency === 'urgent').length;
  }, [scopedLeads]);

  // Selected Lead for Smart Matching
  const selectedMatchingLead = useMemo(() => {
    return leads.find((l) => l.id === matchingLeadId) || leads[0] || null;
  }, [leads, matchingLeadId]);

  // Matched Properties List for the selected lead
  const matchedProperties = useMemo(() => {
    if (!selectedMatchingLead) return properties.slice(0, 10);

    const targetHood = selectedMatchingLead.preferredNeighborhood;
    const targetBeds = selectedMatchingLead.preferredBedrooms;
    const maxBudget = selectedMatchingLead.budgetMax ? selectedMatchingLead.budgetMax * 1.15 : Infinity;
    const minBudget = selectedMatchingLead.budgetMin ? selectedMatchingLead.budgetMin * 0.85 : 0;

    let list = properties.filter((p) => {
      const matchHood = !targetHood || p.neighborhood === targetHood;
      const matchPrice = p.price >= minBudget && p.price <= maxBudget;
      const matchBeds = !targetBeds || p.bedrooms === targetBeds || p.bedrooms === targetBeds + 1 || p.bedrooms === targetBeds - 1;
      return matchHood && (matchPrice || !selectedMatchingLead.budgetMax);
    });

    if (list.length < 3 && targetHood) {
      const hoodList = properties.filter((p) => p.neighborhood === targetHood);
      if (hoodList.length > 0) {
        list = hoodList;
      }
    }

    return list.length > 0 ? list : properties.slice(0, 10);
  }, [selectedMatchingLead, properties]);

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
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (!isOpen) return null;

  // Quick Move Status Handler
  const handleMoveStatus = (lead: Lead, newStatus: LeadStatus) => {
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG');
    const stageLabel = CRM_PIPELINE_STAGES.find((s) => s.id === newStatus)?.label || newStatus;
    const noteText = `[${timestamp}] تم نقل المرحلة إلى: ${stageLabel}`;

    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
      lastContactDate: 'الآن',
      notes: [noteText, ...(lead.notes || [])]
    };

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

    const assignedAgent = agents.find((a) => a.id === newLeadForm.assignedAgentId) || currentSalesAgent || agents[0];

    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: newLeadForm.name.trim(),
      phone: newLeadForm.phone.trim(),
      status: 'new',
      source: newLeadForm.source,
      preferredNeighborhood: newLeadForm.preferredNeighborhood,
      budgetMin: Number(newLeadForm.budgetMin) || 0,
      budgetMax: Number(newLeadForm.budgetMax) || 0,
      preferredBedrooms: Number(newLeadForm.preferredBedrooms) || 3,
      preferredFinishing: newLeadForm.preferredFinishing,
      interestedPropertyCode: newLeadForm.interestedPropertyCode.trim() || undefined,
      notes: newLeadForm.notes.trim() ? [newLeadForm.notes.trim()] : ['تم إضافة العميل للمتابعة'],
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      createdAt: new Date().toISOString(),
      lastContactDate: 'الآن',
      followUpStatus: 'pending',
      followUpScheduledAt: newLeadForm.followUpScheduledAt || 'اليوم بعد ساعتين',
      followUpNote: newLeadForm.notes.trim() || 'متابعة أولية مع العميل',
      followUpUrgency: newLeadForm.followUpUrgency || 'urgent'
    };

    onAddLead(newLead);
    setIsAddLeadOpen(false);
    setNewLeadForm({
      name: '',
      phone: '',
      source: 'facebook_group',
      preferredNeighborhood: 'الحي الثاني',
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
  const handleIncrementQuest = (questId: string) => {
    if (!currentAgent) return;
    const quests = currentAgent.activeQuests || INITIAL_DAILY_QUESTS;
    const updated = quests.map((q) => {
      if (q.id === questId) {
        const newCount = q.currentCount + 1;
        const isDone = newCount >= q.targetCount;
        return {
          ...q,
          currentCount: newCount,
          isCompleted: isDone
        };
      }
      return q;
    });

    onUpdateAgent({
      ...currentAgent,
      activeQuests: updated,
      xp: (currentAgent.xp || 0) + 50
    });
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
                  {currentSalesAgent?.name?.charAt(0) || 'م'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white truncate max-w-[120px]">
                    {currentSalesAgent?.name || 'مستشار المبيعات'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>متاح للمتابعات</span>
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 bg-[#FAF4E5]/10 border border-[#E9DFCA]/20 text-[#FAF4E5] text-[10px] font-mono font-bold rounded-lg">
                {currentSalesAgent?.xp || 1450} XP
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
            
            {/* Urgent Broadcast Banner */}
            <div className="bg-white border-2 border-[#E9DFCA] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 sm:mt-0 animate-ping" />
                <div>
                  <h3 className="font-readex font-bold text-xs sm:text-sm text-[#141414]">
                    طلب عاجل من الإدارة: عميل كاش جاد
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#6B665C] mt-0.5 leading-relaxed">
                    دور أرضي بحديقة أو دور أول · الحي الثاني أو الثالث · حتى 4 مليون
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 self-end sm:self-auto shrink-0">
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#FAF4E5] border border-[#E9DFCA] text-[#9E7A26] font-bold text-[11px] sm:text-xs rounded-xl">
                  بونص 1,500 ج.م
                </span>
                <button
                  onClick={() => setActiveTab('matching')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#141414] hover:bg-black text-white font-readex font-bold text-[11px] sm:text-xs rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  شوف المطابقات
                </button>
              </div>
            </div>

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
                          stageLeads.map((lead, idx) => (
                            <div 
                              key={lead.id}
                              className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 shadow-2xs space-y-2.5 hover:border-[#A07A26] transition-all group"
                            >
                              {/* Top row: Client Name & Follow-up urgency badge */}
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-xs ${
                                  lead.followUpUrgency === 'urgent' ? 'text-rose-600' : 'text-[#A07A26]'
                                }`}>
                                  {lead.followUpUrgency === 'urgent' ? 'عاجل' : lead.followUpScheduledAt || st.defaultBadge}
                                </span>
                                
                                <h5 
                                  onClick={() => setSelectedLeadForDetails(lead)}
                                  className="font-readex font-bold text-xs text-[#141414] truncate max-w-[130px] cursor-pointer hover:text-[#A07A26]"
                                >
                                  {lead.name}
                                </h5>
                              </div>

                              {/* Details text */}
                              <p 
                                onClick={() => setSelectedLeadForDetails(lead)}
                                className="text-xs text-[#6B665C] truncate cursor-pointer"
                              >
                                {lead.preferredBedrooms ? `${lead.preferredBedrooms} غرف · ` : ''}
                                {lead.preferredNeighborhood || 'الهضبة الوسطى'}
                              </p>

                              {/* Property Code & Budget */}
                              <div className="flex items-center justify-between pt-1 border-t border-[#ECE8DF]/70 text-xs">
                                <span className="font-mono text-xs text-[#8C877D]">
                                  {lead.interestedPropertyCode ? `#${lead.interestedPropertyCode}` : '—'}
                                </span>
                                <span className="font-bold text-xs text-[#141414]">
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
                          ))
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
              {scopedLeads.map((lead) => {
                const stageObj = CRM_PIPELINE_STAGES.find((s) => s.id === lead.status) || CRM_PIPELINE_STAGES[0];
                return (
                  <div 
                    key={lead.id}
                    className="bg-white border border-[#ECE8DF] rounded-2xl p-4 shadow-2xs space-y-3 hover:border-[#A07A26] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ECE8DF] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] text-[#A07A26] font-bold flex items-center justify-center font-readex text-sm">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-readex font-bold text-sm text-[#141414]">{lead.name}</h4>
                            <span className="font-mono text-xs text-[#6B665C] dir-ltr">{lead.phone}</span>
                          </div>
                          <p className="text-xs text-[#8C877D]">
                            المستشار المسؤول: <strong className="text-[#141414]">{lead.assignedAgentName || 'سارة حنفي'}</strong>
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

                    {/* Follow-up Fields Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F6F4EF] p-3 rounded-xl border border-[#ECE8DF]">
                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">موعد المتابعة:</span>
                        <span className="font-bold text-[#141414]">{lead.followUpScheduledAt || 'اليوم بعد ساعتين'}</span>
                      </div>

                      <div>
                        <span className="text-[#8C877D] text-[10px] block font-bold">الأولوية:</span>
                        <span className={`font-bold ${lead.followUpUrgency === 'urgent' ? 'text-rose-600' : 'text-[#A07A26]'}`}>
                          {lead.followUpUrgency === 'urgent' ? '🔴 عاجل فوراً' : '🟡 متابعة اليوم'}
                        </span>
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

                    {/* Notes & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#6B665C] truncate max-w-xl">
                        📝 <strong className="text-[#141414]">آخر ملاحظة:</strong> {lead.followUpNote || lead.notes?.[0] || 'لا توجد ملاحظات مسجلة بعد'}
                      </p>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <a
                          href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً أستاذ ${lead.name}، بخصوص الشقق المعروضة بالهضبة الوسطى`)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <MessageCircle size={14} />
                          <span>واتساب</span>
                        </a>

                        <a
                          href={generateCallLink(lead.phone)}
                          className="px-3 py-1.5 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <Phone size={14} />
                          <span>اتصال</span>
                        </a>

                        <button
                          onClick={() => setSelectedLeadForDetails(lead)}
                          className="px-3 py-1.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] text-xs font-bold rounded-xl border border-[#ECE8DF]"
                        >
                          تفاصيل الملف
                        </button>
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
                    الطلب: <span className="font-bold text-[#141414]">{selectedMatchingLead?.preferredNeighborhood || 'الحي الثاني'}</span> · <span className="font-bold text-[#141414]">{selectedMatchingLead?.preferredBedrooms || 3} غرف</span> · ميزانية: <span className="font-bold text-[#0E7A5A]">{selectedMatchingLead?.budgetMax ? formatPrice(selectedMatchingLead.budgetMax) : '3,600,000 ج.م'}</span>
                  </p>
                </div>

                {/* Matching Counter Badge */}
                <div className="bg-[#E6F7ED] border border-[#B3E8C8] text-[#0E7A5A] px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#0E7A5A]" />
                  <span>{matchedProperties.length} شقق مطابقة</span>
                </div>
              </div>

              {/* Client Quick Switcher */}
              <div className="pt-2 border-t border-[#ECE8DF]/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-stone-500 shrink-0">تبديل العميل:</span>
                {leads.map((ld) => (
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

            {/* Matched Codes Header & Pills Grid */}
            <div className="space-y-2.5">
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

            {/* Matched Properties Cards List (Exact layout from Screenshot 1) */}
            <div className="space-y-3 sm:space-y-3.5 pt-1">
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
                    تحديات اليوم ونقاط الخبرة XP
                  </h3>
                  <p className="text-xs text-[#6B665C]">
                    أنجز المهام اليومية لرفع مستواك وفتح جوائز وعمولات إضافية
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

              {/* Quest Items List */}
              <div className="space-y-3.5">
                {(currentAgent?.activeQuests || INITIAL_DAILY_QUESTS).map((quest) => {
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
                          ) : (
                            <button
                              onClick={() => handleIncrementQuest(quest.id)}
                              className="px-3.5 py-1.5 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-2xs"
                            >
                              <Plus size={13} />
                              <span>تسجيل نشاط (+1)</span>
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
        {activeTab === 'leaderboard' && (
          <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto flex-1 pt-1 w-full">
            <div className="bg-white border border-[#ECE8DF] p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
              <h3 className="font-readex font-bold text-base sm:text-lg text-[#141414]">المتصدرين الشهر ده - فريق المبيعات</h3>
              <p className="text-xs text-[#6B665C]">ترتيب المستشارين العقاريين حسب الصفقات والـ XP</p>

              <div className="space-y-2.5 pt-2">
                {agents.map((ag, idx) => (
                  <div 
                    key={ag.id} 
                    className="p-3.5 sm:p-4 bg-[#F6F4EF] border border-[#ECE8DF] rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                        idx === 0 ? 'bg-[#D9B864] text-[#141414]' : 'bg-[#ECE8DF] text-[#6B665C]'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-[#141414]">{ag.name}</h4>
                        <p className="text-[10px] sm:text-[11px] text-[#6B665C]">{ag.dealsClosedCount} صفقات مغلقة</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#141414]">{ag.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
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
            className="relative w-full sm:max-w-md bg-[#22252A] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-5 space-y-3 animate-in slide-in-from-bottom duration-200"
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
                    onClick={() => handleMoveStatus(leadToChangeStatus, stage.id)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer ${
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD NEW LEAD MODAL */}
      {/* ========================================================= */}
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
                onClick={() => setIsAddLeadOpen(false)}
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
                <div>
                  <label className="text-[#141414] block mb-1 font-bold">الحي المطلوب:</label>
                  <input
                    type="text"
                    value={newLeadForm.preferredNeighborhood}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, preferredNeighborhood: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    placeholder="الحي الثاني"
                  />
                </div>

                <div>
                  <label className="text-[#141414] block mb-1 font-bold">الحد الأقصى (ج.م):</label>
                  <input
                    type="number"
                    value={newLeadForm.budgetMax}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budgetMax: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    placeholder="3500000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#141414] block mb-1 font-bold">موعد المتابعة:</label>
                  <input
                    type="text"
                    value={newLeadForm.followUpScheduledAt}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, followUpScheduledAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    placeholder="اليوم بعد ساعتين"
                  />
                </div>

                <div>
                  <label className="text-[#141414] block mb-1 font-bold">كود الشقة المهتم بها:</label>
                  <input
                    type="text"
                    value={newLeadForm.interestedPropertyCode}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, interestedPropertyCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none focus:border-[#A07A26]"
                    placeholder="H1118"
                  />
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
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2.5 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ العميل
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

    </div>
  );
};
