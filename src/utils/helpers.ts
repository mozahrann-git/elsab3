export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(price) + ' ج.م';
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function generateWhatsAppLink(
  phone: string = '01021242871',
  propertyCode?: string,
  propertyTitle?: string,
  customMessage?: string
): string {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '2' + cleanPhone;
  }
  
  let message = customMessage;
  if (!message) {
    if (propertyCode) {
      message = `مهتم بشقة كود ${propertyCode} بالهضبة الوسطى`;
    } else {
      message = 'استفسار عن شقق ريسيل الهضبة الوسطى';
    }
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
}

export function generateCallLink(phone: string = '01021242871'): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleanPhone}`;
}

export function compressImage(
  file: File, 
  maxWidth = 1000, 
  maxHeight = 750, 
  quality = 0.62
): Promise<string> {
  return new Promise((resolve) => {
    // Try modern createImageBitmap first for maximum mobile performance and low memory
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      createImageBitmap(file)
        .then((bitmap) => {
          let width = bitmap.width;
          let height = bitmap.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            bitmap.close();
            fallbackWithImageElement(file, maxWidth, maxHeight, quality, resolve);
            return;
          }

          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        })
        .catch(() => {
          fallbackWithImageElement(file, maxWidth, maxHeight, quality, resolve);
        });
      return;
    }

    fallbackWithImageElement(file, maxWidth, maxHeight, quality, resolve);
  });
}

function fallbackWithImageElement(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  resolve: (res: string) => void
) {
  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
  } catch {
    // If URL.createObjectURL fails, fallback to standard FileReader
    const reader = new FileReader();
    reader.onload = () => {
      const src = (reader.result as string) || '';
      compressImageFromSrc(src, maxWidth, maxHeight, quality, resolve);
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
    return;
  }

  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    compressImageElementToCanvas(img, maxWidth, maxHeight, quality, resolve);
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    // Last resort FileReader
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  };
  img.src = objectUrl;
}

function compressImageElementToCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  resolve: (res: string) => void
) {
  let width = img.naturalWidth || img.width || 800;
  let height = img.naturalHeight || img.height || 600;

  if (width > height) {
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    resolve(img.src);
    return;
  }

  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  resolve(dataUrl);
}

function compressImageFromSrc(
  src: string,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  resolve: (res: string) => void
) {
  if (!src) return resolve('');
  const img = new Image();
  img.onload = () => compressImageElementToCanvas(img, maxWidth, maxHeight, quality, resolve);
  img.onerror = () => resolve(src);
  img.src = src;
}

/**
 * Ensures any base64 image string is optimized and fits comfortably in Firestore
 */
export async function optimizeImageForFirestore(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl; // Already a URL (e.g. Unsplash or external link)
  }
  // If base64 string is under 60KB, it's already very compact
  if (dataUrl.length < 60000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    compressImageFromSrc(dataUrl, 900, 675, 0.58, (compressed) => {
      resolve(compressed || dataUrl);
    });
  });
}

export interface VideoEmbedInfo {
  type: 'youtube' | 'drive' | 'vimeo' | 'direct' | 'link';
  embedUrl?: string;
  src?: string;
  url: string;
}

export function getVideoEmbedInfo(url?: string, isMuted?: boolean): VideoEmbedInfo | null {
  if (!url) return null;
  let clean = url.trim();
  // Strip enclosing quotes if any
  clean = clean.replace(/^["']|["']$/g, '').trim();
  if (!clean) return null;

  // 1. Direct blob: or data: video file or common video extensions
  if (
    clean.startsWith('blob:') || 
    clean.startsWith('data:video') || 
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean)
  ) {
    return {
      type: 'direct',
      src: clean,
      url: clean
    };
  }

  // 2. YouTube (standard, shorts, embed, youtu.be, mobile)
  const ytMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^\"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const muteParam = isMuted ? '&mute=1' : '';
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&autoplay=1${muteParam}`,
      url: clean
    };
  }

  // 3. Google Drive (file/d/..., open?id=..., uc?id=...)
  const driveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?id=([a-zA-Z0-9_-]+))/i);
  const driveId = driveMatch ? (driveMatch[1] || driveMatch[2] || driveMatch[3]) : null;
  if (driveId) {
    return {
      type: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      url: clean
    };
  }

  // 4. Dropbox direct link conversion
  if (clean.includes('dropbox.com')) {
    const directDropbox = clean.replace(/[?&]dl=0/g, '').replace(/\?raw=1|\?dl=1/g, '') + '?raw=1';
    return {
      type: 'direct',
      src: directDropbox,
      url: clean
    };
  }

  // 5. Vimeo
  const vimeoMatch = clean.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    const muteParam = isMuted ? '&muted=1' : '';
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1${muteParam}`,
      url: clean
    };
  }

  return {
    type: 'link',
    embedUrl: clean,
    url: clean
  };
}

export function formatPropertyDescription(property: {
  description?: string;
  title?: string;
  neighborhood?: string;
  location?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  finishing?: string;
  finishingLabel?: string;
  price?: number;
  pricePerMeter?: number;
  features?: string[];
  note?: string;
}): string {
  const area = property.area ? `${property.area} م²` : '';
  const rooms = property.bedrooms ? `${property.bedrooms} غرف نوم` : '';
  const baths = property.bathrooms ? `${property.bathrooms} حمام` : '';
  const floor = property.floor || 'دور متكرر';
  const finishing = property.finishingLabel || (property.finishing === 'finished' ? 'سوبر لوكس جاهز للسكن الفوري' : 'نصف تشطيب على المحارة والحلوق');
  const neighborhood = property.neighborhood || 'الهضبة الوسطى';
  const address = property.location && property.location.trim().length > 0 
    ? property.location.trim() 
    : '[العنوان بالتفصيل: اسم الشارع ورقم العقار]';

  let additionalNotes = '';
  if (property.description) {
    const lines = property.description
      .split('\n')
      .map(l => l.replace(/^[\s*•\-#\d.:]+/, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('كود') && !l.startsWith('السعر') && !l.includes('الهضبة الوسطى'));
    
    const uniqueRemarks = lines.filter(l => 
      !l.includes('غرف') && 
      !l.includes('حمام') && 
      !l.includes('متر') && 
      !l.includes('دور ') && 
      !l.includes('تشطيب') && 
      !l.includes('المباحث') &&
      !l.includes('الحي')
    );
    if (uniqueRemarks.length > 0) {
      additionalNotes = ` تشتمل الوحدة على: ${uniqueRemarks.join('، ')}.`;
    }
  }

  if (property.note && property.note.trim().length > 0) {
    additionalNotes += ` ملاحظات إضافية: ${property.note.trim()}.`;
  }

  const featuresList = property.features && property.features.length > 0
    ? `تضم الشقة مرافق ومميزات تشمل ${property.features.slice(0, 4).join(' و ')}.`
    : 'تتميز العمارة بمدخل فندقي رخام ومصعد متطور وموقع استراتيجي هادئ بالقرب من كافة المحاور والخدمات.';

  const avgMeterNotice = property.pricePerMeter 
    ? `سعر المتر المحسوب لهذه الوحدة ${formatPrice(property.pricePerMeter)} (متوسط سعر المتر في المنطقة: [متوسط سعر المتر]).`
    : 'متوسط سعر المتر الاسترشادي بالحي: [متوسط سعر المتر].';

  return `شقة سكنية راقية للبيع بمساحة ${area} تقع في ${neighborhood} بالهضبة الوسطى (${address}). الوحدة في ${floor}، بتوزيع هندسي مريح يضم ${rooms} و${baths} وصالة استقبال واسعة، بتشطيب ${finishing}. ${featuresList}${additionalNotes} ${avgMeterNotice}`;
}


