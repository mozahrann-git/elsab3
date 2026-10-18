import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, Settings2, Upload, X, Check, Loader2, AlertTriangle, Users } from 'lucide-react';
import { Lead, SalesAgent, ViewingRequest } from '../../types';
import {
  DailySettings, DEFAULT_DAILY_SETTINGS, DailyTargets, subscribeDailySettings, saveDailySettings,
  workDay, prevWorkDay, nextWorkDay, dayLabel, SalesDay, subscribeSalesDays, setDayOff,
  AdPost, subscribeAdsOfDay, subscribePendingAds, reviewAd, computeProgress, dayScore, Progress,
  uploadNumbers, numbersCalledOn, remainingNumbers, CallNumber, OUTCOME_LABEL, errText,
} from '../../services/dailyTasks';
import { ContentSlot, subscribeSlots, weekKey } from '../../services/salesToolsService';
import { PresenceCheck, subscribePresenceOfDay, summarize } from '../../services/presence';
import { thumbUrl } from '../../services/mediaStorage';
import { parseLine } from '../crm/CampaignLeadsModal';
import { Bar } from './DailyTab';

/*
  لوحة المهام للإدارة: كل سيلز وعمل إيه في اليوم، ومراجعة سكرين شوتات
  الإعلانات، ورفع أرقام المكالمات، والإعدادات.
*/

const n = (x: number) => Math.round(x || 0).toLocaleString('en-US');
const normPhone = (p: string) => String(p || '').replace(/\D/g, '').slice(-10);

const Cell: React.FC<{ done: number; target: number; sub?: string }> = ({ done, target, sub }) => (
  <div className="min-w-[88px] space-y-1">
    <p className="font-mono text-xs font-black">
      <span className={done >= target ? 'text-[#1E7A45]' : done >= target / 2 ? 'text-[#A07A26]' : 'text-[#C2412D]'}>{n(done)}</span>
      <span className="text-[#8C877D]">/{n(target)}</span>
    </p>
    <Bar done={done} target={target} />
    {sub && <p className="text-[10px] text-[#6B665C] font-bold leading-tight">{sub}</p>}
  </div>
);

interface Props {
  agents: SalesAgent[];
  leads: Lead[];
  viewingRequests?: ViewingRequest[];
  adminName: string;
}

export const DailyAdminBoard: React.FC<Props> = ({ agents, leads, viewingRequests, adminName }) => {
  const [settings, setSettings] = useState<DailySettings>(DEFAULT_DAILY_SETTINGS);
  const [err, setErr] = useState('');
  useEffect(() => subscribeDailySettings(setSettings, setErr), []);

  const today = workDay(Date.now(), settings.closeHour);
  const [day, setDay] = useState('');
  const shownDay = day || today;

  const [days, setDays] = useState<SalesDay[]>([]);
  const [ads, setAds] = useState<AdPost[]>([]);
  const [pending, setPending] = useState<AdPost[]>([]);
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  useEffect(() => subscribeSalesDays(shownDay, setDays, setErr), [shownDay]);
  useEffect(() => subscribeAdsOfDay(shownDay, setAds, setErr), [shownDay]);
  useEffect(() => subscribePendingAds(setPending, setErr), []);
  useEffect(() => subscribeSlots(setSlots), []);
  /* «إنت موجود؟» — اليوم بالتقويم (مش يوم الشغل المرحّل) */
  const [presence, setPresence] = useState<PresenceCheck[]>([]);
  useEffect(() => subscribePresenceOfDay(shownDay, setPresence), [shownDay]);
  const [nowT, setNowT] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowT(Date.now()), 60000); return () => clearInterval(t); }, []);

  const team = useMemo(
    () => agents.filter((a) => settings.agentIds.includes(a.id)).sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [agents, settings.agentIds],
  );
  const T = settings.targets;

  const rows = useMemo(() => team.map((a) => {
    const sd = days.find((d) => d.agentId === a.id) || null;
    const p = computeProgress({
      agentId: a.id, agentName: a.name, day: shownDay, closeHour: settings.closeHour,
      leads, salesDay: sd, ads, viewings: viewingRequests, slots,
      slotWeekKey: shownDay === today ? weekKey() : undefined,
    });
    return { a, p, score: dayScore(p, T) };
  }), [team, days, ads, leads, viewingRequests, slots, shownDay, settings.closeHour, T, today]);

  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [detail, setDetail] = useState<{ a: SalesAgent; p: Progress } | null>(null);
  const [shot, setShot] = useState<string>('');

  const toggleOff = async (a: SalesAgent, off: boolean) => {
    try { await setDayOff(a.id, a.name, shownDay, off, adminName); } catch (e) { setErr(errText(e)); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {err && (
        <p className="text-xs font-bold text-[#9E2A1B] bg-[#FBEDEA] border border-[#E9B8AE] rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </p>
      )}

      <div className="bg-white border border-[#ECE8DF] rounded-2xl p-3.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDay(prevWorkDay(shownDay))} className="p-2 rounded-xl bg-[#F6F4EF]"><ChevronRight size={16} /></button>
          <p className="font-bold text-sm min-w-[120px] text-center">{dayLabel(shownDay)}{shownDay === today ? ' · النهارده' : ''}</p>
          <button disabled={shownDay >= today} onClick={() => setDay(nextWorkDay(shownDay))} className="p-2 rounded-xl bg-[#F6F4EF] disabled:opacity-30"><ChevronLeft size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="px-3 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"><Upload size={14} />ارفع أرقام</button>
          <button onClick={() => setShowSettings(true)} className="px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold flex items-center gap-1.5"><Settings2 size={14} />الإعدادات</button>
        </div>
      </div>

      {!team.length && (
        <div className="bg-[#FBF1E4] border border-[#E8D3A6] rounded-2xl p-4 text-sm font-bold text-[#7A5E12] flex items-center justify-between gap-2 flex-wrap">
          مفيش سيلز داخلين المهام لسه — اختارهم من الإعدادات.
          <button onClick={() => setShowSettings(true)} className="px-3 py-2 rounded-xl bg-[#141414] text-white text-xs">اختار السيلز</button>
        </div>
      )}

      {team.length > 0 && (
        <div className="bg-white border border-[#ECE8DF] rounded-2xl overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F6F4EF] text-[#6B665C]">
              <tr>
                {['السيلز', 'الإنجاز', 'موجود؟', 'مكالمات', 'طلبات', 'إعلانات', 'متابعات', 'معاينات الأسبوع', 'فيديو الأسبوع', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, p, score }) => (
                <tr key={a.id} className="border-t border-[#F0ECE4] align-top">
                  <td className="px-3 py-3 font-bold whitespace-nowrap">
                    <button onClick={() => setDetail({ a, p })} className="underline decoration-dotted">{a.name}</button>
                    {p.off && <span className="block text-[10px] text-[#1F5C8B]">إجازة</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono font-black text-sm ${p.off ? 'text-[#8C877D]' : score >= 100 ? 'text-[#1E7A45]' : score >= 50 ? 'text-[#A07A26]' : 'text-[#C2412D]'}`}>{p.off ? '—' : `${score}%`}</span>
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      if (p.off) return <span className="text-[#8C877D]">—</span>;
                      const ps = summarize(a.id, shownDay, settings.startHour, settings.closeHour, presence, nowT);
                      if (!ps.due) return <span className="text-[10px] text-[#8C877D]">لسه</span>;
                      const tone = ps.missed === 0 && (ps.avgDelay ?? 0) <= 10 ? 'text-[#1E7A45]' : ps.answered === 0 ? 'text-[#C2412D]' : 'text-[#A07A26]';
                      return (
                        <div className="space-y-0.5 whitespace-nowrap">
                          <p className={`font-mono font-bold ${tone}`}>{ps.answered} / {ps.due}</p>
                          <p className="text-[10px] text-[#6B665C]">
                            {ps.avgDelay !== null ? `بيرد في ${ps.avgDelay} د` : 'مارّدش خالص'}
                            {ps.missed ? ` · فاته ${ps.missed}` : ''}
                          </p>
                          {ps.waiting && <p className="text-[10px] font-bold text-[#C2412D]">مستني رده دلوقتي</p>}
                          {ps.lastAt && <p className="text-[10px] text-[#8C877D]">آخر رد {new Date(ps.lastAt).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' })}</p>}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3"><Cell done={p.calls.done} target={T.calls} sub={`رد ${p.calls.answered} · مهتم ${p.calls.interested}`} /></td>
                  <td className="px-3 py-3"><Cell done={p.requests.done} target={T.requests} sub={`مهم ${p.requests.important} · محيّر ${p.requests.undecided}`} /></td>
                  <td className="px-3 py-3"><Cell done={p.ads.done} target={T.ads} sub={`ريسيل ${p.ads.resale} · إنشاء ${p.ads.offplan}${p.ads.pending ? ` · مستني ${p.ads.pending}` : ''}`} /></td>
                  <td className="px-3 py-3"><Cell done={p.followUps.done} target={p.followUps.done + p.followUps.left} sub={p.followUps.left ? `فاضل ${p.followUps.left}` : ''} /></td>
                  <td className="px-3 py-3"><Cell done={p.viewingsWeek} target={T.viewingsWeek} /></td>
                  <td className="px-3 py-3"><Cell done={p.videosWeek} target={T.videosWeek} /></td>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleOff(a, !p.off)} className="px-2 py-1 rounded-lg bg-[#F6F4EF] border border-[#ECE8DF] text-[10px] font-bold whitespace-nowrap">
                      {p.off ? 'شيل الإجازة' : 'إجازة'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مراجعة الإعلانات */}
      <div className="bg-white border border-[#ECE8DF] rounded-2xl p-4 space-y-3">
        <p className="font-bold text-sm">إعلانات مستنية مراجعة ({pending.length})</p>
        {!pending.length && <p className="text-xs text-[#8C877D]">مفيش حاجة مستنية.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((ad) => <ReviewCard key={ad.id} ad={ad} adminName={adminName} onShot={setShot} onErr={setErr} />)}
        </div>
      </div>

      {showSettings && <SettingsModal settings={settings} agents={agents} onClose={() => setShowSettings(false)} />}
      {showUpload && <UploadModal agents={agents} settings={settings} leads={leads} onClose={() => setShowUpload(false)} />}
      {detail && <AgentDayModal a={detail.a} p={detail.p} day={shownDay} ads={ads.filter((x) => x.agentId === detail.a.id)} onShot={setShot} onClose={() => setDetail(null)} />}
      {shot && createPortal(
        <div className="fixed inset-0 z-[140] bg-black/85 flex items-center justify-center p-4" onClick={() => setShot('')}>
          <img src={shot} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>, document.body)}
    </div>
  );
};

const ReviewCard: React.FC<{ ad: AdPost; adminName: string; onShot: (u: string) => void; onErr: (m: string) => void }> = ({ ad, adminName, onShot, onErr }) => {
  const [busy, setBusy] = useState(false);
  const act = async (ok: boolean) => {
    let reason = '';
    if (!ok) {
      reason = (window.prompt('سبب الرفض؟ (السيلز هيشوفه)') || '').trim();
      if (!reason) return;
    }
    setBusy(true);
    try { await reviewAd(ad.id, ok, adminName, reason); } catch (e) { onErr(errText(e)); setBusy(false); }
  };
  return (
    <div className="border border-[#ECE8DF] rounded-xl overflow-hidden">
      <button onClick={() => onShot(ad.shotUrl)} className="block w-full h-40 bg-[#F6F4EF]">
        <img src={thumbUrl(ad.shotUrl, 500)} alt="" className="w-full h-full object-cover" loading="lazy" />
      </button>
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-bold">{ad.agentName} · <span className="font-mono">{ad.code}</span> · {ad.kind === 'resale' ? 'ريسيل' : 'تحت الإنشاء'}</p>
        <p className="text-[10px] text-[#6B665C]">{dayLabel(ad.day)} · {ad.title}</p>
        {ad.postUrl && <a href={ad.postUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#1F5C8B] underline break-all">لينك البوست</a>}
        <div className="grid grid-cols-2 gap-1.5">
          <button disabled={busy} onClick={() => act(true)} className="py-1.5 rounded-lg bg-[#1E7A45] text-white text-xs font-bold disabled:opacity-50">اقبل</button>
          <button disabled={busy} onClick={() => act(false)} className="py-1.5 rounded-lg bg-[#FBEDEA] text-[#C2412D] text-xs font-bold disabled:opacity-50">ارفض</button>
        </div>
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => createPortal(
  <div className="fixed inset-0 z-[130] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
    <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-[#ECE8DF] flex items-center justify-between">
        <p className="font-bold text-sm">{title}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F4EF]"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  </div>,
  document.body,
);

const TARGET_FIELDS: [keyof DailyTargets, string][] = [
  ['calls', 'مكالمات في اليوم'], ['requests', 'طلبات في اليوم'], ['requestsImportant', 'منهم مهم (للتنبيه)'],
  ['adsResale', 'إعلانات ريسيل في اليوم'], ['adsOffPlan', 'إعلانات تحت الإنشاء في اليوم'],
  ['viewingsWeek', 'معاينات في الأسبوع'], ['videosWeek', 'فيديوهات في الأسبوع'],
];

const SettingsModal: React.FC<{ settings: DailySettings; agents: SalesAgent[]; onClose: () => void }> = ({ settings, agents, onClose }) => {
  const [ids, setIds] = useState<string[]>(settings.agentIds);
  const [t, setT] = useState<DailyTargets>(settings.targets);
  const [close, setClose] = useState(settings.closeHour);
  const [start, setStart] = useState(settings.startHour);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const list = agents.filter((a) => a.isActive !== false || ids.includes(a.id));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await saveDailySettings({ agentIds: ids, targets: { ...t, ads: (t.adsResale || 0) + (t.adsOffPlan || 0) }, closeHour: close, startHour: start });
      onClose();
    } catch (e) { setErr(errText(e)); setBusy(false); }
  };

  return (
    <Modal title="إعدادات المهام" onClose={onClose}>
      <p className="text-xs font-bold text-[#6B665C] flex items-center gap-1.5"><Users size={14} />مين داخل المهام ({ids.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((a) => {
          const on = ids.includes(a.id);
          return (
            <button key={a.id} onClick={() => setIds((x) => (on ? x.filter((y) => y !== a.id) : [...x, a.id]))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>
              {on && <Check size={11} className="inline ml-1" />}{a.name}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#8C877D]">الشقق بتتوزع على اللي مختارين بس. لو غيّرت الاختيار، التوزيع بيتغيّر.</p>

      <div className="grid grid-cols-2 gap-2">
        {TARGET_FIELDS.map(([k, l]) => (
          <label key={k} className="text-[11px] font-bold text-[#6B665C] space-y-1">
            {l}
            <input type="number" min={0} value={t[k]} onChange={(e) => setT({ ...t, [k]: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm font-mono text-[#141414]" />
          </label>
        ))}
        <label className="text-[11px] font-bold text-[#6B665C] space-y-1">
          الشغل بيبدأ الساعة (تذكير «موجود؟» من بعدها)
          <input type="number" min={6} max={14} value={start} onChange={(e) => setStart(Math.min(14, Math.max(6, Number(e.target.value) || 11)))}
            className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm font-mono text-[#141414]" />
        </label>
        <label className="text-[11px] font-bold text-[#6B665C] space-y-1">
          اليوم بيتقفل الساعة (٢٤ ساعة)
          <input type="number" min={12} max={24} value={close} onChange={(e) => setClose(Math.min(24, Math.max(12, Number(e.target.value) || 19)))}
            className="w-full px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm font-mono text-[#141414]" />
        </label>
      </div>
      <p className="text-[11px] text-[#8C877D]">الجمعة إجازة ثابتة — أي شغل يوم الجمعة بيتحسب على السبت.</p>
      {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
      <button disabled={busy} onClick={save} className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm disabled:opacity-50">{busy ? 'بيحفظ…' : 'احفظ'}</button>
    </Modal>
  );
};

const UploadModal: React.FC<{ agents: SalesAgent[]; settings: DailySettings; leads: Lead[]; onClose: () => void }> = ({ agents, settings, leads, onClose }) => {
  const [text, setText] = useState('');
  const [batch, setBatch] = useState('');
  const [ids, setIds] = useState<string[]>(settings.agentIds);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<{ added: number; dupes: number; clients: number } | null>(null);
  const [left, setLeft] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const team = agents.filter((a) => settings.agentIds.includes(a.id));

  useEffect(() => {
    team.forEach((a) => remainingNumbers(a.id).then((c) => setLeft((m) => ({ ...m, [a.id]: c }))).catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res]);

  const rows = useMemo(() => {
    const out: { phone: string; name?: string }[] = [];
    text.split(/\r?\n/).forEach((line) => {
      const p = parseLine(line);
      if (p) out.push({ phone: p.phone, name: p.name === 'عميل من الكامبين' ? '' : p.name });
    });
    return out;
  }, [text]);
  const bad = useMemo(() => text.split(/\r?\n/).filter((l) => l.trim() && !parseLine(l)).length, [text]);

  const readSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
      const grid: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      const lines = grid.map((r) => r.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ')).filter(Boolean);
      setText((p) => (p ? `${p}\n${lines.join('\n')}` : lines.join('\n')));
      if (!batch) setBatch(file.name.replace(/\.[^.]+$/, ''));
    } catch (er: any) { setErr(`مقدرتش أقرا الملف — ${er?.message || ''}`); }
  };

  const go = async () => {
    setBusy(true); setErr(''); setRes(null);
    try {
      const chosen = agents.filter((a) => ids.includes(a.id)).map((a) => ({ id: a.id, name: a.name }));
      const known = new Set<string>(leads.map((l) => normPhone(l.phone)));
      const r = await uploadNumbers(rows, chosen, batch.trim() || `دفعة ${new Date().toLocaleDateString('en-GB')}`, known);
      setRes(r); setText('');
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="رفع أرقام المكالمات" onClose={onClose}>
      {team.length > 0 && (
        <div className="bg-[#F6F4EF] rounded-xl p-3 text-[11px] font-bold text-[#6B665C] space-y-1">
          <p>الأرقام الجديدة اللي لسه مع كل واحد:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {team.map((a) => <span key={a.id}>{a.name}: <b className="text-[#141414] font-mono">{left[a.id] ?? '…'}</b></span>)}
          </div>
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7}
        placeholder={'الصق الأسماء والأرقام — كل واحد في سطر\nأحمد 01012345678\n01198765432'}
        className="w-full px-3 py-2.5 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-sm" />
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={readSheet} />
        <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-[#F6F4EF] border border-[#ECE8DF] text-xs font-bold flex items-center gap-1.5"><Upload size={13} />أو ارفع شيت</button>
        <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="اسم الدفعة (مثلاً: كامبين سبتمبر)"
          className="flex-1 px-3 py-2 bg-[#F6F4EF] border border-[#ECE8DF] rounded-xl text-xs" />
      </div>
      <p className="text-[11px] font-bold text-[#6B665C]">
        {rows.length} رقم{bad ? ` · ${bad} سطر من غير رقم صح (هيتشال)` : ''} · الرقم المتكرر أو اللي عميل عندنا مش هيتوزع
      </p>

      <p className="text-xs font-bold text-[#6B665C]">يتوزعوا بالتساوي على:</p>
      <div className="flex flex-wrap gap-1.5">
        {agents.filter((a) => a.isActive !== false).map((a) => {
          const on = ids.includes(a.id);
          return (
            <button key={a.id} onClick={() => setIds((x) => (on ? x.filter((y) => y !== a.id) : [...x, a.id]))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${on ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#E4DFD4]'}`}>{a.name}</button>
          );
        })}
      </div>

      {err && <p className="text-xs font-bold text-[#C2412D]">{err}</p>}
      {res && (
        <p className="text-xs font-bold text-[#1E7A45] bg-[#EEF5F0] rounded-xl p-3">
          اتوزع {res.added} رقم{res.dupes ? ` · ${res.dupes} متكرر اتشال` : ''}{res.clients ? ` · ${res.clients} عملاء عندنا أصلاً اتشالوا` : ''}
        </p>
      )}
      <button disabled={busy || !rows.length || !ids.length} onClick={go}
        className="w-full py-3 rounded-xl bg-[#141414] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={15} className="animate-spin" />بيوزّع…</> : `وزّع ${rows.length} رقم على ${ids.length} سيلز`}
      </button>
    </Modal>
  );
};

const AgentDayModal: React.FC<{ a: SalesAgent; p: Progress; day: string; ads: AdPost[]; onShot: (u: string) => void; onClose: () => void }> = ({ a, p, day, ads, onShot, onClose }) => {
  const [calls, setCalls] = useState<CallNumber[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { numbersCalledOn(a.id, day).then(setCalls).catch((e) => { setCalls([]); setErr(errText(e)); }); }, [a.id, day]);

  return (
    <Modal title={`${a.name} · ${dayLabel(day)}`} onClose={onClose}>
      <p className="text-xs font-bold">الطلبات ({p.requests.done})</p>
      {p.requests.leads.length ? p.requests.leads.map((l) => (
        <p key={l.id} className="text-xs flex items-center justify-between bg-[#F6F4EF] rounded-lg px-2.5 py-1.5">
          {l.name}
          <span className={`text-[10px] font-bold ${l.priority === 'important' ? 'text-[#1E7A45]' : l.priority === 'undecided' ? 'text-[#A07A26]' : 'text-[#8C877D]'}`}>
            {l.priority === 'important' ? 'مهم' : l.priority === 'undecided' ? 'محيّر' : 'من غير تصنيف'}
          </span>
        </p>
      )) : <p className="text-[11px] text-[#8C877D]">مفيش</p>}

      <p className="text-xs font-bold pt-2">الإعلانات ({ads.length})</p>
      <div className="grid grid-cols-3 gap-2">
        {ads.map((ad) => (
          <button key={ad.id} onClick={() => onShot(ad.shotUrl)} className="text-right border border-[#ECE8DF] rounded-lg overflow-hidden">
            <img src={thumbUrl(ad.shotUrl, 300)} alt="" className="w-full h-20 object-cover" loading="lazy" />
            <p className="text-[10px] font-bold px-1.5 py-1">{ad.code} · {ad.status === 'approved' ? '✓' : ad.status === 'pending' ? 'مستني' : 'مرفوض'}</p>
          </button>
        ))}
      </div>
      {!ads.length && <p className="text-[11px] text-[#8C877D]">مفيش</p>}

      <p className="text-xs font-bold pt-2">المكالمات ({p.calls.done})</p>
      {err && <p className="text-[11px] text-[#C2412D]">{err}</p>}
      {calls === null ? <p className="text-[11px] text-[#8C877D]">بيحمّل…</p> : calls.length ? calls.map((c) => (
        <div key={c.id} className="text-xs bg-[#F6F4EF] rounded-lg px-2.5 py-1.5">
          <div className="flex items-center justify-between">
            <span>{c.name || '—'} <span className="font-mono text-[10px] text-[#6B665C]" dir="ltr">{c.phone}</span></span>
            <span className={`text-[10px] font-bold ${c.status === 'interested' ? 'text-[#1E7A45]' : c.status === 'wrong' ? 'text-[#C2412D]' : 'text-[#6B665C]'}`}>
              {c.status === 'pending' ? '' : OUTCOME_LABEL[c.status]}
            </span>
          </div>
          {c.lastNote && <p className="text-[10px] text-[#6B665C]">{c.lastNote}</p>}
        </div>
      )) : <p className="text-[11px] text-[#8C877D]">مفيش</p>}
      <p className="text-[10px] text-[#8C877D]">القايمة بتوري آخر نتيجة لكل رقم اتكلّم في اليوم ده.</p>
    </Modal>
  );
};

export default DailyAdminBoard;
