import React from 'react';
import { Eye, CalendarCheck, MessageSquareText, Scale } from 'lucide-react';

/* قسم في الرئيسية بيعرّف الملاك ببوابتهم */
export const OwnerPortalPromo: React.FC<{ onSubmit: () => void; onLogin: () => void }> = ({ onSubmit, onLogin }) => (
  <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" dir="rtl">
    <div className="rounded-3xl bg-[#141414] text-white p-6 sm:p-10 lg:p-12 grid gap-8 lg:grid-cols-2 items-center overflow-hidden relative">
      <div className="space-y-5 relative">
        <span className="text-sm text-[#D9B864] font-semibold">جديد للملاك</span>
        <h2 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: "'Readex Pro', sans-serif" }}>اعرض شقتك،<br />وتابعها لحظة بلحظة.</h2>
        <p className="text-[#CFCBC2] leading-8">بوابة خاصة بيك: تشوف مين شاف شقتك، وتأكد المعاينات من موبايلك، وتقرا رأي كل عميل بعد ما يعاين. ورقمك مش بيظهر لحد.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onSubmit} className="px-6 py-3.5 rounded-xl bg-[#A07A26] font-bold">اعرض شقتك دلوقتي</button>
          <button onClick={onLogin} className="px-6 py-3.5 rounded-xl bg-white/10 font-bold">عندي حساب</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 relative">
        {[
          [<Eye size={22} />, 'مين شافها', 'المشاهدات والواتساب والمكالمات'],
          [<CalendarCheck size={22} />, 'المعاينات', 'تأكدها بضغطة، وتفكرك لو نسيت'],
          [<MessageSquareText size={22} />, 'رأي العملاء', 'بعد كل معاينة بنجوم وتعليق'],
          [<Scale size={22} />, 'سعرك فين', 'قصاد متوسط الحي بالأرقام'],
        ].map(([icon, t, d], i) => (
          <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
            <span className="text-[#D9B864]">{icon}</span>
            <p className="font-bold">{t as string}</p>
            <p className="text-xs text-[#CFCBC2] leading-6">{d as string}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
