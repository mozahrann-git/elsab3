import { Property } from '../types';

/*
  بيحوّل شقق العرض المخصوص لصور جاهزة تتبعت في الواتساب مباشرة،
  للعملاء اللي مش بيفتحوا لينكات.

  الرسم بالـ canvas بتاع المتصفح نفسه — مفيش مكتبة زيادة ومفيش سيرفر.
*/

const W = 1080;
const H = 1350;              // مقاس ستوري/بوست مربع طويل، مناسب للواتساب
const GOLD = '#A07A26';
const INK = '#141414';
const CREAM = '#F6F4EF';
const MUTED = '#8C877D';

const money = (n?: number) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');

/** بيحمّل صورة ويرجّعها، وبيرجّع null لو الصورة مش راضية تتحمّل */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';   // لازم عشان الرسم ما يلوّثش الـ canvas
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** بيرسم نص عربي بيلف على أكتر من سطر، وبيرجّع آخر ارتفاع وصله */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3): number {
  // بنبني السطور الأول كلها، وبعدين نقص لو زادت — كده مبنقطعش جملة لسه فيها مكان
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; }
    else line = test;
  });
  if (line) lines.push(line);

  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines && shown.length) {
    let last = shown[shown.length - 1];
    while (last.length > 4 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    shown[shown.length - 1] = `${last}…`;
  }

  let cy = y;
  shown.forEach((l) => { ctx.fillText(l, x, cy); cy += lh; });
  return cy;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface CardUnit {
  code: string;
  title?: string;
  note?: string;
  property?: Property;
}

/** بيرسم كارت شقة واحد ويرجّعه Blob جاهز للتنزيل */
export async function renderUnitCard(u: CardUnit, opts: { agentName?: string; agentPhone?: string }): Promise<Blob | null> {
  const p = u.property;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  const RX = (w: number, s: number) => `${w} ${s}px "Readex Pro", "IBM Plex Sans Arabic", sans-serif`;

  // الخلفية
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // الصورة فوق
  const photo = await loadImage(p?.images?.[0] || '');
  const PH = 620;
  ctx.fillStyle = '#E7E2D8';
  ctx.fillRect(0, 0, W, PH);
  if (photo) {
    // بنملا الإطار من غير ما نطوّل الصورة
    const r = Math.max(W / photo.width, PH / photo.height);
    const dw = photo.width * r, dh = photo.height * r;
    ctx.drawImage(photo, (W - dw) / 2, (PH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = RX(500, 34);
    ctx.textAlign = 'center';
    ctx.fillText('صورة الشقة عند المستشار', W / 2, PH / 2);
    ctx.textAlign = 'right';
  }

  // تدرّج تحت الصورة عشان الكود يبان
  const g = ctx.createLinearGradient(0, PH - 220, 0, PH);
  g.addColorStop(0, 'rgba(20,20,20,0)');
  g.addColorStop(1, 'rgba(20,20,20,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, PH - 220, W, 220);

  // شارة الكود
  ctx.font = RX(700, 40);
  const codeW = ctx.measureText(u.code).width + 56;
  ctx.fillStyle = INK;
  roundRect(ctx, W - 56 - codeW, PH - 116, codeW, 68, 18);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.fillText(u.code, W - 84, PH - 70);

  // المحتوى
  let y = PH + 86;
  ctx.fillStyle = INK;
  ctx.font = RX(700, 52);
  y = wrapText(ctx, p?.title || u.title || 'شقة بالهضبة الوسطى', W - 64, y, W - 128, 70, 2);

  y += 14;
  ctx.fillStyle = MUTED;
  ctx.font = RX(500, 34);
  const specs = [
    p?.neighborhood,
    p?.area ? `${p.area} م²` : '',
    p?.bedrooms ? `${p.bedrooms} غرف` : '',
    p?.finishing === 'finished' ? 'متشطبة' : p?.finishing ? 'نص تشطيب' : '',
  ].filter(Boolean).join('  ·  ');
  ctx.fillText(specs, W - 64, y);

  // السعر
  y += 96;
  ctx.fillStyle = INK;
  ctx.font = RX(700, 74);
  ctx.fillText(`${money(p?.price)} ج.م`, W - 64, y);

  if (p?.pricePerMeter) {
    y += 52;
    ctx.fillStyle = GOLD;
    ctx.font = RX(500, 32);
    ctx.fillText(`${money(p.pricePerMeter)} ج.م للمتر`, W - 64, y);
  }

  // ملاحظة المستشار
  if ((u.note || '').trim()) {
    y += 70;
    ctx.fillStyle = '#FFFFFF';
    const noteTop = y - 46;
    roundRect(ctx, 64, noteTop, W - 128, 150, 24);
    ctx.fill();
    ctx.strokeStyle = '#ECE8DF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4A463F';
    ctx.font = RX(500, 31);
    wrapText(ctx, `"${u.note!.trim()}"`, W - 96, noteTop + 58, W - 192, 44, 2);
  }

  // الفوتر
  ctx.fillStyle = INK;
  ctx.fillRect(0, H - 150, W, 150);

  ctx.fillStyle = GOLD;
  roundRect(ctx, W - 64 - 76, H - 113, 76, 76, 20);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = RX(700, 38);
  ctx.textAlign = 'center';
  ctx.fillText('٧', W - 64 - 38, H - 62);
  ctx.textAlign = 'right';

  ctx.fillStyle = CREAM;
  ctx.font = RX(700, 36);
  ctx.fillText('السبع للعقارات', W - 160, H - 84);
  ctx.fillStyle = '#C9C3B8';
  ctx.font = RX(500, 27);
  ctx.fillText(opts.agentName ? `${opts.agentName} · ${opts.agentPhone || ''}`.trim() : 'elsab3.com', W - 160, H - 44);

  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = RX(700, 30);
  ctx.fillText('ELSAB3.COM', 64, H - 62);
  ctx.textAlign = 'right';

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
}

/** بينزّل الصور واحدة ورا التانية */
export async function downloadOfferCards(
  units: CardUnit[],
  opts: { agentName?: string; agentPhone?: string; leadName?: string; onProgress?: (i: number, total: number) => void },
): Promise<number> {
  let saved = 0;
  for (let i = 0; i < units.length; i += 1) {
    opts.onProgress?.(i + 1, units.length);
    const blob = await renderUnitCard(units[i], opts);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${opts.leadName ? `${opts.leadName}-` : ''}${units[i].code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // بنستنى شوية عشان المتصفح ما يلغيش التنزيلات المتتالية
    await new Promise((r) => setTimeout(r, 350));
    URL.revokeObjectURL(url);
    saved += 1;
  }
  return saved;
}
