import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, CheckCircle2, Circle, Loader2, Phone, Users, Video, X, Megaphone, ExternalLink,
} from 'lucide-react';
import type { Lead, Property, SalesAgent, ViewingRequest, WorkProof, SalesTargets, AgentUnitAssignment } from '../../types';
import { DEFAULT_SALES_TARGETS } from '../../types';
import {
  buildScorecard, cairoDay, saveWorkProof, signedUnitIds, splitByPerformance,
  interestScore, computeXp, weekDays, TaskRow,
} from '../../services/dailyTasksService';
import { uploadFile, thumbUrl } from '../../services/mediaStorage';
import { formatPrice } from '../../utils/helpers';

/* ============================================================
   مهام النهارده — شاشة المندوب
   ============================================================
   العدّاد التلقائي بيتحرك من شغله في النظام لوحده.
   العدّاد اليدوي (الإعلان والفيديو) مبيتحركش غير بصورة.
   مفيش زرار "تم" فاضي في الشاشة دي.                        */

const Bar: React.FC<{ row: TaskRow }> = ({ row }) => {
  const pct = row.target > 0 ? Math.min(100, Math.round((row.done / row.target) * 100)) : 0;
  const full = row.done >= row.target;
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {full ? <CheckCircle2 size={16} className="text-[#1E7A45] shrink-0" />
                : <Circle size={16} className="text-stone-300 shrink-0" />}
          <span className="font-black text-sm text-stone-900 truncate">{row.label}</span>
          {row.period === 'week' && (
            <span className="text-[9px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full shrink-0">
              الأسبوع
            </span>
          )}
          {!row.auto && (
            <span className="text-[9px] font-bold bg-[#FBF1E4] text-[#A07A26] px-2 py-0.5 rounded-full shrink-0">
              بإثبات
            </span>
          )}
        </div>
        <span className={`font-mono font-black text-sm shrink-0 ${full ? 'text-[#1E7A45]' : 'text-stone-900'}`}>
          {row.done}<span className="text-stone-300">/{row.target}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? 'bg-[#1E7A45]' : 'bg-[#D9B864]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {row.hint && <p className="text-[11px] text-stone-400 font-medium">{row.hint}</p>}
    </div>
  );
};

/* ---------- بوب أب الإعلان ----------
   المندوب بيختار الشقة فيفتحله الصور والتفاصيل عشان ينسخ
   منها وينشر، وبعدين يرفع السكرين شوت من نفس المكان.      */
const AdPopup: React.FC<{
  property: Property;
  agent: { id: string; name: string };
  onClose: () => void;
  onSaved: () => void;
}> = ({ property, agent, onClose, onSaved }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = (property.images || []).filter((u) => typeof u === 'string' && u.trim());

  /* نوع الإعلان بيتحدد من الشقة نفسها مش من اختيار المندوب،
     عشان ما يعدّش إعلان ريسيل على إنه تحت الإنشاء */
  const isOffplan = !!(property as any).isUnderConstruction
    || /تحت الإنشاء|أوف بلان|off.?plan/i.test(String(property.title || '') + String((property as any).status || ''));

  const details = [
    `كود: ${property.code}`,
    property.title,
    `${property.neighborhood} · ${property.area} م² · ${property.bedrooms} غرف · ${property.bathrooms} حمام`,
    property.floor ? `الدور: ${property.floor}` : '',
    `السعر: ${formatPrice(property.price)} ج.م`,
    property.description || '',
  ].filter(Boolean).join('\n');

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1800); }
    catch { setErr('المتصفح مش سامح بالنسخ — علّم على النص وانسخه بإيدك'); }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(''); setBusy(true);
    try {
      const url = await uploadFile(f, 'ad_proofs', `${agent.id}_${property.code}_${Date.now()}`);
      await saveWorkProof({
        agentId: agent.id, agentName: agent.name,
        kind: isOffplan ? 'ad_offplan' : 'ad_resale',
        propertyId: property.id, propertyCode: property.code,
        proofUrl: url,
      });
      onSaved(); onClose();
    } catch (ex: any) {
      setErr(ex?.message || 'الرفع ما نجحش — جرّب تاني');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-[#FBF8F1] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#FBF8F1] px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF] z-10">
          <div className="min-w-0">
            <p className="font-black text-stone-900 truncate">{property.code}</p>
            <p className="text-xs text-stone-400 font-medium">
              {isOffplan ? 'إعلان تحت الإنشاء' : 'إعلان ريسيل'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {photos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="shrink-0">
                  <img
                    loading="lazy" decoding="async"
                    src={thumbUrl(u, 400)} alt=""
                    className="w-28 h-28 object-cover rounded-2xl border border-[#ECE8DF]"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-[#C2412D] bg-[#FBEDEA] rounded-2xl p-3">
              الشقة دي مالهاش صور — ضيف صور الأول عشان الإعلان يبقى له معنى
            </p>
          )}

          <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] space-y-1">
            <pre className="whitespace-pre-wrap text-sm text-stone-800 font-sans leading-relaxed">{details}</pre>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copy(details, 'نص')}
              className="rounded-2xl py-3 bg-white border border-[#E4DFD4] font-bold text-sm">
              {copied === 'نص' ? '✓ اتنسخ' : 'انسخ التفاصيل'}
            </button>
            <button type="button" onClick={() => copy(photos.join('\n'), 'صور')}
              disabled={!photos.length}
              className="rounded-2xl py-3 bg-white border border-[#E4DFD4] font-bold text-sm disabled:opacity-40">
              {copied === 'صور' ? '✓ اتنسخ' : 'انسخ روابط الصور'}
            </button>
          </div>

          <div className="pt-2 border-t border-[#ECE8DF] space-y-2">
            <p className="text-xs font-bold text-stone-500">
              بعد ما تنشر الإعلان، ارفع سكرين شوت منه — العدّاد مبيتحركش من غيره
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
            <button
              type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl py-3.5 bg-[#141414] text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {busy ? 'بيرفع…' : 'ارفع سكرين شوت الإعلان'}
            </button>
            {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- الشاشة ---------- */

export const DailyTasksPanel: React.FC<{
  agent: { id: string; name: string };
  leads: Lead[];
  requests: ViewingRequest[];
  properties: Property[];
  proofs: WorkProof[];
  assignment?: AgentUnitAssignment;
  targets?: SalesTargets;
  onRefresh?: () => void;
}> = ({ agent, leads, requests, properties, proofs, assignment, targets, onRefresh }) => {
  const t = targets || DEFAULT_SALES_TARGETS;
  const [adFor, setAdFor] = useState<Property | null>(null);
  /* اختيار شقة بالكود — عشان المندوب يسجّل إعلان على أي شقة
     حتى لو الإدارة لسه ماوزّعتش الدورة. التسجيل مايستناش حد. */
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState('');
  const [videoBusy, setVideoBusy] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const [bonusBusy, setBonusBusy] = useState(false);
  const bonusRef = useRef<HTMLInputElement>(null);

  /* النقط محسوبة من نفس الشغل اللي في العدّادات — مش رقم
     مخزّن لوحده. النهارده والشهر عشان يشوف حركته. */
  const xpToday = useMemo(
    () => computeXp({ agentId: agent.id, leads, requests, proofs, targets: t, days: [cairoDay()] }),
    [agent.id, leads, requests, proofs, t],
  );
  const xpMonth = useMemo(
    () => computeXp({ agentId: agent.id, leads, requests, proofs, targets: t }),
    [agent.id, leads, requests, proofs, t],
  );

  const card = useMemo(
    () => buildScorecard({ agentId: agent.id, leads, requests, proofs, targets: t }),
    [agent.id, leads, requests, proofs, t],
  );

  /* الشقق اللي تفاعلها تحت متوسط الموقع كله — دي اللي محتاجة
     شغل، فبتتعرض الأول ومعلّم عليها. المتوسط بيتحسب على كل
     شقق الموقع مش على شققه هو، عشان المقياس يبقى واحد. */
  const weakIds = useMemo(
    () => new Set(splitByPerformance(properties).weak.map((p) => p.id)),
    [properties],
  );

  const myUnits = useMemo(() => {
    const ids = new Set(assignment?.propertyIds || []);
    const mine = properties.filter((p) => ids.has(p.id));
    /* المحتاجة دفع الأول، والأضعف فيهم في أول القايمة */
    return mine.sort((a, b) => {
      const wa = weakIds.has(a.id) ? 0 : 1;
      const wb = weakIds.has(b.id) ? 0 : 1;
      return wa - wb || interestScore(a) - interestScore(b);
    });
  }, [properties, assignment, weakIds]);

  const signed = useMemo(
    () => signedUnitIds(proofs, agent.id, assignment?.cycleStart || 0),
    [proofs, agent.id, assignment],
  );

  const proofByUnit = useMemo(() => {
    const m = new Map<string, WorkProof>();
    proofs.forEach((p) => {
      if (p.agentId !== agent.id || !p.propertyId) return;
      const old = m.get(p.propertyId);
      if (!old || p.at > old.at) m.set(p.propertyId, p);
    });
    return m;
  }, [proofs, agent.id]);

  const rows = card.rows;

  /* نتايج البحث: المحتاجة دفع الأول، و٣٠ نتيجة بالكتير
     عشان القايمة ما تتقلش على الموبايل */
  const pickResults = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return myUnits.slice(0, 30);
    return properties
      .filter((p) =>
        (p.code || '').toLowerCase().includes(q)
        || (p.title || '').toLowerCase().includes(q)
        || (p.neighborhood || '').toLowerCase().includes(q))
      .sort((a, b) => (weakIds.has(b.id) ? 1 : 0) - (weakIds.has(a.id) ? 1 : 0))
      .slice(0, 30);
  }, [pickQuery, properties, myUnits, weakIds]);

  const uploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setVideoBusy(true);
    try {
      const url = await uploadFile(f, 'video_proofs', `${agent.id}_${Date.now()}`);
      await saveWorkProof({ agentId: agent.id, agentName: agent.name, kind: 'video', proofUrl: url });
      onRefresh?.();
    } catch { /* الرسالة بتظهر من الزرار نفسه */ }
    finally { setVideoBusy(false); }
  };

  const uploadBonus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBonusBusy(true);
    try {
      const url = await uploadFile(f, 'bonus_listings', `${agent.id}_${Date.now()}`);
      await saveWorkProof({ agentId: agent.id, agentName: agent.name, kind: 'bonus_listing', proofUrl: url });
      onRefresh?.();
    } catch { /* الرسالة بتظهر من الزرار */ }
    finally { setBonusBusy(false); }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-stone-900">مهام النهارده</h2>
          <p className="text-xs text-stone-400 font-medium">
            {cairoDay()}
          </p>
        </div>
      </div>

      {/* النقط — بتتحرّك مع كل حاجة بتتعمل فعلاً */}
      <div className="bg-[#141414] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] text-white/50 font-bold">نقط النهارده</p>
          <p className="text-2xl font-black text-[#D9B864] font-mono">
            {xpToday.total.toLocaleString('en-US')}
          </p>
        </div>
        <div className="text-left">
          <p className="text-[11px] text-white/50 font-bold">آخر ٣٠ يوم</p>
          <p className="text-lg font-black text-white font-mono">
            {xpMonth.total.toLocaleString('en-US')}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((r) => <Bar key={r.key} row={r} />)}
      </div>

      {/* الفيديو — إثبات بالملف */}
      <div className="bg-white rounded-2xl p-4 border border-[#ECE8DF] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Video size={16} className="text-[#A07A26]" />
          <span className="font-black text-sm text-stone-900">فيديو من الموقع</span>
          <span className="text-xs text-stone-400 font-medium">
            الهدف {t.videosWeekly} في الأسبوع
          </span>
        </div>
        <input ref={videoRef} type="file" accept="video/*,image/*" onChange={uploadVideo} className="hidden" />
        <button
          type="button" disabled={videoBusy} onClick={() => videoRef.current?.click()}
          className="rounded-xl px-4 py-2 bg-[#141414] text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50"
        >
          {videoBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {videoBusy ? 'بيرفع…' : 'ارفع الفيديو'}
        </button>
      </div>

      {/* سجّل إعلان على أي شقة — مش لازم تكون متوزّعة عليه */}
      <button
        type="button" onClick={() => { setPicking(true); setPickQuery(''); }}
        className="w-full rounded-2xl py-3.5 bg-[#141414] text-white font-black flex items-center justify-center gap-2"
      >
        <Megaphone size={16} /> سجّل إعلان جديد
      </button>

      {picking && (
        <div className="fixed inset-0 z-[115] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
          <div className="bg-[#FBF8F1] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#ECE8DF]">
              <p className="font-black text-stone-900">اختار الشقة</p>
              <button type="button" onClick={() => setPicking(false)} className="p-2 rounded-full hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 pb-2">
              <input
                autoFocus value={pickQuery} onChange={(e) => setPickQuery(e.target.value)}
                placeholder="اكتب الكود أو الحي أو جزء من العنوان"
                className="w-full rounded-2xl border border-[#E4DFD4] px-4 py-3 text-sm font-bold"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {pickResults.length === 0 ? (
                <p className="text-xs text-stone-400 font-medium text-center py-6">
                  {pickQuery.trim() ? 'مفيش شقة بالكلام ده' : 'ابدأ تكتب الكود'}
                </p>
              ) : pickResults.map((p) => (
                <button
                  key={p.id} type="button"
                  onClick={() => { setPicking(false); setAdFor(p); }}
                  className="w-full bg-white rounded-2xl p-3 border border-[#ECE8DF] flex items-center gap-3 text-right"
                >
                  {(p.images || []).filter(Boolean).length > 0 ? (
                    <img loading="lazy" src={thumbUrl(p.images[0], 120)} alt=""
                      className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : <div className="w-12 h-12 rounded-xl bg-stone-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-black bg-stone-100 px-2 py-0.5 rounded-full">{p.code}</span>
                      {weakIds.has(p.id) && (
                        <span className="text-[9px] font-black bg-[#FBF1E4] text-[#A07A26] px-2 py-0.5 rounded-full">
                          محتاجة دفع
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-stone-800 truncate mt-0.5">{p.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* بونص — مش هدف يومي، بس بياخد عليه نقط */}
      <div className="bg-white rounded-2xl p-4 border border-dashed border-[#E8D3A6] flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-stone-900">وحدة جديدة برقم المالك</span>
            <span className="text-[9px] font-black bg-[#FBF1E4] text-[#A07A26] px-2 py-0.5 rounded-full">
              بونص +{t.xpBonusListing} نقطة
            </span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium mt-0.5">
            مش هدف يومي · ارفع صورة أو سكرين فيه كود الوحدة
          </p>
        </div>
        <input ref={bonusRef} type="file" accept="image/*" onChange={uploadBonus} className="hidden" />
        <button
          type="button" disabled={bonusBusy} onClick={() => bonusRef.current?.click()}
          className="rounded-xl px-4 py-2 bg-white border border-[#E4DFD4] font-bold text-xs flex items-center gap-2 disabled:opacity-50"
        >
          {bonusBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {bonusBusy ? 'بيرفع…' : 'سجّل وحدة'}
        </button>
      </div>

      {/* شقق الدورة */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-black text-sm text-stone-900">
            شققي في الدورة{' '}
            <span className="text-stone-400 font-mono font-bold">
              {signed.size}/{myUnits.length}
            </span>
          </h3>
          <p className="text-[11px] text-stone-400 font-medium">
            اللي عليها "محتاجة دفع" تفاعلها تحت المتوسط — ابدأ بيها
          </p>
        </div>

        {myUnits.length === 0 ? (
          <p className="text-xs text-stone-400 bg-white rounded-2xl p-4 border border-[#ECE8DF] font-medium">
            لسه مفيش شقق متوزّعة عليك — الإدارة بتوزّع الدورة كل أسبوعين
          </p>
        ) : (
          <div className="space-y-2">
            {myUnits.map((p) => {
              const done = signed.has(p.id);
              const pr = proofByUnit.get(p.id);
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl p-3 border flex items-center gap-3 ${
                    done ? 'border-[#BFE0CC]' : 'border-[#ECE8DF]'
                  }`}
                >
                  {(p.images || []).filter(Boolean).length > 0 ? (
                    <img
                      loading="lazy" decoding="async"
                      src={thumbUrl(p.images[0], 160)} alt=""
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-stone-100 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-black bg-stone-100 px-2 py-0.5 rounded-full">
                        {p.code}
                      </span>
                      {weakIds.has(p.id) && (
                        <span className="text-[9px] font-black bg-[#FBF1E4] text-[#A07A26] px-2 py-0.5 rounded-full">
                          محتاجة دفع
                        </span>
                      )}
                      {done && <CheckCircle2 size={14} className="text-[#1E7A45]" />}
                    </div>
                    <p className="text-xs font-bold text-stone-800 truncate mt-0.5">{p.title}</p>
                    <p className="text-[11px] text-stone-400 font-medium">
                      {formatPrice(p.price)} ج.م · {p.area} م²
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {pr && (
                      <a
                        href={pr.proofUrl} target="_blank" rel="noreferrer"
                        title="السكرين شوت"
                        className="w-10 h-10 rounded-xl overflow-hidden border border-[#ECE8DF] block"
                      >
                        <img loading="lazy" src={thumbUrl(pr.proofUrl, 120)} alt="" className="w-full h-full object-cover" />
                      </a>
                    )}
                    <button
                      type="button" onClick={() => setAdFor(p)}
                      className="rounded-xl px-3 py-2 bg-[#141414] text-white font-bold text-[11px] flex items-center gap-1.5"
                    >
                      <Megaphone size={13} />
                      {done ? 'إعلان تاني' : 'أعلن'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {adFor && (
        <AdPopup
          property={adFor} agent={agent}
          onClose={() => setAdFor(null)}
          onSaved={() => onRefresh?.()}
        />
      )}
    </div>
  );
};

export default DailyTasksPanel;
