import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/*
  مؤشر المزامنة.

  من غيره، لما حد تاني يعدّل، الشاشة بتتغيّر لوحدها ومحدش عارف
  إيه اللي حصل ولا إمتى — فالناس بتفضل تعمل Refresh بإيدها وهي
  مش محتاجة. ده بيقول: متصل، وآخر تحديث وصل إمتى.
*/

const ago = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 5) return 'دلوقتي';
  if (s < 60) return `من ${s} ثانية`;
  const m = Math.round(s / 60);
  if (m === 1) return 'من دقيقة';
  if (m === 2) return 'من دقيقتين';
  if (m < 11) return `من ${m} دقايق`;
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.round(m / 60);
  return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ساعات`;
};

interface Props {
  /** بيتغيّر كل ما داتا جديدة توصل — عدد الليدز وتوقيع التعديلات */
  signature: string;
}

export const SyncBadge: React.FC<Props> = ({ signature }) => {
  const [online, setOnline] = useState(() => {
    try { return navigator.onLine; } catch { return true; }
  });
  const [lastAt, setLastAt] = useState(Date.now());
  const [flash, setFlash] = useState(false);
  const [, force] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // كل ما التوقيع يتغيّر يبقى في تحديث وصل
  useEffect(() => {
    setLastAt(Date.now());
    if (first.current) { first.current = false; return; }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [signature]);

  // بنعيد الرسم كل نص دقيقة عشان "من كام" تفضل صح
  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#FBEDEA] text-[#9E2A1B] border border-[#E9B8AE]">
        <WifiOff size={12} /> مفيش نت — التعديلات هتتبعت أول ما يرجع
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-colors ${
        flash
          ? 'bg-[#1F5FB0] text-white border-[#1F5FB0]'
          : 'bg-[#EEF5F0] text-[#1E7A45] border-[#BFE0CC]'
      }`}
      title="الشاشة بتتحدّث لوحدها — مش محتاج تعمل Refresh"
    >
      {flash ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />}
      {flash ? 'وصل تحديث' : `مباشر · آخر تحديث ${ago(Date.now() - lastAt)}`}
    </span>
  );
};

export default SyncBadge;
