import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ArrowUp, ArrowDown, Trash2, Send, Copy, ImageDown } from 'lucide-react';
import { downloadOfferCards } from '../../utils/offerCards';
import { logEvent } from '../../services/analyticsService';
import { Lead, Property } from '../../types';
import { VoiceRecorder } from '../portal/VoiceRecorder';
import { SalesForms, DEFAULT_FORMS, subscribeSalesForms, saveOffer, OfferUnit, createTrackedLink, linkUrl } from '../../services/salesToolsService';
import { formatWhen } from '../common/WhenPicker';
import { waLink } from '../../utils/helpers';
import { matchProperties, briefLine, briefGaps, readBrief, payModeOf } from '../../services/clientBrief';
import { copyText, downloadAll } from '../../utils/shareKit';

/*
  العرض المخصوص: الفلترة آلية من مكالمة الاكتشاف، والاختيار والترتيب والسطور بشرية.
  بعد الإرسال بيتسجل أكشن في رحلة العميل وميعاد متابعة تلقائي.
*/
interface Props {
  isOpen: boolean;
  lead: Lead;
  properties: Property[];
  agentId: string;
  agentName: string;
  agentPhone?: string;
  onClose: () => void;
  onSent: (updated: Lead, link: string) => void;
  /* لما السيلز ييجي من المطابقة وهو معلّم على شقق */
  preselectedIds?: string[];
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const OfferBuilderModal: React.FC<Props> = ({ isOpen, lead, properties, agentId, agentName, agentPhone, onClose, onSent, preselectedIds }) => {
  const [forms, setForms] = useState<SalesForms>(DEFAULT_FORMS);
  const [picked, setPicked] = useState<OfferUnit[]>([]);
  const [voice, setVoice] = useState('');
  const [intro, setIntro] = useState('');
  const [question, setQuestion] = useState('قولّي رأيك في الأول والتاني وأنا أرتبلك المعاينة');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ link: string; wa: string } | null>(null);
  const [imgBusy, setImgBusy] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => subscribeSalesForms(setForms), []);

  // نفس محرك المطابقة الذكية بالظبط — فالشاشتين بيدّوا نفس النتيجة
  const suggested = useMemo(
    () => matchProperties(lead, properties.filter((p) => p.category !== 'off_plan'), { tolerance: 0.05 }),
    [properties, lead],
  );

  useEffect(() => {
    if (!isOpen) return;
    // لو السيلز جه من المطابقة وهو معلّم على شقق، بنبدأ باللي هو اختاره
    const start = preselectedIds && preselectedIds.length
      ? preselectedIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as typeof suggested
      : suggested.slice(0, forms.offerUnits);
    setPicked(start.map((p) => ({ propertyId: p.id, code: p.code, title: `${p.neighborhood} · ${p.area}م²`, price: p.price, image: p.images?.[0], note: '' })));
    setDone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, forms.offerUnits, preselectedIds]);

  if (!isOpen) return null;

  const pool = (search.trim() ? properties.filter((p) => `${p.code} ${p.title} ${p.neighborhood}`.toLowerCase().includes(search.toLowerCase())) : suggested)
    .filter((p) => !picked.some((u) => u.propertyId === p.id)).slice(0, 12);
  const move = (i: number, dir: -1 | 1) => setPicked((l) => { const n = [...l]; const j = i + dir; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const hasVoiceOrNotes = !!voice || picked.some((u) => (u.note || '').trim().length > 3);

  /* النص اللي بيتنسخ مع الصور — نفس اللي في العرض بالظبط */
  const offerPlainText = useMemo(() => {
    const L: string[] = [];
    L.push(intro.trim() || `أهلاً أستاذ ${lead.name}، دول أحسن ${picked.length} حاجات عندي دلوقتي بعد كلامنا.`);
    L.push('');
    picked.forEach((u, i) => {
      L.push(`${i + 1}. ${u.title} — ${Math.round(u.price).toLocaleString('en-US')} ج.م`);
      if (u.note) L.push(`   « ${u.note} »`);
    });
    L.push('');
    L.push(question.trim() || 'قولّي رأيك وأنا أرتبلك المعاينة');
    L.push('');
    L.push(`${agentName} — السبع للعقارات`);
    return L.join('\n');
  }, [picked, intro, question, lead.name, agentName]);

  const send = async () => {
    setBusy(true);
    try {
      const expiresAt = Date.now() + forms.offerHours * 3600000;
      const id = await saveOffer({ leadId: lead.id, leadName: lead.name, agentId, agentName, agentPhone, intro: intro.trim(), voiceUrl: voice || undefined, question: question.trim(), units: picked, expiresAt });
      await createTrackedLink({ agentId, agentName, kind: 'offer', target: `/?offer=${id}`, title: `عرض ${lead.name}` }).catch(() => {});
      const link = `${window.location.origin}/?offer=${id}`;
      logEvent('offer_sent', {
        offerId: id, leadId: lead.id, actorId: agentId, actorName: agentName,
        value: picked.length, source: (lead as any).campaignName || lead.source,
      });
      const nextAt = Date.now() + 24 * 3600000;
      const updated: Lead = {
        ...lead,
        status: lead.status === 'new' || lead.status === 'contacted' ? 'sent_details' : lead.status,
        activity: [{ at: Date.now(), by: agentName, outcome: `عرض مخصوص (${picked.length} شقق)`, comment: picked.map((u) => u.code).join('، '), nextAt }, ...(lead.activity || [])].slice(0, 80),
        nextActionAt: nextAt,
        followUpStatus: 'pending',
        followUpNote: 'متابعة العرض المخصوص',
        followUpScheduledAt: formatWhen(nextAt),
        lastContactDate: new Date().toISOString(),
        notes: [`عرض مخصوص اتبعت: ${link}`, ...(lead.notes || [])],
      } as Lead;
      const wa = waLink(lead.phone || '', `أهلاً أستاذ ${lead.name}، جهزتلك عرض مخصوص فيه ${picked.length} شقق بعد كلامنا. العرض صالح ${forms.offerHours} ساعة:\n${link}`);
      setDone({ link, wa });
      onSent(updated, link);
    } finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[75] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-[#F6F4EF] w-full sm:max-w-2xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col">
        <header className="bg-[#141414] text-white px-5 py-4 flex justify-between items-center rounded-t-3xl">
          <div>
            <p className="font-bold">عرض مخصوص</p>
            <p className="text-xs text-[#CFCBC2]">لـ {lead.name} · صالح {forms.offerHours} ساعة</p>
            {/* نفس السطر اللي بيظهر فوق المطابقة — عشان السيلز يشوف إنهم نفس الطلب */}
            <p className="text-[11px] text-[#D9B864] mt-0.5">{briefLine(lead)}</p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
        </header>

        {!done && briefGaps(lead).length > 0 && (
          <p className="mx-4 mt-3 text-[11px] bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-xl px-3 py-2 leading-relaxed">
            طلبه لسه ناقص: <b>{briefGaps(lead).map((g) => g.label).join('، ')}</b> — الاقتراحات دي تقريبية لحد ما تعمل مكالمة اكتشاف.
          </p>
        )}
        {done ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-[#EEF5F0] border border-[#BFE0CC] p-4 text-[#1E7A45] font-bold">العرض جاهز، واتسجّل في ملف العميل ومتابعة بكرة.</div>
            <p className="font-mono text-xs bg-white border border-[#ECE8DF] rounded-xl p-3 break-all" dir="ltr">{done.link}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={done.wa} target="_blank" rel="noopener noreferrer" className="py-3 rounded-xl bg-[#1FA85D] text-white text-center font-bold">ابعته واتساب</a>
              <button onClick={() => navigator.clipboard?.writeText(done.link)} className="py-3 rounded-xl bg-[#F6F4EF] font-bold flex items-center justify-center gap-2"><Copy size={16} />انسخ اللينك</button>
            </div>
            {/* زرار صغير مش بيبان: بينسخ التفاصيل وينزّل الصور والفيديو مرة واحدة،
                للعميل اللي مش بيفتح لينكات */}
            <button
              onClick={async () => {
                setImgBusy('بيجهّز...');
                try {
                  await copyText(offerPlainText);
                  const media = picked
                    .map((u) => properties.find((p) => p.id === u.propertyId || p.code === u.code))
                    .flatMap((p) => (p ? [...(p.images || []).slice(0, 1), p.videoUrl || ''] : []))
                    .filter(Boolean) as string[];
                  if (media.length) {
                    await downloadAll(media, `عرض-${lead.name}`, (d, t) => setImgBusy(`${d} من ${t}`));
                  }
                  setImgBusy('اتنسخ واتحمّل ✓');
                } catch {
                  setImgBusy('جرّب تاني');
                }
                setTimeout(() => setImgBusy(''), 2500);
              }}
              disabled={!!imgBusy || picked.length === 0}
              className="w-full text-[11px] text-[#6B665C] py-2 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <ImageDown size={12} />
              {imgBusy || 'العميل مش بيفتح لينكات؟ انسخ التفاصيل ونزّل الصور'}
            </button>

            <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold">تمام</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
                <p className="font-bold text-sm">1. فويس ترحيبي (اختياري)</p>
                <VoiceRecorder folder="offers" id={`${lead.id}-${Date.now()}`} onDone={setVoice} />
                <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="أو اكتب سطر ترحيب للعميل" className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              </section>

              <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-sm">2. الشقق ({picked.length}/{forms.offerUnits})</p>
                  <span className="text-[11px] text-[#8C877D]">رتّبهم بالأسهم</span>
                </div>
                {picked.map((u, i) => (
                  <div key={u.propertyId} className="flex gap-2 items-start border-b border-[#F0ECE4] pb-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => move(i, -1)} aria-label="فوق" className="p-1 rounded-lg bg-[#F6F4EF]"><ArrowUp size={12} /></button>
                      <button onClick={() => move(i, 1)} aria-label="تحت" className="p-1 rounded-lg bg-[#F6F4EF]"><ArrowDown size={12} /></button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-sm truncate">{u.code} · {u.title}</span>
                        <span className="font-bold text-sm">{fmt(u.price)}</span>
                      </div>
                      <input value={u.note || ''} onChange={(e) => setPicked((l) => l.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                        placeholder="اكتب سطر للعميل عن الشقة دي..." className="w-full rounded-xl bg-[#FBF8F1] border border-dashed border-[#E8D3A6] p-2.5 text-[13px]" />
                    </div>
                    <button onClick={() => setPicked((l) => l.filter((_, j) => j !== i))} aria-label="شيل" className="p-1.5 text-[#C2412D]"><Trash2 size={14} /></button>
                  </div>
                ))}
                {picked.length < forms.offerUnits && (
                  <>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="دوّر بالكود أو الحي" className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-2.5 text-sm" />
                    <div className="flex flex-wrap gap-2">
                      {pool.map((p) => (
                        <button key={p.id} onClick={() => setPicked((l) => [...l, { propertyId: p.id, code: p.code, title: `${p.neighborhood} · ${p.area}م²`, price: p.price, image: p.images?.[0], note: '' }])}
                          className="px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-xs font-semibold flex items-center gap-1">
                          <Plus size={12} />{p.code} · {fmt(p.price)}
                        </button>
                      ))}
                      {!pool.length && (
                        <span className="text-xs text-[#8C877D]">
                          {payModeOf(readBrief(lead)) === 'instalment'
                            ? 'العميل ده بيدوّر تقسيط — الريسيل كاش فمش بنرشّحله شقق. رشّحله مشاريع من المطابقة، أو غيّر الدفع لكاش من «عدّل طلبه».'
                            : 'مفيش شقق تانية مطابقة'}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
                <p className="font-bold text-sm">3. اختم بسؤال</p>
                <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-sm" />
              </section>
            </div>

            <div className="p-4 border-t border-[#E4DFD4] space-y-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button disabled={busy || !picked.length || !hasVoiceOrNotes} onClick={send}
                className="w-full py-4 rounded-2xl bg-[#A07A26] text-white text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                <Send size={18} />{busy ? 'جاري التجهيز...' : `ابعت العرض · صالح ${forms.offerHours} ساعة`}
              </button>
              {!hasVoiceOrNotes && <p className="text-[11px] text-[#C2412D] text-center">سجّل فويس أو اكتب سطر على الأقل تحت شقة — العرض مش هيتبعت فاضي</p>}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
