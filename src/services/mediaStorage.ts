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

/* بنستخدم XMLHttpRequest مش fetch عشان نعرف نطلّع نسبة الرفع للمستخدم،
   وعشان نمسك رسالة الخطأ الحقيقية اللي Cloudinary بيرجّعها بدل رسالة عامة. */
function send(
  payload: Blob | string,
  folder: string,
  id: string,
  kind: 'image' | 'video',
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME.startsWith('اكتب')) {
    return Promise.reject(new Error('Cloudinary مش متظبط: اكتب CLOUDINARY_CLOUD_NAME في mediaStorage.ts'));
  }
  const form = new FormData();
  form.append('file', payload);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', `elsab3/${folder}/${safe(id)}`);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`);
    xhr.timeout = 15 * 60 * 1000; // ربع ساعة: الفيديو الكبير على نت ضعيف بياخد وقت

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      let data: any = null;
      try { data = JSON.parse(xhr.responseText || '{}'); } catch { /* رد مش JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
        resolve(optimize(data.secure_url, kind === 'image'));
        return;
      }
      // الرسالة الحقيقية من Cloudinary — دي اللي بتقول السبب بالظبط
      const raw = data?.error?.message || (xhr.responseText || '').slice(0, 200);
      reject(new Error(raw ? `Cloudinary (${xhr.status}): ${raw}` : `فشل الرفع (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('الاتصال بالسحابة اتقطع. اتأكد من النت وجرّب تاني.'));
    xhr.ontimeout = () => reject(new Error('الرفع خد وقت طويل جداً واتوقف. جرّب فيديو أصغر أو رابط يوتيوب.'));
    xhr.onabort = () => reject(new Error('الرفع اتلغى.'));

    xhr.send(form);
  });
}

/** رفع ملف (صورة أو فيديو) والرجوع برابط مباشر */
export async function uploadFile(
  file: File,
  folder: string,
  id: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const kind = file.type.startsWith('video') || file.type.startsWith('audio') ? 'video' : 'image';
  // حد Cloudinary للرفع المباشر من غير توقيع: 100 ميجا. أكبر من كده بيترفض من عندهم.
  if (kind === 'video' && file.size > 100 * 1024 * 1024) {
    const mb = Math.round(file.size / (1024 * 1024));
    throw new Error(`الفيديو حجمه ${mb} ميجا، والحد الأقصى ١٠٠ ميجا. صغّره أو ارفعه على يوتيوب (غير مدرج) والصق الرابط.`);
  }
  return send(file, folder, id, kind, onProgress);
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
