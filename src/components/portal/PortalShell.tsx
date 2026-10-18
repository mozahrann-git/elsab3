import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LionLogo } from '../LionLogo';

/*
  هيكل موحّد للبوابات: موبايل = تبويبات تحت، كمبيوتر = قائمة جانبية ثابتة ومحتوى واسع.
  بيغطي الشاشة كلها وبيوقف سكرول الصفحة اللي وراه.
*/
export interface ShellTab { key: string; label: string; icon: React.ReactNode; badge?: number; hint?: string }

interface Props {
  title: string;
  subtitle: string;
  logoUrl?: string;
  badge?: { text: string; tone: 'gold' | 'red' | 'green' };
  tabs: ShellTab[];
  active: string;
  onTab: (k: string) => void;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const TONES = { gold: ['#E9C46A', '#17150F'], red: ['#D3262B', '#FFFFFF'], green: ['#7ED3A0', '#17150F'] };
const Mark: React.FC<{ logoUrl?: string; size: number }> = ({ logoUrl, size }) => (
  logoUrl
    ? <img src={logoUrl} alt="" className="rounded-2xl object-cover shrink-0 bg-white/10" style={{ width: size, height: size }} />
    : <span className="shrink-0"><LionLogo size={size} withText={false} withSubtitle={false} /></span>
);

export const PortalShell: React.FC<Props> = ({ title, subtitle, logoUrl, badge, tabs, active, onTab, onClose, children, footer }) => {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    /* نفس ثيم غرفة العمليات: الألوان والحواف والخانات */
    document.body.classList.add('crm-skin');
    return () => { document.body.style.overflow = prev; document.body.classList.remove('crm-skin'); };
  }, []);
  const mainRef = React.useRef<HTMLElement>(null);
  const go = (k: string) => { onTab(k); mainRef.current?.scrollTo({ top: 0 }); };
  const cur = tabs.find((t) => t.key === active);

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[#F5F0E6] text-[#17150F] flex flex-col lg:flex-row" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', Tahoma, sans-serif" }}>
      {/* قائمة جانبية للكمبيوتر */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-[#17150F] text-white">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <Mark logoUrl={logoUrl} size={44} />
          <div className="min-w-0">
            <p className="font-readex font-semibold truncate">{title}</p>
            <p className="text-xs text-[#D9B864] truncate">{subtitle}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => go(t.key)}
              className={`w-full flex items-center justify-between gap-3 px-4 h-12 rounded-[14px] text-sm font-semibold transition ${active === t.key ? 'bg-[#F5F0E6] text-[#17150F]' : 'text-[#CFCBC2] hover:bg-white/[.07]'}`}>
              <span className="flex items-center gap-3">{t.icon}{t.label}</span>
              {!!t.badge && <span className="min-w-6 h-6 px-1.5 rounded-full bg-[#D3262B] text-white text-xs font-bold flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          {footer}
          <button onClick={onClose} className="w-full px-4 h-11 rounded-[14px] text-sm text-[#CFCBC2] hover:bg-white/[.07] text-right">← الرجوع للموقع</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        {/* هيدر الموبايل — شريط واحد رفيع */}
        <header className="lg:hidden bg-[#17150F] text-white px-3 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mark logoUrl={logoUrl} size={34} />
            <div className="min-w-0">
              <p className="font-readex font-semibold text-[14px] leading-tight truncate">{title}</p>
              <p className="text-[11px] text-[#D9B864] truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && <span className="text-[11px] font-bold px-2.5 h-7 inline-flex items-center rounded-full" style={{ background: TONES[badge.tone][0], color: TONES[badge.tone][1] }}>{badge.text}</span>}
            <button onClick={onClose} aria-label="إغلاق" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><X size={18} /></button>
          </div>
        </header>

        <main ref={mainRef} className="isolate relative flex-1 overflow-y-auto overscroll-contain">
          {/* اللوجو علامة مائية في نص الشاشة */}
          <div aria-hidden="true" className="pointer-events-none select-none fixed flex items-center justify-center" style={{ zIndex: -1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(72vw, 520px)', aspectRatio: '1 / 1', opacity: 0.06, filter: 'invert(1) grayscale(1)', mixBlendMode: 'multiply' }}>
            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <LionLogo size={520} className="w-full h-full" />}
          </div>
          <div className="max-w-5xl mx-auto px-4 pt-5 lg:p-8 pb-32 lg:pb-10">
            {cur && (
              <div className="mb-4 lg:mb-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-readex font-semibold text-[24px] lg:text-[30px] leading-tight">{cur.label}</h1>
                  {cur.hint && <p className="text-[12.5px] text-[#6F695D] mt-1 leading-relaxed">{cur.hint}</p>}
                </div>
                {!!cur.badge && <span className="shrink-0 h-8 px-3 rounded-full bg-[#D3262B] text-white text-[12px] font-bold inline-flex items-center">{cur.badge} مستني</span>}
              </div>
            )}
            {children}
          </div>
        </main>

        {/* تبويبات الموبايل — شريط عايم تحت، بيتسحب لو كتير */}
        <nav className="lg:hidden fixed inset-x-3 z-10 rounded-[24px] bg-[#17150F] shadow-[0_18px_40px_-12px_rgba(23,21,15,.55)] p-1.5"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const on = active === t.key;
              return (
                <button key={t.key} onClick={() => go(t.key)}
                  className={`relative flex-1 min-w-[58px] flex flex-col items-center justify-center gap-1 h-[54px] px-1.5 rounded-[18px] text-[10.5px] whitespace-nowrap transition ${on ? 'bg-[#F5F0E6] text-[#17150F] font-bold' : 'text-[#A8A196] font-medium'}`}>
                  {t.icon}
                  <span className="leading-none">{t.label}</span>
                  {!!t.badge && <span className="absolute top-1 left-1/2 ml-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D3262B] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#17150F]">{t.badge}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>,
    document.body
  );
};

export const Card: React.FC<{ className?: string; children: React.ReactNode; tone?: 'alert' | 'gold' | 'dark' }> = ({ className = '', children, tone }) => {
  const toneCls = tone === 'alert' ? 'bg-[#FFFDF8] border-[#EBC1BC] shadow-[inset_-4px_0_0_#D3262B]'
    : tone === 'gold' ? 'bg-[#FBF5E6] border-[#EBDDB8]'
    : tone === 'dark' ? 'bg-[#17150F] text-white border-transparent'
    : 'bg-[#FFFDF8] border-[#E7DFCF]';
  return <section className={`rounded-[24px] border p-4 lg:p-5 flex flex-col gap-3 ${toneCls} ${className}`}>{children}</section>;
};

export const Chip: React.FC<{ tone: 'green' | 'red' | 'gold' | 'grey' | 'dark' | 'blue'; children: React.ReactNode }> = ({ tone, children }) => {
  const c = { green: ['#E9F2EC', '#22483A'], red: ['#FBECEA', '#B3261E'], gold: ['#F6EBCF', '#7A5E12'], grey: ['#EFE9DD', '#6F695D'], dark: ['#17150F', '#FFFFFF'], blue: ['#E7EEF9', '#1F4E9C'] }[tone];
  return <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: c[0], color: c[1] }}>{children}</span>;
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'dark' | 'green' | 'blue' | 'gold' | 'light' | 'danger' }> = ({ tone = 'dark', className = '', ...p }) => {
  const c = { dark: 'bg-[#17150F] text-[#F5F0E6]', green: 'bg-[#22483A] text-white', blue: 'bg-[#1F4E9C] text-white', gold: 'bg-[#A9842F] text-white', light: 'bg-[#F1EADC] text-[#17150F]', danger: 'bg-[#FBECEA] text-[#B3261E]' }[tone];
  return <button {...p} className={`min-h-[48px] rounded-[16px] px-4 py-2.5 text-[13.5px] font-bold flex items-center justify-center gap-2 transition active:scale-[.98] disabled:opacity-45 ${c} ${className}`} />;
};

export const fmt = (n?: number) => (n ? Math.round(n).toLocaleString('en-US') : '0');
export const since = (ms?: number) => {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'دلوقتي';
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} س` : `${Math.round(h / 24)} يوم`;
};
