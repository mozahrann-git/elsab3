import React, { useState } from 'react';
import { Link2, Copy, Check, MessageCircle } from 'lucide-react';
import { copyText } from '../../utils/shareKit';
import { waLink } from '../../utils/helpers';

/*
  لينك المالك.

  بدل ما السيلز يقعد يكتب بيانات الشقة من المالك على الواتساب وينقلها
  بإيده، بيبعتله لينك — المالك يفتحه ويملا الشقة بنفسه بالصور،
  والطلب بيوصل لمراجعة الإدارة على طول.

  اللينك بيشيل كود اللي بعته، فأي شقة تيجي منه بتتحسب ليه.
*/

interface Props {
  /** اسم أو كود اللي بيبعت — بيتسجّل على الشقة */
  byCode?: string;
  byName?: string;
}

export const OwnerLinkCard: React.FC<Props> = ({ byCode, byName }) => {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://elsab3.com';
  const link = `${origin}/?owner=1${byCode ? `&by=${encodeURIComponent(byCode)}` : ''}`;

  const msg = [
    'أهلاً بحضرتك 👋',
    '',
    'عشان نعرض شقتك على موقع السبع للعقارات، املا البيانات من اللينك ده:',
    link,
    '',
    'هتاخد منك دقيقتين — المساحة والدور والسعر وصور الشقة.',
    'وهنراجعها ونرد عليك.',
    '',
    `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
  ].join('\n');

  const copy = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2500);
    if (!ok) window.prompt('انسخ اللينك:', link);
  };

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Link2 size={17} className="text-[#A07A26] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-extrabold text-[#141414] text-sm">لينك المالك</p>
          <p className="text-[11px] text-[#6B665C] leading-relaxed">
            ابعته لأي مالك عشان يضيف شقته بنفسه بالصور. الشقة بتوصلك للمراجعة قبل ما تظهر على الموقع.
          </p>
        </div>
      </div>

      <p className="font-mono text-[11px] bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2.5 break-all" dir="ltr">
        {link}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={waLink('', msg)}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 rounded-xl bg-[#1FA85D] text-white font-bold text-xs flex items-center justify-center gap-1.5"
        >
          <MessageCircle size={14} /> ابعته واتساب
        </a>
        <button
          onClick={copy}
          className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
            copied ? 'bg-[#EEF5F0] border-[#BFE0CC] text-[#1E7A45]' : 'bg-[#F6F4EF] border-[#E4DFD4] text-[#141414]'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'اتنسخ ✓' : 'انسخ اللينك'}
        </button>
      </div>

      {byCode && (
        <p className="text-[11px] text-[#8C877D] leading-relaxed">
          أي شقة تيجي من اللينك ده هتتسجّل باسمك.
        </p>
      )}
    </div>
  );
};

export default OwnerLinkCard;
