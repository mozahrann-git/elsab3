import React, { useMemo, useState } from 'react';
import { Copy, Trash2, ChevronDown, ShieldCheck } from 'lucide-react';
import { Property } from '../../types';
import { bestHashDistance } from '../../services/imageFingerprint';

/*
  كشف الشقق المكررة.

  المشكلة اللي بيحلّها: نفس الشقة اتسجّلت أكتر من مرة، فالعميل كان بيشوف
  نفس الكود ٤ مرات في عرض واحد. منعنا التكرار في المطابقة، بس الأصل لسه
  في الداتا — وده بيلخبط عدد الوحدات والإحصائيات كمان.

  بنكشف التكرار بطريقتين:
   - نفس الكود بالظبط  → ده تكرار أكيد
   - نفس الحي + نفس المساحة + نفس السعر → غالباً نفس الشقة باتنين كود

  مبنمسحش حاجة لوحدنا. بنرشّح الأقدم للإبقاء (عشان التاريخ والنشاط
  المرتبط بيه) وإنت اللي بتأكّد.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Group {
  key: string;
  kind: 'code' | 'image' | 'specs';
  items: Property[];
}

/** الأقدم بيفضل — هو اللي الأنشطة والمعاينات متربطة بيه غالباً */
function keepFirst(items: Property[]): Property[] {
  return [...items].sort((a, b) => {
    const at = Number((a as any).createdAt || (a as any).addedAt || 0);
    const bt = Number((b as any).createdAt || (b as any).addedAt || 0);
    if (at && bt) return at - bt;
    return String(a.id).localeCompare(String(b.id));
  });
}

/*
  البق اللي كان هيخسّر شقق حقيقية:
  المجموعة كانت بتتعمل على "الحي + المساحة + السعر" وبس. في المقطم،
  ١٣٥م² بـ٢.٥ مليون في الحي الأول ده وصف عشرات الشقق المختلفة —
  مش دليل تكرار. وأكواد زي H1527 و H1528 و H1529 متتابعة، يعني غالباً
  شقق مختلفة في نفس العمارة. المسح كان هيضيّع ٤ من كل ٥.

  دلوقتي فيه تلات درجات، والمسح بالجملة على الأكيد منهم بس:
   code  — نفس الكود بالظبط            → تكرار أكيد
   image — نفس الصورة (رابط أو بصمة)   → دليل قوي
   specs — كل المواصفات متطابقة         → شك، للمراجعة باليد بس
*/
function sameImage(a: Property, b: Property): boolean {
  const ai = (a.images || []).filter(Boolean);
  const bi = new Set((b.images || []).filter(Boolean));
  if (ai.some((u) => bi.has(u))) return true;
  const ah = (a as any).imageHashes as string[] | undefined;
  const bh = (b as any).imageHashes as string[] | undefined;
  if (!ah?.length || !bh?.length) return false;
  return bestHashDistance(ah, bh) <= 5;
}

export function findDuplicates(properties: Property[]): Group[] {
  const byCode = new Map<string, Property[]>();
  properties.forEach((p) => {
    const code = (p.code || '').trim().toUpperCase();
    if (code) byCode.set(code, [...(byCode.get(code) || []), p]);
  });

  const out: Group[] = [];
  const seenIds = new Set<string>();

  byCode.forEach((items, key) => {
    if (items.length < 2) return;
    items.forEach((p) => seenIds.add(p.id));
    out.push({ key, kind: 'code', items: keepFirst(items) });
  });

  /* نفس الصورة — ده دليل حقيقي، مش صدفة مواصفات */
  const withImgs = properties.filter(
    (p) => !seenIds.has(p.id) && ((p.images || []).length > 0 || ((p as any).imageHashes || []).length > 0),
  );
  const usedImg = new Set<string>();
  withImgs.forEach((p) => {
    if (usedImg.has(p.id)) return;
    const group = withImgs.filter((q) => q.id === p.id || (!usedImg.has(q.id) && sameImage(p, q)));
    if (group.length < 2) return;
    group.forEach((q) => { usedImg.add(q.id); seenIds.add(q.id); });
    out.push({ key: `img-${p.id}`, kind: 'image', items: keepFirst(group) });
  });

  /* المواصفات: بنشدّد عليها جداً — الحي والمساحة والسعر والدور والغرف
     والحمامات كلهم مع بعض. وحتى كده بتفضل "للمراجعة" مش للمسح. */
  const bySpecs = new Map<string, Property[]>();
  properties.forEach((p) => {
    if (seenIds.has(p.id)) return;
    const area = Number(p.area) || 0;
    const price = Number(p.price) || 0;
    if (!area || !price) return;
    const key = [
      (p.neighborhood || '').trim(), area, price,
      String(p.floor || '').trim(), Number(p.bedrooms) || 0, Number(p.bathrooms) || 0,
    ].join('|');
    bySpecs.set(key, [...(bySpecs.get(key) || []), p]);
  });
  bySpecs.forEach((items, key) => {
    if (items.length < 2) return;
    out.push({ key, kind: 'specs', items: keepFirst(items) });
  });

  const rank = { code: 0, image: 1, specs: 2 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.items.length - a.items.length);
}

interface Props {
  properties: Property[];
  onDeleteProperty: (id: string) => void;
}

/** النسخ الزيادة اللي المفروض تتمسح — الأقدم في كل مجموعة بيفضل */
export function extraCopies(groups: Group[], kind?: 'code' | 'image'): Property[] {
  const seen = new Set<string>();
  const out: Property[] = [];
  groups.filter((g) => !kind || g.kind === kind).forEach((g) => {
    g.items.slice(1).forEach((p) => {
      if (seen.has(p.id)) return;     // شقة ممكن تكون في مجموعتين — مبنعدّهاش مرتين
      seen.add(p.id);
      out.push(p);
    });
  });
  return out;
}

export const DuplicatesPanel: React.FC<Props> = ({ properties, onDeleteProperty }) => {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => findDuplicates(properties), [properties]);
  const extra = groups.reduce((n, g) => n + g.items.length - 1, 0);

  /* المسح بالجملة. ١٥٥ شقة واحدة واحدة مش شغل بني آدم.
     بيتعمل على خطوتين: ضغطة بتسلّح الزرار وضغطة بتنفّذ، وبينهم تأكيد.
     بنمسح بالراحة (٤٠ مللي بين كل واحدة) عشان الشاشة متقفش والسيرفر ميزعلش. */
  const [armed, setArmed] = useState<'code' | 'all' | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  const codeOnly = useMemo(() => extraCopies(groups, 'code'), [groups]);
  /* "الكل" = الأكيد بس: نفس الكود أو نفس الصورة.
     مجموعات المواصفات مش داخلة في أي مسح بالجملة — دي للمراجعة باليد،
     لأن تطابق المواصفات مش دليل على إن الشقتين واحدة. */
  const allExtra = useMemo(
    () => [...extraCopies(groups, 'code'), ...extraCopies(groups, 'image')],
    [groups],
  );
  const specsGroups = useMemo(() => groups.filter((g) => g.kind === 'specs'), [groups]);

  const runDelete = async (list: Property[], label: string) => {
    if (!list.length) return;
    if (!window.confirm(`هتمسح ${list.length} شقة — ${label}.\n\nالنسخة الأقدم في كل مجموعة هتفضل موجودة.\nده مش بيترجع.\n\nنكمّل؟`)) {
      setArmed(null);
      return;
    }
    setArmed(null);
    setBusy({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      onDeleteProperty(list[i].id);
      setBusy({ done: i + 1, total: list.length });
      await new Promise((r) => setTimeout(r, 40));
    }
    setBusy(null);
  };

  if (groups.length === 0) {
    return (
      <div className="bg-[#EEF5F0] border border-[#BFE0CC] rounded-2xl px-4 py-3 flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#1E7A45] shrink-0" />
        <p className="text-xs font-bold text-[#1E7A45]">مفيش شقق مكررة — الداتا نضيفة.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EBD9A6] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-[#FFF8E6] px-4 py-3 flex items-center justify-between gap-2 text-right cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Copy size={16} className="text-[#7A5E12] shrink-0" />
          <span className="min-w-0">
            <span className="block font-extrabold text-sm text-[#7A5E12]">
              {groups.length} مجموعة مكررة · {extra} شقة زيادة
            </span>
            <span className="block text-[11px] text-[#7A5E12]/80">
              نفس الشقة متسجّلة أكتر من مرة — بتظهر للعميل مكررة وبتلخبط العدد
            </span>
          </span>
        </span>
        <ChevronDown size={16} className={`text-[#7A5E12] shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-[#6B665C] leading-relaxed bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2">
            الأخضر = الأقدم، بيفضل. الباقي نسخ زيادة.
            <br />
            <b>نفس الكود</b> أو <b>نفس الصورة</b> = تكرار أكيد. <b>مواصفات متطابقة</b> = شك بس، مش بيتمسح بالجملة.
          </p>

          {/* ---- المسح بالجملة ---- */}
          {busy ? (
            <div className="bg-[#FFF8E6] border border-[#EBD9A6] rounded-xl px-3 py-3 space-y-2">
              <p className="text-xs font-extrabold text-[#7A5E12]">بيمسح {busy.done} من {busy.total}... سيب الشاشة مفتوحة</p>
              <div className="h-2 rounded-full bg-[#EBD9A6] overflow-hidden">
                <div className="h-full bg-[#7A5E12] transition-all" style={{ width: `${Math.round((busy.done / busy.total) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* الأكواد المكررة: تكرار أكيد، مفيش فيه اجتهاد */}
              {codeOnly.length > 0 && (
                <button
                  onClick={() => (armed === 'code' ? runDelete(codeOnly, 'كلها أكواد مكررة') : (setArmed('code')))}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border ${
                    armed === 'code'
                      ? 'bg-[#C2412D] text-white border-[#C2412D]'
                      : 'bg-[#FBEDEA] text-[#C2412D] border-[#E9B8AE]'
                  }`}
                >
                  <Trash2 size={12} />
                  {armed === 'code'
                    ? `متأكد؟ دوس تاني عشان تمسح ${codeOnly.length} شقة`
                    : `امسح كل الأكواد المكررة (${codeOnly.length} شقة)`}
                </button>
              )}

              {/* الكل: جواه مجموعات متشابهة في المواصفات — ممكن تكون شقتين حقيقيين */}
              {allExtra.length > codeOnly.length && (
                <>
                  <button
                    onClick={() => (armed === 'all' ? runDelete(allExtra, 'أكواد مكررة + شقق بنفس الصورة') : setArmed('all'))}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border ${
                      armed === 'all'
                        ? 'bg-[#C2412D] text-white border-[#C2412D]'
                        : 'bg-white text-[#C2412D] border-[#E9B8AE]'
                    }`}
                  >
                    <Trash2 size={12} />
                    {armed === 'all'
                      ? `متأكد؟ دوس تاني عشان تمسح ${allExtra.length} شقة`
                      : `امسح الكل (${allExtra.length} شقة)`}
                  </button>
                  <p className="text-[10px] text-[#6B665C] leading-5 px-1">
                    "امسح الكل" = الأكواد المكررة + الشقق اللي بنفس الصورة. الاتنين دليل حقيقي.
                    مجموعات المواصفات مش داخلة في أي مسح بالجملة.
                  </p>
                </>
              )}

              {armed && (
                <button onClick={() => setArmed(null)} className="w-full text-[11px] font-bold text-[#6B665C] py-1 cursor-pointer">
                  إلغاء
                </button>
              )}
            </div>
          )}

          {groups.map((g) => (
            <div key={`${g.kind}-${g.key}`} className="border border-[#ECE8DF] rounded-xl overflow-hidden">
              <div className="bg-[#F6F4EF] px-3 py-2">
                <p className="text-[11px] font-extrabold text-[#141414]">
                  {g.kind === 'code' ? `كود مكرر: ${g.key}`
                    : g.kind === 'image' ? 'نفس الصورة'
                    : 'مواصفات متطابقة — للمراجعة بس'}
                  <span className="text-[#8C877D] font-bold"> · {g.items.length} نسخ</span>
                </p>
                {g.kind === 'specs' && (
                  <p className="text-[10px] text-[#8C877D] leading-5">
                    {g.items[0].neighborhood} · {g.items[0].area} م² · {f(g.items[0].price)} ج.م · {g.items[0].floor || '—'} · {g.items[0].bedrooms} غرف
                    <br />
                    <b className="text-[#6E5418]">دي مش دليل تكرار.</b> شقتين في نفس العمارة بنفس المساحة والسعر حاجة عادية —
                    خصوصاً لو الأكواد متتابعة. افتحها وشوف بنفسك قبل أي مسح.
                  </p>
                )}
              </div>

              <div className="divide-y divide-[#F0ECE4]">
                {g.items.map((p, i) => (
                  <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#141414]">
                        <span className="font-mono">{p.code || '—'}</span>
                        {' · '}{p.neighborhood || '—'}
                        {' · '}{p.area} م²
                        {' · '}{f(p.price)} ج.م
                      </p>
                      <p className="text-[10px] text-[#8C877D] font-mono break-all">{p.id}</p>
                    </div>

                    {i === 0 ? (
                      <span className="text-[10px] font-extrabold bg-[#EEF5F0] text-[#1E7A45] border border-[#BFE0CC] px-2.5 py-1 rounded-lg shrink-0">
                        سيبه ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm(`تمسح النسخة دي؟\n${p.code} · ${p.neighborhood} · ${p.area}م²\n\nالنسخة الأقدم هتفضل موجودة.`)) {
                            onDeleteProperty(p.id);
                          }
                        }}
                        className="text-[10px] font-extrabold bg-[#FBEDEA] text-[#C2412D] border border-[#E9B8AE] px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} /> امسح النسخة دي
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DuplicatesPanel;
