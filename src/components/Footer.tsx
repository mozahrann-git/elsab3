import React from 'react';
import { FooterConfig } from '../types';

interface FooterProps {
  onSelectNeighborhood?: (neighborhood: string) => void;
  onOpenResaleSubmit: () => void;
  onOpenAdminLogin: () => void;
  onOpenDistrictGuide?: () => void;
  customLogoUrl?: string;
  footerConfig?: FooterConfig;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenResaleSubmit,
  onOpenAdminLogin,
  footerConfig,
}) => {
  const branchAddress = footerConfig?.branchAddress || '[العنوان: الهضبة الوسطى، المقطم]';
  const phone = footerConfig?.phone || '[01021242871]';
  const workingHours = footerConfig?.workingHours || '[مواعيد العمل: يومياً من 10 ص حتى 10 م]';

  return (
    <footer id="footer-section" className="w-full bg-[#F6F4EF] text-right font-ibm">
      
      {/* Banner: "عندك شقة في الهضبة الوسطى؟" */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="bg-white rounded-3xl border border-[#ECE8DF] p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
          
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-bold text-[#141414] font-readex">
              عندك شقة في الهضبة الوسطى؟
            </h3>
            <p className="text-xs sm:text-sm text-[#6B665C]">
              ابعت بياناتها، نعاينها ونعرضها على عملاء جادين خلال 48 ساعة.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenResaleSubmit}
            className="shrink-0 px-6 py-3 bg-[#A07A26] hover:bg-[#8A671F] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
          >
            اعرض شقتك للبيع
          </button>

        </div>
      </div>

      {/* Minimal Footer Line */}
      <div className="border-t border-[#ECE8DF] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B665C] text-center sm:text-right">
          
          <p className="font-medium">
            © السبع للعقارات — المقطم، الهضبة الوسطى
          </p>

          <p className="space-x-2 space-x-reverse">
            <span>{branchAddress}</span>
            <span>·</span>
            <span dir="ltr" className="font-mono">{phone}</span>
            <span>·</span>
            <span>{workingHours}</span>
          </p>

          <div className="hidden sm:block">
            <button
              onClick={onOpenAdminLogin}
              className="text-[#6B665C] hover:text-[#141414] text-[11px] transition-colors cursor-pointer"
            >
              دخول الإدارة
            </button>
          </div>

        </div>
      </div>

    </footer>
  );
};
