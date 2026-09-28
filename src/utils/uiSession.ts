import { safeLocalStorageGet, safeLocalStorageSet } from './storageHelper';

/*
  المتصفح على الموبايل بيقفل التاب لما الواحد يخرج لواتساب ويرجع،
  فالموقع كان بيفتح من الأول على الصفحة الرئيسية والشغل بيضيع.

  هنا بنحفظ "إنت كنت فين" ونرجّعه أول ما ترجع.
  بنحفظ الشاشة المفتوحة بس ومسوّدة الفورم — مفيش أي بيانات حساسة.
*/

const KEY = 'elsab3_ui_session';
const MAX_AGE = 8 * 3600 * 1000;   // بعد 8 ساعات بتبقى جلسة قديمة، مبنرجعهاش

export interface UiSession {
  screen?: 'crm' | 'admin' | 'sales_notifications' | null;
  portal?: 'owner' | 'broker' | 'coordinator' | 'company' | 'marketing' | 'sales_feedback' | null;
  at?: number;
}

export function saveUiSession(s: UiSession): void {
  try {
    const empty = !s.screen && !s.portal;
    if (empty) { safeLocalStorageSet(KEY, ''); return; }
    safeLocalStorageSet(KEY, JSON.stringify({ ...s, at: Date.now() }));
  } catch { /* الوضع الخاص */ }
}

export function loadUiSession(): UiSession | null {
  try {
    const raw = safeLocalStorageGet(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as UiSession;
    if (!s?.at || Date.now() - s.at > MAX_AGE) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearUiSession(): void {
  try { safeLocalStorageSet(KEY, ''); } catch { /* الوضع الخاص */ }
}

/* ---------- مسوّدات الفورم ---------- */

/** بيحفظ مسوّدة فورم عشان متضيعش لو المتصفح قفل التاب */
export function saveDraft(name: string, value: unknown): void {
  try { safeLocalStorageSet(`elsab3_draft_${name}`, JSON.stringify({ v: value, at: Date.now() })); } catch { /* الوضع الخاص */ }
}

export function loadDraft<T>(name: string, fallback: T): T {
  try {
    const raw = safeLocalStorageGet(`elsab3_draft_${name}`);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as { v: T; at: number };
    if (!p?.at || Date.now() - p.at > MAX_AGE) return fallback;
    return p.v ?? fallback;
  } catch {
    return fallback;
  }
}

export function clearDraft(name: string): void {
  try { safeLocalStorageSet(`elsab3_draft_${name}`, ''); } catch { /* الوضع الخاص */ }
}
