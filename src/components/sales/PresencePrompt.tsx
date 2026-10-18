import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeDailySettings, DailySettings, DEFAULT_DAILY_SETTINGS, subscribeMyDay, workDay, cairoDay, errText } from '../../services/dailyTasks';
import { checkTimes, answerCheck, subscribePresenceOfDay, PresenceCheck } from '../../services/presence';

/*
  بوب أب «إنت موجود؟» للسيلز اللي داخلين المهام اليومية.
  بيظهر في ميعاد عشوائي كل ساعة شغل، ومايختفيش غير لما يدوس «موجود».
*/
export const PresencePrompt: React.FC<{ agentId: string; agentName: string }> = ({ agentId, agentName }) => {
  const [settings, setSettings] = useState<DailySettings>(DEFAULT_DAILY_SETTINGS);
  const [off, setOff] = useState(false);
  const [checks, setChecks] = useState<PresenceCheck[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const day = cairoDay(now);

  useEffect(() => subscribeDailySettings(setSettings), []);
  useEffect(() => (agentId ? subscribeMyDay(agentId, workDay(Date.now(), settings.closeHour), (d) => setOff(!!d?.off)) : undefined), [agentId, settings.closeHour]);
  useEffect(() => (agentId ? subscribePresenceOfDay(day, setChecks, agentId) : undefined), [agentId, day]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t); }, []);

  if (!agentId || off || !settings.agentIds.includes(agentId)) return null;

  const sched = checkTimes(agentId, day, settings.startHour, settings.closeHour).filter((s) => s.dueAt <= now);
  const last = sched[sched.length - 1];
  if (!last || checks.some((c) => c.slot === last.slot)) return null;

  const mins = Math.max(0, Math.round((now - last.dueAt) / 60000));
  const missed = sched.filter((s) => s.slot !== last.slot && !checks.some((c) => c.slot === s.slot)).length;

  const answer = async () => {
    setBusy(true); setErr('');
    try { await answerCheck(agentId, agentName, day, last.slot, last.dueAt); }
    catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] bg-black/75 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3 shadow-2xl">
        <p className="text-4xl">👋</p>
        <p className="font-extrabold text-lg">إنت موجود يا {agentName.split(' ')[0]}؟</p>
        <p className="text-sm text-[#6B665C]">دوس «موجود» عشان تكمّل شغلك.</p>
        {mins >= 2 && <p className="text-xs font-bold text-[#C2412D]">التذكير ده من {mins} دقيقة</p>}
        {missed > 0 && <p className="text-[11px] text-[#8C877D]">فاتك {missed} تذكير النهارده من غير رد</p>}
        {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
        <button disabled={busy} onClick={answer} className="w-full py-4 rounded-2xl bg-[#1E7A45] text-white font-extrabold text-lg disabled:opacity-60">
          {busy ? '...' : 'موجود ✓'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default PresencePrompt;
