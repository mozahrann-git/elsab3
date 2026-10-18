import React, { useMemo, useState } from 'react';
import { Lead, SalesAgent } from '../../types';
import { OWNER_DESK } from '../../services/ownerDesk';

/*
  المتصدرين — مبني على شغل حقيقي متسجّل في الـCRM، والنقط مكتوبة قدام الكل:
    صفقة = ١٠٠ · معاينة اتعملت = ٢٠ · طلب عميل = ٥ · أكشن = ١
  قبل كده كان بيترتّب على الفيديوهات ومشاهداتها (حاجة محدش بيسجّلها)،
  فالكل أصفار والترتيب عشوائي.
  السيلز بيشوف الـ٣ الأوائل ومكانه هو بس — الإدارة بتشوف الكل.
*/

const PTS = { deal: 100, viewing: 20, request: 5, action: 1 };
type Range = 'week' | 'month';

const startOf = (r: Range) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === 'month') d.setDate(1);
  else d.setDate(d.getDate() - ((d.getDay() + 1) % 7));   // الأسبوع بيبدأ السبت
  return d.getTime();
};

export const LeaderboardTab: React.FC<{ agents: SalesAgent[]; leads: Lead[]; isAdmin?: boolean; currentAgentId?: string }> = ({ agents, leads, isAdmin, currentAgentId }) => {
  const [range, setRange] = useState<Range>('month');
  const since = startOf(range);

  const rows = useMemo(() => agents
    .filter((a) => a.isActive !== false && a.id !== OWNER_DESK.id)
    .map((a) => {
      const mine = leads.filter((l) => l.assignedAgentId === a.id);
      let deals = 0, viewings = 0, actions = 0, requests = 0;
      mine.forEach((l) => {
        (l.activity || []).forEach((x) => {
          if (typeof x.at !== 'number' || x.at < since) return;
          if (/صفقة مغلقة/.test(x.outcome || '')) deals++;
          if (/تمت المعاينة/.test(x.outcome || '')) viewings++;
        });
        const r: any = (l as any).clientRequest;
        const rt = r ? (r.firstAt || r.createdAt) : 0;
        if (rt && rt >= since) requests++;
      });
      leads.forEach((l) => (l.activity || []).forEach((x) => {
        if (typeof x.at === 'number' && x.at >= since && (x.by || '').trim() === a.name) actions++;
      }));
      const points = deals * PTS.deal + viewings * PTS.viewing + requests * PTS.request + actions * PTS.action;
      return { id: a.id, name: a.name, deals, viewings, requests, actions, points };
    })
    .sort((x, y) => y.points - x.points || y.deals - x.deals || x.name.localeCompare(y.name)), [agents, leads, since]);

  const active = rows.filter((r) => r.points > 0);
  const idle = rows.filter((r) => r.points === 0);
  const myIdx = active.findIndex((r) => r.id === currentAgentId);
  const shown = isAdmin ? active : active.filter((r, i) => i < 3 || r.id === currentAgentId);
  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);
  const cell = 'px-2 py-3 text-center font-mono';

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {([['week', 'الأسبوع ده'], ['month', 'الشهر ده']] as [Range, string][]).map(([k, t]) => (
            <button key={k} onClick={() => setRange(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${range === k ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#ECE8DF]'}`}>{t}</button>
          ))}
        </div>
        <p className="text-[11px] text-[#8C877D]">صفقة ١٠٠ · معاينة ٢٠ · طلب ٥ · أكشن ١</p>
      </div>

      {!isAdmin && currentAgentId && (
        <div className="bg-[#FBF8F1] border border-[#E8D3A6] rounded-2xl p-3 text-sm font-bold">
          {myIdx >= 0 ? `إنت رقم ${myIdx + 1} من ${active.length} · ${active[myIdx].points} نقطة` : 'لسه مالكش نقط في المدة دي — أول أكشن تسجّله يدخلك الترتيب'}
        </div>
      )}

      {active.length > 0 ? (
        <div className="bg-white border border-[#ECE8DF] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[460px]">
            <thead>
              <tr className="text-[11px] text-[#8C877D] border-b border-[#ECE8DF]">
                <th className="px-3 py-3 text-right">الاسم</th><th className={cell}>النقط</th><th className={cell}>صفقات</th>
                <th className={cell}>معاينات</th><th className={cell}>طلبات</th><th className={cell}>أكشن</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const i = active.indexOf(r);
                const me = r.id === currentAgentId;
                return (
                  <tr key={r.id} className={`border-b border-[#F0ECE4] last:border-0 ${me ? 'bg-[#FBF8F1]' : ''}`}>
                    <td className="px-3 py-3 font-bold whitespace-nowrap">{medal(i)} {r.name}{me ? ' (إنت)' : ''}</td>
                    <td className={`${cell} font-black text-[#A07A26]`}>{r.points}</td>
                    <td className={`${cell} font-bold`} style={{ color: r.deals ? '#1E7A45' : '#8C877D' }}>{r.deals}</td>
                    <td className={cell}>{r.viewings}</td>
                    <td className={cell}>{r.requests}</td>
                    <td className={cell}>{r.actions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[#8C877D] bg-white border border-dashed border-[#DCD6CA] rounded-2xl p-4 text-center">محدش سجّل شغل في المدة دي لسه.</p>
      )}

      {isAdmin && idle.length > 0 && (
        <p className="text-[11px] text-[#8C877D]">من غير نقط: {idle.map((r) => r.name).join('، ')}</p>
      )}
    </div>
  );
};

export default LeaderboardTab;
