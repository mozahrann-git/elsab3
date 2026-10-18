import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, Check, Phone } from 'lucide-react';
import { FieldFeedback, FieldAgent, BrokerFeedback, subscribeFieldFeedbackForSales, subscribeFieldAgents, salesConfirmFeedback, subscribeBrokerFeedbackForSales, groupFeedback, groupTitle } from '../../services/portalService';
import { generateCallLink } from '../../utils/helpers';

/*
  السيلز بيأكد الفيدباك اللي سارة راجعته، فيتنشر للمالك.
  الشكل: كل عميل كارت هادي، وجواه كل شقة طلع عليها — النجوم، الفويس
  بمشغّل بسيط، الكلام في فقاعة، وزرار تأكيد واحد. بعد التأكيد الكارت بيقفل بنعومة.
*/

const RATE_WORD = ['', 'وحشة', 'مش أوي', 'معقولة', 'عجبته', 'عجبته جداً'];
const isVoiceOnly = (t?: string) => !t || /^\(?\s*فويس\s*\)?$/.test(t.trim());
const mmss = (s: number) => (isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

export const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex items-center gap-1.5">
    <span className="flex" dir="ltr" aria-label={`${n} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= n ? '#C9A24A' : '#E7DFCF'}><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" /></svg>
      ))}
    </span>
    {n > 0 && <span className="text-[11px] font-bold text-[#8E6C1F]">{RATE_WORD[n]}</span>}
  </span>
);

/* مشغّل فويس صغير بدل مشغّل المتصفح التقيل */
export const Voice: React.FC<{ src: string }> = ({ src }) => {
  const a = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);
  const toggle = () => { const el = a.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause(); };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = a.current; if (!el || !d) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.max(0, Math.min(1, (r.right - e.clientX) / r.width)) * d;
  };
  const pct = d ? (t / d) * 100 : 0;
  return (
    <div className="flex items-center gap-3 rounded-full bg-[#F5F0E6] p-1.5 pl-4">
      <button type="button" onClick={toggle} aria-label={on ? 'وقف' : 'شغّل'}
        className="w-10 h-10 shrink-0 rounded-full bg-[#17150F] text-[#F5F0E6] flex items-center justify-center transition-transform active:scale-90">
        {on ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="-mr-0.5" />}
      </button>
      <div className="flex-1 h-8 flex items-center cursor-pointer" onClick={seek}>
        <div className="w-full h-1.5 rounded-full bg-[#E2D9C6] overflow-hidden">
          <div className="h-full rounded-full bg-[#A9842F] transition-[width] duration-200 ease-linear mr-0 ml-auto" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-[11px] font-mono text-[#6F695D] tabular-nums">{on || t ? mmss(t) : mmss(d)}</span>
      <audio ref={a} src={src} preload="metadata" className="hidden"
        onLoadedMetadata={(e) => setD(e.currentTarget.duration)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setT(0); }} />
    </div>
  );
};

const FbItem: React.FC<{ f: FieldFeedback; agents: FieldAgent[]; leaving: boolean; onConfirm: (f: FieldFeedback) => void }> = ({ f, leaving, onConfirm }) => (
  <div className={`grid transition-all duration-500 ease-out ${leaving ? 'grid-rows-[0fr] opacity-0 scale-[.98]' : 'grid-rows-[1fr] opacity-100'}`}>
    <div className="overflow-hidden">
      <div className="rounded-[22px] bg-white border border-[#EFE8DA] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-[15px] px-2.5 py-1 rounded-xl bg-[#F5F0E6]">{f.code}</span>
          <Stars n={f.rating || 0} />
        </div>
        {f.voiceUrl && <Voice src={f.voiceUrl} />}
        {!isVoiceOnly(f.text) && (
          <p className="text-[14.5px] leading-7 text-[#2A2720] bg-[#FBF7EE] rounded-[18px] rounded-tr-md px-4 py-3">{f.text}</p>
        )}
        {(f.positives?.length || f.negatives?.length) ? (
          <div className="flex flex-wrap gap-1.5">
            {(f.positives || []).map((x) => <span key={`p${x}`} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-[#E9F2EC] text-[#22483A]">+ {x}</span>)}
            {(f.negatives || []).map((x) => <span key={`n${x}`} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-[#FBECEA] text-[#9E2A1B]">− {x}</span>)}
          </div>
        ) : null}
        <button onClick={() => onConfirm(f)} disabled={leaving}
          className="w-full h-12 rounded-[16px] bg-[#22483A] text-white text-[14px] font-bold flex items-center justify-center gap-2 transition active:scale-[.98] disabled:opacity-70">
          {leaving ? <><Check size={17} />اتبعت للمالك</> : <>أكّد وابعته للمالك</>}
        </button>
      </div>
    </div>
  </div>
);

export const SalesFeedbackInbox: React.FC<{ isOpen: boolean; onClose: () => void; agentId?: string | null; isAdmin?: boolean }> = ({ isOpen, onClose, agentId, isAdmin }) => {
  const [fbs, setFbs] = useState<FieldFeedback[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [brokerFbs, setBrokerFbs] = useState<BrokerFeedback[]>([]);
  /* اللي اتأكد بيفضل ظاهر لحظة عشان يقفل بنعومة، مش يختفي فجأة */
  const [gone, setGone] = useState<Record<string, FieldFeedback>>({});
  const [err, setErr] = useState('');
  const [shown, setShown] = useState(false);
  useEffect(() => (isOpen ? subscribeBrokerFeedbackForSales(agentId || null, !!isAdmin, setBrokerFbs) : undefined), [isOpen, agentId, isAdmin]);
  useEffect(() => { if (!isOpen) return; const a = subscribeFieldFeedbackForSales(agentId || null, !!isAdmin, setFbs); const b = subscribeFieldAgents(setAgents); return () => { a(); b(); }; }, [isOpen, agentId, isAdmin]);
  useEffect(() => { if (!isOpen) { setShown(false); return; } const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, [isOpen]);
  if (!isOpen) return null;

  const confirm = async (f: FieldFeedback) => {
    setErr(''); setGone((m) => ({ ...m, [f.id]: f }));
    const drop = () => setGone((m) => { const n = { ...m }; delete n[f.id]; return n; });
    try { await salesConfirmFeedback(f, agents); setTimeout(drop, 900); }
    catch { drop(); setErr('التأكيد ماوصلش — جرّب تاني'); }
  };

  /* كل سيلز بيشوف فيدباك المعاينات اللي هو طلبها هو بس.
     الفيدباك اللي مالوش سيلز مسجّل (طلبات قديمة) بيروح للإدارة بس — مش لكل الفريق. */
  const leaving: Record<string, boolean> = Object.fromEntries(Object.keys(gone).map((k) => [k, true]));
  const pool = [...fbs.filter((f) => f.stage === 'sara_confirmed' && !gone[f.id]), ...Object.values(gone)];
  const list = pool.filter((f) => (isAdmin ? !!f.salesAgentId : Boolean(agentId) && f.salesAgentId === agentId));
  const orphans = isAdmin ? pool.filter((f) => !f.salesAgentId) : [];
  const groups = groupFeedback(list);
  const waiting = list.filter((f) => !leaving[f.id]).length + orphans.filter((f) => !leaving[f.id]).length;

  return createPortal(
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center transition-colors duration-300 ${shown ? 'bg-black/45' : 'bg-black/0'}`} dir="rtl" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`bg-[#F5F0E6] w-full sm:max-w-xl max-h-[92dvh] rounded-t-[32px] sm:rounded-[32px] flex flex-col shadow-2xl transition-all duration-300 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="pt-2.5 flex justify-center sm:hidden"><span className="w-10 h-1.5 rounded-full bg-[#D8D0BF]" /></div>
        <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-4">
          <div>
            <p className="font-readex font-semibold text-[20px] flex items-center gap-2">
              فيدباك المعاينات
              {waiting > 0 && <span className="text-[12px] font-bold min-w-6 h-6 px-2 rounded-full bg-[#17150F] text-[#F5F0E6] inline-flex items-center justify-center">{waiting}</span>}
            </p>
            <p className="text-[12.5px] text-[#6F695D] mt-0.5">اسمع، اقرا، وأكّد — بعدها بيوصل للمالك</p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="w-10 h-10 rounded-full bg-white border border-[#E7DFCF] flex items-center justify-center"><X size={17} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {err && <p className="text-[12.5px] font-bold text-[#9E2A1B] bg-[#FBECEA] rounded-2xl px-4 py-3">{err}</p>}

          {waiting === 0 && !brokerFbs.length && (
            <div className="text-center py-14 space-y-3">
              <span className="mx-auto w-16 h-16 rounded-full bg-[#E9F2EC] text-[#22483A] flex items-center justify-center"><Check size={28} /></span>
              <p className="font-readex font-semibold">مفيش حاجة مستنياك</p>
              <p className="text-[12.5px] text-[#6F695D]">أي فيدباك جديد من المعاينات هيظهر هنا</p>
            </div>
          )}

          {groups.map((g) => {
            const left = g.items.filter((x) => !leaving[x.id]).length;
            return (
              <section key={g.key} className={`rounded-[28px] bg-[#FFFDF8] border border-[#E7DFCF] p-3 space-y-3 transition-opacity duration-500 ${left ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3 px-1 pt-1">
                  <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#E9B949] text-[#17150F] flex items-center justify-center font-readex font-bold">{(groupTitle(g) || '؟').replace(/^عميل من غير اسم.*/, '؟').charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[15.5px] truncate">{groupTitle(g)}</p>
                    <p className="text-[11.5px] text-[#6F695D] truncate">
                      {g.items.length} {g.items.length === 1 ? 'شقة' : 'شقق'} · المندوب {g.agentName}{isAdmin && g.salesName ? ` · للسيلز ${g.salesName}` : ''}
                    </p>
                  </div>
                  {g.phone && (
                    <a href={generateCallLink(g.phone)} aria-label="اتصل بالعميل" className="w-10 h-10 shrink-0 rounded-full bg-white border border-[#E7DFCF] flex items-center justify-center"><Phone size={15} /></a>
                  )}
                </div>
                {left === 0 && <p className="text-center text-[12.5px] font-bold text-[#22483A] py-1 flex items-center justify-center gap-1.5"><Check size={14} />كله اتبعت للمالك</p>}
                {g.items.map((f) => <FbItem key={f.id} f={f} agents={agents} leaving={!!leaving[f.id]} onConfirm={confirm} />)}
              </section>
            );
          })}

          {orphans.length > 0 && (
            <section className="rounded-[28px] border border-dashed border-[#D8D0BF] p-3 space-y-3">
              <div className="px-1 pt-1">
                <p className="font-semibold text-[15px]">من غير سيلز مسجّل · {orphans.length}</p>
                <p className="text-[11.5px] text-[#6F695D] leading-relaxed">طلبات معاينة قديمة مش متسجّل عليها مين طلبها — بتظهر للإدارة بس.</p>
              </div>
              {orphans.map((f) => <FbItem key={f.id} f={f} agents={agents} leaving={!!leaving[f.id]} onConfirm={confirm} />)}
            </section>
          )}

          {brokerFbs.length > 0 && (
            <section className="space-y-2.5">
              <p className="font-semibold text-[14px] px-1">رأي البروكرز في معايناتك</p>
              {brokerFbs.map((b) => (
                <div key={b.id} className="rounded-[22px] bg-white border border-[#EFE8DA] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold"><span className="font-mono">{b.propertyCode}</span> · {b.brokerName}</span>
                    <Stars n={b.rating || 0} />
                  </div>
                  <p className="text-[14px] leading-7 text-[#2A2720] bg-[#FBF7EE] rounded-[18px] rounded-tr-md px-4 py-3">{b.text}</p>
                  {isAdmin && b.salesAgentName && <p className="text-[11px] text-[#6F695D]">للسيلز: {b.salesAgentName}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
