import React, { useMemo, useState } from 'react';
import { Copy, Trash2, ChevronDown, ShieldCheck } from 'lucide-react';
import { Property } from '../../types';

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
  kind: 'code' | 'specs';
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

export function findDuplicates(properties: Property[]): Group[] {
  const byCode = new Map<string, Property[]>();
  const bySpecs = new Map<string, Property[]>();

  properties.forEach((p) => {
    const code = (p.code || '').trim().toUpperCase();
    if (code) {
      byCode.set(code, [...(byCode.get(code) || []), p]);
    }
    const specs = [
      (p.neighborhood || '').trim(),
      Number(p.area) || 0,
      Number(p.price) || 0,
    ].join('|');
    if ((Number(p.area) || 0) > 0 && (Number(p.price) || 0) > 0) {
      bySpecs.set(specs, [...(bySpecs.get(specs) || []), p]);
    }
  });

  const out: Group[] = [];
  const seenIds = new Set<string>();

  byCode.forEach((items, key) => {
    if (items.length < 2) return;
    items.forEach((p) => seenIds.add(p.id));
    out.push({ key, kind: 'code', items: keepFirst(items) });
  });

  bySpecs.forEach((items, key) => {
    if (items.length < 2) return;
    // لو كلهم مكشوفين بالكود خلاص، مانكررش المجموعة
    if (items.every((p) => seenIds.has(p.id))) return;
    out.push({ key, kind: 'specs', items: keepFirst(items) });
  });

  return out.sort((a, b) => b.items.length - a.items.length);
}

interface Props {
  properties: Property[];
  onDeleteProperty: (id: string) => void;
}

export const DuplicatesPanel: React.FC<Props> = ({ properties, onDeleteProperty }) => {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => findDuplicates(properties), [properties]);
  const extra = groups.reduce((n, g) => n + g.items.length - 1, 0);

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
            الأخضر = الأقدم، سيبه. الباقي امسحه. مبنمسحش أي حاجة لوحدنا —
            إنت اللي بتأكّد على كل واحدة.
          </p>

          {groups.map((g) => (
            <div key={`${g.kind}-${g.key}`} className="border border-[#ECE8DF] rounded-xl overflow-hidden">
              <div className="bg-[#F6F4EF] px-3 py-2">
                <p className="text-[11px] font-extrabold text-[#141414]">
                  {g.kind === 'code' ? `كود مكرر: ${g.key}` : 'نفس الحي والمساحة والسعر'}
                  <span className="text-[#8C877D] font-bold"> · {g.items.length} نسخ</span>
                </p>
                {g.kind === 'specs' && (
                  <p className="text-[10px] text-[#8C877D]">
                    {g.items[0].neighborhood} · {g.items[0].area} م² · {f(g.items[0].price)} ج.م — راجعها قبل المسح، ممكن تكون شقتين فعلاً
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
