import * as XLSX from 'xlsx';
import { Property, HadabaWostaNeighborhood, FinishingType, PropertyType } from '../types';

// Default architectural luxury photos for El Seba Real Estate listings
export const DEFAULT_EXCEL_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
];

/**
 * EXACT Excel / CSV Column Structure as provided:
 * Code, DISTRICT, finishing, Area, Total Price, Floor, Rooms, w/c, Details, Location, Note, owner number, sales
 */
export interface ExcelRowFormat {
  'Code': string;
  'DISTRICT': string;
  'finishing': string;
  'Area': number | string;
  'Total Price': number | string;
  'Floor': number | string;
  'Rooms': number | string;
  'w/c': number | string;
  'Details': string;
  'Location': string;
  'Note': string;
  'owner number': string;
  'sales': string;
  'Video URL'?: string;
}

// Extract numeric floor for Excel export
export function extractFloorNumber(floorStr?: string): number | string {
  if (!floorStr) return 3;
  if (floorStr.includes('أرضي') || floorStr.includes('ارضي')) return 0;
  if (floorStr.includes('أول') || floorStr.includes('اول')) return 1;
  if (floorStr.includes('ثاني') || floorStr.includes('تاني')) return 2;
  if (floorStr.includes('ثالث') || floorStr.includes('تالت')) return 3;
  if (floorStr.includes('رابع')) return 4;
  if (floorStr.includes('خامس')) return 5;
  if (floorStr.includes('سادس')) return 6;
  if (floorStr.includes('سابع')) return 7;
  if (floorStr.includes('ثامن')) return 8;
  if (floorStr.includes('تاسع')) return 9;
  if (floorStr.includes('عاشر')) return 10;
  if (floorStr.includes('12') || floorStr.includes('ثاني عشر')) return 12;
  const match = floorStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : floorStr;
}

// Convert numeric floor back into polite Arabic label
export function formatFloorNumber(floorVal: any, details?: string): string {
  if (floorVal !== '' && floorVal !== undefined && floorVal !== null) {
    const num = Number(floorVal);
    if (!isNaN(num)) {
      if (num === 0) return 'الدور الأرضي';
      if (num === 1) return 'الدور الأول';
      if (num === 2) return 'الدور الثاني';
      if (num === 3) return 'الدور الثالث';
      if (num === 4) return 'الدور الرابع';
      if (num === 5) return 'الدور الخامس';
      if (num === 6) return 'الدور السادس';
      if (num === 7) return 'الدور السابع';
      if (num === 8) return 'الدور الثامن';
      if (num === 9) return 'الدور التاسع';
      if (num === 10) return 'الدور العاشر';
      if (num === 11) return 'الدور الحادي عشر';
      if (num === 12) return 'الدور الثاني عشر';
      return `الدور ${num}`;
    }
    const str = String(floorVal).trim();
    if (str) return str;
  }

  // Fallback search in details
  if (details) {
    if (details.includes('دور ارضي') || details.includes('أرضي')) return 'الدور الأرضي';
    if (details.includes('دور اول') || details.includes('الأول') || details.includes('اول علوى')) return 'الدور الأول';
    if (details.includes('دور تاني') || details.includes('الثاني') || details.includes('تاني علوى')) return 'الدور الثاني';
    if (details.includes('دور تالت') || details.includes('الثالث')) return 'الدور الثالث';
    if (details.includes('دور رابع') || details.includes('الرابع')) return 'الدور الرابع';
    if (details.includes('دور خامس') || details.includes('الخامس')) return 'الدور الخامس';
    if (details.includes('دور سادس') || details.includes('السادس')) return 'الدور السادس';
    if (details.includes('دور ثامن') || details.includes('الثامن')) return 'الدور الثامن';
    if (details.includes('دور 12') || details.includes('دور ثاني عشر')) return 'الدور الثاني عشر';
  }
  return 'الدور الثالث';
}

// Map a Property object into the EXACT Excel columns
export function mapPropertyToExcelRow(p: Property): ExcelRowFormat {
  const finishingStr = p.finishing === 'finished' ? 'Fully Finished' : 'Semi Finished';
  return {
    'Code': p.code || '',
    'DISTRICT': p.neighborhood || 'الحي الأول',
    'finishing': finishingStr,
    'Area': p.area || 0,
    'Total Price': p.price ? p.price.toLocaleString('en-US') : 0,
    'Floor': extractFloorNumber(p.floor),
    'Rooms': p.bedrooms || 3,
    'w/c': p.bathrooms || 2,
    'Details': p.description || '',
    'Location': p.location || p.view || '',
    'Note': p.note || (p.paymentMethod === 'cash_or_facilities' ? 'تسهيلات' : ''),
    'owner number': p.ownerPhone || '',
    'sales': p.sales || '',
    'Video URL': p.videoUrl || ''
  };
}

// Convert Arabic Indic numerals (٠-٩) to standard digits (0-9)
export function convertArabicIndicDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(arabicDigits[i], String(i));
  }
  return res;
}

// Clean and normalize column keys for flexible matching
function normalizeKey(key: string): string {
  if (!key) return '';
  return convertArabicIndicDigits(String(key))
    .trim()
    .toLowerCase()
    .replace(/[_\-\s\(\)\/\\\[\]\:\.\#\%\,\;\"\'\’\‘]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ي/g, 'ى');
}

// Normalize neighborhood name
function cleanNeighborhood(val: any, details?: string): HadabaWostaNeighborhood {
  const valStr = convertArabicIndicDigits(String(val || '')).trim().toLowerCase();

  // 1. Check direct neighborhood cell value first
  if (valStr) {
    if (valStr.includes('مباحث')) return 'تقسيم المباحث';
    if (valStr.includes('دبلوماسي') || valStr.includes('دبلوماسيين')) return 'الحي الأول';
    if (valStr.includes('نادي الصيد') || valStr.includes('نادى الصيد')) return 'الحي السادس';
    if (valStr.includes('جامعة الحديثة') || valStr.includes('الجامعة الحديثة') || valStr.includes('حديثة') || valStr.includes('حديثه') || valStr.includes('mti')) return 'الحي السابع';
    if (valStr.includes('معراج')) return 'الحي الأول';
    if (valStr.includes('كارفور')) return 'الحي الأول';
    if (valStr.includes('ثامن') || valStr.includes('الثامن') || valStr === '8' || valStr === '8th') return 'الحي الثامن';
    if (valStr.includes('سابع') || valStr.includes('السابع') || valStr === '7' || valStr === '7th') return 'الحي السابع';
    if (valStr.includes('سادس') || valStr.includes('السادس') || valStr === '6' || valStr === '6th') return 'الحي السادس';
    if (valStr.includes('خامس') || valStr.includes('الخامس') || valStr === '5' || valStr === '5th') return 'الحي الخامس';
    if (valStr.includes('رابع') || valStr.includes('الرابع') || valStr === '4' || valStr === '4th') return 'الحي الرابع';
    if (valStr.includes('ثالث') || valStr.includes('الثالث') || valStr === '3' || valStr === '3th') return 'الحي الثالث';
    if (valStr.includes('ثان') || valStr.includes('الثاني') || valStr.includes('الثانى') || valStr === '2' || valStr === '2nd') return 'الحي الثاني';
    if (valStr.includes('اول') || valStr.includes('الأول') || valStr.includes('الاول') || valStr === '1' || valStr === '1st') return 'الحي الأول';
  }

  // 2. Fallback to details string if val was not matched
  const detStr = convertArabicIndicDigits(String(details || '')).toLowerCase();
  if (detStr.includes('مباحث')) return 'تقسيم المباحث';
  if (detStr.includes('معراج')) return 'الحي الأول';
  if (detStr.includes('نادي الصيد') || detStr.includes('نادى الصيد')) return 'الحي السادس';
  if (detStr.includes('جامعة الحديثة') || detStr.includes('الجامعة الحديثة') || detStr.includes('mti')) return 'الحي السابع';
  if (detStr.includes('حي ثامن') || detStr.includes('الحي الثامن')) return 'الحي الثامن';
  if (detStr.includes('حي سابع') || detStr.includes('الحي السابع')) return 'الحي السابع';
  if (detStr.includes('حي سادس') || detStr.includes('الحي السادس')) return 'الحي السادس';
  if (detStr.includes('حي خامس') || detStr.includes('الحي الخامس')) return 'الحي الخامس';
  if (detStr.includes('حي رابع') || detStr.includes('الحي الرابع')) return 'الحي الرابع';
  if (detStr.includes('حي ثالث') || detStr.includes('الحي الثالث')) return 'الحي الثالث';
  if (detStr.includes('حي ثاني') || detStr.includes('حي ثان') || detStr.includes('الحي الثاني') || detStr.includes('الحي الثانى')) return 'الحي الثاني';
  if (detStr.includes('حي اول') || detStr.includes('حي أول') || detStr.includes('الحي الأول') || detStr.includes('الحي الاول')) return 'الحي الأول';

  return 'الحي الأول';
}

// Normalize finishing
function cleanFinishing(val: any, details?: string): FinishingType {
  const combined = `${val || ''} ${details || ''}`.toLowerCase();
  if (
    combined.includes('semi') ||
    combined.includes('نصف') ||
    combined.includes('نص') ||
    combined.includes('محارة') ||
    combined.includes('3-apr') ||
    combined.includes('3/4')
  ) {
    return 'semi_finished';
  }
  return 'finished';
}

// Clean number with support for Arabic text, millions, thousands, and indic digits
function cleanNumber(val: any, defaultVal: number): number {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;

  let str = convertArabicIndicDigits(String(val)).trim().toLowerCase();

  // check for "مليون" e.g. 2.5 مليون or 3 مليون
  if (str.includes('مليون')) {
    const numPart = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(numPart) && numPart > 0) {
      return Math.round(numPart * 1000000);
    }
  }
  // check for "ألف" e.g. 800 الف
  if (str.includes('الف') || str.includes('ألف')) {
    const numPart = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(numPart) && numPart > 0) {
      return Math.round(numPart * 1000);
    }
  }

  const cleaned = str.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
}

// Helper to safely match synonyms without single-character or substring false positives
function matchesSynonym(normCell: string, syn: string): boolean {
  const normSyn = normalizeKey(syn);
  if (!normCell || !normSyn) return false;
  // 1. Exact match
  if (normCell === normSyn) return true;
  // 2. Only allow prefix or substring match if synonym has at least 3 characters
  if (normSyn.length >= 3) {
    if (normCell === normSyn || normCell.startsWith(normSyn) || normCell.endsWith(normSyn) || normCell.includes(normSyn)) {
      return true;
    }
  }
  return false;
}

// Column synonyms dictionary for smart fuzzy matching
const COLUMN_SYNONYMS: Record<string, string[]> = {
  code: [
    'code', 'كود', 'الكود', 'كودالوحده', 'كودالوحدة', 'كودالشقة', 'كودالشقه', 'كودالعقار',
    'كودالاعلان', 'كودالعرض', 'رقمكود', 'رقمشقة', 'رقمشقه', 'رقموحدة', 'رقموحده', 'رقم',
    'مسلسل', 'الرقم', 'رمز', 'رمزالوحدة', 'رمزالوحده', 'id', 'unitcode', 'propertycode', 
    'ref', 'reference', 'no', 'unit', 'unitno'
  ],
  district: [
    'district', 'الحي', 'حي', 'المنطقة', 'المنطقه', 'منطقة', 'منطقه', 'الموقع', 'موقع',
    'neighborhood', 'zone', 'areaname', 'العنوان', 'مكان'
  ],
  finishing: ['finishing', 'finish', 'التشطيب', 'تشطيب', 'حالةالتشطيب', 'نوعالتشطيب', 'المواصفات'],
  area: ['area', 'المساحة', 'المساحه', 'مساحة', 'مساحه', 'المتر', 'المساحةم2', 'المساحهم2', 'م²', 'م2', 'sqm', 'size', 'space'],
  price: ['totalprice', 'price', 'السعر', 'سعر', 'السعرالجمالي', 'السعرالاجمالي', 'السعرالكاش', 'المطلوب', 'المبلغ', 'الثمن', 'القيمة', 'القيمه', 'سعرالبيع', 'كاش', 'total', 'amount', 'cost'],
  floor: ['floor', 'الدور', 'دور', 'الطابق', 'طابق', 'level', 'story'],
  rooms: ['rooms', 'الغرف', 'غرف', 'عددالغرف', 'نوم', 'عددغرفالنوم', 'bedrooms', 'beds', 'bed'],
  wc: ['wc', 'حمام', 'حمامات', 'عددالحمامات', 'الحمامات', 'الحمام', 'bathrooms', 'baths', 'toilet', 'toilets'],
  details: ['details', 'الوصف', 'تفاصيل', 'الوصفوالتفاصيل', 'المواصفات', 'مواصفات', 'شرح', 'البيان', 'بيان', 'description', 'notes', 'بيانات'],
  location: ['location', 'الموقع', 'المكان', 'الشارع', 'الفيو', 'الاطلالة', 'الإطلالة', 'العنوان', 'view', 'address'],
  note: ['note', 'notes', 'ملاحظات', 'ملاحظة', 'ملحوظة', 'نظامالسداد', 'طريقةالدفع', 'تسهيلات', 'الدفع', 'طريقهالسداد'],
  ownerPhone: ['ownernumber', 'phone', 'mobile', 'رقم المالك', 'هاتف المالك', 'رقم الهاتف', 'الموبايل', 'التليفون', 'تليفون', 'whatsapp', 'واتساب', 'contact', 'موبايل'],
  sales: ['sales', 'المبيعات', 'مسؤولالمبيعات', 'الوسيط', 'agent'],
  video: ['video', 'videourl', 'فيديو', 'الفيديو', 'رابطفيديو', 'جولةفيديو', 'youtube', 'يوتيوب', 'drive', 'vimeo']
};

export interface SheetStat {
  name: string;
  count: number;
}

// Parse an uploaded Excel / CSV file supporting ALL sheets, flexible headers, and ALL data rows
export async function parseExcelFile(file: File): Promise<{
  properties: Property[];
  errors: string[];
  warnings: string[];
  totalRowsFound: number;
  sheetsFound: string[];
  sheetStats: SheetStat[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('الملف فارغ أو تعذر قراءته');
        }

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true, codepage: 65001 });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('لا توجد صفحات داخل ملف الإكسيل');
        }

        const properties: Property[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];
        const nowStr = new Date().toISOString();
        const seenCodes = new Set<string>();
        const sheetsFound: string[] = [];
        const sheetStats: SheetStat[] = [];

        // 1. Iterate over ALL sheets in the workbook
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          // Convert worksheet to 2D array of rows
          const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!Array.isArray(grid) || grid.length === 0) continue;

          // 2. Smart Header Detection: scan the first 15 rows to find the row with the most column matches
          let bestHeaderRowIndex = 0;
          let bestHeaderScore = 0;
          let bestColumnMap: Record<number, string> = {};

          const maxHeaderScan = Math.min(15, grid.length);
          for (let r = 0; r < maxHeaderScan; r++) {
            const row = grid[r];
            if (!Array.isArray(row)) continue;

            let currentScore = 0;
            const currentMap: Record<number, string> = {};

            row.forEach((cellVal, colIdx) => {
              const norm = normalizeKey(String(cellVal));
              if (!norm) return;

              for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
                const isMatch = synonyms.some(syn => matchesSynonym(norm, syn));

                if (isMatch && !Object.values(currentMap).includes(field)) {
                  currentMap[colIdx] = field;
                  currentScore++;
                  break;
                }
              }
            });

            if (currentScore > bestHeaderScore) {
              bestHeaderScore = currentScore;
              bestHeaderRowIndex = r;
              bestColumnMap = currentMap;
            }
          }

          // Fallback if no header row had matches: use row 0 with positional guesses or headers
          if (bestHeaderScore === 0 && grid.length > 0) {
            bestHeaderRowIndex = 0;
            const firstRow = grid[0];
            firstRow.forEach((cellVal, colIdx) => {
              const str = normalizeKey(String(cellVal));
              if (str.includes('كود') || str.includes('code')) bestColumnMap[colIdx] = 'code';
              else if (str.includes('حي') || str.includes('district') || str.includes('منطق')) bestColumnMap[colIdx] = 'district';
              else if (str.includes('سعر') || str.includes('price')) bestColumnMap[colIdx] = 'price';
              else if (str.includes('مساح') || str.includes('area')) bestColumnMap[colIdx] = 'area';
              else if (str.includes('دور') || str.includes('floor')) bestColumnMap[colIdx] = 'floor';
              else if (str.includes('غرف') || str.includes('room')) bestColumnMap[colIdx] = 'rooms';
              else if (str.includes('حمام') || str.includes('wc')) bestColumnMap[colIdx] = 'wc';
              else if (str.includes('تشطيب') || str.includes('finish')) bestColumnMap[colIdx] = 'finishing';
              else if (str.includes('وصف') || str.includes('detail') || str.includes('شرح')) bestColumnMap[colIdx] = 'details';
            });
          }

          // 3. Process every data row starting right after the detected header row
          let sheetPropCount = 0;
          let activeCategoryDistrict: string = '';

          for (let r = bestHeaderRowIndex + 1; r < grid.length; r++) {
            const row = grid[r];
            if (!Array.isArray(row)) continue;

            // Check if row has ANY content
            const hasAnyData = row.some(cell => String(cell).trim().length > 0);
            if (!hasAnyData) continue;

            // Helper to get field value by column map
            const getField = (field: string): any => {
              for (const [colIdxStr, mappedField] of Object.entries(bestColumnMap)) {
                if (mappedField === field) {
                  const val = row[Number(colIdxStr)];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return val;
                  }
                }
              }
              return '';
            };

            const rawCode = getField('code');
            const rawDistrict = getField('district');
            const rawFinishing = getField('finishing');
            const rawArea = getField('area');
            const rawPrice = getField('price');
            const rawFloor = getField('floor');
            const rawRooms = getField('rooms');
            const rawWc = getField('wc');
            const rawDetails = getField('details');
            const rawLocation = getField('location');
            const rawNote = getField('note');
            const rawOwnerNumber = getField('ownerPhone');
            const rawSales = getField('sales');
            const rawVideo = getField('video');

            // Detect section/category headers inside the sheet (e.g. single cell like "الحي الرابع")
            const nonBlankCells = row.filter(c => String(c).trim().length > 0);
            if (nonBlankCells.length === 1) {
              const singleText = String(nonBlankCells[0]).trim();
              if (singleText.length < 35 && (singleText.includes('حي') || singleText.includes('تقسيم') || singleText.includes('منطقة'))) {
                activeCategoryDistrict = singleText;
                continue;
              }
            }

            // Combine all text for fallback extraction
            const allRowText = row.map(c => String(c || '').trim()).filter(Boolean).join(' ');
            const detailsStr = String(rawDetails || '').trim() || (allRowText.length > 30 ? allRowText : '');

            // Area resolution with fallback search in text (e.g. 160م or 175 متر)
            let area = cleanNumber(rawArea, 0);
            if (area === 0) {
              const areaMatch = allRowText.match(/(\d{2,3})\s*(م|متر|م²|م2|sqm)/i);
              if (areaMatch) {
                area = parseInt(areaMatch[1], 10);
              }
            }
            if (area === 0) area = 135; // safe default

            // Price resolution with fallback search in text
            let price = cleanNumber(rawPrice, 0);
            if (price === 0) {
              // search for million or large numbers
              if (allRowText.includes('مليون')) {
                const milMatch = allRowText.match(/(\d[\d,.]*)\s*مليون/);
                if (milMatch) {
                  const mVal = parseFloat(milMatch[1].replace(/,/g, ''));
                  if (!isNaN(mVal) && mVal > 0) price = Math.round(mVal * 1000000);
                }
              } else {
                const priceMatch = allRowText.match(/(\d{6,8})/);
                if (priceMatch) {
                  price = parseInt(priceMatch[1], 10);
                }
              }
            }
            if (price === 0) price = 2500000; // safe default

            // District resolution (cell -> category banner -> sheet name -> details -> default)
            const districtText = rawDistrict || activeCategoryDistrict || sheetName || detailsStr;
            const district = cleanNeighborhood(districtText, detailsStr);

            // Finishing resolution
            const finishing = cleanFinishing(rawFinishing, detailsStr);
            const rawFinishingStr = String(rawFinishing).toLowerCase();
            const finishingLabel = rawFinishingStr.includes('3-apr') || rawFinishingStr.includes('3/4')
              ? '3/4 تشطيب فاخر'
              : (finishing === 'finished' ? 'تشطيب سوبر لوكس' : 'نصف تشطيب');

            // Floor resolution
            const floor = formatFloorNumber(rawFloor, detailsStr);

            // Rooms & Bathrooms
            let bedrooms = cleanNumber(rawRooms, 0);
            if (bedrooms === 0) {
              const roomMatch = detailsStr.match(/(\d)\s*(غرف|نوم|غرفه|غرفة)/);
              if (roomMatch) bedrooms = parseInt(roomMatch[1], 10);
              else bedrooms = area >= 170 ? 3 : 2;
            }
            bedrooms = Math.max(1, Math.min(8, Math.round(bedrooms)));

            let bathrooms = cleanNumber(rawWc, 0);
            if (bathrooms === 0) {
              const wcMatch = detailsStr.match(/(\d)\s*(حمام|حمامات)/);
              if (wcMatch) bathrooms = parseInt(wcMatch[1], 10);
              else bathrooms = area >= 160 ? 2 : 1;
            }
            bathrooms = Math.max(1, Math.min(5, Math.round(bathrooms)));

            const location = String(rawLocation || '').trim();
            const note = String(rawNote || '').trim();
            const ownerPhone = String(rawOwnerNumber || '').trim() || '01000000000';
            const sales = String(rawSales || '').trim();

            // Title
            let title = `شقة ${area}م² ${district}`;
            if (location) {
              title += ` (${location})`;
            } else if (note && note.length <= 25) {
              title += ` (${note})`;
            }

            // Code extraction - strictly preserving the exact code from the user's sheet
            let code = '';

            // 1. From mapped 'code' column
            if (rawCode !== undefined && rawCode !== null) {
              const strVal = String(rawCode).trim();
              if (strVal && strVal !== '0') {
                code = strVal;
              }
            }

            // 2. Check if details, description or notes contains an explicit code (e.g. كود: H1612 or Code: H1404)
            const codePattern = /(?:كود\s*(?:الوحدة|الوحده|الشقة|الشقه|العقار)?|code|ref|id)\s*[:：=\-\/]?\s*([A-Za-z0-9\-_#]{2,20})/i;
            const textToSearch = `${detailsStr} ${note} ${allRowText}`;
            const textMatch = textToSearch.match(codePattern);
            if (textMatch && textMatch[1]) {
              // If we didn't have a code, OR if column code was just a row index (1, 2) while details has the actual code (H1612)
              if (!code || /^\d{1,2}$/.test(code)) {
                code = textMatch[1].trim();
              }
            }

            // 3. Check column 0 (Column A in Excel is standard for unit/property code)
            if (!code && row.length > 0) {
              const firstCell = String(row[0] || '').trim();
              if (
                firstCell &&
                firstCell !== '0' &&
                firstCell.length <= 15 &&
                !firstCell.includes('شقة') &&
                !firstCell.includes('الهضبة') &&
                !firstCell.includes('جنيه')
              ) {
                code = firstCell;
              }
            }

            // 4. Absolute fallback only if the sheet row has no code at all:
            if (!code) {
              code = `كود-${properties.length + 1}`;
            }

            // Ensure uniqueness if duplicate code is encountered in the sheet
            if (seenCodes.has(code)) {
              code = `${code} (${properties.length + 1})`;
            }
            seenCodes.add(code);

            // Feature list extraction
            const featureList: string[] = [];
            if (detailsStr) {
              const lines = detailsStr.split(/[\n\*\•\-]/);
              lines.forEach((line) => {
                const clean = line.trim();
                if (clean && !clean.startsWith('كود') && !clean.startsWith('السعر') && clean.length > 2 && clean.length < 50) {
                  featureList.push(clean);
                }
              });
            }

            const combinedText = `${detailsStr} ${note} ${location}`;
            const hasElevator = (combinedText.includes('اسانسير') || combinedText.includes('أسانسير')) && !combinedText.includes('بدون اسانسير') && !note.includes('بدون أسانسير');
            const hasGarage = combinedText.includes('جراج') || combinedText.includes('باكية') || combinedText.includes('حصة جراج');
            const registeredContract = combinedText.includes('حصة بالأرض') || combinedText.includes('حصه بالأرض') || combinedText.includes('تصالح') || combinedText.includes('مسجلة') || combinedText.includes('رخصة');
            const hasInstallment = note.includes('قسط') || note.includes('تسهيل') || detailsStr.includes('قسط') || detailsStr.includes('تسهيلات');

            const pricePerMeter = Math.round(price / area);

            let videoUrl: string | undefined = undefined;
            if (rawVideo && typeof rawVideo === 'string' && rawVideo.trim()) {
              videoUrl = rawVideo.trim();
            } else {
              const videoMatch = allRowText.match(/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com)[^\s,]+)/i);
              if (videoMatch) {
                videoUrl = videoMatch[1].trim();
              }
            }

            const property: Property = {
              id: `prop-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${properties.length + 1}`,
              code,
              title,
              titleEn: `Apartment ${area}sqm in ${district}`,
              neighborhood: district,
              propertyType: 'apartment',
              propertyTypeLabel: 'شقة سكنية',
              finishing,
              finishingLabel,
              price,
              pricePerMeter,
              area,
              bedrooms,
              bathrooms,
              floor,
              view: location || (detailsStr.includes('فيو') ? 'فيو مفتوح' : 'واجهة بحري شارع رئيسي'),
              deliveryDate: 'استلام فوري',
              paymentMethod: hasInstallment ? 'cash_or_facilities' : 'cash',
              images: [...DEFAULT_EXCEL_PHOTOS],
              videoUrl,
              features: featureList.slice(0, 6),
              description: detailsStr || `شقة بمساحة ${area}م² بـ ${district} بالهضبة الوسطى بالمقطم. ${floor}، تشطيب ${finishingLabel}. السعر: ${price.toLocaleString('en-US')} ج.م.`,
              location: location || '',
              note: note || '',
              ownerName: 'المالك المباشر',
              ownerPhone,
              sales,
              hasElevator: Boolean(hasElevator),
              hasGarage: Boolean(hasGarage),
              registeredContract: Boolean(registeredContract),
              isFeatured: price >= 3500000 || code.startsWith('H1612') || code.startsWith('H1404'),
              createdAt: nowStr,
              clicks: { whatsapp: 0, call: 0, views: 0, favorites: 0 }
            };

            properties.push(property);
            sheetPropCount++;
          }

          if (sheetPropCount > 0) {
            sheetsFound.push(sheetName);
            sheetStats.push({ name: sheetName, count: sheetPropCount });
          }
        }

        if (properties.length === 0) {
          throw new Error('لم يتم العثور على أي شقق أو بيانات قابلة للاستيراد داخل الملف. تأكد من أن الملف يحتوي على صفوف بيانات.');
        }

        resolve({
          properties,
          errors,
          warnings,
          totalRowsFound: properties.length,
          sheetsFound,
          sheetStats
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('حدث خطأ أثناء قراءة ملف الإكسيل'));
    };

    reader.readAsBinaryString(file);
  });
}

// Export array of properties to an Excel (.xlsx) file with EXACT requested columns
export function exportPropertiesToExcel(properties: Property[], filename: string = 'عقارات_الهضبة_الوسطى_السبع.xlsx') {
  const rows: ExcelRowFormat[] = properties.map(mapPropertyToExcelRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths matching the exact columns
  worksheet['!cols'] = [
    { wch: 14 }, // Code
    { wch: 18 }, // DISTRICT
    { wch: 16 }, // finishing
    { wch: 12 }, // Area
    { wch: 16 }, // Total Price
    { wch: 10 }, // Floor
    { wch: 10 }, // Rooms
    { wch: 10 }, // w/c
    { wch: 45 }, // Details
    { wch: 22 }, // Location
    { wch: 22 }, // Note
    { wch: 18 }, // owner number
    { wch: 16 }  // sales
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'شقق الهضبة الوسطى');
  XLSX.writeFile(workbook, filename);
}

// Download a ready-to-fill sample Excel template with EXACT requested columns
export function downloadExcelTemplate(filename: string = 'قالب_شقق_الهضبة_الوسطى_السبع.xlsx') {
  const sampleRows: ExcelRowFormat[] = [
    {
      'Code': 'H1612',
      'DISTRICT': 'تقسيم المباحث',
      'finishing': 'Fully Finished',
      'Area': 160,
      'Total Price': '3,000,000',
      'Floor': 4,
      'Rooms': 3,
      'w/c': 1,
      'Details': 'كود:H1612\n* شقة للبيع في الهضبة الوسطى\n* ارض المباحث\n* دور رابع\n* اسانسير\n* تاني نمرة من الشارع الرئيسي\n* ١٦٠ متر\n* ٣ غرف نوم\n* وحمام ومطبخ\n* ورسيبشن قطعتين\n* تشطيب الترا سوبر لوكس\n* السعر:3,000,000',
      'Location': 'تاني نمرة من الشارع الرئيسي',
      'Note': 'أرض المباحث',
      'owner number': '01012345678',
      'sales': 'مبيعات السبع'
    },
    {
      'Code': 'H1404',
      'DISTRICT': 'الحى الثامن',
      'finishing': 'Fully Finished',
      'Area': 180,
      'Total Price': '4,500,000',
      'Floor': 8,
      'Rooms': 3,
      'w/c': 2,
      'Details': 'كود:H1404\n* شقة للبيع ف الهضبة الوسطى\n* الحي الثامن\n* دور ثامن مش اخير\n* اسانسير\n* عداد مياه كهرباء غاز\n* 3 نوم (غرفة ماستر) + 2 حمام\n* أربع قطع ريسبشن\n* صافي 180م بالعقد\n* تشطيب حديث\n* السعر: 4,500,000 بالمطبخ وتكييفين',
      'Location': 'الحي الثامن',
      'Note': 'يعتبر 250 متر',
      'owner number': '01122334455',
      'sales': 'مبيعات السبع'
    },
    {
      'Code': 'H1014',
      'DISTRICT': 'تقسيم المباحث',
      'finishing': 'Semi Finished',
      'Area': 94,
      'Total Price': '2,500,000',
      'Floor': 4,
      'Rooms': 2,
      'w/c': 2,
      'Details': 'كود:H1014\n* شقه للبيع في الهضبة الوسطى\n* كومباوند نيكست بوينت\n* مساحه 94 م\n* غرفتين + 2 حمام + بلكونه\n* فيو الشارع\n* دور رابع\n* نص تشطيب\n* 2 اسانسير\n* السعر: 2,500,000',
      'Location': 'كمبوند نيكست بوينت',
      'Note': 'وديعة صيانة مدفوعة',
      'owner number': '01234567890',
      'sales': 'مبيعات السبع'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);

  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 45 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج إدخال شقق');
  XLSX.writeFile(workbook, filename);
}
