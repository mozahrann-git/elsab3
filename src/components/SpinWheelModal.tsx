import React, { useState } from 'react';
import { SpinPrize } from '../types';
import { X, Sparkles, Trophy, Award, Gift, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizes: SpinPrize[];
  agentName: string;
  dealValue: number;
  commission: number;
  onClaimPrize: (prize: SpinPrize) => void;
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  isOpen,
  onClose,
  prizes,
  agentName,
  dealValue,
  commission,
  onClaimPrize
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [hasSpun, setHasSpun] = useState(false);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // fallback
    }
  };

  const handleSpin = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Pick a random prize index
    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    
    // Add 5 to 8 full rotations + target angle
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 360;
    // Calculate final angle to land on chosen prize
    const targetAngle = extraRotations + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));
    
    setRotationDegrees(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const chosen = prizes[prizeIndex];
      setWonPrize(chosen);
      setHasSpun(true);
      triggerConfetti();
      onClaimPrize(chosen);
    }, 4200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-xl bg-[#0e111a] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] my-auto text-center text-white flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header Celebration */}
        <div className="space-y-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black animate-pulse">
            <Trophy size={14} />
            <span>🎉 احتفال إغلاق الصفقة (CLOSED DEAL)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            مبروك يا بطل! {agentName}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300">
            تم تسجيل صفقة بقيمة <strong className="text-emerald-400 font-bold">{dealValue.toLocaleString()} ج.م</strong> بعمولة <strong className="text-emerald-400 font-bold">{commission.toLocaleString()} ج.م</strong>
          </p>
        </div>

        {/* Spin Wheel Container */}
        <div className="relative my-4 w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          
          {/* Pointer Indicator (Top Arrow) */}
          <div className="absolute -top-3 z-30 transform -translate-x-1/2 left-1/2">
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] animate-bounce" />
          </div>

          {/* Center Hub Button */}
          <div 
            onClick={!hasSpun ? handleSpin : undefined}
            className={`absolute z-20 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-[#0e111a] shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-transform ${
              isSpinning ? 'scale-90 opacity-80' : 'hover:scale-105 active:scale-95'
            }`}
          >
            <span className="text-[11px] font-black text-black leading-tight">
              {isSpinning ? '...' : hasSpun ? 'مبروك' : 'لف الآن'}
            </span>
          </div>

          {/* Rotating Wheel Canvas */}
          <div 
            className="w-full h-full rounded-full border-4 border-white/20 overflow-hidden shadow-2xl relative transition-transform"
            style={{
              transform: `rotate(${rotationDegrees}deg)`,
              transitionDuration: isSpinning ? '4000ms' : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.25, 1)'
            }}
          >
            {prizes.map((prize, idx) => {
              const segmentAngle = 360 / prizes.length;
              const rotate = idx * segmentAngle;
              return (
                <div
                  key={prize.id}
                  className="absolute w-1/2 h-full top-0 right-0 origin-left flex items-center justify-end pr-4 text-[10px] sm:text-xs font-black text-white select-none border-b border-white/10"
                  style={{
                    backgroundColor: prize.color,
                    transform: `rotate(${rotate}deg) skewY(${-(90 - segmentAngle)}deg)`,
                    transformOrigin: '0% 50%'
                  }}
                >
                  <span 
                    className="transform rotate-90 origin-center text-center font-bold drop-shadow-md whitespace-nowrap"
                    style={{
                      transform: `rotate(${90 - segmentAngle/2}deg)`
                    }}
                  >
                    {prize.title.split(' ')[0]} {prize.title.split(' ')[1] || ''}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Won Prize Announcement */}
        {wonPrize && (
          <div className="p-4 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl w-full text-center space-y-1.5 animate-in zoom-in-90 duration-300">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-sm">
              <Gift size={18} />
              <span>جائزتك الفورية:</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {wonPrize.title}
            </h3>
            <p className="text-xs text-neutral-300">
              تم تسجيل البونص الفوري وإضافته لسجل إنجازاتك في لوحة التحكم!
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 flex items-center gap-3">
          {!hasSpun ? (
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSpinning ? 'جاري السحب على الجائزة...' : 'لف عجلة الحظ الآن 🎡'}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-sm rounded-xl transition-all"
            >
              استلام الجائزة وإغلاق
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
