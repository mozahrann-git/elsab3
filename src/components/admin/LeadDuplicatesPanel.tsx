import React, { useMemo, useState } from 'react';
import { Users, ChevronDown, Crown, AlertTriangle } from 'lucide-react';
import { Lead } from '../../types';

/*
  الأرقام المكررة بين السيلز.

  المشكلة: الفريق بدأ يضيف عملاء بالجملة، ونفس الرقم بقى عند أكتر من واحدة.
  النتيجة إن العميل بيترن عليه مرتين وتلاتة من نفس الشركة، وده بيحرق الرقم
  ويخلي الشركة شكلها وحش. وكمان العدّادات بتكدب: ١٠٠ عميل عند ماهي و٣٨ عند
  مريم مش معناها ١٣٨ عميل.

  القاعدة: اللي ضاف الرقم الأول هو صاحبه. مبنمسحش حاجة لوحدنا —
  بنوّري الصورة وإنت اللي تقرر.

  الرقم بيتقارن بآخر ١٠ أرقام عشان 010، +2010، و0020 كلهم يبقوا واحد.
*/

export const normKey = (p?: string): string => String(p || '').replace(/\D/g, '').slice(-10);

/** وقت الإضافة بالملي ثانية. createdAt نص ISO، ولو ناقص بنرجع للرقم اللي جوه الـ id */
export function addedAtMs(l: Lead): number {
  const t = Date.parse(String(l.createdAt || ''));
  if (isFinite(t) && t > 0) return t;
  const m = /(\d{13})/.exec(String(l.id || ''));
  return m ? Number(m[1]) : 0;
}

export interface DupGroup {
  phone: string;              // الرقم زي ما اتكتب في أقدم نسخة
  key: string;                // آخر ١٠ أرقام
  items: Lead[];              // مرتبين من الأقدم للأحدث
  owners: string[];           // أسماء السيلز اللي الرقم عندهم
  crossAgent: boolean;        // التكرار بين ناس مختلفة (الحالة المهمة)
}

export function findLeadDuplicates(leads: Lead[]): DupGroup[] {
  const by = new Map<string, Lead[]>();
  leads.forEach((l) => {
    const k = normKey(l.phone);
    if (k.length < 8) return;            // رقم ناقص — مش تكرار، ده غلط إدخال
    by.set(k, [...(by.get(k) || []), l]);
  });

  const out: DupGroup[] = [];
  by.forEach((items, key) => {
    if (items.length < 2) return;
    const sorted = [...items].sort((a, b) => addedAtMs(a) - addedAtMs(b));
    const owners = Array.from(new Set(sorted.map((l) => l.assignedAgentName || '—')));
    out.push({ key, phone: sorted[0].phone, items: sorted, owners, crossAgent: owners.length > 1 });
  });

  /* الأهم الأول: التكرار بين ناس مختلفة، وبعدين الأكتر نسخ */
  return out.sort((a, b) =>
    Number(b.crossAgent) - Number(a.crossAgent) || b.items.length - a.items.length);
}

/** ملخص لكل سيلز: كام رقم مكرر عنده، وكام مرة كان هو الأول */
export function perAgentSummary(groups: DupGroup[]) {
  const by: Record<string, { involved: number; first: number; later: number; idle: number }> = {};
  groups.filter((g) => g.crossAgent).forEach((g) => {
    const firstName = g.items[0].assignedAgentName || '—';
    const seen = new Set<string>();
    g.items.forEach((l) => {
      const n = l.assignedAgentName || '—';
      const r = by[n] || { involved: 0, first: 0, later: 0, idle: 0 };
      if (!seen.has(n)) {
        seen.add(n);
        r.involved += 1;
        if (n === firstName) r.first += 1; else r.later += 1;
      }
      /* نسخة من غير أي أكشن = الرقم محجوز في الشيت ومحدش بيكلّمه */
      if (motionOf(l).actions === 0) r.idle += 1;
      by[n] = r;
    });
  });
  return Object.entries(by).sort((a, b) => b[1].later - a[1].later || b[1].involved - a[1].involved);
}

const when = (l: Lead): string => {
  const t = addedAtMs(l);
  if (!t) return 'وقت غير معروف';
  return new Date(t).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const STAGE: Record<string, string> = {
  new: 'جديد', contacted: 'تم الاتصال', sent_details: 'اتبعت تفاصيل',
  visit_requested: 'معاينة مطلوبة', visit_booked: 'معاينة مؤكدة', visit_done: 'اتعاينت',
  negotiation: 'تفاوض', closed: 'اتقفلت', lost: 'ضايع',
};

const ago = (t: number): string => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${h} ساعة`;
  return `من ${Math.floor(h / 24)} يوم`;
};

/* حركة كل نسخة: ده اللي بيفرّق بين واحدة شغّالة على الرقم فعلاً
   وواحدة حاجزاه في الشيت وخلاص. */
export interface Motion { actions: number; lastOutcome: string; lastAt: number; stage: string }
export function motionOf(l: Lead): Motion {
  const acts = Array.isArray(l.activity) ? l.activity : [];
  const last = acts.length ? acts.reduce((a, b) => ((b?.at || 0) > (a?.at || 0) ? b : a)) : null;
  return {
    actions: acts.length,
    lastOutcome: String(last?.outcome || '').trim(),
    lastAt: Number(last?.at || 0),
    stage: STAGE[String(l.status)] || String(l.status || ''),
  };
}

/* مين بيشتغل على الرقم فعلاً: صاحب أكتر أكشنز. لو الكل صفر، مفيش حد. */
export function activeOne(items: Lead[]): { lead: Lead; m: Motion } | null {
  const scored = items.map((l) => ({ lead: l, m: motionOf(l) })).filter((x) => x.m.actions > 0);
  if (!scored.length) return null;
  return scored.reduce((a, b) => (b.m.actions > a.m.actions || (b.m.actions === a.m.actions && b.m.lastAt > a.m.lastAt) ? b : a));
}

export const LeadDuplicatesPanel: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const groups = useMemo(() => findLeadDuplicates(leads), [leads]);
  const agents = useMemo(() => perAgentSummary(groups), [groups]);
  const [open, setOpen] = useState(false);
  const [onlyCross, setOnlyCross] = useState(true);

  const cross = groups.filter((g) => g.crossAgent);
  const shown = onlyCross ? cross : groups;
  const wasted = groups.reduce((s, g) => s + g.items.length - 1, 0);

  if (!groups.length) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 p-4 text-sm font-bold text-emerald-700">
        مفيش رقم مكرر في الداتا — كله نضيف.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-rose-200 overflow-hidden">
      <button onClick={() => setOpen((x) => !x)} className="w-full p-4 flex items-center justify-between gap-3 text-right cursor-pointer">
        <span className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-black text-stone-900">
              {cross.length} رقم عند أكتر من سيلز
            </span>
            <span className="block text-xs text-stone-500 mt-0.5">
              إجمالي {groups.length} رقم مكرر · {wasted} كارت زيادة بيكبّر العدّادات من غير عملاء حقيقيين
            </span>
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-stone-100 p-4 space-y-5">
          {/* مين بيكرر على مين */}
          {agents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-stone-900 flex items-center gap-1.5"><Users size={14} />الخلاصة لكل سيلز</p>
              <p className="text-[11px] text-stone-500 leading-5">
                "جه بعدها" = الرقم كان متسجّل قبلها عند حد تاني · "من غير أي أكشن" = حاجزة الرقم ومكلّمتوش.
                الشاشة دي بتشوفها الإدارة بس — مفيش أي تنبيه بيروح للسيلز.
              </p>
              {agents.map(([name, r]) => (
                <div key={name} className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
                  <span className="text-sm font-bold text-stone-900">{name}</span>
                  <span className="text-xs text-stone-600">
                    داخلة في {r.involved} رقم · كانت الأولى في <b className="text-emerald-700">{r.first}</b>
                    {r.later > 0 && <> · جه بعدها في <b className="text-rose-700">{r.later}</b></>}
                    {r.idle > 0 && <> · <b className="text-rose-700">{r.idle}</b> من غير أي أكشن</>}
                  </span>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <input type="checkbox" checked={onlyCross} onChange={(e) => setOnlyCross(e.target.checked)} />
            وريني بس اللي بين سيلز مختلفين ({cross.length} من {groups.length})
          </label>

          {/* الأرقام واحد واحد */}
          <div className="space-y-2.5">
            {shown.slice(0, 120).map((g) => (
              <div key={g.key} className="rounded-2xl border border-stone-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-stone-900" dir="ltr">{g.phone}</span>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${g.crossAgent ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'}`}>
                    {g.items.length} نسخة · {g.crossAgent ? `${g.owners.length} سيلز` : 'نفس السيلز'}
                  </span>
                </div>
                {/* الحكم: مين بيتحرك على الرقم فعلاً */}
                {(() => {
                  const act = activeOne(g.items);
                  const first = g.items[0].assignedAgentName || '—';
                  if (!act) return <p className="text-[11px] font-bold text-stone-500 bg-stone-50 rounded-xl p-2">محدش عمل أي أكشن على الرقم ده لحد دلوقتي.</p>;
                  const same = (act.lead.assignedAgentName || '—') === first;
                  return (
                    <p className={`text-[11px] font-bold rounded-xl p-2 leading-5 ${same ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                      الشغّالة عليه فعلاً: <b>{act.lead.assignedAgentName || '—'}</b> ({act.m.actions} أكشن)
                      {same ? ' — وهي نفسها اللي ضافته الأول.' : ` — بس اللي ضافه الأول ${first}.`}
                    </p>
                  );
                })()}
                {g.items.map((l, i) => {
                  const m = motionOf(l);
                  return (
                    <div key={l.id} className="flex items-start justify-between gap-2 text-xs border-t border-stone-100 pt-2">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-bold text-stone-900">
                          {i === 0 && <Crown size={12} className="text-amber-500 shrink-0" />}
                          {l.assignedAgentName || '—'}
                          {i === 0 && <span className="text-[10px] font-bold text-emerald-700">(ضافه الأول)</span>}
                        </span>
                        <span className="block text-stone-500 mt-0.5">
                          {l.name || 'من غير اسم'} · اتضاف {when(l)}
                          {l.addedByName && l.addedByName !== l.assignedAgentName ? ` · دخل عن طريق ${l.addedByName}` : ''}
                        </span>
                        {/* الحركة — ده اللي بيبيّن مين شغّال ومين حاجز */}
                        <span className={`block mt-1 font-bold ${m.actions ? 'text-stone-700' : 'text-rose-600'}`}>
                          {m.actions
                            ? `${m.actions} أكشن · آخر حاجة: ${m.lastOutcome || '—'}${m.lastAt ? ` ${ago(m.lastAt)}` : ''}`
                            : 'صفر أكشن — محصلش أي تحرك'}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-stone-500 bg-stone-100 rounded-full px-2 py-1 shrink-0">{m.stage}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {shown.length > 120 && <p className="text-xs text-stone-400">وفيه {shown.length - 120} كمان مش بينين هنا.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
