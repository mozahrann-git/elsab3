// Manateq Radar — الهيكل: الرأس، التنقّل، اللغة والسمة، واللوحة الجانبية للوحدة.
import { useCallback, useEffect, useState } from 'react';
import './radar.css';
import { radar, useRadar } from './store';
import { TeamAccess } from './TeamAccess';
import { LangCtx } from './ui';
import { UnitSheet } from './UnitSheet';
import { AskView, CriteriaView, DevelopersView, IntakeView, MapView, PulseView } from './views';
import type { Lang, RadarEvent } from './types';

type View = 'map' | 'pulse' | 'developers' | 'ask' | 'intake' | 'criteria';
const VIEWS: View[] = ['map', 'pulse', 'developers', 'ask', 'intake', 'criteria'];

const NAV: Record<View, { ar: string; en: string }> = {
  map: { ar: 'الخريطة', en: 'Map' },
  pulse: { ar: 'النبض', en: 'Pulse' },
  developers: { ar: 'المطوّرون', en: 'Developers' },
  ask: { ar: 'اسأل', en: 'Ask' },
  intake: { ar: 'الاستقبال', en: 'Intake' },
  criteria: { ar: 'المعايير', en: 'Standards' },
};

function readPref<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* */
  }
}

function viewFromHash(): View {
  const h = window.location.hash.replace('#', '') as View;
  return VIEWS.includes(h) ? h : 'map';
}

export default function RadarApp() {
  const [lang, setLang] = useState<Lang>(() => readPref('manateq-radar:lang', ['ar', 'en'], 'ar'));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readPref('manateq-radar:theme', ['dark', 'light'], 'dark'));
  const [view, setView] = useState<View>(viewFromHash);
  const [open, setOpen] = useState<RadarEvent | null>(null);
  const [dev, setDev] = useState<string | null>(null);
  const [askSeed, setAskSeed] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { showSeed, seed, error } = useRadar();
  const tx = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  useEffect(() => {
    const prev = { title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir, bg: document.body.style.background };
    document.title = 'Manateq Radar — مناطق';
    // خط الأرقام: IBM Plex Mono — كل رقم يُقرأ كقياس لا كإعلان.
    if (!document.getElementById('mr-mono')) {
      const l = document.createElement('link');
      l.id = 'mr-mono';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    }
    return () => {
      document.title = prev.title;
      document.documentElement.lang = prev.lang;
      document.documentElement.dir = prev.dir;
      document.body.style.background = prev.bg;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    writePref('manateq-radar:lang', lang);
  }, [lang]);

  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#0b0b0c' : '#f7f5f0';
    writePref('manateq-radar:theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((v: View) => {
    setView(v);
    if (window.location.hash !== `#${v}`) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${v}`);
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((s: string) => {
    setToastMsg(s);
    window.setTimeout(() => setToastMsg((m) => (m === s ? null : m)), 2400);
  }, []);

  const close = useCallback(() => setOpen(null), []);

  // خطأ الكتابة للسحابة لا يضيع بصمت
  useEffect(() => {
    if (!error) return;
    toast(error === 'permission-denied' ? tx('مالكش صلاحية على العملية دي', 'You do not have permission for that') : tx('ما اتحفظش — اتأكد من الاتصال وجرّب تاني', 'Not saved — check the connection and retry'));
    radar.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <LangCtx.Provider value={lang}>
      <div className="mr" data-theme={theme} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <div className="mr-shell">
          <header className="mr-top">
            <a className="mr-brand" href="#map" onClick={(e) => (e.preventDefault(), go('map'))}>
              <b>{tx('مناطق', 'Manateq')}</b>
              <i>RADAR</i>
            </a>
            <nav className="mr-nav" aria-label={tx('التنقّل', 'Navigation')}>
              {VIEWS.map((v) => (
                <button key={v} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>
                  {NAV[v][lang]}
                </button>
              ))}
            </nav>
            <div className="mr-tools">
              <TeamAccess toast={toast} />
              <button className="mr-chip-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={tx('English', 'العربية')}>
                {lang === 'ar' ? 'EN' : 'ع'}
              </button>
              <button className="mr-chip-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={tx('تبديل السمة', 'Toggle theme')}>
                {theme === 'dark' ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" fill="currentColor" /></svg>
                )}
              </button>
            </div>
          </header>

          {showSeed && seed.length > 0 && (
            <div className="mr-seed" role="note">
              <span className="mr-dot" style={{ background: 'var(--caution)' }} />
              <span>{tx('عيّنة تجريبية: الأرقام والرسائل للعرض حتى تمتلئ القاعدة برسائل حقيقية، وكل ختم يقولها صراحة.', 'Demo sample: numbers and messages are illustrative until real messages arrive — every stamp says so.')}</span>
              <button onClick={() => go('intake')}>{tx('أدخل رسالة حقيقية ←', 'Add a real message →')}</button>
            </div>
          )}

          <main>
            {view === 'map' && <MapView onOpen={setOpen} onDeveloper={(n) => (setDev(n), go('developers'))} />}
            {view === 'pulse' && <PulseView onOpen={setOpen} />}
            {view === 'developers' && <DevelopersView selected={dev} onSelect={setDev} onOpen={setOpen} onAsk={(q) => (setAskSeed(q), go('ask'))} />}
            {view === 'ask' && <AskView key={askSeed + lang} seedQuery={askSeed} onOpen={setOpen} />}
            {view === 'intake' && <IntakeView onOpen={setOpen} toast={toast} />}
            {view === 'criteria' && <CriteriaView />}
          </main>

          <footer className="mr-section" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span className="small muted">{tx('مناطق جهة تقييم، لا منصة إعلانات ولا وسيط.', 'Manateq is a rating body — not an ad platform, not a broker.')}</span>
            <span className="stamp">Manateq Radar · {tx('الأسعار قابلة للتغيير وتُراجَع قبل التعاقد', 'prices change; confirm before contracting')}</span>
          </footer>
        </div>

        {open && <UnitSheet key={open.id} event={open} onClose={close} onCriteria={() => (close(), go('criteria'))} toast={toast} />}
        {toastMsg && <div className="mr-toast" role="status">{toastMsg}</div>}
      </div>
    </LangCtx.Provider>
  );
}
