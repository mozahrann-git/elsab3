import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellRing, Phone, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
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

  /* كل المتابعات اللي فات ميعادها — مش أول واحدة بس.
     قبل كده كنا بناخد [0] وبس، فلما يكون في ١٠٠ متابعة مستحقة، كل ما
     تقفل واحدة اللي بعدها تنطّ على طول — ١٠٠ بوب-أب و١٠٠ صفارة.
     دلوقتي بنعرف العدد كله، فنقدر نقول "ده ١ من ١٠٠" ونقفلهم كلهم بضغطة. */
  const dueList = useMemo(() => {
    const now = Date.now();
    return mine
      .filter((l) => typeof l.nextActionAt === 'number' && l.nextActionAt! <= now)
      .filter((l) => l.followUpStatus !== 'completed' && l.status !== 'closed' && l.status !== 'lost')
      .filter((l) => !seen.has(`${l.id}:${l.nextActionAt}`))
      .sort((a, b) => (a.nextActionAt || 0) - (b.nextActionAt || 0));
  }, [mine, tick, seen]);

  const nextDue = dueList[0] || null;

  useEffect(() => {
    if (!nextDue || due) return;
    const first = !due;
    setDue(nextDue);
    // صفارة واحدة للدفعة كلها، مش صفارة مع كل اسم
    if (first) beep();

    // إشعار بره الصفحة — واحد بس مهما كان العدد
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(
          dueList.length > 1 ? `${dueList.length} متابعة مستحقة` : 'متابعة مستحقة دلوقتي',
          {
            body: `${nextDue.name} · ${nextDue.phone}${dueList.length > 1 ? ` و${dueList.length - 1} غيره` : ''}`,
            tag: 'elsab3-followup',          // تاج ثابت = إشعار واحد بيتحدّث، مش كومة
            requireInteraction: true,
          },
        );
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

  /* لما المتأخرين يعدّوا ٢٠ — قفلهم كلهم مرة واحدة (لحد الريفرش الجاي) */
  const dismissAll = () => {
    setSeen((prev) => {
      const next = new Set<string>(prev);
      dueList.forEach((l) => next.add(`${l.id}:${l.nextActionAt}`));
      if (due) next.add(`${due.id}:${due.nextActionAt}`);
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

      {/* كارت التنبيه: بيطلع على جنب ومش بيوقف الشاشة. «مش دلوقتي» بتتفتح بعد ٨ ثواني
          عشان يلحق يقرا الملاحظة/الفيدباك قبل ما يأجّل */}
      {due && createPortal(<DueCard key={`${due.id}:${due.nextActionAt}`} lead={due} more={dueList.length - 1}
        onLater={() => dismiss(due)} onOpen={() => { const l = due; dismiss(l); onOpenLead(l); }}
        onCloseAll={dueList.length > 20 ? dismissAll : undefined} />, document.body)}
    </>
  );
};

export default FollowUpPopup;

const WAIT = 8;
const DueCard: React.FC<{ lead: Lead; more: number; onLater: () => void; onOpen: () => void; onCloseAll?: () => void }> = ({ lead, more, onLater, onOpen, onCloseAll }) => {
  const [left, setLeft] = useState(WAIT);
  const [shown, setShown] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  /* آخر حاجة اتكتبت عن العميل — غالباً الفيدباك أو كومنت المكالمة اللي فاتت */
  const lastAct = (lead.activity || []).slice().sort((x, y) => (y.at || 0) - (x.at || 0))[0];
  const note = lead.followUpNote || lastAct?.comment || '';
  const since = lead.nextActionAt ? Math.max(0, Math.round((Date.now() - lead.nextActionAt) / 60000)) : 0;
  const sinceTxt = since < 1 ? 'دلوقتي' : since < 60 ? `من ${since} دقيقة` : since < 1440 ? `من ${Math.round(since / 60)} ساعة` : `من ${Math.round(since / 1440)} يوم`;

  return (
    <section
      dir="rtl" role="status" aria-live="polite"
      className={`fixed z-[90] left-3 right-3 sm:right-auto sm:left-5 sm:w-[380px] bottom-3 sm:bottom-5 transition-all duration-500 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white rounded-3xl shadow-[0_18px_50px_rgba(20,20,20,0.28)] border border-[#E8D3A6] overflow-hidden">
        <div className="bg-gradient-to-l from-[#FBF1DA] to-[#FFFDF8] px-4 pt-3.5 pb-3 flex items-center gap-3">
          <span className="relative w-10 h-10 rounded-2xl bg-[#A07A26] text-white flex items-center justify-center shrink-0">
            <Bell size={18} className="animate-[wiggle_1s_ease-in-out_2]" />
            <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-[#C2412D] ring-2 ring-white animate-ping" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[#A07A26]">⏰ ميعاد متابعة {sinceTxt}{more > 0 ? ` · و${more} غيره` : ''}</p>
            <p className="font-extrabold text-[17px] text-[#141414] truncate">{lead.name}</p>
            <p className="font-mono text-xs text-[#6B665C]" dir="ltr">{lead.phone}</p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 space-y-2.5">
          {note && (
            <p className="text-[13px] text-[#3d3a35] bg-[#F6F4EF] rounded-2xl px-3 py-2 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-line">
              {note}
            </p>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            <a href={generateCallLink(lead.phone)} className="py-2.5 rounded-xl bg-[#141414] text-white font-bold text-xs flex items-center justify-center gap-1.5"><Phone size={14} />اتصال</a>
            <a href={generateWhatsAppLink(lead.phone, undefined, undefined, `مرحباً ${lead.name}،`)} target="_blank" rel="noopener noreferrer"
              className="py-2.5 rounded-xl bg-[#1E7A45] text-white font-bold text-xs flex items-center justify-center gap-1.5"><MessageCircle size={14} />واتساب</a>
            <button onClick={onOpen} className="py-2.5 rounded-xl bg-[#A07A26] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"><CheckCircle2 size={14} />سجّل</button>
          </div>
          <button
            disabled={left > 0}
            onClick={onLater}
            className="relative w-full py-2 rounded-xl bg-[#F6F4EF] text-[#6B665C] font-bold text-xs flex items-center justify-center gap-1.5 overflow-hidden disabled:cursor-not-allowed"
          >
            {left > 0 && <span className="absolute inset-y-0 right-0 bg-[#ECE4D2] transition-all duration-1000 ease-linear" style={{ width: `${((WAIT - left) / WAIT) * 100}%` }} />}
            <span className="relative flex items-center gap-1.5"><Clock size={13} />{left > 0 ? `اقرا الأول… مش دلوقتي بعد ${left}` : 'مش دلوقتي'}</span>
          </button>
          {onCloseAll && (
            <button onClick={onCloseAll} className="w-full py-2 rounded-xl border border-[#E8D3A6] text-[#8E6C1F] font-bold text-xs cursor-pointer">
              اقفلهم كلهم ({more + 1})
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
