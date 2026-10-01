import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark, HardHat, CalendarClock, ChevronLeft, X, MessageCircle, MapPin, Play } from 'lucide-react';
import { Project, ProjectFilter, subscribeProjects, matchProject, EMPTY_PROJECT_FILTER, affordablePlans, planMonthly, planDownAmount, fetchProjectPrivate, areaPlanNumbers, availableFromAreas } from '../services/projectService';
import { generateWhatsAppLink } from '../utils/helpers';
import { videoPosterUrl } from '../utils/propertyMedia';
import { ShareBar } from './ShareBar';
import { projectText } from '../utils/shareKit';

/*
  قسم "تحت الإنشاء" في الصفحة الرئيسية.
  بيظهر بس لما يكون فيه مشاريع غير متخبّية — زي قسم الصفقات المقفولة بالظبط.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Props {
  whatsappNumber?: string;
  filter: ProjectFilter;
  setFilter: (f: ProjectFilter) => void;
  /** في وضع "تحت الإنشاء" لازم القسم يظهر حتى لو فاضي، عشان الصفحة ما تبقاش بيضا */
  alwaysShow?: boolean;
  /* الحي والمطور واللوكيشن بيظهروا للفريق بس.
     الزائر لو شافهم يقدر يروح للمطور على طول ويعدّي علينا. */
  isStaff?: boolean;
}

export const ProjectsSection: React.FC<Props> = ({ whatsappNumber, alwaysShow, filter, setFilter, isStaff }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState<Project | null>(null);
  useEffect(() => subscribeProjects(setProjects), []);

  const visible = useMemo(() => projects.filter((p) => !p.hidden), [projects]);
  const shown = useMemo(() => visible.filter((p) => matchProject(p, filter)), [visible, filter]);

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
          <Chip active={filter.kind === 'all'} onClick={() => setFilter({ ...filter, kind: 'all' })}>الكل ({visible.length})</Chip>
          <Chip active={filter.kind === 'building'} onClick={() => setFilter({ ...filter, kind: 'building' })}>عمارات ({counts.building})</Chip>
          <Chip active={filter.kind === 'compound'} onClick={() => setFilter({ ...filter, kind: 'compound' })}>كمبوندات ({counts.compound})</Chip>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-[#DCD6CA] rounded-3xl space-y-2">
          {visible.length === 0 ? (
            <>
              <p className="font-bold text-[#141414]">لسه مفيش مشاريع معروضة هنا</p>
              <p className="text-sm text-[#6B665C]">
                بنجهّز المشاريع تحت الإنشاء دلوقتي. كلّمنا وإحنا نقولك على المتاح حالاً.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-[#141414]">مفيش مشروع بالمواصفات دي</p>
              <button onClick={() => setFilter(EMPTY_PROJECT_FILTER)} className="text-sm font-bold text-[#A07A26] cursor-pointer">شيل الفلاتر وشوف الكل</button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <ProjectCard key={p.id} p={p} filter={filter} isStaff={isStaff} onOpen={() => setOpen(p)} />)}
        </div>
      )}

      {open && <ProjectDetail p={open} whatsappNumber={whatsappNumber} isStaff={isStaff} onClose={() => setOpen(null)} />}
    </section>
  );
};

const selShell = 'bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl px-3 py-2 w-full text-sm focus:outline-none focus:border-[#141414]';

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

const ProjectCard: React.FC<{ p: Project; onOpen: () => void; filter?: ProjectFilter; isStaff?: boolean }> = ({ p, onOpen, filter, isStaff }) => {
  /* لو العميل قال مقدمه وقسطه، بنوريه النظام اللي يقدر عليه هو —
     مش أول نظام في اللستة، ده ممكن يكون خارج قدرته أصلاً. */
  const wantsAfford = !!filter && ((filter.maxMonthly && filter.maxMonthly !== 'all') || (filter.maxDownAmount && filter.maxDownAmount !== 'all'));
  const fits = wantsAfford && filter ? affordablePlans(p, filter) : [];
  const plan = (fits.length ? fits[0] : p.plans?.[0]);
  const planMonthlyVal = plan ? planMonthly(p, plan) : undefined;
  const planDownVal = plan ? planDownAmount(p, plan) : undefined;
  const isBuilding = p.kind === 'building';
  const hasVideo = Boolean((p.videoUrl || '').trim());
  // لو مفيش صور مرفوعة، بناخد لقطة من الفيديو بدل غلاف فاضي
  const cover = p.images?.[0] || videoPosterUrl(p.videoUrl);

  return (
    <button
      onClick={onOpen}
      className="text-right bg-white border border-[#ECE8DF] rounded-2xl overflow-hidden hover:border-[#141414] transition-colors flex flex-col"
    >
      {cover && (
        /* الكارت بياخد مقاس الصورة زي ما هي — مفيش قص ومفيش فراغ */
        <div className="relative w-full">
          <img src={cover} alt="" className="block w-full h-auto" />
          {hasVideo && (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              <Play size={10} fill="currentColor" /> فيديو
            </span>
          )}
          {(p.images?.length || 0) > 1 && (
            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              {p.images?.length} صور
            </span>
          )}
        </div>
      )}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isBuilding ? <Building2 size={14} className="text-[#A07A26]" /> : <Landmark size={14} className="text-[#A07A26]" />}
          <span className="text-[10px] font-bold text-[#A07A26]">{isBuilding ? 'عمارة منفصلة' : 'كمبوند'}</span>
          <span className="text-[10px] font-mono bg-[#141414] text-white px-1.5 py-0.5 rounded mr-auto">{p.code}</span>
        </div>

        <h3 className="font-extrabold text-lg text-[#141414] leading-tight">{p.name}</h3>
        <p className="text-xs text-[#6B665C]">
          {isStaff
            ? `${p.neighborhood}${p.developer ? ` · ${p.developer}` : ''}`
            : 'الهضبة الوسطى · الموقع مع المستشار'}
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
          {planMonthlyVal != null && <span>· قسط {f(Math.round(planMonthlyVal))}</span>}
        </div>

        {wantsAfford && fits.length > 0 && (
          <p className="text-[11px] font-bold text-[#1E7A45] bg-[#EEF5F0] border border-[#BFE0CC] rounded-lg px-2 py-1.5 leading-relaxed">
            في حدوده: مقدم {planDownVal != null ? f(Math.round(planDownVal)) : '—'} وقسط {planMonthlyVal != null ? f(Math.round(planMonthlyVal)) : '—'}
            {fits.length > 1 ? ` · و${fits.length - 1} نظام تاني` : ''}
          </p>
        )}

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

const ProjectDetail: React.FC<{ p: Project; whatsappNumber?: string; onClose: () => void; isStaff?: boolean }> = ({ p: base, whatsappNumber, onClose, isStaff }) => {
  /* المطور واللوكيشن مش في المستند العام — بنجيبهم لوحدهم، وللفريق بس */
  const [priv, setPriv] = useState<Partial<Project>>({});
  useEffect(() => {
    if (!isStaff) { setPriv({}); return; }
    let live = true;
    fetchProjectPrivate(base.id).then((d) => { if (live) setPriv(d); });
    return () => { live = false; };
  }, [base.id, isStaff]);
  const p = { ...base, ...priv } as Project;

  /* المساحات المتاحة واللي المستخدم مختارها */
  const available = useMemo(() => (p.unitAreas || []).filter((u) => !u.sold && u.area > 0), [p.unitAreas]);
  const firstPlan = (p.plans || [])[0];
  const [pickedArea, setPickedArea] = useState<number | null>(null);
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
        /* بيتحسب من المساحات — الرقم المكتوب بإيد حد كان بيطلع ملخبط */
        ['الوحدات المتاحة', (() => {
          const n = availableFromAreas(p);
          if (n !== undefined) return n === 0 ? 'اتحجزت كلها' : String(n);
          return p.availableUnits != null && Number.isFinite(p.availableUnits) && p.availableUnits < 10000
            ? (p.availableUnits === 0 ? 'اتحجزت كلها' : String(p.availableUnits)) : '';
        })()],
      ] as [string, string][])
    : ([
        ['المطور', isStaff ? (p.developer || '') : ''],
        ['مشاريع مسلّمة', isStaff ? (p.developerTrackRecord ? String(p.developerTrackRecord) : '') : ''],
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

  // الرسالة بتمشي بالكود بس — من غير حي، عشان اللينك لو اتشير ما يدلّش على حاجة
  const msg = `مرحباً، مهتم بمشروع كود ${p.code}. ممكن تفاصيل أكتر؟`;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F3] w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 bg-[#FAF8F3] border-b border-[#ECE8DF] px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#A07A26]">
              {isBuilding ? 'عمارة منفصلة' : 'كمبوند'} · {isStaff ? p.neighborhood : 'الهضبة الوسطى'}
            </p>
            <h3 className="font-extrabold text-xl leading-tight">{p.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#ECE8DF] shrink-0 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {(p.images || []).length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(p.images || []).map((img, i) => (
                <img key={i} src={img} alt="" className="w-56 h-40 object-cover rounded-2xl border border-[#ECE8DF] shrink-0" />
              ))}
            </div>
          )}

          {p.videoUrl && (
            <a
              href={p.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white border border-[#ECE8DF] rounded-2xl px-4 py-3 text-sm font-bold text-[#141414]"
            >
              <Play size={15} className="text-[#A07A26]" fill="currentColor" /> شوف فيديو المشروع
            </a>
          )}

          {isStaff && (p.locationUrl || p.address) && (
            <div className="bg-white border border-[#ECE8DF] rounded-2xl px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-[#A07A26] shrink-0 mt-0.5" />
                <p className="text-sm text-[#4A463F] leading-relaxed">{p.address || 'الموقع على الخريطة'}</p>
              </div>
              {p.locationUrl && (
                <a
                  href={p.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-bold text-[#141414] border border-[#DCD6CA] rounded-xl py-2"
                >
                  افتح على خرايط جوجل
                </a>
              )}
            </div>
          )}

          {p.headline && (
            <p className="text-sm text-[#4A463F] bg-white border border-[#ECE8DF] rounded-2xl px-4 py-3 leading-relaxed">{p.headline}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Big label="يبدأ من" value={`${f(p.startingPrice)}`} />
            <Big label="سعر المتر" value={`${f(p.pricePerMeter)}`} />
            <Big label="نسبة الإنشاء" value={p.constructionPercent != null ? `${p.constructionPercent}٪` : '—'} />
            <Big label="الاستلام" value={p.deliveryDate || '—'} />
          </div>

          {/* ابعته للعميل على طول */}
          <ShareBar
            text={projectText(p, { isStaff })}
            images={p.images || []}
            videoUrl={p.videoUrl}
            baseName={p.code}
            title={p.name}
          />

          {/* المساحات المتاحة الأول — تختار واحدة والحسبة تحتها بتتغيّر عليها */}
          {available.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-extrabold text-[#A07A26]">المساحات المتاحة</p>
                <span className="text-[11px] text-[#6B665C]">
                  {availableFromAreas(p)} وحدة في {available.length} مساحة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {available.map((u, i) => {
                  const on = pickedArea === i;
                  const r = firstPlan ? areaPlanNumbers(p, u, firstPlan) : {};
                  return (
                    <button
                      key={i}
                      onClick={() => setPickedArea(on ? null : i)}
                      className={`text-right rounded-2xl border-2 p-3 transition cursor-pointer ${
                        on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF] hover:border-[#A07A26]'
                      }`}
                    >
                      <p className="font-extrabold text-sm">{u.area} م²</p>
                      {u.label && (
                        <p className={`text-[11px] leading-tight ${on ? 'text-white/80' : 'text-[#6B665C]'}`}>{u.label}</p>
                      )}
                      <p className={`text-[11px] font-mono mt-1 ${on ? 'text-white' : 'text-[#141414]'}`}>{f(r.price)} ج.م</p>
                      <p className={`text-[10px] ${on ? 'text-white/70' : 'text-[#8C877D]'}`}>
                        {u.count && u.count > 1 ? `${u.count} وحدات متاحة` : 'وحدة واحدة'}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#8C877D] leading-relaxed">
                {pickedArea != null
                  ? `الأقساط تحت محسوبة على ${available[pickedArea].area} م².`
                  : 'دوس على أي مساحة والأقساط تحت هتتحسب عليها.'}
              </p>
            </div>
          )}

          {(p.plans || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-[#A07A26]">أنظمة السداد</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(p.plans || []).map((pl, i) => {
                  // لو فيه مساحة مختارة، الأرقام بتتحسب عليها هي
                  const sel = pickedArea != null ? available[pickedArea] : null;
                  const r = sel ? areaPlanNumbers(p, sel, pl) : null;
                  return (
                    <div key={i} className={`bg-white border rounded-2xl p-4 space-y-2 ${sel ? 'border-[#A07A26]' : 'border-[#ECE8DF]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-sm">{pl.label || `نظام ${i + 1}`}</p>
                        {sel && <span className="text-[10px] font-bold text-[#A07A26]">على {sel.area} م²</span>}
                      </div>
                      {sel && r ? (
                        <>
                          <Row k="سعر الوحدة" v={`${f(r.price)} ج.م`} />
                          <Row k="المقدم" v={`${f(r.down)} ج.م${pl.downPaymentPercent != null ? ` (${pl.downPaymentPercent}٪)` : ''}`} />
                          <Row k="المدة" v={pl.years != null ? `${pl.years} سنين` : '—'} />
                          <Row k="القسط الشهري" v={`${f(r.monthly)} ج.م`} />
                          {r.monthly != null ? <Row k="الربع سنوي" v={`${f(r.monthly * 3)} ج.م`} /> : null}
                        </>
                      ) : (
                        <>
                          <Row k="المقدم" v={pl.downPaymentAmount ? `${f(pl.downPaymentAmount)} ج.م${pl.downPaymentPercent != null ? ` (${pl.downPaymentPercent}٪)` : ''}` : pl.downPaymentPercent != null ? `${pl.downPaymentPercent}٪` : '—'} />
                          <Row k="المدة" v={pl.years != null ? `${pl.years} سنين` : '—'} />
                          <Row k="القسط الشهري" v={pl.monthly ? `${f(pl.monthly)} ج.م` : '—'} />
                          {pl.quarterly ? <Row k="الربع سنوي" v={`${f(pl.quarterly)} ج.م`} /> : null}
                        </>
                      )}
                    </div>
                  );
                })}
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
