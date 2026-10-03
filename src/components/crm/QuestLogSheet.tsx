import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Check, Loader2 } from 'lucide-react';
import { DailyQuest, Lead, SalesAgent } from '../../types';
import { CALL_OUTCOMES, AD_PLATFORMS, CallOutcome, saveQuestLog } from '../../services/questLogService';
import { uploadFile } from '../../services/mediaStorage';

/*
  شاشة تسجيل المهمة.

  المكالمة: بتختار نتيجتها — ردّ، طلع ريكويست، مش مهتم، مردّش.
  الإعلان: بتختار المنصة وترفع سكرين شوت.

  من غير ده، الأرقام بتبقى عدد ضغطات على زرار — مش شغل.
*/

interface Props {
  quest: DailyQuest;
  agent: SalesAgent;
  leads: Lead[];
  onClose: () => void;
  onSaved: () => void;          // بيزوّد العدّاد بعد ما التسجيلة تتحفظ
  showToast: (m: string) => void;
}

export const QuestLogSheet: React.FC<Props> = ({ quest, agent, leads, onClose, onSaved, showToast }) => {
  const isCall = quest.category === 'calls';
  const isAd = quest.category === 'facebook_share';
  /* أي تحدي تاني الإدارة طلبت عليه إثبات */
  const proof = quest.proof || 'none';
  const isProof = !isCall && !isAd && proof !== 'none';
  const needPhoto = isProof && (proof === 'photo' || proof === 'both');
  const needNote = isProof && (proof === 'note' || proof === 'both');

  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [leadId, setLeadId] = useState('');
  const [platform, setPlatform] = useState(AD_PLATFORMS[0]);
  const [shot, setShot] = useState('');
  const [upPct, setUpPct] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const myLeads = leads.filter((l) => l.assignedAgentId === agent.id);

  const pickShot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setUpPct(1);
    try {
      const url = await uploadFile(file, 'quest_proof', `${agent.id}_${Date.now()}`, setUpPct);
      setShot(url);
    } catch (err: any) {
      showToast(`الصورة ما اترفعتش — ${err?.message || 'جرّب تاني'}`);
    } finally {
      setBusy(false);
      setUpPct(0);
    }
  };

  /* الإثبات مش اختياري — التحدي ما يتسجّلش من غيره */
  const canSave = isCall ? !!outcome
    : isAd ? !!platform
    : isProof ? ((!needPhoto || !!shot) && (!needNote || note.trim().length >= 3))
    : true;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const lead = myLeads.find((l) => l.id === leadId);
      await saveQuestLog({
        agentId: agent.id,
        agentName: agent.name,
        questId: quest.id,
        category: quest.category,
        outcome: isCall ? (outcome as CallOutcome) : undefined,
        leadId: lead?.id,
        leadName: lead?.name,
        platform: isAd ? platform : undefined,
        screenshotUrl: shot || undefined,
        note: note.trim() || undefined,
      });
      onSaved();
      showToast('اتسجّلت');
      onClose();
    } catch (err: any) {
      showToast(`ما اتسجّلتش — ${err?.message || 'جرّب تاني'}`);
      setBusy(false);
    }
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F6F4EF] w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <header className="sticky top-0 bg-[#141414] text-white px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{quest.title}</p>
            <p className="text-[11px] text-[#CFCBC2]">{quest.currentCount} من {quest.targetCount} · +{quest.xpReward} نقطة</p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
        </header>

        <div className="p-5 space-y-4">
          {/* ===== مكالمة ===== */}
          {isCall && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#141414]">المكالمة خلصت إزاي؟</p>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setOutcome(o.id)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition cursor-pointer ${
                        outcome === o.id ? 'text-white' : 'bg-white text-[#141414]'
                      }`}
                      style={outcome === o.id ? { background: o.hex, borderColor: o.hex } : { borderColor: '#E4DFD4' }}
                    >
                      {o.label}
                      {o.weight > 0 && (
                        <span className={`block text-[10px] font-normal mt-0.5 ${outcome === o.id ? 'text-white/80' : 'text-[#8C877D]'}`}>
                          +{o.weight} نقطة جودة
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {myLeads.length > 0 && (
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-[#141414]">مع مين؟ (اختياري)</span>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full bg-white border border-[#E4DFD4] rounded-xl px-3 py-2.5 text-sm"
                  >
                    <option value="">— مش محدد —</option>
                    {myLeads.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
                  </select>
                </label>
              )}
            </>
          )}

          {/* ===== إعلان ===== */}
          {isAd && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#141414]">نشرته فين؟</p>
                <div className="flex flex-wrap gap-2">
                  {AD_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        platform === p ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4] text-[#141414]'
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#141414]">
                  السكرين شوت <span className="font-normal text-[#6B665C]">— الإدارة بتراجع الكواليتي منه (+٢ نقطة)</span>
                </p>
                {shot ? (
                  <div className="relative">
                    <img src={shot} alt="" className="w-full rounded-xl border border-[#E4DFD4]" />
                    <button
                      onClick={() => setShot('')}
                      className="absolute top-2 left-2 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                    >شيلها</button>
                    <span className="absolute top-2 right-2 bg-[#1E7A45] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Check size={11} /> اترفعت
                    </span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#DCD6CA] rounded-xl py-7 cursor-pointer bg-white">
                    {busy ? (
                      <>
                        <Loader2 size={20} className="text-[#A07A26] animate-spin" />
                        <span className="text-xs text-[#6B665C]">بيرفع... {upPct}%</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-[#A07A26]" />
                        <span className="text-xs font-bold text-[#141414]">ارفع صورة البوست</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={pickShot} className="hidden" disabled={busy} />
                  </label>
                )}
              </div>
            </>
          )}

          {/* ===== إثبات عام ===== */}
          {isProof && (
            <div className="space-y-3">
              <p className="text-[11px] bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-xl px-3 py-2 leading-relaxed font-bold">
                التحدي ده محتاج إثبات{quest.proofHint ? `: ${quest.proofHint}` : ''}
              </p>

              {needPhoto && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#141414]">الصورة *</p>
                  {shot ? (
                    <div className="relative">
                      <img src={shot} alt="" className="w-full rounded-xl border border-[#E4DFD4]" />
                      <button onClick={() => setShot('')} className="absolute top-2 left-2 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer">شيلها</button>
                      <span className="absolute top-2 right-2 bg-[#1E7A45] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check size={11} /> اترفعت
                      </span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#DCD6CA] rounded-xl py-7 cursor-pointer bg-white">
                      {busy ? (
                        <>
                          <Loader2 size={20} className="text-[#A07A26] animate-spin" />
                          <span className="text-xs text-[#6B665C]">بيرفع... {upPct}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} className="text-[#A07A26]" />
                          <span className="text-xs font-bold text-[#141414]">ارفع الإثبات</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={pickShot} className="hidden" disabled={busy} />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#141414]">
              {needNote ? 'الإثبات المكتوب *' : 'ملاحظة (اختياري)'}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={needNote ? (quest.proofHint || 'اكتب الإثبات') : isCall ? 'قال إيه بالظبط؟' : 'اسم الجروب أو الكود المنشور'}
              className="w-full bg-white border border-[#E4DFD4] rounded-xl px-3 py-2.5 text-sm leading-relaxed"
            />
          </label>

          <button
            onClick={save}
            disabled={!canSave || busy}
            className="w-full py-3.5 rounded-xl bg-[#141414] text-white font-bold text-sm disabled:opacity-40 cursor-pointer"
          >
            {busy ? 'بيسجّل...'
              : canSave ? 'سجّل'
              : isCall ? 'اختار نتيجة المكالمة'
              : isAd ? 'اختار المنصة'
              : needPhoto && !shot ? 'ارفع الإثبات الأول'
              : 'اكتب الإثبات الأول'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default QuestLogSheet;
