import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { FilterState, Property } from '../types';
import { BudgetRange } from './common/WhenPicker';

/*
  فلتر عائم: بيظهر أول ما الزائر يوصل للشقق وهو بيسكرول.
  كود الشقة، الحي، التشطيب، الغرف، الميزانية، والعدد بيتحدث وهو بيختار.
*/
const CEIL = 8000000;

interface Props {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  properties: Property[];
  neighborhoods: string[];
  resultCount: number;
  anchorId?: string;
}

const match = (p: Property, d: FilterState) => {
  if (p.category === 'off_plan') return false;
  const q = d.search.trim().toLowerCase();
  if (q && !(`${p.code} ${p.title} ${p.neighborhood}`.toLowerCase().includes(q))) return false;
  if (d.neighborhood !== 'all' && p.neighborhood !== d.neighborhood) return false;
  if (d.finishing !== 'all' && p.finishing !== d.finishing) return false;
  if (d.bedrooms === '2' && p.bedrooms !== 2) return false;
  if (d.bedrooms === '3' && p.bedrooms !== 3) return false;
  if (d.bedrooms === '4+' && (p.bedrooms || 0) < 4) return false;
  if (d.minPrice > 0 && p.price < d.minPrice) return false;
  if (d.maxPrice < CEIL && p.price > d.maxPrice) return false;
  return true;
};

export const SmartFilterDock: React.FC<Props> = ({ filter, setFilter, properties, neighborhoods, resultCount, anchorId = 'properties-grid' }) => {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<FilterState>(filter);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setShow(e.isIntersecting), { rootMargin: '-120px 0px -40% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId]);
  useEffect(() => { if (open) setD({ ...filter, budgetRange: 'all' }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = useMemo(() => properties.filter((p) => match(p, d)).length, [properties, d]);
  const active = [filter.search && 'كود', filter.neighborhood !== 'all' && filter.neighborhood, filter.finishing !== 'all' && (filter.finishing === 'finished' ? 'متشطب' : 'نص تشطيب'), filter.bedrooms !== 'all' && `${filter.bedrooms} غرف`, (filter.minPrice > 0 || filter.maxPrice < CEIL) && 'ميزانية'].filter(Boolean) as string[];

  const apply = () => {
    setFilter({ ...d, category: d.category === 'off_plan' ? 'all' : d.category, budgetRange: 'all' });
    setOpen(false);
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
  };
  const chip = (on: boolean) => `px-3.5 py-2 rounded-full text-sm font-semibold border transition ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-40 left-1/2 -translate-x-1/2 bottom-5 sm:bottom-8 flex items-center gap-2.5 pl-2 pr-5 py-2 rounded-full bg-[#141414] text-white shadow-2xl transition-all duration-300 ${show && !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="فلترة الشقق"
      >
        <SlidersHorizontal size={17} className="text-[#D9B864]" />
        <span className="text-sm font-bold">{active.length ? active.slice(0, 2).join(' · ') : 'فلتر'}</span>
        <span className="min-w-8 h-8 px-2 rounded-full bg-[#A07A26] text-sm font-bold flex items-center justify-center">{resultCount}</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center" dir="rtl">
          <button aria-label="إغلاق" className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
          <section className="relative w-full sm:max-w-lg max-h-[90dvh] bg-[#F6F4EF] rounded-t-3xl sm:rounded-3xl flex flex-col" role="dialog" aria-modal="true" aria-label="فلترة الشقق">
            <div className="flex justify-center pt-2.5 sm:hidden"><span className="w-11 h-1 rounded-full bg-[#CFC7B8]" /></div>
            <header className="flex justify-between items-center px-5 py-3">
              <p className="text-lg font-bold font-readex">دوّر على شقتك</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setD({ ...d, search: '', neighborhood: 'all', finishing: 'all', bedrooms: 'all', minPrice: 0, maxPrice: CEIL })} className="text-sm font-semibold text-[#A07A26]">مسح الكل</button>
                <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2"><X size={18} /></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
              <div className="relative">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C877D]" />
                <input value={d.search} onChange={(e) => setD({ ...d, search: e.target.value })} placeholder="كود الشقة (H1128) أو كلمة" className="w-full rounded-xl bg-white border border-[#E4DFD4] py-3 pr-10 pl-3 text-sm" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">الحي</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setD({ ...d, neighborhood: 'all' })} className={chip(d.neighborhood === 'all')}>كل الأحياء</button>
                  {neighborhoods.map((n) => <button key={n} onClick={() => setD({ ...d, neighborhood: n })} className={chip(d.neighborhood === n)}>{n}</button>)}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">التشطيب</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['all', 'الكل'], ['finished', 'متشطب'], ['semi_finished', 'نص تشطيب']] as const).map(([k, t]) => <button key={k} onClick={() => setD({ ...d, finishing: k })} className={chip(d.finishing === k)}>{t}</button>)}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">الغرف</p>
                <div className="grid grid-cols-4 gap-2">
                  {([['all', 'الكل'], ['2', '2'], ['3', '3'], ['4+', '4+']] as const).map(([k, t]) => <button key={k} onClick={() => setD({ ...d, bedrooms: k })} className={chip(d.bedrooms === k)}>{t}</button>)}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">الميزانية</p>
                <BudgetRange min={Math.max(1000000, d.minPrice || 1000000)} max={Math.min(CEIL, d.maxPrice || CEIL)} floor={1000000} ceil={CEIL} onChange={(mn, mx) => setD({ ...d, minPrice: mn <= 1000000 ? 0 : mn, maxPrice: mx })} />
                {d.maxPrice >= CEIL && <p className="text-[11px] text-[#8C877D]">الحد الأقصى مفتوح</p>}
              </div>
            </div>
            <div className="p-4 border-t border-[#E4DFD4]" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button onClick={apply} disabled={!count} className="w-full py-4 rounded-2xl bg-[#141414] text-white text-base font-bold disabled:opacity-40">{count ? `اعرض ${count} شقة` : 'مفيش شقق بالمواصفات دي'}</button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
};
