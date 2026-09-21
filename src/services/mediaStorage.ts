/*
  رفع الصور والفيديوهات على Cloudinary (مجاني لحد 25 جيجا، ومن غير كارت).
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

async function send(payload: Blob | string, folder: string, id: string, kind: 'image' | 'video'): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME.startsWith('اكتب')) {
    throw new Error('Cloudinary مش متظبط: اكتب CLOUDINARY_CLOUD_NAME في mediaStorage.ts');
  }
  const form = new FormData();
  form.append('file', payload);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', `elsab3/${folder}/${safe(id)}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || `فشل الرفع (${res.status})`);
  return optimize(data.secure_url, kind === 'image');
}

/** رفع ملف (صورة أو فيديو) والرجوع برابط مباشر */
export async function uploadFile(file: File, folder: string, id: string): Promise<string> {
  const kind = file.type.startsWith('video') ? 'video' : 'image';
  return send(file, folder, id, kind);
}

/** رفع صورة موجودة كـ base64 والرجوع برابط */
export async function uploadDataUrl(dataUrl: string, folder: string, id: string): Promise<string> {
  const kind = dataUrl.startsWith('data:video') ? 'video' : 'image';
  return send(dataUrl, folder, id, kind);
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