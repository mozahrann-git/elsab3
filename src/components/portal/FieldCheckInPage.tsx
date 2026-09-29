import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { FieldAgent, CheckInStatus, getFieldAgent, getCheckIn, submitCheckIn } from '../../services/portalService';

/*
  صفحة نداء الصباح للمندوب.
  بيفتح اللينك من الواتساب ويدوس زرار واحد — من غير تسجيل دخول ومن غير أي بيانات.
  الفكرة: أسهل حاجة ممكنة، عشان الرد يوصل فعلاً.
*/

const OPTIONS: { key: CheckInStatus; label: string; hint: string; cls: string; Icon: typeof CheckCircle2 }[] = [
  { key: 'available', label: 'متاح النهارده', hint: 'جاهز لأي معاينة', cls: 'bg-[#1E7A45] border-[#1E7A45]', Icon: CheckCircle2 },
  { key: 'busy', label: 'مشغول شوية', hint: 'متاح بس بعد ميعاد معيّن', cls: 'bg-[#A07A26] border-[#A07A26]', Icon: Clock },
  { key: 'off', label: 'مش متاح النهارده', hint: 'أجازة أو ظرف', cls: 'bg-[#C2412D] border-[#C2412D]', Icon: XCircle },
];

export const FieldCheckInPage: React.FC<{ agentId: string; onClose: () => void }> = ({ agentId, onClose }) => {
  const [agent, setAgent] = useState<FieldAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await getFieldAgent(agentId);
      setAgent(a);
      if (a) {
        const c = await getCheckIn(a.id);
        if (c?.status) { setStatus(c.status); setNote(c.note || ''); setSaved(true); }
      }
      setLoading(false);
    })();
  }, [agentId]);

  const submit = async (s: CheckInStatus) => {
    if (!agent) return;
    setStatus(s);
    setSaving(true);
    try {
      await submitCheckIn({ id: agent.id, name: agent.name }, s, note);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[200] bg-[#F6F4EF] overflow-y-auto font-ibm">
      <div className="max-w-md mx-auto px-5 py-10 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] text-[#D9B864] font-bold text-2xl flex items-center justify-center mx-auto">٧</div>
          <p className="font-extrabold text-lg text-[#141414] pt-2">السبع للعقارات</p>
          <p className="text-xs text-[#6B665C]">نداء الصباح — معاينات النهارده</p>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-[#6B665C]">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : !agent ? (
          <div className="bg-white border border-[#E8C2BA] rounded-2xl p-6 text-center space-y-2">
            <p className="font-bold text-[#C2412D]">اللينك ده مش مظبوط</p>
            <p className="text-sm text-[#6B665C]">كلّم مسؤولة الملاك وهي تبعتلك اللينك الصح.</p>
          </div>
        ) : saved ? (
          <div className="bg-white border border-[#ECE8DF] rounded-3xl p-7 text-center space-y-3">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white ${
              status === 'available' ? 'bg-[#1E7A45]' : status === 'busy' ? 'bg-[#A07A26]' : 'bg-[#C2412D]'
            }`}>
              {status === 'available' ? <CheckCircle2 size={30} /> : status === 'busy' ? <Clock size={30} /> : <XCircle size={30} />}
            </div>
            <p className="font-extrabold text-xl text-[#141414]">وصلت، شكراً يا {agent.name}</p>
            <p className="text-sm text-[#6B665C] leading-relaxed">
              {status === 'available' && 'سجّلناك متاح النهارده. لو اتغيّر أي حاجة ارجع لنفس اللينك وغيّر.'}
              {status === 'busy' && 'سجّلنا إنك مشغول شوية. لو فضيت ارجع لنفس اللينك وغيّر.'}
              {status === 'off' && 'سجّلنا إنك مش متاح النهارده. ربنا يسهّل.'}
            </p>
            <button onClick={() => setSaved(false)} className="text-xs font-bold text-[#A07A26] cursor-pointer pt-1">غيّر ردّي</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-base font-bold text-[#141414]">
              صباح الخير يا {agent.name} 👋<br />
              <span className="font-medium text-sm text-[#6B665C]">إنت متاح لمعاينات النهارده؟</span>
            </p>

            <div className="space-y-2.5">
              {OPTIONS.map(({ key, label, hint, cls, Icon }) => (
                <button
                  key={key}
                  onClick={() => submit(key)}
                  disabled={saving}
                  className={`w-full rounded-2xl border-2 text-white px-5 py-4 flex items-center gap-3 text-right disabled:opacity-60 cursor-pointer ${cls}`}
                >
                  <Icon size={22} className="shrink-0" />
                  <span className="flex-1">
                    <span className="block font-extrabold text-base">{label}</span>
                    <span className="block text-xs opacity-80">{hint}</span>
                  </span>
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#141414]">تحب تضيف حاجة؟ (اختياري)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: متاح من ١٢ الضهر"
                className="w-full bg-white border border-[#ECE8DF] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#141414]"
              />
            </label>

            <p className="text-[11px] text-[#8C877D] text-center leading-relaxed">
              الصفحة دي مش بتطلب منك أي بيانات ولا تسجيل دخول.
            </p>
          </div>
        )}

        <button onClick={onClose} className="w-full py-3 text-sm font-bold text-[#6B665C] cursor-pointer">إغلاق</button>
      </div>
    </div>
  );
};

export default FieldCheckInPage;
