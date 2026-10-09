/*
  بصمة الصورة — عشان نعرف إن صورتين لنفس الشقة حتى لو الملف مختلف.

  الفكرة (dHash): بنصغّر الصورة لـ ٩×٨ رمادي، وبنقارن كل بكسل باللي جنبه.
  أكبر = 1، أصغر = 0. الناتج ٦٤ بت = ١٦ حرف. الصورة لو اتضغطت أو اتغيّر
  حجمها أو اتحفظت من تاني، البصمة بتفضل هي هي تقريباً — عشان كده بنقارن
  بـ"المسافة" مش بالتساوي.

  مسافة Hamming = كام بت مختلف بين بصمتين:
    ٠ – ٥    نفس الصورة فعلاً
    ٦ – ١٠   غالباً نفس الصورة (اتقصّت أو اتعدّلت شوية)
    أكتر     صور مختلفة

  ليه في المتصفح؟ عشان مفيش سيرفر. الصورة بتتحمّل في canvas وبتتحسب
  محلياً. لو الصورة رفضت تتحمّل (CORS أو نت) بنرجّع null ونكمّل بالمواصفات —
  التطابق مبيقفش على الصور.
*/

const SIZE = 8;

/** بصمة ١٦ حرف من رابط صورة. بترجّع null لو الصورة مش قادرة تتقري. */
export function imageHash(url: string, timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url || typeof document === 'undefined') { resolve(null); return; }
    let done = false;
    const finish = (v: string | null) => { if (!done) { done = true; resolve(v); } };
    const timer = setTimeout(() => finish(null), timeoutMs);

    const img = new Image();
    img.crossOrigin = 'anonymous';     // من غيرها الـ canvas بيتلوّث ومنقدرش نقرا منه
    img.onerror = () => { clearTimeout(timer); finish(null); };
    img.onload = () => {
      clearTimeout(timer);
      try {
        const c = document.createElement('canvas');
        c.width = SIZE + 1; c.height = SIZE;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) { finish(null); return; }
        ctx.drawImage(img, 0, 0, SIZE + 1, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE + 1, SIZE);

        // رمادي بأوزان العين البشرية
        const grey: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          grey.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        let bits = '';
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            const a = grey[y * (SIZE + 1) + x];
            const b = grey[y * (SIZE + 1) + x + 1];
            bits += a > b ? '1' : '0';
          }
        }
        // ٦٤ بت → ١٦ حرف ست عشري
        let hex = '';
        for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
        finish(hex);
      } catch {
        finish(null);     // canvas متلوّث — بنكمّل من غير بصمة
      }
    };
    img.src = url;
  });
}

/** بصمات أول كام صورة في الإعلان */
export async function imageHashes(urls: string[] = [], max = 3): Promise<string[]> {
  const out = await Promise.all(urls.slice(0, max).map((u) => imageHash(u)));
  return out.filter((h): h is string => !!h);
}

const BITS: Record<string, number> = {};
for (let i = 0; i < 16; i++) BITS[i.toString(16)] = i.toString(2).split('1').length - 1;

/** كام بت مختلف بين بصمتين. بترجّع 64 (أبعد حاجة) لو واحدة ناقصة. */
export function hammingDistance(a?: string, b?: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    d += BITS[x.toString(16)] ?? 0;
  }
  return d;
}

/** أقرب بصمة بين مجموعتين */
export function bestHashDistance(a: string[] = [], b: string[] = []): number {
  let best = 64;
  a.forEach((x) => b.forEach((y) => { const d = hammingDistance(x, y); if (d < best) best = d; }));
  return best;
}
