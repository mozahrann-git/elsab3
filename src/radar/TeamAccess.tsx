// Manateq Radar — دخول فريق السبع.
// Firebase لا يُحمَّل لأي زائر: يُحمَّل عند ضغط «دخول الفريق»، أو تلقائياً لمن دخل قبل كده من هذا الجهاز.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AuthStatus } from './cloud';
import { radar, useRadar } from './store';
import { useLang } from './ui';

const FLAG = 'manateq-radar:team';
type CloudModule = typeof import('./cloud');

function readFlag() {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}
function writeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    /* */
  }
}

const ROLE_NAME: Record<string, { ar: string; en: string }> = {
  admin: { ar: 'أدمن', en: 'Admin' },
  sales: { ar: 'سيلز', en: 'Sales' },
  coordinator: { ar: 'مسؤولة الملاك', en: 'Coordinator' },
  company_owner: { ar: 'الأونر — عرض فقط', en: 'Owner — view only' },
  marketing: { ar: 'ماركتنج — عرض فقط', en: 'Marketing — view only' },
};

export function TeamAccess({ toast }: { toast: (s: string) => void }) {
  const { lang, tx } = useLang();
  const { session, localPending } = useRadar();
  const mod = useRef<CloudModule | null>(null);
  const stop = useRef<() => void>(() => {});
  const [status, setStatus] = useState<AuthStatus>({ kind: 'signed-out' });
  const [open, setOpen] = useState<'login' | 'menu' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // بعد كلمة السر الصح لسه بنتأكد من الصلاحية: النتيجة بتيجي من connect
  const awaiting = useRef(false);

  const load = async (): Promise<CloudModule> => {
    if (mod.current) return mod.current;
    const m = await import('./cloud');
    mod.current = m;
    stop.current = m.connect((s) => {
      setStatus(s);
      if (s.kind === 'signed-in') writeFlag(true);
    });
    return m;
  };

  useEffect(() => {
    if (readFlag()) load().catch(() => setStatus({ kind: 'signed-out' }));
    return () => stop.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // «خارج» الأولى اللي بتيجي لحظة تحميل Firebase مش نتيجة الدخول — نستنى الحقيقية
    if (status.kind === 'checking' || status.kind === 'signed-out') return;
    const wasAwaiting = awaiting.current;
    awaiting.current = false;
    if (status.kind === 'signed-in' && wasAwaiting) {
      setOpen(null);
      toast(tx('اتصلت — كل ما تسجّله يظهر لكل الفريق', 'Connected — everything you record is shared with the team'));
    }
    if (status.kind === 'no-access') {
      setBusy(false);
      setOpen('login'); // الرسالة جوه النافذة نفسها، مع زر الخروج من الحساب
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const m = await load();
      awaiting.current = true;
      await m.signIn(email, password);
      setPassword('');
    } catch (ex) {
      awaiting.current = false;
      const code = (ex as { code?: string })?.code ?? '';
      setErr(
        code.includes('invalid') || code.includes('wrong-password') || code.includes('user-not-found')
          ? tx('البريد أو كلمة السر غير صحيحة', 'Wrong email or password')
          : code.includes('too-many')
            ? tx('محاولات كتير — استنى دقيقة', 'Too many attempts — wait a minute')
            : tx('تعذّر الاتصال — جرّب تاني', 'Could not connect — try again'),
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setOpen(null);
    writeFlag(false);
    await radar.signOut();
    toast(tx('خرجت — الرادار رجع للوضع المحلي', 'Signed out — back to local mode'));
  };

  const upload = async () => {
    try {
      const n = await radar.uploadLocal();
      toast(tx(`اترفعت ${n} رسالة للفريق`, `${n} messages shared with the team`));
    } catch {
      toast(tx('تعذّر الرفع — جرّب تاني', 'Upload failed — try again'));
    }
  };

  // الرأس فيه backdrop-filter، فأي عنصر fixed جواه بيتحسب بالنسبة له؛ النوافذ تتنقل لجذر مناطق
  const overlay = (node: unknown) => createPortal(node, (document.querySelector('.mr') as Element) ?? document.body);

  return (
    <>
      {session ? (
        <button className="mr-chip-btn" onClick={() => setOpen(open === 'menu' ? null : 'menu')} aria-expanded={open === 'menu'} style={{ fontFamily: 'var(--font-sans)' }}>
          <span className="mr-dot" style={{ background: 'var(--verdict-opportunity)' }} />
          {(session.name || session.email.split('@')[0]).split(' ')[0]}
        </button>
      ) : (
        <button className="mr-chip-btn" onClick={() => setOpen('login')} style={{ fontFamily: 'var(--font-sans)' }}>
          {status.kind === 'checking' ? '…' : tx('دخول الفريق', 'Team sign-in')}
        </button>
      )}

      {open === 'menu' && session && overlay(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 34 }} onClick={() => setOpen(null)} />
          <div className="mr-card mr-pop" role="menu">
            <p className="body-strong">{session.name || session.email}</p>
            <p className="stamp"><bdi>{session.email}</bdi> · <bdi>{ROLE_NAME[session.role]?.[lang] ?? session.role}</bdi></p>
            <p className="small muted" style={{ marginTop: 10 }}>{tx('متصل بقاعدة الفريق: الأحداث والطابور والردود مشتركة بين كل الأجهزة.', 'Connected to the team database: events, queue and replies are shared across devices.')}</p>
            {localPending > 0 && (
              <button className="mr-btn ghost" style={{ marginTop: 12, width: '100%' }} onClick={upload}>
                {tx(`ارفع ${localPending} رسالة محفوظة على الجهاز`, `Share ${localPending} messages saved on this device`)}
              </button>
            )}
            <button className="mr-btn ghost" style={{ marginTop: 8, width: '100%' }} onClick={signOut}>{tx('خروج', 'Sign out')}</button>
          </div>
        </>,
      )}

      {open === 'login' && overlay(
        <>
          <div className="mr-scrim" onClick={() => setOpen(null)} />
          <form className="mr-card lg mr-dialog" role="dialog" aria-modal="true" aria-labelledby="mr-login-title" onSubmit={submit}>
            <h2 id="mr-login-title" className="display-sm">{tx('دخول فريق السبع', 'Elsab3 team sign-in')}</h2>
            <p className="small muted" style={{ marginTop: 6 }}>
              {tx('نفس حسابك على الموقع. بعد الدخول كل رسالة تسجّلها تتحفظ في قاعدة الفريق وتظهر للكل.', 'Your usual site account. Once in, every message you record is saved to the team database.')}
            </p>
            {status.kind === 'no-access' && (
              <p className="mr-warn">{tx(`الحساب ${status.email} مالوش صلاحية على الرادار.`, `${status.email} has no radar access.`)}</p>
            )}
            <label className="label" htmlFor="mr-email" style={{ display: 'block', marginTop: 18 }}>{tx('البريد', 'Email')}</label>
            <input id="mr-email" className="mr-input" style={{ marginTop: 6 }} type="email" dir="ltr" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <label className="label" htmlFor="mr-pass" style={{ display: 'block', marginTop: 14 }}>{tx('كلمة السر', 'Password')}</label>
            <input id="mr-pass" className="mr-input" style={{ marginTop: 6 }} type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {err && <p className="mr-warn" role="alert">{err}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="mr-btn" type="submit" disabled={busy}>{busy ? tx('جارٍ الدخول…', 'Signing in…') : tx('ادخل', 'Sign in')}</button>
              <button className="mr-btn ghost" type="button" onClick={() => setOpen(null)}>{tx('إلغاء', 'Cancel')}</button>
            </div>
            {status.kind === 'no-access' && (
              <button className="mr-link" type="button" style={{ marginTop: 12 }} onClick={signOut}>{tx('اخرج من الحساب ده', 'Sign out of this account')}</button>
            )}
          </form>
        </>,
      )}
    </>
  );
}
