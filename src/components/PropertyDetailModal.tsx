import React, { useState, useRef, useEffect } from 'react';
import { Property } from '../types';
import { 
  X, 
  ArrowRight,
  Heart, 
  ArrowLeftRight, 
  Share2, 
  Phone, 
  MessageCircle, 
  Play, 
  Edit3, 
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { formatPrice, generateWhatsAppLink, generateCallLink } from '../utils/helpers';
import { LionLogo } from './LionLogo';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { hydratePropertyMedia } from '../utils/propertyMedia';

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isInComparison: boolean;
  onToggleComparison: (property: Property) => void;
  onTrackClick: (propertyId: string, type: 'whatsapp' | 'call' | 'views' | 'favorites') => void;
  onEditProperty?: (property: Property) => void;
  onOpenSalesToolkit?: (property: Property) => void;
  onRequestViewing?: (property: Property, preferredTime: string) => void;
  initialMediaMode?: 'photos' | 'video';
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  isFavorite,
  onToggleFavorite,
  isInComparison,
  onToggleComparison,
  onTrackClick,
  onEditProperty,
  onOpenSalesToolkit,
  onRequestViewing,
  initialMediaMode = 'photos'
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [mediaMode, setMediaMode] = useState<'photos' | 'video'>('photos');
  const [copied, setCopied] = useState(false);

  // Touch swipe coordinates
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const validPropImages = property?.images && property.images.length > 0 
    ? property.images.filter(img => typeof img === 'string' && img.trim().length > 0) 
    : [];
  const hasVideo = Boolean(property?.videoUrl && property.videoUrl.trim().length > 0);
  const rawImages = validPropImages.length > 0 
    ? validPropImages 
    : (property ? (hasVideo ? [] : (hydratePropertyMedia(property).images || [])) : []);
  const hasImages = rawImages.length > 0;

  useEffect(() => {
    setActivePhotoIdx(0);
    if (!hasImages && hasVideo) {
      setMediaMode('video');
    } else if (initialMediaMode === 'video' && hasVideo) {
      setMediaMode('video');
    } else {
      setMediaMode('photos');
    }
  }, [property?.id, initialMediaMode, hasImages, hasVideo]);

  if (!property) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (hasImages && rawImages.length > 1) {
      if (distance > minSwipeDistance) {
        // Swiped left (advance in RTL)
        setActivePhotoIdx((prev) => (prev + 1) % rawImages.length);
      } else if (distance < -minSwipeDistance) {
        // Swiped right (go back)
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

  const handleWhatsApp = () => {
    onTrackClick(property.id, 'whatsapp');
    if (onRequestViewing) {
      onRequestViewing(property, 'النهارده أو بكرة بعد 5 مساءً');
    }
    const url = generateWhatsAppLink('01021242871', property.code, property.title);
    window.open(url, '_blank');
  };

  const handleCall = () => {
    onTrackClick(property.id, 'call');
    window.location.href = generateCallLink('01021242871');
  };

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?property=${encodeURIComponent(property.code)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `شقة كود #${property.code} - ${property.title} | الهضبة الوسطى`,
          url: shareUrl,
        });
      } catch {
        // ignore share cancellation
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const price = property.price || 0;
  const pricePerMeter = property.pricePerMeter || (property.area && property.area > 0 ? Math.round(price / property.area) : 0);
  const formattedPrice = formatPrice(price);
  const formattedPpm = pricePerMeter > 0 ? `${new Intl.NumberFormat('en-US').format(pricePerMeter)} ج.م للمتر` : '';

  const finishingLabel = property.finishing === 'finished' ? 'سوبر لوكس' : (property.finishingLabel || 'نصف تشطيب');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F6F4EF] text-[#141414] text-right font-ibm">
      
      {/* Top Bar matching Screenshot 2 */}
      <div className="sticky top-0 z-40 bg-[#F6F4EF]/95 backdrop-blur-md border-b border-[#ECE8DF] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Right Logo */}
          <div className="select-none">
            <LionLogo 
              size={36} 
              textColor="text-[#141414]" 
              subtextColor="text-[#6B665C]"
            />
          </div>

          {/* Left: Back to all units */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-[#141414] hover:text-[#A07A26] transition-colors cursor-pointer py-1.5 px-3 rounded-xl border border-[#ECE8DF] bg-white shadow-2xs"
          >
            <span>رجوع لكل الوحدات</span>
            <ArrowRight size={14} />
          </button>

        </div>
      </div>

      {/* Main Details Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Breadcrumb and Media Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#6B665C]">
            <button onClick={onClose} className="hover:text-[#141414] cursor-pointer">الرئيسية</button>
            <span>/</span>
            <span>{property.neighborhood || 'الهضبة الوسطى'}</span>
            <span>/</span>
            <span className="text-[#141414] font-mono font-bold">{property.code || 'H1622'}</span>
          </div>

          {/* Media Mode Tabs (Photos / Video) */}
          {(hasImages && hasVideo) && (
            <div className="flex items-center gap-1 bg-[#ECE8DF] p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setMediaMode('photos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mediaMode === 'photos'
                    ? 'bg-white text-[#141414] shadow-xs'
                    : 'text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                <ImageIcon size={13} />
                <span>صور الشقة ({rawImages.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaMode('video')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mediaMode === 'video'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-[#6B665C] hover:text-[#141414]'
                }`}
              >
                <Video size={13} />
                <span>فيديو المعاينة</span>
              </button>
            </div>
          )}
        </div>

        {/* Video Mode Player */}
        {((mediaMode === 'video' || !hasImages) && hasVideo) && (
          <div className="w-full bg-black rounded-3xl overflow-hidden border border-[#ECE8DF] shadow-md">
            <div className="p-3.5 bg-stone-900 flex items-center justify-between text-white text-xs border-b border-stone-800">
              <span className="font-bold flex items-center gap-2">
                <Play size={14} className="text-[#A07A26] fill-[#A07A26]" />
                فيديو المعاينة الحقيقي للشقة ({property.code})
              </span>
              {hasImages && (
                <button
                  type="button"
                  onClick={() => setMediaMode('photos')}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon size={12} />
                  <span>الرجوع لمعرض الصور ({rawImages.length})</span>
                </button>
              )}
            </div>
            <PropertyVideoPlayer 
              videoUrl={property.videoUrl!} 
              title={property.title}
              autoPlay={true}
              videoMuted={property.videoMuted ?? true}
              className="w-full aspect-video sm:aspect-21/9 max-h-[520px] bg-black"
            />
          </div>
        )}

        {/* Swipable & Responsive Photo Gallery (When photos are available and active) */}
        {(mediaMode === 'photos' && hasImages) && (
          <div className="space-y-3">
            {/* Mobile / Swipe Carousel View */}
            <div 
              className="relative w-full h-[280px] sm:h-[380px] lg:h-[460px] rounded-3xl overflow-hidden border border-[#ECE8DF] bg-stone-950 select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={rawImages[activePhotoIdx] || rawImages[0]}
                alt={`${property.title} - صورة ${activePhotoIdx + 1}`}
                className="w-full h-full object-cover transition-all duration-300"
                referrerPolicy="no-referrer"
              />

              {/* Navigation Arrows */}
              {rawImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all z-10 cursor-pointer shadow-md"
                    title="الصورة السابقة"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all z-10 cursor-pointer shadow-md"
                    title="الصورة التالية"
                  >
                    <ChevronLeft size={22} />
                  </button>
                </>
              )}

              {/* Top/Bottom Overlay Badges */}
              <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20">
                <span>صورة {activePhotoIdx + 1} من {rawImages.length}</span>
              </div>

              {hasVideo && (
                <button
                  type="button"
                  onClick={() => setMediaMode('video')}
                  className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md border border-rose-500/40 cursor-pointer"
                >
                  <Play size={12} className="fill-white" />
                  <span>فيديو المعاينة</span>
                </button>
              )}

              {/* Swipe gesture tip on mobile */}
              <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-1.5 z-10 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full">
                  {rawImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActivePhotoIdx(i)}
                      className={`pointer-events-auto rounded-full transition-all cursor-pointer ${
                        i === activePhotoIdx ? 'w-5 h-2 bg-amber-400' : 'w-2 h-2 bg-white/60 hover:bg-white'
                      }`}
                      title={`عرض صورة ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {rawImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {rawImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    className={`relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      i === activePhotoIdx 
                        ? 'border-[#A07A26] scale-102 ring-2 ring-[#A07A26]/30' 
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`مصغرة ${i + 1}`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback if both photos and video are absent */}
        {(!hasImages && !hasVideo) && (
          <div className="w-full py-16 bg-white rounded-3xl border border-[#ECE8DF] flex flex-col items-center justify-center text-center p-6 space-y-2">
            <ImageIcon size={40} className="text-stone-300" />
            <p className="text-sm font-bold text-[#141414]">لا توجد صور أو فيديو متوفر لهذه الشقة حالياً</p>
            <p className="text-xs text-[#6B665C]">تواصل مع فريق المعاينات لطلب تصوير الوحدة أو حجز موعد معاينة على أرض الواقع.</p>
          </div>
        )}

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          
          {/* Right Column: Details & Specs (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#141414] text-white text-xs font-bold px-3 py-1 rounded-md shadow-2xs">
                {property.neighborhood || 'الحي الأول'}
              </span>
              <span className="bg-[#EFE6D2] text-[#6E5418] text-xs font-bold px-3 py-1 rounded-md">
                {finishingLabel} · استلام فوري
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#141414] font-readex leading-snug">
              {property.title}
            </h1>

            {/* 4 Spec Boxes in 4 Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl border border-[#ECE8DF] p-4 text-center">
              
              <div className="p-2 space-y-1">
                <span className="text-xs text-[#6B665C] block">المساحة</span>
                <span className="text-base sm:text-lg font-bold text-[#141414] font-readex">
                  {property.area} م²
                </span>
              </div>

              <div className="p-2 space-y-1 border-r border-[#ECE8DF]">
                <span className="text-xs text-[#6B665C] block">الغرف</span>
                <span className="text-base sm:text-lg font-bold text-[#141414] font-readex">
                  {property.bedrooms || '3'}
                </span>
              </div>

              <div className="p-2 space-y-1 border-r border-[#ECE8DF]">
                <span className="text-xs text-[#6B665C] block">الحمامات</span>
                <span className="text-base sm:text-lg font-bold text-[#141414] font-readex">
                  {property.bathrooms || '2'}
                </span>
              </div>

              <div className="p-2 space-y-1 border-r border-[#ECE8DF]">
                <span className="text-xs text-[#6B665C] block">الدور</span>
                <span className="text-base sm:text-lg font-bold text-[#141414] font-readex">
                  {property.floor || 'أرضي بجاردن'}
                </span>
              </div>

            </div>

            {/* "عن الوحدة" Section */}
            <div className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#141414] font-readex">
                عن الوحدة
              </h2>

              <p className="text-sm sm:text-base text-[#4A463F] leading-relaxed">
                {property.description || `شقة متشطبة بالكامل في ${property.neighborhood || 'الهضبة الوسطى'}، ${property.floor ? `دور ${property.floor}` : 'دور مميز'}. ${property.bedrooms || 3} غرف و${property.bathrooms || 2} حمام، مساحة ${property.area || 350} م². [أضف: الواجهة، الأسانسير، الجراج، نوع العقد، أقرب محور].`}
              </p>

              {/* Feature Tags */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="bg-white border border-[#ECE8DF] text-[#141414] text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs">
                  [أسانسير]
                </span>
                <span className="bg-white border border-[#ECE8DF] text-[#141414] text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs">
                  [جراج]
                </span>
                <span className="bg-white border border-[#ECE8DF] text-[#141414] text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs">
                  [عقد مسجل / حصة أرض]
                </span>
              </div>
            </div>

            {/* Admin or Sales Toolkit Actions (if logged in) */}
            {(onEditProperty || onOpenSalesToolkit) && (
              <div className="pt-4 flex items-center gap-3 border-t border-[#ECE8DF]">
                {onEditProperty && (
                  <button
                    onClick={() => onEditProperty(property)}
                    className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Edit3 size={14} />
                    <span>تعديل بيانات الوحدة (الإدارة)</span>
                  </button>
                )}
                {onOpenSalesToolkit && (
                  <button
                    onClick={() => onOpenSalesToolkit(property)}
                    className="px-4 py-2 bg-[#A07A26] text-white text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Briefcase size={14} />
                    <span>أدوات المستشار العقاري</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Left Column: Sticky Price Card (4 Cols) */}
          <div className="lg:col-span-4 sticky top-20">
            <div className="bg-white rounded-2xl border border-[#ECE8DF] p-6 shadow-sm space-y-5">
              
              {/* Price Details */}
              <div className="space-y-1">
                <span className="text-xs text-[#6B665C] block">
                  السعر المطلوب كاش
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-[#141414] font-readex">
                  {formattedPrice}
                </div>
                {formattedPpm && (
                  <div className="text-xs text-[#6B665C]">
                    {formattedPpm}
                  </div>
                )}
              </div>

              {/* Main Green WhatsApp Button */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="w-full py-3.5 px-4 bg-[#1E7A45] hover:bg-[#186539] text-white text-sm font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>احجز معاينة على واتساب</span>
              </button>

              {/* Call Outlined Button */}
              <button
                type="button"
                onClick={handleCall}
                className="w-full py-3 px-4 border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>اتصل بينا</span>
              </button>

              {/* Row of 3 Actions: Save, Compare, Share */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#ECE8DF]">
                
                <button
                  type="button"
                  onClick={() => {
                    onToggleFavorite(property.id);
                    onTrackClick(property.id, 'favorites');
                  }}
                  className="py-2 px-2 bg-[#F6F4EF] hover:bg-stone-200 text-[#141414] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Heart size={14} className={isFavorite ? "fill-rose-500 text-rose-500" : ""} />
                  <span>{isFavorite ? 'محفوظة' : 'حفظ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleComparison(property)}
                  className="py-2 px-2 bg-[#F6F4EF] hover:bg-stone-200 text-[#141414] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight size={14} className={isInComparison ? "text-[#A07A26]" : ""} />
                  <span>مقارنة</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="py-2 px-2 bg-[#F6F4EF] hover:bg-stone-200 text-[#141414] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
                </button>

              </div>

              {/* Verified Note */}
              <div className="pt-2 border-t border-[#ECE8DF] text-center">
                <p className="text-[11px] text-[#6B665C]">
                  الصور والبيانات مطابقة للمعاينة. كود الوحدة: <span className="font-mono font-bold text-[#141414]">{property.code || 'H1622'}</span>
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
