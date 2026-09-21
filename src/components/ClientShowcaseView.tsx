import React, { useState, useRef, useEffect } from 'react';
import { Property, SalesAgent } from '../types';
import { 
  Building2, 
  MapPin, 
  BedDouble, 
  Bath, 
  Layers, 
  Check, 
  MessageCircle, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Car, 
  Sparkles,
  Share2,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Video,
  ImageIcon
} from 'lucide-react';
import { formatPrice, formatNumber, generateCallLink, generateWhatsAppLink, formatPropertyDescription } from '../utils/helpers';
import { LionLogo } from './LionLogo';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';

interface ClientShowcaseViewProps {
  property: Property;
  agent?: SalesAgent;
  onClose?: () => void;
}

export const ClientShowcaseView: React.FC<ClientShowcaseViewProps> = ({
  property,
  agent,
  onClose
}) => {
  const rawImages = property.images && property.images.length > 0 ? property.images.filter(img => img && img.trim().length > 0) : [];
  const hasVideo = Boolean(property.videoUrl && property.videoUrl.trim().length > 0);
  const hasImages = rawImages.length > 0;

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showVideo, setShowVideo] = useState(!hasImages && hasVideo);

  // Touch swipe coordinates
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    setActivePhotoIdx(0);
    if (!hasImages && hasVideo) {
      setShowVideo(true);
    } else {
      setShowVideo(false);
    }
  }, [property.id, hasImages, hasVideo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (hasImages && rawImages.length > 1) {
      if (distance > minSwipeDistance) {
        // Swiped left (in RTL -> next)
        setActivePhotoIdx((prev) => (prev + 1) % rawImages.length);
      } else if (distance < -minSwipeDistance) {
        // Swiped right -> prev
        setActivePhotoIdx((prev) => (prev - 1 + rawImages.length) % rawImages.length);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleNextPhoto = () => {
    if (hasImages && rawImages.length > 1) {
      setActivePhotoIdx((prev) => (prev + 1) % rawImages.length);
    }
  };

  const handlePrevPhoto = () => {
    if (hasImages && rawImages.length > 1) {
      setActivePhotoIdx((prev) => (prev - 1 + rawImages.length) % rawImages.length);
    }
  };

  const contactPhone = agent?.phone || '01021242871';
  const contactName = agent?.name || 'السبع للعقارات - مستشار الهضبة الوسطى';

  const handleWhatsApp = () => {
    const url = generateWhatsAppLink(
      contactPhone,
      property.code,
      property.title,
      `مهتم بشقة كود ${property.code} بالهضبة الوسطى`
    );
    window.open(url, '_blank');
  };

  const handleShare = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?property=${encodeURIComponent(property.code)}${agent?.id ? `&agent=${encodeURIComponent(agent.id)}` : ''}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col text-right selection:bg-[#9E782F] selection:text-white">
      
      {/* Top Header - Cream & Gold Palette with Brand Lion Logo */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <LionLogo size={36} textColor="text-stone-950" />

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 size={13} className="text-stone-700" />
            <span>{copied ? 'تم نسخ الرابط ✓' : 'مشاركة'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#9E782F] hover:bg-[#856525] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              الرجوع للرئيسية
            </button>
          )}
        </div>
      </header>

      {/* Main Showcase Body */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 w-full flex-1">
        
        {/* Header Title & Code */}
        <div className="space-y-2.5 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/70 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black px-2.5 py-1 bg-stone-900 text-amber-400 rounded-lg shadow-2xs">
                كود: #{property.code}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-[#9E782F] border border-amber-200/60 rounded-lg">
                {property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس' : 'نصف تشطيب')}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
                {property.neighborhood}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-black text-[#9E782F] font-mono">
                {formatPrice(property.price)}
              </span>
              {property.pricePerMeter && (
                <span className="text-xs text-stone-400 font-mono">
                  ({property.pricePerMeter.toLocaleString()} ج/م²)
                </span>
              )}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-stone-950 leading-snug">
            {property.title}
          </h1>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
            <MapPin size={15} className="text-[#9E782F] shrink-0" />
            <span>الهضبة الوسطى بالمقطم &bull; {property.neighborhood} &bull; {property.location ? property.location : '[العنوان بالتفصيل: اسم الشارع ورقم العقار]'}</span>
          </div>
        </div>

        {/* Media Section: Photos Gallery & Video Tour */}
        <div className="space-y-3">
          {/* View Mode Toggle if Video Exists & Photos Exist */}
          {(hasVideo && hasImages) && (
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-stone-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowVideo(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    !showVideo 
                      ? 'bg-[#9E782F] text-white shadow-xs' 
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>معرض الصور ({rawImages.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    showVideo 
                      ? 'bg-rose-700 text-white shadow-xs' 
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  }`}
                >
                  <Video size={14} />
                  <span>فيديو المعاينة</span>
                </button>
              </div>

              <span className="text-[11px] text-stone-500 font-medium px-2 hidden sm:inline">
                {showVideo ? 'مشاهدة الفيديو الميداني' : `صورة ${activePhotoIdx + 1} من ${rawImages.length}`}
              </span>
            </div>
          )}

          {showVideo && hasVideo ? (
            <div className="w-full">
              <PropertyVideoPlayer 
                videoUrl={property.videoUrl!} 
                title={property.title}
                videoMuted={property.videoMuted ?? true}
                className="w-full aspect-video rounded-3xl overflow-hidden bg-black border border-stone-800 shadow-md"
              />
            </div>
          ) : hasImages ? (
            <div className="space-y-3">
              <div 
                className="relative aspect-video w-full rounded-3xl overflow-hidden bg-stone-900 border border-stone-200 shadow-md group select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img 
                  src={rawImages[activePhotoIdx] || rawImages[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-500"
                />
                
                {/* Real photo badge */}
                <div className="absolute top-3.5 right-3.5 z-20">
                  <span className="px-3 py-1 bg-amber-950/85 text-amber-300 text-xs font-black rounded-xl border border-amber-500/40 shadow-md backdrop-blur-xs">
                    [صورة حقيقية]
                  </span>
                </div>

                {/* Left/Right Navigation Arrows */}
                {rawImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs z-20 cursor-pointer shadow-md"
                      title="الصورة السابقة"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs z-20 cursor-pointer shadow-md"
                      title="الصورة التالية"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 right-3 px-3 py-1 bg-stone-950/80 backdrop-blur-md rounded-xl text-xs font-bold text-white shadow-xs">
                  صورة {activePhotoIdx + 1} من {rawImages.length}
                </div>
              </div>

              {/* Thumbnails Row */}
              {rawImages.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {rawImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activePhotoIdx === idx ? 'border-[#9E782F] scale-98 shadow-sm ring-1 ring-[#9E782F]' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full py-12 bg-white rounded-3xl border border-stone-200 flex flex-col items-center justify-center text-stone-400 text-xs">
              <ImageIcon size={32} className="mb-2 opacity-50" />
              <span>لا توجد صور أو فيديو لهذه الوحدة</span>
            </div>
          )}
        </div>

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-stone-200/70 rounded-2xl space-y-1 text-center shadow-2xs">
            <span className="text-xs text-stone-400 font-medium block">المساحة</span>
            <p className="text-base sm:text-lg font-black text-stone-900 font-mono">{property.area} م²</p>
          </div>
          <div className="p-4 bg-white border border-stone-200/70 rounded-2xl space-y-1 text-center shadow-2xs">
            <span className="text-xs text-stone-400 font-medium block">غرف النوم</span>
            <p className="text-base sm:text-lg font-black text-stone-900">{property.bedrooms} غرف</p>
          </div>
          <div className="p-4 bg-white border border-stone-200/70 rounded-2xl space-y-1 text-center shadow-2xs">
            <span className="text-xs text-stone-400 font-medium block">الحمامات</span>
            <p className="text-base sm:text-lg font-black text-stone-900">{property.bathrooms} حمام</p>
          </div>
          <div className="p-4 bg-white border border-stone-200/70 rounded-2xl space-y-1 text-center shadow-2xs">
            <span className="text-xs text-stone-400 font-medium block">الدور والموقع</span>
            <p className="text-base sm:text-lg font-black text-stone-900 truncate">{property.floor}</p>
          </div>
        </div>

        {/* Highlights & Clean Paragraph Description */}
        <div className="p-5 sm:p-6 bg-white border border-stone-200/70 rounded-3xl space-y-4 shadow-xs">
          <h2 className="text-base font-black text-stone-950 flex items-center gap-2">
            <Sparkles size={16} className="text-[#9E782F]" />
            <span>تفاصيل ومواصفات الوحدة</span>
          </h2>

          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-100 text-xs sm:text-sm text-stone-800 leading-relaxed">
            {formatPropertyDescription(property)}
          </div>

          {property.features && property.features.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-stone-500 block">المميزات الإضافية:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {property.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-stone-800 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact & Booking Section (Dark Gold Button) */}
        <div className="p-5 sm:p-6 bg-white border border-[#9E782F]/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-[#9E782F] flex items-center justify-center font-black text-white text-base shadow-sm">
              {contactName.split(' ')[0][0]}
            </div>
            <div>
              <span className="text-[10.5px] text-[#9E782F] font-bold uppercase tracking-wider block">
                مستشار مبيعات الهضبة الوسطى
              </span>
              <h3 className="text-base font-black text-stone-950">{contactName}</h3>
              <p className="text-xs text-stone-500 font-mono">{contactPhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-none px-6 py-3 bg-[#9E782F] hover:bg-[#856525] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle size={16} className="stroke-[2.5]" />
              <span>تواصل واتساب وحجز معاينة</span>
            </button>

            <a
              href={generateCallLink(contactPhone)}
              className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone size={15} className="text-stone-700" />
              <span>اتصال</span>
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 bg-[#f4f0e6]">
        منصة السبع للعقارات &bull; خبرة [سنين الخبرة] في ريسيل الهضبة الوسطى بالمقطم
      </footer>

    </div>
  );
};

