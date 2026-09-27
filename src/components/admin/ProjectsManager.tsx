import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Plus, Trash2, Pencil, Save, X, Building2, Landmark,
  Eye, EyeOff, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Project, PaymentPlan, subscribeProjects, saveProject, saveProjects, deleteProject, fetchInternalNotes } from '../../services/projectService';
import { parseProjectsWorkbook } from '../../utils/projectsExcel';

/*
  إدارة المشاريع تحت الإنشاء: عمارات منفصلة وكمبوندات.
  طريقتين للإدخال: رفع الشيت (سريع للإضافة بالجملة) أو الفورم (للتعديل الفردي).
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const pct = (n?: number) => (typeof n === 'number' && isFinite(n) ? `${n}٪` : '—');

/* نفس قوائم الاختيار اللي في شيت المشاريع، عشان اللي يتكتب بالإيد
   يبقى مطابق للي بيتقرا من الشيت — من غير كده هيبقى عندنا "نصف تشطيب" و"نص تشطيب". */
const FACADES = ['بحري', 'قبلي', 'شرقي', 'غربي', 'ناصية'];
const FINISHINGS = ['بدون تشطيب', 'نصف تشطيب', 'تشطيب كامل', 'سوبر لوكس'];
const LICENSES = ['مرخصة', 'تحت الترخيص', 'تصالح'];

const emptyProject = (kind: Project['kind']): Project => ({
  id: '', kind, code: '', name: '', neighborhood: '', plans: [{ label: 'نظام ١' }],
});

interface Props {
  showToast: (msg: string) => void;
  neighborhoods: string[];
}

export const ProjectsManager: React.FC<Props> = ({ showToast, neighborhoods }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ ok: string[]; bad: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeProjects(setProjects), []);

  const buildings = useMemo(() => projects.filter((p) => p.kind === 'building'), [projects]);
  const compounds = useMemo(() => projects.filter((p) => p.kind === 'compound'), [projects]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setReport(null);
    try {
      const r = await parseProjectsWorkbook(file);
      if (r.projects.length === 0) {
        setReport({ ok: [], bad: r.errors.length ? r.errors : ['مالقيتش أي مشروع في الملف. اتأكد إنك ملّيت صفوف تحت العناوين.'] });
        return;
      }
      const saved = await saveProjects(r.projects);
      setReport({
        ok: [
          `اتحفظ ${saved} مشروع: ${r.buildings} عمارة و${r.compounds} كمبوند.`,
          ...(r.skipped ? [`اتجاهلت ${r.skipped} صف فاضي أو صف مثال.`] : []),
        ],
        bad: r.errors,
      });
      showToast(`تم استيراد ${saved} مشروع`);
    } catch (err: any) {
      setReport({ ok: [], bad: [err?.message || 'الملف مش مقروء'] });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Project) => {
    if (!window.confirm(`هتمسح "${p.name}" نهائياً. متأكد؟`)) return;
    try {
      await deleteProject(p.id);
      showToast('تم مسح المشروع');
    } catch (e: any) {
      showToast(`المسح ما نفعش — ${e?.message || 'جرّب تاني'}`);
    }
  };

  const toggleHidden = async (p: Project) => {
    try {
      await saveProject({ ...p, hidden: !p.hidden });
      showToast(p.hidden ? 'المشروع ظهر للزوار' : 'المشروع اتخبى عن الزوار');
    } catch (e: any) {
      showToast(`التغيير ما نفعش — ${e?.message || 'جرّب تاني'}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* الاستيراد */}
      <div className="p-4 sm:p-5 bg-white border border-[#ECE8DF] rounded-2xl space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-[#141414]">رفع شيت المشاريع</h3>
            <p className="text-xs text-[#6B665C] mt-1 leading-relaxed">
              ارفع الشيت زي ما هو — النظام بيقرا صفحة "العمارات المنفصلة" وصفحة "الكمبوندات" بأعمدتهم.
              الكود المكرر بيحدّث المشروع القديم بدل ما يعمل نسخة تانية.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="px-4 py-2.5 bg-[#141414] hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Upload size={14} />
            <span>{busy ? 'جاري القراءة...' : 'اختار الشيت'}</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        </div>

        {report && (
          <div className="space-y-1.5 pt-1">
            {report.ok.map((m, i) => (
              <p key={`ok${i}`} className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> <span>{m}</span>
              </p>
            ))}
            {report.bad.map((m, i) => (
              <p key={`bad${i}`} className="text-xs text-[#C2412D] bg-[#FDF2F0] border border-[#E8C2BA] rounded-xl px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{m}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* الإضافة بالإيد */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setEditing(emptyProject('building'))}
          className="px-3.5 py-2 bg-white hover:bg-[#FAF4E5] border border-[#ECE8DF] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> <Building2 size={14} /> <span>عمارة جديدة</span>
        </button>
        <button
          onClick={() => setEditing(emptyProject('compound'))}
          className="px-3.5 py-2 bg-white hover:bg-[#FAF4E5] border border-[#ECE8DF] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> <Landmark size={14} /> <span>كمبوند جديد</span>
        </button>
        <span className="text-[11px] text-[#6B665C] mr-auto">
          {buildings.length} عمارة · {compounds.length} كمبوند
        </span>
      </div>

      {/* القوائم */}
      {projects.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-[#DCD6CA] rounded-2xl">
          <p className="font-bold text-[#141414]">لسه مفيش مشاريع</p>
          <p className="text-xs text-[#6B665C] mt-1">ارفع الشيت فوق، أو ضيف عمارة بالإيد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              p={p}
              onEdit={() => setEditing(p)}
              onDelete={() => remove(p)}
              onToggleHidden={() => toggleHidden(p)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ProjectForm
          initial={editing}
          neighborhoods={neighborhoods}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); showToast(msg); }}
        />
      )}
    </div>
  );
};

const ProjectRow: React.FC<{
  p: Project; onEdit: () => void; onDelete: () => void; onToggleHidden: () => void;
}> = ({ p, onEdit, onDelete, onToggleHidden }) => {
  const plan = p.plans?.[0];
  return (
    <div className={`p-4 bg-white border rounded-2xl space-y-3 ${p.hidden ? 'border-dashed border-[#DCD6CA] opacity-70' : 'border-[#ECE8DF]'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {p.kind === 'building' ? <Building2 size={15} className="text-[#A07A26]" /> : <Landmark size={15} className="text-[#A07A26]" />}
            <span className="font-extrabold text-[#141414]">{p.name}</span>
            <span className="text-[10px] font-mono bg-[#141414] text-white px-1.5 py-0.5 rounded">{p.code}</span>
            {p.hidden && <span className="text-[10px] font-bold text-[#6B665C]">متخبّي</span>}
          </div>
          <p className="text-xs text-[#6B665C] mt-1">
            {p.neighborhood}{p.developer ? ` · ${p.developer}` : ''}
            {p.constructionPercent ? ` · إنشاء ${pct(p.constructionPercent)}` : ''}
            {p.deliveryDate ? ` · استلام ${p.deliveryDate}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onToggleHidden} title={p.hidden ? 'ظهّر' : 'اخفِ'} className="p-2 rounded-lg border border-[#ECE8DF] hover:bg-[#FAF4E5] cursor-pointer">
            {p.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg border border-[#ECE8DF] hover:bg-[#FAF4E5] cursor-pointer"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-2 rounded-lg border border-[#E8C2BA] text-[#C2412D] hover:bg-[#FDF2F0] cursor-pointer"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="يبدأ من" value={`${f(p.startingPrice)} ج.م`} />
        <Stat label="سعر المتر" value={`${f(p.pricePerMeter)} ج.م`} />
        <Stat label="المقدم" value={plan?.downPaymentAmount ? `${f(plan.downPaymentAmount)} ج.م` : pct(plan?.downPaymentPercent)} />
        <Stat label="القسط الشهري" value={plan?.monthly ? `${f(plan.monthly)} ج.م` : '—'} />
      </div>

      {p.headline && <p className="text-xs text-[#4A463F] bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl px-3 py-2">{p.headline}</p>}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl py-2 px-1">
    <p className="text-[10px] text-[#6B665C]">{label}</p>
    <p className="text-xs font-bold text-[#141414] font-mono">{value}</p>
  </div>
);

/* ============ الفورم ============ */

const ProjectForm: React.FC<{
  initial: Project;
  neighborhoods: string[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ initial, neighborhoods, onClose, onSaved }) => {
  const [d, setD] = useState<Project>({ ...initial, plans: initial.plans?.length ? initial.plans : [{ label: 'نظام ١' }] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const isBuilding = d.kind === 'building';

  // الملاحظات الداخلية مش في المستند العام، فبنجيبها لوحدها لما نفتح مشروع موجود
  useEffect(() => {
    let alive = true;
    if (!initial.id) return;
    fetchInternalNotes(initial.id).then((text) => {
      if (alive && text) setD((prev) => ({ ...prev, internalNotes: text }));
    });
    return () => { alive = false; };
  }, [initial.id]);

  const set = (k: keyof Project, v: unknown) => setD((prev) => ({ ...prev, [k]: v }));
  const setPlan = (i: number, k: keyof PaymentPlan, v: unknown) =>
    setD((prev) => {
      const plans = [...(prev.plans || [])];
      plans[i] = { ...plans[i], [k]: v };
      return { ...prev, plans };
    });

  const submit = async () => {
    if (!d.code.trim()) { setErr('لازم تكتب كود للمشروع، زي BLD-002.'); return; }
    if (!d.name.trim()) { setErr('لازم تكتب اسم المشروع.'); return; }
    setSaving(true);
    setErr('');
    try {
      await saveProject(d, initial.id || undefined);
      onSaved(`اتحفظ "${d.name}"`);
    } catch (e: any) {
      setErr(e?.message || 'الحفظ ما نفعش');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F3] w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 bg-[#FAF8F3] border-b border-[#ECE8DF] px-5 py-4 flex items-center justify-between">
          <h3 className="font-extrabold">{isBuilding ? 'عمارة منفصلة' : 'كمبوند'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#ECE8DF] cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          <Section title="الأساسي">
            <Field label="الكود" value={d.code} onChange={(v) => set('code', v)} mono placeholder={isBuilding ? 'BLD-002' : 'CMP-002'} />
            <Field label={isBuilding ? 'اسم العمارة' : 'اسم الكمبوند'} value={d.name} onChange={(v) => set('name', v)} />
            <SelectField label="الحي" value={d.neighborhood} options={neighborhoods} onChange={(v) => set('neighborhood', v)} />
            <Field label={isBuilding ? 'المالك / المقاول' : 'المطور'} value={d.developer || ''} onChange={(v) => set('developer', v)} />
            {isBuilding && <Field label="رقم القطعة / الشارع" value={d.plotOrStreet || ''} onChange={(v) => set('plotOrStreet', v)} />}
            <NumField label="نسبة الإنشاء ٪" value={d.constructionPercent} onChange={(v) => set('constructionPercent', v)} />
            <Field label="ميعاد الاستلام" value={d.deliveryDate || ''} onChange={(v) => set('deliveryDate', v)} placeholder="2027" />
          </Section>

          <Section title="الأسعار">
            <NumField label="سعر المتر" value={d.pricePerMeter} onChange={(v) => set('pricePerMeter', v)} />
            <NumField label="أقل مساحة م²" value={d.minArea} onChange={(v) => set('minArea', v)} />
            {isBuilding && <NumField label="أكبر مساحة م²" value={d.maxArea} onChange={(v) => set('maxArea', v)} />}
            <NumField label="يبدأ من (ج.م)" value={d.startingPrice} onChange={(v) => set('startingPrice', v)} />
            {isBuilding && <NumField label="خصم الكاش ٪" value={d.cashDiscountPercent} onChange={(v) => set('cashDiscountPercent', v)} />}
            {isBuilding && <NumField label="سعر الكاش" value={d.cashPrice} onChange={(v) => set('cashPrice', v)} />}
            <NumField label="الوحدات المتاحة" value={d.availableUnits} onChange={(v) => set('availableUnits', v)} />
          </Section>

          {isBuilding ? (
            <Section title="مواصفات العمارة">
              <NumField label="عدد الأدوار" value={d.floors} onChange={(v) => set('floors', v)} />
              <NumField label="شقق في الدور" value={d.unitsPerFloor} onChange={(v) => set('unitsPerFloor', v)} />
              <SelectField label="الواجهة" value={d.facade || ''} options={FACADES} onChange={(v) => set('facade', v)} />
              <SelectField label="التشطيب" value={d.finishing || ''} options={FINISHINGS} onChange={(v) => set('finishing', v)} />
              <SelectField label="الترخيص" value={d.licenseStatus || ''} options={LICENSES} onChange={(v) => set('licenseStatus', v)} />
              <BoolField label="أسانسير" value={d.hasElevator} onChange={(v) => set('hasElevator', v)} />
              <BoolField label="جراج" value={d.hasGarage} onChange={(v) => set('hasGarage', v)} />
            </Section>
          ) : (
            <Section title="تفاصيل الكمبوند">
              <NumField label="مشاريع مسلّمة للمطور" value={d.developerTrackRecord} onChange={(v) => set('developerTrackRecord', v)} />
              <NumField label="المساحة الكلية (فدان)" value={d.totalFeddan} onChange={(v) => set('totalFeddan', v)} />
              <NumField label="نسبة المباني ٪" value={d.builtRatioPercent} onChange={(v) => set('builtRatioPercent', v)} />
              <Field label="المرحلة" value={d.phase || ''} onChange={(v) => set('phase', v)} />
              <Field label="أنواع الوحدات" value={d.unitTypes || ''} onChange={(v) => set('unitTypes', v)} />
              <NumField label="وديعة الصيانة ٪" value={d.maintenanceFeePercent} onChange={(v) => set('maintenanceFeePercent', v)} />
              <NumField label="النادي (ج.م)" value={d.clubFee} onChange={(v) => set('clubFee', v)} />
              <NumField label="الجراج (ج.م)" value={d.garageFee} onChange={(v) => set('garageFee', v)} />
              <Field label="الخدمات" value={d.amenities || ''} onChange={(v) => set('amenities', v)} />
            </Section>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-[#A07A26]">أنظمة السداد</p>
              <button
                onClick={() => setD((prev) => ({ ...prev, plans: [...(prev.plans || []), { label: `نظام ${(prev.plans?.length || 0) + 1}` }] }))}
                className="text-[11px] font-bold text-[#141414] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> ضيف نظام
              </button>
            </div>
            {(d.plans || []).map((pl, i) => (
              <div key={i} className="bg-white border border-[#ECE8DF] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    value={pl.label || ''}
                    onChange={(e) => setPlan(i, 'label', e.target.value)}
                    className="font-bold text-xs bg-transparent focus:outline-none"
                    placeholder={`نظام ${i + 1}`}
                  />
                  {(d.plans?.length || 0) > 1 && (
                    <button
                      onClick={() => setD((prev) => ({ ...prev, plans: (prev.plans || []).filter((_, x) => x !== i) }))}
                      className="text-[#C2412D] cursor-pointer"
                    ><Trash2 size={13} /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <NumField label="مقدم ٪" value={pl.downPaymentPercent} onChange={(v) => setPlan(i, 'downPaymentPercent', v)} />
                  <NumField label="سنين" value={pl.years} onChange={(v) => setPlan(i, 'years', v)} />
                  <NumField label="المقدم" value={pl.downPaymentAmount} onChange={(v) => setPlan(i, 'downPaymentAmount', v)} />
                  <NumField label="شهري" value={pl.monthly} onChange={(v) => setPlan(i, 'monthly', v)} />
                  <NumField label="ربع سنوي" value={pl.quarterly} onChange={(v) => setPlan(i, 'quarterly', v)} />
                </div>
              </div>
            ))}
          </div>

          <Section title="العرض">
            <Field label="ميزة المشروع في جملة" value={d.headline || ''} onChange={(v) => set('headline', v)} wide />
            <Field label="رابط الصور والفيديو" value={d.mediaUrl || ''} onChange={(v) => set('mediaUrl', v)} wide mono />
            <Field label="ملاحظات داخلية (مبتظهرش للزوار)" value={d.internalNotes || ''} onChange={(v) => set('internalNotes', v)} wide />
          </Section>

          {err && (
            <p className="text-xs text-[#C2412D] bg-[#FDF2F0] border border-[#E8C2BA] rounded-xl px-3 py-2">{err}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#FAF8F3] border-t border-[#ECE8DF] px-5 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#DCD6CA] bg-white font-bold text-sm cursor-pointer">إلغاء</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <Save size={15} /> {saving ? 'بيحفظ...' : 'احفظ المشروع'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============ عناصر الفورم ============ */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <p className="text-xs font-extrabold text-[#A07A26]">{title}</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
  </div>
);

const shell = 'bg-white border border-[#ECE8DF] rounded-xl px-3 py-2 w-full text-sm focus:outline-none focus:border-[#141414]';

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; wide?: boolean }> =
  ({ label, value, onChange, placeholder, mono, wide }) => (
    <label className={`block space-y-1 ${wide ? 'col-span-2 sm:col-span-3' : ''}`}>
      <span className="text-[11px] text-[#6B665C]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${shell} ${mono ? 'font-mono text-xs' : ''}`} />
    </label>
  );

const NumField: React.FC<{ label: string; value?: number; onChange: (v: number | undefined) => void }> = ({ label, value, onChange }) => (
  <label className="block space-y-1">
    <span className="text-[11px] text-[#6B665C]">{label}</span>
    <input
      type="number"
      dir="ltr"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className={`${shell} font-mono text-xs text-right`}
    />
  </label>
);

const SelectField: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => {
  /* لو الشيت جاب قيمة مش في القائمة (حد كتبها بالإيد في إكسل)، بنضيفها للقائمة
     عشان متتمسحش من غير ما حد ياخد باله لما نفتح المشروع ونحفظه. */
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-[#6B665C]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={shell}>
        <option value="">— اختار —</option>
        {all.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
};

const BoolField: React.FC<{ label: string; value?: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 bg-white border border-[#ECE8DF] rounded-xl px-3 py-2.5 cursor-pointer">
    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="accent-[#141414]" />
    <span className="text-xs font-bold">{label}</span>
  </label>
);

export default ProjectsManager;
