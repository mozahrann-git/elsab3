import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeDailySettings, DailySettings, DEFAULT_DAILY_SETTINGS, subscribeMyDay, workDay, cairoDay, cairoHour, errText } from '../../services/dailyTasks';
import { answerCheck, openIdleCheck, subscribePresenceOfDay, PresenceCheck, IDLE_MIN, isFriday } from '../../services/presence';

/*
  «إنت موجود؟» — مابيطلعش للسيلز وهو شغال.
  بيطلع بس لو مالمسش الموقع (ضغط، كتابة، سكرول) نص ساعة في وقت الشغل.
  آخر لمسة بتتحفظ على الجهاز، فلو قفل الموقع ساعة ورجع بيطلعله أول ما يفتح.
  ومايختفيش غير لما يدوس «موجود»، وبيتسجّل رد بعد قد إيه.
*/
const KEY = (id: string) => `presence_last_${id}`;
const readLast = (id: string) => { try { return Number(localStorage.getItem(KEY(id))) || 0; } catch { return 0; } };
const writeLast = (id: string, t: number) => { try { localStorage.setItem(KEY(id), String(t)); } catch { /* */ } };

export const PresencePrompt: React.FC<{ agentId: string; agentName: string }> = ({ agentId, agentName }) => {
  const [settings, setSettings] = useState<DailySettings>(DEFAULT_DAILY_SETTINGS);
  const [off, setOff] = useState(false);
  const [checks, setChecks] = useState<PresenceCheck[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const day = cairoDay(now);
  const opening = useRef('');

  useEffect(() => subscribeDailySettings(setSettings), []);
  useEffect(() => (agentId ? subscribeMyDay(agentId, workDay(Date.now(), settings.closeHour), (d) => setOff(!!d?.off)) : undefined), [agentId, settings.closeHour]);
  useEffect(() => (agentId ? subscribePresenceOfDay(day, setChecks, agentId) : undefined), [agentId, day]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t); }, []);

  const pending = checks.filter((c) => !(c.answeredAt > 0)).sort((a, b) => b.dueAt - a.dueAt)[0];

  /* أي لمسة في الموقع = شغال. مابنحسبش اللمس والسؤال ظاهر — لازم يدوس «موجود» */
  useEffect(() => {
    if (!agentId) return;
    if (!readLast(agentId)) writeLast(agentId, Date.now());
    let lastWrite = 0;
    const touch = () => {
      if (pending) return;
      const t = Date.now();
      if (t - lastWrite < 15000) return;
      lastWrite = t; writeLast(agentId, t);
    };
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, touch, { capture: true } as any));
  }, [agentId, !!pending]);

  const inTeam = !!agentId && !off && settings.agentIds.includes(agentId) && !isFriday(day);
  const h = cairoHour(now);
  const workHours = h >= settings.startHour && h < settings.closeHour;

  /* بداية وقت الشغل النهارده — قبلها مش بنحسب إنه «مش موجود» */
  const startToday = (() => { const d = new Date(now); const off = h - d.getHours(); const s = new Date(now); s.setHours(settings.startHour - off, 0, 0, 0); return s.getTime(); })();
  const idleSince = Math.max(readLast(agentId), startToday);
  const idleFor = now - idleSince;

  /* عدّى نص ساعة من غير ولا لمسة → نسجّل التذكير مرة واحدة */
  useEffect(() => {
    if (!inTeam || !workHours || pending || idleFor < IDLE_MIN * 60000) return;
    const dueAt = idleSince + IDLE_MIN * 60000;
    const slot = Math.floor(dueAt / 60000);
    const key = `${day}_${slot}`;
    if (opening.current === key) return;
    opening.current = key;
    openIdleCheck(agentId, agentName, day, slot, dueAt, idleSince).catch((e) => setErr(errText(e)));
  }, [inTeam, workHours, !!pending, idleFor >= IDLE_MIN * 60000, idleSince, day]);

  if (!inTeam || !pending) return null;

  const mins = Math.max(0, Math.round((now - pending.dueAt) / 60000));
  const idleMins = Math.round((now - ((pending as any).idleSince || pending.dueAt - IDLE_MIN * 60000)) / 60000);

  const answer = async () => {
    setBusy(true); setErr('');
    try { await answerCheck(agentId, agentName, pending.day, pending.slot, pending.dueAt); writeLast(agentId, Date.now()); }
    catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#FFFDF8] rounded-[28px] p-6 max-w-sm w-full text-center space-y-3 shadow-2xl">
        <p className="text-4xl">👋</p>
        <p className="font-readex font-semibold text-xl">إنت موجود يا {agentName.split(' ')[0]}؟</p>
        <p className="text-sm text-[#6F695D]">مفيش شغل على السيستم من {idleMins >= 60 ? `${Math.round(idleMins / 60)} ساعة` : `${idleMins} دقيقة`}. دوس «موجود» وكمّل.</p>
        {mins >= 2 && <p className="text-xs font-bold text-[#D3262B]">السؤال ده من {mins} دقيقة</p>}
        {err && <p className="text-xs font-bold text-[#D3262B]">{err}</p>}
        <button disabled={busy} onClick={answer} className="w-full h-14 rounded-[18px] bg-[#22483A] text-white font-bold text-lg disabled:opacity-60">
          {busy ? '...' : 'موجود ✓'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default PresencePrompt;
