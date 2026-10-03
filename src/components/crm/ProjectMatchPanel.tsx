import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark } from 'lucide-react';
import { Lead } from '../../types';
import {
  Project, subscribeProjects, matchProject, affordablePlans,
  planDownAmount, planMonthly, areaPlanNumbers,
} from '../../services/projectService';
import { readBrief, briefToProjectFilter } from '../../services/clientBrief';

/*
  المشاريع اللي العميل يقدر عليها بالتقسيط.

  الريسيل كاش — المالك بياخد فلوسه كلها عند العقد. فالعميل اللي بيدوّر
  مقدم وقسط، شقق الريسيل بالنسباله مش موجودة أصلاً، واللي ليه هو
  العمارات تحت الإنشاء والكمبوندات لأن المطوّر هو اللي بيقسّط.

  الفلتر هنا بيشتغل بنفس أرقام المكالمة — المقدم اللي معاه والقسط اللي
  يقدر عليه — مش بالميزانية، لأن الميزانية في التقسيط مالهاش معنى.
*/

const f = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

interface Props {
  lead: Lead;
}

export const ProjectMatchPanel: React.FC<Props> = ({ lead }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => subscribeProjects(setProjects), []);

  const b = readBrief(lead);
  const filter = useMemo(() => briefToProjectFilter(lead), [lead]);

  const matched = useMemo(
    () => projects.filter((p) => matchProject(p, filter)),
    [projects, filter],
  );

  const noNumbers = !b.downCash && !b.monthly;

  return (
    <div className="space-y-3">
      <div className="bg-[#141414] text-white rounded-2xl p-3.5 space-y-1">
        <p className="font-bold text-sm flex items-center gap-1.5">
          <Landmark size={15} className="text-[#D9B864]" />
          مشاريع بالتقسيط ({matched.length})
        </p>
        <p className="text-[11px] text-[#CFCBC2] leading-relaxed">
          الريسيل كاش — المالك مش بيقسّط. اللي بيدوّر مقدم وقسط، ده اللي ليه.
        </p>
        {!noNumbers && (
          <p className="text-[11px] text-[#D9B864] font-bold">
            مقدم لحد {f(b.downCash)} · قسط لحد {f(b.monthly)} شهرياً
          </p>
        )}
      </div>

      {noNumbers && (
        <p className="text-[11px] bg-[#FFF8E6] border border-[#EBD9A6] text-[#7A5E12] rounded-xl px-3 py-2.5 leading-relaxed">
          مكتبتش المقدم اللي معاه ولا القسط اللي يقدر عليه — فبنعرض كل المشاريع.
          اكتبهم من «عدّل طلبه» وهتشوف اللي يقدر عليه بس.
        </p>
      )}

      {matched.length === 0 && !noNumbers && (
        <p className="text-[11px] bg-white border border-[#ECE8DF] text-[#6B665C] rounded-xl px-3 py-2.5 leading-relaxed">
          مفيش مشروع نظام سداده في حدود مقدمه وقسطه. جرّب تزوّد القسط شوية،
          أو كلّمه إنه يرفع المقدم.
        </p>
      )}

      {matched.map((p) => {
        const plans = affordablePlans(p, filter);
        const areas = (p.unitAreas || []).filter((u) => !u.sold && u.area > 0);
        const best = plans[0];
        return (
          <div key={p.id} className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-[#141414] flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#A07A26] shrink-0" />
                  {p.name}
                </p>
                <p className="text-[11px] text-[#6B665C]">
                  {p.kind === 'building' ? 'عمارة منفصلة' : 'كمبوند'} · {p.neighborhood}
                  {p.deliveryDate ? ` · استلام ${p.deliveryDate}` : ''}
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#0E7A5A] bg-[#E6F7ED] px-2 py-0.5 rounded-lg border border-[#B3E8C8] shrink-0">
                {p.code}
              </span>
            </div>

            {/* أنظمة السداد اللي يقدر عليها — مش كل الأنظمة */}
            {plans.length > 0 && (
              <div className="bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl divide-y divide-[#ECE8DF]">
                {plans.slice(0, 3).map((pl, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] flex-wrap">
                    <span className="font-bold text-[#141414]">{pl.label || `نظام ${i + 1}`}</span>
                    <span className="text-[#6B665C]">
                      مقدم <b className="text-[#141414] font-mono">{f(planDownAmount(p, pl))}</b>
                      {' · '}قسط <b className="text-[#141414] font-mono">{f(planMonthly(p, pl))}</b>
                      {pl.years ? ` · ${pl.years} سنين` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* المساحات المتاحة بأرقامها — السيلز مش هيحسب بإيده في المكالمة */}
            {areas.length > 0 && best && (
              <div className="flex flex-wrap gap-1.5">
                {areas.slice(0, 6).map((u, i) => {
                  const r = areaPlanNumbers(p, u, best);
                  return (
                    <span key={i} className="text-[10px] bg-[#F6F4EF] border border-[#ECE8DF] rounded-lg px-2 py-1 text-[#6B665C]">
                      <b className="text-[#141414] font-mono">{u.area}م²</b>
                      {u.label ? ` · ${u.label}` : ''}
                      {r.down !== undefined ? ` · مقدم ${f(r.down)}` : ''}
                      {r.monthly !== undefined ? ` · قسط ${f(r.monthly)}` : ''}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectMatchPanel;
