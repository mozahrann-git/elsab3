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
import { generateCallLink, generateWhatsAppLink, formatPrice, waLink } from '../utils/helpers';
import { formatWhen } from './common/WhenPicker';
import { buildAlerts, scopeAlerts } from '../utils/followUpAlerts';

interface FollowUpNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  agents: SalesAgent[];
  currentAgent: SalesAgent;
  onUpdateLead: (updatedLead: Lead) => void;
  onSelectLead: (lead: Lead) => void;
  /* الإدارة بس اللي بتشوف تنبيهات الفريق كله. السيلز بيشوف عملاءه هو. */
  canSeeTeam?: boolean;
}

export const FollowUpNotificationsModal: React.FC<FollowUpNotificationsModalProps> = ({
  isOpen,
  onClose,
  leads,
  agents,
  currentAgent,
  onUpdateLead,
  onSelectLead,
  canSeeTeam = false
}) => {
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'today' | 'upcoming'>('all');
  const [rawScope, setRawScope] = useState<'my_leads' | 'all_team'>('my_leads');
  /* حتى لو الحالة اتغيّرت بأي طريقة، السيلز بيفضل على عملاءه هو */
  const filterScope: 'my_leads' | 'all_team' = canSeeTeam ? rawScope : 'my_leads';
  const setFilterScope = (v: 'my_leads' | 'all_team') => { if (canSeeTeam) setRawScope(v); };
  const [searchQuery, setSearchQuery] = useState('');

  // Generate alerts dynamically from leads data
  // التنبيهات من الوقت الحقيقي بس: ميعاد الأكشن (nextActionAt) قصاد الساعة دلوقتي
  const [nowTick, setNowTick] = useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 30000); return () => clearInterval(t); }, []);
  /* نفس الدالة اللي الجرس بيستخدمها — عشان الرقمين ما يختلفوش تاني */
  const alerts = useMemo(() => buildAlerts(leads, nowTick), [leads, nowTick]);

  // Filter alerts by agent scope, urgency, and search
  /* تنبيهات الشخص الداخل — الأساس اللي كل العدادات بتتبني منه */
  const scoped = useMemo(
    () => scopeAlerts(alerts, currentAgent?.id, filterScope === 'all_team'),
    [alerts, currentAgent, filterScope],
  );

  const filteredAlerts = useMemo(() => {
    return scoped.filter((alert) => {
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

      return matchesUrgency && matchesSearch;
    });
  }, [scoped, filterType, searchQuery]);

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
      nextActionAt: null,
      followUpScheduledAt: undefined,
      followUpNote: undefined,
      activity: [{ at: Date.now(), by: currentAgent.name, outcome: 'تمت المتابعة', comment: alert.note || 'تواصل تليفوني' }, ...((lead.activity as any[]) || [])].slice(0, 80)
    } as Lead);
  };

  // Snooze / Reschedule follow-up
  // تأجيل المتابعة: بيتسجل بوقت حقيقي + سطر في رحلة العميل + عدّاد التأجيل
  const handleSnooze = (alert: FollowUpAlert, snoozeOption: '+1h' | '+tomorrow' | '+2days') => {
    const lead = leads.find((l) => l.id === alert.leadId);
    if (!lead) return;

    let newAt = Date.now() + 60 * 60 * 1000;
    if (snoozeOption === '+tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); newAt = d.getTime();
    } else if (snoozeOption === '+2days') {
      const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(12, 0, 0, 0); newAt = d.getTime();
    }

    const oldAt = lead.nextActionAt || 0;
    const postponed = !!(oldAt && newAt > oldAt);
    const outcome = postponed
      ? `تأجيل من ${formatWhen(oldAt)} لـ ${formatWhen(newAt)}`
      : `تحديد متابعة ${formatWhen(newAt)}`;
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    onUpdateLead({
      ...lead,
      notes: [`[${timestamp}] ${outcome}`, ...(lead.notes || [])],
      activity: [{ at: Date.now(), by: currentAgent.name, outcome, comment: lead.followUpNote || '', nextAt: newAt }, ...((lead.activity as any[]) || [])].slice(0, 80),
      snoozeCount: (lead.snoozeCount || 0) + (postponed ? 1 : 0),
      nextActionAt: newAt,
      followUpScheduledAt: formatWhen(newAt),
      followUpStatus: 'pending',
      followUpUrgency: newAt - Date.now() < 3 * 3600 * 1000 ? 'urgent' : 'upcoming'
    } as Lead);
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
    window.open(waLink(`2${cleanPhone}`, message), '_blank');
  };

  const urgentCount = scoped.filter((a) => a.urgency === 'urgent').length;
  const todayCount = scoped.filter((a) => a.urgency === 'today').length;

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
                    {scoped.length} تنبيه
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
                الكل ({scoped.length})
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

              {canSeeTeam && (
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
              )}
            </div>
          </div>
        </header>

        {/* ALERTS LIST AREA */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="bg-white border border-[#ECE8DF] rounded-2xl overflow-hidden">
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

              /* التأخير بيتقال بشريط رفيع على الحافة ولون الوقت — مش بملء
                 الكارت بالأحمر. ١٤ صف كلهم أحمر معناه إن محدش هيبص لحد. */
              const rail = alert.isOverdue
                ? (alert.lateMinutes > 1440 ? '#9E2A1B' : '#C2410C')
                : alert.urgency === 'today' ? '#A07A26' : '#DCD6CA';

              return (
                <article
                  key={alert.id}
                  className="relative bg-white border-b border-[#EFEBE3] last:border-b-0 py-4 pr-5 pl-3 sm:pl-4 hover:bg-[#FCFBF8] transition-colors"
                >
                  {/* شريط الحافة: سُمكه ولونه هما كل الإنذار */}
                  <span
                    aria-hidden
                    className="absolute top-4 bottom-4 right-0 rounded-full"
                    style={{ width: alert.isOverdue ? 3 : 2, background: rail }}
                  />

                  {/* السطر الأول: الاسم الكبير، والوقت على الناحية التانية */}
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-readex font-bold text-[15px] text-[#141414] leading-tight truncate">
                      {alert.leadName}
                    </h4>
                    <span
                      className="text-[12px] font-bold shrink-0"
                      style={{ color: alert.isOverdue ? rail : '#8C877D' }}
                    >
                      {alert.isOverdue && alert.lateMinutes > 0 ? alert.relativeTimeText : alert.dueTime}
                    </span>
                  </div>

                  {/* السطر التاني: التليفون، السيلز المسؤول، ونوع التنبيه */}
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className="text-[11.5px] text-[#6B665C] truncate">
                      <span className="font-mono dir-ltr">{alert.leadPhone}</span>
                      {alert.assignedAgentName && (
                        <>
                          <span className="mx-1.5 text-[#DCD6CA]">|</span>
                          <span className="font-bold text-[#141414]">{alert.assignedAgentName}</span>
                        </>
                      )}
                    </p>
                    <span className="text-[11px] text-[#8C877D] shrink-0">
                      {alert.isOverdue && alert.lateMinutes > 0
                        ? `كان ${alert.dueTime}`
                        : alert.type === 'urgent_lead' ? 'عميل جديد' : 'متابعة'}
                    </span>
                  </div>

                  {/* الملاحظة: نص عادي، مش صندوق جوه صندوق */}
                  {alert.note && (
                    <p className="text-[12.5px] text-[#4A463F] leading-relaxed mt-2 line-clamp-2">
                      {alert.note}
                    </p>
                  )}

                  {/* أكشن واحد واضح، والباقي أيقونات هادية */}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    {alert.isOverdue || alert.urgency === 'urgent' ? (
                      <button
                        onClick={() => { if (lead) { onSelectLead(lead); onClose(); } }}
                        className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-black text-white text-[12px] font-bold transition-colors cursor-pointer"
                      >
                        سجّل النتيجة
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#A8A298]">يفتح {alert.relativeTimeText}</span>
                    )}

                    <div className="flex items-center gap-1">
                      <a
                        href={generateCallLink(alert.leadPhone)}
                        title="اتصال"
                        className="w-9 h-9 rounded-xl border border-[#ECE8DF] text-[#141414] flex items-center justify-center hover:bg-[#F6F4EF] transition-colors"
                      >
                        <Phone size={15} />
                      </a>
                      <button
                        onClick={() => handleSendWhatsAppFollowUp(alert)}
                        title="واتساب"
                        className="w-9 h-9 rounded-xl border border-[#ECE8DF] text-[#1E7A45] flex items-center justify-center hover:bg-[#EEF5F0] transition-colors cursor-pointer"
                      >
                        <MessageCircle size={15} />
                      </button>
                      {lead && (
                        <button
                          onClick={() => { onSelectLead(lead); onClose(); }}
                          title="الملف الكامل"
                          className="w-9 h-9 rounded-xl border border-[#ECE8DF] text-[#6B665C] flex items-center justify-center hover:bg-[#F6F4EF] transition-colors cursor-pointer"
                        >
                          <User size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
          </div>
        </div>

      </div>

    </div>
  );
};
