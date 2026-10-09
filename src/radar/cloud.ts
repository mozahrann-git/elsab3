// Manateq Radar — الحفظ المشترك على Firestore.
// يُحمَّل عند الطلب فقط، ويستعمل نفس مشروع Firebase وحسابات staff_access بتاعة السبع.
// المجموعات: radar_events · radar_queue · radar_replies · radar_config/ops — وقواعدها في firestore.rules.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { READ_ROLES, radar, type CloudBackend, type QueuedMessage, type Session } from './store';
import type { DeveloperReply, RadarEvent } from './types';

const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db: Firestore = (() => {
  try {
    const settings = { experimentalForceLongPolling: true, ignoreUndefinedProperties: true };
    return config.firestoreDatabaseId ? initializeFirestore(app, settings, config.firestoreDatabaseId) : initializeFirestore(app, settings);
  } catch {
    // الموقع الأساسي هيّأ Firestore بنفس الإعدادات قبلنا (خادم التطوير)
    return config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
  }
})();

// للتطوير والاختبار فقط: VITE_RADAR_EMULATOR=127.0.0.1 يوجّه الرادار لمحاكيات Firebase بدل الإنتاج.
const emulator = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_RADAR_EMULATOR;
if (emulator) {
  connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulator, 8089);
}

/** Firestore يرفض undefined داخل الكائنات المتداخلة؛ الحقول الغائبة تبقى غائبة. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const backend: CloudBackend = {
  addEvent: (e: RadarEvent) => setDoc(doc(db, 'radar_events', e.id), clean(e)),
  removeEvent: (id: string) => deleteDoc(doc(db, 'radar_events', id)),
  setReply: (r: DeveloperReply) => setDoc(doc(db, 'radar_replies', r.eventId), clean({ ...r, by: auth.currentUser?.email?.toLowerCase() ?? '' })),
  setPaused: (paused: boolean) => setDoc(doc(db, 'radar_config', 'ops'), { paused, by: auth.currentUser?.email?.toLowerCase() ?? '', at: new Date().toISOString() }),
  enqueue: (q: QueuedMessage) => setDoc(doc(db, 'radar_queue', q.id), clean({ ...q, by: auth.currentUser?.email?.toLowerCase() ?? '' })),
  async drain(events: RadarEvent[], queueIds: string[]) {
    // دفعات بحد Firestore (500 عملية)
    const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
      ...events.map((e) => (b: ReturnType<typeof writeBatch>) => b.set(doc(db, 'radar_events', e.id), clean(e))),
      ...queueIds.map((id) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, 'radar_queue', id))),
    ];
    for (let i = 0; i < ops.length; i += 450) {
      const b = writeBatch(db);
      ops.slice(i, i + 450).forEach((op) => op(b));
      await b.commit();
    }
  },
  signOut: () => fbSignOut(auth),
};

export type AuthStatus = { kind: 'checking' } | { kind: 'signed-out' } | { kind: 'no-access'; email: string } | { kind: 'signed-in'; session: Session };

/** يراقب الجلسة: موظف بدور مسموح ← وضع سحابي، غير ذلك ← وضع محلي. */
export function connect(onStatus: (s: AuthStatus) => void): () => void {
  let unsubs: (() => void)[] = [];
  const stopAll = () => {
    unsubs.forEach((u) => u());
    unsubs = [];
  };
  onStatus({ kind: 'checking' });
  const stopAuth = onAuthStateChanged(auth, async (user) => {
    stopAll();
    // الدخول المجهول اللي بيعمله الموقع الأساسي لا يُعتبر موظفاً
    if (!user || user.isAnonymous || !user.email) {
      radar.detachCloud();
      onStatus({ kind: 'signed-out' });
      return;
    }
    const email = user.email.toLowerCase();
    let role: string | null = null;
    let name: string | undefined;
    try {
      const snap = await getDoc(doc(db, 'staff_access', email));
      if (snap.exists()) {
        role = (snap.data() as { role?: string }).role ?? null;
        name = (snap.data() as { name?: string }).name;
      }
    } catch {
      role = null;
    }
    if (auth.currentUser?.uid !== user.uid) return; // الجلسة تغيّرت أثناء الانتظار
    if (!role || !READ_ROLES.includes(role)) {
      radar.detachCloud();
      onStatus({ kind: 'no-access', email });
      return;
    }
    const session: Session = { email, name, role };
    radar.attachCloud(backend, session);
    onStatus({ kind: 'signed-in', session });
    const onErr = () => radar.detachCloud();
    unsubs.push(
      onSnapshot(query(collection(db, 'radar_events'), orderBy('receivedAt', 'desc'), limit(3000)), (s) => radar.cloudSnapshot({ events: s.docs.map((d) => d.data() as RadarEvent) }), onErr),
      onSnapshot(collection(db, 'radar_replies'), (s) => radar.cloudSnapshot({ replies: s.docs.map((d) => d.data() as DeveloperReply) }), onErr),
      onSnapshot(collection(db, 'radar_queue'), (s) => radar.cloudSnapshot({ queue: s.docs.map((d) => d.data() as QueuedMessage) }), onErr),
      onSnapshot(doc(db, 'radar_config', 'ops'), (s) => radar.cloudSnapshot({ paused: !!s.data()?.paused }), onErr),
    );
  });
  return () => {
    stopAuth();
    stopAll();
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password.trim());
}
