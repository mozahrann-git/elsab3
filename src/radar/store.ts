// Manateq Radar — الذاكرة.
// العيّنة تُبنى عند الفتح من رسائلها عبر نفس المحلّل؛ ما تُدخله أنت يُحفظ على هذا الجهاز.
// زرّ الإيقاف لا يُضيّع رسالة: الرسائل تتراكم في الطابور وتُقرأ عند التشغيل.
import { useSyncExternalStore } from 'react';
import { SEED_MESSAGES } from './data';
import { ingest } from './parser';
import type { DeveloperReply, RadarEvent } from './types';

const KEY = 'manateq-radar:v1';

interface Persisted {
  events: RadarEvent[];
  queue: { raw: string; sender: string; at: string }[];
  paused: boolean;
  replies: DeveloperReply[];
  showSeed: boolean;
}

export interface RadarState extends Persisted {
  seed: RadarEvent[];
  /** كل الأحداث المعروضة، الأحدث أولاً. */
  all: RadarEvent[];
}

function buildSeed(now: number): RadarEvent[] {
  const ordered = [...SEED_MESSAGES].sort((a, b) => b.ago - a.ago);
  const out: RadarEvent[] = [];
  for (const m of ordered) {
    out.push(ingest(m.text, { sender: m.sender, receivedAt: new Date(now - m.ago * 3_600_000).toISOString(), history: out, seed: true }));
  }
  return out;
}

function load(): Persisted {
  const empty: Persisted = { events: [], queue: [], paused: false, replies: [], showSeed: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      events: Array.isArray(p.events) ? p.events : [],
      queue: Array.isArray(p.queue) ? p.queue : [],
      paused: !!p.paused,
      replies: Array.isArray(p.replies) ? p.replies : [],
      showSeed: p.showSeed !== false,
    };
  } catch {
    return empty;
  }
}

function compose(p: Persisted, seed: RadarEvent[]): RadarState {
  const all = [...(p.showSeed ? seed : []), ...p.events].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return { ...p, seed, all };
}

let seed: RadarEvent[] = [];
let state: RadarState | null = null;
const listeners = new Set<() => void>();

function get(): RadarState {
  if (!state) {
    seed = buildSeed(Date.now());
    state = compose(load(), seed);
  }
  return state;
}

function set(next: Persisted) {
  state = compose(next, seed);
  try {
    const { events, queue, paused, replies, showSeed } = next;
    localStorage.setItem(KEY, JSON.stringify({ events, queue, paused, replies, showSeed }));
  } catch {
    /* التخزين غير متاح: تستمر الجلسة في الذاكرة */
  }
  listeners.forEach((l) => l());
}

function persisted(): Persisted {
  const { events, queue, paused, replies, showSeed } = get();
  return { events, queue, paused, replies, showSeed };
}

export const radar = {
  get,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** يستقبل رسالة: تُقرأ فوراً، أو تنتظر في الطابور لو التشغيل موقوف. */
  receive(raw: string, sender: string): RadarEvent | null {
    const p = persisted();
    const at = new Date().toISOString();
    if (p.paused) {
      set({ ...p, queue: [...p.queue, { raw, sender, at }] });
      return null;
    }
    const ev = ingest(raw, { sender, receivedAt: at, history: get().all });
    set({ ...p, events: [...p.events, ev] });
    return ev;
  },
  setPaused(paused: boolean) {
    const p = persisted();
    if (paused || !p.queue.length) return set({ ...p, paused });
    // عند التشغيل: الطابور يُقرأ بترتيب وصوله، وكل رسالة تُقارن بما قبلها.
    const events = [...p.events];
    for (const q of p.queue) {
      events.push(ingest(q.raw, { sender: q.sender, receivedAt: q.at, history: [...seed, ...events] }));
    }
    set({ ...p, paused, queue: [], events });
  },
  remove(id: string) {
    const p = persisted();
    set({ ...p, events: p.events.filter((e) => e.id !== id) });
  },
  reply(eventId: string, text: string) {
    const p = persisted();
    set({ ...p, replies: [...p.replies.filter((r) => r.eventId !== eventId), { eventId, text, date: new Date().toISOString() }] });
  },
  setShowSeed(showSeed: boolean) {
    set({ ...persisted(), showSeed });
  },
  /** للاختبارات فقط. */
  _reset() {
    state = null;
  },
};

export function useRadar(): RadarState {
  return useSyncExternalStore(radar.subscribe, radar.get, radar.get);
}
