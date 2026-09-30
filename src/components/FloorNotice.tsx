import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Property } from '../types';
import { floorStatusOf, violationNote, UNKNOWN_FLOOR_NOTE } from '../services/floorRules';

/*
  تنبيه الدور المخالف.

  بيظهر جوّه صفحة الشقة بس — مش على الكارت في اللستة، عشان مايتفلترش
  بعينه من برّه، لكن اللي بيفتح الشقة يقراه بوضوح قبل ما يتحمّس.

  "محتاج تأكيد" بيظهر للفريق بس (forStaff)، لأن مش من حقنا نقول لعميل
  كلام إحنا نفسنا مش متأكدين منه.
*/

export const FloorNotice: React.FC<{ property: Property; forStaff?: boolean }> = ({ property, forStaff }) => {
  const status = floorStatusOf(property);

  if (status === 'violation') {
    return (
      <div className="rounded-2xl border border-[#E8C2BA] bg-[#FDF2F0] p-4 flex items-start gap-2.5">
        <AlertTriangle size={17} className="text-[#9E2A1B] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-[#9E2A1B]">الدور مخالف لارتفاع الرخصة</p>
          <p className="text-[12.5px] text-[#6B2419] leading-relaxed mt-0.5">{violationNote(property)}</p>
        </div>
      </div>
    );
  }

  if (status === 'unknown' && forStaff) {
    return (
      <div className="rounded-2xl border border-[#EBD9A6] bg-[#FFF8E6] p-3.5 flex items-start gap-2.5">
        <HelpCircle size={16} className="text-[#7A5E12] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold text-[13px] text-[#7A5E12]">الدور محتاج تأكيد</p>
          <p className="text-[11.5px] text-[#7A5E12] leading-relaxed mt-0.5">{UNKNOWN_FLOOR_NOTE}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default FloorNotice;
