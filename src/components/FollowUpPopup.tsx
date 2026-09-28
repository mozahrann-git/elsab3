import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellRing, Phone, MessageCircle, Clock, X, CheckCircle2 } from 'lucide-react';
import { Lead } from '../types';
import { generateWhatsAppLink, generateCallLink } from '../utils/helpers';

/*
  تنبيه المتابعة المنبثق.
  بيشتغل على تلات مستويات عشان يوصل في كل الحالات:
  1) بوب-أب كبير جوّه الموقع — ده الأكيد، بيشتغل على اللاب والموبايل طول ما الصفحة مفتوحة.
  2) إشعار المتصفح — بيطلع بره الصفحة على اللاب حتى لو التاب في الخلفية.
  3) صوت خفيف — عشان لو الشاشة بعيدة.

  ملاحظة مهمة: من غير تطبيق مثبّت، إشعارات الموبايل مبتيجيش والمتصفح مقفول.
  فالبوب-أب جوّه الموقع هو اللي بيضمن الوصول.
*/

const SEEN_KEY = 'elsab3_followup_alerted';

const readSeen = (): Set<string> => {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set<string>();
  }
};
const writeSeen = (s: Set<string>) => {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* الوضع الخاص */ }
};

/** صفارة قصيرة من غير ملف صوت */
function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch { /* المتصفح مش سامح بصوت من غير تفاعل */ }
}

interface Props {
  leads: Lead[];
  currentAgentId?: string;
  /** الإدارة بتشوف تنبيهات الكل، السيلز بيشوف عملاءه هو */
  seeAll?: boolean;
  onOpenLead: (lead: Lead) => void;
}

export const FollowUpPopup: React.FC<Props> = ({ leads, currentAgentId, seeAll, onOpenLead }) => {
  const [due, setDue] = useState<Lead | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [askDismissed, setAskDismissed] = useState(false);
  /* لازم تكون state مش ref: لو ref، الحساب اللي تحت مبيتعادش لما نقفل التنبيه،
     فبيلاقي نفس المتابعة لسه مستحقة ويفتح تاني على طول — وده اللي كان بيخلّيه يعلّق. */
  const [seen, setSeen] = useState<Set<string>>(() => readSeen());
  const [tick, setTick] = useState(0);

  // بنراجع كل نص دقيقة: الميعاد ممكن يعدّي والصفحة مفتوحة
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const mine = useMemo(
    () => leads.filter((l) => seeAll || (currentAgentId && l.assignedAgentId === currentAgentId)),
    [leads, currentAgentId, seeAll],
  );

  // أول متابعة فات ميعادها ولسه مقفلتش
  const nextDue = useMemo(() => {
    const now = Date.now();
    return mine
      .filter((l) => typeof l.nextActionAt === 'number' && l.nextActionAt! <= now)
      .filter((l) => l.followUpStatus !== 'completed' && l.status !== 'closed' && l.status !== 'lost')
      .filter((l) => !seen.has(`${l.id}:${l.nextActionAt}`))
      .sort((a, b) => (a.nextActionAt || 0) - (b.nextActionAt || 0))[0] || null;
  }, [mine, tick, seen]);

  useEffect(() => {
    if (!nextDue || due) return;
    setDue(nextDue);
    beep();

    // إشعار بره الصفحة — بيشتغل على اللاب أساساً
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification('متابعة مستحقة دلوقتي', {
          body: `${nextDue.name} · ${nextDue.phone}${nextDue.followUpNote ? `\n${nextDue.followUpNote}` : ''}`,
          tag: `followup-${nextDue.id}`,
          requireInteraction: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* بعض المتصفحات بترفض من غير Service Worker */ }
    }
  }, [nextDue, due]);

  const dismiss = (lead: Lead) => {
    setSeen((prev) => {
      const next = new Set<string>(prev);
      next.add(`${lead.id}:${lead.nextActionAt}`);
      writeSeen(next);
      return next;
    });
    setDue(null);
  };

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const r = await Notification.requestPermission();
      setPerm(r);
      if (r === 'granted') {
        const n = new Notification('تمام، الإشعارات اشتغلت', {
          body: 'هتوصلك تنبيهات المتابعة هنا على الجهاز ده.',
          tag: 'elsab3-test',
        });
        setTimeout(() => n.close(), 6000);
      }
    } catch { /* المستخدم رفض */ }
  };

  const showAsk = perm === 'default' && !askDismissed && typeof Notification !== 'undefined';

  return (
    <>
      {/* طلب إذن الإشعارات — شريط صغير مش مزعج */}
      {showAsk && createPortal(
        <div
          dir="rtl"
          className="fixed z-[75] bottom-4 right-4 left-4 sm:left-auto sm:w-96 bg-[#141414] text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <BellRing size={20} className="text-[#D9B864] shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-bold">فعّل تنبيهات المتابعة</p>
            <p className="text-xs text-white/70 leading-relaxed">
              عشان يوصلك التنبيه وانت مش فاتح الصفحة.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={askPermission} className="px-3.5 py-2 bg-[#D9B864] text-[#141414] text-xs font-bold rounded-xl cursor-pointer">فعّل</button>
              <button onClick={() => setAskDismissed(true)} className="px-3 py-2 text-white/60 text-xs font-bold cursor-pointer">بعدين</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* البوب-أب نفسه */}
      {due && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button aria-label="إغلاق" className="absolute inset-0 bg-black/60" onClick={() => dismiss(due)} />
          <section
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-md bg-[#F6F4EF] rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="bg-[#141414] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#C2412D] flex items-center justify-center">
                  <Bell size={17} />
                </span>
                <div>
                  <p className="font-bold text-base leading-tight">متابعة مستحقة دلوقتي</p>
                  <p className="text-[11px] text-white/60">الميعاد اللي إنت حددته عدّى</p>
                </div>
              </div>
              <button onClick={() => dismiss(due)} aria-label="إغلاق" className="p-2 cursor-pointer"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-2xl font-extrabold text-[#141414]">{due.name}</p>
                <p className="font-mono text-base text-[#6B665C]" dir="ltr">{due.phone}</p>
              </div>

              {due.followUpNote && (
                <p className="text-sm text-[#4A463F] bg-white border border-[#ECE8DF] rounded-2xl px-4 py-3 leading-relaxed">
                  {due.followUpNote}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={generateCallLink(due.phone)}
                  className="py-3.5 rounded-2xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Phone size={16} /> اتصال
                </a>
                <a
                  href={generateWhatsAppLink(due.phone, undefined, undefined, `مرحباً ${due.name}،`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 rounded-2xl bg-[#1E7A45] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} /> واتساب
                </a>
              </div>

              <button
                onClick={() => { const l = due; dismiss(l); onOpenLead(l); }}
                className="w-full py-3.5 rounded-2xl bg-[#A07A26] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} /> سجّل النتيجة والأكشن الجاي
              </button>

              <button
                onClick={() => dismiss(due)}
                className="w-full py-2.5 text-[#6B665C] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock size={13} /> مش دلوقتي
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
};

export default FollowUpPopup;
