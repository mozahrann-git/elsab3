/*
  نقل بيانات السبع من مشروع AI Studio القديم لمشروع Firebase الجديد بتاعك.
  - بيقرا كل الـ collections من القديم (القراءة مفتوحة فيه)
  - بيكتبها في الجديد بنفس الـ IDs
  - بيرفع الصور والفيديوهات على Storage الجديد ويحدّث الروابط
  التشغيل:  node scripts/migrate-to-new-project.mjs
*/
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const oldCfg = JSON.parse(readFileSync('firebase-applet-config.old.json', 'utf8'));
const newCfg = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));

const oldApp = initializeApp(oldCfg, 'old');
const newApp = initializeApp(newCfg, 'new');
const oldDb = oldCfg.firestoreDatabaseId ? getFirestore(oldApp, oldCfg.firestoreDatabaseId) : getFirestore(oldApp);
const newDb = newCfg.firestoreDatabaseId
  ? initializeFirestore(newApp, { ignoreUndefinedProperties: true }, newCfg.firestoreDatabaseId)
  : initializeFirestore(newApp, { ignoreUndefinedProperties: true });
// ======= إعدادات Cloudinary (نفس اللي في src/services/mediaStorage.ts) =======
const CLOUD = 'x7ls7cua';
const PRESET = 'elsab3_unsigned';
// ============================================================================

const COLLECTIONS = process.argv.slice(2).length ? process.argv.slice(2) : ['properties', 'sales_agents', 'crm_leads', 'owner_submissions', 'site_config', 'viewing_requests', 'viewing_feedbacks', 'brokers', 'portal_users', 'governance_audit_logs'];

let uploaded = 0, failed = 0;

async function moveMedia(value, folder, id) {
  if (!value || typeof value !== 'string') return value;
  const isData = value.startsWith('data:');
  const isOldStorage = value.includes(oldCfg.storageBucket) || value.includes('firebasestorage.googleapis.com');
  if (!isData && !isOldStorage) return value; // رابط خارجي، يفضل زي ما هو
  try {
    let bytes, type;
    if (isData) {
      const [meta, b64] = value.split(',');
      type = (meta.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
      bytes = Buffer.from(b64, 'base64');
    } else {
      const res = await fetch(value);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      type = res.headers.get('content-type') || 'image/jpeg';
      bytes = Buffer.from(await res.arrayBuffer());
    }
    const kind = type.startsWith('video') ? 'video' : 'image';
    const form = new FormData();
    form.append('file', new Blob([bytes], { type }));
    form.append('upload_preset', PRESET);
    form.append('folder', `elsab3/${folder}/${String(id).replace(/[^\w-]/g, '_')}`);
    const up = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${kind}/upload`, { method: 'POST', body: form });
    const data = await up.json();
    if (!up.ok || !data.secure_url) throw new Error(data?.error?.message || `HTTP ${up.status}`);
    uploaded++;
    return kind === 'image' ? data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/') : data.secure_url;
  } catch (e) {
    failed++;
    console.warn(`   ! فشل نقل ملف في ${folder}/${id}: ${e.message}`);
    return value; // نسيب القديم بدل ما نضيّعه
  }
}

async function main() {
  if (CLOUD.startsWith('اكتب')) { console.error('اكتب اسم حساب Cloudinary في أول السكربت الأول'); process.exit(1); }
  console.log('تسجيل دخول على المشروع الجديد...');
  await signInAnonymously(getAuth(newApp));

  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(oldDb, name)).catch((e) => { console.warn(`تخطي ${name}: ${e.message}`); return null; });
    if (!snap) continue;
    console.log(`\n${name}: ${snap.size} مستند`);
    let n = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (name === 'properties' || name === 'owner_submissions') {
        const folder = name === 'properties' ? 'properties' : 'owner_submissions';
        if (Array.isArray(data.images)) {
          data.images = await Promise.all(data.images.map((img) => moveMedia(img, folder, d.id)));
        }
        if (data.videoUrl) data.videoUrl = await moveMedia(data.videoUrl, 'videos', d.id);
      }
      await setDoc(doc(newDb, name, d.id), data);
      if (name === 'properties') {
        const priv = await getDoc(doc(oldDb, 'properties', d.id, 'private', 'owner')).catch(() => null);
        if (priv && priv.exists()) await setDoc(doc(newDb, 'properties', d.id, 'private', 'owner'), priv.data());
      }
      n++;
      if (n % 10 === 0) console.log(`   ${n}/${snap.size}`);
    }
    console.log(`   تم ${n}`);
  }
  console.log(`\nخلصنا. ملفات اتنقلت: ${uploaded} · ملفات فشلت: ${failed}`);
  process.exit(0);
}

main().catch((e) => { console.error('خطأ:', e); process.exit(1); });
