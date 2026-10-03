import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { OwnerSubmission } from '../../types';
import { HADABA_WOSTA_NEIGHBORHOODS } from '../../data/properties';

/*
  مراجعة طلب المالك قبل النشر.

  المشكلة اللي بيحلّها: كان فيه زرار واحد «موافقة ونشر بالمعرض» — دوسة
  واحدة والشقة تطلع للناس زي ما المالك كتبها بالظبط. المالك بيكتب السعر
  اللي في دماغه، والدور غلط، والوصف ناقص، والصور ممكن تكون لشقة تانية.
  وبعد كده الشقة تطلع في المعرض وإحنا مش عارفين عنها حاجة.

  دلوقتي: كود إجباري، وكل بيان بيتراجع ويتعدّل هنا، وقايمة تأكيد لازم
  تتعلّم كلها قبل ما زرار النشر يشتغل.
*/

interface Props {
  isOpen: boolean;
  submission: OwnerSubmission | null;
  existingCodes: string[];
  byName: string;
  onClose: () => void;
  onSaveDraft: (sub: OwnerSubmission) => void;
  onPublish: (sub: OwnerSubmission) => void;
}

/* اللي لازم يتأكد قبل ما الشقة تطلع للناس */
const CHECKS: { id: string; label: string; hint: string }[] = [
  { id: 'owner', label: 'اتكلمت مع المالك وأكّد البيانات', hint: 'الاسم والرقم والسعر — بصوته' },
  { id: 'price', label: 'السعر منطقي لسوق الحي', hint: 'قارنه بسعر المتر في الحي' },
  { id: 'photos', label: 'الصور للشقة دي فعلاً وواضحة', hint: 'مش صور من النت ولا لشقة تانية' },
  { id: 'floor', label: 'الدور والمخالفات اتأكدوا', hint: 'الدور الحقيقي ومرخّص ولا مخالف' },
  { id: 'papers', label: 'الورق سليم', hint: 'عقد مسجّل أو ابتدائي، وحصة الأرض' },
];

const money = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '');

export const SubmissionReviewModal: React.FC<Props> = ({
  isOpen, submission, existingCodes, byName, onClose, onSaveDraft, onPublish,
}) => {
  const [d, setD] = useState<OwnerSubmission | null>(submission);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    setD(submission);
    setChecks({});
    setNote((submission as any)?.notes || '');
  }, [submission]);

  const code = String((d as any)?.code || '').trim().toUpperCase();

  const codeError = useMemo(() => {
    if (!code) return 'لازم تكتب كود للشقة';
    if (!/^[A-Z0-9-]{3,12}$/.test(code)) return 'الكود حروف إنجليزي وأرقام بس (من ٣ لـ ١٢ خانة)';
    if (existingCodes.some((c) => String(c || '').trim().toUpperCase() === code)) return 'الكود ده مستخدم في شقة تانية';
    return '';
  }, [code, existingCodes]);

  const allChecked = CHECKS.every((c) => checks[c.id]);
  const priceOk = Number(d?.askingPrice) > 0;
  const areaOk = Number(d?.area) > 0;
  const canPublish = !codeError && allChecked && priceOk && areaOk;

  if (!isOpen || !d) return null;

  const set = (patch: Partial<OwnerSubmission> & Record<string, any>) =>
    setD((s) => (s ? ({ ...s, ...patch } as OwnerSubmission) : s));

  const withMeta = (): OwnerSubmission => ({
    ...(d as any),
    code,
    notes: note,
    reviewedBy: byName,
    reviewedAt: Date.now(),
    reviewChecks: checks,
  } as any);

  const field = 'w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2.5 text-sm';
  const lbl = 'text-[11px] font-bold text-[#6B665C] block mb-1';
  const perMeter = areaOk && priceOk ? Math.round(Number(d.askingPrice) / Number(d.area)) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-[#F6F4EF] w-full sm:max-w-3xl max-h-[94dvh] rounded-t-3xl sm:rounded-3xl flex flex-col">
        <header className="bg-[#141414] text-white px-5 py-4 flex justify-between items-center rounded-t-3xl shrink-0">
          <div className="min-w-0">
            <p className="font-bold flex items-center gap-2">
              <ClipboardCheck size={16} className="text-[#D9B864]" /> مراجعة شقة المالك
            </p>
            <p className="text-xs text-[#CFCBC2] truncate">
              {d.ownerName} · {d.phone}
              {(d as any).referredBy ? ` · جات من: ${(d as any).referredBy}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10 cursor-pointer">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {/* الكود — أول حاجة، وإجباري */}
          <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
            <label className={lbl}>كود الشقة (إجباري) *</label>
            <input
              value={(d as any).code || ''}
              onChange={(e) => set({ code: e.target.value.toUpperCase() } as any)}
              dir="ltr"
              placeholder="H1805"
              className={`${field} font-mono font-bold ${codeError ? 'border-[#E9B8AE] bg-[#FDF2F0]' : ''}`}
            />
            {codeError ? (
              <p className="text-[11px] text-[#9E2A1B] font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> {codeError}
              </p>
            ) : (
              <p className="text-[11px] text-[#1E7A45] font-bold">الكود متاح ✓</p>
            )}
          </section>

          {/* البيانات — كلها بتتعدّل هنا */}
          <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
            <p className="font-extrabold text-sm text-[#141414]">بيانات الشقة</p>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={lbl}>الحي</label>
                <select value={d.neighborhood} onChange={(e) => set({ neighborhood: e.target.value as any })} className={field}>
                  {(HADABA_WOSTA_NEIGHBORHOODS as unknown as string[]).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>المساحة (م²)</label>
                <input type="number" dir="ltr" value={d.area || ''} onChange={(e) => set({ area: Number(e.target.value) || 0 })}
                  className={`${field} font-mono ${areaOk ? '' : 'border-[#E9B8AE]'}`} />
              </div>
              <div>
                <label className={lbl}>السعر المطلوب</label>
                <input type="number" dir="ltr" value={d.askingPrice || ''} onChange={(e) => set({ askingPrice: Number(e.target.value) || 0, price: Number(e.target.value) || 0 })}
                  className={`${field} font-mono ${priceOk ? '' : 'border-[#E9B8AE]'}`} />
              </div>
              <div>
                <label className={lbl}>سعر المتر (محسوب)</label>
                <p className={`${field} font-mono bg-[#F0ECE4] text-[#6B665C]`}>{perMeter ? money(perMeter) : '—'}</p>
              </div>
              <div>
                <label className={lbl}>الدور</label>
                <input value={d.floor || ''} onChange={(e) => set({ floor: e.target.value })} className={field} />
              </div>
              <div>
                <label className={lbl}>التشطيب</label>
                <select value={d.finishing} onChange={(e) => set({ finishing: e.target.value as any })} className={field}>
                  <option value="finished">متشطبة بالكامل</option>
                  <option value="semi_finished">نص تشطيب</option>
                </select>
              </div>
              <div>
                <label className={lbl}>غرف النوم</label>
                <input type="number" dir="ltr" value={d.bedrooms || ''} onChange={(e) => set({ bedrooms: Number(e.target.value) || 0 })} className={`${field} font-mono`} />
              </div>
              <div>
                <label className={lbl}>الحمامات</label>
                <input type="number" dir="ltr" value={d.bathrooms || ''} onChange={(e) => set({ bathrooms: Number(e.target.value) || 0 })} className={`${field} font-mono`} />
              </div>
            </div>

            <div>
              <label className={lbl}>اللوكيشن بالتحديد</label>
              <input value={d.exactLocation || ''} onChange={(e) => set({ exactLocation: e.target.value })} className={field} />
            </div>

            <div>
              <label className={lbl}>مواعيد المعاينة</label>
              <input value={d.viewingSchedule || ''} onChange={(e) => set({ viewingSchedule: e.target.value })} className={field} />
            </div>

            <div>
              <label className={lbl}>الوصف اللي هيتنشر</label>
              <textarea rows={3} value={d.unitDescription || ''} onChange={(e) => set({ unitDescription: e.target.value })} className={field} />
            </div>
          </section>

          {/* المالك الحقيقي — مش بيتنشر، بيتخزن جوّاني */}
          <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2.5">
            <p className="font-extrabold text-sm text-[#141414]">بيانات المالك (جوّانية — مش بتتنشر)</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={lbl}>اسم المالك الحقيقي</label>
                <input value={(d as any).realOwnerName || d.ownerName || ''} onChange={(e) => set({ realOwnerName: e.target.value } as any)} className={field} />
              </div>
              <div>
                <label className={lbl}>رقم المالك</label>
                <input dir="ltr" value={(d as any).realOwnerPhone || d.phone || ''} onChange={(e) => set({ realOwnerPhone: e.target.value } as any)} className={`${field} font-mono`} />
              </div>
            </div>
          </section>

          {/* الصور */}
          {(d.images || []).length > 0 && (
            <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
              <p className="font-extrabold text-sm text-[#141414]">الصور ({d.images.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {d.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-24 h-20 rounded-lg object-cover border border-[#ECE8DF] shrink-0" />
                ))}
              </div>
            </section>
          )}

          {/* قايمة التأكيد — النشر مقفول لحد ما تتعلّم كلها */}
          <section className="bg-white border border-[#EBD9A6] rounded-2xl p-4 space-y-2">
            <p className="font-extrabold text-sm text-[#7A5E12]">أكّد قبل النشر</p>
            {CHECKS.map((c) => (
              <label key={c.id} className="flex items-start gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={!!checks[c.id]}
                  onChange={(e) => setChecks((s) => ({ ...s, [c.id]: e.target.checked }))}
                  className="accent-[#1E7A45] w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[#141414]">{c.label}</span>
                  <span className="block text-[11px] text-[#8C877D]">{c.hint}</span>
                </span>
              </label>
            ))}
          </section>

          <section className="bg-white border border-[#ECE8DF] rounded-2xl p-4">
            <label className={lbl}>ملاحظات المراجعة</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي حاجة لازم الفريق يعرفها عن الشقة دي" className={field} />
          </section>
        </div>

        <div className="p-4 border-t border-[#E4DFD4] space-y-2 shrink-0" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            disabled={!canPublish}
            onClick={() => onPublish(withMeta())}
            className="w-full py-4 rounded-2xl bg-[#1E7A45] text-white text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} /> اعتمد وانشر بالكود {code || ''}
          </button>
          {!canPublish && (
            <p className="text-[11px] text-[#C2412D] text-center leading-relaxed">
              {codeError || (!priceOk || !areaOk ? 'السعر والمساحة لازم يتكتبوا' : `لسه ${CHECKS.filter((c) => !checks[c.id]).length} تأكيدات ناقصة`)}
            </p>
          )}
          <button onClick={() => { onSaveDraft(withMeta()); onClose(); }} className="w-full py-3 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-sm font-bold cursor-pointer">
            احفظ التعديلات وسيبها قيد المراجعة
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubmissionReviewModal;
