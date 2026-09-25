import { LeadActionPanel } from './LeadActionPanel';
import { WhenPicker, formatWhen, relTime } from './common/WhenPicker';
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
import { createUnitViewing } from '../services/portalService';

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
  const [visitAt, setVisitAt] = useState<number | null>(null);
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitError, setVisitError] = useState('');
  const [visitLoc, setVisitLoc] = useState(lead.visitLocation || 'الهضبة الوسطى - المقطم');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

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

  // حجز المعاينة: بيتسجل عند العميل وبيروح لجدول التنسيق (سارة) في نفس الوقت
  const handleSaveVisitSchedule = async () => {
    if (!visitDate) { setVisitError('حدد ميعاد المعاينة الأول'); return; }
    setVisitSaving(true); setVisitError('');
    const prop = properties.find((p) => p.code === lead.interestedPropertyCode);

    onUpdateLead({
      ...lead,
      status: 'visit_requested',
      visitScheduledAt: visitDate,
      visitLocation: visitLoc,
      ...(visitAt ? { nextActionAt: visitAt } : {}),
      followUpStatus: 'pending',
      followUpNote: `معاينة تحت التنسيق${prop ? ` على ${prop.code}` : ''} — ${visitDate}`,
      activity: [{
        at: Date.now(), by: lead.assignedAgentName || 'السيلز',
        outcome: `طلب معاينة${prop ? ` · ${prop.code}` : ''}`, comment: `${visitDate} · ${visitLoc}`,
        ...(visitAt ? { nextAt: visitAt } : {})
      }, ...((lead.activity as any[]) || [])].slice(0, 80)
    } as Lead);

    if (prop) {
      try {
        await createUnitViewing({
          propertyId: prop.id, propertyCode: prop.code, propertyTitle: prop.title, brokerId: (prop as any).brokerId,
          scheduledText: visitDate, ...(visitAt ? { scheduledAt: visitAt } : {}),
          clientNote: visitLoc, ownerName: '',
          salesAgentId: lead.assignedAgentId, salesAgentName: lead.assignedAgentName,
          leadId: lead.id, leadName: lead.name,
        } as any);
      } catch {
        setVisitError('اتسجلت عند العميل، بس مش قادرة توصل لجدول التنسيق — بلّغ سارة يدوي');
        setVisitSaving(false);
        return;
      }
    } else {
      setVisitError('العميل مش مربوط بكود شقة، فالمعاينة اتسجلت عنده بس ومروحتش للتنسيق');
      setVisitSaving(false);
      return;
    }

    setVisitSaving(false);
    setIsEditingSchedule(false);
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
                    <WhenPicker quick={false} onChange={(v) => { setVisitDate(v.label); setVisitAt(v.at); }} />
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
                      disabled={visitSaving}
                      className="px-4 py-1.5 bg-[#A07A26] hover:bg-[#8B681D] disabled:opacity-50 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                    >
                      {visitSaving ? 'بيتبعت للتنسيق...' : 'حفظ وابعت للتنسيق'}
                    </button>
                  </div>
                  {visitError && <p className="text-[11px] text-[#C2412D] font-bold">{visitError}</p>}
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

          {/* ميعاد المتابعة القادمة — عرض فقط، التغيير بيتم من بوكس "نقل وتسجيل" فوق عشان يتسجل */}
          <div className="p-4 bg-white border border-[#ECE8DF] rounded-2xl space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[#141414] font-bold text-xs sm:text-sm">
              <Clock size={16} className="text-[#A07A26]" />
              <span>تنبيه وميعاد المتابعة القادمة</span>
            </div>
            {lead.nextActionAt ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#6B665C]">
                  <span>الموعد المحدد:</span>
                  <strong className={`font-bold ${lead.nextActionAt < Date.now() ? 'text-[#C2412D]' : 'text-[#141414]'}`}>
                    {formatWhen(lead.nextActionAt)} · {relTime(lead.nextActionAt)}
                  </strong>
                </div>
                {lead.followUpNote && (
                  <div className="flex items-start justify-between text-[#6B665C] gap-2">
                    <span className="shrink-0">المطلوب:</span>
                    <p className="text-[#141414] text-right font-medium">{lead.followUpNote}</p>
                  </div>
                )}
                {(lead.snoozeCount || 0) > 0 && (
                  <p className="text-[11px] text-[#6E5418]">اتأجل {lead.snoozeCount} مرة</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#6B665C]">مفيش ميعاد متابعة قادم</p>
            )}
            <p className="text-[11px] text-[#8C877D] pt-1 border-t border-[#F0ECE4]">
              لتغيير الميعاد استخدم بوكس «نقل وتسجيل» فوق — أي تغيير لازم يتسجل بكومنت.
            </p>
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
