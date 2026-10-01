import React, { useMemo } from 'react';
import { Trophy, Target, CheckCircle2 } from 'lucide-react';
import { Lead, SalesAgent } from '../../types';
import { QuestTemplate, buildAgentQuests } from '../../services/questService';
import { QuestLog, qualityBonus } from '../../services/questLogService';
import { DayLogSummary } from './DayLogSummary';

/*
  إنجاز اليوم لسيلز واحد.

  قبل كده: لما الإدارة بتدوس على حد في قايمة الفريق، كانت بتشوف
  عملاءه بس — والنقط والمهام فوق بتفضل بتاعة اللي داخل، مش بتاعته هو.

  دلوقتي: نقطه هو، ومهامه هو، واللي عمله النهارده بالأرقام.
  كل الأرقام محسوبة من نشاط العملاء الفعلي، مش من عدّادات بتتصفّر.
*/

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

interface Props {
  agent: SalesAgent;
  leads: Lead[];                 // كل الليدات (بنفلترها جوه)
  questTemplates: QuestTemplate[];
  dayLogs?: QuestLog[];          // تسجيلات النهارده لكل الفريق
  onClose: () => void;
}

export const AgentDayPanel: React.FC<Props> = ({ agent, leads, questTemplates, dayLogs = [], onClose }) => {
  const myLogs = useMemo(() => dayLogs.filter((l) => l.agentId === agent.id), [dayLogs, agent.id]);
  const day = startOfToday();

  const stats = useMemo(() => {
    const mine = leads.filter((l) => l.assignedAgentId === agent.id);
    const acts = mine.flatMap((l) => (l.activity || []).filter((a) => a.at >= day));

    const added = mine.filter((l) => {
      const t = Date.parse(l.createdAt || '') || 0;
      return t >= day;
    }).length;

    const touched = new Set(
      mine.filter((l) => (l.activity || []).some((a) => a.at >= day)).map((l) => l.id),
    ).size;

    const viewings = acts.filter((a) => /معاينة/.test(a.outcome || '')).length;
    const offers = acts.filter((a) => /عرض مخصوص/.test(a.outcome || '')).length;
    const discovery = acts.filter((a) => /اكتشاف/.test(a.outcome || '')).length;

    const won = mine.filter((l) => l.status === 'closed' && (l.activity || []).some((a) => a.at >= day)).length;

    const late = mine.filter(
      (l) => l.nextActionAt && l.nextActionAt < Date.now() && l.followUpStatus !== 'completed'
        && l.status !== 'closed' && l.status !== 'lost',
    ).length;

    return { total: mine.length, added, touched, acts: acts.length, viewings, offers, discovery, won, late };
  }, [leads, agent.id, day]);

  const quests = useMemo(() => buildAgentQuests(questTemplates, agent), [questTemplates, agent]);
  const doneCount = quests.filter((q) => q.isCompleted).length;
  const earnedToday = quests.filter((q) => q.isCompleted).reduce((s, q) => s + (q.xpReward || 0), 0);

  return (
    <div className="bg-white border-2 border-[#141414] rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-extrabold text-[#141414]">{agent.name}</p>
          <p className="text-[11px] text-[#6B665C]">إنجاز النهارده</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#FAF4E5] border border-[#E9DFCA] text-[#A07A26] font-extrabold text-sm flex items-center gap-1.5">
            <Trophy size={14} /> {(agent.xp || 0).toLocaleString('en-US')} XP
          </span>
          {qualityBonus(myLogs) > 0 && (
            <span className="px-2.5 py-1.5 rounded-xl bg-[#EEF5F0] border border-[#BFE0CC] text-[#1E7A45] font-bold text-[11px]">
              +{qualityBonus(myLogs)} جودة
            </span>
          )}
          <button onClick={onClose} className="text-[11px] font-bold text-[#6B665C] cursor-pointer">✕</button>
        </div>
      </div>

      {/* اللي عمله النهارده — محسوب من نشاط عملائه الفعلي */}
      <div className="grid grid-cols-3 gap-2">
        <Stat n={stats.acts} label="أكشن اتسجّل" />
        <Stat n={stats.touched} label="عميل اتكلّم معاه" />
        <Stat n={stats.added} label="عميل جديد" />
        <Stat n={stats.discovery} label="مكالمة اكتشاف" />
        <Stat n={stats.offers} label="عرض مخصوص" />
        <Stat n={stats.viewings} label="معاينة" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat n={stats.total} label="إجمالي عملاءه" tone="muted" />
        <Stat n={stats.won} label="صفقة قفلت" tone="good" />
        <Stat n={stats.late} label="متابعة متأخرة" tone={stats.late ? 'bad' : 'muted'} />
      </div>

      {/* تفصيل المكالمات والإعلانات من السجل */}
      <DayLogSummary logs={myLogs} />

      {/* مهامه هو — مش مهام اللي داخل */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold text-[#141414] flex items-center gap-1.5">
            <Target size={13} className="text-[#A07A26]" /> مهامه النهارده
          </p>
          <span className="text-[11px] font-bold text-[#6B665C]">
            {doneCount} من {quests.length} · {earnedToday} نقطة
          </span>
        </div>

        {quests.length === 0 && (
          <p className="text-[11px] text-[#6B665C]">مفيش مهام متحددة. ظبّطها من إعدادات الأدمن.</p>
        )}

        {quests.map((q) => {
          const pct = q.targetCount ? Math.min(100, (q.currentCount / q.targetCount) * 100) : 0;
          return (
            <div key={q.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className={`font-bold ${q.isCompleted ? 'text-[#1E7A45]' : 'text-[#141414]'} flex items-center gap-1`}>
                  {q.isCompleted && <CheckCircle2 size={11} />}
                  {q.title}
                </span>
                <span className="font-mono text-[#6B665C] shrink-0">
                  {q.currentCount}/{q.targetCount} · {q.xpReward}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F0ECE4] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: q.isCompleted ? '#1E7A45' : '#A07A26' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TONES: Record<string, string> = {
  good: '#1E7A45',
  bad: '#9E2A1B',
  muted: '#6B665C',
  normal: '#141414',
};

const Stat: React.FC<{ n: number; label: string; tone?: keyof typeof TONES }> = ({ n, label, tone = 'normal' }) => (
  <div className="bg-[#FAF8F3] border border-[#ECE8DF] rounded-xl py-2.5 px-2 text-center">
    <p className="text-lg font-extrabold font-mono leading-none" style={{ color: TONES[tone] }}>
      {n.toLocaleString('en-US')}
    </p>
    <p className="text-[10px] text-[#6B665C] leading-tight mt-1">{label}</p>
  </div>
);

export default AgentDayPanel;
