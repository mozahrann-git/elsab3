import React, { useMemo, useState } from 'react';

/*
  اختيار اليوم والساعة من غير كتابة: كل الناس بتختار نفس القيمة، والسيستم بيعرف الوقت بالظبط.
  بيرجّع { at: وقت بالمللي ثانية, label: "غداً الأحد 3:00 م" }
*/
export interface WhenValue { at: number; label: string }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const timeLabel = (h: number, m: number) => {
  const p = h < 12 ? 'ص' : 'م';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${p}`;
};

/** "النهارده 3:00 م" / "غداً الأحد 3:00 م" / "الخميس 12 سبتمبر 3:00 م" */
export function formatWhen(at?: number): string {
  if (!at) return '';
  const d = new Date(at);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const t = timeLabel(d.getHours(), d.getMinutes());
  if (diff === 0) return `النهارده ${t}`;
  if (diff === 1) return `غداً ${DAYS[d.getDay()]} ${t}`;
  if (diff === -1) return `امبارح ${t}`;
  if (diff > 1 && diff < 7) return `${DAYS[d.getDay()]} ${t}`;
  return `${DAYS[d.getDay()]} ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} ${t}`;
}

/** فاضل قد إيه / فات قد إيه */
export function relTime(at?: number): string {
  if (!at) return '';
  const m = Math.round((at - Date.now()) / 60000);
  const a = Math.abs(m);
  const s = a < 60 ? `${a} د` : a < 1440 ? `${Math.round(a / 60)} س` : `${Math.round(a / 1440)} يوم`;
  return m >= 0 ? `بعد ${s}` : `متأخر ${s}`;
}

const SLOTS: [number, number][] = [];
for (let h = 9; h <= 23; h++) { SLOTS.push([h, 0]); if (h < 23) SLOTS.push([h, 30]); }

interface Props {
  value?: WhenValue | null;
  onChange: (v: WhenValue) => void;
  quick?: boolean;          // أزرار "بعد ساعة" و"بعد 3 ساعات"
  label?: string;
  compact?: boolean;
}

export const WhenPicker: React.FC<Props> = ({ value, onChange, quick = true, label, compact }) => {
  const base = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const init = value?.at ? new Date(value.at) : null;
  const [dayOffset, setDayOffset] = useState<number>(() => (init ? Math.round((new Date(init).setHours(0, 0, 0, 0) - base.getTime()) / 86400000) : 0));
  const [slot, setSlot] = useState<string>(() => (init ? `${init.getHours()}:${init.getMinutes() >= 30 ? 30 : 0}` : ''));

  const emit = (off: number, s: string) => {
    if (!s) return;
    const [h, m] = s.split(':').map(Number);
    const d = new Date(base); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0);
    onChange({ at: d.getTime(), label: formatWhen(d.getTime()) });
  };
  const rel = (mins: number) => { const at = Date.now() + mins * 60000; onChange({ at, label: formatWhen(at) }); };

  const dayBtns = [0, 1, 2].map((o) => {
    const d = new Date(base); d.setDate(d.getDate() + o);
    return { o, t: o === 0 ? 'النهارده' : o === 1 ? 'غداً' : DAYS[d.getDay()] };
  });
  const chip = (on: boolean) => `px-3 py-2 rounded-xl text-sm font-semibold border ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4] text-[#141414]'}`;
  const now = new Date();

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-bold text-[#141414]">{label}</p>}
      {quick && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => rel(60)} className={chip(false)}>بعد ساعة</button>
          <button type="button" onClick={() => rel(180)} className={chip(false)}>بعد 3 ساعات</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {dayBtns.map((d) => <button type="button" key={d.o} onClick={() => { setDayOffset(d.o); emit(d.o, slot); }} className={chip(dayOffset === d.o)}>{d.t}</button>)}
        <input type="date" aria-label="تاريخ تاني" className={`${chip(dayOffset > 2)} ${compact ? 'w-36' : ''}`}
          min={new Date(base).toISOString().slice(0, 10)}
          onChange={(e) => { if (!e.target.value) return; const d = new Date(e.target.value + 'T00:00:00'); const off = Math.round((d.getTime() - base.getTime()) / 86400000); setDayOffset(off); emit(off, slot); }} />
      </div>
      <ClockDial slot={slot} onPick={(v) => { setSlot(v); emit(dayOffset, v); }} />
      {value?.at ? <p className="text-sm font-bold text-[#1E7A45]">✓ {formatWhen(value.at)} · {relTime(value.at)}</p> : null}
    </div>
  );
};

/** شريط ميزانية بطرفين (من / إلى) */
export const BudgetRange: React.FC<{ min: number; max: number; onChange: (min: number, max: number) => void; floor?: number; ceil?: number; step?: number }> = ({ min, max, onChange, floor = 1000000, ceil = 10000000, step = 50000 }) => {
  const f = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 ? 2 : 0).replace(/\.?0+$/, '')} مليون` : `${Math.round(n / 1000)} ألف`);
  const pct = (n: number) => ((n - floor) / (ceil - floor)) * 100;
  return (
    <div className="space-y-2" dir="ltr">
      <div className="flex justify-between items-center text-sm font-bold text-[#141414]" dir="rtl">
        <span>من {f(min)}</span>
        <span className="text-[11px] font-normal text-[#8C877D]">الفرق {f(Math.max(0, max - min))}</span>
        <span>لحد {f(max)}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute top-2 inset-x-0 flex justify-between px-0.5">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className="w-px h-2 bg-[#DCD6CA]" />)}
        </div>
        <div className="absolute top-3.5 inset-x-0 h-1.5 rounded-full bg-[#E4DFD4]" />
        <div className="absolute top-3.5 h-1.5 rounded-full bg-[#A07A26]" style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }} />
        <input type="range" aria-label="أقل ميزانية" min={floor} max={ceil} step={step} value={min} onChange={(e) => onChange(Math.min(Number(e.target.value), max - step), max)} className="dual-range absolute inset-0 w-full" />
        <input type="range" aria-label="أقصى ميزانية" min={floor} max={ceil} step={step} value={max} onChange={(e) => onChange(min, Math.max(Number(e.target.value), min + step))} className="dual-range absolute inset-0 w-full" />
      </div>
      <div className="flex justify-between text-[10px] text-[#8C877D]" dir="rtl"><span>{f(floor)}</span><span>{f((floor + ceil) / 2)}</span><span>{f(ceil)}+</span></div>
      <style>{`.dual-range{-webkit-appearance:none;appearance:none;background:transparent;pointer-events:none;height:32px;margin:0}
.dual-range::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:auto;width:24px;height:24px;border-radius:99px;background:#141414;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}
.dual-range::-moz-range-thumb{pointer-events:auto;width:22px;height:22px;border-radius:99px;background:#141414;border:3px solid #fff;cursor:pointer}`}</style>
    </div>
  );
};

/* ساعة بعقارب: تختار الساعة من الدائرة، وص/م، والدقايق */
const ClockDial: React.FC<{ slot: string; onPick: (s: string) => void }> = ({ slot, onPick }) => {
  const [h0, m0] = slot ? slot.split(':').map(Number) : [NaN, 0];
  const [pm, setPm] = useState<boolean>(isNaN(h0) ? new Date().getHours() >= 12 : h0 >= 12);
  const [min, setMin] = useState<number>(m0 || 0);
  const hour12 = isNaN(h0) ? null : h0 % 12 === 0 ? 12 : h0 % 12;
  const pick = (h12: number, isPm = pm, mm = min) => onPick(`${(h12 % 12) + (isPm ? 12 : 0)}:${mm}`);
  const R = 88, C = 110;
  const ang = hour12 ? ((hour12 % 12) / 12) * 2 * Math.PI - Math.PI / 2 : 0;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-[#E4DFD4] p-3">
      <svg viewBox="0 0 220 220" className="w-52 h-52 select-none" role="group" aria-label="اختار الساعة">
        <circle cx={C} cy={C} r={104} fill="#F6F4EF" />
        {hour12 && <line x1={C} y1={C} x2={C + (R - 16) * Math.cos(ang)} y2={C + (R - 16) * Math.sin(ang)} stroke="#A07A26" strokeWidth={3} strokeLinecap="round" />}
        <circle cx={C} cy={C} r={5} fill="#141414" />
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const a = (h / 12) * 2 * Math.PI - Math.PI / 2;
          const x = C + R * Math.cos(a), y = C + R * Math.sin(a);
          const on = hour12 === h;
          return (
            <g key={h} onClick={() => pick(h)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={17} fill={on ? '#141414' : 'transparent'} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight={700} fill={on ? '#fff' : '#141414'}>{h}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-2 w-full">
        {[false, true].map((v) => (
          <button key={String(v)} type="button" onClick={() => { setPm(v); if (hour12) pick(hour12, v); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border ${pm === v ? 'bg-[#141414] text-white border-[#141414]' : 'border-[#E4DFD4]'}`}>{v ? 'مساءً' : 'صباحاً'}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 w-full" dir="ltr">
        {[0, 15, 30, 45].map((mm) => (
          <button key={mm} type="button" onClick={() => { setMin(mm); if (hour12) pick(hour12, pm, mm); }}
            className={`py-2 rounded-xl text-sm font-bold border ${min === mm ? 'bg-[#A07A26] text-white border-[#A07A26]' : 'border-[#E4DFD4]'}`}>:{String(mm).padStart(2, '0')}</button>
        ))}
      </div>
    </div>
  );
};
