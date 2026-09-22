import { LeadActionPanel } from './LeadActionPanel';
import { WhenPicker } from './common/WhenPicker';
import React, { useState } from 'react';
import { Lead, Property, SalesAgent, LeadStatus } from '../types';
import { 
  X, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Building, 
  FileText, 
  Plus, 
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  User,
  Eye
} from 'lucide-react';
import { formatPrice, generateWhatsAppLink, generateCallLink } from '../utils/helpers';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  agents: SalesAgent[];
  properties: Property[];
  onUpdateLead: (updatedLead: Lead) => void;
  onOpenAffiliateModal?: (property: Property) => void;
  isAdmin?: boolean;
}

const STAGES: { id: LeadStatus; label: string; badgeStyle: string }[] = [
  { id: 'new', label: 'عميل جديد (New)', badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'contacted', label: 'تم التواصل هاتفياً', badgeStyle: 'bg-[#FAF4E5] text-[#A07A26] border-[#E9DFCA]' },
  { id: 'sent_details', label: 'إرسال صور وتفاصيل الشقق', badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'visit_requested', label: 'معاينة تحت الطلب (تنسيق سارة حنفي)', badgeStyle: 'bg-[#FAF4E5] text-[#9E7A26] border-[#E9DFCA]' },
  { id: 'visit_booked', label: 'معاينة مؤكدة (ميعاد محدد)', badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'visit_done', label: 'تمت المعاينة (+300 XP)', badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'negotiation', label: 'تفاوض ودفع عربون', badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200' },
  { id: 'closed', label: 'صفقة مغلقة (+500 XP)', badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'lost', label: 'غير مهتم / مؤجل', badgeStyle: 'bg-stone-100 text-stone-700 border-stone-200' }
];

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  agents,
  properties,
  onUpdateLead,
  onOpenAffiliateModal,
  isAdmin = false
}) => {
  const [newNote, setNewNote] = useState('');
  const [visitDate, setVisitDate] = useState(lead.visitScheduledAt || '');
  const [visitLoc, setVisitLoc] = useState(lead.visitLocation || 'الهضبة الوسطى - المقطم');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  // Follow-up state
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const [followUpTime, setFollowUpTime] = useState(lead.followUpScheduledAt || '');
  const [followUpNoteText, setFollowUpNoteText] = useState(lead.followUpNote || '');

  if (!isOpen) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG');
    const updatedNotes = [`[${timestamp}] ${newNote.trim()}`, ...(lead.notes || [])];

    onUpdateLead({
      ...lead,
      notes: updatedNotes,
      lastContactDate: 'الآن'
    });

    setNewNote('');
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    onUpdateLead({
      ...lead,
      status: newStatus,
      lastContactDate: 'الآن'
    });
  };

  const handleAssignAgent = (agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;
    onUpdateLead({
      ...lead,
      assignedAgentId: ag.id,
      assignedAgentName: ag.name
    });
  };

  const handleSaveVisitSchedule = () => {
    onUpdateLead({
      ...lead,
      status: 'visit_booked',
      visitScheduledAt: visitDate,
      visitLocation: visitLoc
    });
    setIsEditingSchedule(false);
  };

  const handleSaveFollowUp = () => {
    onUpdateLead({
      ...lead,
      followUpScheduledAt: followUpTime,
      followUpNote: followUpNoteText,
      followUpStatus: 'pending',
      followUpUrgency: followUpTime.includes('اليوم') || followUpTime.includes('الآن') ? 'urgent' : 'upcoming'
    });
    setIsEditingFollowUp(false);
  };

  const handleQuickFollowUp = (preset: '+2h' | '+tomorrow' | '+2days') => {
    let text = 'اليوم بعد ساعتين';
    let urgency: 'urgent' | 'today' | 'upcoming' = 'today';

    if (preset === '+2h') {
      text = 'اليوم بعد ساعتين';
      urgency = 'urgent';
    } else if (preset === '+tomorrow') {
      text = 'غداً الساعة 11:00 ص';
      urgency = 'today';
    } else if (preset === '+2days') {
      text = 'بعد يومين 12:00 ظهراً';
      urgency = 'upcoming';
    }

    onUpdateLead({
      ...lead,
      followUpScheduledAt: text,
      followUpNote: followUpNoteText || 'متابعة هاتفية مع العميل',
      followUpStatus: 'pending',
      followUpUrgency: urgency
    });
    setFollowUpTime(text);
    setIsEditingFollowUp(false);
  };

  // Find linked property in inventory
  const linkedProperty = properties.find((p) => p.code === lead.interestedPropertyCode);
  const cleanPhone = lead.phone.replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-hidden font-ibm" dir="rtl">
      <div 
        className="relative w-full max-w-3xl bg-[#F6F4EF] rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-right text-[#141414] space-y-4 max-h-[94vh] flex flex-col overflow-hidden border border-[#ECE8DF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-2 border-b border-[#ECE8DF] shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold font-readex text-[#141414]">{lead.name}</h2>
              <span className={`text-xs font-bold px-3 py-0.5 rounded-xl border ${STAGES.find(s => s.id === lead.status)?.badgeStyle || 'bg-white border-[#ECE8DF] text-[#6B665C]'}`}>
                {STAGES.find(s => s.id === lead.status)?.label || lead.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B665C]">
              <span className="font-mono text-[#141414] font-bold dir-ltr">{lead.phone}</span>
              <span>·</span>
              <span>المصدر: {lead.source === 'facebook_group' ? 'جروب فيسبوك' : lead.source === 'website_whatsapp' ? 'واتساب المنصة' : 'مكالمة باردة'}</span>
              <span>·</span>
              <span className="font-mono">{lead.createdAt}</span>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-stone-400 hover:text-stone-800 hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Contact & Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <a
            href={generateCallLink(lead.phone)}
            className="p-2.5 bg-[#141414] hover:bg-black text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-2xs"
          >
            <Phone size={14} />
            <span>اتصال هاتفي</span>
          </a>

          <a
            href={`https://wa.me/2${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-[#1E7A45] hover:bg-[#166534] text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-2xs"
          >
            <MessageCircle size={14} />
            <span>واتساب</span>
          </a>

          <button
            onClick={() => setIsEditingSchedule(true)}
            className="p-2.5 bg-[#FAF4E5] border border-[#E9DFCA] hover:bg-[#F3EAD5] text-[#A07A26] rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
          >
            <Calendar size={14} />
            <span>حجز معاينة</span>
          </button>

        </div>

        {/* Scrollable Information Body */}
        <div className="space-y-4 overflow-y-auto pr-0.5 flex-1">
          
          {/* الأكشن الجاي + نقل إلى */}
          <LeadActionPanel lead={lead} stages={STAGES} byName={agents.find((x) => x.id === lead.assignedAgentId)?.name || 'الفريق'} onUpdateLead={onUpdateLead} />

          {/* طلب مسح الليد (السيلز) · الأدمن بيوافق من لوحة السيلز */}
          {!isAdmin && (
            (lead as any).deleteRequest && !(lead as any).deleteRequest.resolved
              ? <p className="text-xs rounded-xl bg-[#FBEDEA] text-[#9A2E1F] p-3 font-bold">طلب المسح مستني موافقة الإدارة</p>
              : <button type="button" onClick={() => {
                  const reason = window.prompt('ليه عايز تمسح العميل ده؟ (مثلاً: متسجل بالغلط، رقم غلط، مكرر)');
                  if (reason && reason.trim()) onUpdateLead({ ...lead, deleteRequest: { by: agents.find((x) => x.id === lead.assignedAgentId)?.name || 'السيلز', reason: reason.trim(), at: Date.now() } } as any);
                }} className="self-start text-xs font-bold text-[#C2412D]">اطلب مسح العميل ده</button>
          )}

          {/* Key Customer Requirements Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white border border-[#ECE8DF] rounded-2xl text-xs shadow-2xs">

            <div className="space-y-0.5">
              <span className="text-[#6B665C] block text-[11px]">الحي المطلوب:</span>
              <strong className="text-[#141414] font-bold block">{lead.preferredNeighborhood || 'الهضبة الوسطى'}</strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[#6B665C] block text-[11px]">الميزانية المتاحة:</span>
              <strong className="text-[#141414] font-bold block">
                {lead.budgetMax ? formatPrice(lead.budgetMax) : 'غير محددة'}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[#6B665C] block text-[11px]">عدد الغرف:</span>
              <strong className="text-[#141414] font-bold block">{lead.preferredBedrooms || 3} غرف</strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[#6B665C] block text-[11px]">حالة التشطيب:</span>
              <strong className="text-[#141414] font-bold block">
                {lead.preferredFinishing === 'finished' ? 'تشطيب سوبر لوكس' : lead.preferredFinishing === 'semi_finished' ? 'نصف تشطيب' : 'أي تشطيب'}
              </strong>
            </div>

            <div className="space-y-0.5">
              <span className="text-[#6B665C] block text-[11px]">آخر تواصل:</span>
              <strong className="text-[#A07A26] font-bold block">{lead.lastContactDate || 'اليوم'}</strong>
            </div>
          </div>

          {/* Site Visit Schedule Box */}
          {(lead.visitScheduledAt || isEditingSchedule) && (
            <div className="p-4 bg-white border border-[#ECE8DF] rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#141414] font-bold text-xs sm:text-sm">
                  <Calendar size={16} className="text-[#A07A26]" />
                  <span>ميعاد ونقطة المعاينة الميدانية للشقة</span>
                </div>
                {!isEditingSchedule && (
                  <button 
                    onClick={() => setIsEditingSchedule(true)}
                    className="text-xs text-[#A07A26] hover:underline font-bold cursor-pointer"
                  >
                    تعديل الميعاد
                  </button>
                )}
              </div>

              {isEditingSchedule ? (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[#141414] block mb-1 font-bold">تاريخ وتوقيت المعاينة:</label>
                    <WhenPicker quick={false} onChange={(v) => setVisitDate(v.label)} />
                    {visitDate && <p className="text-xs text-[#6B665C] mt-1">المختار: <b>{visitDate}</b></p>}
                  </div>
                  <div>
                    <label className="text-[#141414] block mb-1 font-bold">نقطة اللقاء وموقع الشقة:</label>
                    <input
                      type="text"
                      value={visitLoc}
                      onChange={(e) => setVisitLoc(e.target.value)}
                      placeholder="مثال: الحي الثاني - بجوار مدرسة المستقبل"
                      className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingSchedule(false)}
                      className="px-3 py-1.5 bg-[#F6F4EF] rounded-xl text-[#6B665C] font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveVisitSchedule}
                      className="px-4 py-1.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                    >
                      حفظ الميعاد
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#6B665C]">
                    <span>التوقيت:</span>
                    <strong className="text-[#141414] font-bold">{lead.visitScheduledAt}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#6B665C]">
                    <span>الموقع:</span>
                    <strong className="text-[#141414] font-bold">{lead.visitLocation || 'الهضبة الوسطى'}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Field Viewing Broker Report Box */}
          {lead.fieldViewingComment && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs sm:text-sm">
                  <Eye size={16} className="text-amber-700" />
                  <span>تقرير وكومنت المعاينة الميدانية من البروكر</span>
                </div>
                {lead.fieldViewingOutcome && (
                  <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 text-xs font-black rounded-lg">
                    {lead.fieldViewingOutcome === 'interested' ? 'العميل مهتم وجاد' : lead.fieldViewingOutcome === 'made_offer' ? 'قدّم عرض سعر' : lead.fieldViewingOutcome === 'not_suitable' ? 'غير مناسبة' : lead.fieldViewingOutcome}
                  </span>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200/60 text-xs text-stone-900 leading-relaxed font-semibold">
                « {lead.fieldViewingComment} »
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-600 pt-0.5">
                <span>الوسيط المنفذ: <strong className="text-stone-900">{lead.fieldViewingBrokerName || 'أحمد فؤاد'}</strong></span>
                <span>تنسيق: <strong className="text-stone-900">{lead.coordinatorName || 'سارة حنفي'}</strong></span>
                {lead.fieldViewingRecordedAt && <span className="font-mono text-[10px]">{lead.fieldViewingRecordedAt}</span>}
              </div>
            </div>
          )}

          {/* Follow-up Reminder Schedule Box */}
          <div className="p-4 bg-white border border-[#ECE8DF] rounded-2xl space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#141414] font-bold text-xs sm:text-sm">
                <Clock size={16} className="text-[#A07A26]" />
                <span>تنبيه وميعاد المتابعة القادمة</span>
              </div>
              {!isEditingFollowUp && (
                <button 
                  onClick={() => setIsEditingFollowUp(true)}
                  className="text-xs text-[#A07A26] hover:underline font-bold cursor-pointer"
                >
                  {lead.followUpScheduledAt ? 'تعديل موعد المتابعة' : '+ جدولة متابعة جديدة'}
                </button>
              )}
            </div>

            {isEditingFollowUp ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[#141414] block mb-1 font-bold">توقيت المتابعة القادمة:</label>
                  <WhenPicker quick={false} onChange={(v) => setFollowUpTime(v.label)} />
                    {followUpTime && <p className="text-xs text-[#6B665C] mt-1">المختار: <b>{followUpTime}</b></p>}
                </div>

                <div>
                  <label className="text-[#141414] block mb-1 font-bold">هدف المتابعة وملاحظة التذكير:</label>
                  <input
                    type="text"
                    value={followUpNoteText}
                    onChange={(e) => setFollowUpNoteText(e.target.value)}
                    placeholder="مثال: الاتصال لسماع رأيه وتحديد ميعاد المعاينة"
                    className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-[#141414] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#6B665C]">خيارات سريعة:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickFollowUp('+2h')}
                      className="px-2.5 py-1 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] text-[11px] font-bold rounded-xl cursor-pointer"
                    >
                      + ساعتين
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFollowUp('+tomorrow')}
                      className="px-2.5 py-1 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] text-[11px] font-bold rounded-xl cursor-pointer"
                    >
                      + غداً 11 ص
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingFollowUp(false)}
                      className="px-3 py-1.5 bg-[#F6F4EF] rounded-xl text-[#6B665C] font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFollowUp}
                      className="px-4 py-1.5 bg-[#A07A26] hover:bg-[#8B681D] text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                    >
                      حفظ التنبيه
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {lead.followUpScheduledAt ? (
                  <>
                    <div className="flex items-center justify-between text-[#6B665C]">
                      <span>الموعد المحدد:</span>
                      <strong className="text-[#141414] font-bold">{lead.followUpScheduledAt}</strong>
                    </div>
                    {lead.followUpNote && (
                      <div className="flex items-start justify-between text-[#6B665C] gap-2">
                        <span className="shrink-0">المطلوب:</span>
                        <p className="text-[#141414] text-right font-medium">{lead.followUpNote}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between text-[#6B665C]">
                    <span>لم يتم تحديد موعد متابعة قادم</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickFollowUp('+2h')}
                        className="px-2.5 py-1 bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] rounded-xl text-[11px] font-bold cursor-pointer"
                      >
                        + متابعة بعد ساعتين
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linked Property Showcase */}
          {linkedProperty && (
            <div className="p-4 bg-white border border-[#ECE8DF] rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#141414]">
                  <Building size={15} className="text-[#A07A26]" />
                  <span>الوحدة المهتم بها العميل حالياً من المخزون:</span>
                </div>
                {onOpenAffiliateModal && (
                  <button
                    onClick={() => onOpenAffiliateModal(linkedProperty)}
                    className="text-xs text-[#A07A26] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>تجهيز إعلان</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl">
                <img
                  src={linkedProperty.images[0]}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="space-y-0.5 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#A07A26] font-bold">#{linkedProperty.code}</span>
                    <span className="font-bold text-[#141414]">{formatPrice(linkedProperty.price)}</span>
                  </div>
                  <p className="text-[#141414] font-semibold truncate">{linkedProperty.title}</p>
                  <p className="text-[#6B665C] text-[11px]">{linkedProperty.area} م² · {linkedProperty.floor} · {linkedProperty.neighborhood}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes & Activity Log */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs sm:text-sm text-[#141414] flex items-center gap-1.5">
              <FileText size={15} className="text-[#6B665C]" />
              <span>سجل الملاحظات والمكالمات ({lead.notes?.length || 0})</span>
            </h3>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="أضف ملخص المكالمة أو ملاحظات العميل الحالية..."
                className="flex-1 px-4 py-2.5 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#141414] placeholder-[#8C877D] focus:outline-none focus:border-[#A07A26]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#141414] hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>إضافة</span>
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {(!lead.notes || lead.notes.length === 0) ? (
                <p className="text-xs text-[#6B665C] text-center py-3 bg-white border border-[#ECE8DF] rounded-xl">
                  لا توجد ملاحظات مسجلة بعد لهذا العميل
                </p>
              ) : (
                lead.notes.map((n, i) => (
                  <div key={i} className="p-3 bg-white border border-[#ECE8DF] rounded-xl text-xs text-[#4A463F] text-right leading-relaxed shadow-2xs">
                    {n}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex items-center justify-between shrink-0 text-xs border-t border-[#ECE8DF]">
          <span className="text-[#6B665C] font-medium">سيستم السبع للعقارات CRM</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#141414] text-white font-bold rounded-xl hover:bg-black transition-all shadow-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
