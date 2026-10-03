import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { X, Upload, Users, Flame, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { Lead, SalesAgent } from '../../types';

/*
  توزيع ليدات الكامبين على السيلز.
  بتلزق الأسماء والأرقام أو بترفع شيت، وبتتوزّع بالتساوي على اللي إنت مختارهم،
  وبتنزل في خانة "جديد" عند كل واحد وعليها علامة ليد فريش.
*/

interface Parsed { name: string; phone: string; note?: string }

/* الأرقام العربية والفارسية بتيجي كده من الواتساب ومن تصدير الكامبينات،
   ولو مترجمتش الرقم مبيتقريش خالص والسطر بيتشال. */
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function toEnglishDigits(t: string): string {
  return t.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_DIGITS.indexOf(ch);
    if (a >= 0) return String(a);
    return String(PERSIAN_DIGITS.indexOf(ch));
  });
}

/** بيطلّع اسم ورقم من أي سطر: "أحمد 01012345678" أو "01012345678 - أحمد" أو مفصولين بتاب/فاصلة */
function parseLine(line: string): Parsed | null {
  // الأول بنحوّل الأرقام العربية لإنجليزي، وبنشيل علامات الاتجاه اللي الواتساب بيحطها
  const clean = toEnglishDigits(line.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')).trim();
  if (!clean) return null;

  /* بنلزق أرقام الموبايل المكتوبة بشرطات أو مسافات (0100-123-4567) قبل ما ندوّر،
     لأن تصدير الكامبينات بيطلّعها كده كتير. */
  const raw = clean.replace(/(\d)[\s\-().]+(?=\d)/g, '$1');

  // 010/011/012/015 — بحدود عشان منخطفش أرقام من جوه رقم أطول
  const phoneMatch = raw.match(/(?<!\d)(?:\+?2)?0?1[0125]\d{8}(?!\d)/);
  if (!phoneMatch) return null;

  let phone = phoneMatch[0].replace(/\D/g, '');
  if (phone.startsWith('20')) phone = phone.slice(2);
  if (!phone.startsWith('0')) phone = `0${phone}`;
  if (phone.length !== 11) return null;

  /* الاسم: بناخده من السطر الأصلي (قبل لزق الأرقام) عشان أسماء فيها أرقام متتلغبطش،
     وبنشيل منه الرقم بأي شكل اتكتب بيه. */
  const digitsOnly = phone.slice(1);                       // 1012345678
  const loose = digitsOnly.split('').join('[\\s\\-().]*');   // بيمسك الرقم حتى لو متفرّق
  const rest = clean
    .replace(new RegExp(`(?:\\+?2)?0?${loose}`), ' ')
    .replace(/[,\t;|()\-+_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // لو اللي فضل أرقام أو نقط بس، مش اسم
  const name = /[\p{L}]/u.test(rest) ? rest : '';
  return { name: (name || 'عميل من الكامبين').slice(0, 60), phone };
}

const normPhone = (p: string) => p.replace(/\D/g, '').slice(-10);

interface Props {
  isOpen: boolean;
  /** اسم اللي بيوزّع — بيتكتب على كل ليد */
  distributorName?: string;
  onClose: () => void;
  agents: SalesAgent[];
  existingLeads: Lead[];
  onDistribute: (leads: Lead[]) => void;
}

export const CampaignLeadsModal: React.FC<Props> = ({ isOpen, onClose, agents, existingLeads, onDistribute, distributorName }) => {
  const [text, setText] = useState('');
  const [campaign, setCampaign] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  /* فريش ولا كامبين قديم — اختيار الإدارة، مش محسوب من التاريخ */
  const [kind, setKind] = useState<'fresh' | 'old_campaign'>('fresh');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const activeAgents = useMemo(() => agents.filter((a) => a.isActive !== false), [agents]);
  const chosen = useMemo(
    () => (picked.length ? activeAgents.filter((a) => picked.includes(a.id)) : activeAgents),
    [activeAgents, picked],
  );

  const known = useMemo(() => new Set(existingLeads.map((l) => normPhone(l.phone || ''))), [existingLeads]);

  const parsed = useMemo(() => {
    const out: Parsed[] = [];
    const seen = new Set<string>();
    text.split(/\r?\n/).forEach((line) => {
      const p = parseLine(line);
      if (!p) return;
      const k = normPhone(p.phone);
      if (seen.has(k)) return;      // مكرر في نفس اللصقة
      seen.add(k);
      out.push(p);
    });
    return out;
  }, [text]);

  const fresh = useMemo(() => parsed.filter((p) => !known.has(normPhone(p.phone))), [parsed, known]);
  const dupes = parsed.length - fresh.length;
  const badLines = useMemo(
    () => text.split(/\r?\n/).filter((l) => l.trim() && !parseLine(l)).length,
    [text],
  );

  /* التوزيع بالدور: واحد لكل سيلز بالترتيب، فالقسمة بتطلع متساوية */
  const preview = useMemo(() => {
    if (!chosen.length) return [];
    return fresh.map((p, i) => ({ ...p, agent: chosen[i % chosen.length] }));
  }, [fresh, chosen]);

  const perAgent = useMemo(() => {
    const m = new Map<string, number>();
    preview.forEach((r) => m.set(r.agent.id, (m.get(r.agent.id) || 0) + 1));
    return m;
  }, [preview]);

  const readSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const lines = grid.map((row) => row.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ')).filter(Boolean);
      setText((prev) => (prev ? `${prev}\n${lines.join('\n')}` : lines.join('\n')));
    } catch (e: any) {
      setErr(`مقدرتش أقرا الشيت — ${e?.message || 'جرّب تلزق الأسماء والأرقام بدل الملف'}`);
    }
  };

  const submit = () => {
    if (!preview.length) { setErr('مفيش ليدات جاهزة للتوزيع.'); return; }
    if (!chosen.length) { setErr('اختار سيلز واحد على الأقل.'); return; }
    setSaving(true);

    const now = Date.now();
    const leads: Lead[] = preview.map((r, i) => ({
      id: `lead_camp_${now}_${i}`,
      name: r.name,
      phone: r.phone,
      whatsapp: r.phone,
      status: 'new',
      source: 'campaign',
      campaignName: campaign.trim() || undefined,
      isFresh: kind === 'fresh',
      leadKind: kind,
      distributedAt: now,
      notes: [campaign.trim()
        ? `${kind === 'fresh' ? 'ليد فريش' : 'كامبين قديم'} — ${campaign.trim()}`
        : (kind === 'fresh' ? 'ليد فريش من الكامبين' : 'ليد من كامبين قديم')],
      assignedAgentId: r.agent.id,
      assignedAgentName: r.agent.name,
      addedByName: distributorName || 'الإدارة',
      createdAt: new Date().toISOString(),
      lastContactDate: 'لسه محدش كلّمه',
      followUpStatus: 'pending',
      followUpScheduledAt: 'النهارده',
      followUpNote: kind === 'fresh' ? 'أول اتصال مع ليد فريش' : 'إعادة تواصل مع ليد كامبين قديم',
      followUpUrgency: kind === 'fresh' ? 'urgent' : 'today',
      /* الفريش بيبرد بسرعة فأول اتصال خلال ساعتين.
         القديم مستني من زمان، فمفيش داعي لنفس الاستعجال. */
      nextActionAt: now + (kind === 'fresh' ? 2 : 8) * 3600000,
    }));

    onDistribute(leads);
    setSaving(false);
    setText('');
    setCampaign('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#F6F4EF] w-full sm:max-w-3xl max-h-[94dvh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#ECE8DF] bg-white">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-[#C2412D] flex items-center justify-center"><Flame size={18} /></span>
            <div>
              <p className="font-bold text-base leading-tight">توزيع ليدات الكامبين</p>
              <p className="text-[11px] text-[#6B665C]">بتنزل في خانة "جديد" عند كل سيلز بعلامة ليد فريش</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 cursor-pointer"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* نوع الليدات دي — إنت اللي بتقرر، مش النظام */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#141414]">الليدات دي نوعها إيه؟</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['fresh', 'ليد فريش', '#C2410C', 'نازلة دلوقتي — أول اتصال خلال ساعتين'],
                ['old_campaign', 'كامبين قديم', '#4A5568', 'من كامبين قديم — إعادة تواصل'],
              ] as const).map(([k, label, hex, hint]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`py-3 px-3 rounded-xl text-right border-2 cursor-pointer transition ${
                    kind === k ? 'text-white' : 'bg-white text-[#141414] border-[#E4DFD4]'
                  }`}
                  style={kind === k ? { background: hex, borderColor: hex } : undefined}
                >
                  <span className="block text-sm font-extrabold">{label}</span>
                  <span className={`block text-[11px] leading-relaxed ${kind === k ? 'text-white/85' : 'text-[#8C877D]'}`}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8C877D] leading-relaxed">
              ده بيحدد لون الكارت عند السيلز، واللون بيروح أول ما يكلّم العميل.
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#141414]">اسم الكامبين (اختياري)</span>
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="مثلاً: كامبين أكتوبر — المقطم"
              className="w-full bg-white border border-[#ECE8DF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#141414]"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#141414]">الأسماء والأرقام</span>
              <button onClick={() => fileRef.current?.click()} className="text-xs font-bold text-[#141414] flex items-center gap-1.5 cursor-pointer">
                <Upload size={13} /> ارفع شيت بدل الكتابة
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={readSheet} className="hidden" />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              dir="rtl"
              placeholder={'أحمد محمود 01012345678\n01198765432 منى سعيد\nكريم 01234567890'}
              className="w-full bg-white border border-[#ECE8DF] rounded-2xl px-3 py-3 text-sm leading-7 focus:outline-none focus:border-[#141414]"
            />
            <p className="text-[11px] text-[#6B665C] leading-relaxed">
              سطر لكل عميل. الاسم والرقم بأي ترتيب، والنظام بيطلّع الرقم لوحده.
            </p>
          </div>

          {(parsed.length > 0 || badLines > 0) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="جاهز للتوزيع" value={String(fresh.length)} tone="good" />
              <Stat label="مكرر (موجود قبل كده)" value={String(dupes)} tone="warn" />
              <Stat label="سطور مفهمتهاش" value={String(badLines)} tone={badLines ? 'bad' : 'plain'} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#A07A26]" />
              <span className="text-xs font-bold text-[#141414]">التوزيع على</span>
              <button onClick={() => setPicked([])} className="text-[11px] font-bold text-[#6B665C] mr-auto cursor-pointer">الكل</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeAgents.map((a) => {
                const on = picked.length === 0 || picked.includes(a.id);
                const n = perAgent.get(a.id) || 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => setPicked((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...(prev.length ? prev : []), a.id]))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#4A463F] border-[#ECE8DF]'
                    }`}
                  >
                    {a.name}{on && n > 0 ? ` · ${n}` : ''}
                  </button>
                );
              })}
            </div>
            {activeAgents.length === 0 && (
              <p className="text-xs text-[#C2412D]">مفيش سيلز نشط. ضيف فريق المبيعات الأول.</p>
            )}
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#141414]">مراجعة قبل التوزيع</p>
              <div className="bg-white border border-[#ECE8DF] rounded-2xl divide-y divide-[#F2EFE9] max-h-64 overflow-y-auto">
                {preview.slice(0, 50).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
                    <span className="font-bold text-[#141414] truncate">{r.name}</span>
                    <span className="font-mono text-[#6B665C]" dir="ltr">{r.phone}</span>
                    <span className="text-[#A07A26] font-bold shrink-0">{r.agent.name}</span>
                  </div>
                ))}
                {preview.length > 50 && (
                  <p className="px-4 py-2 text-[11px] text-[#6B665C]">و{preview.length - 50} كمان...</p>
                )}
              </div>
            </div>
          )}

          {err && (
            <p className="text-xs text-[#C2412D] bg-[#FDF2F0] border border-[#E8C2BA] rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{err}</span>
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#ECE8DF] bg-white flex items-center gap-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          {text && (
            <button onClick={() => setText('')} className="p-3 rounded-xl border border-[#ECE8DF] text-[#6B665C] cursor-pointer" title="فضّي القايمة">
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={submit}
            disabled={saving || preview.length === 0}
            className="flex-1 py-3.5 rounded-2xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            {preview.length ? `وزّع ${preview.length} ليد على ${chosen.length} سيلز` : 'مفيش ليدات جاهزة'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const Stat: React.FC<{ label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'plain' }> = ({ label, value, tone }) => {
  const c = tone === 'good' ? 'text-[#1E7A45]' : tone === 'warn' ? 'text-[#A07A26]' : tone === 'bad' ? 'text-[#C2412D]' : 'text-[#6B665C]';
  return (
    <div className="bg-white border border-[#ECE8DF] rounded-xl py-2.5 px-2">
      <p className={`text-xl font-extrabold font-mono ${c}`}>{value}</p>
      <p className="text-[10px] text-[#6B665C] leading-tight mt-0.5">{label}</p>
    </div>
  );
};

export default CampaignLeadsModal;
