import React from 'react';
import { Property } from '../types';
import { 
  X, 
  Heart, 
  Trash2, 
  MapPin, 
  MessageCircle
} from 'lucide-react';
import { formatPrice, generateWhatsAppLink } from '../utils/helpers';
import { LionLogo } from './LionLogo';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Property[];
  onRemoveFavorite: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onClearAll: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onSelectProperty,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-neutral-950 border border-white/20 p-5 sm:p-7 shadow-2xl my-auto text-right text-zinc-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white text-black">
              <Heart size={20} className="fill-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                الشقق المحفوظة في المفضلة ({favorites.length})
              </h2>
              <p className="text-xs text-neutral-400">
                قائمتك الخاصة للمعاينة والمقارنة السريعة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 uppercase tracking-wider"
              >
                <Trash2 size={13} />
                <span>مسح الكل</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-neutral-900 border border-white/20 text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {favorites.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <Heart size={36} className="mx-auto text-neutral-600" />
            <p className="text-sm text-neutral-400">قائمة المفضلة فارغة حالياً.</p>
            <p className="text-xs text-neutral-500">اضغط على أيقونة القلب على أي شقة لحفظها هنا للرجوع إليها.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 py-3 space-y-2.5">
            {favorites.map((prop) => (
              <div
                key={prop.id}
                onClick={() => {
                  onClose();
                  onSelectProperty(prop);
                }}
                className="p-3 bg-black hover:bg-neutral-900 border border-white/10 hover:border-white/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                    <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <span className="font-bold text-white">{prop.neighborhood}</span>
                      <span>&bull;</span>
                      <span>{prop.bedrooms} غرف</span>
                      <span>&bull;</span>
                      <span>{prop.finishing === 'finished' ? 'متشطب' : 'نصف تشطيب'}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {prop.title}
                    </h4>
                    <div className="text-xs font-black text-white font-mono">
                      {formatPrice(prop.price)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={generateWhatsAppLink('01021242871', prop.code, prop.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-black text-xs font-black flex items-center gap-1 border border-emerald-400 rounded-lg transition-all shadow-md"
                  >
                    <MessageCircle size={14} className="stroke-[2.5]" />
                    <span>واتساب</span>
                  </a>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavorite(prop.id);
                    }}
                    className="p-2 bg-neutral-900 border border-white/20 text-neutral-400 hover:text-white"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
