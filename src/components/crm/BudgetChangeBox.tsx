import React, { useState } from 'react';
import { Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Lead } from '../../types';

/*
  تعديل ميزانية العميل بيمر على الإدارة.

  السيلز بيطلب التعديل ويكتب سببه، والميزانية في الملف مبتتغيّرش.
  الإدارة بتشوف الطلب والسبب وبتأكد أو ترفض — ووقتها بس بتتغيّر.
  كل الحركة دي بتتسجّل في نشاط العميل.
*/

const fmt = (n: number) => (n ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')} مليون` : '—');
const money = (n: number) => Math.round(n).toLocaleString('en-US');

interface Props {
  lead: Lead;
  isAdmin: boolean;
  byName: string;
  byId?: string;
  onUpdateLead: (l: Lead) => void;
}

export const BudgetChangeBox: React.FC<Props> = ({ lead, isAdmin, byName, byId, onUpdateLead }) => {
  const req = lead.budgetChangeRequest;
  const pending = req?.status === 'pending';

  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(lead.budgetMin || 0);
  const [max, setMax] = useState(lead.budgetMax || 0);
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const log = (l: Lead, outcome: string, comment: string): Lead => ({
    ...l,
    activity: [{ at: Date.now(), by: byName, outcome, comment }, ...(l.activity || [])].slice(0, 80),
  });

  const sendRequest = () => {
    if (!max || max < min) return;
    const next = log({
      ...lead,
      budgetChangeRequest: {
        by: byName, byId, at: Date.now(),
        fromMin: lead.budgetMin || 0, fromMax: lead.budgetMax || 0,
        toMin: min, toMax: max,
        note: note.trim(),
        status: 'pending',
      },
    }, 'طلب تعديل ميزانية', `من ${fmt(lead.budgetMax || 0)} لـ ${fmt(max)} — ${note.trim() || 'من غير سبب مكتوب'}`);
    onUpdateLead(next);
    setOpen(false);
    setNote('');
  };

  const approve = () => {
    if (!req) return;
    // هنا بس الميزانية بتتغيّر فعلاً
    const next = log({
      ...lead,
      budgetMin: req.toMin,
      budgetMax: req.toMax,
      budgetChangeRequest: { ...req, status: 'approved', decidedBy: byName, decidedAt: Date.now(), decisionNote: decisionNote.trim() || undefined },
    }, 'الإدارة وافقت على تعديل الميزانية', `${fmt(req.fromMax)} ← ${fmt(req.toMax)}${decisionNote.trim() ? ` — ${decisionNote.trim()}` : ''}`);
    onUpdateLead(next);
    setDecisionNote('');
  };

  const reject = () => {
    if (!req) return;
    const next = log({
      ...lead,
      budgetChangeRequest: { ...req, status: 'rejected', decidedBy: byName, decidedAt: Date.now(), decisionNote: decisionNote.trim() || undefined },
    }, 'الإدارة رفضت تعديل الميزانية', decisionNote.trim() || 'من غير سبب مكتوب');
    onUpdateLead(next);
    setDecisionNote('');
  };

  return (
    <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-[#A07A26]" />
          <div>
            <p className="text-[11px] text-[#6B665C]">الميزانية المعتمدة</p>
            <p className="font-extrabold text-[#141414] text-sm">
              {lead.budgetMin ? `${money(lead.budgetMin)} – ` : ''}{lead.budgetMax ? `${money(lead.budgetMax)} ج.م` : 'غير محددة'}
            </p>
          </div>
        </div>
        {!pending && (
          <button
            onClick={() => { setMin(lead.budgetMin || 0); setMax(lead.budgetMax || 0); setOpen((v) => !v); }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] cursor-pointer"
          >
            {open ? 'إلغاء' : 'اطلب تعديل'}
          </button>
        )}
      </div>

      {/* نموذج الطلب */}
      {open && !pending && (
        <div className="space-y-2.5 pt-1 border-t border-[#F2EFE9]">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] text-[#6B665C]">من</span>
              <input type="number" value={min || ''} onChange={(e) => setMin(Number(e.target.value) || 0)}
                className="w-full bg-[#F6F4EF] border border-[#E4DFD4] rounded-xl px-3 py-2 text-sm font-mono" dir="ltr" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-[#6B665C]">لـ</span>
              <input type="number" value={max || ''} onChange={(e) => setMax(Number(e.target.value) || 0)}
                className="w-full bg-[#F6F4EF] border border-[#E4DFD4] rounded-xl px-3 py-2 text-sm font-mono" dir="ltr" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-[#6B665C]">السبب — الإدارة هتقرا ده قبل ما توافق</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="مثلاً: باع عربيته وزوّد ٣٠٠ ألف، وقال ده آخر حد عنده"
              className="w-full bg-[#F6F4EF] border border-[#E4DFD4] rounded-xl px-3 py-2 text-sm leading-relaxed" />
          </label>
          <button
            onClick={sendRequest}
            disabled={!max || max < min}
            className="w-full py-2.5 rounded-xl bg-[#141414] text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
          >
            ابعت الطلب للإدارة
          </button>
        </div>
      )}

      {/* طلب مستني */}
      {pending && req && (
        <div className="rounded-xl bg-[#FFF8E6] border border-[#EBD9A6] p-3 space-y-2">
          <p className="text-[12px] font-bold text-[#7A5E12] flex items-center gap-1.5">
            <Clock size={13} /> طلب تعديل مستني الإدارة
          </p>
          <p className="text-[12px] text-[#7A5E12] leading-relaxed">
            <b>{req.by}</b> طلب يغيّرها من <b>{money(req.fromMax)}</b> لـ <b>{money(req.toMax)}</b> ج.م
            {req.toMin ? ` (الحد الأدنى ${money(req.toMin)})` : ''}.
          </p>
          {req.note && <p className="text-[12px] text-[#6B2419] bg-white/60 rounded-lg px-2.5 py-2 leading-relaxed">« {req.note} »</p>}

          {isAdmin ? (
            <div className="space-y-2 pt-1">
              <input value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="تعليق الإدارة (اختياري)"
                className="w-full bg-white border border-[#E4DFD4] rounded-xl px-3 py-2 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={approve} className="py-2.5 rounded-xl bg-[#1E7A45] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                  <CheckCircle2 size={14} /> وافق وغيّرها
                </button>
                <button onClick={reject} className="py-2.5 rounded-xl bg-white border border-[#E8C2BA] text-[#9E2A1B] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                  <XCircle size={14} /> ارفض
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[#7A5E12]">الميزانية في الملف مش هتتغيّر غير لما الإدارة تأكد.</p>
          )}
        </div>
      )}

      {/* آخر قرار */}
      {req && req.status !== 'pending' && (
        <p className={`text-[11px] rounded-lg px-2.5 py-1.5 leading-relaxed ${
          req.status === 'approved'
            ? 'bg-[#EEF5F0] border border-[#BFE0CC] text-[#1E7A45]'
            : 'bg-[#FDF2F0] border border-[#E8C2BA] text-[#9E2A1B]'
        }`}>
          {req.status === 'approved' ? 'آخر تعديل اعتمدته الإدارة' : 'آخر طلب تعديل اترفض'}
          {req.decidedBy ? ` — ${req.decidedBy}` : ''}
          {req.decisionNote ? `: ${req.decisionNote}` : ''}
        </p>
      )}
    </div>
  );
};

export default BudgetChangeBox;
