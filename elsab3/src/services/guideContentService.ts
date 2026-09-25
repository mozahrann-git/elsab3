import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureAuth } from './firebaseService';
import { HighwayInfo, LandmarkCategory, LegalTip } from '../types';
import { HADABA_HIGHWAYS_DATA, HADABA_LANDMARKS_CATEGORIES, HADABA_LEGAL_TIPS } from '../data/properties';

/*
  محتوى دليل الأحياء (المحاور · الجامعات والمعالم · النصايح القانونية).
  كان مكتوب في الكود فمكانش ينفع يتعدّل، دلوقتي بقى في Firestore
  والقيم اللي في الكود بقت القيمة الافتراضية لو الأدمن لسه معدّلش حاجة.
*/

const DOC_PATH = ['site_content', 'district_guide'] as const;

export interface GuideContent {
  highways: HighwayInfo[];
  landmarks: LandmarkCategory[];
  legalTips: LegalTip[];
}

export const DEFAULT_GUIDE: GuideContent = {
  highways: HADABA_HIGHWAYS_DATA,
  landmarks: HADABA_LANDMARKS_CATEGORIES,
  legalTips: HADABA_LEGAL_TIPS,
};

const merge = (data: any): GuideContent => ({
  highways: Array.isArray(data?.highways) && data.highways.length ? data.highways : DEFAULT_GUIDE.highways,
  landmarks: Array.isArray(data?.landmarks) && data.landmarks.length ? data.landmarks : DEFAULT_GUIDE.landmarks,
  legalTips: Array.isArray(data?.legalTips) && data.legalTips.length ? data.legalTips : DEFAULT_GUIDE.legalTips,
});

/** بيسمع لأي تعديل على محتوى الدليل ويرجّعه فوراً */
export function subscribeToGuideContent(onUpdate: (c: GuideContent) => void): () => void {
  try {
    return onSnapshot(doc(db, ...DOC_PATH), (snap) => {
      onUpdate(snap.exists() ? merge(snap.data()) : DEFAULT_GUIDE);
    }, (err) => {
      console.warn('[Guide] مش قادر يقرا محتوى الدليل، هنعرض الافتراضي:', err);
      onUpdate(DEFAULT_GUIDE);
    });
  } catch (err) {
    console.warn('[Guide] مش قادر يشترك في محتوى الدليل:', err);
    onUpdate(DEFAULT_GUIDE);
    return () => {};
  }
}

export async function fetchGuideContent(): Promise<GuideContent> {
  try {
    const snap = await getDoc(doc(db, ...DOC_PATH));
    return snap.exists() ? merge(snap.data()) : DEFAULT_GUIDE;
  } catch {
    return DEFAULT_GUIDE;
  }
}

/** حفظ تعديلات الأدمن */
export async function saveGuideContent(content: GuideContent): Promise<void> {
  await ensureAuth();
  await setDoc(doc(db, ...DOC_PATH), {
    highways: content.highways,
    landmarks: content.landmarks,
    legalTips: content.legalTips,
    updatedAt: Date.now(),
  }, { merge: true });
}
