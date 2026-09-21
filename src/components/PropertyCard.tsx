import React, { useState, useRef } from 'react';
import { Property } from '../types';
import { Heart, ArrowLeftRight, Edit3, Briefcase, CheckCircle2, Play, Video, ChevronLeft, ChevronRight, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react';
import { formatPrice } from '../utils/helpers';
import { INITIAL_PRICE_MAP_DATA } from '../data/marketPriceData';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { hydratePropertyMedia } from '../utils/propertyMedia';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onSelectVideo?: (property: Property) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isInComparison: boolean;
  onToggleComparison: (property: Property) => void;
  onTrackClick: (propertyId: string, type: 'whatsapp' | 'call' | 'views' | 'favorites') => void;
  layoutMode?: 'grid' | 'horizontal';
  onEditProperty?: (property: Property) => void;
  onOpenSalesToolkit?: (property: Property) => void;
  showFairPriceMeter?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  onSelectVideo,
  isFavorite,
  onToggleFavorite,
  isInComparison,
  onToggleComparison,
  onTrackClick,
  onEditProperty,
  onOpenSalesToolkit,
  showFairPriceMeter = true
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showInlineVideo, setShowInlineVideo] = useState(false);

  // Touch swipe coordinates
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Guarantee valid images from property, user uploads, or master catalog fallback
  const validPropImages = property.images && property.images.length > 0 
    ? property.images.filter(img => typeof img === 'string' && img.trim().length > 0) 
    : [];
  const hasVideo = Boolean(property.videoUrl && property.videoUrl.trim().length > 0);
  
  // If property has no images and no video, fallback to full hydrated gallery
  const rawImages = validPropImages.length > 0 
    ? validPropImages 
    : (hasVideo ? [] : (hydratePropertyMedia(property).images || []));
  const hasImages = rawImages.length > 0;

  const currentImageSrc = hasImages 
    ? (rawImages[activePhotoIdx] || rawImages[0])
    : '';

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
        // Swiped left (in RTL, next or prev) -> advance
        setActivePhotoIdx((prev) => (prev + 1) % rawImages.length);
        e.stopPropagation();
      } else if (distance < -minSwipeDistance) {
        // Swiped right -> go back
        setActivePhotoIdx((prev) => (prev - 1 + rawImages.length) % rawImages.length);
        e.stopPropagation();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasImages && rawImages.length > 1) {
      setActivePhotoIdx((prev) => (prev + 1) % rawImages.length);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasImages && rawImages.length > 1) {
      setActivePhotoIdx((prev) => (prev - 1 + rawImages.length) % rawImages.length);
    }
  };

  const handleCardClick = () => {
    onTrackClick(property.id, 'views');
    onSelect(property);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrackClick(property.id, 'views');
    if (onSelectVideo) {
      onSelectVideo(property);
    } else {
      onSelect(property);
    }
  };

  // Specs
  const areaText = property.area ? `${property.area} م²` : '';
  const roomsText = property.bedrooms ? `${property.bedrooms} غرف` : '';
  const bathsText = property.bathrooms ? `${property.bathrooms} حمام` : '';
  const finishingText = property.finishing === 'finished' ? 'سوبر لوكس' : (property.finishingLabel || 'نصف تشطيب');

  // Price calculations
  const price = property.price || 0;
  const pricePerMeter = property.pricePerMeter || (property.area && property.area > 0 ? Math.round(price / property.area) : 0);

  const formattedPrice = formatPrice(price);
  const formattedPpm = pricePerMeter > 0 ? `${new Intl.NumberFormat('en-US').format(pricePerMeter)} ج.م / م²` : '';

  // Inspection date label generator based on property code hash
  const inspectionLabels = ['اتعاينت امبارح', 'اتعاينت من 3 أيام', 'اتعاينت من أسبوع', 'اتعاينت حديثاً'];
  const hash = (property.id || property.code || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const inspectionTag = inspectionLabels[hash % inspectionLabels.length];

  // Fair price meter logic
  const districtData = INITIAL_PRICE_MAP_DATA.find(d => d.neighborhood === property.neighborhood);
  const benchmarkPpm = property.finishing === 'finished' 
    ? (districtData?.avgFinishedPrice || 22000) 
    : (districtData?.avgSemiFinishedPrice || 16000);

  const diffPercent = benchmarkPpm > 0 && pricePerMeter > 0 
    ? Math.round(((pricePerMeter - benchmarkPpm) / benchmarkPpm) * 100) 
    : 0;

  let meterText = 'في متوسط الحي';
  let meterDotPosition = '50%';
  let meterDotColor = 'bg-[#141414]';

  if (diffPercent <= -5) {
    meterText = `أقل من متوسط الحي بـ ${Math.abs(diffPercent)}%`;
    meterDotPosition = '20%';
    meterDotColor = 'bg-emerald-600';
  } else if (diffPercent >= 6) {
    meterText = `أعلى من المتوسط بـ ${diffPercent}%`;
    meterDotPosition = '80%';
    meterDotColor = 'bg-amber-600';
  }

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white rounded-3xl border border-[#ECE8DF] hover:border-stone-400 transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer text-right shadow-2xs hover:shadow-md"
    >
      <div>
        {/* Top Media Container: Video or Swipable Images */}
        <div 
          className="relative w-full h-56 bg-stone-950 overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 1. If user has video and NO images (or toggled inline video): Render the real Video Player directly */}
          {(!hasImages && hasVideo) || (showInlineVideo && hasVideo) ? (
            <div 
              className="w-full h-full relative bg-black flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <PropertyVideoPlayer
                videoUrl={property.videoUrl!}
                title={property.title}
                className="w-full h-full object-cover"
                autoPlay={false}
                videoMuted={property.videoMuted ?? true}
              />
              {hasImages && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInlineVideo(false);
                  }}
                  className="absolute top-3 left-3 z-20 px-2 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-bold rounded-lg border border-white/20 flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon size={12} />
                  <span>عرض الصور</span>
                </button>
              )}
            </div>
          ) : hasImages ? (
            /* 2. Swipable Image Gallery */
            <div className="relative w-full h-full bg-stone-100">
              <img
                src={currentImageSrc}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />

              {/* Navigation Arrows for Multiple Photos */}
              {rawImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                    title="الصورة السابقة"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                    title="الصورة التالية"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {/* Photo Counter and Dot Indicators */}
                  <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1.5 z-10 pointer-events-none">
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full">
                      {rawImages.map((_, i) => (
                        <span
                          key={i}
                          className={`inline-block rounded-full transition-all ${
                            i === activePhotoIdx ? 'w-3 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 3. Fallback only if both images and video are missing */
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-200 text-stone-500 text-xs">
              <ImageIcon size={32} className="opacity-40 mb-1" />
              <span>لا توجد وسائط مضافة</span>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
            {/* Code Badge */}
            <div className="flex items-center gap-1.5">
              <span className="bg-[#141414] text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-xs">
                {property.code || 'H1622'}
              </span>

              {/* Video Available Badge */}
              {hasVideo && (
                <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-xs flex items-center gap-1 border border-rose-400/40 animate-pulse">
                  <Video size={11} className="shrink-0" />
                  <span>فيديو</span>
                </span>
              )}
            </div>

            {/* Inspection Tag */}
            <span className="bg-white/95 backdrop-blur-xs text-[#141414] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#ECE8DF] shadow-xs flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[#A07A26]" />
              <span>{inspectionTag}</span>
            </span>
          </div>

          {/* Video Quick Play Badge / Floating Button on Image */}
          {hasVideo && hasImages && !showInlineVideo && (
            <button
              type="button"
              onClick={handleVideoClick}
              className="absolute bottom-3 right-3 z-10 px-3 py-1.5 bg-stone-950/85 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-md backdrop-blur-md transition-all active:scale-95 group-hover:scale-105 cursor-pointer"
              title="مشاهدة فيديو المعاينة"
            >
              <Play size={12} className="fill-white" />
              <span>معاينة فيديو</span>
            </button>
          )}

          {/* Quick Action Overlay (Favorite & Compare) */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(property.id);
                onTrackClick(property.id, 'favorites');
              }}
              className="p-2 bg-white/90 hover:bg-white text-[#141414] rounded-xl border border-[#ECE8DF] shadow-xs transition-colors cursor-pointer"
              title="حفظ الشقة"
            >
              <Heart size={14} className={isFavorite ? "fill-rose-500 text-rose-500" : ""} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComparison(property);
              }}
              className="p-2 bg-white/90 hover:bg-white text-[#141414] rounded-xl border border-[#ECE8DF] shadow-xs transition-colors cursor-pointer"
              title="مقارنة"
            >
              <ArrowLeftRight size={14} className={isInComparison ? "text-[#A07A26]" : ""} />
            </button>

            {onEditProperty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProperty(property);
                }}
                className="p-2 bg-white/90 hover:bg-white text-emerald-800 rounded-xl border border-emerald-300 shadow-xs transition-colors cursor-pointer"
                title="تعديل سريع"
              >
                <Edit3 size={14} />
              </button>
            )}

            {onOpenSalesToolkit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSalesToolkit(property);
                }}
                className="p-2 bg-white/90 hover:bg-white text-[#A07A26] rounded-xl border border-amber-300 shadow-xs transition-colors cursor-pointer"
                title="أدوات المستشار"
              >
                <Briefcase size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          
          {/* Neighborhood */}
          <div className="text-xs text-[#6B665C] font-medium">
            {property.neighborhood} {property.compoundName ? `· ${property.compoundName}` : ''}
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-[#141414] font-readex line-clamp-1 leading-snug">
            {property.title}
          </h3>

          {/* Specs in One Line: area / rooms / baths / finishing / video */}
          <div className="flex items-center gap-2 text-xs text-[#6B665C] flex-wrap">
            {areaText && <span className="font-medium text-[#141414]">{areaText}</span>}
            {areaText && roomsText && <span className="text-stone-300">•</span>}
            {roomsText && <span>{roomsText}</span>}
            {roomsText && bathsText && <span className="text-stone-300">•</span>}
            {bathsText && <span>{bathsText}</span>}
            {bathsText && finishingText && <span className="text-stone-300">•</span>}
            {finishingText && <span>{finishingText}</span>}
            {hasVideo && (
              <>
                <span className="text-stone-300">•</span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/70 text-[10.5px]">
                  <Video size={11} className="shrink-0" />
                  <span>فيديو</span>
                </span>
              </>
            )}
          </div>

          {/* Price & Price per meter */}
          <div className="pt-2 flex items-baseline justify-between gap-2 border-t border-[#ECE8DF]/60">
            <div className="font-bold text-lg text-[#141414] font-readex">
              {formattedPrice}
            </div>

            {formattedPpm && (
              <div className="text-xs text-[#6B665C] font-normal font-mono">
                {formattedPpm}
              </div>
            )}
          </div>

          {/* Fair Price Meter Bar ("مؤشر السعر عادل؟") */}
          {showFairPriceMeter && pricePerMeter > 0 && (
            <div className="pt-2 space-y-1">
              <div className="relative w-full h-1.5 bg-linear-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full">
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs ${meterDotColor}`}
                  style={{ left: meterDotPosition }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#6B665C] font-medium">
                <span>{meterText}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Action Buttons: Details + Direct Video Player */}
      <div className="px-5 pb-5 pt-1">
        {hasVideo ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border border-[#141414] text-[#141414] text-xs font-bold hover:bg-[#141414] hover:text-white transition-all cursor-pointer text-center"
            >
              التفاصيل
            </button>
            <button
              type="button"
              onClick={handleVideoClick}
              className="py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play size={13} className="fill-white" />
              <span>فيديو</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-[#141414] text-[#141414] text-xs font-bold hover:bg-[#141414] hover:text-white transition-all cursor-pointer text-center"
          >
            شوف التفاصيل
          </button>
        )}
      </div>

    </div>
  );
};
