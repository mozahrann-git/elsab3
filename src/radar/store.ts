// Manateq Radar — الذاكرة.
// وضعان: «سحابي» لفريق السبع بعد تسجيل الدخول (Firestore، مشترك بين كل الأجهزة)،
// و«محلي» لأي زائر (العيّنة + ما يُدخله على جهازه). المحلّل والمحرّك واحد في الوضعين.
// زرّ الإيقاف لا يُضيّع رسالة: الرسائل تتراكم في الطابور وتُقرأ عند التشغيل.
import { useSyncExternalStore } from 'react';
import { SEED_MESSAGES } from './data';
import { ingest } from './parser';
import type { DeveloperReply, RadarEvent } from './types';

const KEY = 'manateq-radar:v1';

export interface QueuedMessage {
  id: string;
  raw: string;
  sender: string;
  at: string;
}

/** من يقرأ الرادار، ومن يُغذّيه — نفس الأدوار في firestore.rules. */
export const READ_ROLES = ['admin', 'sales', 'coordinator', 'company_owner', 'marketing'];
export const WRITE_ROLES = ['admin', 'sales', 'coordinator'];

/** هل يقدر صاحب الجلسة يسجّل ويوقف ويرد؟ الزائر المحلي يكتب على جهازه دائماً. */
export function canWrite(s: { mode: 'local' | 'cloud'; session: Session | null }): boolean {
  return s.mode === 'local' || (!!s.session && WRITE_ROLES.includes(s.session.role));
}

/** مسح حدث: في السحابة لصاحبه أو للأدمن فقط (زي القواعد). */
export function canRemove(s: { mode: 'local' | 'cloud'; session: Session | null }, e: RadarEvent): boolean {
  if (s.mode === 'local') return true;
  return !!s.session && (s.session.role === 'admin' || (WRITE_ROLES.includes(s.session.role) && e.createdBy === s.session.email));
}

export interface Session {
  email: string;
  name?: string;
  role: string;
}

/** ما يحتاجه المتجر من السحابة — cloud.ts ينفّذه، والاختبارات تقدر تبدّله. */
export interface CloudBackend {
  addEvent(e: RadarEvent): Promise<void>;
  removeEvent(id: string): Promise<void>;
  setReply(r: DeveloperReply): Promise<void>;
  setPaused(paused: boolean): Promise<void>;
  enqueue(q: QueuedMessage): Promise<void>;
  /** يكتب أحداث الطابور ويمسح رسائله في دفعة واحدة. */
  drain(events: RadarEvent[], queueIds: string[]): Promise<void>;
  signOut(): Promise<void>;
}

export interface CloudSnapshot {
  events: RadarEvent[];
  replies: DeveloperReply[];
  queue: QueuedMessage[];
  paused: boolean;
}

interface Persisted {
  events: RadarEvent[];
  queue: QueuedMessage[];
  paused: boolean;
  replies: DeveloperReply[];
  showSeed: boolean;
}

export interface RadarState extends Persisted {
  seed: RadarEvent[];
  /** كل الأحداث المعروضة، الأحدث أولاً. */
  all: RadarEvent[];
  mode: 'local' | 'cloud';
  session: Session | null;
  /** رسائل محفوظة على هذا الجهاز من قبل تسجيل الدخول، تنتظر الرفع. */
  localPending: number;
  /** آخر خطأ في الكتابة للسحابة، يظهر للمستخدم بدل أن يضيع بصمت. */
  error: string | null;
}

function buildSeed(now: number): RadarEvent[] {
  const ordered = [...SEED_MESSAGES].sort((a, b) => b.ago - a.ago);
  const out: RadarEvent[] = [];
  for (const m of ordered) {
    out.push(ingest(m.text, { sender: m.sender, receivedAt: new Date(now - m.ago * 3_600_000).toISOString(), history: out, seed: true }));
  }
  return out;
}

function loadLocal(): Persisted {
  const empty: Persisted = { events: [], queue: [], paused: false, replies: [], showSeed: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      events: Array.isArray(p.events) ? p.events : [],
      queue: Array.isArray(p.queue) ? p.queue.map((q, i) => ({ ...q, id: q.id ?? `q_${i}_${q.at}` })) : [],
      paused: !!p.paused,
      replies: Array.isArray(p.replies) ? p.replies : [],
      showSeed: p.showSeed !== false,
    };
  } catch {
    return empty;
  }
}

function saveLocal(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* التخزين غير متاح: تستمر الجلسة في الذاكرة */
  }
}

let seed: RadarEvent[] = [];
let local: Persisted | null = null;
let cloud: { backend: CloudBackend; session: Session; snap: CloudSnapshot } | null = null;
let error: string | null = null;
let state: RadarState | null = null;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!local) {
    seed = buildSeed(Date.now());
    local = loadLocal();
  }
}

function compose(): RadarState {
  ensureInit();
  const l = local!;
  const src: Persisted = cloud ? { ...cloud.snap, showSeed: l.showSeed } : l;
  const all = [...(src.showSeed ? seed : []), ...src.events].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return {
    ...src,
    seed,
    all,
    mode: cloud ? 'cloud' : 'local',
    session: cloud?.session ?? null,
    localPending: cloud ? l.events.length : 0,
    error,
  };
}

function emit() {
  state = compose();
  listeners.forEach((fn) => fn());
}

function setLocal(next: Persisted) {
  local = next;
  saveLocal(next);
  emit();
}

function fail(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  error = code === 'permission-denied' ? 'permission-denied' : 'write-failed';
  emit();
}

function cloudWrite(p: Promise<void>) {
  error = null;
  p.catch(fail);
}

let seq = 0;
function queueId() {
  seq = (seq + 1) % 1e6;
  return `q_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function get(): RadarState {
  if (!state) state = compose();
  return state;
}

export const radar = {
  get,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** يستقبل رسالة: تُقرأ فوراً، أو تنتظر في الطابور لو التشغيل موقوف. */
  receive(raw: string, sender: string): RadarEvent | null {
    ensureInit();
    const at = new Date().toISOString();
    const s = get();
    if (s.paused) {
      const q: QueuedMessage = { id: queueId(), raw, sender, at };
      if (cloud) cloudWrite(cloud.backend.enqueue(q));
      else setLocal({ ...local!, queue: [...local!.queue, q] });
      return null;
    }
    const ev = ingest(raw, { sender, receivedAt: at, history: s.all });
    if (cloud) {
      ev.createdBy = cloud.session.email;
      // الكتابة المحلية في Firestore فورية، فالحدث يظهر قبل وصول التأكيد من الخادم.
      cloudWrite(cloud.backend.addEvent(ev));
    } else setLocal({ ...local!, events: [...local!.events, ev] });
    return ev;
  },

  setPaused(paused: boolean) {
    ensureInit();
    const s = get();
    if (paused || !s.queue.length) {
      if (cloud) cloudWrite(cloud.backend.setPaused(paused));
      else setLocal({ ...local!, paused });
      return;
    }
    // عند التشغيل: الطابور يُقرأ بترتيب وصوله، وكل رسالة تُقارن بما قبلها.
    const queue = [...s.queue].sort((a, b) => a.at.localeCompare(b.at));
    const history = [...seed, ...s.events];
    const created: RadarEvent[] = [];
    for (const q of queue) {
      const ev = ingest(q.raw, { sender: q.sender, receivedAt: q.at, history: [...history, ...created] });
      ev.id = `ev_${q.id}`; // معرّف ثابت: لو شخصان شغّلا في نفس اللحظة لا تتكرر الأحداث
      if (cloud) ev.createdBy = cloud.session.email;
      created.push(ev);
    }
    if (cloud) {
      cloudWrite(cloud.backend.drain(created, queue.map((q) => q.id)).then(() => cloud!.backend.setPaused(false)));
    } else setLocal({ ...local!, paused: false, queue: [], events: [...local!.events, ...created] });
  },

  remove(id: string) {
    ensureInit();
    if (cloud) cloudWrite(cloud.backend.removeEvent(id));
    else setLocal({ ...local!, events: local!.events.filter((e) => e.id !== id) });
  },

  reply(eventId: string, text: string) {
    ensureInit();
    const r: DeveloperReply = { eventId, text, date: new Date().toISOString() };
    if (cloud) cloudWrite(cloud.backend.setReply(r));
    else setLocal({ ...local!, replies: [...local!.replies.filter((x) => x.eventId !== eventId), r] });
  },

  setShowSeed(showSeed: boolean) {
    ensureInit();
    setLocal({ ...local!, showSeed });
  },

  // ───── السحابة ─────

  attachCloud(backend: CloudBackend, session: Session) {
    ensureInit();
    cloud = { backend, session, snap: { events: [], replies: [], queue: [], paused: false } };
    error = null;
    emit();
  },
  cloudSnapshot(part: Partial<CloudSnapshot>) {
    if (!cloud) return;
    cloud.snap = { ...cloud.snap, ...part };
    emit();
  },
  detachCloud() {
    cloud = null;
    error = null;
    emit();
  },
  async signOut() {
    const b = cloud?.backend;
    radar.detachCloud();
    await b?.signOut();
  },
  /** يرفع ما سُجّل على الجهاز قبل الدخول، ثم يمسحه من الجهاز. */
  async uploadLocal(): Promise<number> {
    ensureInit();
    if (!cloud) return 0;
    const evs = local!.events.map((e) => ({ ...e, createdBy: cloud!.session.email }));
    for (const e of evs) await cloud.backend.addEvent(e);
    for (const r of local!.replies) await cloud.backend.setReply(r);
    setLocal({ ...local!, events: [], replies: [] });
    return evs.length;
  },
  clearError() {
    error = null;
    emit();
  },

  /** للاختبارات فقط. */
  _reset() {
    local = null;
    cloud = null;
    error = null;
    state = null;
  },
};

export function useRadar(): RadarState {
  return useSyncExternalStore(radar.subscribe, radar.get, radar.get);
}
