import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark, HardHat, CalendarClock, ChevronLeft, X, MessageCircle } from 'lucide-react';
import { Project, subscribeProjects } from '../services/projectService';
import { generateWhatsAppLink } from '../utils/helpers';

/*
  قسم "تحت الإنشاء" في الصفحة الرئيسية.
  بيظهر بس لما يكون فيه مشاريع غير متخبّية — زي قسم الصفقات المقفولة بالظبط.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Props {
  whatsappNumber?: string;
  /** في وضع "تحت الإنشاء" لازم القسم يظهر حتى لو فاضي، عشان الصفحة ما تبقاش بيضا */
  alwaysShow?: boolean;
}

export const ProjectsSection: React.FC<Props> = ({ whatsappNumber, alwaysShow }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState<Project | null>(null);
  const [kind, setKind] = useState<'all' | 'building' | 'compound'>('all');

  useEffect(() => subscribeProjects(setProjects), []);

  const visible = useMemo(() => projects.filter((p) => !p.hidden), [projects]);
  const shown = useMemo(
    () => (kind === 'all' ? visible : visible.filter((p) => p.kind === kind)),
    [visible, kind],
  );

  const counts = useMemo(() => ({
    building: visible.filter((p) => p.kind === 'building').length,
    compound: visible.filter((p) => p.kind === 'compound').length,
  }), [visible]);

  // مفيش مشاريع؟ القسم مبيظهرش خالص — إلا لو الصفحة كلها في وضع "تحت الإنشاء"
  if (visible.length === 0 && !alwaysShow) return null;

  return (
    <section className="px-4 sm:px-6 py-10 sm:py-14 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardHat size={18} className="text-[#A07A26]" />
          <span className="text-xs font-bold text-[#A07A26] tracking-wide">تحت الإنشاء</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141414]">
          مشاريع تقدر تحجز فيها بالتقسيط
        </h2>
        <p className="text-sm text-[#6B665C] max-w-2xl leading-relaxed">
          عمارات منفصلة بمقدم أعلى واستلام أقرب، وكمبوندات بمقدم أقل وتقسيط أطول.
          كل رقم تحت جاي من ملف المشروع نفسه.
        </p>
      </div>

      {counts.building > 0 && counts.compound > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Chip active={kind === 'all'} onClick={() => setKind('all')}>الكل ({visible.length})</Chip>
          <Chip active={kind === 'building'} onClick={() => setKind('building')}>عمارات ({counts.building})</Chip>
          <Chip active={kind === 'compound'} onClick={() => setKind('compound')}>كمبوندات ({counts.compound})</Chip>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-[#DCD6CA] rounded-3xl space-y-2">
          <p className="font-bold text-[#141414]">لسه مفيش مشاريع معروضة هنا</p>
          <p className="text-sm text-[#6B665C]">
            بنجهّز المشاريع تحت الإنشاء دلوقتي. كلّمنا وإحنا نقولك على المتاح حالاً.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => setOpen(p)} />)}
        </div>
      )}

      {open && <ProjectDetail p={open} whatsappNumber={whatsappNumber} onClose={() => setOpen(null)} />}
    </section>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
      active ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#4A463F] border-[#ECE8DF] hover:bg-[#FAF4E5]'
    }`}
  >
    {children}
  </button>
);

const ProjectCard: React.FC<{ p: Project; onOpen: () => void }> = ({ p, onOpen }) => {
  const plan = p.plans?.[0];
  const isBuilding = p.kind === 'building';

  return (
    <button
      onClick={onOpen}
      className="text-right bg-white border border-[#ECE8DF] rounded-2xl overflow-hidden hover:border-[#141414] transition-colors flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isBuilding ? <Building2 size={14} className="text-[#A07A26]" /> : <Landmark size={14} className="text-[#A07A26]" />}
          <span className="text-[10px] font-bold text-[#A07A26]">{isBuilding ? 'عمارة منفصلة' : 'كمبوند'}</span>
          <span className="text-[10px] font-mono bg-[#141414] text-white px-1.5 py-0.5 rounded mr-auto">{p.code}</span>
        </div>

        <h3 className="font-extrabold text-lg text-[#141414] leading-tight">{p.name}</h3>
        <p className="text-xs text-[#6B665C]">
          {p.neighborhood}{p.developer ? ` · ${p.developer}` : ''}
        </p>

        {p.headline && (
          <p className="text-xs text-[#4A463F] leading-relaxed line-clamp-2">{p.headline}</p>
        )}
      </div>

      <div className="mt-auto border-t border-[#ECE8DF] bg-[#FAF8F3] px-4 py-3 space-y-2">
        <div>
          <p className="text-[10px] text-[#6B665C]">يبدأ من</p>
          <p className="font-extrabold text-xl text-[#141414] font-mono">{f(p.startingPrice)} <span className="text-xs font-bold">ج.م</span></p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#4A463F]">
          {plan?.downPaymentPercent != null && <span>مقدم {plan.downPaymentPercent}٪</span>}
          {plan?.years != null && <span>· {plan.years} سنين</span>}
          {plan?.monthly != null && <span>· قسط {f(plan.monthly)}</span>}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {p.constructionPercent != null && (
            <span className="text-[10px] font-bold bg-white border border-[#ECE8DF] rounded-full px-2 py-0.5 flex items-center gap-1">
              <HardHat size={10} /> إنشاء {p.constructionPercent}٪
            </span>
          )}
          {p.deliveryDate && (
            <span className="text-[10px] font-bold bg-white border border-[#ECE8DF] rounded-full px-2 py-0.5 flex items-center gap-1">
              <CalendarClock size={10} /> استلام {p.deliveryDate}
            </span>
          )}
          <ChevronLeft size={14} className="text-[#A07A26] mr-auto" />
        </div>
      </div>
    </button>
  );
};

const ProjectDetail: React.FC<{ p: Project; whatsappNumber?: string; onClose: () => void }> = ({ p, whatsappNumber, onClose }) => {
  const isBuilding = p.kind === 'building';
  const specs: [string, string][] = isBuilding
    ? ([
        ['الأدوار', p.floors ? String(p.floors) : ''],
        ['شقق في الدور', p.unitsPerFloor ? String(p.unitsPerFloor) : ''],
        ['الواجهة', p.facade || ''],
        ['التشطيب', p.finishing || ''],
        ['الترخيص', p.licenseStatus || ''],
        ['أسانسير', p.hasElevator === undefined ? '' : p.hasElevator ? 'نعم' : 'لا'],
        ['جراج', p.hasGarage === undefined ? '' : p.hasGarage ? 'نعم' : 'لا'],
        ['المساحات', p.minArea && p.maxArea ? `${p.minArea} – ${p.maxArea} م²` : p.minArea ? `من ${p.minArea} م²` : ''],
        ['الوحدات المتاحة', p.availableUnits != null ? (p.availableUnits === 0 ? 'اتحجزت كلها' : String(p.availableUnits)) : ''],
      ] as [string, string][])
    : ([
        ['المطور', p.developer || ''],
        ['مشاريع مسلّمة', p.developerTrackRecord ? String(p.developerTrackRecord) : ''],
        ['مساحة المشروع', p.totalFeddan ? `${p.totalFeddan} فدان` : ''],
        ['نسبة المباني', p.builtRatioPercent != null ? `${p.builtRatioPercent}٪` : ''],
        ['المرحلة', p.phase || ''],
        ['أنواع الوحدات', p.unitTypes || ''],
        ['أقل مساحة', p.minArea ? `${p.minArea} م²` : ''],
        ['الخدمات', p.amenities || ''],
      ] as [string, string][]);

  const extras: [string, string][] = isBuilding
    ? ([
        ['خصم الكاش', p.cashDiscountPercent != null ? `${p.cashDiscountPercent}٪` : ''],
        ['سعر الكاش', p.cashPrice ? `${f(p.cashPrice)} ج.م` : ''],
      ] as [string, string][])
    : ([
        ['وديعة الصيانة', p.maintenanceFeePercent != null ? `${p.maintenanceFeePercent}٪` : ''],
        ['النادي', p.clubFee ? `${f(p.clubFee)} ج.م` : ''],
        ['الجراج', p.garageFee ? `${f(p.garageFee)} ج.م` : ''],
        ['التكلفة الفعلية', p.actualTotalCost ? `${f(p.actualTotalCost)} ج.م` : ''],
        ['زيادة عن المعلن', p.overAnnouncedPercent != null ? `${p.overAnnouncedPercent}٪` : ''],
      ] as [string, string][]);

  const msg = `مرحباً، مهتم بمشروع ${p.name} (${p.code}) في ${p.neighborhood}. ممكن تفاصيل أكتر؟`;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F3] w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 bg-[#FAF8F3] border-b border-[#ECE8DF] px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#A07A26]">{isBuilding ? 'عمارة منفصلة' : 'كمبوند'} · {p.neighborhood}</p>
            <h3 className="font-extrabold text-xl leading-tight">{p.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#ECE8DF] shrink-0 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {p.headline && (
            <p className="text-sm text-[#4A463F] bg-white border border-[#ECE8DF] rounded-2xl px-4 py-3 leading-relaxed">{p.headline}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Big label="يبدأ من" value={`${f(p.startingPrice)}`} />
            <Big label="سعر المتر" value={`${f(p.pricePerMeter)}`} />
            <Big label="نسبة الإنشاء" value={p.constructionPercent != null ? `${p.constructionPercent}٪` : '—'} />
            <Big label="الاستلام" value={p.deliveryDate || '—'} />
          </div>

          {(p.plans || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-[#A07A26]">أنظمة السداد</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(p.plans || []).map((pl, i) => (
                  <div key={i} className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
                    <p className="font-extrabold text-sm">{pl.label || `نظام ${i + 1}`}</p>
                    <Row k="المقدم" v={pl.downPaymentAmount ? `${f(pl.downPaymentAmount)} ج.م${pl.downPaymentPercent != null ? ` (${pl.downPaymentPercent}٪)` : ''}` : pl.downPaymentPercent != null ? `${pl.downPaymentPercent}٪` : '—'} />
                    <Row k="المدة" v={pl.years != null ? `${pl.years} سنين` : '—'} />
                    <Row k="القسط الشهري" v={pl.monthly ? `${f(pl.monthly)} ج.م` : '—'} />
                    {pl.quarterly ? <Row k="الربع سنوي" v={`${f(pl.quarterly)} ج.م`} /> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <SpecList title="المواصفات" items={specs} />
          <SpecList title="تكاليف إضافية" items={extras} />
        </div>

        <div className="sticky bottom-0 bg-[#FAF8F3] border-t border-[#ECE8DF] px-5 py-4">
          <a
            href={generateWhatsAppLink(whatsappNumber || '', undefined, undefined, msg)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} /> اسأل عن المشروع ده
          </a>
        </div>
      </div>
    </div>
  );
};

const Big: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-[#ECE8DF] rounded-2xl py-3 px-2 text-center">
    <p className="text-[10px] text-[#6B665C]">{label}</p>
    <p className="font-extrabold text-[#141414] font-mono text-sm mt-0.5">{value}</p>
  </div>
);

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-[#6B665C]">{k}</span>
    <span className="font-bold font-mono text-[#141414]">{v}</span>
  </div>
);

const SpecList: React.FC<{ title: string; items: [string, string][] }> = ({ title, items }) => {
  const filled = items.filter(([, v]) => v && v.trim());
  if (filled.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold text-[#A07A26]">{title}</p>
      <div className="bg-white border border-[#ECE8DF] rounded-2xl divide-y divide-[#F2EFE9]">
        {filled.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
            <span className="text-[#6B665C] shrink-0">{k}</span>
            <span className="font-bold text-[#141414] text-left">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsSection;
