import React, { useState } from 'react';
import { Link2, Copy, Check, MessageCircle, Home, Users } from 'lucide-react';
import { copyText } from '../../utils/shareKit';
import { waLink } from '../../utils/helpers';

/*
  لينكات الإحالة بتاعة السيلز.

  لينكين، كل واحد بكود السيلز:

  1. لينك المالك — المالك يفتحه ويملا شقته بنفسه بالصور، والطلب بيوصل
     للمراجعة مكتوب عليه مين جابه.

  2. لينك العميل — العميل يفتح الموقع عادي، بس إحنا بنسجّل إن فلان هو
     اللي جابه. ومهما رجع بعد كده من جوجل أو من أي حتة، الكريدت بيفضل
     لأول واحد جابه (أول لمسة بتتقفل ومبتتغيّرش).
*/

interface Props {
  /** كود السيلز — بيتسجّل على الشقة وعلى العميل */
  byCode?: string;
  byName?: string;
}

type Kind = 'owner' | 'client';

export const OwnerLinkCard: React.FC<Props> = ({ byCode, byName }) => {
  const [kind, setKind] = useState<Kind>('owner');
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://elsab3.com';
  const ref = byCode ? `ref=${encodeURIComponent(byCode)}` : '';
  const link =
    kind === 'owner'
      ? `${origin}/?owner=1${ref ? `&${ref}` : ''}`
      : `${origin}/${ref ? `?${ref}` : ''}`;

  const msg =
    kind === 'owner'
      ? [
          'أهلاً بحضرتك 👋',
          '',
          'عشان نعرض شقتك على موقع السبع للعقارات، املا البيانات من اللينك ده:',
          link,
          '',
          'هتاخد منك دقيقتين — المساحة والدور والسعر وصور الشقة.',
          'وهنراجعها ونرد عليك.',
          '',
          `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
        ].join('\n')
      : [
          'أهلاً بحضرتك 👋',
          '',
          'ده موقعنا، تقدر تتفرج على كل الشقق المتاحة بالهضبة الوسطى بالصور والأسعار:',
          link,
          '',
          'وأي شقة تعجبك كلّمني وأنا أرتبلك المعاينة.',
          '',
          `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
        ].join('\n');

  const copy = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2500);
    if (!ok) window.prompt('انسخ اللينك:', link);
  };

  const tab = (on: boolean) =>
    `flex-1 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border transition ${
      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'
    }`;

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Link2 size={17} className="text-[#A07A26] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-extrabold text-[#141414] text-sm">
            لينكاتك {byName ? `· ${byName}` : ''}
          </p>
          <p className="text-[11px] text-[#6B665C] leading-relaxed">
            اللينكين شايلين كودك — أي حد يدخل منهم بيتسجّل إنك إنت اللي جبته.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setKind('owner'); setCopied(false); }} className={tab(kind === 'owner')}>
          <Home size={13} /> لينك المالك
        </button>
        <button onClick={() => { setKind('client'); setCopied(false); }} className={tab(kind === 'client')}>
          <Users size={13} /> لينك العميل
        </button>
      </div>

      <p className="text-[11px] text-[#6B665C] leading-relaxed bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2">
        {kind === 'owner'
          ? 'المالك يفتحه ويملا شقته بنفسه بالصور. الطلب بيوصل للمراجعة مكتوب عليه إنك إنت اللي جبته.'
          : 'العميل يتفرج على الشقق عادي. لو رجع بعد شهر من جوجل، برضه محسوب ليك — أول لمسة بتتقفل.'}
      </p>

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

      {!byCode && (
        <p className="text-[11px] text-[#9E2A1B] leading-relaxed">
          مفيش كود سيلز — اللينك هيشتغل بس مش هيتسجّل باسم حد.
        </p>
      )}
    </div>
  );
};

export default OwnerLinkCard;
