import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Copy, Check, MessageCircle, Home, Users, X } from 'lucide-react';
import { copyText } from '../../utils/shareKit';
import { waLink } from '../../utils/helpers';
import { agentCode } from '../../services/referralService';

/*
  لينكات الإحالة.

  زرار صغير بيفتح ورقة. مش كارت مفتوح على طوله في نص مسار العملاء —
  السيلز بيبعت اللينك مرة في اليوم، مش محتاج يشوفه قدامه طول الوقت.

  واللينك نفسه مابيتعرضش خام. الكود بقى اسم مقروء (MARIAMK) مش رقم
  داخلي — ده حاجة بتتبعت لمالك، المفروض تبقى شكلها محترم.
*/

interface Props {
  byCode?: string;      // الـ id الداخلي — بيستخدم كاحتياطي بس
  byName?: string;
}

type Kind = 'owner' | 'client';

export const OwnerLinkCard: React.FC<Props> = ({ byCode, byName }) => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('owner');
  const [copied, setCopied] = useState(false);

  const code = agentCode(byName, byCode);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://elsab3.com';
  const link = kind === 'owner'
    ? `${origin}/?owner=1&ref=${code}`
    : `${origin}/?ref=${code}`;

  const msg = kind === 'owner'
    ? [
        'أهلاً بحضرتك 👋',
        '',
        'عشان نعرض شقتك على موقع السبع للعقارات، املا البيانات من اللينك ده:',
        link,
        '',
        'هتاخد منك دقيقتين — المساحة والدور والسعر وصور الشقة.',
        '',
        `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
      ].join('\n')
    : [
        'أهلاً بحضرتك 👋',
        '',
        'ده موقعنا، اتفرج على الشقق المتاحة بالهضبة الوسطى بالصور والأسعار:',
        link,
        '',
        'وأي شقة تعجبك كلّمني وأنا أرتبلك المعاينة.',
        '',
        `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
      ].join('\n');

  const copy = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
    if (!ok) window.prompt('انسخ اللينك:', link);
  };

  const tab = (on: boolean) =>
    `flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border transition ${
      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'
    }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-[11px] font-bold text-[#141414] flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        <Link2 size={13} className="text-[#A07A26]" />
        لينكاتي
      </button>

      {open && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#F6F4EF] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <header className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-sm">لينكاتي</p>
                <p className="text-[11px] text-[#CFCBC2]">كودك: <span className="font-mono font-bold text-[#D9B864]">{code}</span></p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10 cursor-pointer">
                <X size={18} />
              </button>
            </header>

            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => { setKind('owner'); setCopied(false); }} className={tab(kind === 'owner')}>
                  <Home size={13} /> مالك
                </button>
                <button onClick={() => { setKind('client'); setCopied(false); }} className={tab(kind === 'client')}>
                  <Users size={13} /> عميل
                </button>
              </div>

              <p className="text-[11px] text-[#6B665C] leading-relaxed">
                {kind === 'owner'
                  ? 'المالك يفتحه ويملا شقته بنفسه بالصور، والطلب بيوصلك مكتوب عليه إنك إنت اللي جبته.'
                  : 'العميل يتفرج على الشقق. لو رجع بعد شهر من جوجل، برضه محسوب ليك.'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={waLink('', msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="py-3 rounded-xl bg-[#1FA85D] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={14} /> ابعته واتساب
                </a>
                <button
                  onClick={copy}
                  className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
                    copied ? 'bg-[#EEF5F0] border-[#BFE0CC] text-[#1E7A45]' : 'bg-white border-[#E4DFD4] text-[#141414]'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'اتنسخ ✓' : 'انسخ اللينك'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default OwnerLinkCard;
