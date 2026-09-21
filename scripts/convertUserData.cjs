const XLSX = require('xlsx');
const fs = require('fs');

const fileStr = fs.readFileSync('scripts/user_data.csv', 'utf8');
const workbook = XLSX.read(fileStr, { type: 'string' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

// Curated architectural photos of El Mokattam luxury apartments
const PROPERTY_IMAGES_SETS = [
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  ]
];

function formatFloor(floorVal, details) {
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
    return String(floorVal).trim();
  }

  // If floor is empty, look into details
  if (details) {
    if (details.includes('دور ارضي') || details.includes('أرضي')) return 'الدور الأرضي';
    if (details.includes('دور اول') || details.includes('الأول')) return 'الدور الأول';
    if (details.includes('دور تاني') || details.includes('الثاني')) return 'الدور الثاني';
    if (details.includes('دور تالت') || details.includes('الثالث')) return 'الدور الثالث';
    if (details.includes('دور رابع') || details.includes('الرابع')) return 'الدور الرابع';
    if (details.includes('دور خامس') || details.includes('الخامس')) return 'الدور الخامس';
  }
  return 'الدور الثالث';
}

function cleanDistrict(val, details) {
  const combined = `${val || ''} ${details || ''}`;
  if (combined.includes('مباحث')) return 'تقسيم المباحث';
  if (combined.includes('اول') || combined.includes('الأول') || combined.includes('الاول')) return 'الحي الأول';
  if (combined.includes('ثان') || combined.includes('الثاني') || combined.includes('الثانى')) return 'الحي الثاني';
  if (combined.includes('ثالث') || combined.includes('الثالث')) return 'الحي الثالث';
  if (combined.includes('رابع') || combined.includes('الرابع')) return 'الحي الرابع';
  if (combined.includes('خامس') || combined.includes('الخامس')) return 'الحي الخامس';
  if (combined.includes('سادس') || combined.includes('السادس')) return 'الحي السادس';
  if (combined.includes('سابع') || combined.includes('السابع')) return 'الحي السابع';
  if (combined.includes('ثامن') || combined.includes('الثامن')) return 'الحي الثامن';
  return 'الحي الأول';
}

function cleanPrice(priceVal) {
  if (typeof priceVal === 'number') return priceVal;
  const cleaned = String(priceVal).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 2500000;
}

function cleanArea(areaVal) {
  if (typeof areaVal === 'number') return areaVal;
  const cleaned = String(areaVal).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 130;
}

const parsedProperties = [];
const seenCodes = new Set();

rawRows.forEach((row, i) => {
  const code = String(row.Code || '').trim();
  if (!code) return; // skip empty code row

  const price = cleanPrice(row['Total Price']);
  const area = cleanArea(row.Area);
  const details = String(row.Details || '').trim();

  // If no area and no price and no details, it's just an index code row
  if (!row.Area && !row['Total Price'] && !details) {
    return;
  }

  const district = cleanDistrict(row.DISTRICT, details);
  const finishingRaw = String(row.finishing || '').toLowerCase().trim();
  const isSemi = finishingRaw.includes('semi') || finishingRaw.includes('3-apr') || finishingRaw.includes('3/4') || details.includes('نص تشطيب');
  const finishing = isSemi ? 'semi_finished' : 'finished';
  const finishingLabel = finishingRaw.includes('3-apr') || finishingRaw.includes('3/4')
    ? '3/4 تشطيب فاخر'
    : (finishing === 'finished' ? 'تشطيب سوبر لوكس' : 'نصف تشطيب');

  const floor = formatFloor(row.Floor, details);
  const bedrooms = parseInt(row.Rooms) || 3;
  const bathrooms = parseInt(row['w/c']) || 2;
  const location = String(row.Location || '').trim();
  const note = String(row.Note || '').trim();
  const ownerNumber = String(row['owner number'] || '').trim();
  const sales = String(row.sales || '').trim();

  // Extract clean bullet features from details
  const featureList = [];
  const lines = details.split('\n');
  lines.forEach(line => {
    let clean = line.replace(/^[\*\-\•\s]+/, '').trim();
    if (clean && !clean.startsWith('كود') && !clean.startsWith('السعر') && clean.length > 2 && clean.length < 55) {
      featureList.push(clean);
    }
  });

  const hasElevator = (details.includes('اسانسير') || details.includes('أسانسير')) && !details.includes('بدون اسانسير') && !note.includes('بدون أسانسير');
  const hasGarage = details.includes('جراج') || details.includes('باكية') || details.includes('حصـة جراج');
  const registeredContract = details.includes('حصة بالأرض') || details.includes('حصه بالأرض') || details.includes('تصالح') || details.includes('مسجلة') || details.includes('رخصة');
  const hasInstallment = note.includes('قسط') || note.includes('تسهيل') || details.includes('قسط') || details.includes('تسهيلات');

  let title = `شقة ${area}م² ${district}`;
  if (location) {
    title += ` (${location})`;
  } else if (note && note.length <= 25) {
    title += ` (${note})`;
  }

  // Ensure unique code
  let uniqueCode = code;
  if (seenCodes.has(uniqueCode)) {
    uniqueCode = `${code}-${area}m`;
    if (seenCodes.has(uniqueCode)) {
      uniqueCode = `${code}-B`;
    }
  }
  seenCodes.add(uniqueCode);

  const pricePerMeter = Math.round(price / area);
  const imageSet = PROPERTY_IMAGES_SETS[parsedProperties.length % PROPERTY_IMAGES_SETS.length];

  parsedProperties.push({
    id: `prop-${uniqueCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    code: uniqueCode,
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
    view: location || (details.includes('فيو') ? 'فيو مفتوح' : 'واجهة بحري شارع رئيسي'),
    deliveryDate: 'استلام فوري',
    paymentMethod: hasInstallment ? 'cash_or_facilities' : 'cash',
    images: imageSet,
    features: featureList.slice(0, 6),
    description: details || `شقة مميزة بمساحة ${area}م² بـ ${district} بالهضبة الوسطى بالمقطم. ${floor}، تشطيب ${finishingLabel}. السعر: ${price.toLocaleString('en-US')} ج.م.`,
    location: location || '',
    note: note || '',
    ownerName: 'المالك المباشر',
    ownerPhone: ownerNumber || '01000000000',
    sales: sales || '',
    hasElevator: Boolean(hasElevator),
    hasGarage: Boolean(hasGarage),
    registeredContract: Boolean(registeredContract),
    isFeatured: price >= 3500000 || uniqueCode === 'H1612' || uniqueCode === 'H1404' || uniqueCode === 'H1124',
    createdAt: new Date().toISOString(),
    clicks: { whatsapp: 0, call: 0, views: 0, favorites: 0 }
  });
});

console.log('Total properties processed:', parsedProperties.length);

const tsContent = `// Real active properties from El Seba Real Estate Hadaba Wosta Inventory
// Generated with exact columns: Code, DISTRICT, finishing, Area, Total Price, Floor, Rooms, w/c, Details, Location, Note, owner number, sales
import { Property } from '../types';

export const USER_EXCEL_PROPERTIES: Property[] = ${JSON.stringify(parsedProperties, null, 2)};
`;

fs.writeFileSync('src/data/userProperties.ts', tsContent, 'utf-8');
console.log('Successfully wrote src/data/userProperties.ts');
