import React, { useEffect, useState } from 'react';
import { Lead, SalesAgent } from '../../types';
import { ContentSlot, subscribeSlots, TrackedLink, subscribeLinks, Offer, subscribeOffersByAgent, weekKey } from '../../services/salesToolsService';

/* مين متصدر المشهد: المحتوى واللينكات والعروض والصفقات في جدول واحد */
export const LeaderboardTab: React.FC<{ agents: SalesAgent[]; leads: Lead[] }> = ({ agents, leads }) => {
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [links, setLinks] = useState<TrackedLink[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => subscribeSlots(setSlots), []);
  useEffect(() => subscribeLinks(null, true, setLinks), []);
  useEffect(() => subscribeOffersByAgent(null, true, setOffers), []);

  const wk = weekKey();
  const rows = agents.filter((a) => a.isActive !== false).map((a) => {
    const mySlots = slots.filter((s) => s.agentId === a.id && s.weekKey === wk);
    const myLinks = links.filter((l) => l.agentId === a.id);
    const myOffers = offers.filter((o) => o.agentId === a.id);
    const myLeads = leads.filter((l) => l.assignedAgentId === a.id);
    return {
      id: a.id, name: a.name,
      videos: mySlots.filter((s) => s.publishedAt).length,
      views: mySlots.reduce((n, s) => n + (s.stats?.views || 0), 0),
      hits: myLinks.reduce((n, l) => n + (l.hits || 0), 0),
      wa: myLinks.reduce((n, l) => n + (l.waClicks || 0), 0),
      offers: myOffers.length,
      opened: myOffers.filter((o) => (o.openCount || 0) > 0).length,
      deals: myLeads.filter((l) => l.status === 'closed').length,
    };
  }).sort((x, y) => (y.deals * 100 + y.wa * 3 + y.hits) - (x.deals * 100 + x.wa * 3 + x.hits));

  const cell = 'px-2 py-3 text-center';
  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-white border border-[#ECE8DF] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[11px] text-[#8C877D] border-b border-[#ECE8DF]">
              <th className="px-3 py-3 text-right">الاسم</th><th className={cell}>فيديوهات</th><th className={cell}>مشاهدات</th>
              <th className={cell}>فتحات اللينك</th><th className={cell}>واتساب</th><th className={cell}>عروض</th><th className={cell}>اتفتحت</th><th className={cell}>صفقات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-[#F0ECE4]">
                <td className="px-3 py-3 font-bold">{i + 1}. {r.name}</td>
                <td className={cell}>{r.videos}</td><td className={cell}>{r.views}</td><td className={cell}>{r.hits}</td>
                <td className={`${cell} text-[#1E7A45] font-bold`}>{r.wa}</td><td className={cell}>{r.offers}</td><td className={cell}>{r.opened}</td>
                <td className={`${cell} font-bold`} style={{ fontFamily: "'Readex Pro', sans-serif" }}>{r.deals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#8C877D]">الفيديوهات والمشاهدات للأسبوع الحالي · الباقي إجمالي</p>
    </div>
  );
};
