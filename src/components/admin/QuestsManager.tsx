import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Target, Save, Eye, EyeOff } from 'lucide-react';
import { QuestTemplate, QUEST_CATEGORIES, DEFAULT_QUESTS, subscribeQuestTemplates, saveQuestTemplates } from '../../services/questService';

/*
  الأدمن بيظبط المهام اليومية من هنا: يضيف، يمسح، يغيّر النقط والهدف.
  اللي بيتحفظ هنا بينزل على كل السيلز من بكرة (وعدّاداتهم بتبدأ من الصفر كل يوم).
*/

export const QuestsManager: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const [list, setList] = useState<QuestTemplate[]>(DEFAULT_QUESTS);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeQuestTemplates((l) => { if (!dirty) setList(l); }), [dirty]);

  const edit = (id: string, patch: Partial<QuestTemplate>) => {
    setList((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    setDirty(true);
  };

  const add = () => {
    setList((prev) => [
      ...prev,
      {
        id: `q_${Date.now().toString(36)}`,
        title: 'مهمة جديدة',
        description: '',
        xpReward: 50,
        targetCount: 1,
        category: 'calls',
        active: true,
        order: prev.length + 1,
      },
    ]);
    setDirty(true);
  };

  const remove = (id: string) => {
    const q = list.find((x) => x.id === id);
    if (!window.confirm(`تمسح مهمة «${q?.title || ''}» نهائياً؟ عدّادات السيلز عليها هتروح.`)) return;
    setList((prev) => prev.filter((x) => x.id !== id));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveQuestTemplates(list.map((q, i) => ({ ...q, order: i + 1 })));
      setDirty(false);
      showToast('المهام اتحفظت — هتظهر لكل السيلز');
    } catch (e: any) {
      showToast(`ما اتحفظتش — ${e?.message || 'جرّب تاني'}`);
    } finally {
      setBusy(false);
    }
  };

  const totalXp = list.filter((q) => q.active !== false).reduce((s, q) => s + (q.xpReward || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <Target size={18} className="text-[#A07A26] shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-[#141414]">المهام اليومية</p>
            <p className="text-[11px] text-[#6B665C] leading-relaxed max-w-xl">
              دي المهام اللي بتظهر لكل سيلز. النقط بتتاخد مرة واحدة لما المهمة تكمل،
              والعدّادات بتبدأ من الصفر كل يوم.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold bg-[#FAF4E5] text-[#A07A26] border border-[#E9DFCA] rounded-full px-3 py-1.5 whitespace-nowrap">
          {list.filter((q) => q.active !== false).length} مهمة · {totalXp} نقطة في اليوم
        </span>
      </div>

      <div className="space-y-2.5">
        {list.map((q) => {
          const off = q.active === false;
          return (
            <div key={q.id} className={`rounded-2xl border p-3.5 space-y-2.5 ${off ? 'bg-[#F6F4EF] border-[#E4DFD4] opacity-70' : 'bg-white border-[#ECE8DF]'}`}>
              <div className="flex items-start gap-2">
                <input
                  value={q.title}
                  onChange={(e) => edit(q.id, { title: e.target.value })}
                  placeholder="اسم المهمة"
                  className="flex-1 min-w-0 bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2 text-sm font-bold"
                />
                <button
                  onClick={() => edit(q.id, { active: off })}
                  title={off ? 'رجّعها' : 'اقفلها مؤقتاً'}
                  className="p-2 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] cursor-pointer shrink-0"
                >
                  {off ? <EyeOff size={14} className="text-[#6B665C]" /> : <Eye size={14} className="text-[#1E7A45]" />}
                </button>
                <button
                  onClick={() => remove(q.id)}
                  title="امسحها"
                  className="p-2 rounded-xl bg-[#FDF2F0] border border-[#E8C2BA] cursor-pointer shrink-0"
                >
                  <Trash2 size={14} className="text-[#9E2A1B]" />
                </button>
              </div>

              <input
                value={q.description}
                onChange={(e) => edit(q.id, { description: e.target.value })}
                placeholder="شرح قصير للسيلز"
                className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2 text-xs"
              />

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1 block">
                  <span className="text-[10px] text-[#6B665C]">الهدف</span>
                  <input
                    type="number" min={1} dir="ltr"
                    value={q.targetCount}
                    onChange={(e) => edit(q.id, { targetCount: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-[10px] text-[#6B665C]">النقط</span>
                  <input
                    type="number" min={0} step={10} dir="ltr"
                    value={q.xpReward}
                    onChange={(e) => edit(q.id, { xpReward: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-[10px] text-[#6B665C]">النوع</span>
                  <select
                    value={q.category}
                    onChange={(e) => edit(q.id, { category: e.target.value as QuestTemplate['category'] })}
                    className="w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-2 py-2 text-xs"
                  >
                    {QUEST_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              {q.category === 'site_visit' && (
                <p className="text-[11px] text-[#1E7A45] bg-[#EEF5F0] border border-[#BFE0CC] rounded-lg px-2.5 py-1.5 leading-relaxed">
                  دي بتتعدّ لوحدها — أول ما معاينة تتم، السيلز بتاعها بياخد نقطه من غير ما يدوس حاجة.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={add} className="flex-1 py-3 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
          <Plus size={15} /> ضيف مهمة
        </button>
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="flex-1 py-3 rounded-xl bg-[#141414] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <Save size={15} /> {busy ? 'بيحفظ...' : dirty ? 'احفظ' : 'محفوظ'}
        </button>
      </div>
    </div>
  );
};

export default QuestsManager;
