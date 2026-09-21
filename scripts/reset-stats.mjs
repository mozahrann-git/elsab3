/*
  تصفير كل أرقام الإحصائيات عشان نبدأ على نضيف:
  - المشاهدات ونقرات الواتساب والمكالمات والمفضلة لكل الشقق
  - نقاط وإحصائيات فريق المبيعات (XP، الصفقات، العمولات، المعاينات)
  مش بيمسح أي شقة ولا أي عميل.

  التشغيل (بحساب الأدمن):
    node scripts/reset-stats.mjs admin@elsaba.com "الباسوورد"
*/
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('اكتب الإيميل والباسوورد:  node scripts/reset-stats.mjs admin@elsaba.com "الباسوورد"');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(cfg);
const db = cfg.firestoreDatabaseId ? getFirestore(app, cfg.firestoreDatabaseId) : getFirestore(app);

async function commitInChunks(updates) {
  for (let i = 0; i < updates.length; i += 400) {
    const batch = writeBatch(db);
    for (const [ref, data] of updates.slice(i, i + 400)) batch.set(ref, data, { merge: true });
    await batch.commit();
  }
}

async function main() {
  await signInWithEmailAndPassword(getAuth(app), email.trim().toLowerCase(), password);
  console.log('دخلت كأدمن.');

  const props = await getDocs(collection(db, 'properties'));
  await commitInChunks(props.docs.map((d) => [doc(db, 'properties', d.id), { clicks: { whatsapp: 0, call: 0, views: 0, favorites: 0 } }]));
  console.log(`الشقق: اتصفّرت إحصائيات ${props.size} شقة`);

  const agents = await getDocs(collection(db, 'sales_agents'));
  await commitInChunks(agents.docs.map((d) => [doc(db, 'sales_agents', d.id), {
    xp: 0, level: 1, currentStreak: 0, dealsClosedCount: 0, totalCommissionEarned: 0,
    visitsCompletedCount: 0, listingsAddedCount: 0, badges: [],
  }]));
  console.log(`الفريق: اتصفّرت إحصائيات ${agents.size} موظف`);

  console.log('\nخلصنا. اعمل refresh للموقع.');
  process.exit(0);
}

main().catch((e) => {
  console.error('خطأ:', e.code === 'auth/invalid-credential' ? 'الإيميل أو الباسوورد غلط' : e.message);
  process.exit(1);
});
