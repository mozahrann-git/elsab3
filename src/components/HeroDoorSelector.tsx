import React from 'react';
import { ShoppingBag, KeyRound, TrendingUp } from 'lucide-react';

interface HeroDoorSelectorProps {
  activeDoor?: 'buy' | 'sell' | 'prices';
  onSelectDoor?: (door: 'buy' | 'sell' | 'prices') => void;
  onSelectBuy?: () => void;
  onSelectSell?: () => void;
  onSelectPriceMap?: () => void;
}

export const HeroDoorSelector: React.FC<HeroDoorSelectorProps> = ({
  activeDoor,
  onSelectDoor,
  onSelectBuy,
  onSelectSell,
  onSelectPriceMap
}) => {
  const handleBuy = () => {
    if (onSelectBuy) onSelectBuy();
    if (onSelectDoor) onSelectDoor('buy');
  };

  const handleSell = () => {
    if (onSelectSell) onSelectSell();
    if (onSelectDoor) onSelectDoor('sell');
  };

  const handlePriceMap = () => {
    if (onSelectPriceMap) onSelectPriceMap();
    if (onSelectDoor) onSelectDoor('prices');
  };

  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-2 mb-6 sm:mb-8 font-ibm" dir="rtl">
      {/* 3 Main Doors */}
      <div className="inline-flex items-center p-1.5 bg-[#ECE8DF]/70 border border-[#E2DDD3] rounded-2xl gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={handleBuy}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-readex font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeDoor === 'buy'
              ? 'bg-[#141414] text-white shadow-xs'
              : 'text-[#4A463F] hover:text-[#141414] hover:bg-white/50'
          }`}
        >
          <ShoppingBag size={16} />
          <span>عايز أشتري</span>
        </button>

        <button
          type="button"
          onClick={handleSell}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-readex font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeDoor === 'sell'
              ? 'bg-[#141414] text-white shadow-xs'
              : 'text-[#4A463F] hover:text-[#141414] hover:bg-white/50'
          }`}
        >
          <KeyRound size={16} />
          <span>عايز أبيع</span>
        </button>

        <button
          type="button"
          onClick={handlePriceMap}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-readex font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeDoor === 'prices'
              ? 'bg-[#141414] text-white shadow-xs'
              : 'text-[#4A463F] hover:text-[#141414] hover:bg-white/50'
          }`}
        >
          <TrendingUp size={16} />
          <span>عايز أعرف الأسعار</span>
        </button>
      </div>

      {/* Helper text */}
      <p className="text-[11px] sm:text-xs text-[#6B665C]">
        3 أبواب واضحة بدل فلاتر كتير — كل باب بيفتح الأداة المناسبة
      </p>
    </div>
  );
};
