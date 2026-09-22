import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FieldFeedback, FieldAgent, BrokerFeedback, subscribeFieldFeedback, subscribeFieldAgents, salesConfirmFeedback, subscribeBrokerFeedbackForSales } from '../../services/portalService';

/* السيلز بيأكد الفيدباك اللي سارة راجعته، فيتنشر للمالك */
export const SalesFeedbackInbox: React.FC<{ isOpen: boolean; onClose: () => void; agentId?: string | null; isAdmin?: boolean }> = ({ isOpen, onClose, agentId, isAdmin }) => {
  const [fbs, setFbs] = useState<FieldFeedback[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [brokerFbs, setBrokerFbs] = useState<BrokerFeedback[]>([]);
  useEffect(() => (isOpen ? subscribeBrokerFeedbackForSales(agentId || null, !!isAdmin, setBrokerFbs) : undefined), [isOpen, agentId, isAdmin]);
  useEffect(() => { if (!isOpen) return; const a = subscribeFieldFeedback(setFbs); const b = subscribeFieldAgents(setAgents); return () => { a(); b(); }; }, [isOpen]);
  if (!isOpen) return null;
  // كل سيلز بيشوف فيدباك المعاينات اللي هو طلبها بس
  const list = fbs.filter((f) => f.stage === 'sara_confirmed' && (isAdmin || !f.salesAgentId || f.salesAgentId === agentId));
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="bg-[#F6F4EF] w-full sm:max-w-2xl max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col">
        <header className="flex justify-between items-center p-5 border-b border-[#ECE8DF]"><div><p className="font-bold text-lg">فيدباك المعاينات</p><p className="text-xs text-[#6B665C]">أكّده عشان يوصل للمالك</p></div><button onClick={onClose} aria-label="إغلاق" className="p-2"><X size={18} /></button></header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {brokerFbs.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold text-sm">فيدباك البروكرز على معايناتك</p>
              {brokerFbs.map((b) => (
                <section key={b.id} className="bg-[#FBF8F1] border border-[#E8D3A6] rounded-2xl p-4 space-y-1">
                  <div className="flex justify-between"><span className="font-bold">{b.propertyCode} · البروكر {b.brokerName}</span><span className="text-[#D9B864]">{'★'.repeat(b.rating)}</span></div>
                  <p className="leading-7 text-sm">"{b.text}"</p>
                  {isAdmin && b.salesAgentName && <p className="text-[11px] text-[#6B665C]">للسيلز: {b.salesAgentName}</p>}
                </section>
              ))}
            </div>
          )}
          {!list.length && <p className="text-center text-sm text-[#6B665C] py-10">مفيش فيدباك معاينات مستني تأكيدك</p>}
          {list.map((f) => (
            <section key={f.id} className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between"><span className="font-bold">{f.code} · خرج {f.agentName}{f.salesAgentName ? ` · طلبك انت` : ''}</span><span className="text-[#D9B864]">{'★'.repeat(f.rating)}</span></div>
              {f.voiceUrl && <audio controls src={f.voiceUrl} className="w-full" />}
              <p className="leading-7">"{f.text}"</p>
              <button onClick={() => salesConfirmFeedback(f, agents)} className="w-full rounded-xl py-3 bg-[#1E7A45] text-white font-bold">تأكيد ونشر للمالك</button>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
