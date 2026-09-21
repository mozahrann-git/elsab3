import React, { useState } from 'react';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../data/properties';
import { generateWhatsAppLink } from '../utils/helpers';
import { Bell, Send, CheckCircle2 } from 'lucide-react';

interface InstantWhatsAppAlertBannerProps {
  onSubscribeAlert?: (data: { neighborhood: string; maxBudget: string; phone: string }) => void;
  onSelectAlerts?: () => void;
}

export const InstantWhatsAppAlertBanner: React.FC<InstantWhatsAppAlertBannerProps> = ({
  onSubscribeAlert,
  onSelectAlerts
}) => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('الحي الثاني');
  const [maxBudget, setMaxBudget] = useState<string>('3.5M');
  const [phone, setPhone] = useState<string>('');
  const [isSent, setIsSent] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    if (onSubscribeAlert) {
      onSubscribeAlert({
        neighborhood: selectedNeighborhood,
        maxBudget,
        phone
      });
    }

    if (onSelectAlerts) {
      onSelectAlerts();
    }

    const message = `مرحباً، أود الاشتراك في التنبيهات الفورية لشقق ${selectedNeighborhood} بميزانية حتى ${maxBudget} ج.م. رقمي: ${phone}`;
    const url = generateWhatsAppLink('01021242871', undefined, undefined, message);
    window.open(url, '_blank');

    setIsSent(true);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 font-ibm" dir="rtl">
      <div className="bg-[#141414] text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-stone-800 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Right Text */}
          <div className="lg:col-span-5 space-y-2 text-right">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D9B864]">
              <Bell size={13} />
              <span>نبهني لما تنزل</span>
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-readex text-white leading-tight">
              مش لاقي اللي عايزه؟
              <br />
              أول ما ينزل هيوصلك واتساب.
            </h3>
          </div>

          {/* Left Form */}
          <div className="lg:col-span-7">
            {!isSent ? (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Neighborhood select */}
                <div>
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => setSelectedNeighborhood(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D9B864]/50 cursor-pointer"
                  >
                    {HADABA_WOSTA_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n} className="bg-stone-900 text-white">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget select */}
                <div>
                  <select
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D9B864]/50 cursor-pointer"
                  >
                    <option value="2.5M" className="bg-stone-900 text-white">حتى 2.5 مليون</option>
                    <option value="3.5M" className="bg-stone-900 text-white">حتى 3.5 مليون</option>
                    <option value="4.5M" className="bg-stone-900 text-white">حتى 4.5 مليون</option>
                    <option value="6M+" className="bg-stone-900 text-white">أكثر من 5 مليون</option>
                  </select>
                </div>

                {/* Phone & Submit Button */}
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="رقم الواتساب"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-stone-900 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D9B864]/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-[#D9B864] hover:bg-[#C8A44E] text-[#141414] font-bold font-readex rounded-xl text-xs transition-all shrink-0 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-stone-900 border border-[#D9B864]/30 rounded-2xl text-xs text-[#D9B864] flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>تم تسجيل اشتراكك بنجاح! سيتم تنبيهك فور توفر أي شقة مطابقة.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
