import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Property, SalesAgent, Lead, OwnerSubmission, OwnerPrivateDetails, BrokerProfile, ViewingRequest, ViewingFeedback } from '../types';
import { ensureUploaded } from './mediaStorage';

// Suppress benign internal network retry logs
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Ensure a valid authenticated Firebase Auth session exists at all times
export async function ensureAuth(): Promise<FirebaseUser | null> {
  // لازم نستنى Firebase يرجّع الجلسة المحفوظة الأول (بعد الـ refresh)،
  // وإلا هيعمل دخول مجهول فوق جلسة الأدمن ويخرّجه
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    return null;
  }
}

// Automatically initiate non-blocking auth initialization
ensureAuth().catch(() => {});

// Initialize Firestore with robust connection settings and specific databaseId if configured
export const db = (() => {
  try {
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    };
    if (firebaseConfig.firestoreDatabaseId) {
      return initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId);
    }
    return initializeFirestore(app, firestoreSettings);
  } catch (e) {
    return firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

// Connectivity check with graceful offline support
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'site_config', 'connection_test');
    const docSnap = await getDoc(testDocRef);
    return docSnap.exists() || true;
  } catch (error: any) {
    if (error?.code === 'unavailable' || (error instanceof Error && error.message.includes('offline'))) {
      // Operating in offline/cached mode
      return false;
    }
    return false;
  }
}

// ==========================================
// FIREBASE AUTHENTICATION (STAFF & ADMIN)
// ==========================================

export async function signInStaff(email: string, password: string): Promise<FirebaseUser> {
  // دخول حقيقي بس: الحسابات بتتعمل من Firebase Console، مفيش إنشاء تلقائي
  const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password.trim());
  return userCredential.user;
}

/** دور الموظف من staff_access/{email}: 'admin' أو 'sales' أو null */
export async function getStaffRole(email?: string | null): Promise<'admin' | 'sales' | null> {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, 'staff_access', email.trim().toLowerCase()));
    if (!snap.exists()) return null;
    const role = (snap.data() as any).role;
    return role === 'admin' || role === 'sales' ? role : null;
  } catch (err) {
    console.warn('[Auth] role lookup failed:', err);
    return null;
  }
}

/** بيرجّع الزائر لحالة "مجهول" بعد خروج الموظف */
export async function signOutToGuest(): Promise<void> {
  await signOut(auth);
  await ensureAuth().catch(() => {});
}

/** تأكيد باسوورد الأدمن الحالي من Firebase قبل العمليات الخطيرة (زي مسح كل الشقق) */
export async function verifyCurrentPassword(password: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email || user.isAnonymous) return false;
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password.trim()));
    return true;
  } catch {
    return false;
  }
}

export async function createStaffAuthAccount(email: string, password: string): Promise<FirebaseUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
  return userCredential.user;
}

export async function signOutStaff(): Promise<void> {
  await signOut(auth);
}

export function subscribeToStaffAuth(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Recursively cleans an object by stripping undefined keys, which are not allowed by Firestore setDoc/updateDoc.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const str = typeof error === 'string' ? error : (error as any)?.message || String(error);
  return (
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('resource-exhausted') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('Free daily read units per project')
  );
}

// ==========================================
// 1. PROPERTIES REPOSITORY (الـعـقـارات والمـشـاريـع)
// ==========================================

export async function fetchAllPropertiesFromDb(): Promise<Property[]> {
  try {
    const propertiesCol = collection(db, 'properties');
    const snapshot = await getDocs(propertiesCol);
    const properties: Property[] = [];
    snapshot.forEach((docSnap) => {
      properties.push(docSnap.data() as Property);
    });
    return properties;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('[Firebase] Quota limit reached while fetching properties. Using local fallback cache.');
    } else {
      console.warn('[Firebase] Error fetching properties:', error);
    }
    return [];
  }
}

export function subscribeToProperties(
  onUpdate: (properties: Property[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const propertiesCol = collection(db, 'properties');
  return onSnapshot(propertiesCol, (snapshot) => {
    const properties: Property[] = [];
    snapshot.forEach((docSnap) => {
      properties.push(docSnap.data() as Property);
    });
    onUpdate(properties);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (isQuota) {
      console.warn('[Firebase] Free daily read quota limit reached on properties. Operating in cached mode.');
    } else {
      console.warn('[Firebase] Subscription notice on properties:', error);
    }
    if (onError) {
      onError(error, isQuota);
    }
  });
}

export async function savePropertyToDb(property: Property): Promise<void> {
  try {
    await ensureAuth();
    const propertyDoc = doc(db, 'properties', property.id);
    let propertyToSave = { ...property };
    
    // Ensure images array is explicitly present
    if (propertyToSave.images && propertyToSave.images.length > 0) {
      // أي صورة لسه base64 بترفع على Storage ونخزن الرابط بس
      const uploaded = await Promise.all(
        propertyToSave.images.map(img => ensureUploaded(img, 'properties', property.id))
      );
      propertyToSave.images = uploaded.filter(img => Boolean(img && img.trim()));
    } else {
      propertyToSave.images = [];
    }

    // Ensure videoUrl is clean string
    // الفيديو كمان بيترفع على Storage بدل ما يتحط في المستند
    propertyToSave.videoUrl = await ensureUploaded(propertyToSave.videoUrl || '', 'videos', property.id);

    // Extract sensitive owner details for the private subcollection
    const ownerName = propertyToSave.ownerName;
    const ownerPhone = propertyToSave.ownerPhone;
    
    // Delete from public document to conform with strict security rules:
    delete (propertyToSave as any).ownerName;
    delete (propertyToSave as any).ownerPhone;

    const sanitizedData = cleanFirestoreData(propertyToSave);
    // Overwrite document cleanly so deleted fields/images don't linger
    await setDoc(propertyDoc, sanitizedData);

    // Save private owner details strictly into properties/{id}/private/owner
    if (ownerName || ownerPhone) {
      try {
        const privateOwnerDoc = doc(db, 'properties', property.id, 'private', 'owner');
        await setDoc(
          privateOwnerDoc, 
          cleanFirestoreData({
            ownerName: ownerName || 'المالك المباشر',
            ownerPhone: ownerPhone || '',
            updatedAt: new Date().toISOString()
          })
        );
      } catch (privErr) {
        console.warn('[Firebase] Notice saving private owner subcollection:', privErr);
      }
    }
  } catch (error) {
    console.error('[Firebase] Error saving property to Cloud Database:', error);
    throw error;
  }
}

export async function fetchPropertyOwnerDetails(propertyId: string): Promise<OwnerPrivateDetails | null> {
  try {
    const privateOwnerDoc = doc(db, 'properties', propertyId, 'private', 'owner');
    const snapshot = await getDoc(privateOwnerDoc);
    if (snapshot.exists()) {
      return snapshot.data() as OwnerPrivateDetails;
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] Could not fetch private owner details (staff access only):', error);
    return null;
  }
}

export async function deletePropertyFromDb(propertyId: string): Promise<void> {
  try {
    await ensureAuth();
    const propertyDoc = doc(db, 'properties', propertyId);
    await deleteDoc(propertyDoc);

    try {
      const privateOwnerDoc = doc(db, 'properties', propertyId, 'private', 'owner');
      await deleteDoc(privateOwnerDoc);
    } catch {
      // ignore
    }
  } catch (error) {
    console.error('[Firebase] Error deleting property:', error);
    throw error;
  }
}

export async function clearAllPropertiesFromDb(): Promise<void> {
  try {
    await ensureAuth();
    const propertiesCol = collection(db, 'properties');
    const snapshot = await getDocs(propertiesCol);
    const docs = snapshot.docs;
    if (docs.length === 0) {
      console.log('[Firebase] No properties to delete, collection is already empty.');
      return;
    }
    // Firestore batch limit is 500 ops per commit
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      for (const docSnap of chunk) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }
    console.log(`[Firebase] Successfully deleted ${docs.length} properties from Firestore.`);
  } catch (error) {
    console.error('[Firebase] Error clearing all properties from database:', error);
    throw error;
  }
}

export async function seedPropertiesToDb(initialProperties: Property[]): Promise<void> {
  try {
    await ensureAuth();
    for (let i = 0; i < initialProperties.length; i += 300) {
      const chunk = initialProperties.slice(i, i + 300);
      const batch = writeBatch(db);
      for (const prop of chunk) {
        const docRef = doc(db, 'properties', prop.id);
        const toSave = { ...prop };
        delete (toSave as any).ownerName;
        delete (toSave as any).ownerPhone;
        const sanitized = cleanFirestoreData(toSave);
        batch.set(docRef, sanitized, { merge: true });
      }
      await batch.commit();
    }
    console.log('[Firebase] Successfully seeded properties into Firestore.');
  } catch (error) {
    console.error('[Firebase] Error seeding properties:', error);
  }
}

// ==========================================
// 2. SALES AGENTS REPOSITORY (فـريـق الـمـبـيـعـات والـحـسـابـات)
// ==========================================

export async function fetchSalesAgentsFromDb(): Promise<SalesAgent[]> {
  try {
    const agentsCol = collection(db, 'sales_agents');
    const snapshot = await getDocs(agentsCol);
    const agents: SalesAgent[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      delete (data as any).password;
      agents.push(data as SalesAgent);
    });
    return agents;
  } catch (error) {
    console.error('[Firebase] Error fetching sales agents:', error);
    return [];
  }
}

export function subscribeToSalesAgents(
  onUpdate: (agents: SalesAgent[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const agentsCol = collection(db, 'sales_agents');
  return onSnapshot(agentsCol, (snapshot) => {
    const agents: SalesAgent[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      delete (data as any).password;
      agents.push(data as SalesAgent);
    });
    onUpdate(agents);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (isQuota) {
      console.warn('[Firebase] Free daily quota limit reached on sales_agents.');
    } else {
      console.warn('[Firebase] Subscription notice on sales_agents:', error);
    }
    if (onError) onError(error, isQuota);
  });
}

export async function saveSalesAgentToDb(agent: SalesAgent): Promise<void> {
  try {
    await ensureAuth();
    const agentDoc = doc(db, 'sales_agents', agent.id);
    const agentData = { ...agent };
    delete (agentData as any).password;
    const sanitized = cleanFirestoreData(agentData);
    await setDoc(agentDoc, sanitized, { merge: true });
    // صلاحية الدخول: أي موظف مبيعات مضاف من الأدمن بياخد دور sales
    if (agent.email) {
      // بتنجح بس لو اللي بيحفظ أدمن، ولو موظف بيحدّث إحصائياته بتتجاهل بهدوء
      try {
        const key = agent.email.trim().toLowerCase();
        const existing = await getDoc(doc(db, 'staff_access', key));
        if (!existing.exists() || (existing.data() as any).role !== 'admin') {
          await setDoc(doc(db, 'staff_access', key), { role: agent.isActive === false ? 'disabled' : 'sales', name: agent.name || '' }, { merge: true });
        }
      } catch {
        /* مش أدمن */
      }
    }
  } catch (error) {
    console.warn('[Firebase] Notice saving sales agent to cloud database:', error);
    // Cache locally
    try {
      const raw = localStorage.getItem('lion_sales_agents');
      const list: SalesAgent[] = raw ? JSON.parse(raw) : [];
      const updated = list.map(a => a.id === agent.id ? agent : a);
      if (!updated.some(a => a.id === agent.id)) updated.push(agent);
      localStorage.setItem('lion_sales_agents', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export async function seedSalesAgentsToDb(initialAgents: SalesAgent[]): Promise<void> {
  try {
    await ensureAuth();
    const batch = writeBatch(db);
    for (const agent of initialAgents) {
      const docRef = doc(db, 'sales_agents', agent.id);
      const agentData = { ...agent };
      delete (agentData as any).password;
      const sanitized = cleanFirestoreData(agentData);
      batch.set(docRef, sanitized, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    console.warn('[Firebase] Notice seeding sales agents batch:', error);
  }
}

// ==========================================
// 3. CRM LEADS REPOSITORY (الـعـمـلاء والـصـفـقـات)
// ==========================================

export async function fetchCrmLeadsFromDb(): Promise<Lead[]> {
  try {
    const leadsCol = collection(db, 'crm_leads');
    const snapshot = await getDocs(leadsCol);
    const leads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      leads.push(docSnap.data() as Lead);
    });
    return leads;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('[Firebase] Quota limit reached while fetching CRM leads.');
    } else {
      console.warn('[Firebase] Error fetching crm leads:', error);
    }
    return [];
  }
}

export function subscribeToCrmLeads(
  onUpdate: (leads: Lead[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const leadsCol = collection(db, 'crm_leads');
  return onSnapshot(leadsCol, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      leads.push(docSnap.data() as Lead);
    });
    onUpdate(leads);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (isQuota) {
      console.warn('[Firebase] Free daily quota limit reached on crm_leads.');
    } else {
      console.warn('[Firebase] Subscription notice on crm_leads:', error);
    }
    if (onError) onError(error, isQuota);
  });
}

export async function saveLeadToDb(lead: Lead): Promise<void> {
  try {
    await ensureAuth();
    const leadDoc = doc(db, 'crm_leads', lead.id);
    const sanitized = cleanFirestoreData(lead);
    await setDoc(leadDoc, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice saving CRM lead to cloud database:', error);
    // Cache locally to ensure seamless offline CRM flow
    try {
      const raw = localStorage.getItem('lion_crm_leads');
      const list: Lead[] = raw ? JSON.parse(raw) : [];
      const updated = list.map(l => l.id === lead.id ? lead : l);
      if (!updated.some(l => l.id === lead.id)) updated.unshift(lead);
      localStorage.setItem('lion_crm_leads', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export async function updateLeadInDb(leadId: string, updates: Partial<Lead>): Promise<void> {
  try {
    await ensureAuth();
    const leadDoc = doc(db, 'crm_leads', leadId);
    const sanitized = cleanFirestoreData(updates);
    await setDoc(leadDoc, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice updating CRM lead in cloud database:', error);
    // Cache locally
    try {
      const raw = localStorage.getItem('lion_crm_leads');
      const list: Lead[] = raw ? JSON.parse(raw) : [];
      const updated = list.map(l => l.id === leadId ? { ...l, ...updates } : l);
      localStorage.setItem('lion_crm_leads', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export async function seedCrmLeadsToDb(initialLeads: Lead[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const lead of initialLeads) {
      const docRef = doc(db, 'crm_leads', lead.id);
      const sanitized = cleanFirestoreData(lead);
      batch.set(docRef, sanitized, { merge: true });
    }
    await batch.commit();
    console.log('[Firebase] Successfully seeded CRM leads into Firestore.');
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('[Firebase] Quota limit reached while seeding CRM leads.');
    } else {
      console.warn('[Firebase] Notice seeding CRM leads:', error);
    }
  }
}

// ==========================================
// 4. SITE CONFIG & BANNER (إعـدادات الـمـوقـع والـبـانـر والـفـوتـر)
// ==========================================

export interface FooterConfig {
  branchAddress?: string;
  workingHours?: string;
  aboutText?: string;
  phone?: string;
  whatsapp?: string;
  copyrightText?: string;
  tagline?: string;
}

export interface SiteConfig {
  bannerUrl?: string;
  logoUrl?: string;
  footerConfig?: FooterConfig;
}

export async function fetchSiteConfigFromDb(): Promise<SiteConfig | null> {
  try {
    const configDoc = doc(db, 'site_config', 'global');
    const snap = await getDoc(configDoc);
    if (snap.exists()) {
      return snap.data() as SiteConfig;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function subscribeToSiteConfig(
  onUpdate: (config: SiteConfig) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const configDoc = doc(db, 'site_config', 'global');
  return onSnapshot(configDoc, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as SiteConfig);
    }
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (onError) onError(error, isQuota);
  });
}

export async function saveSiteBannerToDb(bannerUrl: string): Promise<void> {
  try {
    const configDoc = doc(db, 'site_config', 'global');
    // البانر بيترفع على Cloudinary، وFirestore بيخزن الرابط بس
    const sanitized = cleanFirestoreData({ bannerUrl: await ensureUploaded(bannerUrl, 'branding', 'banner') });
    await setDoc(configDoc, sanitized, { merge: true });
  } catch (error) {
    console.error('[Firebase] Error saving site banner:', error);
    throw error;
  }
}

export async function saveSiteLogoToDb(logoUrl: string): Promise<void> {
  try {
    const configDoc = doc(db, 'site_config', 'global');
    const sanitized = cleanFirestoreData({ logoUrl: await ensureUploaded(logoUrl, 'branding', 'logo') });
    await setDoc(configDoc, sanitized, { merge: true });
  } catch (error) {
    console.error('[Firebase] Error saving site logo:', error);
    throw error;
  }
}

export async function saveSiteFooterConfigToDb(footerConfig: FooterConfig): Promise<void> {
  try {
    const configDoc = doc(db, 'site_config', 'global');
    const sanitized = cleanFirestoreData({ footerConfig });
    await setDoc(configDoc, sanitized, { merge: true });
  } catch (error) {
    console.error('[Firebase] Error saving site footer config:', error);
    throw error;
  }
}

// ==========================================
// 5. OWNER SUBMISSIONS (طـلـبـات الـمـلّاك)
// ==========================================

export async function fetchOwnerSubmissionsFromDb(): Promise<OwnerSubmission[]> {
  try {
    const col = collection(db, 'owner_submissions');
    const snapshot = await getDocs(col);
    const submissions: OwnerSubmission[] = [];
    snapshot.forEach((docSnap) => {
      submissions.push(docSnap.data() as OwnerSubmission);
    });
    return submissions;
  } catch (error) {
    return [];
  }
}

export function subscribeToOwnerSubmissions(
  onUpdate: (submissions: OwnerSubmission[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const col = collection(db, 'owner_submissions');
  return onSnapshot(col, (snapshot) => {
    const submissions: OwnerSubmission[] = [];
    snapshot.forEach((docSnap) => {
      submissions.push(docSnap.data() as OwnerSubmission);
    });
    onUpdate(submissions);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (onError) onError(error, isQuota);
  });
}

export async function saveOwnerSubmissionToDb(submission: OwnerSubmission): Promise<void> {
  try {
    const docRef = doc(db, 'owner_submissions', submission.id);
    let subToSave = { ...submission };

    if (subToSave.images && subToSave.images.length > 0) {
      const uploaded = await Promise.all(
        subToSave.images.map(img => ensureUploaded(img, 'owner_submissions', submission.id))
      );
      subToSave.images = uploaded.filter(img => Boolean(img && img.trim()));
    }

    const sanitized = cleanFirestoreData(subToSave);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.error('[Firebase] Error saving owner submission:', error);
    throw error;
  }
}

// ==========================================
// 6. BROKER & VIEWING REQUESTS (بوابة البروكر)
// ==========================================

export async function saveViewingRequestToDb(request: ViewingRequest): Promise<void> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'viewing_requests', request.id);
    const sanitized = cleanFirestoreData(request);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice saving viewing request:', error);
    // Cache locally
    try {
      const raw = localStorage.getItem('lion_viewing_requests');
      const list: ViewingRequest[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter(r => r.id !== request.id);
      updated.unshift(request);
      localStorage.setItem('lion_viewing_requests', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export async function updateViewingRequestInDb(id: string, updates: Partial<ViewingRequest>): Promise<void> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'viewing_requests', id);
    const sanitized = cleanFirestoreData(updates);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice updating viewing request:', error);
    try {
      const raw = localStorage.getItem('lion_viewing_requests');
      const list: ViewingRequest[] = raw ? JSON.parse(raw) : [];
      const updated = list.map(r => r.id === id ? { ...r, ...updates } : r);
      localStorage.setItem('lion_viewing_requests', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export function subscribeToViewingRequests(
  brokerId: string | null,
  onUpdate: (requests: ViewingRequest[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const col = collection(db, 'viewing_requests');
  return onSnapshot(col, (snapshot) => {
    const list: ViewingRequest[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ViewingRequest;
      // If brokerId is provided, filter for that broker
      if (!brokerId || data.brokerId === brokerId) {
        list.push(data);
      }
    });
    // Sort newest first
    list.sort((a, b) => (b.createdAtTimestamp || 0) - (a.createdAtTimestamp || 0));
    onUpdate(list);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (onError) onError(error, isQuota);
  });
}

export async function saveViewingFeedbackToDb(feedback: ViewingFeedback): Promise<void> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'viewing_feedbacks', feedback.id);
    const sanitized = cleanFirestoreData(feedback);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice saving viewing feedback:', error);
    try {
      const raw = localStorage.getItem('lion_viewing_feedbacks');
      const list: ViewingFeedback[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter(f => f.id !== feedback.id);
      updated.unshift(feedback);
      localStorage.setItem('lion_viewing_feedbacks', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export function subscribeToViewingFeedbacks(
  onUpdate: (feedbacks: ViewingFeedback[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const col = collection(db, 'viewing_feedbacks');
  return onSnapshot(col, (snapshot) => {
    const list: ViewingFeedback[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ViewingFeedback);
    });
    onUpdate(list);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (onError) onError(error, isQuota);
  });
}

export async function saveBrokerProfileToDb(profile: BrokerProfile): Promise<void> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'brokers', profile.id);
    const sanitized = cleanFirestoreData(profile);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice saving broker profile:', error);
    try {
      localStorage.setItem(`lion_broker_profile_${profile.id}`, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }
}

export function subscribeToBrokers(
  onUpdate: (brokers: BrokerProfile[]) => void,
  onError?: (error: unknown, isQuota: boolean) => void
): () => void {
  const col = collection(db, 'brokers');
  return onSnapshot(col, (snapshot) => {
    const list: BrokerProfile[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BrokerProfile);
    });
    onUpdate(list);
  }, (error) => {
    const isQuota = isQuotaExceededError(error);
    if (onError) onError(error, isQuota);
  });
}

export async function seedBrokersToDb(brokers: BrokerProfile[]): Promise<void> {
  try {
    await ensureAuth();
    for (const b of brokers) {
      const docRef = doc(db, 'brokers', b.id);
      await setDoc(docRef, cleanFirestoreData(b), { merge: true });
    }
  } catch (err) {
    console.warn('[Firebase] Notice seeding brokers:', err);
  }
}

export async function deleteBrokerFromDb(brokerId: string): Promise<void> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'brokers', brokerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firebase] Notice deleting broker from db:', err);
  }
}

export function subscribeToBrokerProfile(
  brokerId: string,
  onUpdate: (profile: BrokerProfile | null) => void
): () => void {
  const docRef = doc(db, 'brokers', brokerId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as BrokerProfile);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn('[Firebase] Notice listening to broker profile:', err);
  });
}

export async function savePropertyPrivateOwner(
  propertyId: string,
  details: { ownerName: string; ownerPhone: string; brokerId?: string }
): Promise<void> {
  try {
    await ensureAuth();
    const privateRef = doc(db, 'properties', propertyId, 'private', 'owner');
    const sanitized = cleanFirestoreData(details);
    await setDoc(privateRef, sanitized, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Notice saving private owner details:', error);
  }
}

export async function fetchPropertyPrivateOwner(
  propertyId: string
): Promise<{ ownerName?: string; ownerPhone?: string; brokerId?: string } | null> {
  try {
    await ensureAuth();
    const privateRef = doc(db, 'properties', propertyId, 'private', 'owner');
    const snap = await getDoc(privateRef);
    if (snap.exists()) {
      return snap.data() as { ownerName?: string; ownerPhone?: string; brokerId?: string };
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] Notice fetching private owner details:', error);
    return null;
  }
}
