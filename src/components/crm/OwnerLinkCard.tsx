import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Link2, Copy, Check, MessageCircle, Home, Users, X, Clock, Eye, EyeOff, Trash2, RefreshCw,
} from 'lucide-react';
import { copyText } from '../../utils/shareKit';
import { waLink } from '../../utils/helpers';
import {
  agentCode, newToken, recordSentLink, fetchSentLinks, deleteSentLink, SentLink,
} from '../../services/referralService';

/*
  لينكات الإحالة + متابعة مين فتح.

  اللينك العام مبيقولش مين فتحه. فكل واحد بتبعتله بياخد لينك بتوكن
  خاص بيه، وإحنا بنسجّل بعتناه لمين وإمتى. أول ما يفتحه بتتسجّل لمسة
  بنفس التوكن — فالسيلز يعرف: ده فتح، وده لسه.

  واللي مفتحش بعد ٢٤ ساعة بيتعلّم بالأحمر عشان يتابعه.
*/

const FOLLOW_UP_AFTER_H = 24;

const ago = (ms: number): string => {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'دلوقتي';
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ساعات`;
  const d = Math.round(h / 24);
  return d === 1 ? 'من يوم' : d === 2 ? 'من يومين' : `من ${d} أيام`;
};

interface Props {
  byCode?: string;
  byName?: string;
}

type Kind = 'owner' | 'client';

export const OwnerLinkCard: React.FC<Props> = ({ byCode, byName }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'send' | 'sent'>('send');
  const [kind, setKind] = useState<Kind>('owner');
  const [toName, setToName] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [token, setToken] = useState(() => newToken());
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<SentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const code = agentCode(byName, byCode);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://elsab3.com';
  const link = kind === 'owner'
    ? `${origin}/?owner=1&ref=${code}&t=${token}`
    : `${origin}/?ref=${code}&t=${token}`;

  const load = useCallback(async () => {
    if (!code) return;
    setBusy(true);
    setErr('');
    try {
      setSent(await fetchSentLinks(code));
    } catch (e: any) {
      setErr(e?.code === 'permission-denied'
        ? 'الصلاحيات رافضة — قواعد Firestore محتاجة deploy'
        : 'مش قادر أجيب اللينكات دلوقتي');
    } finally {
      setBusy(false);
    }
  }, [code]);

  useEffect(() => { if (open && tab === 'sent') load(); }, [open, tab, load]);

  const msg = kind === 'owner'
    ? [
        `أهلاً ${toName || 'بحضرتك'} 👋`, '',
        'عشان نعرض شقتك على موقع السبع للعقارات، املا البيانات من اللينك ده:',
        link, '',
        'هتاخد منك دقيقتين — المساحة والدور والسعر وصور الشقة.', '',
        `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
      ].join('\n')
    : [
        `أهلاً ${toName || 'بحضرتك'} 👋`, '',
        'ده موقعنا، اتفرج على الشقق المتاحة بالهضبة الوسطى بالصور والأسعار:',
        link, '',
        'وأي شقة تعجبك كلّمني وأنا أرتبلك المعاينة.', '',
        `${byName || 'السبع للعقارات'} — الهضبة الوسطى بالمقطم`,
      ].join('\n');

  /* بنسجّل إننا بعتنا قبل ما نفتح الواتساب — عشان نعرف بعدين فتح ولا لأ */
  const register = async () => {
    if (!toName.trim()) { setErr('اكتب اسم اللي هتبعتله عشان نعرف نتابعه'); return false; }
    setErr('');
    try {
      await recordSentLink({
        id: token, code, byName: byName || 'الفريق', kind,
        toName: toName.trim(), toPhone: toPhone.trim() || undefined, sentAt: Date.now(),
      });
      return true;
    } catch (e: any) {
      setErr(e?.code === 'permission-denied'
        ? 'اللينك اتعمل بس مش هنقدر نتابعه — القواعد محتاجة deploy'
        : 'اللينك اتعمل بس التسجيل فشل');
      return true;   // اللينك شغال برضه
    }
  };

  const sendWhats = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!toName.trim()) { e.preventDefault(); setErr('اكتب اسم اللي هتبعتله عشان نعرف نتابعه'); return; }
    await register();
    setToken(newToken());        // اللي بعده ياخد توكن جديد
    setToName(''); setToPhone('');
  };

  const copy = async () => {
    if (!(await register())) return;
    const ok = await copyText(link);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
    if (!ok) window.prompt('انسخ اللينك:', link);
    setToken(newToken());
    setToName(''); setToPhone('');
  };

  const waiting = sent.filter((l) => !l.openedAt);
  const late = waiting.filter((l) => Date.now() - l.sentAt > FOLLOW_UP_AFTER_H * 3600000);

  const tabCls = (on: boolean) =>
    `flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border transition ${
      on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E4DFD4]'
    }`;
  const fld = 'w-full bg-[#FAF9F5] border border-[#ECE8DF] rounded-xl px-3 py-2.5 text-sm';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl bg-[#F6F4EF] border border-[#E4DFD4] text-[11px] font-bold text-[#141414] flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        <Link2 size={13} className="text-[#A07A26]" />
        لينكاتي
        {late.length > 0 && (
          <span className="bg-[#9E2A1B] text-white rounded-full px-1.5 text-[10px]">{late.length}</span>
        )}
      </button>

      {open && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#F6F4EF] w-full sm:max-w-md max-h-[90dvh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            <header className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <p className="font-bold text-sm">لينكاتي</p>
                <p className="text-[11px] text-[#CFCBC2]">كودك: <span className="font-mono font-bold text-[#D9B864]">{code}</span></p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10 cursor-pointer">
                <X size={18} />
              </button>
            </header>

            <div className="flex gap-2 p-4 pb-0 shrink-0">
              <button onClick={() => setTab('send')} className={tabCls(tab === 'send')}>ابعت لينك</button>
              <button onClick={() => setTab('sent')} className={tabCls(tab === 'sent')}>
                مين فتح؟
                {late.length > 0 && <span className="bg-[#9E2A1B] text-white rounded-full px-1.5">{late.length}</span>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tab === 'send' ? (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => { setKind('owner'); setCopied(false); }} className={tabCls(kind === 'owner')}>
                      <Home size={13} /> مالك
                    </button>
                    <button onClick={() => { setKind('client'); setCopied(false); }} className={tabCls(kind === 'client')}>
                      <Users size={13} /> عميل
                    </button>
                  </div>

                  <p className="text-[11px] text-[#6B665C] leading-relaxed">
                    اكتب اسم اللي هتبعتله — بناخد لينك خاص بيه، وبعدين تعرف فتحه ولا لأ.
                  </p>

                  <input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="اسم اللي هتبعتله *" className={fld} />
                  <input value={toPhone} onChange={(e) => setToPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="موبايله (اختياري)" className={`${fld} font-mono`} />

                  {err && <p className="text-[11px] font-bold text-[#9E2A1B] bg-[#FDF2F0] border border-[#E9B8AE] rounded-xl px-3 py-2">{err}</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={waLink(toPhone.trim(), msg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={sendWhats}
                      className="py-3 rounded-xl bg-[#1FA85D] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} /> ابعته واتساب
                    </a>
                    <button
                      onClick={copy}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
                        copied ? 'bg-[#EEF5F0] border-[#BFE0CC] text-[#1E7A45]' : 'bg-white border-[#E4DFD4] text-[#141414]'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'اتنسخ ✓' : 'انسخ اللينك'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#6B665C]">
                      {sent.length ? `${sent.length} لينك · ${waiting.length} لسه مفتحوش` : 'لسه مبعتش لينك لحد'}
                    </p>
                    <button onClick={load} disabled={busy} className="text-[11px] font-bold text-[#A07A26] flex items-center gap-1 cursor-pointer">
                      <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> حدّث
                    </button>
                  </div>

                  {err && <p className="text-[11px] font-bold text-[#9E2A1B] bg-[#FDF2F0] border border-[#E9B8AE] rounded-xl px-3 py-2">{err}</p>}

                  {sent.map((l) => {
                    const opened = !!l.openedAt;
                    const overdue = !opened && Date.now() - l.sentAt > FOLLOW_UP_AFTER_H * 3600000;
                    return (
                      <div
                        key={l.id}
                        className={`bg-white border rounded-xl p-3 space-y-1.5 ${overdue ? 'border-[#E9B8AE]' : 'border-[#ECE8DF]'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#141414] truncate">
                              {l.toName}
                              <span className="font-normal text-[#8C877D]"> · {l.kind === 'owner' ? 'مالك' : 'عميل'}</span>
                            </p>
                            {l.toPhone && <p className="font-mono text-[11px] text-[#6B665C]" dir="ltr">{l.toPhone}</p>}
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 ${
                              opened
                                ? 'bg-[#EEF5F0] text-[#1E7A45] border border-[#BFE0CC]'
                                : overdue
                                ? 'bg-[#FBEDEA] text-[#9E2A1B] border border-[#E9B8AE]'
                                : 'bg-[#F6F4EF] text-[#6B665C] border border-[#E4DFD4]'
                            }`}
                          >
                            {opened ? <Eye size={11} /> : <EyeOff size={11} />}
                            {opened ? `فتحه ${ago(Date.now() - l.openedAt!)}` : overdue ? 'مفتحوش' : 'لسه'}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#8C877D] flex items-center gap-1">
                          <Clock size={10} /> اتبعت {ago(Date.now() - l.sentAt)}
                          {opened && (l.opens || 0) > 1 ? ` · فتحه ${l.opens} مرات` : ''}
                        </p>

                        <div className="flex items-center gap-2">
                          {!opened && l.toPhone && (
                            <a
                              href={waLink(l.toPhone, `أهلاً ${l.toName} 👋\nبعتلك لينك قبل كده — تحب أساعدك فيه؟`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 rounded-lg bg-[#1FA85D] text-white text-[11px] font-bold text-center"
                            >
                              تابعه واتساب
                            </a>
                          )}
                          <button
                            onClick={async () => {
                              if (!window.confirm(`تشيل لينك ${l.toName} من المتابعة؟`)) return;
                              try { await deleteSentLink(l.id); setSent((s) => s.filter((x) => x.id !== l.id)); } catch { /* */ }
                            }}
                            className="px-2.5 py-2 rounded-lg bg-[#FBEDEA] border border-[#E9B8AE] text-[#C2412D] cursor-pointer"
                            aria-label="شيله"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default OwnerLinkCard;
