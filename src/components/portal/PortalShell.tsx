import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/*
  هيكل موحّد للبوابات: موبايل = تبويبات تحت، كمبيوتر = قائمة جانبية ثابتة ومحتوى واسع.
  بيغطي الشاشة كلها وبيوقف سكرول الصفحة اللي وراه.
*/
export interface ShellTab { key: string; label: string; icon: React.ReactNode; badge?: number }

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

const TONES = { gold: ['#D9B864', '#141414'], red: ['#F0776A', '#141414'], green: ['#7ED3A0', '#141414'] };

export const PortalShell: React.FC<Props> = ({ title, subtitle, logoUrl, badge, tabs, active, onTab, onClose, children, footer }) => {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[#F6F4EF] text-[#141414] flex flex-col lg:flex-row" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', Tahoma, sans-serif" }}>
      {/* قائمة جانبية للكمبيوتر */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-[#141414] text-white">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          {logoUrl ? <img src={logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-[#A07A26]" />}
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{title}</p>
            <p className="text-xs text-[#D9B864] truncate">{subtitle}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => onTab(t.key)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${active === t.key ? 'bg-white text-[#141414]' : 'text-[#CFCBC2] hover:bg-white/10'}`}>
              <span className="flex items-center gap-3">{t.icon}{t.label}</span>
              {!!t.badge && <span className="min-w-6 h-6 px-1.5 rounded-full bg-[#C2412D] text-white text-xs font-bold flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          {footer}
          <button onClick={onClose} className="w-full px-4 py-3 rounded-xl text-sm text-[#CFCBC2] hover:bg-white/10 text-right">← الرجوع للموقع</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        {/* هيدر الموبايل */}
        <header className="lg:hidden bg-[#141414] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-[#A07A26]" />}
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ fontFamily: "'Readex Pro', sans-serif" }}>{title}</p>
              <p className="text-xs text-[#D9B864] truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {badge && <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: TONES[badge.tone][0], color: TONES[badge.tone][1] }}>{badge.text}</span>}
            <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-5xl mx-auto p-4 lg:p-8 pb-28 lg:pb-10">{children}</div>
        </main>

        {/* تبويبات الموبايل */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#ECE8DF] grid z-10" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => onTab(t.key)} className="relative flex flex-col items-center gap-1 pt-2 pb-3 text-[11px]" style={{ color: active === t.key ? '#141414' : '#9A958B', fontWeight: active === t.key ? 700 : 500 }}>
              <span className="w-6 h-[3px] rounded-full" style={{ background: active === t.key ? '#A07A26' : 'transparent' }} />
              {t.icon}{t.label}
              {!!t.badge && <span className="absolute top-1.5 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-[#C2412D] text-white text-[9px] font-bold flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>,
    document.body
  );
};

export const Card: React.FC<{ className?: string; children: React.ReactNode; tone?: 'alert' | 'gold' | 'dark' }> = ({ className = '', children, tone }) => {
  const toneCls = tone === 'alert' ? 'border-[#E9B8AE] ring-4 ring-[#C2412D]/10' : tone === 'gold' ? 'bg-[#FBF8F1] border-[#E8D3A6]' : tone === 'dark' ? 'bg-[#141414] text-white border-transparent' : 'bg-white border-[#ECE8DF]';
  return <section className={`rounded-2xl border p-4 lg:p-5 flex flex-col gap-3 ${toneCls} ${className}`}>{children}</section>;
};

export const Chip: React.FC<{ tone: 'green' | 'red' | 'gold' | 'grey' | 'dark'; children: React.ReactNode }> = ({ tone, children }) => {
  const c = { green: ['#EEF5F0', '#1E7A45'], red: ['#FBEDEA', '#C2412D'], gold: ['#EFE6D2', '#6E5418'], grey: ['#F0ECE4', '#6B665C'], dark: ['#141414', '#FFFFFF'] }[tone];
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: c[0], color: c[1] }}>{children}</span>;
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'dark' | 'green' | 'blue' | 'gold' | 'light' | 'danger' }> = ({ tone = 'dark', className = '', ...p }) => {
  const c = { dark: 'bg-[#141414] text-white', green: 'bg-[#1E7A45] text-white', blue: 'bg-[#1F4E9C] text-white', gold: 'bg-[#A07A26] text-white', light: 'bg-[#F6F4EF] text-[#141414]', danger: 'bg-[#F6F4EF] text-[#C2412D]' }[tone];
  return <button {...p} className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${c} ${className}`} />;
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
