import React, { useState } from 'react';
import { PhoneCall, Megaphone, Image as ImageIcon } from 'lucide-react';
import { QuestLog, CALL_OUTCOMES, summarizeCalls, summarizeAds } from '../../services/questLogService';

/*
  تلخيص شغل النهارده من السجل.

  المكالمات: كام ردّ، كام طلع ريكويست، كام مش مهتم، كام مردّش — والنِّسب.
  الإعلانات: كل منصة وكام إعلان عليها، والسكرين شوتس عشان تتراجع.
*/

interface Props {
  logs: QuestLog[];              // تسجيلات النهارده (مفلترة على الشخص المطلوب)
  compact?: boolean;
}

export const DayLogSummary: React.FC<Props> = ({ logs, compact }) => {
  const calls = summarizeCalls(logs);
  const ads = summarizeAds(logs);
  const shots = logs.filter((l) => l.screenshotUrl);
  const [open, setOpen] = useState<string | null>(null);

  if (!calls.total && !ads.length) {
    return compact ? null : (
      <p className="text-[11px] text-[#6B665C] bg-white border border-[#ECE8DF] rounded-xl px-3 py-2.5">
        مفيش مكالمات ولا إعلانات اتسجّلت النهارده.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* ===== المكالمات ===== */}
      {calls.total > 0 && (
        <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-extrabold text-[#141414] flex items-center gap-1.5">
              <PhoneCall size={13} className="text-[#A07A26]" /> المكالمات
            </p>
            <span className="text-[11px] font-bold text-[#6B665C]">
              {calls.total} مكالمة · ردّ {calls.answerRate}٪
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {CALL_OUTCOMES.map((o) => {
              const v = o.id === 'request' ? calls.request
                : o.id === 'answered' ? calls.answered - calls.request - calls.notInterested
                : o.id === 'not_interested' ? calls.notInterested
                : calls.noAnswer;
              return (
                <div key={o.id} className="rounded-xl border border-[#ECE8DF] bg-[#FAF8F3] py-2 px-1 text-center">
                  <p className="text-lg font-extrabold font-mono leading-none" style={{ color: o.hex }}>{v}</p>
                  <p className="text-[10px] text-[#6B665C] leading-tight mt-1">{o.label}</p>
                </div>
              );
            })}
          </div>

          {calls.answered > 0 && (
            <p className="text-[11px] text-[#6B665C] leading-relaxed">
              من اللي ردّوا، <b className="text-[#1E7A45]">{calls.requestRate}٪</b> طلعوا ريكويست.
            </p>
          )}
        </div>
      )}

      {/* ===== الإعلانات ===== */}
      {ads.length > 0 && (
        <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-extrabold text-[#141414] flex items-center gap-1.5">
              <Megaphone size={13} className="text-[#A07A26]" /> الإعلانات
            </p>
            <span className="text-[11px] font-bold text-[#6B665C]">
              {ads.reduce((n, a) => n + a.count, 0)} إعلان على {ads.length} منصة
            </span>
          </div>

          <div className="space-y-1.5">
            {ads.map((a) => (
              <div key={a.platform} className="flex items-center justify-between gap-2 text-[11.5px] border-b border-[#F2EFE9] last:border-0 pb-1.5 last:pb-0">
                <span className="font-bold text-[#141414]">{a.platform}</span>
                <span className="text-[#6B665C] shrink-0">
                  {a.count} إعلان
                  {a.withShot < a.count && (
                    <b className="text-[#9E2A1B] mr-1.5">{a.count - a.withShot} من غير صورة</b>
                  )}
                </span>
              </div>
            ))}
          </div>

          {shots.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-[#141414] flex items-center gap-1.5">
                <ImageIcon size={11} /> الإثباتات ({shots.length})
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {shots.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setOpen(l.screenshotUrl || null)}
                    className="shrink-0 cursor-pointer"
                    title={`${l.platform || ''} · ${l.agentName}`}
                  >
                    <img src={l.screenshotUrl} alt="" className="w-20 h-20 object-cover rounded-xl border border-[#ECE8DF]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* معاينة الصورة بالحجم الكامل */}
      {open && (
        <div className="fixed inset-0 z-[130] bg-black/85 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <img src={open} alt="" className="max-w-full max-h-[90dvh] rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default DayLogSummary;
