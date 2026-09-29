import React, { useEffect, useMemo, useState } from 'react';
import { Sun, CheckCircle2, Clock, XCircle, HelpCircle, MessageCircle, Send, Copy } from 'lucide-react';
import {
  FieldAgent, FieldCheckIn, subscribeCheckIns, markCheckInAsked, todayKey,
} from '../../services/portalService';
import { waLink } from '../../utils/helpers';

/*
  نداء الصباح: بيقولك مين من المندوبين متاح النهارده ومين لسه مردّش.
  الرد بيجي من لينك بيتبعت في الواتساب — المندوب بيدوس زرار واحد وخلاص.
*/

const fmtTime = (t?: number) =>
  t ? new Date(t).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

const STATE = {
  available: { label: 'متاح', cls: 'bg-[#EEF5F0] text-[#1E7A45] border-[#BFE0CC]', Icon: CheckCircle2 },
  busy: { label: 'مشغول شوية', cls: 'bg-[#FAF4E5] text-[#A07A26] border-[#E9DFCA]', Icon: Clock },
  off: { label: 'مش متاح', cls: 'bg-[#FDF2F0] text-[#C2412D] border-[#E8C2BA]', Icon: XCircle },
} as const;

export const MorningRollCall: React.FC<{ agents: FieldAgent[]; showToast?: (m: string) => void }> = ({ agents, showToast }) => {
  const [checkIns, setCheckIns] = useState<Record<string, FieldCheckIn>>({});
  const day = todayKey();

  useEffect(() => subscribeCheckIns(day, setCheckIns), [day]);

  const activeAgents = useMemo(() => agents.filter((a) => a.active !== false), [agents]);

  const counts = useMemo(() => {
    let available = 0, busy = 0, off = 0, silent = 0;
    activeAgents.forEach((a) => {
      const s = checkIns[a.id]?.status;
      if (s === 'available') available += 1;
      else if (s === 'busy') busy += 1;
      else if (s === 'off') off += 1;
      else silent += 1;
    });
    return { available, busy, off, silent };
  }, [activeAgents, checkIns]);

  const linkFor = (a: FieldAgent) => `${window.location.origin}/?checkin=${a.id}`;
  const msgFor = (a: FieldAgent) =>
    `صباح الخير يا ${a.name} 👋\n\nقولنا إنت متاح لمعاينات النهارده ولا لأ، من اللينك ده — دوسة واحدة وخلاص:\n${linkFor(a)}\n\nالسبع للعقارات`;

  const ask = (a: FieldAgent) => {
    markCheckInAsked({ id: a.id, name: a.name }).catch(() => {});
    window.open(waLink(a.phone, msgFor(a)), '_blank');
  };

  const copyAll = async () => {
    const text = activeAgents.map((a) => `${a.name}: ${linkFor(a)}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast?.('اتنسخت لينكات كل المندوبين');
    } catch {
      showToast?.('المتصفح مش سامح بالنسخ');
    }
  };

  if (activeAgents.length === 0) {
    return (
      <div className="p-6 bg-white border border-dashed border-[#DCD6CA] rounded-2xl text-center">
        <p className="font-bold text-[#141414]">مفيش مندوبين نشطين</p>
        <p className="text-xs text-[#6B665C] mt-1">ضيف مندوبين الأول عشان تقدر تعمل نداء الصباح.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-[#FAF4E5] text-[#A07A26] flex items-center justify-center"><Sun size={20} /></span>
            <div>
              <p className="font-extrabold text-[#141414]">نداء الصباح</p>
              <p className="text-[11px] text-[#6B665C]">مين متاح لمعاينات النهارده</p>
            </div>
          </div>
          <button onClick={copyAll} className="px-3 py-2 bg-white border border-[#ECE8DF] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
            <Copy size={13} /> انسخ كل اللينكات
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat n={counts.available} label="متاح" cls="text-[#1E7A45]" />
          <Stat n={counts.busy} label="مشغول" cls="text-[#A07A26]" />
          <Stat n={counts.off} label="مش متاح" cls="text-[#C2412D]" />
          <Stat n={counts.silent} label="لسه مردّش" cls="text-[#6B665C]" />
        </div>

        {counts.silent > 0 && (
          <button
            onClick={() => activeAgents.filter((a) => !checkIns[a.id]?.status).forEach((a, i) => setTimeout(() => ask(a), i * 600))}
            className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={15} /> ابعت النداء للـ {counts.silent} اللي مردّوش
          </button>
        )}
      </div>

      <div className="space-y-2">
        {activeAgents.map((a) => {
          const c = checkIns[a.id];
          const st = c?.status ? STATE[c.status] : null;
          return (
            <div key={a.id} className={`bg-white border rounded-2xl p-4 space-y-2 ${st ? 'border-[#ECE8DF]' : 'border-dashed border-[#DCD6CA]'}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-extrabold text-[#141414]">{a.name}</p>
                  <p className="font-mono text-xs text-[#6B665C]" dir="ltr">{a.phone}</p>
                </div>

                {st ? (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${st.cls}`}>
                    <st.Icon size={13} /> {st.label}
                    {c?.at ? <span className="opacity-70 font-mono">· {fmtTime(c.at)}</span> : null}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#DCD6CA] text-[#6B665C] flex items-center gap-1.5">
                    <HelpCircle size={13} /> لسه مردّش
                    {c?.askedAt ? <span className="opacity-70 font-mono">· اتبعتله {fmtTime(c.askedAt)}</span> : null}
                  </span>
                )}
              </div>

              {c?.note ? (
                <p className="text-xs text-[#4A463F] bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl px-3 py-2">{c.note}</p>
              ) : null}

              <button
                onClick={() => ask(a)}
                className="w-full py-2.5 rounded-xl bg-[#1E7A45] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={14} /> {c?.status ? 'ابعتله تاني' : c?.askedAt ? 'فكّره' : 'ابعتله النداء'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stat: React.FC<{ n: number; label: string; cls: string }> = ({ n, label, cls }) => (
  <div className="bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl py-2.5">
    <p className={`text-2xl font-extrabold font-mono ${cls}`}>{n}</p>
    <p className="text-[10px] text-[#6B665C] mt-0.5">{label}</p>
  </div>
);

export default MorningRollCall;
