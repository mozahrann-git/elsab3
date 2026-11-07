/*
  رفع الصور والفيديوهات: كان على Cloudinary، ودلوقتي على Firebase Storage (شوف send تحت).
  Firestore بيخزن الرابط بس، فمفيش مستند هيعدّي حد الـ 1 ميجا تاني.

  قبل الاستخدام: اكتب اسم الحساب واسم الـ Upload Preset في الخانتين تحت.
*/

// ======= إعدادات Cloudinary =======
export const CLOUDINARY_CLOUD_NAME = 'x7ls7cua';   // من Dashboard ← Cloud name
export const CLOUDINARY_UPLOAD_PRESET = 'elsab3_unsigned';      // من Settings ← Upload ← Upload presets
// ===================================

const safe = (s: string) => (s || 'general').replace(/[^\w-]/g, '_').slice(0, 40);

/** بيحسّن رابط الصورة: صيغة وجودة تلقائي حسب جهاز الزائر (أسرع على الموبايل) */
const optimize = (url: string, isImage: boolean) =>
  isImage ? url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/') : url;

/** صورة مصغّرة للقوايم الطويلة.
 *  الكارت في اللوحة كان بيحمّل الصورة الأصلية (ممكن ٤ ميجا من الموبايل)
 *  ويعرضها في مربع ٨٠ بكسل. ٣٣٢ شقة = مئات الميجات مرة واحدة،
 *  وده اللي كان بيوقف كروم. دي نسخة بعرض ثابت صغير من كلاوديناري. */
export function thumbUrl(url: string | undefined, w = 200): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  /* بنشيل أي تحويل قديم متحطوط قبل كده عشان ماينفعش يتركبوا فوق بعض */
  const clean = url.replace(/\/image\/upload\/(?:[a-z]{1,3}_[^/]+\/)+/, '/image/upload/');
  return clean.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${w},c_fill/`);
}

/* ---------- الرفع على Firebase Storage ----------
   حساب Cloudinary المجاني اتقفل (عدّى الحد)، فالرفع الجديد كله بقى على
   Firebase Storage (باكت elsab3-33.firebasestorage.app). الروابط القديمة
   بتاعة Cloudinary بتفضل زي ما هي لحد ما تتنقل.
   Cloudinary كان بيصغّر الصور لوحده — دلوقتي بنصغّرها على الجهاز قبل الرفع
   (أقصى عرض ١٦٠٠ بكسل) عشان تفضل خفيفة وسريعة. */
const extOf = (type: string, name = '') => {
  const fromName = (name.split('.').pop() || '').toLowerCase();
  if (fromName && fromName.length <= 4 && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.startsWith('image') ? 'jpg'
    : type.includes('quicktime') ? 'mov' : type.includes('webm') ? 'webm' : type.startsWith('audio') ? (type.includes('mp4') ? 'm4a' : 'webm') : 'mp4';
};

/** بتصغّر الصورة لأقصى عرض ١٦٠٠ وبتحوّلها JPEG — لو فشلت بترجع الأصل */
async function shrinkImage(blob: Blob, max = 1600): Promise<Blob> {
  if (!blob.type.startsWith('image/') || /gif|svg/.test(blob.type) || blob.size < 250 * 1024) return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    const out: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    return out && out.size < blob.size ? out : blob;
  } catch { return blob; }
}

async function send(
  payload: Blob,
  folder: string,
  id: string,
  onProgress?: (percent: number) => void,
  name = '',
): Promise<string> {
  const [{ getStorage, ref, uploadBytesResumable, getDownloadURL }, fb] = await Promise.all([
    import('firebase/storage'), import('./firebaseService'),
  ]);
  await fb.ensureAuth();
  const body = await shrinkImage(payload);
  const type = body.type || payload.type || 'application/octet-stream';
  const path = `elsab3/${safe(folder)}/${safe(id)}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extOf(type, name)}`;
  const task = uploadBytesResumable(ref(getStorage(fb.firebaseApp), path), body, {
    contentType: type, cacheControl: 'public, max-age=31536000',
  });
  return new Promise<string>((resolve, reject) => {
    task.on('state_changed',
      (snap) => { if (onProgress && snap.totalBytes) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      (err: any) => {
        const code = String(err?.code || '');
        reject(new Error(
          code.includes('unauthorized') ? 'مش مسموح بالرفع — قواعد التخزين لسه ماترفعتش (firebase deploy)'
          : code.includes('canceled') ? 'الرفع اتلغى.'
          : code.includes('retry-limit') ? 'الاتصال اتقطع أكتر من مرة. اتأكد من النت وجرّب تاني.'
          : `فشل الرفع (${code || err?.message || 'unknown'})`,
        ));
      },
      async () => { try { resolve(await getDownloadURL(task.snapshot.ref)); } catch (e) { reject(e); } },
    );
  });
}

/** رفع ملف (صورة أو فيديو) والرجوع برابط مباشر */
export async function uploadFile(
  file: File,
  folder: string,
  id: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const isVideo = file.type.startsWith('video');
  // الفيديو الكبير بيستهلك تحميل كتير مع كل فتحة — الحد ٢٠٠ ميجا
  if (isVideo && file.size > 200 * 1024 * 1024) {
    const mb = Math.round(file.size / (1024 * 1024));
    throw new Error(`الفيديو حجمه ${mb} ميجا، والحد الأقصى ٢٠٠ ميجا. صغّره أو ارفعه على يوتيوب (غير مدرج) والصق الرابط.`);
  }
  return send(file, folder, id, onProgress, file.name);
}

/** رفع صورة موجودة كـ base64 والرجوع برابط */
export async function uploadDataUrl(dataUrl: string, folder: string, id: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return send(blob, folder, id);
}

/** لو القيمة base64 بترفعها وترجع الرابط، ولو رابط بترجعه زي ما هو.
    لو الرفع فشل، بترجع الأصل عشان الصورة متضيعش. */
export async function ensureUploaded(value: string, folder: string, id: string): Promise<string> {
  if (!value || !value.trim()) return '';
  if (!value.startsWith('data:')) return value;
  try {
    return await uploadDataUrl(value, folder, id);
  } catch (err) {
    console.error('[Media] فشل رفع الملف، هنحتفظ بالأصل:', err);
    return value;
  }
}

/** موجودة للتوافق مع الكود القديم، Cloudinary مش محتاج تسجيل دخول */
export async function ensureStorageAuth(): Promise<void> {}
