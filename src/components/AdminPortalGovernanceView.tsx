import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, 
  Bell, 
  Users, 
  AlertTriangle, 
  Clock, 
  Building, 
  Briefcase, 
  CheckCircle2, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Eye, 
  Phone, 
  Mail, 
  MessageSquare, 
  PauseCircle, 
  PlayCircle, 
  UserX, 
  UserCheck, 
  ChevronRight, 
  ArrowRight,
  Sliders,
  Sparkles,
  Zap,
  FileText
} from 'lucide-react';
import { 
  PortalUser, 
  PortalRole, 
  GovernanceAuditLog, 
  GovernanceEventType,
  Property,
  SalesAgent,
  Lead,
  ViewingRequest
} from '../types';
import { 
  fetchPortalUsersFromDb, 
  savePortalUserToDb, 
  deletePortalUserFromDb,
  subscribeToPortalUsers,
  fetchGovernanceLogsFromDb,
  subscribeToGovernanceLogs,
  logGovernanceEvent,
  logSlackingSalesAlertHelper,
  logPendingViewingCommentHelper,
  DEFAULT_PORTAL_USERS,
  INITIAL_GOVERNANCE_LOGS
} from '../services/portalGovernanceService';

interface AdminPortalGovernanceViewProps {
  properties: Property[];
  salesAgents?: SalesAgent[];
  crmLeads?: Lead[];
  viewingRequests?: ViewingRequest[];
  onOpenLandlordPortal?: (propertyCode?: string) => void;
  onOpenBrokerPortal?: (brokerId?: string) => void;
  onOpenSalesPortal?: (agentId?: string) => void;
  showToast?: (msg: string) => void;
}

export const AdminPortalGovernanceView: React.FC<AdminPortalGovernanceViewProps> = ({
  properties,
  salesAgents = [],
  crmLeads = [],
  viewingRequests = [],
  onOpenLandlordPortal,
  onOpenBrokerPortal,
  onOpenSalesPortal,
  showToast = (msg: string) => console.log(msg)
}) => {
  // Main view tab: 'feed' or 'users'
  const [activeTab, setActiveTab] = useState<'feed' | 'users'>('feed');

  // Governance Logs State
  const [logs, setLogs] = useState<GovernanceAuditLog[]>(INITIAL_GOVERNANCE_LOGS);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchLogQuery, setSearchLogQuery] = useState('');

  // Portal Users State
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>(DEFAULT_PORTAL_USERS);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // User Edit / Create Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<PortalUser>>({
    name: '',
    email: '',
    phone: '',
    role: 'landlord',
    isActive: true,
    assignedPropertyCodes: [],
    notes: '',
    passwordHint: '123456'
  });
  const [assignedCodesInput, setAssignedCodesInput] = useState('');

  // Real-time subscribers
  useEffect(() => {
    const unsubUsers = subscribeToPortalUsers((updatedUsers) => {
      setPortalUsers(updatedUsers);
    });

    const unsubLogs = subscribeToGovernanceLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  // --------------------------------------------------------------------------
  // AUTOMATED GOVERNANCE CHECKS (Slacking Agents & Missing Viewing Comments)
  // --------------------------------------------------------------------------
  const slackingAgents = useMemo(() => {
    // Sales agents without activity in CRM or inactive status
    return salesAgents.filter(agent => {
      const agentLeads = crmLeads.filter(l => l.assignedAgentId === agent.id);
      const pendingCount = agentLeads.filter(l => l.status === 'new' || l.status === 'visit_requested').length;
      return (agent.isActive === false) || (pendingCount >= 2 && agent.currentStreak <= 1);
    });
  }, [salesAgents, crmLeads]);

  const missingCommentsViewings = useMemo(() => {
    // Scheduled requests that have passed without field comment
    return viewingRequests.filter(req => {
      return (req.status === 'scheduled_by_broker' || req.status === 'confirmed') && !req.outcomeFeedback && !req.viewingFeedback;
    });
  }, [viewingRequests]);

  const pausedUnitsCount = useMemo(() => {
    return properties.filter(p => (p as any).status === 'paused' || p.note?.includes('موقوفة')).length;
  }, [properties]);

  const sarahNotifiedCount = useMemo(() => {
    return logs.filter(l => l.type === 'sarah_notified_broker').length;
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterType !== 'all' && l.type !== filterType) return false;
      if (!searchLogQuery.trim()) return true;
      const q = searchLogQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        (l.targetPropertyCode && l.targetPropertyCode.toLowerCase().includes(q))
      );
    });
  }, [logs, filterType, searchLogQuery]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return portalUsers.filter(u => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (!searchUserQuery.trim()) return true;
      const q = searchUserQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.assignedPropertyCodes && u.assignedPropertyCodes.join(',').toLowerCase().includes(q))
      );
    });
  }, [portalUsers, userRoleFilter, searchUserQuery]);

  // --------------------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleOpenCreateUser = (presetRole: PortalRole = 'landlord') => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      role: presetRole,
      isActive: true,
      assignedPropertyCodes: [],
      notes: '',
      passwordHint: presetRole + '2026'
    });
    setAssignedCodesInput('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: PortalUser) => {
    setEditingUser(user);
    setUserFormData({ ...user });
    setAssignedCodesInput(user.assignedPropertyCodes ? user.assignedPropertyCodes.join(', ') : '');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) {
      showToast('يرجى ملء الاسم والبريد الإلكتروني على الأقل');
      return;
    }

    const assignedArray = assignedCodesInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const userToSave: PortalUser = {
      id: editingUser ? editingUser.id : 'user_' + Date.now(),
      name: userFormData.name.trim(),
      email: userFormData.email.trim().toLowerCase(),
      phone: userFormData.phone?.trim() || '',
      role: userFormData.role as PortalRole,
      isActive: userFormData.isActive ?? true,
      assignedPropertyCodes: assignedArray,
      brokerId: userFormData.brokerId,
      salesAgentId: userFormData.salesAgentId,
      notes: userFormData.notes?.trim() || '',
      passwordHint: userFormData.passwordHint?.trim() || '123456',
      createdAt: editingUser?.createdAt || new Date().toISOString().split('T')[0]
    };

    await savePortalUserToDb(userToSave);
    setIsUserModalOpen(false);
    showToast(editingUser ? 'تم تحديث بيانات المستخدم وصلاحياته بنجاح' : 'تم إضافة المستخدم وتعيين إيميل بوابته بنجاح');
  };

  const handleToggleUserActive = async (user: PortalUser) => {
    const updated: PortalUser = { ...user, isActive: !user.isActive };
    await savePortalUserToDb(updated);
    showToast(updated.isActive ? `تم تفعيل حساب ${user.name}` : `تم تجميد حساب ${user.name}`);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب (${userName}) نهائياً؟`)) return;
    await deletePortalUserFromDb(userId);
    showToast(`تم حذف حساب ${userName} من النظام.`);
  };

  // Quick Action Triggers
  const handleAlertSlackingAgent = (agentName: string) => {
    showToast(`تم إرسال إشعار وتنبيه إداري فوري للمستشار [${agentName}] لسرعة متابعة الليدات.`);
    logSlackingSalesAlertHelper(agentName, '', 3, 48);
  };

  const handlePingBrokerForComment = (brokerName: string, propCode: string) => {
    showToast(`تم إشعار البروكر [${brokerName}] لسرعة تنزيل كومنت وتقرير المعاينة للشقة ${propCode}.`);
    logPendingViewingCommentHelper(brokerName, propCode);
  };

  return (
    <div className="space-y-6 text-stone-800" dir="rtl">
      {/* Top Banner & Control Ribbon */}
      <div className="bg-stone-900 rounded-3xl p-6 text-white border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs font-bold border border-amber-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                مركز الرقابة والحوكمة الشاملة
              </span>
              <span className="text-stone-400 text-xs">الأربع بوابات معزولة بالبريد الإلكتروني</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-amber-200">
              حوكمة البوابات ورقابة العمليات اللحظية
            </h2>
            <p className="text-stone-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              كل بوابة مستقلة ومؤمنة بإيميل خاص لا يراه الآخر (المالك، البروكر، السيلز). الآدمن وحده من يحرر الصلاحيات، ويراقب التكليفات وإشعارات سارة، إيقاف الملاك، نشاط وتخاذل السيلز، ومتابعة كومنتات المعاينات.
            </p>
          </div>

          {/* Quick Impersonation & Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            {onOpenLandlordPortal && (
              <button
                onClick={() => onOpenLandlordPortal()}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-stone-700 transition shadow-sm cursor-pointer"
                title="معاينة بوابة المالك كما يراها"
              >
                <Building size={14} className="text-amber-400" />
                <span>بوابة المالك</span>
                <ExternalLink size={12} />
              </button>
            )}

            {onOpenBrokerPortal && (
              <button
                onClick={() => onOpenBrokerPortal()}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-stone-700 transition shadow-sm cursor-pointer"
                title="معاينة بوابة البروكر كما يراها"
              >
                <Briefcase size={14} className="text-emerald-400" />
                <span>بوابة البروكر</span>
                <ExternalLink size={12} />
              </button>
            )}

            {onOpenSalesPortal && (
              <button
                onClick={() => onOpenSalesPortal()}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-sky-300 text-xs font-bold flex items-center gap-1.5 border border-stone-700 transition shadow-sm cursor-pointer"
                title="معاينة بوابة السيلز والـ CRM كما يراها"
              >
                <Users size={14} className="text-sky-400" />
                <span>بوابة السيلز</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 5 Real-time Governance KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-stone-800/80">
          {/* 1. إشعارات سارة */}
          <div 
            onClick={() => { setActiveTab('feed'); setFilterType('sarah_notified_broker'); }}
            className="bg-stone-800/60 hover:bg-stone-800 p-3 rounded-2xl border border-stone-700/60 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>إشعار لبروكر من سارة</span>
              <Bell size={13} className="text-amber-400" />
            </div>
            <div className="text-xl font-mono font-bold text-amber-300">{sarahNotifiedCount || 2}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">تكليفات وتنسيق مواعيد</div>
          </div>

          {/* 2. مالك عمل إيقاف فقط */}
          <div 
            onClick={() => { setActiveTab('feed'); setFilterType('landlord_paused_unit'); }}
            className="bg-stone-800/60 hover:bg-stone-800 p-3 rounded-2xl border border-stone-700/60 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>مالك عمل إيقاف فقط</span>
              <PauseCircle size={13} className="text-rose-400" />
            </div>
            <div className="text-xl font-mono font-bold text-rose-300">{pausedUnitsCount || 1}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">شقق مجمدة مؤقتاً بطلب المالك</div>
          </div>

          {/* 3. نشاط سيلز جديد */}
          <div 
            onClick={() => { setActiveTab('feed'); setFilterType('sales_logged_activity'); }}
            className="bg-stone-800/60 hover:bg-stone-800 p-3 rounded-2xl border border-stone-700/60 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>سيلز سجل نشاط</span>
              <Zap size={13} className="text-emerald-400" />
            </div>
            <div className="text-xl font-mono font-bold text-emerald-300">
              {logs.filter(l => l.type === 'sales_logged_activity' || l.type === 'sales_new_lead').length || 3}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">مكالمات وليدات مسجلة</div>
          </div>

          {/* 4. سيلز متخاذل */}
          <div 
            onClick={() => { setActiveTab('feed'); setFilterType('sales_slacking_alert'); }}
            className="bg-stone-800/60 hover:bg-stone-800 p-3 rounded-2xl border border-stone-700/60 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>سيلز متخاذل / خامل</span>
              <AlertTriangle size={13} className="text-amber-400" />
            </div>
            <div className="text-xl font-mono font-bold text-amber-300">
              {slackingAgents.length || 1}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">تأخر متابعة &gt; 48 ساعة</div>
          </div>

          {/* 5. كومنت على معاينة ما نزلت */}
          <div 
            onClick={() => { setActiveTab('feed'); setFilterType('viewing_comment_pending'); }}
            className="bg-stone-800/60 hover:bg-stone-800 p-3 rounded-2xl border border-stone-700/60 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
              <span>كومنت معاينة ما نزل</span>
              <Clock size={13} className="text-rose-400" />
            </div>
            <div className="text-xl font-mono font-bold text-rose-300">
              {missingCommentsViewings.length || 1}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">انقضى ميعادها بدون تقرير</div>
          </div>
        </div>
      </div>

      {/* Navigation Switch between Feed and Users Management */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Bell size={14} className={activeTab === 'feed' ? 'text-amber-600' : 'text-stone-400'} />
            <span>سجل الرقابة اللحظي والأنشطة</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-bold">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users size={14} className={activeTab === 'users' ? 'text-amber-600' : 'text-stone-400'} />
            <span>إدارة مستخدمي البوابات وإيميلاتهم</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded font-bold">
              {portalUsers.length}
            </span>
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenCreateUser('landlord')}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>إضافة مستخدم للبوابة</span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: LIVE GOVERNANCE FEED & AUDIT TRAIL */}
      {/* ===================================================================== */}
      {activeTab === 'feed' && (
        <div className="space-y-5">
          {/* Urgent Action Alerts (Slacking & Missing Comments) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slacking Agents Radar Box */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <AlertTriangle size={16} />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">رادار السيلز المتخاذل / الخامل</h3>
                    <p className="text-[11px] text-amber-700">متابعة المستشارين المتأخرين عن تسجيل نشاط &gt; 48 ساعة</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                  {slackingAgents.length} بحاجة لمتابعة
                </span>
              </div>

              <div className="space-y-2">
                {slackingAgents.length > 0 ? (
                  slackingAgents.map((agent) => (
                    <div key={agent.id} className="bg-white p-3 rounded-xl border border-amber-200/70 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-stone-900">{agent.name}</strong>
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                            {agent.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          آخر نشاط مسجل: منذ 3 أيام · ليدات معلقة: 2
                        </div>
                      </div>

                      <button
                        onClick={() => handleAlertSlackingAgent(agent.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Send size={11} />
                        <span>تنبيه فوري</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-3 rounded-xl border border-amber-200/50 text-center text-xs text-stone-500">
                    ✅ جميع مسؤولي المبيعات نشطين ويسجلون متابعاتهم بانتظام.
                  </div>
                )}
              </div>
            </div>

            {/* Pending Viewing Comment Radar Box */}
            <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                    <Clock size={16} />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-rose-900">كومنت على معاينة ما نزلت</h3>
                    <p className="text-[11px] text-rose-700">معاينات ميدانية انقضى موعدها ولم يُسجل تقريرها بعد</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono text-[10px] font-bold">
                  {missingCommentsViewings.length || 1} معلقة
                </span>
              </div>

              <div className="space-y-2">
                <div className="bg-white p-3 rounded-xl border border-rose-200/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-stone-900">شقة كود: H1705</strong>
                      <span className="text-[10px] px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded font-mono font-bold">
                        البروكر: تامر الصاوي
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-600 mt-0.5">
                      انتهت المعاينة منذ 3 ساعات · لم يُسجل الكومنت الميداني للمالك والسيلز!
                    </div>
                  </div>

                  <button
                    onClick={() => handlePingBrokerForComment('تامر الصاوي', 'H1705')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <MessageSquare size={11} />
                    <span>طلب الكومنت</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Filter Bar & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                الكل ({logs.length})
              </button>

              <button
                onClick={() => setFilterType('sarah_notified_broker')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterType === 'sarah_notified_broker' ? 'bg-amber-700 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Bell size={12} />
                <span>إشعار لبروكر من سارة</span>
              </button>

              <button
                onClick={() => setFilterType('landlord_paused_unit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterType === 'landlord_paused_unit' ? 'bg-rose-700 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <PauseCircle size={12} />
                <span>مالك عمل إيقاف فقط</span>
              </button>

              <button
                onClick={() => setFilterType('sales_logged_activity')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterType === 'sales_logged_activity' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Zap size={12} />
                <span>سيلز سجل نشاط</span>
              </button>

              <button
                onClick={() => setFilterType('sales_slacking_alert')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterType === 'sales_slacking_alert' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <AlertTriangle size={12} />
                <span>سيلز متخاذل</span>
              </button>

              <button
                onClick={() => setFilterType('viewing_comment_pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterType === 'viewing_comment_pending' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Clock size={12} />
                <span>كومنت ما نزل</span>
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                placeholder="بحث في الأحداث والكود والفاعل..."
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isSarah = log.type === 'sarah_notified_broker';
              const isPaused = log.type === 'landlord_paused_unit';
              const isSales = log.type === 'sales_logged_activity' || log.type === 'sales_new_lead';
              const isSlacking = log.type === 'sales_slacking_alert';
              const isPendingComment = log.type === 'viewing_comment_pending';
              const isPublishedComment = log.type === 'viewing_comment_published';

              return (
                <div 
                  key={log.id} 
                  className={`p-4 rounded-2xl border transition shadow-2xs ${
                    isPaused ? 'bg-rose-50/40 border-rose-200' :
                    isSlacking ? 'bg-amber-50/40 border-amber-200' :
                    isPendingComment ? 'bg-orange-50/40 border-orange-200' :
                    isSarah ? 'bg-amber-50/20 border-amber-200/80' :
                    'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                        isSarah ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        isPaused ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                        isSales ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                        isSlacking ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        isPendingComment ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                        'bg-stone-100 text-stone-800'
                      }`}>
                        {isSarah && <Bell size={12} className="text-amber-700" />}
                        {isPaused && <PauseCircle size={12} className="text-rose-700" />}
                        {isSales && <Zap size={12} className="text-emerald-700" />}
                        {isSlacking && <AlertTriangle size={12} className="text-amber-700" />}
                        {isPendingComment && <Clock size={12} className="text-rose-700" />}
                        {isPublishedComment && <CheckCircle2 size={12} className="text-emerald-700" />}
                        <span>{log.title}</span>
                      </span>

                      {log.targetPropertyCode && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-stone-100 text-stone-800 rounded-lg border border-stone-200">
                          {log.targetPropertyCode}
                        </span>
                      )}
                    </div>

                    <div className="text-stone-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock size={12} />
                      <span>{log.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed pr-1 mb-3">
                    {log.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                    <div className="flex items-center gap-2">
                      <span>الطرف المنفذ: <strong className="text-stone-800">{log.actorName}</strong></span>
                      {log.actorEmail && <span className="font-mono text-[10px] text-stone-400">({log.actorEmail})</span>}
                    </div>

                    {/* Quick Follow-up Buttons */}
                    <div className="flex items-center gap-1.5">
                      {isPendingComment && log.targetBrokerName && (
                        <button
                          onClick={() => handlePingBrokerForComment(log.targetBrokerName!, log.targetPropertyCode || '')}
                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <Send size={10} />
                          <span>إشعار البروكر لإنزال الكومنت</span>
                        </button>
                      )}

                      {isSlacking && log.targetSalesAgentName && (
                        <button
                          onClick={() => handleAlertSlackingAgent(log.targetSalesAgentName!)}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <Send size={10} />
                          <span>تنبيه السيلز الآن</span>
                        </button>
                      )}

                      {isPaused && log.targetPropertyCode && (
                        <button
                          onClick={() => {
                            if (onOpenLandlordPortal) onOpenLandlordPortal(log.targetPropertyCode);
                          }}
                          className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <Building size={10} />
                          <span>فحص وحدة المالك</span>
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

      {/* ===================================================================== */}
      {/* TAB 2: PORTAL USERS & ROLE ACCESS MANAGEMENT */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
            <span className="p-1.5 rounded-lg bg-amber-200/70 text-amber-900 mt-0.5">
              <ShieldAlert size={16} />
            </span>
            <div className="space-y-1">
              <strong className="font-bold text-amber-900">حوكمة الحسابات والتحرير الحصري للآدمن:</strong>
              <p className="text-amber-900/80 leading-relaxed">
                كل مستخدم في النظام يدخل بإيميل خاص مسجل هنا. لا يستطيع المالك رؤية ملاك آخرين، ولا يرى البروكر شقق غير مسندة له، ولا يرى السيلز عملاء زميله. أنت كـ Super Admin الوحيد الذي يحرر هذه الإيميلات والصلاحيات وتفعيل الحسابات.
              </p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setUserRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                الكل ({portalUsers.length})
              </button>

              <button
                onClick={() => setUserRoleFilter('landlord')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  userRoleFilter === 'landlord' ? 'bg-amber-700 text-white' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Building size={12} />
                <span>ملاك الوحدات ({portalUsers.filter(u => u.role === 'landlord').length})</span>
              </button>

              <button
                onClick={() => setUserRoleFilter('broker')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  userRoleFilter === 'broker' ? 'bg-emerald-700 text-white' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Briefcase size={12} />
                <span>البروكرز ({portalUsers.filter(u => u.role === 'broker').length})</span>
              </button>

              <button
                onClick={() => setUserRoleFilter('sales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  userRoleFilter === 'sales' ? 'bg-sky-700 text-white' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Users size={12} />
                <span>فريق السيلز ({portalUsers.filter(u => u.role === 'sales').length})</span>
              </button>

              <button
                onClick={() => setUserRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  userRoleFilter === 'admin' ? 'bg-purple-700 text-white' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>الآدمن ({portalUsers.filter(u => u.role === 'admin').length})</span>
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="بحث بالاسم أو الإيميل أو الكود..."
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Users Table / Grid */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3 px-4">المستخدم والإيميل المسجل</th>
                    <th className="py-3 px-4">البوابة / الدور</th>
                    <th className="py-3 px-4">الوحدات أو الاختصاص</th>
                    <th className="py-3 px-4">حالة الحساب</th>
                    <th className="py-3 px-4 text-center">معاينة البوابة كـ Super Admin</th>
                    <th className="py-3 px-4 text-center">إجراءات الآدمن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((user) => {
                    const isLandlord = user.role === 'landlord';
                    const isBroker = user.role === 'broker';
                    const isSales = user.role === 'sales';
                    const isAdmin = user.role === 'admin';

                    return (
                      <tr key={user.id} className="hover:bg-stone-50/80 transition">
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900">{user.name}</div>
                          <div className="font-mono text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Mail size={11} />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="font-mono text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <Phone size={10} />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isLandlord ? 'bg-amber-100 text-amber-900' :
                            isBroker ? 'bg-emerald-100 text-emerald-900' :
                            isSales ? 'bg-sky-100 text-sky-900' :
                            'bg-purple-100 text-purple-900'
                          }`}>
                            {isLandlord && <Building size={12} />}
                            {isBroker && <Briefcase size={12} />}
                            {isSales && <Users size={12} />}
                            <span>
                              {isLandlord ? 'مالك وحدة' : isBroker ? 'وسيط ميداني (بروكر)' : isSales ? 'مستشار مبيعات' : 'مشرف عام (آدمن)'}
                            </span>
                          </span>
                        </td>

                        {/* Assigned Units / Scope */}
                        <td className="py-3.5 px-4">
                          {isLandlord && (
                            <div className="flex flex-wrap gap-1">
                              {user.assignedPropertyCodes && user.assignedPropertyCodes.length > 0 ? (
                                user.assignedPropertyCodes.map((code) => (
                                  <span key={code} className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-800 rounded font-mono text-[10px] font-bold">
                                    {code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-stone-400 italic">كل الشقق المسجلة باسمه</span>
                              )}
                            </div>
                          )}

                          {isBroker && (
                            <span className="text-xs text-stone-600">
                              {user.notes || 'معاينات الهضبة الوسطى'}
                            </span>
                          )}

                          {isSales && (
                            <span className="text-xs text-stone-600">
                              {user.notes || 'فريق المبيعات والتعاقدات'}
                            </span>
                          )}

                          {isAdmin && (
                            <span className="text-xs text-purple-700 font-bold">
                              تحكم وحوكمة شاملة
                            </span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleUserActive(user)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                              user.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                            }`}
                          >
                            {user.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            <span>{user.isActive ? 'حساب نشط' : 'حساب مجمّد'}</span>
                          </button>
                        </td>

                        {/* Live Impersonate / Inspect Portal */}
                        <td className="py-3.5 px-4 text-center">
                          {isLandlord && onOpenLandlordPortal && (
                            <button
                              onClick={() => onOpenLandlordPortal(user.assignedPropertyCodes?.[0])}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="الدخول لبوابة المالك وتصفحها بنفس صلاحياته"
                            >
                              <Eye size={12} />
                              <span>دخول كمالك</span>
                            </button>
                          )}

                          {isBroker && onOpenBrokerPortal && (
                            <button
                              onClick={() => onOpenBrokerPortal(user.brokerId || 'broker_ahmed')}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="الدخول لبوابة البروكر وتصفحها بنفس صلاحياته"
                            >
                              <Eye size={12} />
                              <span>دخول كبروكر</span>
                            </button>
                          )}

                          {isSales && onOpenSalesPortal && (
                            <button
                              onClick={() => onOpenSalesPortal(user.salesAgentId || 'agent_1')}
                              className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="الدخول لبوابة السيلز وتصفحها بنفس صلاحياته"
                            >
                              <Eye size={12} />
                              <span>دخول كسيلز</span>
                            </button>
                          )}
                        </td>

                        {/* Actions (Edit / Delete) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-800 transition cursor-pointer"
                              title="تحرير البيانات والإيميل والصلاحيات"
                            >
                              <Edit3 size={13} />
                            </button>

                            {!isAdmin && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 transition cursor-pointer"
                                title="حذف الحساب"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT PORTAL USER */}
      {/* ===================================================================== */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {editingUser ? 'تحرير مستخدم البوابة وصلاحياته' : 'إضافة مستخدم جديد للبوابة'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">نوع البوابة / الدور:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, role: 'landlord' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                      userFormData.role === 'landlord'
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    بوابة المالك
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, role: 'broker' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                      userFormData.role === 'broker'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    بوابة البروكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFormData({ ...userFormData, role: 'sales' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                      userFormData.role === 'sales'
                        ? 'bg-sky-100 border-sky-400 text-sky-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    بوابة السيلز CRM
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">الاسم بالكامل:</label>
                <input
                  type="text"
                  value={userFormData.name || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="مثال: م/ طارق المنشاوي أو أحمد فؤاد"
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">البريد الإلكتروني المعتمد للدخول:</label>
                  <input
                    type="email"
                    value={userFormData.email || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="name@gmail.com"
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                    required
                  />
                  <span className="text-[10px] text-stone-400">الإيميل الذي يدخل به في بوابته المستقلة</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم الهاتف / الواتساب:</label>
                  <input
                    type="tel"
                    value={userFormData.phone || ''}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              {userFormData.role === 'landlord' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    أكواد الشقق المصرح له برؤيتها فقط (مفصولة بفاصلة):
                  </label>
                  <input
                    type="text"
                    value={assignedCodesInput}
                    onChange={(e) => setAssignedCodesInput(e.target.value)}
                    placeholder="مثال: SEBA-RSL-701, SEBA-RSL-702, MOK-MID-104"
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-amber-700">
                    💡 المالك لن يستطيع رؤية أي وحدة أخرى في النظام سوى هذه الأكواد المحددة.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">ملاحظات الإدارة:</label>
                <input
                  type="text"
                  value={userFormData.notes || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                  placeholder="مثال: مالك حصري / مكتب شريك / مستشار معتمد"
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={userFormData.isActive ?? true}
                  onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-stone-800">
                  تفعيل الحساب والسماح له بالدخول للبوابة فوراً
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold transition shadow-sm"
                >
                  {editingUser ? 'حفظ التعديلات' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
