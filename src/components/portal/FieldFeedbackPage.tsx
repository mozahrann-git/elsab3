import React, { useEffect, useState } from 'react';
import { getTrip, submitFieldFeedback, FieldTrip, TripUnit } from '../../services/portalService';
import { VoiceRecorder } from './VoiceRecorder';

/* صفحة بسيطة للمندوب من لينك الواتساب: يكتب أو يسجل فويس لكل شقة */
const POS = ['الموقع', 'التشطيب', 'المساحة', 'الإضاءة', 'السعر'];
const NEG = ['السعر', 'الدور', 'التشطيب', 'الشارع', 'المساحة'];

export const FieldFeedbackPage: React.FC<{ tripId: string; onClose: () => void }> = ({ tripId, onClose }) => {
  const [trip, setTrip] = useState<FieldTrip | null | undefined>(undefined);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => { getTrip(tripId).then(setTrip).catch(() => setTrip(null)); }, [tripId]);

  return (
    <div className="fixed inset-0 z-[90] bg-[#F6F4EF] overflow-y-auto" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', Tahoma, sans-serif" }}>
      <div className="max-w-lg mx-auto p-4 pb-16 space-y-4">
        <header className="bg-[#141414] text-white rounded-2xl p-5">
          <p className="text-[#D9B864] text-sm">السبع للعقارات</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "'Readex Pro', sans-serif" }}>رأي العميل في المعاينة</p>
          {trip && <p className="text-sm text-[#CFCBC2] mt-1">أهلاً {trip.agentName} · {trip.timeText}</p>}
        </header>
        {trip === undefined && <p className="text-center py-10">جاري التحميل...</p>}
        {trip === null && <p className="text-center py-10">اللينك ده مش شغال. كلّم سارة.</p>}
        {trip && trip.units.map((u) => sent[u.code]
          ? <div key={u.code} className="rounded-2xl bg-[#EEF5F0] text-[#1E7A45] p-5 font-bold text-center">✓ اتبعت رأي {u.code}، شكراً</div>
          : <UnitForm key={u.code} trip={trip} u={u} onSent={() => setSent((s) => ({ ...s, [u.code]: true }))} />)}
        <button onClick={onClose} className="w-full text-sm text-[#6B665C] py-3">الموقع الرئيسي</button>
      </div>
    </div>
  );
};

const UnitForm: React.FC<{ trip: FieldTrip; u: TripUnit; onSent: () => void }> = ({ trip, u, onSent }) => {
  const [rating, setRating] = useState(0);
  const [pos, setPos] = useState<string[]>([]);
  const [neg, setNeg] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('');
  const [busy, setBusy] = useState(false);
  const tog = (l: string[], set: (x: string[]) => void, v: string) => set(l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
  const ok = rating > 0 && (text.trim() || voice);
  return (
    <section className="bg-white border border-[#ECE8DF] rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center"><span className="font-mono text-sm bg-[#141414] text-white px-2 py-1 rounded-md">{u.code}</span><span className="text-sm text-[#6B665C]">{u.title}</span></div>
      <div>
        <p className="font-bold mb-2">العميل عجبته قد إيه؟</p>
        <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className="flex-1 text-3xl py-2 rounded-xl bg-[#F6F4EF]" style={{ color: n <= rating ? '#D9B864' : '#E4DFD4' }}>★</button>)}</div>
      </div>
      <div>
        <p className="font-bold mb-2">عجبه إيه؟</p>
        <div className="flex flex-wrap gap-2">{POS.map((t) => <button key={t} type="button" onClick={() => tog(pos, setPos, t)} className={`px-4 py-2.5 rounded-full text-sm font-semibold ${pos.includes(t) ? 'bg-[#1E7A45] text-white' : 'bg-[#F6F4EF]'}`}>{t}</button>)}</div>
      </div>
      <div>
        <p className="font-bold mb-2">ممعجبوش إيه؟</p>
        <div className="flex flex-wrap gap-2">{NEG.map((t) => <button key={t} type="button" onClick={() => tog(neg, setNeg, t)} className={`px-4 py-2.5 rounded-full text-sm font-semibold ${neg.includes(t) ? 'bg-[#C2412D] text-white' : 'bg-[#F6F4EF]'}`}>{t}</button>)}</div>
      </div>
      <VoiceRecorder folder="field_feedback" id={`${trip.id}-${u.code}`} onDone={setVoice} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="أو اكتب رأيه هنا" className="w-full rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] p-3 text-base" />
      <button disabled={!ok || busy} onClick={async () => { setBusy(true); try { await submitFieldFeedback(trip, u, { text: text.trim() || '(فويس)', voiceUrl: voice || undefined, rating, positives: pos, negatives: neg }); onSent(); } finally { setBusy(false); } }}
        className="w-full rounded-2xl py-4 bg-[#A07A26] text-white text-lg font-bold disabled:opacity-40">{busy ? 'جاري الإرسال...' : 'ابعت'}</button>
    </section>
  );
};
