import React, { useState, useMemo, useEffect } from 'react';
import { 
  Briefcase, 
  X, 
  Check, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Sparkles, 
  Star, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Copy,
  Share2,
  Lock,
  UserCheck,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  Send,
  Eye,
  PlusCircle,
  Edit3,
  CheckCheck,
  RefreshCw,
  Info,
  FileCheck,
  ThumbsUp,
  ThumbsDown,
  User,
  Activity
} from 'lucide-react';
import { Property, HadabaWostaNeighborhood, ViewingRequest, ViewingFeedback, BrokerProfile } from '../types';
import { formatPrice, generateWhatsAppLink } from '../utils/helpers';

export interface BrokerShowingRequest {
  id: string;
  propertyCode: string;
  propertyTitle: string;
  propertyArea: number;
  neighborhood: string;
  requestedDateTime: string;
  ownerName: string;
  ownerPhone: string; // Confidential - visible only to Broker and Admin
  clientName: string;
  clientPhone?: string;
  requestingSalesAgentName?: string; // المستشار السيلز الذي طلب المعاينة
  commissionAmount: number;
  stage: 'new_request' | 'owner_contacted' | 'owner_responded' | 'sara_confirming' | 'confirmed' | 'completed' | 'rescheduled' | 'cancelled';
  ownerResponseStatus?: 'approved' | 'alternative_time' | 'declined';
  ownerAlternativeTime?: string;
  notes?: string;
  // Field Feedback details submitted by Broker
  feedbackReport?: {
    buyerInterestLevel: 'high' | 'medium' | 'low';
    viewingOutcome: string;
    clientImpression: string;
    priceOpinion: 'fair' | 'slightly_high' | 'overpriced';
    starRating: number;
    brokerNotes: string;
    submittedAt: string;
  };
}

interface BrokerPortalPageProps {
  isOpen: boolean;
  onClose: () => void;
  properties?: Property[];
  onNotifyAdmin?: (message: string) => void;
  showToast?: (msg: string) => void;
  inspectBrokerId?: string | null;
  onExitInspection?: () => void;
  brokersList?: BrokerProfile[];
  onUpdateBrokersList?: (brokers: BrokerProfile[]) => void;
  onViewingCompleted?: (request: ViewingRequest, outcomeFeedback: string, viewingOutcome: string) => void;
}

type TabType = 'requests' | 'my_units' | 'showings_commissions';

export const BrokerPortalPage: React.FC<BrokerPortalPageProps> = ({
  isOpen,
  onClose,
  properties = [],
  onNotifyAdmin,
  showToast = (msg: string) => console.log(msg),
  inspectBrokerId,
  onExitInspection,
  onViewingCompleted
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  
  // Modal for writing Showing Feedback
  const [activeFeedbackReq, setActiveFeedbackReq] = useState<BrokerShowingRequest | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackOutcome, setFeedbackOutcome] = useState<string>('interested');
  const [feedbackPriceOpinion, setFeedbackPriceOpinion] = useState<'fair' | 'slightly_high' | 'overpriced'>('fair');
  const [feedbackTags, setFeedbackTags] = useState<string[]>(['التشطيب ممتاز', 'الموقع هادئ']);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  // Requests in the broker showing pipeline
  const [showingRequests, setShowingRequests] = useState<BrokerShowingRequest[]>([
    {
      id: 'req-01',
      propertyCode: 'H1705',
      propertyTitle: 'شقة 140م² نصف تشطيب بحري',
      propertyArea: 140,
      neighborhood: 'الحي الأول',
      requestedDateTime: 'غداً الأحد 6:00 مساءً',
      ownerName: 'أ. طارق عبد العزيز',
      ownerPhone: '01098765432',
      clientName: 'أ. هيثم فاروق',
      clientPhone: '01012345678',
      requestingSalesAgentName: 'زياد طارق (مستشار السيلز)',
      commissionAmount: 40000,
      stage: 'new_request',
    },
    {
      id: 'req-02',
      propertyCode: 'H2410',
      propertyTitle: 'شقة 165م² سوبر لوكس',
      propertyArea: 165,
      neighborhood: 'الحي الثاني',
      requestedDateTime: 'اليوم 5:30 مساءً',
      ownerName: 'م. عصام الشناوي',
      ownerPhone: '01123456789',
      clientName: 'د. شريف عادل',
      clientPhone: '01198765432',
      requestingSalesAgentName: 'ريم عادل (مستشارة السيلز)',
      commissionAmount: 49375,
      stage: 'confirmed',
      notes: 'تم تأكيد الموعد النهائي مع العميل والمالك، جاهز لتنفيذ المعاينة'
    },
    {
      id: 'req-03',
      propertyCode: 'H3109',
      propertyTitle: 'شقة 150م² واجهة على حديقة',
      propertyArea: 150,
      neighborhood: 'الحي الثالث',
      requestedDateTime: 'الخميس الماضي 7:00 م',
      ownerName: 'د. خالد توفيق',
      ownerPhone: '01234567890',
      clientName: 'م. تامر الجوهري',
      clientPhone: '01255554433',
      requestingSalesAgentName: 'زياد طارق (مستشار السيلز)',
      commissionAmount: 42500,
      stage: 'completed',
      feedbackReport: {
        buyerInterestLevel: 'high',
        viewingOutcome: 'interested',
        clientImpression: 'العميل معجب جداً بتقسيم الشقة والإطلالة البحرية',
        priceOpinion: 'fair',
        starRating: 5,
        brokerNotes: 'تمت المعاينة بنجاح، العميل طلب تجهيز مسودة العقد للتفاوض على طريقة السداد',
        submittedAt: 'الخميس الماضي 8:30 م'
      }
    }
  ]);

  // Broker's exclusive units listed with El-Seba3
  const [brokerUnits] = useState([
    {
      id: 'b-unit-1',
      code: 'H1705',
      title: 'شقة 140م² نصف تشطيب بحري',
      neighborhood: 'الحي الأول',
      area: 140,
      price: 3200000,
      ownerName: 'أ. طارق عبد العزيز',
      ownerPhone: '01098765432',
      status: 'active',
      views: 312,
      leads: 18,
      showingsCount: 3,
      commissionShare: 40000,
    },
    {
      id: 'b-unit-2',
      code: 'H2410',
      title: 'شقة 165م² سوبر لوكس بجوار ريتاج',
      neighborhood: 'الحي الثاني',
      area: 165,
      price: 3950000,
      ownerName: 'م. عصام الشناوي',
      ownerPhone: '01123456789',
      status: 'active',
      views: 450,
      leads: 27,
      showingsCount: 5,
      commissionShare: 49375,
    },
    {
      id: 'b-unit-3',
      code: 'H3109',
      title: 'شقة 150م² واجهة على حديقة',
      neighborhood: 'الحي الثالث',
      area: 150,
      price: 3400000,
      ownerName: 'د. خالد توفيق',
      ownerPhone: '01234567890',
      status: 'active',
      views: 280,
      leads: 14,
      showingsCount: 2,
      commissionShare: 42500,
    }
  ]);

  // Handle WhatsApp message to the owner
  const handleSendWhatsAppToOwner = (req: BrokerShowingRequest) => {
    const defaultMsg = `مساء الخير يا فندم (أ. ${req.ownerName})، بخصوص شقتك المعروضة معنا بالهضبة الوسطى كود (${req.propertyCode}) في (${req.neighborhood})، هل متاح معاينة مع عميل مهتم ${req.requestingSalesAgentName ? `(مرشح من ${req.requestingSalesAgentName})` : ''} يوم ${req.requestedDateTime}؟ برجاء إفادتي للتأكيد مع إدارة الحجوزات.`;
    
    setShowingRequests(prev => prev.map(r => {
      if (r.id === req.id && r.stage === 'new_request') {
        return { ...r, stage: 'owner_contacted' };
      }
      return r;
    }));

    if (showToast) showToast('جاري فتح محادثة واتساب مع المالك بالرسالة الجاهزة...');
    const link = generateWhatsAppLink(`+20${req.ownerPhone.replace(/^0/, '')}`, defaultMsg);
    window.open(link, '_blank');
  };

  // Handle recording Owner's Response in portal
  const handleRecordOwnerResponse = (reqId: string, status: 'approved' | 'alternative_time' | 'declined', altTime?: string) => {
    setShowingRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          stage: 'owner_responded',
          ownerResponseStatus: status,
          ownerAlternativeTime: status === 'alternative_time' ? (altTime || 'موعد بديل يحدده المالك') : undefined
        };
      }
      return r;
    }));

    const statusText = status === 'approved' 
      ? 'المالك وافق على الميعاد' 
      : status === 'alternative_time' 
      ? `المالك طلب موعد بديل (${altTime || 'موعد بديل'})` 
      : 'المالك اعتذر عن الموعد';

    if (showToast) showToast(`تم تسجيل رد المالك: ${statusText}. تم إشعار سارة ومستشار السيلز والآدمن.`);
    if (onNotifyAdmin) {
      onNotifyAdmin(`تحديث من البروكر لطلب الشقة ${reqId}: ${statusText}. سارة تتولى التنسيق.`);
    }
  };

  // Open feedback submission modal
  const handleOpenFeedbackModal = (req: BrokerShowingRequest) => {
    setActiveFeedbackReq(req);
    setFeedbackRating(5);
    setFeedbackOutcome('interested');
    setFeedbackPriceOpinion('fair');
    setFeedbackTags(['التشطيب ممتاز', 'الموقع هادئ']);
    setFeedbackNotes(`تمت المعاينة مع العميل ${req.clientName}. العميل أشاد بالموقع وجاهزية الشقة.`);
  };

  // Submit Feedback from Broker
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackReq) return;

    const timeString = 'اليوم ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const fullComment = `${feedbackNotes} | رأي السعر: ${feedbackPriceOpinion === 'fair' ? 'مناسب وعادل' : feedbackPriceOpinion === 'slightly_high' ? 'مرتفع قليلاً' : 'أعلى من السوق'} | تقييم: ★${feedbackRating}/5`;

    // 1. Update local request stage to completed
    setShowingRequests(prev => prev.map(r => {
      if (r.id === activeFeedbackReq.id) {
        return {
          ...r,
          stage: 'completed',
          feedbackReport: {
            buyerInterestLevel: feedbackOutcome === 'interested' ? 'high' : 'medium',
            viewingOutcome: feedbackOutcome,
            clientImpression: feedbackNotes,
            priceOpinion: feedbackPriceOpinion,
            starRating: feedbackRating,
            brokerNotes: fullComment,
            submittedAt: timeString
          }
        };
      }
      return r;
    }));

    // 2. Persist in global viewing feedbacks (LocalStorage + Firebase trigger)
    try {
      const raw = localStorage.getItem('lion_viewing_feedbacks');
      const list: ViewingFeedback[] = raw ? JSON.parse(raw) : [];
      const newFeedback: ViewingFeedback = {
        id: 'fb_' + Date.now(),
        propertyCode: activeFeedbackReq.propertyCode,
        date: timeString,
        agentName: 'أحمد فؤاد (البروكر المنفذ)',
        brokerName: 'أحمد فؤاد',
        requestingSalesAgentName: activeFeedbackReq.requestingSalesAgentName || 'مستشار المبيعات',
        showingStatus: 'completed',
        summary: fullComment,
        buyerInterestLevel: feedbackOutcome === 'interested' ? 'high' : 'medium',
        priceFeedback: feedbackPriceOpinion,
        outcome: feedbackOutcome,
        clientName: activeFeedbackReq.clientName
      };
      localStorage.setItem('lion_viewing_feedbacks', JSON.stringify([newFeedback, ...list]));
    } catch {
      // ignore
    }

    // 3. Trigger callback if passed from App.tsx to sync directly with Sales CRM Leads
    if (onViewingCompleted) {
      const vReq: ViewingRequest = {
        id: activeFeedbackReq.id,
        propertyId: 'prop_' + activeFeedbackReq.propertyCode,
        propertyCode: activeFeedbackReq.propertyCode,
        propertyTitle: activeFeedbackReq.propertyTitle,
        propertyNeighborhood: activeFeedbackReq.neighborhood,
        propertyPrice: 0,
        propertyArea: activeFeedbackReq.propertyArea,
        clientName: activeFeedbackReq.clientName,
        clientPhone: activeFeedbackReq.clientPhone || '01012345678',
        clientPreferredTime: activeFeedbackReq.requestedDateTime,
        brokerId: 'broker_ahmed',
        brokerName: 'أحمد فؤاد',
        status: 'completed',
        createdAt: activeFeedbackReq.requestedDateTime,
        createdAtTimestamp: Date.now(),
        remindersSent: 0,
        outcome: feedbackOutcome,
        outcomeFeedback: fullComment
      };
      onViewingCompleted(vReq, fullComment, feedbackOutcome);
    }

    if (showToast) {
      showToast(`✓ تم تسجيل الفيدباك وظهوره مباشرة في CRM السيلز (${activeFeedbackReq.requestingSalesAgentName || 'المبيعات'}) وبوابة المالك!`);
    }

    setActiveFeedbackReq(null);
  };

  // WhatsApp to Sara / Admin
  const handleContactSara = (msg?: string) => {
    const text = msg || 'مرحباً أستاذة سارة، بخصوص طلبات معاينة شققي المعروضة وتأكيد المواعيد مع العملاء.';
    const link = generateWhatsAppLink('+201017400078', text);
    window.open(link, '_blank');
  };

  const pendingRequestsCount = showingRequests.filter(r => r.stage === 'new_request' || r.stage === 'owner_contacted' || r.stage === 'confirmed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F6F4EF] overflow-y-auto min-h-screen text-[#141414] antialiased selection:bg-amber-200">
      
      {/* 1. Header Bar (Dark & Refined) */}
      <header className="sticky top-0 z-50 bg-[#121212] text-white border-b border-stone-800 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Right: Emblem & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-500/30 flex items-center justify-center text-[#E5B842] font-black shadow-xs">
              <Briefcase size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white font-readex tracking-tight">
                بوابة المسوقين والوسطاء
              </h1>
              <p className="text-[11px] font-medium text-[#E5B842]">
                أهلاً أستاذ [أحمد - شريك معتمد]
              </p>
            </div>
          </div>

          {/* Left: Tab Switchers / Pills & Close */}
          <div className="flex items-center gap-2">
            
            {/* 3 Nav Pills */}
            <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-full border border-stone-800 text-xs">
              
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'requests'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <span>طلبات المعاينة</span>
                {pendingRequestsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('my_units')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'my_units'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                شققك المعروضة
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('showings_commissions')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'showings_commissions'
                    ? 'bg-[#E5B842] text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                المعاينات والعمولات
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="رجوع للموقع"
            >
              <X size={20} />
            </button>
          </div>

        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 py-6 space-y-4 font-sans pb-16">
        
        {/* ========================================================================= */}
        {/* TAB 1: مسار وطلبات المعاينة التفاعلية وكتابة الفيدباك للـ CRM */}
        {/* ========================================================================= */}
        {activeTab === 'requests' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Top Workflow Explanation Alert */}
            <div className="bg-[#1C1917] text-white p-4 rounded-2xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E5B842] flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-400" />
                  <span>دورة المعاينة والفيدباك مع الـ CRM</span>
                </span>
                <span className="text-[11px] text-stone-400">ربط فوري</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-stone-200 leading-relaxed">
                عندما يطلب السيلز معاينة على شقتك، يوصل إشعار فوري لك وللآدمن ولسارة. بعد إتمام المعاينة، اكتب الفيدباك بالأسفل وهيظهر تلقائياً في CRM السيلز وبوابة المالك!
              </p>
            </div>

            {/* List of Incoming Showing Requests */}
            <div className="space-y-4">
              {showingRequests.map((req) => {
                return (
                  <div key={req.id} className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
                    
                    {/* Header of Request Card */}
                    <div className="p-4 bg-[#FAF8F5] border-b border-stone-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#141414] text-[#E5B842] font-mono text-xs font-bold rounded-md">
                            {req.propertyCode}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-stone-900 font-readex">
                            {req.propertyTitle}
                          </h3>
                        </div>
                        <p className="text-[11px] text-stone-500 pt-0.5">
                          {req.neighborhood} · عمولتك المحجوزة: <span className="font-bold text-[#A07A26]">{formatPrice(req.commissionAmount)} ج.م</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {req.stage === 'new_request' && (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full animate-pulse">
                            طلب سيلز جديد
                          </span>
                        )}
                        {req.stage === 'owner_contacted' && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-full">
                            بانتظار رد المالك
                          </span>
                        )}
                        {req.stage === 'confirmed' && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-bold rounded-full flex items-center gap-1">
                            <CheckCheck size={13} />
                            <span>جاهزة للتنفيذ</span>
                          </span>
                        )}
                        {req.stage === 'completed' && (
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 text-[11px] font-bold rounded-full flex items-center gap-1">
                            <FileCheck size={13} />
                            <span>تم تسجيل الفيدباك</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body: Sales Agent & Customer Info & Requested Date */}
                    <div className="p-4 sm:p-5 space-y-4">
                      
                      {/* Requesting Sales Agent & Client Box */}
                      <div className="p-3 bg-[#F6F4EF] rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-stone-500">طلب المعاينة وارد من السيلز:</span>
                          <span className="font-bold text-stone-900">{req.requestingSalesAgentName || 'مستشار السيلز'}</span>
                        </div>
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-stone-500">اسم العميل وموعد المعاينة:</span>
                          <span className="font-bold text-amber-900">{req.clientName} ({req.requestedDateTime})</span>
                        </div>
                      </div>

                      {/* Confidential Owner Box (Broker & Admin Only) */}
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <Lock size={12} className="text-amber-700" />
                            <span>بيانات مالك الشقة (سرية للبروكر فقط):</span>
                          </span>
                          <span className="text-stone-500 font-mono text-[11px]">{req.ownerPhone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-bold text-stone-900">
                            {req.ownerName}
                          </p>
                          
                          {/* Step 1: Send WhatsApp Button to Owner */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppToOwner(req)}
                            className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <MessageCircle size={14} />
                            <span>واتساب المالك برسالة جاهزة</span>
                          </button>
                        </div>
                      </div>

                      {/* Step 2: Record Owner Response UI */}
                      {req.stage === 'new_request' || req.stage === 'owner_contacted' ? (
                        <div className="space-y-2 pt-1">
                          <label className="text-xs font-bold text-stone-700 block">
                            سجل رد المالك بعد التواصل معه:
                          </label>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleRecordOwnerResponse(req.id, 'approved')}
                              className="py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center bg-stone-50 text-stone-700 border border-stone-200 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              ✓ وافق عالطلب
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const custom = prompt('اكتب الموعد البديل الذي حدده المالك:', 'الأربعاء 6:00 مساءً');
                                if (custom) {
                                  handleRecordOwnerResponse(req.id, 'alternative_time', custom);
                                }
                              }}
                              className="py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center bg-stone-50 text-stone-700 border border-stone-200 hover:bg-amber-50 hover:text-amber-800"
                            >
                              ⏳ ميعاد بديل
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRecordOwnerResponse(req.id, 'declined')}
                              className="py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center bg-stone-50 text-stone-700 border border-stone-200 hover:bg-rose-50 hover:text-rose-800"
                            >
                              ✕ اعتذر
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Step 3: Write Feedback Button (Triggered when Confirmed or Ready) */}
                      {req.stage === 'confirmed' && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenFeedbackModal(req)}
                            className="w-full py-3 bg-[#A07A26] hover:bg-[#8B691F] text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer text-center shadow-2xs flex items-center justify-center gap-2"
                          >
                            <FileCheck size={16} />
                            <span>كتابة فيدباك وتقرير المعاينة الميدانية (لـ CRM السيلز)</span>
                          </button>
                        </div>
                      )}

                      {/* Completed Feedback Display */}
                      {req.stage === 'completed' && req.feedbackReport && (
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-indigo-900 font-bold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-indigo-600" />
                              <span>تقرير المعاينة المسجل (ظاهر في CRM السيلز):</span>
                            </span>
                            <span className="text-amber-600 font-black">★ {req.feedbackReport.starRating}/5</span>
                          </div>
                          <p className="text-stone-800 font-medium leading-relaxed">
                            « {req.feedbackReport.brokerNotes} »
                          </p>
                          <p className="text-[10px] text-stone-400">توقيت التسجيل: {req.feedbackReport.submittedAt}</p>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: شققك المعروضة وإدارة بيانات الملاك الحصرية */}
        {/* ========================================================================= */}
        {activeTab === 'my_units' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Summary Banner */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                  شققك الحصرية المعروضة معنا (3)
                </h2>
                <p className="text-xs text-stone-500 pt-0.5">
                  أرقام الملاك تظهر لك وللإدارة فقط للحفاظ على خصوصية عملك.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleContactSara('حابب أضيف شقة جديدة حصرية معايا للموقع')}
                className="px-3 py-2 bg-[#141414] hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <PlusCircle size={14} />
                <span>إضافة شقة</span>
              </button>
            </div>

            {/* List of Broker Units */}
            <div className="space-y-3">
              {brokerUnits.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3">
                  
                  {/* Title and Code */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-stone-900 text-amber-400 font-mono text-xs font-bold rounded-lg">
                        {u.code}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900 font-readex">
                        {u.title}
                      </h3>
                    </div>

                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                      معروضة ونشطة
                    </span>
                  </div>

                  {/* Neighborhood & Specs */}
                  <div className="text-xs text-stone-600 flex items-center justify-between font-medium">
                    <span>{u.neighborhood} · {u.area} م²</span>
                    <span className="font-bold text-stone-900">{formatPrice(u.price)} ج.م</span>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#FAF8F5] rounded-xl text-center text-xs">
                    <div>
                      <p className="text-[10px] text-stone-400">المشاهدات</p>
                      <p className="font-bold text-stone-900">{u.views}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400">طلبوا تفاصيل</p>
                      <p className="font-bold text-stone-900">{u.leads}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400">معاينات</p>
                      <p className="font-bold text-emerald-600">{u.showingsCount}</p>
                    </div>
                  </div>

                  {/* Owner Contact Box */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-900">المالك: {u.ownerName}</p>
                      <p className="text-xs font-mono font-bold text-stone-700">{u.ownerPhone}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const link = generateWhatsAppLink(`+20${u.ownerPhone.replace(/^0/, '')}`, `مساء الخير أ. ${u.ownerName}، بخصوص شقتك كود ${u.code}...`);
                        window.open(link, '_blank');
                      }}
                      className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <MessageCircle size={13} />
                      <span>واتساب المالك</span>
                    </button>
                  </div>

                  {/* Commission info */}
                  <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                    <span>عمولتك الصافية عند البيع (50%):</span>
                    <span className="font-bold text-[#A07A26] text-sm">{formatPrice(u.commissionShare)} ج.م</span>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: سجل المعاينات والعمولات والتواصل مع الإدارة */}
        {/* ========================================================================= */}
        {activeTab === 'showings_commissions' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Stats Header */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-white rounded-2xl border border-stone-200 p-3 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">عمولات محصلة</p>
                <p className="text-lg sm:text-xl font-black text-stone-900">85,000</p>
                <p className="text-[10px] font-bold text-emerald-600">محولة لحسابك</p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-3 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">معاينات ناجحة</p>
                <p className="text-lg sm:text-xl font-black text-emerald-600">6</p>
                <p className="text-[10px] font-bold text-stone-400">آخر 30 يوم</p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-3 text-center shadow-2xs space-y-1">
                <p className="text-xs font-bold text-stone-500">معاينات جارية</p>
                <p className="text-lg sm:text-xl font-black text-[#A07A26]">3</p>
                <p className="text-[10px] font-bold text-stone-400">تحت التنسيق</p>
              </div>
            </div>

            {/* Past Showings History */}
            <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex pt-1">
              سجل المعاينات المنفذة
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    تمت المعاينة بنجاح ★5
                  </span>
                  <p className="text-xs font-bold text-stone-500">الخميس الماضي</p>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-700 font-medium">
                  <span>شقة H3109 (الحي الثالث)</span>
                  <span className="font-bold text-emerald-700">قيد صياغة العقد النهائي</span>
                </div>
                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl">
                  « العميل أشاد بالإطلالة وجاهز للتفاوض على السداد »
                </p>
              </div>
            </div>

            {/* Team Support Cards */}
            <div className="bg-[#FDFCF7] rounded-2xl border border-[#E9DFCA] p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                فريق التنسيق والمتابعة المباشر
              </h3>

              <div className="space-y-2.5">
                {/* Sara */}
                <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-[#E5B842] text-xs font-bold flex items-center justify-center">
                      س
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">سارة حنفي</p>
                      <p className="text-[10px] text-stone-500">منسقة المبيعات والملاك وتأكيد العملاء</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleContactSara()}
                    className="px-3 py-1.5 bg-[#15803D] text-white text-xs font-bold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
                  >
                    واتساب
                  </button>
                </div>

                {/* Mahmoud El-Seba3 */}
                <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-[#E5B842] text-xs font-bold flex items-center justify-center">
                      م
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">محمود السبع</p>
                      <p className="text-[10px] text-stone-500">مسؤول العقود وتحويل العمولات (50/50)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const link = generateWhatsAppLink('+201017400078', 'مرحباً أ. محمود السبع، بخصوص تحويل عمولة الشقة الأخيرة.');
                      window.open(link, '_blank');
                    }}
                    className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    تواصل
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: استمارة كتابة تقرير وفيدباك المعاينة الميدانية للـ CRM */}
      {/* ========================================================================= */}
      {activeFeedbackReq && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 font-readex">
                  تقرير المعاينة الميدانية (كود {activeFeedbackReq.propertyCode})
                </h3>
                <p className="text-xs text-stone-500">
                  العميل: {activeFeedbackReq.clientName} · السيلز: {activeFeedbackReq.requestingSalesAgentName || 'مستشار المبيعات'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveFeedbackReq(null)}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              
              {/* 1. Star Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  تقييم العميل العام للشقة:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                        star <= feedbackRating ? 'text-amber-400' : 'text-stone-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-stone-600 mr-2">
                    ({feedbackRating} من 5 نجوم)
                  </span>
                </div>
              </div>

              {/* 2. Outcome Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  النتيجة الميدانية للمعاينة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOutcome('interested')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackOutcome === 'interested'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    🔥 مهتم وجاد للتفاوض
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackOutcome('made_offer')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackOutcome === 'made_offer'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    💰 قدّم عرض سعر مباشر
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackOutcome('needs_other_unit')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackOutcome === 'needs_other_unit'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    🔄 طلب شقة بديلة بمساحة أخرى
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackOutcome('not_suitable')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackOutcome === 'not_suitable'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    ✕ غير مناسبة للعميل
                  </button>
                </div>
              </div>

              {/* 3. Price Opinion */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  رأي العميل في السعر المطلوب:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackPriceOpinion('fair')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackPriceOpinion === 'fair'
                        ? 'bg-[#141414] text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    سعر مناسب
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackPriceOpinion('slightly_high')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackPriceOpinion === 'slightly_high'
                        ? 'bg-[#141414] text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    مرتفع بسيط
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackPriceOpinion('overpriced')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      feedbackPriceOpinion === 'overpriced'
                        ? 'bg-[#141414] text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    أعلى من السوق
                  </button>
                </div>
              </div>

              {/* 4. Detailed Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  ملاحظاتك الميدانية وتفاصيل انطباع العميل (تظهر لمستشار السيلز):
                </label>
                <textarea
                  rows={3}
                  required
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="اكتب ملاحظاتك على المقابلة ورأي العميل..."
                  className="w-full p-3 bg-[#F6F4EF] border border-stone-200 rounded-xl font-medium text-stone-900 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center shadow-2xs flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>إرسال التقرير وتحديث CRM السيلز وبوابة المالك فوراً</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
