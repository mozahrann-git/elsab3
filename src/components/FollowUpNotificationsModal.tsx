import React, { useState, useMemo } from 'react';
import { Lead, SalesAgent, FollowUpAlert } from '../types';
import { 
  Bell, 
  X, 
  Phone, 
  MessageCircle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Zap, 
  User, 
  RotateCcw,
  Volume2,
  VolumeX,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { generateCallLink, generateWhatsAppLink, formatPrice } from '../utils/helpers';

interface FollowUpNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  agents: SalesAgent[];
  currentAgent: SalesAgent;
  onUpdateLead: (updatedLead: Lead) => void;
  onSelectLead: (lead: Lead) => void;
}

export const FollowUpNotificationsModal: React.FC<FollowUpNotificationsModalProps> = ({
  isOpen,
  onClose,
  leads,
  agents,
  currentAgent,
  onUpdateLead,
  onSelectLead
}) => {
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'today' | 'upcoming'>('all');
  const [filterScope, setFilterScope] = useState<'my_leads' | 'all_team'>('my_leads');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate alerts dynamically from leads data
  // التنبيهات من الوقت الحقيقي بس: ميعاد الأكشن (nextActionAt) قصاد الساعة دلوقتي
  const [nowTick, setNowTick] = useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 30000); return () => clearInterval(t); }, []);
  const alerts: FollowUpAlert[] = useMemo(() => {
    const now = nowTick;
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const fmt = (at: number) => {
      const d = new Date(at), t = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
      const m = Math.round((at - now) / 60000), a = Math.abs(m);
      const rel = a < 60 ? `${a} د` : a < 1440 ? `${Math.round(a / 60)} س` : `${Math.round(a / 1440)} يوم`;
      return { t: at <= endOfDay.getTime() ? `النهارده ${t}` : d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' }) + ` ${t}`, rel: m < 0 ? `متأخر ${rel}` : `بعد ${rel}` };
    };
    const list: FollowUpAlert[] = [];
    leads.forEach((lead) => {
      const at = lead.nextActionAt || 0;
      if (at && lead.followUpStatus !== 'completed') {
        const f = fmt(at);
        list.push({
          id: `followup_${lead.id}`, leadId: lead.id, leadName: lead.name, leadPhone: lead.phone, leadStatus: lead.status,
          assignedAgentId: lead.assignedAgentId, assignedAgentName: lead.assignedAgentName, type: 'follow_up',
          title: `متابعة ${lead.name}`, dueTime: f.t, note: lead.followUpNote || '',
          urgency: at <= now ? 'urgent' : at <= endOfDay.getTime() ? 'today' : 'upcoming',
          relativeTimeText: f.rel, isOverdue: at <= now,
        });
      } else if (lead.status === 'new' && !at) {
        list.push({
          id: `newlead_${lead.id}`, leadId: lead.id, leadName: lead.name, leadPhone: lead.phone, leadStatus: lead.status,
          assignedAgentId: lead.assignedAgentId, assignedAgentName: lead.assignedAgentName, type: 'urgent_lead',
          title: `عميل جديد محتاج أول تواصل`, dueTime: 'دلوقتي', note: '', urgency: 'urgent', relativeTimeText: 'دلوقتي', isOverdue: true,
        });
      }
    });
    return list.sort((x, y) => (leads.find((l) => l.id === x.leadId)?.nextActionAt || 0) - (leads.find((l) => l.id === y.leadId)?.nextActionAt || 0));
  }, [leads, nowTick]);

  // Filter alerts by agent scope, urgency, and search
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Scope filter
      const matchesScope = filterScope === 'all_team' || alert.assignedAgentId === currentAgent.id;

      // Urgency filter
      const matchesUrgency = 
        filterType === 'all' || 
        (filterType === 'urgent' && alert.urgency === 'urgent') ||
        (filterType === 'today' && alert.urgency === 'today') ||
        (filterType === 'upcoming' && alert.urgency === 'upcoming');

      // Search filter
      const matchesSearch = 
        !searchQuery ||
        alert.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.leadPhone.includes(searchQuery) ||
        (alert.note && alert.note.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesScope && matchesUrgency && matchesSearch;
    });
  }, [alerts, filterScope, currentAgent.id, filterType, searchQuery]);

  if (!isOpen) return null;

  // Mark follow-up as completed
  const handleMarkAsDone = (alert: FollowUpAlert) => {
    const lead = leads.find((l) => l.id === alert.leadId);
    if (!lead) return;

    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const updatedNotes = [`[${timestamp}] تمت المتابعة بنجاح (${alert.note || 'تواصل تليفوني'})`, ...(lead.notes || [])];

    onUpdateLead({
      ...lead,
      notes: updatedNotes,
      lastContactDate: 'الآن',
      followUpStatus: 'completed',
      followUpScheduledAt: undefined,
      followUpNote: undefined
    });
  };

  // Snooze / Reschedule follow-up
  const handleSnooze = (alert: FollowUpAlert, snoozeOption: '+1h' | '+tomorrow' | '+2days') => {
    const lead = leads.find((l) => l.id === alert.leadId);
    if (!lead) return;

    let newTimeText = 'اليوم بعد ساعة';
    let urgency: 'urgent' | 'today' | 'upcoming' = 'today';

    if (snoozeOption === '+1h') {
      newTimeText = 'اليوم بعد ساعة واحدة';
      urgency = 'today';
    } else if (snoozeOption === '+tomorrow') {
      newTimeText = 'غداً الساعة 11:00 ص';
      urgency = 'upcoming';
    } else if (snoozeOption === '+2days') {
      newTimeText = 'بعد يومين 12:00 ظهراً';
      urgency = 'upcoming';
    }

    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const updatedNotes = [`[${timestamp}] تم تأجيل المتابعة إلى: ${newTimeText}`, ...(lead.notes || [])];

    onUpdateLead({
      ...lead,
      notes: updatedNotes,
      followUpScheduledAt: newTimeText,
      followUpStatus: 'pending',
      followUpUrgency: urgency
    });
  };

  // Send WhatsApp Follow-up Message
  const handleSendWhatsAppFollowUp = (alert: FollowUpAlert) => {
    const lead = leads.find((l) => l.id === alert.leadId);
    if (!lead) return;

    const message = `أهلاً بحضرتك أستاذ ${lead.name}،
معاك ${currentAgent.name} من شركة السبع للعقارات بالهضبة الوسطى.
بناءً على تواصلنا السابق بخصوص ${lead.interestedPropertyCode ? `الشقة كود (${lead.interestedPropertyCode})` : 'طلبك بالهضبة الوسطى'}، 
حبيت أتابع مع حضرتك هل حابب نحدد موعد معاينة ميدانية اليوم أو تحب أبعت لحضرتك ترشيحات إضافية؟

تحياتي لحضرتك.`;

    const cleanPhone = lead.phone.replace(/\D/g, '');
    window.open(`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const urgentCount = alerts.filter(a => a.urgency === 'urgent' && (filterScope === 'all_team' || a.assignedAgentId === currentAgent.id)).length;
  const todayCount = alerts.filter(a => a.urgency === 'today' && (filterScope === 'all_team' || a.assignedAgentId === currentAgent.id)).length;

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden text-right font-ibm animate-in fade-in duration-150" dir="rtl">
      
      {/* Modal Container */}
      <div className="bg-[#F6F4EF] rounded-3xl w-full max-w-4xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden border border-[#ECE8DF] shadow-2xl">
        
        {/* TOP HEADER */}
        <header className="bg-white border-b border-[#ECE8DF] px-5 sm:px-8 py-4 flex flex-col gap-3.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF4E5] border border-[#E9DFCA] flex items-center justify-center text-[#A07A26] relative shrink-0">
                <Bell size={20} />
                {urgentCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-readex font-bold text-base sm:text-lg text-[#141414]">
                    مركز تنبيهات المتابعات والمعاينات
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-xl bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA]">
                    {filteredAlerts.length} تنبيه
                  </span>
                  {urgentCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                      {urgentCount} عاجل
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B665C] hidden sm:block">
                  تنبيهات فورية للمواعيد المجدولة والمعاينات الميدانية لعملاء الهضبة الوسطى
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          {/* Controls & Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === 'all'
                    ? 'bg-[#141414] text-white shadow-2xs'
                    : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                الكل ({alerts.filter(a => filterScope === 'all_team' || a.assignedAgentId === currentAgent.id).length})
              </button>

              <button
                onClick={() => setFilterType('urgent')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === 'urgent'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-[#F6F4EF] text-rose-700 hover:bg-rose-50'
                }`}
              >
                عاجل ({urgentCount})
              </button>

              <button
                onClick={() => setFilterType('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === 'today'
                    ? 'bg-[#A07A26] text-white shadow-2xs'
                    : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                اليوم ({todayCount})
              </button>

              <button
                onClick={() => setFilterType('upcoming')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === 'upcoming'
                    ? 'bg-[#141414] text-white shadow-2xs'
                    : 'bg-[#F6F4EF] text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                قادمة
              </button>
            </div>

            {/* Scope Switcher & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في التنبيهات..."
                  className="w-full pl-3 pr-8 py-1.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs text-[#141414] focus:outline-none focus:border-[#A07A26]"
                />
                <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
              </div>

              <div className="flex bg-[#F6F4EF] p-1 rounded-xl border border-[#ECE8DF] text-[11px] font-bold shrink-0">
                <button
                  onClick={() => setFilterScope('my_leads')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterScope === 'my_leads' ? 'bg-white text-[#141414] shadow-2xs' : 'text-[#6B665C]'
                  }`}
                >
                  عميلاتي
                </button>
                <button
                  onClick={() => setFilterScope('all_team')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterScope === 'all_team' ? 'bg-white text-[#141414] shadow-2xs' : 'text-[#6B665C]'
                  }`}
                >
                  الفريق
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ALERTS LIST AREA */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#FAF4E5] border border-[#E9DFCA] flex items-center justify-center text-[#A07A26]">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-readex font-bold text-base text-[#141414]">لا توجد تنبيهات معلقة حالياً</h3>
              <p className="text-xs text-[#6B665C] max-w-sm">
                عمل رائع! جميع المتابعات والمعاينات تم إنجازها في مواعيدها.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const lead = leads.find((l) => l.id === alert.leadId);

              return (
                <div 
                  key={alert.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs space-y-3 ${
                    alert.urgency === 'urgent'
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-[#ECE8DF] hover:border-[#A07A26]'
                  }`}
                >
                  {/* Top Header inside alert card */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        alert.urgency === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : alert.urgency === 'today'
                          ? 'bg-[#FAF4E5] text-[#A07A26]'
                          : 'bg-[#F6F4EF] text-[#6B665C]'
                      }`}>
                        {alert.type === 'visit' ? 'معاينة ميدانية' : alert.type === 'urgent_lead' ? 'ليد جديد' : 'متابعة هاتفية'}
                      </span>

                      <span className="font-readex font-bold text-sm text-[#141414]">
                        {alert.leadName}
                      </span>

                      <span className="font-mono text-xs text-[#6B665C] dir-ltr">
                        {alert.leadPhone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#8C877D]">
                      <Clock size={13} />
                      <span>{alert.dueTime}</span>
                    </div>
                  </div>

                  {/* Note / Description */}
                  <p className="text-xs text-[#4A463F] bg-[#FAF9F5] p-3 rounded-xl border border-[#ECE8DF] leading-relaxed">
                    {alert.note}
                  </p>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    {/* Left Direct Communication Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={generateCallLink(alert.leadPhone)}
                        className="px-3.5 py-2 bg-[#141414] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Phone size={13} />
                        <span>اتصال الآن</span>
                      </a>

                      <button
                        onClick={() => handleSendWhatsAppFollowUp(alert)}
                        className="px-3.5 py-2 bg-[#1E7A45] hover:bg-[#166534] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageCircle size={13} />
                        <span>واتساب</span>
                      </button>

                      {lead && (
                        <button
                          onClick={() => {
                            onSelectLead(lead);
                            onClose();
                          }}
                          className="px-3 py-2 bg-[#F6F4EF] hover:bg-[#ECE8DF] text-[#141414] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <User size={13} />
                          <span>الملف الكامل</span>
                        </button>
                      )}
                    </div>

                    {/* Right Mark as Done & Snooze */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSnooze(alert, '+1h')}
                        className="px-2.5 py-1.5 bg-white border border-[#ECE8DF] hover:bg-[#FAF9F5] text-[#6B665C] rounded-lg text-xs font-medium cursor-pointer"
                        title="تأجيل ساعة"
                      >
                        +ساعة
                      </button>
                      <button
                        onClick={() => handleSnooze(alert, '+tomorrow')}
                        className="px-2.5 py-1.5 bg-white border border-[#ECE8DF] hover:bg-[#FAF9F5] text-[#6B665C] rounded-lg text-xs font-medium cursor-pointer"
                        title="تأجيل لغداً"
                      >
                        +غداً
                      </button>
                      <button
                        onClick={() => handleMarkAsDone(alert)}
                        className="px-4 py-2 bg-[#A07A26] hover:bg-[#8B681D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Check size={14} />
                        <span>تمت بنجاح</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
