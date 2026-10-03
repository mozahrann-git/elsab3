import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import {
  QuestTemplate, QUEST_CATEGORIES, saveQuestTemplates,
} from '../../services/questService';

/*
  تعديل التحديات اليومية.

  المشكلة اللي كان بيحصل: الشاشة كانت بتقرا التحديات من مكان
  (site_config/daily_quests) وزرار الحفظ بيكتبها في مكان تاني خالص
  (crm_board). فالحفظ "بينجح" ومحصلش حاجة — التحديات ترجع زي ما هي.
  دلوقتي بنكتب في نفس المكان اللي بنقرا منه.

  وكمان: كل تحدي بقى ليه إثبات. «نشرت ٥ إعلانات» من غير اسكرين شوت
  مجرد كلام — والنقط بتتاخد على كلام.
*/

const PROOF_OPTIONS: { id: NonNullable<QuestTemplate['proof']>; label: string; hint: string }[] = [
  { id: 'none', label: 'من غير إثبات', hint: 'بيتحسب بمجرد ما يدوس' },
  { id: 'photo', label: 'صورة', hint: 'اسكرين شوت أو صورة من المكان' },
  { id: 'note', label: 'كلام مكتوب', hint: 'كود الشقة أو اسم العميل' },
  { id: 'both', label: 'صورة + كلام', hint: 'الاتنين مع بعض' },
];

interface Props {
  templates: QuestTemplate[];
  onDone: () => void;
  showToast?: (m: string) => void;
}

export const QuestEditor: React.FC<Props> = ({ templates, onDone, showToast }) => {
  const [list, setList] = useState<QuestTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setList(templates.map((t) => ({ ...t })));
  }, [templates]);

  const set = (i: number, patch: Partial<QuestTemplate>) =>
    setList((l) => l.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const add = () =>
    setList((l) => [
      ...l,
      {
        id: `q_${Date.now()}`,
        title: '',
        description: '',
        xpReward: 50,
        targetCount: 1,
        category: 'calls',
        active: true,
        order: l.length + 1,
        proof: 'photo',
        proofHint: '',
      },
    ]);

  const save = async () => {
    const clean = list
      .filter((q) => q.title.trim())
      .map((q, i) => ({ ...q, title: q.title.trim(), order: i + 1 }));

    if (!clean.length) { setErr('مفيش ولا تحدي مكتوب له اسم'); return; }

    setBusy(true);
    setErr('');
    try {
      await saveQuestTemplates(clean);
      showToast?.('اتحفظت التحديات ✓');
      onDone();
    } catch (e: any) {
      /* الغلط بيبان للإدارة بدل ما الحفظ يفشل في صمت */
      setErr(e?.code === 'permission-denied'
        ? 'الصلاحيات رافضة الحفظ — محتاج تعمل deploy لقواعد Firestore'
        : `الحفظ مانفعش: ${e?.message || 'غلط غير معروف'}`);
    } finally {
      setBusy(false);
    }
  };

  const fld = 'p-2.5 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-sm w-full';

  return (
    <div className="rounded-2xl border-2 border-[#A07A26] bg-white p-4 space-y-3">
      {list.map((q, i) => (
        <div key={q.id} className="border-b border-[#F0ECE4] pb-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-12">
            <input
              value={q.title}
              onChange={(e) => set(i, { title: e.target.value })}
              placeholder="اسم التحدي"
              className={`${fld} sm:col-span-5 font-bold`}
            />
            <input
              value={q.description}
              onChange={(e) => set(i, { description: e.target.value })}
              placeholder="الوصف"
              className={`${fld} sm:col-span-4`}
            />
            <label className="sm:col-span-1 text-[10px] text-[#6B665C]">
              العدد
              <input type="number" min={1} dir="ltr" value={q.targetCount}
                onChange={(e) => set(i, { targetCount: Number(e.target.value) || 1 })}
                className="w-full p-2 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-sm font-mono" />
            </label>
            <label className="sm:col-span-1 text-[10px] text-[#6B665C]">
              XP
              <input type="number" min={0} dir="ltr" value={q.xpReward}
                onChange={(e) => set(i, { xpReward: Number(e.target.value) || 0 })}
                className="w-full p-2 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-sm font-mono" />
            </label>
            <button
              onClick={() => setList((l) => l.filter((_, j) => j !== i))}
              className="sm:col-span-1 text-xs font-bold text-[#C2412D] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> مسح
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-12">
            <label className="sm:col-span-3 text-[10px] text-[#6B665C]">
              النوع
              <select value={q.category} onChange={(e) => set(i, { category: e.target.value as any })}
                className="w-full p-2 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-xs">
                {QUEST_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>

            {/* الإثبات — ده اللي بيمنع النقط تتاخد على كلام */}
            <label className="sm:col-span-3 text-[10px] text-[#6B665C]">
              الإثبات المطلوب
              <select value={q.proof || 'none'} onChange={(e) => set(i, { proof: e.target.value as any })}
                className="w-full p-2 rounded-lg bg-[#FFF8E6] border border-[#EBD9A6] text-xs font-bold">
                {PROOF_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>

            <label className="sm:col-span-5 text-[10px] text-[#6B665C]">
              يرفع إيه بالظبط
              <input
                value={q.proofHint || ''}
                onChange={(e) => set(i, { proofHint: e.target.value })}
                placeholder={PROOF_OPTIONS.find((p) => p.id === (q.proof || 'none'))?.hint}
                disabled={(q.proof || 'none') === 'none'}
                className="w-full p-2 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-xs disabled:opacity-40"
              />
            </label>

            <label className="sm:col-span-1 text-[10px] text-[#6B665C] flex flex-col items-center justify-end pb-2">
              شغال
              <input type="checkbox" checked={q.active !== false}
                onChange={(e) => set(i, { active: e.target.checked })}
                className="accent-[#1E7A45] w-4 h-4 mt-1" />
            </label>
          </div>
        </div>
      ))}

      {err && (
        <p className="text-[11px] font-bold text-[#9E2A1B] bg-[#FDF2F0] border border-[#E9B8AE] rounded-xl px-3 py-2 leading-relaxed">
          {err}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={add} className="px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-sm font-bold flex items-center gap-1.5 cursor-pointer">
          <Plus size={14} /> تحدي جديد
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-[#141414] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {busy ? 'بيحفظ...' : 'حفظ التحديات'}
        </button>
        <button onClick={onDone} disabled={busy} className="px-4 py-2 rounded-xl bg-[#F6F4EF] text-sm font-bold cursor-pointer">
          إلغاء
        </button>
      </div>

      <p className="text-[11px] text-[#6B665C] leading-relaxed flex items-start gap-1.5">
        <ShieldCheck size={13} className="text-[#A07A26] shrink-0 mt-0.5" />
        التحدي اللي عليه إثبات، السيلز مش هياخد نقطه غير لما يرفع الدليل — وإنت بتشوفه في سجل اليوم بتاعه.
      </p>
    </div>
  );
};

export default QuestEditor;
