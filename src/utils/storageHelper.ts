import { Property } from '../types';

const DB_NAME = 'LionHadabaDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';
const CACHE_KEY = 'lion_hadaba_properties_cache';
export const LS_PROPERTIES_KEY = 'lion_hadaba_properties';
const DELETED_IDS_KEY = 'lion_deleted_property_ids';

/*
  قايمة الشقق المحذوفة — إخفاء مؤقت، مش دفن دائم.

  البق اللي كان بيخبّي شقق عن الأدمن لوحده:
  القايمة دي محفوظة في localStorage على جهاز واحد، وكانت بتفضل للأبد،
  وبيتفلتر بيها ٩ مواضع في التطبيق. فلو مسح شقة والمسح من السيرفر فشل
  (نت، قواعد، كوتة)، الشقة بتفضل في قاعدة البيانات وبتختفي من عنده هو بس.
  باقي الفريق والموقع شايفينها، وهو لأ — ومش قادر يمسحها تاني لأنه
  أصلاً مش شايفها. وده اللي عمل الفرق بين ٣٣٢ و٢٩٧.

  الحل: الإخفاء بيدوم دقيقتين بس — الوقت اللي السيرفر بياخده عشان
  يبلّغ باقي الأجهزة. بعد كده بنثق في السيرفر: لو المسح نجح الشقة
  مش هتيجي أصلاً، ولو فشل بترجع تظهر فيقدر يمسحها تاني.
*/
const DELETE_GRACE_MS = 2 * 60 * 1000;

type DeletedEntry = { id: string; at: number };

function readDeletedEntries(): DeletedEntry[] {
  try {
    const raw = safeLocalStorageGet(DELETED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* الصيغة القديمة كانت قايمة نصوص من غير وقت. بنعتبرها منتهية —
       يعني الشقق اللي كانت مدفونة من زمان بترجع تبان على طول. */
    return parsed
      .filter((x) => x && typeof x === 'object' && typeof (x as any).id === 'string')
      .map((x: any) => ({ id: x.id, at: Number(x.at) || 0 }));
  } catch {
    return [];
  }
}

/** الشقق اللي لسه في فترة السماح بعد المسح */
export function getDeletedPropertyIds(): string[] {
  const now = Date.now();
  return readDeletedEntries()
    .filter((e) => now - e.at < DELETE_GRACE_MS)
    .map((e) => e.id);
}

/** بيسجّل مسح شقة — الإخفاء مؤقت لحد ما السيرفر يلحق */
export function recordDeletedPropertyId(id: string): void {
  try {
    const now = Date.now();
    const kept = readDeletedEntries().filter(
      (e) => e.id !== id && now - e.at < DELETE_GRACE_MS,
    );
    safeLocalStorageSet(DELETED_IDS_KEY, JSON.stringify([...kept, { id, at: now }]));
  } catch {
    // ignore
  }
}

/**
 * Removes an ID from deleted list (e.g. if re-added or restored)
 */
export function removeDeletedPropertyId(id: string): void {
  try {
    // لازم تكتب بنفس صيغة {id, at} — من غير كده بتفسد القايمة
    const next = readDeletedEntries().filter((e) => e.id !== id);
    safeLocalStorageSet(DELETED_IDS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Clears deleted IDs history
 */
export function clearDeletedPropertyIds(): void {
  try {
    safeLocalStorageSet(DELETED_IDS_KEY, '[]');
  } catch {
    // ignore
  }
}

/**
 * Open IndexedDB database safely with auto-recovery
 */
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save data to IndexedDB
 */
export async function saveToIndexedDB<T>(key: string, value: T): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Load data from IndexedDB
 */
export async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve((req.result as T) || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Remove data from IndexedDB
 */
export async function removeFromIndexedDB(key: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError or crashing
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    // Quota exceeded safe fallback (no crash)
    return false;
  }
}

/**
 * Safely gets an item from localStorage
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely sets an item in sessionStorage
 */
export function safeSessionStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets an item from sessionStorage
 */
export function safeSessionStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Synchronous initial read from localStorage (safe, won't crash)
 */
export function getInitialPropertiesCache(): Property[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const saved = localStorage.getItem(LS_PROPERTIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Persistent save of properties:
 * 1. Saves full pristine data (including custom images and videos) into IndexedDB (virtually unlimited quota).
 * 2. Attempts to save into localStorage for instant synchronous reads.
 */
export async function persistPropertiesCache(properties: Property[]): Promise<void> {
  if (!properties || !Array.isArray(properties)) return;

  // 1. IndexedDB for full fidelity and complete media persistence (no quota limit)
  try {
    await saveToIndexedDB(CACHE_KEY, properties);
  } catch (idbErr) {
    console.warn('[Storage] IndexedDB save notice:', idbErr);
  }

  // 2. Safe localStorage cache
  try {
    if (properties.length === 0) {
      safeLocalStorageSet(LS_PROPERTIES_KEY, '[]');
      return;
    }
    
    const json = JSON.stringify(properties);
    safeLocalStorageSet(LS_PROPERTIES_KEY, json);
  } catch {
    // Never throw
  }
}

/**
 * Loads properties from persistent cache:
 * Tries IndexedDB first (which contains full media, custom images and videos), falls back to localStorage.
 */
export async function loadPersistentProperties(): Promise<Property[] | null> {
  try {
    const idbData = await loadFromIndexedDB<Property[]>(CACHE_KEY);
    if (idbData && Array.isArray(idbData) && idbData.length > 0) {
      return idbData;
    }
  } catch {
    // ignore
  }
  const lsData = getInitialPropertiesCache();
  return lsData.length > 0 ? lsData : null;
}

/**
 * Clears properties cache completely from both IndexedDB and localStorage
 */
export async function clearPropertiesCache(): Promise<void> {
  try {
    await removeFromIndexedDB(CACHE_KEY);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LS_PROPERTIES_KEY);
    safeLocalStorageSet(LS_PROPERTIES_KEY, '[]');
  } catch {
    // ignore
  }
}
